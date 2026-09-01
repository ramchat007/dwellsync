import { createAdminClient } from "../supabase/admin";
import { UnitOwner, UnitOccupancy, FamilyMember, Unit } from "../types/database";
import {
  unitOwnerSchema,
  unitOccupancySchema,
  familyMemberSchema,
  UnitOwnerInput,
  UnitOccupancyInput,
  FamilyMemberInput,
} from "../validations/ownership";
import { recordAuditLog } from "../auth/audit";

export async function getUnitOwners(unitId: string): Promise<UnitOwner[]> {
  const adminClient = createAdminClient();
  const { data, error } = await adminClient
    .from("unit_owners")
    .select(`
      *,
      profile:profiles (*)
    `)
    .eq("unit_id", unitId)
    .order("is_primary", { ascending: false });

  if (error || !data) {
    console.error("[ownershipService] Error fetching unit owners:", error);
    return [];
  }
  return data as UnitOwner[];
}

export async function addUnitOwner(
  input: UnitOwnerInput,
  actorUserId?: string
): Promise<{ success: boolean; data?: UnitOwner; error?: string }> {
  const parsed = unitOwnerSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const adminClient = createAdminClient();
  const data = parsed.data;

  // 1. Calculate existing ownership percentage to prevent > 100%
  const { data: existingOwners } = await adminClient
    .from("unit_owners")
    .select("id, user_id, ownership_percentage")
    .eq("unit_id", data.unit_id)
    .eq("status", "ACTIVE");

  const otherOwners = (existingOwners || []).filter((o) => o.user_id !== data.user_id);
  const currentTotal = otherOwners.reduce((sum, o) => sum + Number(o.ownership_percentage || 0), 0);

  if (currentTotal + Number(data.ownership_percentage) > 100.001) {
    return {
      success: false,
      error: `Total ownership cannot exceed 100%. Current total of other owners is ${currentTotal.toFixed(1)}%.`,
    };
  }

  // 2. Insert or Upsert Owner Record
  const { data: newOwner, error } = await adminClient
    .from("unit_owners")
    .upsert(
      {
        society_id: data.society_id,
        unit_id: data.unit_id,
        user_id: data.user_id,
        is_primary: data.is_primary,
        ownership_percentage: data.ownership_percentage,
        ownership_type: data.ownership_type,
        start_date: data.start_date || new Date().toISOString().split("T")[0],
        end_date: data.end_date || null,
        status: data.status,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "unit_id,user_id" }
    )
    .select(`*, profile:profiles(*)`)
    .single();

  if (error || !newOwner) {
    console.error("[ownershipService] Error adding owner:", error);
    return { success: false, error: error?.message || "Failed to add unit owner" };
  }

  // 3. Ensure user has OWNER society membership
  await adminClient.from("society_memberships").upsert(
    {
      society_id: data.society_id,
      user_id: data.user_id,
      role_id: "OWNER",
      status: "ACTIVE",
      joined_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    { onConflict: "society_id,user_id,role_id" }
  );

  // 4. Audit Log
  await recordAuditLog({
    actorUserId,
    effectiveUserId: data.user_id,
    societyId: data.society_id,
    action: "OWNER_ADDED",
    resourceType: "unit_owners",
    resourceId: newOwner.id,
    metadata: {
      unit_id: data.unit_id,
      ownership_percentage: data.ownership_percentage,
      is_primary: data.is_primary,
    },
  });

  return { success: true, data: newOwner as UnitOwner };
}

export async function removeUnitOwner(
  id: string,
  societyId: string,
  actorUserId?: string
): Promise<{ success: boolean; error?: string }> {
  const adminClient = createAdminClient();

  const { data: owner } = await adminClient
    .from("unit_owners")
    .select("*")
    .eq("id", id)
    .eq("society_id", societyId)
    .single();

  if (!owner) {
    return { success: false, error: "Owner record not found" };
  }

  const { error } = await adminClient
    .from("unit_owners")
    .update({ status: "HISTORICAL", end_date: new Date().toISOString().split("T")[0] })
    .eq("id", id);

  if (error) {
    return { success: false, error: error.message };
  }

  await recordAuditLog({
    actorUserId,
    effectiveUserId: owner.user_id,
    societyId,
    action: "OWNER_REMOVED",
    resourceType: "unit_owners",
    resourceId: id,
    metadata: { unit_id: owner.unit_id },
  });

  return { success: true };
}

export async function getUnitOccupancies(unitId: string): Promise<UnitOccupancy[]> {
  const adminClient = createAdminClient();
  const { data, error } = await adminClient
    .from("unit_occupancies")
    .select(`
      *,
      profile:profiles (*)
    `)
    .eq("unit_id", unitId)
    .order("created_at", { ascending: false });

  if (error || !data) {
    console.error("[ownershipService] Error fetching occupancies:", error);
    return [];
  }
  return data as UnitOccupancy[];
}

export async function addUnitOccupancy(
  input: UnitOccupancyInput,
  actorUserId?: string
): Promise<{ success: boolean; data?: UnitOccupancy; error?: string }> {
  const parsed = unitOccupancySchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const adminClient = createAdminClient();
  const data = parsed.data;

  // 1. Insert or Upsert Occupant Record
  const { data: newOccupancy, error } = await adminClient
    .from("unit_occupancies")
    .upsert(
      {
        society_id: data.society_id,
        unit_id: data.unit_id,
        user_id: data.user_id,
        occupancy_type: data.occupancy_type,
        lease_start: data.lease_start || null,
        lease_end: data.lease_end || null,
        is_primary_tenant: data.is_primary_tenant,
        status: data.status,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "unit_id,user_id" }
    )
    .select(`*, profile:profiles(*)`)
    .single();

  if (error || !newOccupancy) {
    console.error("[ownershipService] Error adding occupancy:", error);
    return { success: false, error: error?.message || "Failed to register unit occupancy" };
  }

  // 2. Set unit status to OCCUPIED
  await adminClient
    .from("units")
    .update({ status: "OCCUPIED" })
    .eq("id", data.unit_id);

  // 3. Assign TENANT or RESIDENT membership
  const targetRole = data.occupancy_type === "TENANT_OCCUPIED" ? "TENANT" : "RESIDENT";
  await adminClient.from("society_memberships").upsert(
    {
      society_id: data.society_id,
      user_id: data.user_id,
      role_id: targetRole,
      status: "ACTIVE",
      joined_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    { onConflict: "society_id,user_id,role_id" }
  );

  // 4. Audit Log
  await recordAuditLog({
    actorUserId,
    effectiveUserId: data.user_id,
    societyId: data.society_id,
    action: "TENANT_ADDED",
    resourceType: "unit_occupancies",
    resourceId: newOccupancy.id,
    metadata: {
      unit_id: data.unit_id,
      occupancy_type: data.occupancy_type,
      lease_start: data.lease_start,
    },
  });

  return { success: true, data: newOccupancy as UnitOccupancy };
}

export async function getFamilyMembers(unitId: string): Promise<FamilyMember[]> {
  const adminClient = createAdminClient();
  const { data, error } = await adminClient
    .from("family_members")
    .select(`
      *,
      primary_member:profiles (*)
    `)
    .eq("unit_id", unitId)
    .order("created_at", { ascending: true });

  if (error || !data) {
    console.error("[ownershipService] Error fetching family members:", error);
    return [];
  }
  return data as FamilyMember[];
}

export async function addFamilyMember(
  input: FamilyMemberInput,
  actorUserId?: string
): Promise<{ success: boolean; data?: FamilyMember; error?: string }> {
  const parsed = familyMemberSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const adminClient = createAdminClient();
  const { data: newMember, error } = await adminClient
    .from("family_members")
    .insert(parsed.data)
    .select()
    .single();

  if (error || !newMember) {
    return { success: false, error: error?.message || "Failed to add family member" };
  }

  return { success: true, data: newMember as FamilyMember };
}

