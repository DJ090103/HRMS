import nodemailer from "nodemailer";
import { Resend } from "resend";
import { env } from "../config/env";
import { logger } from "../config/logger";

const transporter =
  env.SMTP_HOST && env.SMTP_PORT && env.SMTP_USER && env.SMTP_PASS
    ? nodemailer.createTransport({
        host: env.SMTP_HOST,
        port: env.SMTP_PORT,
        secure: false,
        auth: { user: env.SMTP_USER, pass: env.SMTP_PASS }
      })
    : null;

const resend = env.RESEND_API_KEY ? new Resend(env.RESEND_API_KEY) : null;

export const emailService = {
  send: async (to: string, subject: string, html: string): Promise<void> => {
    if (resend && env.EMAIL_FROM) {
      await resend.emails.send({ from: env.EMAIL_FROM, to, subject, html });
      return;
    }
    if (transporter && env.EMAIL_FROM) {
      await transporter.sendMail({ from: env.EMAIL_FROM, to, subject, html });
      return;
    }
    logger.warn("Email skipped because no SMTP/Resend provider is configured", { to, subject });
  }
};
