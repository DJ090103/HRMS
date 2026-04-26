import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../db/prisma";
import { authenticate } from "../../middlewares/auth.middleware";
import { allowPermissions } from "../../middlewares/rbac.middleware";
import { asyncHandler } from "../../common/utils/asyncHandler";
import { validate } from "../../middlewares/validate.middleware";

const openingSchema = z.object({
  body: z.object({
    title: z.string().min(2),
    employmentType: z.string().min(2),
    minExperience: z.number().min(0),
    maxExperience: z.number().min(0),
    departmentId: z.string().optional()
  })
});

const candidateSchema = z.object({
  body: z.object({
    openingId: z.string(),
    name: z.string().min(2),
    email: z.string().email(),
    phone: z.string().optional(),
    resumeUrl: z.string().url().optional()
  })
});

export const recruitmentRouter = Router();
recruitmentRouter.use(authenticate);

recruitmentRouter.post(
  "/openings",
  allowPermissions("employee:write"),
  validate(openingSchema),
  asyncHandler(async (req, res) => {
    const data = await prisma.recruitmentOpening.create({
      data: {
        companyId: req.user!.companyId,
        title: req.body.title,
        employmentType: req.body.employmentType,
        minExperience: req.body.minExperience,
        maxExperience: req.body.maxExperience,
        departmentId: req.body.departmentId
      }
    });
    res.status(201).json({ success: true, data });
  })
);

recruitmentRouter.post(
  "/candidates",
  allowPermissions("employee:write"),
  validate(candidateSchema),
  asyncHandler(async (req, res) => {
    const data = await prisma.candidate.create({
      data: req.body
    });
    res.status(201).json({ success: true, data });
  })
);

recruitmentRouter.get(
  "/openings",
  asyncHandler(async (req, res) => {
    const data = await prisma.recruitmentOpening.findMany({
      where: { companyId: req.user!.companyId },
      include: { candidates: true },
      orderBy: { createdAt: "desc" }
    });
    res.json({ success: true, data });
  })
);
