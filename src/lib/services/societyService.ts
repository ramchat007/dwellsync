import { createAdminClient } from "../supabase/admin";
import { Society, SocietyStatus } from "../types/database";
import { societySchema, societyUpdateSchema, SocietyInput, SocietyUpdateInput } from "../validations/society";
import { recordAuditLog } from "../auth/audit";

export interface PlatformMetrics {
  totalSocieties: number;
  activeSocieties: number;
  onboardingSocieties: number;
  suspendedSocieties: number;
  totalUsers: number;
  totalUnits: number;
  totalBuildings: number;
}

export interface SocietyMetrics {
  totalBuildings: number;
  totalWings: number;
  totalFloors: number;
  totalUnits: number;
  occupiedUnits: number;
  vacantUnits: number;
  totalMembers: number;
}

export async function getSocieties(options?: {
  status?: SocietyStatus;
  search?: string;
  limit?: number;
  offset?: number;
}): Promise<{ data: Society[]; count: number }> {
  const adminClient = createAdminClient();
  let query = adminClient.from("societies").select("*", { count: "exact" });

  if (options?.status) {
    query = query.eq("status", options.status);
  }

  if (options?.search) {
    query = query.or(
      `name.ilike.%${options.search}%,code.ilike.%${options.search}%,city.ilike.%${options.search}%`
    );
  }

  query = query.order("created_at", { ascending: false });

  if (options?.limit) {
    query = query.limit(options.limit);
  }
  if (options?.offset) {
    query = query.range(options.offset, options.offset + (options.limit || 10) - 1);
  }

  const { data, count, error } = await query;
  if (error) {
    console.error("[societyService] Error fetching societies:", error);
    return { data: [], count: 0 };
  }

  return { data: (data as Society[]) || [], count: count || 0 };
}

export async function getSocietyById(id: string): Promise<Society | null> {
  const adminClient = createAdminClient();
  const { data, error } = await adminClient
    .from("societies")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !data) return null;
  return data as Society;
}

export async function createSociety(
  input: SocietyInput,
  actorUserId?: string
): Promise<{ success: boolean; data?: Society; error?: string }> {
  const parsed = societySchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const adminClient = createAdminClient();
  const { data, error } = await adminClient
    .from("societies")
    .insert({
      ...parsed.data,
      created_by: actorUserId || null,
      updated_by: actorUserId || null,
    })
    .select()
    .single();

  if (error || !data) {
    return { success: false, error: error?.message || "Failed to create society" };
  }

  await recordAuditLog({
    actorUserId,
    societyId: data.id,
    action: "SOCIETY_CREATED",
    resourceType: "societies",
    resourceId: data.id,
    metadata: { name: data.name, code: data.code, type: data.society_type },
  });

  return { success: true, data: data as Society };
}

export async function updateSociety(
  id: string,
  input: SocietyUpdateInput,
  actorUserId?: string
): Promise<{ success: boolean; data?: Society; error?: string }> {
  const parsed = societyUpdateSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const adminClient = createAdminClient();
  const { data, error } = await adminClient
    .from("societies")
    .update({
      ...parsed.data,
      updated_by: actorUserId || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select()
    .single();

  if (error || !data) {
    return { success: false, error: error?.message || "Failed to update society" };
  }

  await recordAuditLog({
    actorUserId,
    societyId: id,
    action: "SOCIETY_UPDATED",
    resourceType: "societies",
    resourceId: id,
    metadata: parsed.data,
  });

  return { success: true, data: data as Society };
}

export async function getPlatformMetrics(): Promise<PlatformMetrics> {
  const adminClient = createAdminClient();

  const [
    { count: totalSocieties },
    { count: activeSocieties },
    { count: onboardingSocieties },
    { count: suspendedSocieties },
    { count: totalUsers },
    { count: totalUnits },
    { count: totalBuildings },
  ] = await Promise.all([
    adminClient.from("societies").select("*", { count: "exact", head: true }),
    adminClient.from("societies").select("*", { count: "exact", head: true }).eq("status", "ACTIVE"),
    adminClient.from("societies").select("*", { count: "exact", head: true }).eq("status", "ONBOARDING"),
    adminClient.from("societies").select("*", { count: "exact", head: true }).eq("status", "SUSPENDED"),
    adminClient.from("profiles").select("*", { count: "exact", head: true }),
    adminClient.from("units").select("*", { count: "exact", head: true }),
    adminClient.from("buildings").select("*", { count: "exact", head: true }),
  ]);

  return {
    totalSocieties: totalSocieties || 0,
    activeSocieties: activeSocieties || 0,
    onboardingSocieties: onboardingSocieties || 0,
    suspendedSocieties: suspendedSocieties || 0,
    totalUsers: totalUsers || 0,
    totalUnits: totalUnits || 0,
    totalBuildings: totalBuildings || 0,
  };
}

export async function getSocietyMetrics(societyId: string): Promise<SocietyMetrics> {
  const adminClient = createAdminClient();

  const [
    { count: totalBuildings },
    { count: totalWings },
    { count: totalFloors },
    { count: totalUnits },
    { count: occupiedUnits },
    { count: vacantUnits },
    { count: totalMembers },
  ] = await Promise.all([
    adminClient.from("buildings").select("*", { count: "exact", head: true }).eq("society_id", societyId),
    adminClient.from("wings").select("*", { count: "exact", head: true }).eq("society_id", societyId),
    adminClient.from("floors").select("*", { count: "exact", head: true }).eq("society_id", societyId),
    adminClient.from("units").select("*", { count: "exact", head: true }).eq("society_id", societyId),
    adminClient.from("units").select("*", { count: "exact", head: true }).eq("society_id", societyId).eq("status", "OCCUPIED"),
    adminClient.from("units").select("*", { count: "exact", head: true }).eq("society_id", societyId).eq("status", "VACANT"),
    adminClient.from("society_memberships").select("*", { count: "exact", head: true }).eq("society_id", societyId).eq("status", "ACTIVE"),
  ]);

  return {
    totalBuildings: totalBuildings || 0,
    totalWings: totalWings || 0,
    totalFloors: totalFloors || 0,
    totalUnits: totalUnits || 0,
    occupiedUnits: occupiedUnits || 0,
    vacantUnits: vacantUnits || 0,
    totalMembers: totalMembers || 0,
  };
}

