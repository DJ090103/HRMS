import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../db/prisma";
import { authenticate } from "../../middlewares/auth.middleware";
import { allowPermissions } from "../../middlewares/rbac.middleware";
import { validate } from "../../middlewares/validate.middleware";
import { asyncHandler } from "../../common/utils/asyncHandler";
import { notificationService } from "../notifications/notification.service";

const applyLeaveSchema = z.object({
  body: z.object({
    type: z.string().min(2),
    reason: z.string().min(3).optional(),
    startDate: z.string().datetime(),
    endDate: z.string().datetime()
  })
});

const approveLeaveSchema = z.object({
  body: z.object({
    leaveId: z.string(),
    status: z.enum(["APPROVED", "REJECTED"]),
    rejectionNote: z.string().optional()
  })
});

const leaveDays = (start: Date, end: Date): number => {
  const millis = end.getTime() - start.getTime();
  return Number((millis / (24 * 60 * 60 * 1000) + 1).toFixed(2));
};

export const leaveRouter = Router();
leaveRouter.use(authenticate);

leaveRouter.post(
  "/apply",
  allowPermissions("self:leave"),
  validate(applyLeaveSchema),
  asyncHandler(async (req, res) => {
    const startDate = new Date(req.body.startDate);
    const endDate = new Date(req.body.endDate);
    const data = await prisma.leaveRequest.create({
      data: {
        companyId: req.user!.companyId,
        requesterId: req.user!.id,
        type: req.body.type,
        reason: req.body.reason,
        startDate,
        endDate,
        dayCount: leaveDays(startDate, endDate)
      }
    });
    res.status(201).json({ success: true, data });
  })
);

leaveRouter.get(
  "/mine",
  allowPermissions("self:leave"),
  asyncHandler(async (req, res) => {
    const data = await prisma.leaveRequest.findMany({
      where: { companyId: req.user!.companyId, requesterId: req.user!.id },
      orderBy: { createdAt: "desc" }
    });
    res.json({ success: true, data });
  })
);

leaveRouter.post(
  "/approve",
  allowPermissions("leave:approve"),
  validate(approveLeaveSchema),
  asyncHandler(async (req, res) => {
    const data = await prisma.leaveRequest.update({
      where: { id: req.body.leaveId },
      data: {
        status: req.body.status,
        rejectionNote: req.body.rejectionNote,
        approverId: req.user!.id
      }
    });
    await notificationService.notify({
      userId: data.requesterId,
      title: "Leave request updated",
      body: `Your leave request was ${data.status.toLowerCase()}`,
      channel: "IN_APP"
    });
    res.json({ success: true, data });
  })
);
