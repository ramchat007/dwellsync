import { IAuthProvider, OtpSendParams, OtpSendResult, OtpVerifyParams, OtpVerifyResult } from "./types";
import { checkRateLimit, setDevOtp, verifyDevOtp } from "./otpStore";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export class EmailOtpProvider implements IAuthProvider {
  readonly id = "email_otp";
  readonly name = "Email OTP";
  readonly isConfigured = true;

  async sendOtp(params: OtpSendParams): Promise<OtpSendResult> {
    const { identifier } = params;
    const email = identifier.trim().toLowerCase();

    if (!email || !email.includes("@")) {
      return { success: false, error: "Please enter a valid email address." };
    }

    const rateCheck = checkRateLimit(email);
    if (!rateCheck.allowed) {
      return {
        success: false,
        error: `Too many attempts. Please wait ${rateCheck.retryAfterSeconds || 60} seconds before requesting a new OTP.`,
      };
    }

    const isProduction = process.env.NODE_ENV === "production";

    if (isProduction) {
      try {
        const supabase = await createServerSupabaseClient();
        const { error } = await supabase.auth.signInWithOtp({
          email,
          options: {
            shouldCreateUser: true,
          },
        });

        if (error) {
          console.error("[EmailOtpProvider] Supabase signInWithOtp error:", error);
          return { success: false, error: "Unable to send verification email. Please try again." };
        }

        return {
          success: true,
          message: `Verification code sent to ${email}.`,
          cooldownSeconds: 30,
        };
      } catch (err) {
        console.error("[EmailOtpProvider] Production email error:", err);
        return { success: false, error: "Email service temporarily unavailable." };
      }
    }

    // Development Mode
    const devCode = "123456";
    setDevOtp(email, devCode);

    return {
      success: true,
      message: `[DEV] Verification code for ${email} is ${devCode}`,
      isDev: true,
      cooldownSeconds: 30,
    };
  }

  async verifyOtp(params: OtpVerifyParams): Promise<OtpVerifyResult> {
    const { identifier, otp } = params;
    const email = identifier.trim().toLowerCase();

    const isProduction = process.env.NODE_ENV === "production";

    if (isProduction) {
      try {
        const supabase = await createServerSupabaseClient();
        const { data, error } = await supabase.auth.verifyOtp({
          email,
          token: otp,
          type: "email",
        });

        if (error || !data.user) {
          return { success: false, error: "The code is incorrect or has expired. Please request a new OTP." };
        }

        return { success: true };
      } catch (err) {
        console.error("[EmailOtpProvider] Verify error:", err);
        return { success: false, error: "Unable to verify email code." };
      }
    }

    // Development Mode
    const devCheck = verifyDevOtp(email, otp);
    if (!devCheck.success) {
      return { success: false, error: devCheck.error || "Invalid verification code." };
    }

    return { success: true };
  }
}

