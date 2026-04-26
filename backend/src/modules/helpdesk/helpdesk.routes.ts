import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../db/prisma";
import { authenticate } from "../../middlewares/auth.middleware";
import { asyncHandler } from "../../common/utils/asyncHandler";
import { validate } from "../../middlewares/validate.middleware";

const createTicketSchema = z.object({
  body: z.object({
    title: z.string().min(4),
    description: z.string().min(10),
    priority: z.enum(["LOW", "MEDIUM", "HIGH"]).default("MEDIUM")
  })
});

export const helpdeskRouter = Router();
helpdeskRouter.use(authenticate);

helpdeskRouter.post(
  "/tickets",
  validate(createTicketSchema),
  asyncHandler(async (req, res) => {
    const data = await prisma.helpdeskTicket.create({
      data: {
        companyId: req.user!.companyId,
        createdById: req.user!.id,
        title: req.body.title,
        description: req.body.description,
        priority: req.body.priority
      }
    });
    res.status(201).json({ success: true, data });
  })
);

helpdeskRouter.get(
  "/tickets",
  asyncHandler(async (req, res) => {
    const data = await prisma.helpdeskTicket.findMany({
      where: { companyId: req.user!.companyId },
      orderBy: { createdAt: "desc" }
    });
    res.json({ success: true, data });
  })
);
