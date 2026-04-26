import { NextFunction, Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import { prisma } from "../db/prisma";
import { AppError } from "../common/errors/AppError";
import { verifyAccessToken } from "../common/utils/crypto";

interface AccessPayload {
  sub: string;
  role: string;
  companyId: string;
  sessionId: string;
}

export const authenticate = async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    return next(new AppError(StatusCodes.UNAUTHORIZED, "UNAUTHORIZED", "Missing access token"));
  }

  const token = authHeader.replace("Bearer ", "");

  try {
    const payload = verifyAccessToken<AccessPayload>(token);
    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      include: { rolePermissions: true }
    });

    if (!user || user.companyId !== payload.companyId) {
      return next(new AppError(StatusCodes.UNAUTHORIZED, "UNAUTHORIZED", "Invalid user session"));
    }

    if (!user.isActive) {
      return next(
        new AppError(
          StatusCodes.FORBIDDEN,
          "ACCOUNT_DEACTIVATED",
          "Your account is deactivated by admin. Kindly contact to administrator."
        )
      );
    }

    req.user = {
      id: user.id,
      role: user.role,
      companyId: user.companyId,
      sessionId: payload.sessionId,
      permissions: user.rolePermissions.map((item) => item.permission)
    };
    next();
  } catch {
    next(new AppError(StatusCodes.UNAUTHORIZED, "UNAUTHORIZED", "Invalid or expired access token"));
  }
};
