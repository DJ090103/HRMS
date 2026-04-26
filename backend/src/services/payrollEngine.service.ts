import { Decimal } from "@prisma/client/runtime/library";
import { ReimbursementStatus } from "@prisma/client";
import { prisma } from "../db/prisma";
import { auditService } from "./audit.service";
import { payrollRepository } from "../repositories/payroll.repository";
import { attendanceRepository } from "../repositories/attendance.repository";

type CalcResult = {
  gross: number;
  deductions: number;
  net: number;
  pf: number;
  esi: number;
  professionalTax: number;
  lateDeduction: number;
  leaveDeduction: number;
  reimbursement: number;
};

const toNumber = (value: Decimal | number): number => Number(value);
const round2 = (value: number): number => Number(value.toFixed(2));

const calculateForEmployee = (input: {
  annualCtc: number;
  basicPercent: number;
  hraPercent: number;
  allowanceMonthly: number;
  presentDays: number;
  paidLeaveDays: number;
  workingDays: number;
  overtimeHours: number;
  lateDays: number;
  pfEnabled: boolean;
  esiEnabled: boolean;
  professionalTax: number;
  reimbAmount: number;
}): CalcResult => {
  const monthlyCtc = input.annualCtc / 12;
  const basic = (monthlyCtc * input.basicPercent) / 100;
  const hra = (monthlyCtc * input.hraPercent) / 100;
  const allowance = input.allowanceMonthly;
  const bonus = monthlyCtc - (basic + hra + allowance);

  const payableRatio = (input.presentDays + input.paidLeaveDays) / Math.max(1, input.workingDays);
  const proratedGross = (basic + hra + allowance + bonus) * Math.min(1, payableRatio);
  const overtimePay = (monthlyCtc / Math.max(1, input.workingDays) / 8) * input.overtimeHours;
  const gross = round2(proratedGross + overtimePay);

  const pf = input.pfEnabled ? round2(Math.min(1800, basic * 0.12)) : 0;
  const esi = input.esiEnabled ? round2(gross * 0.0075) : 0;
  const professionalTax = round2(input.professionalTax);
  const lateDeduction = round2((monthlyCtc / Math.max(1, input.workingDays)) * input.lateDays * 0.25);
  const leaveDeduction = round2(Math.max(0, monthlyCtc * (1 - payableRatio)));
  const deductions = round2(pf + esi + professionalTax + lateDeduction + leaveDeduction);
  const reimbursement = round2(input.reimbAmount);
  const net = round2(Math.max(0, gross - deductions + reimbursement));

  return { gross, deductions, net, pf, esi, professionalTax, lateDeduction, leaveDeduction, reimbursement };
};

export const payrollEngineService = {
  processMonthlyPayroll: async (companyId: string, month: number, year: number, actorId: string) => {
    const start = new Date(year, month - 1, 1);
    const end = new Date(year, month, 0, 23, 59, 59);
    const workingDays = new Date(year, month, 0).getDate();

    const employees = await prisma.employeeProfile.findMany({
      where: { user: { companyId, isActive: true } },
      include: { user: true }
    });

    const run = await payrollRepository.upsertRun(companyId, month, year);

    await payrollRepository.clearLineItems(run.id);

    let totalGross = 0;
    let totalNet = 0;
    let totalDeductions = 0;

    for (const employee of employees) {
      const attendance = await attendanceRepository.listByUserDateRange(employee.userId, start, end);
      const leaves = await prisma.leaveRequest.findMany({
        where: {
          companyId,
          requesterId: employee.userId,
          status: "APPROVED",
          startDate: { lte: end },
          endDate: { gte: start }
        }
      });
      const reimbursements = await prisma.reimbursement.aggregate({
        where: {
          companyId,
          employeeId: employee.id,
          status: ReimbursementStatus.APPROVED,
          createdAt: { gte: start, lte: end }
        },
        _sum: { amount: true }
      });

      const presentDays = attendance.filter((item) => item.status === "PRESENT" || item.status === "HALF_DAY").length;
      const lateDays = attendance.filter((item) => item.isLate).length;
      const overtimeHours = attendance.reduce((sum, item) => sum + item.overtimeMinutes / 60, 0);
      const paidLeaveDays = leaves.reduce((sum, item) => sum + Number(item.dayCount), 0);
      const reimbAmount = Number(reimbursements._sum.amount ?? 0);

      const calc = calculateForEmployee({
        annualCtc: toNumber(employee.baseCtc),
        basicPercent: toNumber(employee.basicPercent),
        hraPercent: toNumber(employee.hraPercent),
        allowanceMonthly: toNumber(employee.allowancesMonthly),
        presentDays,
        paidLeaveDays,
        workingDays,
        overtimeHours,
        lateDays,
        pfEnabled: employee.pfEnabled,
        esiEnabled: employee.esiEnabled,
        professionalTax: toNumber(employee.professionalTax),
        reimbAmount
      });

      totalGross += calc.gross;
      totalDeductions += calc.deductions;
      totalNet += calc.net;

      await prisma.payrollLineItem.create({
        data: {
          payrollRunId: run.id,
          employeeProfileId: employee.id,
          workingDays,
          presentDays,
          paidLeaveDays,
          overtimeHours,
          grossAmount: calc.gross,
          deductionAmount: calc.deductions,
          reimbursementAmount: calc.reimbursement,
          netAmount: calc.net,
          pfDeduction: calc.pf,
          esiDeduction: calc.esi,
          professionalTaxDeduction: calc.professionalTax,
          lateDeduction: calc.lateDeduction,
          leaveDeduction: calc.leaveDeduction
        }
      });
    }

    const updatedRun = await prisma.payrollRun.update({
      where: { id: run.id },
      data: {
        totalGross: round2(totalGross),
        totalNet: round2(totalNet),
        totalDeductions: round2(totalDeductions),
        processedAt: new Date()
      }
    });

    await auditService.log({
      companyId,
      actorId,
      module: "PAYROLL",
      action: "PAYROLL_PROCESSED",
      entityId: run.id,
      payload: { month, year, totalNet: updatedRun.totalNet }
    });

    return updatedRun;
  }
};
