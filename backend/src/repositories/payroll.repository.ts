import { PrismaClient } from "@prisma/client";
import { prisma } from "../db/prisma";

class PayrollRepository {
  constructor(private readonly client: PrismaClient = prisma) {}

  upsertRun(companyId: string, month: number, year: number) {
    return this.client.payrollRun.upsert({
      where: { companyId_month_year: { companyId, month, year } },
      update: { status: "DRAFT" },
      create: { companyId, month, year, status: "DRAFT" }
    });
  }

  clearLineItems(payrollRunId: string) {
    return this.client.payrollLineItem.deleteMany({ where: { payrollRunId } });
  }
}

export const payrollRepository = new PayrollRepository();
