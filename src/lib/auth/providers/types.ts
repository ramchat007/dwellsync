import { RoleId, Society, SocietyMembership, Profile } from "@/lib/types/database";

export type AuthMethod =
  | "mobile_otp"
  | "email_otp"
  | "google_oauth"
  | "whatsapp_otp"
  | "password";

export interface OtpSendParams {
  identifier: string; // Phone number or Email
  method: "mobile" | "email";
  ipAddress?: string;
}

export interface OtpSendResult {
  success: boolean;
  message?: string;
  error?: string;
  isDev?: boolean;
  cooldownSeconds?: number;
}

export interface OtpVerifyParams {
  identifier: string;
  otp: string;
  method: "mobile" | "email";
}

export interface AuthContextResult {
  user: { id: string; email?: string; phone?: string };
  profile: Profile | null;
  isSuperAdmin: boolean;
  isNewUser: boolean;
  societyMemberships: (SocietyMembership & { society: Society })[];
  activeMembership: (SocietyMembership & { society: Society }) | null;
  activeRole: RoleId | null;
  redirectUrl: string;
  requiresSocietySelection: boolean;
  requiresRoleSelection: boolean;
  availableSocieties: Society[];
  availableRoles: RoleId[];
}

export interface OtpVerifyResult {
  success: boolean;
  error?: string;
  context?: AuthContextResult;
}

export interface IAuthProvider {
  readonly id: AuthMethod;
  readonly name: string;
  readonly isConfigured: boolean;
  sendOtp?(params: OtpSendParams): Promise<OtpSendResult>;
  verifyOtp?(params: OtpVerifyParams): Promise<OtpVerifyResult>;
}

