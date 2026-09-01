import { cookies } from "next/headers";
import { MobileOtpProvider } from "./mobileOtpProvider";
import { EmailOtpProvider } from "./emailOtpProvider";
import { GoogleAuthProvider } from "./googleAuthProvider";
import { WhatsAppAuthProvider } from "./whatsAppAuthProvider";
import {
  AuthMethod,
  OtpSendParams,
  OtpSendResult,
  OtpVerifyParams,
  OtpVerifyResult,
  AuthContextResult,
} from "./types";
import { createAdminClient } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { normalizeIndianPhoneNumber } from "@/lib/utils/phone";
import { recordAuditLog } from "@/lib/auth/audit";
import { getDashboardPathForRole } from "@/lib/auth/persona";
import { setAuthSessionCookie } from "@/lib/auth/session";
import { Profile, RoleId, Society, SocietyMembership } from "@/lib/types/database";

export class AuthService {
  private mobileProvider = new MobileOtpProvider();
  private emailProvider = new EmailOtpProvider();
  private googleProvider = new GoogleAuthProvider();
  private whatsAppProvider = new WhatsAppAuthProvider();

  async requestOtp(params: OtpSendParams): Promise<OtpSendResult> {
    const { method } = params;

    let result: OtpSendResult;
    if (method === "mobile") {
      result = await this.mobileProvider.sendOtp(params);
    } else {
      result = await this.emailProvider.sendOtp(params);
    }

    if (result.success) {
      await recordAuditLog({
        action: "OTP_REQUESTED" as any,
        resourceType: "auth.otp",
        metadata: {
          method,
          identifier: params.identifier.includes("@")
            ? params.identifier.toLowerCase()
            : normalizeIndianPhoneNumber(params.identifier).canonical,
          isDev: result.isDev,
        },
      });
    }

    return result;
  }

