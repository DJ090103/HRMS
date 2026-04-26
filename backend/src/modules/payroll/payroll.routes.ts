import { Router } from "express";
import { z } from "zod";
import { PayrollStatus } from "@prisma/client";
import { prisma } from "../../db/prisma";
import { authenticate } from "../../middlewares/auth.middleware";
import { allowPermissions } from "../../middlewares/rbac.middleware";
import { validate } from "../../middlewares/validate.middleware";
import { asyncHandler } from "../../common/utils/asyncHandler";
import { payrollEngineService } from "../../services/payrollEngine.service";
import { pdfService } from "../../services/pdf.service";
import { cloudinaryService } from "../../services/cloudinary.service";
import { enqueuePayrollPayout } from "../../queues";

const processSchema = z.object({
  body: z.object({
    month: z.number().min(1).max(12),
    year: z.number().min(2020).max(2100)
  })
});

const runIdSchema = z.object({
  body: z.object({
    payrollRunId: z.string()
  })
});

export const payrollRouter = Router();
payrollRouter.use(authenticate);

payrollRouter.post(
  "/process",
  allowPermissions("payroll:process"),
  validate(processSchema),
  asyncHandler(async (req, res) => {
    const data = await payrollEngineService.processMonthlyPayroll(
      req.user!.companyId,
      req.body.month,
      req.body.year,
      req.user!.id
    );
    res.json({ success: true, data });
  })
);

payrollRouter.post(
  "/approve",
  allowPermissions("payroll:process"),
  validate(runIdSchema),
  asyncHandler(async (req, res) => {
    const data = await prisma.payrollRun.update({
      where: { id: req.body.payrollRunId },
      data: {
        status: PayrollStatus.APPROVED,
        approvedBy: req.user!.id,
        approvedAt: new Date()
      }
    });
    res.json({ success: true, data });
  })
);

payrollRouter.post(
  "/generate-payslips",
  allowPermissions("payroll:process"),
  validate(runIdSchema),
  asyncHandler(async (req, res) => {
    const run = await prisma.payrollRun.findUnique({
      where: { id: req.body.payrollRunId },
      include: { lineItems: { include: { employeeProfile: { include: { user: true } } } } }
    });
    if (!run) {
      throw new Error("Payroll run not found");
    }

    for (const line of run.lineItems) {
      const buffer = await pdfService.generatePayslipBuffer(line.employeeProfile.user, run, line);
      const url = await cloudinaryService.uploadBuffer(buffer, "payslips", `payslip_${run.id}_${line.id}`);
      await prisma.payrollLineItem.update({
        where: { id: line.id },
        data: { slipUrl: url }
      });
    }

    res.json({ success: true, message: "Payslips generated" });
  })
);

payrollRouter.post(
  "/disburse",
  allowPermissions("payroll:process"),
  validate(runIdSchema),
  asyncHandler(async (req, res) => {
    await enqueuePayrollPayout("disburse-payroll", {
      payrollRunId: req.body.payrollRunId,
      actorId: req.user!.id
    });
    res.json({ success: true, message: "Payroll disbursement request accepted" });
  })
);
