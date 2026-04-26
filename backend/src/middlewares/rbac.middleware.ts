import { NextFunction, Request, Response } from "express";
import { Role } from "@prisma/client";
import { StatusCodes } from "http-status-codes";
import { AppError } from "../common/errors/AppError";

export const allowRoles =
  (...roles: Role[]) =>
  (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user || !roles.includes(req.user.role)) {
      return next(new AppError(StatusCodes.FORBIDDEN, "FORBIDDEN", "Role does not have access"));
    }
    next();
  };

export const allowPermissions =
  (...permissions: string[]) =>
  (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      return next(new AppError(StatusCodes.UNAUTHORIZED, "UNAUTHORIZED", "User context not found"));
    }
    const hasWildcard = req.user.permissions.includes("*");
    const hasPermission =
      hasWildcard || permissions.every((permission) => req.user?.permissions.includes(permission));
    if (!hasPermission) {
      return next(new AppError(StatusCodes.FORBIDDEN, "FORBIDDEN", "Permission denied"));
    }
    next();
  };
