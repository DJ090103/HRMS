import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../db/prisma";
import { authenticate } from "../../middlewares/auth.middleware";
import { allowPermissions } from "../../middlewares/rbac.middleware";
import { asyncHandler } from "../../common/utils/asyncHandler";
import { validate } from "../../middlewares/validate.middleware";

const reviewSchema = z.object({
  body: z.object({
    revieweeId: z.string(),
    period: z.string().min(4),
    rating: z.number().min(1).max(5),
    comments: z.string().optional()
  })
});

export const performanceRouter = Router();
performanceRouter.use(authenticate);

performanceRouter.post(
  "/reviews",
  allowPermissions("employee:write"),
  validate(reviewSchema),
  asyncHandler(async (req, res) => {
    const data = await prisma.performanceReview.create({
      data: {
        companyId: req.user!.companyId,
        reviewerId: req.user!.id,
        revieweeId: req.body.revieweeId,
        period: req.body.period,
        rating: req.body.rating,
        comments: req.body.comments
      }
    });
    res.status(201).json({ success: true, data });
  })
);

performanceRouter.get(
  "/reviews",
  asyncHandler(async (req, res) => {
    const data = await prisma.performanceReview.findMany({
      where: { companyId: req.user!.companyId },
      include: { reviewee: true, reviewer: true },
      orderBy: { createdAt: "desc" }
    });
    res.json({ success: true, data });
  })
);
