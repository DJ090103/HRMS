import { Router } from "express";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "../../db/prisma";
import { attendanceEngineService } from "../../services/attendanceEngine.service";
import { authenticate } from "../../middlewares/auth.middleware";
import { allowPermissions } from "../../middlewares/rbac.middleware";
import { asyncHandler } from "../../common/utils/asyncHandler";
import { validate } from "../../middlewares/validate.middleware";

const correctionSchema = z.object({
  body: z.object({
    attendanceId: z.string(),
    punchInAt: z.string().datetime().optional(),
    punchOutAt: z.string().datetime().optional(),
    note: z.string().min(5)
  })
});

const weeklyWfhSchema = z.object({
  body: z.object({
    weekStart: z.string().datetime(),
    requestedDates: z.array(z.string().datetime()).min(1).max(5),
    reason: z.string().max(500).optional()
  })
});

const reviewWfhSchema = z.object({
  body: z.object({
    status: z.enum(["APPROVED", "REJECTED"]),
    rejectionNote: z.string().max(500).optional()
  })
});

const getWeekStart = (date: Date): Date => {
  const current = new Date(date);
  current.setHours(0, 0, 0, 0);
  const day = current.getDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  current.setDate(current.getDate() + mondayOffset);
  return current;
};

const isSameDay = (a: Date, b: Date): boolean =>
  a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

const isMonToFri = (d: Date): boolean => {
  const day = d.getDay();
  return day >= 1 && day <= 5;
};

export const attendanceRouter = Router();
attendanceRouter.use(authenticate);

attendanceRouter.post(
  "/punch-in",
  allowPermissions("self:attendance"),
  asyncHandler(async (req, res) => {
    await attendanceEngineService.punchIn(req.user!.companyId, req.user!.id);
    res.json({ success: true, message: "Punched in successfully" });
  })
);

attendanceRouter.post(
  "/punch-out",
  allowPermissions("self:attendance"),
  asyncHandler(async (req, res) => {
    await attendanceEngineService.punchOut(req.user!.id);
    res.json({ success: true, message: "Punched out successfully" });
  })
);

attendanceRouter.get(
  "/monthly",
  allowPermissions("attendance:approve"),
  asyncHandler(async (req, res) => {
    const month = Number(req.query.month);
    const year = Number(req.query.year);
    const start = new Date(year, month - 1, 1);
    const end = new Date(year, month, 0, 23, 59, 59);
    const data = await prisma.attendance.findMany({
      where: { companyId: req.user!.companyId, date: { gte: start, lte: end } },
      include: { user: true }
    });
    res.json({ success: true, data });
  })
);

attendanceRouter.get(
  "/employee/:userId/monthly",
  allowPermissions("attendance:approve"),
  asyncHandler(async (req, res) => {
    const month = Number(req.query.month);
    const year = Number(req.query.year);
    const start = new Date(year, month - 1, 1);
    const end = new Date(year, month, 0, 23, 59, 59);

    const data = await prisma.attendance.findMany({
      where: {
        companyId: req.user!.companyId,
        userId: req.params.userId,
        date: { gte: start, lte: end }
      },
      orderBy: { date: "asc" }
    });

    const summary = {
      presentDays: data.filter((item) => item.status === "PRESENT" || item.status === "HALF_DAY").length,
      lateDays: data.filter((item) => item.isLate && !!item.punchInAt).length,
      overtimeHours: Number((data.reduce((sum, item) => sum + item.overtimeMinutes, 0) / 60).toFixed(2))
    };

    res.json({ success: true, data, summary });
  })
);

attendanceRouter.get(
  "/me",
  allowPermissions("self:attendance"),
  asyncHandler(async (req, res) => {
    const month = Number(req.query.month);
    const year = Number(req.query.year);
    const start = new Date(year, month - 1, 1);
    const end = new Date(year, month, 0, 23, 59, 59);

    const data = await prisma.attendance.findMany({
      where: {
        companyId: req.user!.companyId,
        userId: req.user!.id,
        date: { gte: start, lte: end }
      },
      orderBy: { date: "asc" }
    });

    const summary = {
      presentDays: data.filter((item) => item.status === "PRESENT" || item.status === "HALF_DAY").length,
      lateDays: data.filter((item) => item.isLate && !!item.punchInAt).length,
      overtimeHours: Number((data.reduce((sum, item) => sum + item.overtimeMinutes, 0) / 60).toFixed(2))
    };

    res.json({ success: true, data, summary });
  })
);

