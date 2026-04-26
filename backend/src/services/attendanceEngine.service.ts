import { AppError } from "../common/errors/AppError";
import { prisma } from "../db/prisma";

const minutesFromDate = (date: Date): number => date.getHours() * 60 + date.getMinutes();

export const attendanceEngineService = {
  punchIn: async (companyId: string, userId: string): Promise<void> => {
    const now = new Date();
    const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const shiftStartMinutes = 9 * 60;
    const isLate = minutesFromDate(now) > shiftStartMinutes + 10;

    await prisma.attendance.upsert({
      where: { userId_date: { userId, date: dayStart } },
      update: { punchInAt: now, isLate },
      create: {
        companyId,
        userId,
        date: dayStart,
        punchInAt: now,
        isLate,
        shiftStartMinutes
      }
    });
  },

  punchOut: async (userId: string): Promise<void> => {
    const now = new Date();
    const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const record = await prisma.attendance.findUnique({ where: { userId_date: { userId, date: dayStart } } });
    if (!record?.punchInAt) {
      throw new AppError(400, "PUNCH_IN_REQUIRED", "Punch in is required before punch out");
    }
    const workedMinutes = Math.floor((now.getTime() - record.punchInAt.getTime()) / 60000);
    const overtimeMinutes = Math.max(0, workedMinutes - 9 * 60);
    await prisma.attendance.update({
      where: { id: record.id },
      data: { punchOutAt: now, overtimeMinutes }
    });
  }
};
