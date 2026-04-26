import crypto from "crypto";
import Razorpay from "razorpay";
import { env } from "../config/env";

export const razorpayClient =
  env.RAZORPAY_KEY_ID && env.RAZORPAY_KEY_SECRET
    ? new Razorpay({
        key_id: env.RAZORPAY_KEY_ID,
        key_secret: env.RAZORPAY_KEY_SECRET
      })
    : null;

export const razorpayService = {
  verifyWebhookSignature: (rawBody: string, signature: string): boolean => {
    const secret = env.RAZORPAYX_WEBHOOK_SECRET ?? "";
    const expected = crypto.createHmac("sha256", secret).update(rawBody).digest("hex");
    return expected === signature;
  }
};
