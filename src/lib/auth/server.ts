import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createServerSupabaseClient } from "../supabase/server";
import { createAdminClient } from "../supabase/admin";
import { getActiveImpersonationSession } from "./impersonation";
import { getAuthSessionCookie } from "./session";
import { getPermissionsForRole, roleHasPermission, getPermissionsForCompanyRole, companyRoleHasPermission, PERMISSIONS } from "./permissions";
import { UserIdentity } from "../types/auth";
import { Profile, RoleId, Society, SocietyMembership } from "../types/database";
import { ManagementCompany, ManagementCompanyMember, CompanyRole } from "../types/company";

export { roleHasPermission, getPermissionsForRole, companyRoleHasPermission, getPermissionsForCompanyRole };


export const ACTIVE_SOCIETY_COOKIE_NAME = "DwellSyncHub_active_society";

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
      email: "impersonated@DwellSyncHub.internal",
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
    let currentSociety = impersonationSession.target_society || null;
    if (!currentSociety && impersonationSession.target_society_id) {
      if (targetMemberships && targetMemberships.length > 0) {
        const match = (targetMemberships as any[]).find(
          (m) => m.society_id === impersonationSession.target_society_id
        );
        if (match?.society) {
          currentSociety = match.society;
        }
      }
      if (!currentSociety) {
        const { data: soc } = await adminClient
          .from("societies")
          .select("*")
          .eq("id", impersonationSession.target_society_id)
          .maybeSingle();
        if (soc) {
          currentSociety = soc as Society;
        }
      }
    }

    return {
      user: { id: resolvedUserId, email: resolvedEmail },
      profile: targetProfile,
      isAuthenticated: true,
      isSuperAdmin: true,
      isSocietyAdmin: effectiveRole === "SOCIETY_ADMIN",
      isImpersonating: true,
      originalUser: fallbackProfile,
      effectiveUser: targetProfile,
      currentSociety,
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
  let userRole: RoleId | null = null;
  let userSociety: Society | null = null;

  if (activeMembership) {
    userRole = (activeMembership.role_id || "RESIDENT") as RoleId;
    userSociety = (activeMembership.society as Society) || null;
  } else if (preferredSocietyId) {
    // Check if user is accessing this society under active company society access
    const { data: companyAccess } = await adminClient
      .from("management_company_society_access")
      .select(`
        id,
        status,
        member:management_company_members!inner(user_id, status, company:management_companies!inner(status)),
        company_society:management_company_societies!inner(society_id, status, society:societies(*))
      `)
      .eq("member.user_id", resolvedUserId)
      .eq("member.status", "ACTIVE")
      .eq("member.company.status", "ACTIVE")
      .eq("company_society.society_id", preferredSocietyId)
      .eq("company_society.status", "ACTIVE")
      .eq("status", "ACTIVE")
      .maybeSingle();

    const companySoc = (companyAccess as any)?.company_society;
    if (companySoc?.society) {
      userSociety = companySoc.society as Society;
      userRole = null; // No direct society role; access is scoped to company layer only
    } else if (activeMemberships.length > 0) {
      activeMembership = activeMemberships[0];
      userRole = (activeMembership.role_id || "RESIDENT") as RoleId;
      userSociety = (activeMembership.society as Society) || null;
    }
  } else if (activeMemberships.length > 0) {
    activeMembership = activeMemberships[0];
    userRole = (activeMembership.role_id || "RESIDENT") as RoleId;
    userSociety = (activeMembership.society as Society) || null;
  }

  const permissions = userRole ? getPermissionsForRole(userRole) : [];

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

  // Preserve tenant boundary during impersonation
  if (identity.isImpersonating && identity.impersonationSession?.target_society_id) {
    if (identity.impersonationSession.target_society_id !== societyId) {
      redirect("/unauthorized");
    }
  }

  const { data: membership } = await adminClient
    .from("society_memberships")
    .select("*")
    .eq("society_id", societyId)
    .eq("user_id", identity.effectiveUser.id)
    .eq("status", "ACTIVE")
    .maybeSingle();

  if (!membership) {
    // Check explicit active company society access
    const { data: companyAccess } = await adminClient
      .from("management_company_society_access")
      .select(`
        id,
        status,
        member:management_company_members!inner (
          id,
          user_id,
          role,
          status,
          company:management_companies!inner (
            id,
            status
          )
        ),
        company_society:management_company_societies!inner (
          id,
          society_id,
          status
        )
      `)
      .eq("member.user_id", identity.effectiveUser.id)
      .eq("member.status", "ACTIVE")
      .eq("member.company.status", "ACTIVE")
      .eq("company_society.society_id", societyId)
      .eq("company_society.status", "ACTIVE")
      .eq("status", "ACTIVE")
      .maybeSingle();

    if (!companyAccess) {
      redirect("/unauthorized");
    }
  }

  // Strictly scope the returned identity's role, permissions, and society to the target societyId
  const scopedRole = membership ? (membership.role_id as RoleId) : null;
  const scopedPermissions = scopedRole ? getPermissionsForRole(scopedRole) : [];

  const scopedIdentity: UserIdentity = {
    ...identity,
    currentSociety: society as Society,
    currentRole: scopedRole as any,
    permissions: scopedPermissions,
    isSocietyAdmin: scopedRole === "SOCIETY_ADMIN",
  };

  return { identity: scopedIdentity, society: society as Society };
}

