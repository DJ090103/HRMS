import { Router } from "express";
import { prisma } from "../../db/prisma";
import { authenticate } from "../../middlewares/auth.middleware";
import { allowPermissions } from "../../middlewares/rbac.middleware";
import { asyncHandler } from "../../common/utils/asyncHandler";

export const reportRouter = Router();
reportRouter.use(authenticate);

reportRouter.get(
  "/dashboard",
  allowPermissions("reports:read"),
  asyncHandler(async (req, res) => {
    const companyId = req.user!.companyId;
    const [employees, pendingLeaves, pendingReimbursements, payrollRuns] = await Promise.all([
      prisma.user.count({ where: { companyId, isActive: true } }),
      prisma.leaveRequest.count({ where: { companyId, status: "PENDING" } }),
      prisma.reimbursement.count({ where: { companyId, status: "PENDING" } }),
      prisma.payrollRun.findMany({
        where: { companyId },
        orderBy: { createdAt: "desc" },
        take: 6
      })
    ]);

    res.json({
      success: true,
      data: {
        employees,
        pendingLeaves,
        pendingReimbursements,
        recentPayroll: payrollRuns
      }
    });
  })
);

reportRouter.get(
  "/login-activity",
  allowPermissions("reports:read"),
  asyncHandler(async (req, res) => {
    const dateStr = (req.query.date as string) || new Date().toISOString().slice(0, 10);
    const date = new Date(`${dateStr}T00:00:00.000Z`);
    const next = new Date(date);
    next.setUTCDate(next.getUTCDate() + 1);

    const logs = await prisma.loginHistory.findMany({
      where: {
        user: { companyId: req.user!.companyId },
        createdAt: { gte: date, lt: next }
      },
      include: {
        user: { select: { id: true, firstName: true, lastName: true, email: true, role: true } }
      },
      orderBy: { createdAt: "asc" }
    });

    const map = new Map<
      string,
      {
        userId: string;
        name: string;
        email: string;
        role: string;
        firstLoginAt: string | null;
        lastLogoutAt: string | null;
        failedAttempts: number;
      }
    >();

    for (const item of logs) {
      const key = item.userId;
      if (!map.has(key)) {
        map.set(key, {
          userId: item.userId,
          name: `${item.user.firstName} ${item.user.lastName}`,
          email: item.user.email,
          role: item.user.role,
          firstLoginAt: null,
          lastLogoutAt: null,
          failedAttempts: 0
        });
      }
      const acc = map.get(key)!;
      if (!item.success) {
        acc.failedAttempts += 1;
      } else if (item.reason === "LOGOUT") {
        acc.lastLogoutAt = item.createdAt.toISOString();
      } else if (!acc.firstLoginAt) {
        acc.firstLoginAt = item.createdAt.toISOString();
      }
    }

    res.json({
      success: true,
      data: {
        date: dateStr,
        rows: Array.from(map.values())
      }
    });
  })
);

reportRouter.get(
  "/employee/:userId/monthly",
  allowPermissions("reports:read"),
  asyncHandler(async (req, res) => {
    const month = Number(req.query.month);
    const year = Number(req.query.year);
    const start = new Date(year, month - 1, 1);
    const end = new Date(year, month, 0, 23, 59, 59);
    const companyId = req.user!.companyId;
    const userId = req.params.userId;

    const user = await prisma.user.findFirst({
      where: { id: userId, companyId },
      include: { employeeProfile: true }
    });
    if (!user) {
      res.status(404).json({ success: false, code: "EMPLOYEE_NOT_FOUND", message: "Employee not found" });
      return;
    }

    const attendance = await prisma.attendance.findMany({
      where: { companyId, userId, date: { gte: start, lte: end } },
      orderBy: { date: "asc" }
    });
    const leaves = await prisma.leaveRequest.findMany({
      where: {
        companyId,
        requesterId: userId,
        startDate: { lte: end },
        endDate: { gte: start }
      }
    });
    const reimbursements = await prisma.reimbursement.findMany({
      where: { companyId, submittedById: userId, createdAt: { gte: start, lte: end } },
      orderBy: { createdAt: "desc" }
    });
    const wfhRequests = await prisma.wfhRequest.findMany({
      where: { companyId, requesterId: userId, createdAt: { gte: start, lte: end } },
      orderBy: { createdAt: "desc" }
    });
    const payrollRun = await prisma.payrollRun.findUnique({
      where: { companyId_month_year: { companyId, month, year } },
      include: { lineItems: { include: { employeeProfile: true } } }
    });

    const payrollLine = payrollRun?.lineItems.find((line) => line.employeeProfile.userId === userId) || null;

    const metrics = {
      presentDays: attendance.filter((a) => a.status === "PRESENT" || a.status === "HALF_DAY").length,
      lateDays: attendance.filter((a) => a.isLate).length,
      overtimeHours: Number((attendance.reduce((sum, a) => sum + a.overtimeMinutes, 0) / 60).toFixed(2)),
      leaveDaysApproved: leaves
        .filter((l) => l.status === "APPROVED")
        .reduce((sum, l) => sum + Number(l.dayCount), 0),
      reimbursementsApprovedAmount: reimbursements
        .filter((r) => r.status === "APPROVED")
        .reduce((sum, r) => sum + Number(r.amount), 0),
      reimbursementsPendingAmount: reimbursements
        .filter((r) => r.status === "PENDING")
        .reduce((sum, r) => sum + Number(r.amount), 0),
      approvedWfhDays: wfhRequests
        .filter((w) => w.status === "APPROVED")
        .reduce((sum, w) => sum + (Array.isArray(w.requestedDates) ? w.requestedDates.length : 0), 0),
      payroll: payrollLine
        ? {
            grossAmount: Number(payrollLine.grossAmount),
            deductionAmount: Number(payrollLine.deductionAmount),
            reimbursementAmount: Number(payrollLine.reimbursementAmount),
            netAmount: Number(payrollLine.netAmount),
            slipUrl: payrollLine.slipUrl
          }
        : null
    };

    res.json({
      success: true,
      data: {
        user: {
          id: user.id,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          role: user.role,
          employeeProfile: user.employeeProfile
        },
        month,
        year,
        metrics,
        attendance,
        leaves,
        reimbursements,
        wfhRequests
      }
    });
  })
);