  async verifyOtpAndResolve(params: OtpVerifyParams): Promise<OtpVerifyResult> {
    const { method, identifier, otp } = params;

    // 1. Verify OTP with Provider
    let verifyRes: OtpVerifyResult;
    if (method === "mobile") {
      verifyRes = await this.mobileProvider.verifyOtp(params);
    } else {
      verifyRes = await this.emailProvider.verifyOtp(params);
    }

    if (!verifyRes.success) {
      return verifyRes;
    }

    // 2. Resolve or Provision User Identity in Supabase
    const adminClient = createAdminClient();
    let canonicalIdentifier = identifier.trim();
    let isMobile = method === "mobile";

    if (isMobile) {
      const norm = normalizeIndianPhoneNumber(canonicalIdentifier);
      canonicalIdentifier = norm.canonical || canonicalIdentifier;
    } else {
      canonicalIdentifier = canonicalIdentifier.toLowerCase();
    }

    // Lookup user in public.profiles by phone or email
    let userQuery = adminClient.from("profiles").select("*");
    if (isMobile) {
      userQuery = userQuery.eq("phone", canonicalIdentifier);
    } else {
      userQuery = userQuery.eq("email", canonicalIdentifier);
    }

    const { data: existingProfile } = await userQuery.maybeSingle();

    let profile: Profile;
    let isNewUser = false;
    let userId: string;

    if (existingProfile) {
      profile = existingProfile as Profile;
      userId = profile.id;
    } else {
      // Create new profile record
      isNewUser = true;
      userId = crypto.randomUUID();
      const defaultName = isMobile
        ? `Resident ${canonicalIdentifier.slice(-4)}`
        : canonicalIdentifier.split("@")[0];

      const newProfile: Profile = {
        id: userId,
        email: isMobile ? `${canonicalIdentifier.replace("+", "")}@dwellsync.user` : canonicalIdentifier,
        full_name: defaultName,
        display_name: defaultName,
        phone: isMobile ? canonicalIdentifier : null,
        avatar_url: null,
        status: "ACTIVE",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const { data: inserted, error: insertError } = await adminClient
        .from("profiles")
        .insert(newProfile)
        .select()
        .single();

      if (insertError || !inserted) {
        console.error("[AuthService] Failed to create profile:", insertError);
        profile = newProfile;
      } else {
        profile = inserted as Profile;
      }
    }

    // 3. Resolve Platform Super Admin Status
    const { data: platformAdmin } = await adminClient
      .from("platform_admins")
      .select("id")
      .eq("user_id", userId)
      .eq("role_id", "SUPER_ADMIN")
      .maybeSingle();

    const isSuperAdmin = !!platformAdmin;

    // Establish Encrypted Auth Session Cookie
    await setAuthSessionCookie({
      userId,
      email: profile.email || undefined,
      phone: profile.phone || undefined,
      isSuperAdmin,
    });

    // 4. Resolve Active Society Memberships
    const { data: rawMemberships } = await adminClient
      .from("society_memberships")
      .select(`
        *,
        society:societies (*)
      `)
      .eq("user_id", userId)
      .eq("status", "ACTIVE")
      .order("created_at", { ascending: true });

    const societyMemberships =
      (rawMemberships as (SocietyMembership & { society: Society })[]) || [];

    const availableSocieties = societyMemberships
      .map((m) => m.society)
      .filter(Boolean) as Society[];

    // Extract unique roles across memberships
    const availableRoles = Array.from(new Set(societyMemberships.map((m) => m.role_id))) as RoleId[];

    // 5. Evaluate Smart Post-Login Routing Logic
    let redirectUrl = "/resident/dashboard";
    let requiresSocietySelection = false;
    let requiresRoleSelection = false;
    let activeMembership = societyMemberships[0] || null;
    let activeRole: RoleId | null = activeMembership?.role_id || null;

    if (isSuperAdmin) {
      // Super Admin -> Private View-As Console
      redirectUrl = "/superadmin/view-as";
      activeRole = "SUPER_ADMIN";
    } else if (societyMemberships.length === 0) {
      // Unattached user -> Pending community link view
      redirectUrl = "/login?state=unlinked";
    } else if (societyMemberships.length === 1) {
      // 1 Society Membership
      const single = societyMemberships[0];
      const sameSocietyRoles = societyMemberships
        .filter((m) => m.society_id === single.society_id)
        .map((m) => m.role_id);

      if (sameSocietyRoles.length > 1) {
        // Multiple roles in single society -> Allow role selection if necessary
        requiresRoleSelection = true;
        redirectUrl = getDashboardPathForRole(single.role_id, single.society_id);
      } else {
        redirectUrl = getDashboardPathForRole(single.role_id, single.society_id);
      }

      // Persist active society in cookie
      const cookieStore = await cookies();
      cookieStore.set("dwellsync_active_society", single.society_id, {
        path: "/",
        httpOnly: false,
        sameSite: "lax",
        maxAge: 30 * 24 * 60 * 60,
      });
    } else {
      // Multiple Societies -> Show community switcher modal/state
      requiresSocietySelection = true;
      redirectUrl = "/login?state=choose_community";
    }

    // 6. Record Audit Log
    await recordAuditLog({
      actorUserId: userId,
      societyId: activeMembership?.society_id,
      action: (isSuperAdmin ? "SUPER_ADMIN_LOGIN" : "USER_LOGIN") as any,
      resourceType: "auth.users",
      resourceId: userId,
      metadata: {
        method,
        identifier: canonicalIdentifier,
        isNewUser,
        isSuperAdmin,
        membershipsCount: societyMemberships.length,
      },
    });

    const context: AuthContextResult = {
      user: {
        id: userId,
        email: profile.email || undefined,
        phone: profile.phone || undefined,
      },
      profile,
      isSuperAdmin,
      isNewUser,
      societyMemberships,
      activeMembership,
      activeRole,
      redirectUrl,
      requiresSocietySelection,
      requiresRoleSelection,
      availableSocieties,
      availableRoles,
    };

    return {
      success: true,
      context,
    };
  }

  async getGoogleOAuthUrl(redirectTo?: string) {
    return this.googleProvider.getOAuthUrl(redirectTo);
  }
}

export const authService = new AuthService();

