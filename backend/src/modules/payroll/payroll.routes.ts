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
import { notificationService } from "../notifications/notification.service";

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

const requestPayslipSchema = z.object({
  body: z.object({
    month: z.number().min(1).max(12),
    year: z.number().min(2020).max(2100),
    note: z.string().min(2).max(300).optional()
  })
});

const approvePayslipRequestSchema = z.object({
  body: z.object({
    requestId: z.string(),
    status: z.enum(["APPROVED", "REJECTED"]),
    workingDays: z.number().int().min(1).max(31).optional(),
    presentDays: z.number().min(0).max(31).optional(),
    paidLeaveDays: z.number().min(0).max(31).optional(),
    grossAmount: z.number().min(0).optional(),
    deductionAmount: z.number().min(0).optional(),
    reimbursementAmount: z.number().min(0).optional(),
    netAmount: z.number().min(0).optional(),
    note: z.string().max(300).optional()
  })
});

export const payrollRouter = Router();
payrollRouter.use(authenticate);

payrollRouter.post(
  "/request-payslip",
  allowPermissions("self:read"),
  validate(requestPayslipSchema),
  asyncHandler(async (req, res) => {
    const employeeProfile = await prisma.employeeProfile.findUnique({
      where: { userId: req.user!.id },
      select: { id: true }
    });
    if (!employeeProfile) {
      throw new Error("Employee profile not found");
    }

    const run = await prisma.payrollRun.findUnique({
      where: {
        companyId_month_year: { companyId: req.user!.companyId, month: req.body.month, year: req.body.year }
      },
      include: {
        lineItems: {
          where: { employeeProfileId: employeeProfile.id },
          take: 1
        }
      }
    });

    if (!run || run.lineItems.length === 0) {
      throw new Error("Payroll not processed for requested month");
    }

    const targets = await prisma.user.findMany({
      where: {
        companyId: req.user!.companyId,
        OR: [
          { role: "SUPER_ADMIN" },
          { role: "HR_MANAGER" },
          { rolePermissions: { some: { permission: "payroll:process" } } },
          { rolePermissions: { some: { permission: "*" } } }
        ]
      },
      select: { id: true }
    });

    const meta = {
      type: "PAYSLIP_REQUEST",
      status: "PENDING",
      requesterId: req.user!.id,
      month: req.body.month,
      year: req.body.year,
      payrollRunId: run.id,
      payrollLineItemId: run.lineItems[0].id,
      note: req.body.note ?? null
    };

    const notifications = await Promise.all(
      targets.map((target) =>
        prisma.notification.create({
          data: {
            userId: target.id,
            title: "New payslip request",
            body: `Employee requested payslip preview for ${req.body.month}/${req.body.year}`,
            channel: "IN_APP",
            metadata: meta
          }
        })
      )
    );

    res.status(201).json({ success: true, data: notifications[0] });
  })
);

payrollRouter.get(
  "/my-payslips",
  allowPermissions("self:read"),
  asyncHandler(async (req, res) => {
    const employeeProfile = await prisma.employeeProfile.findUnique({
      where: { userId: req.user!.id },
      select: { id: true }
    });
    if (!employeeProfile) {
      throw new Error("Employee profile not found");
    }

    const items = await prisma.payrollLineItem.findMany({
      where: {
        employeeProfileId: employeeProfile.id,
        payrollRun: { companyId: req.user!.companyId, status: { in: ["APPROVED", "DISBURSED"] } }
      },
      include: { payrollRun: true },
      orderBy: { createdAt: "desc" }
    });

    res.json({
      success: true,
      data: items.map((item) => ({
        id: item.id,
        month: item.payrollRun.month,
        year: item.payrollRun.year,
        grossAmount: Number(item.grossAmount),
        deductionAmount: Number(item.deductionAmount),
        reimbursementAmount: Number(item.reimbursementAmount),
        netAmount: Number(item.netAmount),
        slipUrl: item.slipUrl,
        payrollStatus: item.payrollRun.status
      }))
    });
  })
);

