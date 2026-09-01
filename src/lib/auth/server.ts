import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createServerSupabaseClient } from "../supabase/server";
import { createAdminClient } from "../supabase/admin";
import { getActiveImpersonationSession } from "./impersonation";
import { getAuthSessionCookie } from "./session";
import { getPermissionsForRole, roleHasPermission } from "./permissions";
import { UserIdentity } from "../types/auth";
import { Profile, RoleId, Society, SocietyMembership } from "../types/database";

export { roleHasPermission, getPermissionsForRole };

export const ACTIVE_SOCIETY_COOKIE_NAME = "dwellsync_active_society";

export async function getCurrentIdentity(): Promise<UserIdentity | null> {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  let resolvedUserId: string | null = user?.id || null;
  let resolvedEmail: string = user?.email || "";
  let resolvedPhone: string | null = user?.phone || null;

  // Fallback to secure session cookie if Supabase user is not found
  if (!resolvedUserId) {
    const session = await getAuthSessionCookie();
    if (session?.userId) {
      resolvedUserId = session.userId;
      resolvedEmail = session.email || "";
      resolvedPhone = session.phone || null;
    }
  }

  if (!resolvedUserId) {
    return null;
  }

  const adminClient = createAdminClient();
  const cookieStore = await cookies();
  const preferredSocietyId = cookieStore.get(ACTIVE_SOCIETY_COOKIE_NAME)?.value;

  const { data: callerProfile } = await adminClient
    .from("profiles")
    .select("*")
    .eq("id", resolvedUserId)
    .maybeSingle();

  const fallbackProfile: Profile = callerProfile || {
    id: resolvedUserId,
    email: resolvedEmail,
    full_name: resolvedEmail.split("@")[0] || "User",
    display_name: resolvedEmail.split("@")[0] || "User",
    avatar_url: null,
    phone: resolvedPhone,
    status: "ACTIVE",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const { data: platformAdmin } = await adminClient
    .from("platform_admins")
    .select("id, role_id")
    .eq("user_id", resolvedUserId)
    .eq("role_id", "SUPER_ADMIN")
    .maybeSingle();

  const isCallerSuperAdmin = !!platformAdmin;

  // 1. Evaluate Impersonation Mode
  const impersonationSession = await getActiveImpersonationSession();

  if (impersonationSession && impersonationSession.original_admin_id === resolvedUserId) {
    const targetProfile: Profile = impersonationSession.target_user || {
      id: impersonationSession.target_user_id,
      email: "impersonated@dwellsync.internal",
      full_name: "Impersonated User",
      display_name: "Impersonated User",
      avatar_url: null,
      phone: null,
      status: "ACTIVE",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const effectiveRole = (impersonationSession.target_role_id || "RESIDENT") as RoleId;
    const permissions = getPermissionsForRole(effectiveRole);

    const { data: targetMemberships } = await adminClient
      .from("society_memberships")
      .select(`
        *,
        society:societies (*)
      `)
      .eq("user_id", impersonationSession.target_user_id)
      .eq("status", "ACTIVE");

    return {
      user: { id: resolvedUserId, email: resolvedEmail },
      profile: targetProfile,
      isAuthenticated: true,
      isSuperAdmin: true,
      isSocietyAdmin: effectiveRole === "SOCIETY_ADMIN",
      isImpersonating: true,
      originalUser: fallbackProfile,
      effectiveUser: targetProfile,
      currentSociety: impersonationSession.target_society || null,
      availableSocieties: (targetMemberships as (SocietyMembership & { society: Society })[]) || [],
      currentRole: effectiveRole,
      permissions,
      impersonationSession,
    };
  }

  // 2. Normal Super Admin Platform Mode
  if (isCallerSuperAdmin) {
    return {
      user: { id: resolvedUserId, email: resolvedEmail },
      profile: fallbackProfile,
      isAuthenticated: true,
      isSuperAdmin: true,
      isSocietyAdmin: false,
      isImpersonating: false,
      originalUser: fallbackProfile,
      effectiveUser: fallbackProfile,
      currentSociety: null,
      availableSocieties: [],
      currentRole: "SUPER_ADMIN",
      permissions: getPermissionsForRole("SUPER_ADMIN"),
      impersonationSession: null,
    };
  }

  // 3. Normal Multi-Society User Mode
  const { data: userMemberships } = await adminClient
    .from("society_memberships")
    .select(`
      *,
      society:societies (*)
    `)
    .eq("user_id", resolvedUserId)
    .eq("status", "ACTIVE")
    .order("created_at", { ascending: true });

  const activeMemberships = (userMemberships as (SocietyMembership & { society: Society })[]) || [];

  // Match preferred society from cookie or pick primary active membership
  let activeMembership = activeMemberships.find((m) => m.society_id === preferredSocietyId);
  if (!activeMembership && activeMemberships.length > 0) {
    activeMembership = activeMemberships[0];
  }

  const userRole = (activeMembership?.role_id || "RESIDENT") as RoleId;
  const userSociety = (activeMembership?.society as Society) || null;
  const permissions = getPermissionsForRole(userRole);

  return {
    user: { id: resolvedUserId, email: resolvedEmail },
    profile: fallbackProfile,
    isAuthenticated: true,
    isSuperAdmin: false,
    isSocietyAdmin: userRole === "SOCIETY_ADMIN",
    isImpersonating: false,
    originalUser: fallbackProfile,
    effectiveUser: fallbackProfile,
    currentSociety: userSociety,
    availableSocieties: activeMemberships,
    currentRole: userRole,
    permissions,
    impersonationSession: null,
  };
}

export async function requireAuth(): Promise<UserIdentity> {
  const identity = await getCurrentIdentity();
  if (!identity) {
    redirect("/login");
  }
  return identity;
}

export async function requireSuperAdmin(): Promise<UserIdentity> {
  const identity = await requireAuth();

  if (!identity.isSuperAdmin || identity.isImpersonating) {
    redirect("/unauthorized");
  }

  return identity;
}

export async function requireSocietyAccess(
  societyId: string
): Promise<{ identity: UserIdentity; society: Society }> {
  const identity = await requireAuth();
  const adminClient = createAdminClient();

  const { data: society, error } = await adminClient
    .from("societies")
    .select("*")
    .eq("id", societyId)
    .single();

  if (error || !society) {
    redirect("/unauthorized");
  }

  if (identity.isSuperAdmin && !identity.isImpersonating) {
    return { identity, society: society as Society };
  }

  const { data: membership } = await adminClient
    .from("society_memberships")
    .select("*")
    .eq("society_id", societyId)
    .eq("user_id", identity.effectiveUser.id)
    .eq("status", "ACTIVE")
    .maybeSingle();

  if (!membership) {
    redirect("/unauthorized");
  }

  return { identity, society: society as Society };
}

export async function requireRole(allowedRoles: RoleId | RoleId[]): Promise<UserIdentity> {
  const identity = await requireAuth();
  const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];

  if (!identity.currentRole || !roles.includes(identity.currentRole)) {
    redirect("/unauthorized");
  }

  return identity;
}

export async function requirePermission(permission: string): Promise<UserIdentity> {
  const identity = await requireAuth();

  const hasAccess = roleHasPermission(identity.currentRole, permission);
  if (!hasAccess) {
    redirect("/unauthorized");
  }

  return identity;
}

export async function getCurrentSociety(): Promise<Society | null> {
  const identity = await getCurrentIdentity();
  return identity?.currentSociety || null;
}

export async function getEffectiveIdentity(): Promise<UserIdentity | null> {
  return getCurrentIdentity();
}
