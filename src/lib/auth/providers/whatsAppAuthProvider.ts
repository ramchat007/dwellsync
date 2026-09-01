import { IAuthProvider, OtpSendParams, OtpSendResult, OtpVerifyParams, OtpVerifyResult } from "./types";

/**
 * WhatsApp Authentication Provider Interface (Meta Cloud API / Business Solution Provider)
 * Architecture prepared for official Meta WhatsApp Business API integration without requiring rewrites.
 */
export class WhatsAppAuthProvider implements IAuthProvider {
  readonly id = "whatsapp_otp";
  readonly name = "WhatsApp Authentication";
  readonly isConfigured = false; // Activated once legitimate Meta credentials are supplied

  async sendOtp(params: OtpSendParams): Promise<OtpSendResult> {
    return {
      success: false,
      error: "WhatsApp OTP channel is currently in preparation and will be available in upcoming release.",
    };
  }

  async verifyOtp(params: OtpVerifyParams): Promise<OtpVerifyResult> {
    return {
      success: false,
      error: "WhatsApp authentication not configured.",
    };
  }
}

