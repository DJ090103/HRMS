import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { env } from "../config/env";

export const helmetMiddleware = helmet({
  contentSecurityPolicy: false
});

export const corsMiddleware = cors({
  origin: env.CORS_ORIGIN.split(",").map((item) => item.trim()),
  credentials: true
});

export const apiRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 300,
  standardHeaders: true,
  legacyHeaders: false
});
