import { app } from "./app";
import { env } from "./config/env";
import { logger } from "./config/logger";
import { prisma } from "./db/prisma";
import { redis } from "./db/redis";

const server = app.listen(env.PORT, () => {
  logger.info(`HRMS backend running on port ${env.PORT}`);
});

const shutdown = async (signal: string): Promise<void> => {
  logger.info(`Received ${signal}. Shutting down gracefully`);
  server.close(async () => {
    await prisma.$disconnect();
    redis?.disconnect();
    process.exit(0);
  });
};

process.on("SIGINT", () => void shutdown("SIGINT"));
process.on("SIGTERM", () => void shutdown("SIGTERM"));
