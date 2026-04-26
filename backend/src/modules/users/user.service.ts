import { Role } from "@prisma/client";
import { AppError } from "../../common/errors/AppError";
import { hashPassword } from "../../common/utils/crypto";
import { prisma } from "../../db/prisma";
import { userRepository } from "../../repositories/user.repository";
import { auditService } from "../../services/audit.service";

type CreateEmployeeInput = {
  email: string;
  firstName: string;
  lastName: string;
  role: Role;
  password: string;
  departmentId?: string;
  designation: string;
  joiningDate: string;
  employeeCode: string;
  baseCtc: number;
  basicPercent: number;
  hraPercent: number;
  allowancesMonthly: number;
  professionalTax?: number;
  pfEnabled?: boolean;
  esiEnabled?: boolean;
};

export const userService = {
  createEmployee: async (companyId: string, actorId: string, payload: CreateEmployeeInput) => {
    const existing = await userRepository.findByCompanyEmail(companyId, payload.email);
    if (existing) {
      throw new AppError(409, "USER_EXISTS", "User already exists");
    }

    const permissions =
      payload.role === Role.HR_MANAGER
        ? [
            { permission: "employee:read" },
            { permission: "employee:write" },
            { permission: "attendance:approve" },
            { permission: "leave:approve" },
            { permission: "payroll:process" },
            { permission: "reimbursement:approve" },
            { permission: "reports:read" }
          ]
        : [
            { permission: "self:read" },
            { permission: "self:attendance" },
            { permission: "self:leave" },
            { permission: "self:reimbursement" }
          ];

    const user = await userRepository.create({
      companyId,
      email: payload.email,
      firstName: payload.firstName,
      lastName: payload.lastName,
      role: payload.role,
      passwordHash: await hashPassword(payload.password),
      rolePermissions: { createMany: { data: permissions } },
      employeeProfile: {
        create: {
          employeeCode: payload.employeeCode,
          designation: payload.designation,
          joiningDate: new Date(payload.joiningDate),
          departmentId: payload.departmentId,
          baseCtc: payload.baseCtc,
          basicPercent: payload.basicPercent,
          hraPercent: payload.hraPercent,
          allowancesMonthly: payload.allowancesMonthly,
          professionalTax: payload.professionalTax ?? 0,
          pfEnabled: payload.pfEnabled ?? true,
          esiEnabled: payload.esiEnabled ?? false
        }
      }
    });

    await auditService.log({
      companyId,
      actorId,
      module: "EMPLOYEE",
      action: "EMPLOYEE_CREATED",
      entityId: user.id
    });

    return user;
  },

  listEmployees: async (companyId: string) =>
    prisma.user.findMany({
      where: { companyId, role: { in: [Role.HR_MANAGER, Role.EMPLOYEE] } },
      include: { employeeProfile: true, rolePermissions: true },
      orderBy: { createdAt: "desc" }
    }),

  getSelfProfile: async (companyId: string, userId: string) => {
    const user = await prisma.user.findFirst({
      where: { id: userId, companyId },
      include: {
        employeeProfile: {
          include: { department: true }
        },
        rolePermissions: true
      }
    });
    if (!user) {
      throw new AppError(404, "USER_NOT_FOUND", "User not found");
    }
    return user;
  },

  updateEmployeeAdmin: async (
    companyId: string,
    actorId: string,
    userId: string,
    payload: {
      firstName?: string;
      lastName?: string;
      designation?: string;
      departmentId?: string | null;
      isActive?: boolean;
      baseCtc?: number;
      basicPercent?: number;
      hraPercent?: number;
      allowancesMonthly?: number;
      professionalTax?: number;
      pfEnabled?: boolean;
      esiEnabled?: boolean;
      bankAccountNumber?: string;
      bankIfsc?: string;
      bankName?: string;
      bankAccountHolderName?: string;
    }
  ) => {
    const user = await prisma.user.findFirst({
      where: { id: userId, companyId, role: { in: [Role.HR_MANAGER, Role.EMPLOYEE] } },
      include: { employeeProfile: true }
    });
    if (!user || !user.employeeProfile) {
      throw new AppError(404, "EMPLOYEE_NOT_FOUND", "Employee not found");
    }

    const updated = await prisma.user.update({
      where: { id: userId },
      data: {
        firstName: payload.firstName,
        lastName: payload.lastName,
        isActive: payload.isActive,
        employeeProfile: {
          update: {
            designation: payload.designation,
            departmentId: payload.departmentId,
            baseCtc: payload.baseCtc,
            basicPercent: payload.basicPercent,
            hraPercent: payload.hraPercent,
            allowancesMonthly: payload.allowancesMonthly,
            professionalTax: payload.professionalTax,
            pfEnabled: payload.pfEnabled,
            esiEnabled: payload.esiEnabled,
            bankAccountNumber: payload.bankAccountNumber,
            bankIfsc: payload.bankIfsc,
            bankName: payload.bankName,
            bankAccountHolderName: payload.bankAccountHolderName
          }
        }
      },
      include: { employeeProfile: true }
    });

    await auditService.log({
      companyId,
      actorId,
      module: "EMPLOYEE",
      action: "EMPLOYEE_UPDATED",
      entityId: userId,
      payload
    });
    return updated;
  },

  deleteEmployee: async (companyId: string, actorId: string, userId: string): Promise<void> => {
    const user = await prisma.user.findFirst({
      where: { id: userId, companyId, role: { in: [Role.HR_MANAGER, Role.EMPLOYEE] } }
    });
    if (!user) {
      throw new AppError(404, "EMPLOYEE_NOT_FOUND", "Employee not found");
    }

    await prisma.user.delete({ where: { id: userId } });
    await auditService.log({
      companyId,
      actorId,
      module: "EMPLOYEE",
      action: "EMPLOYEE_DELETED",
      entityId: userId
    });
  },

  updateSelfProfile: async (
    companyId: string,
    userId: string,
    payload: { firstName?: string; lastName?: string; designation?: string; profileImageUrl?: string }
  ) => {
    const user = await prisma.user.findFirst({
      where: { id: userId, companyId },
      include: { employeeProfile: true }
    });
    if (!user) {
      throw new AppError(404, "USER_NOT_FOUND", "User not found");
    }

    return prisma.user.update({
      where: { id: userId },
      data: {
        firstName: payload.firstName,
        lastName: payload.lastName,
        profileImageUrl: payload.profileImageUrl,
        employeeProfile: user.employeeProfile
          ? {
              update: {
                designation: payload.designation
              }
            }
          : undefined
      },
      include: {
        employeeProfile: { include: { department: true } },
        rolePermissions: true
      }
    });
  }
};
