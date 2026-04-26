import { Queue } from "bullmq";
import { isRedisEnabled, redis } from "../db/redis";
import { logger } from "../config/logger";

export const QUEUES = {
  NOTIFICATIONS: "notifications",
  PAYROLL_PAYOUT: "payroll-payout"
} as const;

export const notificationQueue = isRedisEnabled
  ? new Queue(QUEUES.NOTIFICATIONS, {
      connection: redis!,
      defaultJobOptions: { attempts: 3, removeOnComplete: 1000, backoff: { type: "exponential", delay: 1000 } }
    })
  : null;

export const payrollPayoutQueue = isRedisEnabled
  ? new Queue(QUEUES.PAYROLL_PAYOUT, {
      connection: redis!,
      defaultJobOptions: { attempts: 5, removeOnComplete: 1000, backoff: { type: "exponential", delay: 2000 } }
    })
  : null;

export const enqueueNotification = async (name: string, payload: unknown): Promise<void> => {
  if (!notificationQueue) {
    logger.warn("Notification queue skipped because Redis is disabled", { name });
    return;
  }
  await notificationQueue.add(name, payload);
};

export const enqueuePayrollPayout = async (name: string, payload: unknown): Promise<void> => {
  if (!payrollPayoutQueue) {
    logger.warn("Payroll payout queue skipped because Redis is disabled", { name });
    return;
  }
  await payrollPayoutQueue.add(name, payload);
};
