import express, { Router } from "express";
import { z } from "zod";
import { prisma } from "../../db/prisma";
import { authenticate } from "../../middlewares/auth.middleware";
import { allowPermissions } from "../../middlewares/rbac.middleware";
import { validate } from "../../middlewares/validate.middleware";
import { asyncHandler } from "../../common/utils/asyncHandler";
import { razorpayService } from "../../services/razorpay.service";

const payoutSchema = z.object({
  body: z.object({
    payrollRunId: z.string(),
    amount: z.number().positive(),
    providerRef: z.string().optional()
  })
});

export const paymentRouter = Router();
paymentRouter.use(authenticate);

paymentRouter.post(
  "/salary-payout",
  allowPermissions("payroll:process"),
  validate(payoutSchema),
  asyncHandler(async (req, res) => {
    const data = await prisma.paymentTransaction.create({
      data: {
        companyId: req.user!.companyId,
        payrollRunId: req.body.payrollRunId,
        provider: "RAZORPAYX",
        providerRef: req.body.providerRef,
        amount: req.body.amount,
        status: "PENDING"
      }
    });
    res.status(201).json({ success: true, data });
  })
);

paymentRouter.get(
  "/transactions",
  allowPermissions("reports:read"),
  asyncHandler(async (req, res) => {
    const data = await prisma.paymentTransaction.findMany({
      where: { companyId: req.user!.companyId },
      orderBy: { createdAt: "desc" }
    });
    res.json({ success: true, data });
  })
);

export const paymentWebhookRouter = Router();
paymentWebhookRouter.use(express.raw({ type: "application/json" }));

paymentWebhookRouter.post(
  "/razorpayx",
  asyncHandler(async (req, res) => {
    const signature = req.headers["x-razorpay-signature"];
    const rawBody = req.body.toString();
    if (!signature || typeof signature !== "string" || !razorpayService.verifyWebhookSignature(rawBody, signature)) {
      res.status(401).json({ success: false, message: "Invalid webhook signature" });
      return;
    }

    const payload = JSON.parse(rawBody) as { payload?: { payout?: { entity?: { id?: string; status?: string } } } };
    const payout = payload.payload?.payout?.entity;
    if (payout?.id) {
      await prisma.paymentTransaction.updateMany({
        where: { providerRef: payout.id },
        data: { status: payout.status ?? "UNKNOWN", payload: payload as object }
      });
    }
    res.json({ success: true });
  })
);
