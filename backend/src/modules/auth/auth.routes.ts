import { Router } from "express";
import { authController } from "./auth.controller";
import { authenticate } from "../../middlewares/auth.middleware";
import { validate } from "../../middlewares/validate.middleware";
import { asyncHandler } from "../../common/utils/asyncHandler";
import {
  forgotPasswordSchema,
  loginSchema,
  refreshSchema,
  resetPasswordSchema,
  verifyEmailSchema
} from "./auth.validation";

export const authRouter = Router();

authRouter.post("/login", validate(loginSchema), asyncHandler(authController.login));
authRouter.post("/refresh", validate(refreshSchema), asyncHandler(authController.refresh));
authRouter.post("/logout", authenticate, asyncHandler(authController.logout));
authRouter.get("/sessions", authenticate, asyncHandler(authController.sessions));
authRouter.delete("/sessions/:sessionId", authenticate, asyncHandler(authController.revokeSession));
authRouter.get("/login-history", authenticate, asyncHandler(authController.loginHistory));
authRouter.post("/forgot-password", validate(forgotPasswordSchema), asyncHandler(authController.forgotPassword));
authRouter.post("/reset-password", validate(resetPasswordSchema), asyncHandler(authController.resetPassword));
authRouter.post("/verify-email/send-otp", validate(forgotPasswordSchema), asyncHandler(authController.sendEmailVerificationOtp));
authRouter.post("/verify-email", validate(verifyEmailSchema), asyncHandler(authController.verifyEmail));
