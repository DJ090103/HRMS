import cron from "node-cron";
import { logger } from "../config/logger";
import { prisma } from "../db/prisma";

cron.schedule("0 2 * * *", async () => {
  const threshold = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
  await prisma.loginHistory.deleteMany({
    where: { createdAt: { lt: threshold } }
  });
  logger.info("Daily maintenance cron completed");
});

logger.info("Cron scheduler started");
