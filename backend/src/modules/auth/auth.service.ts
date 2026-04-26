import { Role } from "@prisma/client";
import { StatusCodes } from "http-status-codes";
import { AppError } from "../../common/errors/AppError";
import { comparePassword, hashPassword, signAccessToken, signRefreshToken, verifyRefreshToken } from "../../common/utils/crypto";
import { prisma } from "../../db/prisma";
import { auditService } from "../../services/audit.service";
import { emailService } from "../../services/email.service";
import { userRepository } from "../../repositories/user.repository";

const randomOtp = (): string => Math.floor(100000 + Math.random() * 900000).toString();
const addDays = (date: Date, days: number): Date => new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
const addMinutes = (date: Date, minutes: number): Date => new Date(date.getTime() + minutes * 60 * 1000);

const defaultPermissions = (role: Role): string[] => {
  if (role === Role.SUPER_ADMIN) {
    return ["*"];
  }
  if (role === Role.HR_MANAGER) {
    return [
      "employee:read",
      "employee:write",
      "attendance:approve",
      "leave:approve",
      "payroll:process",
      "reimbursement:approve",
      "reports:read"
    ];
  }
  return ["self:read", "self:attendance", "self:leave", "self:reimbursement"];
};

type ClientInfo = { ipAddress?: string; userAgent?: string };

export const authService = {
  login: async (companyId: string, email: string, password: string, otp: string | undefined, client: ClientInfo) => {
    const user = await userRepository.findByCompanyEmail(companyId, email);
    if (!user) {
      throw new AppError(StatusCodes.UNAUTHORIZED, "INVALID_CREDENTIALS", "Invalid credentials");
    }

    const validPassword = await comparePassword(password, user.passwordHash);
    if (!validPassword) {
      await prisma.loginHistory.create({
        data: { userId: user.id, success: false, reason: "INVALID_PASSWORD", ...client }
      });
      throw new AppError(StatusCodes.UNAUTHORIZED, "INVALID_CREDENTIALS", "Invalid credentials");
    }

    if (!user.isActive) {
      throw new AppError(
        StatusCodes.FORBIDDEN,
        "ACCOUNT_DEACTIVATED",
        "Your account is deactivated by admin. Kindly contact to administrator."
      );
    }

    if (user.twoFactorEnabled) {
      if (!otp) {
        throw new AppError(StatusCodes.UNAUTHORIZED, "OTP_REQUIRED", "2FA OTP is required");
      }
      const otpEntry = await prisma.otpToken.findFirst({
        where: {
          companyId,
          email,
          purpose: "LOGIN_2FA",
          isUsed: false,
          expiresAt: { gt: new Date() }
        },
        orderBy: { createdAt: "desc" }
      });
      if (!otpEntry || !(await comparePassword(otp, otpEntry.otpHash))) {
        throw new AppError(StatusCodes.UNAUTHORIZED, "INVALID_OTP", "Invalid OTP");
      }
      await prisma.otpToken.update({ where: { id: otpEntry.id }, data: { isUsed: true } });
    }

    const session = await prisma.deviceSession.create({
      data: {
        userId: user.id,
        refreshToken: "pending",
        ipAddress: client.ipAddress,
        userAgent: client.userAgent,
        expiresAt: addDays(new Date(), 30)
      }
    });

    const accessToken = signAccessToken({
      sub: user.id,
      role: user.role,
      companyId,
      sessionId: session.id
    });
    const refreshToken = signRefreshToken({
      sub: user.id,
      companyId,
      sessionId: session.id
    });

    await prisma.deviceSession.update({
      where: { id: session.id },
      data: { refreshToken }
    });
    await prisma.loginHistory.create({
      data: { userId: user.id, success: true, ...client }
    });

    if (user.rolePermissions.length === 0) {
      await prisma.rolePermission.createMany({
        data: defaultPermissions(user.role).map((permission) => ({ userId: user.id, permission })),
        skipDuplicates: true
      });
    }

    return { accessToken, refreshToken, user };
  },

  refresh: async (refreshToken: string) => {
    const payload = verifyRefreshToken<{ sub: string; companyId: string; sessionId: string }>(refreshToken);
    const session = await prisma.deviceSession.findUnique({ where: { id: payload.sessionId } });
    if (!session || session.isRevoked || session.refreshToken !== refreshToken || session.expiresAt < new Date()) {
      throw new AppError(StatusCodes.UNAUTHORIZED, "INVALID_REFRESH_TOKEN", "Refresh token is invalid");
    }
    const user = await userRepository.findById(payload.sub);
    if (!user) {
      throw new AppError(StatusCodes.UNAUTHORIZED, "INVALID_USER", "User not found");
    }
    const newAccessToken = signAccessToken({
      sub: user.id,
      role: user.role,
      companyId: payload.companyId,
      sessionId: session.id
    });
    return { accessToken: newAccessToken };
  },

  logout: async (sessionId: string, client?: ClientInfo): Promise<void> => {
    const session = await prisma.deviceSession.findUnique({ where: { id: sessionId } });
    await prisma.deviceSession.update({
      where: { id: sessionId },
      data: { isRevoked: true }
    });
    if (session) {
      await prisma.loginHistory.create({
        data: {
          userId: session.userId,
          success: true,
          reason: "LOGOUT",
          ipAddress: client?.ipAddress ?? session.ipAddress ?? undefined,
          userAgent: client?.userAgent ?? session.userAgent ?? undefined
        }
      });
    }
  },

  listSessions: async (userId: string) =>
    prisma.deviceSession.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" }
    }),

  revokeSession: async (userId: string, sessionId: string): Promise<void> => {
    await prisma.deviceSession.updateMany({
      where: { id: sessionId, userId },
      data: { isRevoked: true }
    });
  },

  loginHistory: async (userId: string) =>
    prisma.loginHistory.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 100
    }),

  sendOtp: async (companyId: string, email: string, purpose: "RESET_PASSWORD" | "VERIFY_EMAIL" | "LOGIN_2FA") => {
    const code = randomOtp();
    await prisma.otpToken.create({
      data: {
        companyId,
        email,
        purpose,
        otpHash: await hashPassword(code),
        expiresAt: addMinutes(new Date(), 10)
      }
    });
    await emailService.send(email, "Your OTP Code", `<p>Your OTP is <strong>${code}</strong>. It expires in 10 minutes.</p>`);
  },

  verifyOtp: async (companyId: string, email: string, otp: string, purpose: "RESET_PASSWORD" | "VERIFY_EMAIL" | "LOGIN_2FA") => {
    const token = await prisma.otpToken.findFirst({
      where: { companyId, email, purpose, isUsed: false, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: "desc" }
    });
    if (!token || !(await comparePassword(otp, token.otpHash))) {
      throw new AppError(StatusCodes.BAD_REQUEST, "INVALID_OTP", "OTP is invalid or expired");
    }
    await prisma.otpToken.update({ where: { id: token.id }, data: { isUsed: true } });
  },

  resetPassword: async (companyId: string, email: string, otp: string, newPassword: string): Promise<void> => {
    await authService.verifyOtp(companyId, email, otp, "RESET_PASSWORD");
    const user = await userRepository.findByCompanyEmail(companyId, email);
    if (!user) {
      throw new AppError(StatusCodes.NOT_FOUND, "USER_NOT_FOUND", "User not found");
    }
    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash: await hashPassword(newPassword) }
    });
    await auditService.log({
      companyId,
      actorId: user.id,
      module: "AUTH",
      action: "PASSWORD_RESET",
      entityId: user.id
    });
  }
};
