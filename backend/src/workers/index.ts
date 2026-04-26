import { Worker } from "bullmq";
import { logger } from "../config/logger";
import { isRedisEnabled, redis } from "../db/redis";
import { prisma } from "../db/prisma";
import { emailService } from "../services/email.service";
import { QUEUES } from "../queues";

if (!isRedisEnabled || !redis) {
  logger.warn("Workers not started because Redis is disabled.");
} else {
  new Worker(
    QUEUES.NOTIFICATIONS,
    async (job) => {
      const payload = job.data as {
        userId: string;
        title: string;
        body: string;
        channel?: "IN_APP" | "EMAIL";
      };
      if (payload.channel === "EMAIL") {
        const user = await prisma.user.findUnique({ where: { id: payload.userId } });
        if (user) {
          await emailService.send(user.email, payload.title, `<p>${payload.body}</p>`);
        }
      }
      logger.info("Notification job processed", { jobId: job.id, userId: payload.userId });
    },
    { connection: redis }
  );

  new Worker(
    QUEUES.PAYROLL_PAYOUT,
    async (job) => {
      logger.info("Payroll payout job received", { jobId: job.id, data: job.data });
    },
    { connection: redis }
  );

  logger.info("Workers started");
}
