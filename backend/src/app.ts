import cookieParser from "cookie-parser";
import express from "express";
import { env } from "./config/env";
import { apiRateLimiter, corsMiddleware, helmetMiddleware } from "./middlewares/security.middleware";
import { requestLogger } from "./middlewares/requestLogger.middleware";
import { requestContext } from "./middlewares/requestContext.middleware";
import { errorHandler, notFoundHandler } from "./middlewares/errorHandler.middleware";
import { rootRouter } from "./routes";

export const app = express();

app.use(requestContext);
app.use(helmetMiddleware);
app.use(corsMiddleware);
app.use(apiRateLimiter);
app.use(requestLogger);
app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.get("/health", (_req, res) => {
  res.json({ success: true, status: "ok" });
});

app.use(env.API_PREFIX, rootRouter);
app.use(notFoundHandler);
app.use(errorHandler);