export interface CompanyAccessContext {
  identity: UserIdentity;
  company: ManagementCompany;
  membership?: ManagementCompanyMember | null;
  role: CompanyRole | "SUPER_ADMIN";
  permissions: string[];
}

export async function requireCompanyAccess(companyId: string): Promise<CompanyAccessContext> {
  const identity = await requireAuth();
  const adminClient = createAdminClient();

  const { data: company, error } = await adminClient
    .from("management_companies")
    .select("*")
    .eq("id", companyId)
    .single();

  if (error || !company || company.status !== "ACTIVE") {
    redirect("/unauthorized");
  }

  if (identity.isSuperAdmin && !identity.isImpersonating) {
    return {
      identity,
      company: company as ManagementCompany,
      membership: null,
      role: "SUPER_ADMIN",
      permissions: Object.values(PERMISSIONS),
    };
  }

  const { data: member } = await adminClient
    .from("management_company_members")
    .select("*")
    .eq("management_company_id", companyId)
    .eq("user_id", identity.effectiveUser.id)
    .eq("status", "ACTIVE")
    .maybeSingle();

  if (!member) {
    redirect("/unauthorized");
  }

  const role = member.role as CompanyRole;
  const permissions = getPermissionsForCompanyRole(role);

  return {
    identity,
    company: company as ManagementCompany,
    membership: member as ManagementCompanyMember,
    role,
    permissions,
  };
}

export async function requireCompanyRole(
  companyId: string,
  allowedRoles: CompanyRole | CompanyRole[]
): Promise<CompanyAccessContext> {
  const context = await requireCompanyAccess(companyId);
  const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];

  if (context.role === "SUPER_ADMIN") {
    return context;
  }

  if (!roles.includes(context.role as CompanyRole)) {
    redirect("/unauthorized");
  }

  return context;
}

export async function requireCompanySocietyAccess(
  companyId: string,
  societyId: string
): Promise<{ companyContext: CompanyAccessContext; society: Society }> {
  const companyContext = await requireCompanyAccess(companyId);
  const adminClient = createAdminClient();

  const { data: society } = await adminClient
    .from("societies")
    .select("*")
    .eq("id", societyId)
    .single();

  if (!society) {
    redirect("/unauthorized");
  }

  if (companyContext.role === "SUPER_ADMIN") {
    return { companyContext, society: society as Society };
  }

  // Verify company has this society assigned actively
  const { data: companySociety } = await adminClient
    .from("management_company_societies")
    .select("id, status")
    .eq("management_company_id", companyId)
    .eq("society_id", societyId)
    .eq("status", "ACTIVE")
    .maybeSingle();

  if (!companySociety) {
    redirect("/unauthorized");
  }

  // Verify member has explicit active access to this society
  const { data: access } = await adminClient
    .from("management_company_society_access")
    .select("id, status")
    .eq("management_company_id", companyId)
    .eq("management_company_member_id", companyContext.membership!.id)
    .eq("management_company_society_id", companySociety.id)
    .eq("status", "ACTIVE")
    .maybeSingle();

  if (!access) {
    redirect("/unauthorized");
  }

  return { companyContext, society: society as Society };
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