attendanceRouter.post(
  "/wfh/weekly",
  allowPermissions("self:attendance"),
  validate(weeklyWfhSchema),
  asyncHandler(async (req, res) => {
    const inputWeekStart = new Date(req.body.weekStart);
    const currentWeekStart = getWeekStart(new Date());

    if (!isSameDay(inputWeekStart, currentWeekStart)) {
      res.status(400).json({
        success: false,
        code: "INVALID_WEEK",
        message: "WFH request is allowed only for the current week (Monday to Friday)."
      });
      return;
    }

    const requestedDates: Date[] = (req.body.requestedDates as string[]).map((value) => new Date(value));
    const currentWeekEnd = new Date(currentWeekStart);
    currentWeekEnd.setDate(currentWeekStart.getDate() + 4);

    const invalidDate = requestedDates.find((date) => {
      const normalized = new Date(date);
      normalized.setHours(0, 0, 0, 0);
      return !isMonToFri(normalized) || normalized < currentWeekStart || normalized > currentWeekEnd;
    });

    if (invalidDate) {
      res.status(400).json({
        success: false,
        code: "INVALID_WFH_DATES",
        message: "WFH dates must be within current week and only Monday to Friday."
      });
      return;
    }

    const uniqueDates: string[] = Array.from(
      new Set(
        requestedDates.map((d: Date) => {
          const x = new Date(d);
          x.setHours(0, 0, 0, 0);
          return x.toISOString();
        })
      )
    );

    const data = await prisma.wfhRequest.upsert({
      where: {
        requesterId_weekStart: {
          requesterId: req.user!.id,
          weekStart: currentWeekStart
        }
      },
      update: {
        requestedDates: uniqueDates as Prisma.InputJsonValue,
        reason: req.body.reason,
        status: "PENDING",
        rejectionNote: null,
        reviewedAt: null,
        reviewedById: null
      },
      create: {
        companyId: req.user!.companyId,
        requesterId: req.user!.id,
        weekStart: currentWeekStart,
        requestedDates: uniqueDates as Prisma.InputJsonValue,
        reason: req.body.reason
      }
    });

    res.json({ success: true, data, message: "Weekly WFH request submitted." });
  })
);

attendanceRouter.get(
  "/wfh/weekly/me",
  allowPermissions("self:attendance"),
  asyncHandler(async (req, res) => {
    const weekStart = req.query.weekStart ? new Date(String(req.query.weekStart)) : getWeekStart(new Date());
    weekStart.setHours(0, 0, 0, 0);
    const data = await prisma.wfhRequest.findFirst({
      where: {
        companyId: req.user!.companyId,
        requesterId: req.user!.id,
        weekStart
      }
    });
    res.json({ success: true, data });
  })
);

attendanceRouter.get(
  "/wfh/weekly/team",
  allowPermissions("attendance:approve"),
  asyncHandler(async (req, res) => {
    const weekStart = req.query.weekStart ? new Date(String(req.query.weekStart)) : getWeekStart(new Date());
    weekStart.setHours(0, 0, 0, 0);
    const data = await prisma.wfhRequest.findMany({
      where: { companyId: req.user!.companyId, weekStart },
      include: {
        requester: { select: { id: true, firstName: true, lastName: true, email: true } },
        reviewedBy: { select: { id: true, firstName: true, lastName: true } }
      },
      orderBy: { createdAt: "desc" }
    });
    res.json({ success: true, data });
  })
);

attendanceRouter.post(
  "/wfh/weekly/:id/review",
  allowPermissions("attendance:approve"),
  validate(reviewWfhSchema),
  asyncHandler(async (req, res) => {
    const data = await prisma.wfhRequest.update({
      where: { id: req.params.id },
      data: {
        status: req.body.status,
        rejectionNote: req.body.status === "REJECTED" ? req.body.rejectionNote : null,
        reviewedById: req.user!.id,
        reviewedAt: new Date()
      }
    });
    res.json({ success: true, data });
  })
);

attendanceRouter.post(
  "/correction",
  allowPermissions("attendance:approve"),
  validate(correctionSchema),
  asyncHandler(async (req, res) => {
    const data = await prisma.attendance.update({
      where: { id: req.body.attendanceId },
      data: {
        punchInAt: req.body.punchInAt ? new Date(req.body.punchInAt) : undefined,
        punchOutAt: req.body.punchOutAt ? new Date(req.body.punchOutAt) : undefined,
        note: req.body.note
      }
    });
    res.json({ success: true, data });
  })
);
