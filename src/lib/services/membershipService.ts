import { createAdminClient } from "../supabase/admin";
import { SocietyMembership, Society, Profile } from "../types/database";
import {
  membershipSchema,
  membershipUpdateSchema,
  MembershipInput,
  MembershipUpdateInput,
} from "../validations";
import { recordAuditLog } from "../auth/audit";

export async function getUserMemberships(
  userId: string
): Promise<(SocietyMembership & { society: Society })[]> {
  const adminClient = createAdminClient();
  const { data, error } = await adminClient
    .from("society_memberships")
    .select(`
      *,
      society:societies (*)
    `)
    .eq("user_id", userId)
    .eq("status", "ACTIVE")
    .order("created_at", { ascending: true });

  if (error || !data) {
    console.error("[membershipService] Error fetching user memberships:", error);
    return [];
  }

  return data as (SocietyMembership & { society: Society })[];
}

export async function getSocietyMembers(
  societyId: string
): Promise<(SocietyMembership & { profile: Profile })[]> {
  const adminClient = createAdminClient();
  const { data, error } = await adminClient
    .from("society_memberships")
    .select(`
      *,
      profile:profiles (*)
    `)
    .eq("society_id", societyId)
    .neq("status", "REMOVED")
    .order("created_at", { ascending: true });

  if (error || !data) {
    console.error("[membershipService] Error fetching society members:", error);
    return [];
  }

  return data as (SocietyMembership & { profile: Profile })[];
}

export async function assignMembership(
  input: MembershipInput,
  actorUserId?: string
): Promise<{ success: boolean; data?: SocietyMembership; error?: string }> {
  const parsed = membershipSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const adminClient = createAdminClient();
  const { data, error } = await adminClient
    .from("society_memberships")
    .upsert(
      {
        ...parsed.data,
        joined_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      { onConflict: "society_id,user_id,role_id" }
    )
    .select()
    .single();

  if (error || !data) {
    return { success: false, error: error?.message || "Failed to assign membership" };
  }

  await recordAuditLog({
    actorUserId,
    effectiveUserId: input.user_id,
    societyId: input.society_id,
    action: "MEMBERSHIP_CREATED",
    resourceType: "society_memberships",
    resourceId: data.id,
    metadata: { role_id: data.role_id, unit_number: data.unit_number },
  });

  return { success: true, data: data as SocietyMembership };
}

export async function updateMembership(
  id: string,
  societyId: string,
  input: MembershipUpdateInput,
  actorUserId?: string
): Promise<{ success: boolean; data?: SocietyMembership; error?: string }> {
  const parsed = membershipUpdateSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const adminClient = createAdminClient();
  const { data, error } = await adminClient
    .from("society_memberships")
    .update({
      ...parsed.data,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("society_id", societyId)
    .select()
    .single();

  if (error || !data) {
    return { success: false, error: error?.message || "Failed to update membership" };
  }

  await recordAuditLog({
    actorUserId,
    effectiveUserId: data.user_id,
    societyId,
    action: "MEMBERSHIP_UPDATED",
    resourceType: "society_memberships",
    resourceId: id,
    metadata: parsed.data,
  });

  return { success: true, data: data as SocietyMembership };
}

export async function removeMembership(
  id: string,
  societyId: string,
  actorUserId?: string
): Promise<{ success: boolean; error?: string }> {
  const adminClient = createAdminClient();
  const { data, error } = await adminClient
    .from("society_memberships")
    .update({
      status: "REMOVED",
      left_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("society_id", societyId)
    .select()
    .single();

  if (error || !data) {
    return { success: false, error: error?.message || "Failed to remove membership" };
  }

  await recordAuditLog({
    actorUserId,
    effectiveUserId: data.user_id,
    societyId,
    action: "MEMBERSHIP_REMOVED",
    resourceType: "society_memberships",
    resourceId: id,
  });

  return { success: true };
}

