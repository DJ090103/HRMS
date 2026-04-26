import Redis from "ioredis";
import { env } from "../config/env";
import { logger } from "../config/logger";

const isPlaceholderRedis = (url: string): boolean => {
  try {
    const parsed = new URL(url);
    return !parsed.hostname || parsed.hostname === "host" || parsed.hostname === "localhost.localdomain";
  } catch {
    return true;
  }
};

export const isRedisEnabled = Boolean(env.REDIS_URL && !isPlaceholderRedis(env.REDIS_URL));

export const redis = isRedisEnabled
  ? new Redis(env.REDIS_URL!, {
      maxRetriesPerRequest: null,
      enableReadyCheck: true,
      lazyConnect: true,
      retryStrategy: (times) => {
        if (times > 5) {
          return null;
        }
        return Math.min(times * 300, 2000);
      }
    })
  : null;

if (!isRedisEnabled) {
  logger.warn("Redis disabled: set a valid REDIS_URL to enable queues, OTP cache, and async workers.");
}
