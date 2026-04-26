import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../db/prisma";
import { authenticate } from "../../middlewares/auth.middleware";
import { allowRoles } from "../../middlewares/rbac.middleware";
import { asyncHandler } from "../../common/utils/asyncHandler";
import { validate } from "../../middlewares/validate.middleware";

const settingsSchema = z.object({
  body: z.object({
    timezone: z.string().optional(),
    currency: z.string().optional(),
    settings: z.record(z.unknown()).optional()
  })
});

export const settingsRouter = Router();
settingsRouter.use(authenticate);

settingsRouter.get(
  "/company",
  allowRoles("SUPER_ADMIN", "HR_MANAGER"),
  asyncHandler(async (req, res) => {
    const company = await prisma.company.findUnique({ where: { id: req.user!.companyId } });
    res.json({ success: true, data: company });
  })
);

settingsRouter.patch(
  "/company",
  allowRoles("SUPER_ADMIN"),
  validate(settingsSchema),
  asyncHandler(async (req, res) => {
    const company = await prisma.company.update({
      where: { id: req.user!.companyId },
      data: req.body
    });
    res.json({ success: true, data: company });
  })
);
