import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../db/prisma";
import { authenticate } from "../../middlewares/auth.middleware";
import { allowPermissions } from "../../middlewares/rbac.middleware";
import { asyncHandler } from "../../common/utils/asyncHandler";
import { validate } from "../../middlewares/validate.middleware";

const holidaySchema = z.object({
  body: z.object({
    name: z.string().min(2),
    date: z.string().datetime(),
    isOptional: z.boolean().default(false)
  })
});

export const holidayRouter = Router();
holidayRouter.use(authenticate);

holidayRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const data = await prisma.holiday.findMany({
      where: { companyId: req.user!.companyId },
      orderBy: { date: "asc" }
    });
    res.json({ success: true, data });
  })
);

holidayRouter.post(
  "/",
  allowPermissions("employee:write"),
  validate(holidaySchema),
  asyncHandler(async (req, res) => {
    const data = await prisma.holiday.create({
      data: {
        companyId: req.user!.companyId,
        name: req.body.name,
        date: new Date(req.body.date),
        isOptional: req.body.isOptional
      }
    });
    res.status(201).json({ success: true, data });
  })
);