payrollRouter.get(
  "/payslip-requests",
  allowPermissions("payroll:process"),
  asyncHandler(async (req, res) => {
    const data = await prisma.notification.findMany({
      where: {
        userId: req.user!.id,
        metadata: { path: ["type"], equals: "PAYSLIP_REQUEST" }
      },
      include: {
        user: { select: { firstName: true, lastName: true, email: true } }
      },
      orderBy: { createdAt: "desc" }
    });
    res.json({ success: true, data });
  })
);

payrollRouter.post(
  "/approve-payslip-request",
  allowPermissions("payroll:process"),
  validate(approvePayslipRequestSchema),
  asyncHandler(async (req, res) => {
    const request = await prisma.notification.findFirst({
      where: {
        id: req.body.requestId,
        userId: req.user!.id,
        metadata: { path: ["type"], equals: "PAYSLIP_REQUEST" }
      }
    });
    if (!request) {
      throw new Error("Payslip request not found");
    }

    const metadata = (request.metadata ?? {}) as Record<string, unknown>;
    const lineItemId = String(metadata.payrollLineItemId ?? "");
    const requesterId = String(metadata.requesterId ?? "");
    const month = Number(metadata.month ?? 0);
    const year = Number(metadata.year ?? 0);
    if (!lineItemId || !requesterId || !month || !year) {
      throw new Error("Invalid payslip request metadata");
    }

    if (req.body.status === "REJECTED") {
      await prisma.notification.update({
        where: { id: request.id },
        data: {
          isRead: true,
          metadata: { ...metadata, status: "REJECTED", reviewerId: req.user!.id, note: req.body.note ?? null }
        }
      });
      await notificationService.notify({
        userId: requesterId,
        title: "Payslip request rejected",
        body: `Your payslip request for ${month}/${year} was rejected.`,
        channel: "IN_APP"
      });
      res.json({ success: true, data: { status: "REJECTED" } });
      return;
    }

    const existingLine = await prisma.payrollLineItem.findUnique({ where: { id: lineItemId } });
    if (!existingLine) {
      throw new Error("Payroll line item not found");
    }

    const updatedLine = await prisma.payrollLineItem.update({
      where: { id: lineItemId },
      data: {
        workingDays: req.body.workingDays ?? existingLine.workingDays,
        presentDays: req.body.presentDays ?? Number(existingLine.presentDays),
        paidLeaveDays: req.body.paidLeaveDays ?? Number(existingLine.paidLeaveDays),
        grossAmount: req.body.grossAmount ?? Number(existingLine.grossAmount),
        deductionAmount: req.body.deductionAmount ?? Number(existingLine.deductionAmount),
        reimbursementAmount: req.body.reimbursementAmount ?? Number(existingLine.reimbursementAmount),
        netAmount: req.body.netAmount ?? Number(existingLine.netAmount)
      },
      include: {
        payrollRun: true,
        employeeProfile: { include: { user: true } }
      }
    });

    const buffer = await pdfService.generatePayslipBuffer(
      updatedLine.employeeProfile.user,
      updatedLine.payrollRun,
      updatedLine
    );
    const url = await cloudinaryService.uploadBuffer(
      buffer,
      "payslips",
      `payslip_${updatedLine.payrollRun.id}_${updatedLine.id}`
    );

    await prisma.payrollLineItem.update({
      where: { id: updatedLine.id },
      data: { slipUrl: url }
    });

    await prisma.notification.update({
      where: { id: request.id },
      data: {
        isRead: true,
        metadata: { ...metadata, status: "APPROVED", reviewerId: req.user!.id, slipUrl: url, note: req.body.note ?? null }
      }
    });

    await notificationService.notify({
      userId: requesterId,
      title: "Payslip request approved",
      body: `Your payslip for ${month}/${year} is approved and ready to download.`,
      channel: "IN_APP"
    });

    res.json({ success: true, data: { slipUrl: url, lineItemId: updatedLine.id } });
  })
);

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
