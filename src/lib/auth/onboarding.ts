import { createAdminClient } from "@/lib/supabase/admin";
import { UserIdentity } from "@/lib/types/auth";
import { Profile, RoleId, Society, SocietyMembership } from "@/lib/types/database";
import { getDashboardPathForRole } from "@/lib/auth/persona";

export interface PostLoginRoutingResult {
  destination: string;
  activeSocietyId: string | null;
  requiresSocietySelection: boolean;
  isUnlinked: boolean;
}

/**
 * Deterministic Post-Login Routing Engine (Cases A through G)
 *
 * Case A: Unauthenticated user -> /login
 * Case B: Authenticated + SUPER_ADMIN -> /superadmin/view-as
 * Case C: Authenticated + valid impersonation -> Target role dashboard
 * Case D: Authenticated + exactly 1 active society membership -> Role dashboard + active society
 * Case E: Authenticated + multiple society memberships -> Matching active society or /login?state=choose_community
 * Case F: Authenticated + 0 memberships -> /login?state=unlinked
 * Case G: Authenticated + invalid/stale active society cookie -> Ignore stale cookie, resolve from authoritative membership data
 */
export function resolvePostLoginRouting(
  identity: UserIdentity | null,
  preferredSocietyId?: string | null
): PostLoginRoutingResult {
  // Case A: Unauthenticated
  if (!identity || !identity.isAuthenticated) {
    return {
      destination: "/login",
      activeSocietyId: null,
      requiresSocietySelection: false,
      isUnlinked: false,
    };
  }

  // Case B: Platform Super Admin (when not impersonating)
  if (identity.isSuperAdmin && !identity.isImpersonating) {
    return {
      destination: "/superadmin/view-as",
      activeSocietyId: null,
      requiresSocietySelection: false,
      isUnlinked: false,
    };
  }

  // Case C: Active Impersonation
  if (identity.isImpersonating) {
    const targetRole = (identity.impersonationSession?.target_role_id || identity.currentRole || "RESIDENT") as RoleId;
    const targetSocietyId = identity.impersonationSession?.target_society_id || identity.currentSociety?.id || null;
    const destination = getDashboardPathForRole(targetRole, targetSocietyId);
    return {
      destination,
      activeSocietyId: targetSocietyId,
      requiresSocietySelection: false,
      isUnlinked: false,
    };
  }

  // Authoritative active society memberships
  const memberships = identity.availableSocieties || [];

  // Case F: 0 Active Memberships (Unlinked Account)
  if (memberships.length === 0) {
    return {
      destination: "/login?state=unlinked",
      activeSocietyId: null,
      requiresSocietySelection: false,
      isUnlinked: true,
    };
  }

  // Case D: Exactly 1 Active Membership
  if (memberships.length === 1) {
    const single = memberships[0];
    const destination = getDashboardPathForRole(single.role_id, single.society_id);
    return {
      destination,
      activeSocietyId: single.society_id,
      requiresSocietySelection: false,
      isUnlinked: false,
    };
  }

  // Case E / G: Multiple Memberships
  // Check if preferredSocietyId is valid and matches one of user's active memberships
  if (preferredSocietyId) {
    const match = memberships.find((m) => m.society_id === preferredSocietyId);
    if (match) {
      const destination = getDashboardPathForRole(match.role_id, match.society_id);
      return {
        destination,
        activeSocietyId: match.society_id,
        requiresSocietySelection: false,
        isUnlinked: false,
      };
    }
  }

  // Preferred society is either missing or invalid/stale (Case G) -> Prompt society selection
  return {
    destination: "/login?state=choose_community",
    activeSocietyId: null,
    requiresSocietySelection: true,
    isUnlinked: false,
  };
}

/**
 * Synchronizes user profile safely upon authentication.
 * - Prevents duplicate profiles
 * - Does NOT overwrite existing populated fields (full_name, display_name, phone)
 * - Only enriches missing fields (e.g. avatar_url or email)
 * - Never elevates privileges to SUPER_ADMIN (privileges come strictly from platform_admins)
 */
export async function syncProfileFromAuth(user: {
  id: string;
  email?: string | null;
  phone?: string | null;
  user_metadata?: any;
}): Promise<Profile> {
  const adminClient = createAdminClient();

  // 1. Check existing profile by UUID
  const { data: existingProfile } = await adminClient
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  if (existingProfile) {
    const updates: Partial<Profile> = {};
    if (!existingProfile.email && user.email) {
      updates.email = user.email.toLowerCase().trim();
    }
    if (!existingProfile.avatar_url && user.user_metadata?.avatar_url) {
      updates.avatar_url = user.user_metadata.avatar_url;
    }
    if (!existingProfile.phone && user.phone) {
      updates.phone = user.phone;
    }

    if (Object.keys(updates).length > 0) {
      updates.updated_at = new Date().toISOString();
      const { data: updated } = await adminClient
        .from("profiles")
        .update(updates)
        .eq("id", user.id)
        .select()
        .single();
      return (updated as Profile) || (existingProfile as Profile);
    }
    return existingProfile as Profile;
  }

  // 2. Insert new profile with status 'ACTIVE'
  const resolvedEmail = user.email?.toLowerCase().trim() || "";
  const defaultName =
    user.user_metadata?.full_name ||
    user.user_metadata?.name ||
    (resolvedEmail ? resolvedEmail.split("@")[0] : "Resident");

  const newProfile: Profile = {
    id: user.id,
    email: resolvedEmail,
    full_name: defaultName,
    display_name: defaultName,
    avatar_url: user.user_metadata?.avatar_url || null,
    phone: user.phone || null,
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
    const { data: retryProfile } = await adminClient
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .maybeSingle();
    if (retryProfile) return retryProfile as Profile;
    console.error("[syncProfileFromAuth] Failed to insert profile:", insertError);
    return newProfile;
  }

  return inserted as Profile;
}
