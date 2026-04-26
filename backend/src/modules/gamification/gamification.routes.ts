import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../db/prisma";
import { authenticate } from "../../middlewares/auth.middleware";
import { allowPermissions } from "../../middlewares/rbac.middleware";
import { asyncHandler } from "../../common/utils/asyncHandler";
import { validate } from "../../middlewares/validate.middleware";

const rewardSchema = z.object({
  body: z.object({
    userId: z.string(),
    points: z.number().int().positive(),
    reason: z.string().min(3)
  })
});

export const gamificationRouter = Router();
gamificationRouter.use(authenticate);

gamificationRouter.post(
  "/rewards",
  allowPermissions("employee:write"),
  validate(rewardSchema),
  asyncHandler(async (req, res) => {
    const data = await prisma.reward.create({
      data: {
        companyId: req.user!.companyId,
        userId: req.body.userId,
        points: req.body.points,
        reason: req.body.reason
      }
    });
    res.status(201).json({ success: true, data });
  })
);

gamificationRouter.get(
  "/leaderboard",
  asyncHandler(async (req, res) => {
    const data = await prisma.reward.groupBy({
      by: ["userId"],
      where: { companyId: req.user!.companyId },
      _sum: { points: true },
      orderBy: { _sum: { points: "desc" } },
      take: 10
    });
    res.json({ success: true, data });
  })
);
