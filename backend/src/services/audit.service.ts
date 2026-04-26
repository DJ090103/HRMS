import { Prisma } from "@prisma/client";
import { prisma } from "../db/prisma";

interface AuditInput {
  companyId: string;
  actorId?: string;
  module: string;
  action: string;
  entityId?: string;
  payload?: unknown;
  ipAddress?: string;
  userAgent?: string;
}

export const auditService = {
  log: async (data: AuditInput): Promise<void> => {
    const payload: Prisma.AuditLogUncheckedCreateInput = {
      companyId: data.companyId,
      actorId: data.actorId,
      module: data.module,
      action: data.action,
      entityId: data.entityId,
      payload: (data.payload as Prisma.InputJsonValue) ?? undefined,
      ipAddress: data.ipAddress,
      userAgent: data.userAgent
    };
    await prisma.auditLog.create({ data: payload });
  }
};
