import { IAuthProvider, OtpSendParams, OtpSendResult, OtpVerifyParams, OtpVerifyResult } from "./types";
import { normalizeIndianPhoneNumber } from "@/lib/utils/phone";
import { checkRateLimit, setDevOtp, verifyDevOtp } from "./otpStore";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export class MobileOtpProvider implements IAuthProvider {
  readonly id = "mobile_otp";
  readonly name = "Mobile SMS OTP";
  readonly isConfigured = true;

  async sendOtp(params: OtpSendParams): Promise<OtpSendResult> {
    const { identifier, ipAddress } = params;
    const phoneNorm = normalizeIndianPhoneNumber(identifier);

    if (!phoneNorm.isValid || !phoneNorm.canonical) {
      return { success: false, error: phoneNorm.error || "Invalid mobile number." };
    }

    // 1. Rate limiting check
    const rateCheck = checkRateLimit(phoneNorm.canonical);
    if (!rateCheck.allowed) {
      return {
        success: false,
        error: `Too many attempts. Please wait ${rateCheck.retryAfterSeconds || 60} seconds before requesting a new OTP.`,
      };
    }

    const isProduction = process.env.NODE_ENV === "production";

    // 2. Production Flow via Supabase SMS Auth
    if (isProduction) {
      try {
        const supabase = await createServerSupabaseClient();
        const { error } = await supabase.auth.signInWithOtp({
          phone: phoneNorm.canonical,
        });

        if (error) {
          console.error("[MobileOtpProvider] Supabase signInWithOtp error:", error);
          return { success: false, error: "Unable to send verification SMS. Please try again." };
        }

        return {
          success: true,
          message: `OTP sent successfully to ${phoneNorm.display}.`,
          cooldownSeconds: 30,
        };
      } catch (err) {
        console.error("[MobileOtpProvider] Production SMS error:", err);
        return { success: false, error: "SMS service temporarily unavailable. Please try again." };
      }
    }

    // 3. Development / Local Environment Flow
    // Generate a 6-digit test code (or default 123456)
    const devCode = "123456";
    setDevOtp(phoneNorm.canonical, devCode);

    return {
      success: true,
      message: `[DEV] Verification code for ${phoneNorm.display} is ${devCode}`,
      isDev: true,
      cooldownSeconds: 30,
    };
  }

  async verifyOtp(params: OtpVerifyParams): Promise<OtpVerifyResult> {
    const { identifier, otp } = params;
    const phoneNorm = normalizeIndianPhoneNumber(identifier);

    if (!phoneNorm.isValid || !phoneNorm.canonical) {
      return { success: false, error: "Invalid mobile number." };
    }

    const isProduction = process.env.NODE_ENV === "production";

    // 1. Production verification via Supabase Auth
    if (isProduction) {
      try {
        const supabase = await createServerSupabaseClient();
        const { data, error } = await supabase.auth.verifyOtp({
          phone: phoneNorm.canonical,
          token: otp,
          type: "sms",
        });

        if (error || !data.user) {
          return { success: false, error: "The code is incorrect or has expired. Please request a new OTP." };
        }

        return { success: true };
      } catch (err) {
        console.error("[MobileOtpProvider] Verify error:", err);
        return { success: false, error: "Unable to verify code. Please try again." };
      }
    }

    // 2. Development Mode Verification
    const devCheck = verifyDevOtp(phoneNorm.canonical, otp);
    if (!devCheck.success) {
      return { success: false, error: devCheck.error || "Invalid verification code." };
    }

    return { success: true };
  }
}

