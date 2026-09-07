import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Validates that an authenticated resident has an active, authorized
 * ownership or occupancy relationship with the specified unit in the given society.
 *
 * Scoped strictly by societyId, unitId, userId, and status = 'ACTIVE'.
 * Returns false for unauthorized units, cross-society units, or non-existent units
 * without leaking resource existence.
 */
export async function validateResidentUnitAccess(
  societyId: string,
  userId: string,
  unitId: string
): Promise<boolean> {
  if (!societyId || !userId || !unitId) {
    return false;
  }

  const adminClient = createAdminClient();

  const [ownerRes, occRes] = await Promise.all([
    adminClient
      .from("unit_owners")
      .select("id")
      .eq("unit_id", unitId)
      .eq("society_id", societyId)
      .eq("user_id", userId)
      .eq("status", "ACTIVE")
      .maybeSingle(),
    adminClient
      .from("unit_occupancies")
      .select("id")
      .eq("unit_id", unitId)
      .eq("society_id", societyId)
      .eq("user_id", userId)
      .eq("status", "ACTIVE")
      .maybeSingle(),
  ]);

  return Boolean(ownerRes?.data || occRes?.data);
}

