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

export async function changeMemberStatus(
  societyId: string,
  memberId: string,
  newStatus: string,
  actorUserId?: string
): Promise<{ success: boolean; data?: SocietyMembership; error?: string }> {
  const adminClient = createAdminClient();

  const { data: currentMember, error: fetchErr } = await adminClient
    .from("society_memberships")
    .select("*")
    .eq("id", memberId)
    .eq("society_id", societyId)
    .single();

  if (fetchErr || !currentMember) {
    return { success: false, error: "Member not found in this society." };
  }

  const { data: updatedMember, error: updateErr } = await adminClient
    .from("society_memberships")
    .update({
      status: newStatus,
      updated_at: new Date().toISOString(),
    })
    .eq("id", memberId)
    .eq("society_id", societyId)
    .select()
    .single();

  if (updateErr || !updatedMember) {
    return { success: false, error: updateErr?.message || "Failed to update member status" };
  }

  await recordAuditLog({
    actorUserId,
    effectiveUserId: currentMember.user_id,
    societyId,
    action: "MEMBER_STATUS_CHANGED",
    resourceType: "society_memberships",
    resourceId: memberId,
    metadata: {
      previousStatus: currentMember.status,
      newStatus,
    },
  });

  return { success: true, data: updatedMember as SocietyMembership };
}

export async function reassignMemberUnit(
  societyId: string,
  memberId: string,
  newUnitId: string | null,
  newUnitNumber: string | null,
  actorUserId?: string
): Promise<{ success: boolean; data?: SocietyMembership; error?: string }> {
  const adminClient = createAdminClient();

  // 1. Fetch current member
  const { data: currentMember, error: fetchErr } = await adminClient
    .from("society_memberships")
    .select("*")
    .eq("id", memberId)
    .eq("society_id", societyId)
    .single();

  if (fetchErr || !currentMember) {
    return { success: false, error: "Member not found in this society." };
  }

  const previousUnitNumber = currentMember.unit_number;
  let resolvedUnitNumber = newUnitNumber;

  // If unitId is provided, verify unit exists in society and resolve its unit_number
  if (newUnitId) {
    const { data: unitRecord, error: unitErr } = await adminClient
      .from("units")
      .select("id, unit_number, society_id")
      .eq("id", newUnitId)
      .eq("society_id", societyId)
      .single();

    if (unitErr || !unitRecord) {
      return { success: false, error: "Target unit does not exist in this society." };
    }
    resolvedUnitNumber = unitRecord.unit_number;
  }

  // 2. Update membership unit_number
  const { data: updatedMember, error: updateErr } = await adminClient
    .from("society_memberships")
    .update({
      unit_number: resolvedUnitNumber || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", memberId)
    .eq("society_id", societyId)
    .select()
    .single();

  if (updateErr || !updatedMember) {
    return { success: false, error: updateErr?.message || "Failed to update member unit" };
  }

  // 3. Log Audit event
  const isUnassign = !resolvedUnitNumber;
  await recordAuditLog({
    actorUserId,
    effectiveUserId: currentMember.user_id,
    societyId,
    action: isUnassign ? "MEMBER_UNIT_UNASSIGNED" : "MEMBER_UNIT_REASSIGNED",
    resourceType: "society_memberships",
    resourceId: memberId,
    metadata: {
      previousUnitNumber,
      newUnitNumber: resolvedUnitNumber || null,
      unitId: newUnitId || null,
    },
  });

  return { success: true, data: updatedMember as SocietyMembership };
}

export interface MemberRelationshipsResult {
  member: SocietyMembership & { profile?: Profile | null };
  ownerships: any[];
  occupancies: any[];
  familyMembers: any[];
}

export async function getMemberRelationships(
  societyId: string,
  memberId: string
): Promise<{ success: boolean; data?: MemberRelationshipsResult; error?: string }> {
  const adminClient = createAdminClient();

  // 1. Fetch membership with profile
  const { data: member, error: memberErr } = await adminClient
    .from("society_memberships")
    .select(`
      id,
      society_id,
      user_id,
      role_id,
      unit_number,
      status,
      created_at,
      updated_at,
      profile:profiles!user_id (*)
    `)
    .eq("id", memberId)
    .eq("society_id", societyId)
    .maybeSingle();

  if (memberErr || !member) {
    return { success: false, error: "Member not found in this society." };
  }

  const userId = member.user_id;

  // 2. Fetch unit ownerships
  const { data: ownerships, error: ownersErr } = await adminClient
    .from("unit_owners")
    .select(`
      id,
      society_id,
      unit_id,
      user_id,
      is_primary,
      ownership_percentage,
      ownership_type,
      start_date,
      end_date,
      status,
      created_at,
      updated_at,
      unit:units (
        id,
        unit_number,
        unit_type,
        status,
        building:buildings (id, name, code),
        wing:wings (id, name, code)
      )
    `)
    .eq("society_id", societyId)
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (ownersErr) {
    console.error("[getMemberRelationships] Error fetching unit_owners:", ownersErr);
  }

  // 3. Fetch unit occupancies
  const { data: occupancies, error: occErr } = await adminClient
    .from("unit_occupancies")
    .select(`
      id,
      society_id,
      unit_id,
      user_id,
      occupancy_type,
      status,
      created_at,
      updated_at,
      unit:units (
        id,
        unit_number,
        unit_type,
        status,
        building:buildings (id, name, code),
        wing:wings (id, name, code)
      )
    `)
    .eq("society_id", societyId)
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (occErr) {
    console.error("[getMemberRelationships] Error fetching unit_occupancies:", occErr);
  }

  // 4. Fetch family members for the member's associated units
  const unitIds = [
    ...(ownerships || []).map((o: any) => o.unit_id),
    ...(occupancies || []).map((occ: any) => occ.unit_id),
  ].filter(Boolean);

  let familyMembers: any[] = [];
  if (unitIds.length > 0) {
    const { data: famData, error: famErr } = await adminClient
      .from("family_members")
      .select(`
        id,
        society_id,
        unit_id,
        full_name,
        relationship,
        phone,
        email,
        created_at,
        updated_at
      `)
      .eq("society_id", societyId)
      .in("unit_id", unitIds)
      .order("created_at", { ascending: true });

    if (famErr) {
      console.error("[getMemberRelationships] Error fetching family_members:", famErr);
    } else if (famData) {
      familyMembers = famData;
    }
  }

  return {
    success: true,
    data: {
      member: member as any,
      ownerships: ownerships || [],
      occupancies: occupancies || [],
      familyMembers: familyMembers || [],
    },
  };
}


