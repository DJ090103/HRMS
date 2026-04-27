import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../db/prisma";
import { authenticate } from "../../middlewares/auth.middleware";
import { allowRoles } from "../../middlewares/rbac.middleware";
import { asyncHandler } from "../../common/utils/asyncHandler";
import { validate } from "../../middlewares/validate.middleware";
import { notificationService } from "./notification.service";

const createNoticeSchema = z.object({
  body: z.object({
    title: z.string().min(3).max(120),
    body: z.string().min(5).max(1000),
    channel: z.enum(["IN_APP", "EMAIL"]).default("IN_APP")
  })
});

export const notificationRouter = Router();
notificationRouter.use(authenticate);

notificationRouter.get(
  "/mine",
  asyncHandler(async (req, res) => {
    const data = await prisma.notification.findMany({
      where: { userId: req.user!.id },
      orderBy: { createdAt: "desc" }
    });
    res.json({ success: true, data });
  })
);

notificationRouter.post(
  "/read/:id",
  asyncHandler(async (req, res) => {
    await prisma.notification.updateMany({
      where: { id: req.params.id, userId: req.user!.id },
      data: { isRead: true }
    });
    const data = await prisma.notification.findUnique({ where: { id: req.params.id } });
    res.json({ success: true, data });
  })
);

notificationRouter.post(
  "/notices",
  allowRoles("SUPER_ADMIN", "HR_MANAGER"),
  validate(createNoticeSchema),
  asyncHandler(async (req, res) => {
    const metadata = {
      type: "NOTICE",
      audience: "ALL_COMPANY",
      createdBy: req.user!.id
    };

    const recipientCount = await notificationService.broadcastToCompany({
      companyId: req.user!.companyId,
      title: req.body.title,
      body: req.body.body,
      channel: req.body.channel,
      metadata
    });

    res.status(201).json({
      success: true,
      data: {
        recipientCount,
        title: req.body.title,
        body: req.body.body,
        channel: req.body.channel
      }
    });
  })
);

notificationRouter.get(
  "/notices/sent",
  allowRoles("SUPER_ADMIN", "HR_MANAGER"),
  asyncHandler(async (req, res) => {
    const data = await prisma.notification.findMany({
      where: {
        userId: req.user!.id,
        metadata: { path: ["type"], equals: "NOTICE" }
      },
      orderBy: { createdAt: "desc" },
      take: 50
    });
    res.json({ success: true, data });
  })
);
