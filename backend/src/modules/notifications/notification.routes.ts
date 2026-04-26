import { Router } from "express";
import { prisma } from "../../db/prisma";
import { authenticate } from "../../middlewares/auth.middleware";
import { asyncHandler } from "../../common/utils/asyncHandler";

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
