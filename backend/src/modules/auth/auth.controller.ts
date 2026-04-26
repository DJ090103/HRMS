import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import { authService } from "./auth.service";

const clientInfo = (req: Request) => ({
  ipAddress: req.ip,
  userAgent: req.headers["user-agent"]
});

export const authController = {
  login: async (req: Request, res: Response) => {
    const { companyId, email, password, otp } = req.body;
    const payload = await authService.login(companyId, email, password, otp, clientInfo(req));
    res.status(StatusCodes.OK).json({ success: true, data: payload });
  },

  refresh: async (req: Request, res: Response) => {
    const { refreshToken } = req.body;
    const payload = await authService.refresh(refreshToken);
    res.status(StatusCodes.OK).json({ success: true, data: payload });
  },

  logout: async (req: Request, res: Response) => {
    if (req.user?.sessionId) {
      await authService.logout(req.user.sessionId, clientInfo(req));
    }
    res.status(StatusCodes.OK).json({ success: true });
  },

  sessions: async (req: Request, res: Response) => {
    const data = await authService.listSessions(req.user!.id);
    res.status(StatusCodes.OK).json({ success: true, data });
  },

  revokeSession: async (req: Request, res: Response) => {
    await authService.revokeSession(req.user!.id, req.params.sessionId);
    res.status(StatusCodes.OK).json({ success: true });
  },

  loginHistory: async (req: Request, res: Response) => {
    const data = await authService.loginHistory(req.user!.id);
    res.status(StatusCodes.OK).json({ success: true, data });
  },

  forgotPassword: async (req: Request, res: Response) => {
    const { companyId, email } = req.body;
    await authService.sendOtp(companyId, email, "RESET_PASSWORD");
    res.status(StatusCodes.OK).json({ success: true, message: "OTP sent" });
  },

  resetPassword: async (req: Request, res: Response) => {
    const { companyId, email, otp, newPassword } = req.body;
    await authService.resetPassword(companyId, email, otp, newPassword);
    res.status(StatusCodes.OK).json({ success: true, message: "Password reset successful" });
  },

  sendEmailVerificationOtp: async (req: Request, res: Response) => {
    const { companyId, email } = req.body;
    await authService.sendOtp(companyId, email, "VERIFY_EMAIL");
    res.status(StatusCodes.OK).json({ success: true, message: "Verification OTP sent" });
  },

  verifyEmail: async (req: Request, res: Response) => {
    const { companyId, email, otp } = req.body;
    await authService.verifyOtp(companyId, email, otp, "VERIFY_EMAIL");
    res.status(StatusCodes.OK).json({ success: true, message: "Email verified" });
  }
};
