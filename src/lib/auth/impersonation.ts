import { cookies } from "next/headers";
import crypto from "crypto";
import { createServerSupabaseClient } from "../supabase/server";
import { createAdminClient } from "../supabase/admin";
import { recordAuditLog } from "./audit";
import { ImpersonationResult, ImpersonationStartRequest } from "../types/auth";
import { ImpersonationSession, RoleId } from "../types/database";

export const IMPERSONATION_COOKIE_NAME = "DwellSyncHub_impersonation_token";

export async function verifyRealSuperAdmin(userId: string): Promise<boolean> {
  if (!userId) return false;
  const adminClient = createAdminClient();
  const { data, error } = await adminClient
    .from("platform_admins")
    .select("id")
    .eq("user_id", userId)
    .eq("role_id", "SUPER_ADMIN")
    .maybeSingle();

  return !error && !!data;
}

export async function getActiveImpersonationSession(): Promise<ImpersonationSession | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(IMPERSONATION_COOKIE_NAME)?.value;

  if (!token) return null;

  const adminClient = createAdminClient();
  const { data, error } = await adminClient
    .from("impersonation_sessions")
    .select(`
      *,
      original_admin:original_admin_id (*),
      target_user:target_user_id (*),
      target_society:target_society_id (*)
    `)
    .eq("session_token", token)
    .eq("status", "ACTIVE")
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return data as ImpersonationSession;
}

export async function startImpersonationAction(
  request: ImpersonationStartRequest
): Promise<ImpersonationResult> {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Authentication required." };
  }

  // 1. Check if caller is verified Super Admin in platform_admins
  const isSuperAdmin = await verifyRealSuperAdmin(user.id);
  if (!isSuperAdmin) {
    return { success: false, error: "Unauthorized. Only Platform Super Admins can impersonate users." };
  }

  // 2. Anti-Chaining Check
  const existingSession = await getActiveImpersonationSession();
  if (existingSession) {
    return {
      success: false,
      error: "Impersonation chaining is strictly prohibited. Exit the current impersonation session first.",
    };
  }

  const adminClient = createAdminClient();

  // 3. Verify Target User Exists
  const { data: targetProfile, error: targetError } = await adminClient
    .from("profiles")
    .select("*")
    .eq("id", request.targetUserId)
    .single();

  if (targetError || !targetProfile) {
    return { success: false, error: "Target user not found." };
  }

  let targetSocietyId = request.targetSocietyId || null;
  let targetRoleId: RoleId | null = request.targetRoleId || null;

  if (targetSocietyId) {
    const { data: membership } = await adminClient
      .from("society_memberships")
      .select("role_id")
      .eq("user_id", request.targetUserId)
      .eq("society_id", targetSocietyId)
      .eq("status", "ACTIVE")
      .maybeSingle();

    if (membership) {
      targetRoleId = membership.role_id as RoleId;
    }
  } else {
    const { data: firstMembership } = await adminClient
      .from("society_memberships")
      .select("society_id, role_id")
      .eq("user_id", request.targetUserId)
      .eq("status", "ACTIVE")
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (firstMembership) {
      targetSocietyId = firstMembership.society_id;
      targetRoleId = firstMembership.role_id as RoleId;
    }
  }

  // 4. Generate random 256-bit cryptographic token
  const sessionToken = crypto.randomBytes(32).toString("hex");

  const { data: sessionRecord, error: sessionError } = await adminClient
    .from("impersonation_sessions")
    .insert({
      original_admin_id: user.id,
      target_user_id: request.targetUserId,
      target_society_id: targetSocietyId,
      target_role_id: targetRoleId,
      session_token: sessionToken,
      status: "ACTIVE",
      reason: request.reason || "Super Admin administrative troubleshooting",
    })
    .select()
    .single();

  if (sessionError || !sessionRecord) {
    console.error("[Impersonation] Failed to create session record:", sessionError);
    return { success: false, error: "Failed to establish impersonation session." };
  }

  // 5. Store session token in secure HttpOnly cookie
  const cookieStore = await cookies();
  cookieStore.set(IMPERSONATION_COOKIE_NAME, sessionToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 4,
  });

  // 6. Record Audit Log
  await recordAuditLog({
    actorUserId: user.id,
    effectiveUserId: request.targetUserId,
    societyId: targetSocietyId,
    action: "IMPERSONATION_STARTED",
    resourceType: "impersonation_sessions",
    resourceId: sessionRecord.id,
    metadata: {
      target_role: targetRoleId,
      reason: request.reason || "Administrative troubleshooting",
    },
  });

  return {
    success: true,
    sessionId: sessionRecord.id,
    targetRole: targetRoleId || undefined,
    targetSocietyId: targetSocietyId || undefined,
  };
}

export async function stopImpersonationAction(): Promise<ImpersonationResult> {
  const activeSession = await getActiveImpersonationSession();
  const cookieStore = await cookies();

  if (!activeSession) {
    cookieStore.delete(IMPERSONATION_COOKIE_NAME);
    return { success: true };
  }

  const adminClient = createAdminClient();

  await adminClient
    .from("impersonation_sessions")
    .update({
      status: "TERMINATED",
      ended_at: new Date().toISOString(),
    })
    .eq("id", activeSession.id);

  cookieStore.delete(IMPERSONATION_COOKIE_NAME);

  await recordAuditLog({
    actorUserId: activeSession.original_admin_id,
    effectiveUserId: activeSession.target_user_id,
    societyId: activeSession.target_society_id,
    action: "IMPERSONATION_ENDED",
    resourceType: "impersonation_sessions",
    resourceId: activeSession.id,
    metadata: {
      duration_seconds: Math.round(
        (Date.now() - new Date(activeSession.started_at).getTime()) / 1000
      ),
    },
  });

  return { success: true };
}
