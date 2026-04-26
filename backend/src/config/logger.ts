import { createLogger, format, transports } from "winston";
import { env } from "./env";

const logFormat = format.combine(
  format.timestamp(),
  format.errors({ stack: true }),
  format.printf(({ level, message, timestamp, stack, ...meta }) => {
    const payload = {
      level,
      message,
      timestamp,
      ...(stack ? { stack } : {}),
      ...meta
    };
    return JSON.stringify(payload);
  })
);

export const logger = createLogger({
  level: env.NODE_ENV === "production" ? "info" : "debug",
  format: logFormat,
  transports: [new transports.Console()]
});
