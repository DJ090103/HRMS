import { PrismaClient } from "@prisma/client";
import { prisma } from "../db/prisma";

class AttendanceRepository {
  constructor(private readonly client: PrismaClient = prisma) {}

  listByUserDateRange(userId: string, start: Date, end: Date) {
    return this.client.attendance.findMany({
      where: { userId, date: { gte: start, lte: end } }
    });
  }
}

export const attendanceRepository = new AttendanceRepository();
