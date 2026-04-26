import { z } from "zod";

export const loginSchema = z.object({
  body: z.object({
    email: z.string().email(),
    password: z.string().min(8),
    companyId: z.string().min(1),
    otp: z.string().length(6).optional()
  })
});

export const refreshSchema = z.object({
  body: z.object({
    refreshToken: z.string().min(20)
  })
});

export const forgotPasswordSchema = z.object({
  body: z.object({
    companyId: z.string().min(1),
    email: z.string().email()
  })
});

export const resetPasswordSchema = z.object({
  body: z.object({
    companyId: z.string().min(1),
    email: z.string().email(),
    otp: z.string().length(6),
    newPassword: z.string().min(8).max(72)
  })
});

export const verifyEmailSchema = z.object({
  body: z.object({
    companyId: z.string().min(1),
    email: z.string().email(),
    otp: z.string().length(6)
  })
});
