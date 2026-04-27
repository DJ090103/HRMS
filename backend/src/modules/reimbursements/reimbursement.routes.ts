import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../db/prisma";
import { authenticate } from "../../middlewares/auth.middleware";
import { allowPermissions } from "../../middlewares/rbac.middleware";
import { validate } from "../../middlewares/validate.middleware";
import { asyncHandler } from "../../common/utils/asyncHandler";

const requestSchema = z.object({
  body: z.object({
    employeeProfileId: z.string(),
    title: z.string().min(2),
    category: z.string().min(2),
    amount: z.number().positive(),
    proofUrl: z.string().url().optional(),
    notes: z.string().optional()
  })
});

const approveSchema = z.object({
  body: z.object({
    reimbursementId: z.string(),
    status: z.enum(["APPROVED", "REJECTED", "PAID"])
  })
});

export const reimbursementRouter = Router();
reimbursementRouter.use(authenticate);

reimbursementRouter.post(
  "/",
  allowPermissions("self:reimbursement"),
  validate(requestSchema),
  asyncHandler(async (req, res) => {
    const data = await prisma.reimbursement.create({
      data: {
        companyId: req.user!.companyId,
        employeeId: req.body.employeeProfileId,
        submittedById: req.user!.id,
        title: req.body.title,
        category: req.body.category,
        amount: req.body.amount,
        proofUrl: req.body.proofUrl,
        notes: req.body.notes
      }
    });
    res.status(201).json({ success: true, data });
  })
);

reimbursementRouter.post(
  "/approve",
  allowPermissions("reimbursement:approve"),
  validate(approveSchema),
  asyncHandler(async (req, res) => {
    const data = await prisma.reimbursement.update({
      where: { id: req.body.reimbursementId },
      data: { status: req.body.status, approvedById: req.user!.id }
    });
    res.json({ success: true, data });
  })
);

reimbursementRouter.get(
  "/pending",
  allowPermissions("reimbursement:approve"),
  asyncHandler(async (req, res) => {
    const data = await prisma.reimbursement.findMany({
      where: { companyId: req.user!.companyId, status: "PENDING" },
      include: {
        submittedBy: { select: { firstName: true, lastName: true, email: true } }
      },
      orderBy: { createdAt: "desc" }
    });
    res.json({ success: true, data });
  })
);

reimbursementRouter.get(
  "/mine",
  allowPermissions("self:reimbursement"),
  asyncHandler(async (req, res) => {
    const data = await prisma.reimbursement.findMany({
      where: { submittedById: req.user!.id, companyId: req.user!.companyId },
      orderBy: { createdAt: "desc" }
    });
    res.json({ success: true, data });
  })
);
