import { createAdminClient } from "../supabase/admin";
import { Building, Wing, Floor, Unit, UnitStatus } from "../types/database";
import {
  buildingSchema,
  wingSchema,
  floorSchema,
  unitSchema,
  BuildingInput,
  BuildingUpdateInput,
  WingInput,
  FloorInput,
  UnitInput,
  UnitUpdateInput,
} from "../validations";
import { recordAuditLog } from "../auth/audit";

export interface BuildingWithHierarchy extends Building {
  wings: Wing[];
  floors: Floor[];
  unitsCount: number;
}

export async function getBuildingsWithHierarchy(
  societyId: string
): Promise<BuildingWithHierarchy[]> {
  const adminClient = createAdminClient();

  const [buildingsRes, wingsRes, floorsRes, unitsRes] = await Promise.all([
    adminClient.from("buildings").select("*").eq("society_id", societyId).order("name"),
    adminClient.from("wings").select("*").eq("society_id", societyId).order("name"),
    adminClient.from("floors").select("*").eq("society_id", societyId).order("display_order"),
    adminClient.from("units").select("id, building_id").eq("society_id", societyId),
  ]);

  const buildings = (buildingsRes.data as Building[]) || [];
  const wings = (wingsRes.data as Wing[]) || [];
  const floors = (floorsRes.data as Floor[]) || [];
  const units = unitsRes.data || [];

  const unitsCountMap = new Map<string, number>();
  for (const u of units) {
    unitsCountMap.set(u.building_id, (unitsCountMap.get(u.building_id) || 0) + 1);
  }

  return buildings.map((b) => ({
    ...b,
    wings: wings.filter((w) => w.building_id === b.id),
    floors: floors.filter((f) => f.building_id === b.id),
    unitsCount: unitsCountMap.get(b.id) || 0,
  }));
}

export async function createBuilding(
  input: BuildingInput,
  actorUserId?: string
): Promise<{ success: boolean; data?: Building; error?: string }> {
  const parsed = buildingSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const adminClient = createAdminClient();
  const { data, error } = await adminClient
    .from("buildings")
    .insert(parsed.data)
    .select()
    .single();

  if (error || !data) {
    return { success: false, error: error?.message || "Failed to create building" };
  }

  await recordAuditLog({
    actorUserId,
    societyId: input.society_id,
    action: "BUILDING_CREATED",
    resourceType: "buildings",
    resourceId: data.id,
    metadata: { name: data.name, code: data.code },
  });

  return { success: true, data: data as Building };
}

export async function updateBuilding(
  id: string,
  societyId: string,
  input: BuildingUpdateInput,
  actorUserId?: string
): Promise<{ success: boolean; data?: Building; error?: string }> {
  const adminClient = createAdminClient();
  const { data, error } = await adminClient
    .from("buildings")
    .update({ ...input, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("society_id", societyId)
    .select()
    .single();

  if (error || !data) {
    return { success: false, error: error?.message || "Failed to update building" };
  }

  await recordAuditLog({
    actorUserId,
    societyId,
    action: "BUILDING_UPDATED",
    resourceType: "buildings",
    resourceId: id,
    metadata: input,
  });

  return { success: true, data: data as Building };
}

export async function deleteBuilding(
  id: string,
  societyId: string,
  actorUserId?: string
): Promise<{ success: boolean; error?: string }> {
  const adminClient = createAdminClient();
  const { error } = await adminClient
    .from("buildings")
    .delete()
    .eq("id", id)
    .eq("society_id", societyId);

  if (error) {
    return { success: false, error: error.message };
  }

  await recordAuditLog({
    actorUserId,
    societyId,
    action: "BUILDING_DELETED",
    resourceType: "buildings",
    resourceId: id,
  });

  return { success: true };
}

export async function createWing(
  input: WingInput,
  actorUserId?: string
): Promise<{ success: boolean; data?: Wing; error?: string }> {
  const parsed = wingSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const adminClient = createAdminClient();
  const { data, error } = await adminClient
    .from("wings")
    .insert(parsed.data)
    .select()
    .single();

  if (error || !data) {
    return { success: false, error: error?.message || "Failed to create wing" };
  }

  await recordAuditLog({
    actorUserId,
    societyId: input.society_id,
    action: "WING_CREATED",
    resourceType: "wings",
    resourceId: data.id,
    metadata: { name: data.name, code: data.code, building_id: input.building_id },
  });

  return { success: true, data: data as Wing };
}

export async function createFloor(
  input: FloorInput,
  actorUserId?: string
): Promise<{ success: boolean; data?: Floor; error?: string }> {
  const parsed = floorSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const adminClient = createAdminClient();
  const { data, error } = await adminClient
    .from("floors")
    .insert(parsed.data)
    .select()
    .single();

  if (error || !data) {
    return { success: false, error: error?.message || "Failed to create floor" };
  }

  await recordAuditLog({
    actorUserId,
    societyId: input.society_id,
    action: "FLOOR_CREATED",
    resourceType: "floors",
    resourceId: data.id,
    metadata: { name: data.name, floor_number: input.floor_number },
  });

  return { success: true, data: data as Floor };
}

export async function getUnits(
  societyId: string,
  options?: {
    buildingId?: string;
    wingId?: string;
    floorId?: string;
    status?: UnitStatus;
    search?: string;
  }
): Promise<Unit[]> {
  const adminClient = createAdminClient();
  let query = adminClient
    .from("units")
    .select("*")
    .eq("society_id", societyId);

  if (options?.buildingId) query = query.eq("building_id", options.buildingId);
  if (options?.wingId) query = query.eq("wing_id", options.wingId);
  if (options?.floorId) query = query.eq("floor_id", options.floorId);
  if (options?.status) query = query.eq("status", options.status);
  if (options?.search) query = query.ilike("unit_number", `%${options.search}%`);

  query = query.order("unit_number");

  const { data, error } = await query;
  if (error) {
    console.error("[buildingService] Error fetching units:", error);
    return [];
  }

  return (data as Unit[]) || [];
}

export async function createUnit(
  input: UnitInput,
  actorUserId?: string
): Promise<{ success: boolean; data?: Unit; error?: string }> {
  const parsed = unitSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const adminClient = createAdminClient();
  const { data, error } = await adminClient
    .from("units")
    .insert(parsed.data)
    .select()
    .single();

  if (error || !data) {
    return { success: false, error: error?.message || "Failed to create unit" };
  }

  await recordAuditLog({
    actorUserId,
    societyId: input.society_id,
    action: "UNIT_CREATED",
    resourceType: "units",
    resourceId: data.id,
    metadata: { unit_number: data.unit_number, type: data.unit_type },
  });

  return { success: true, data: data as Unit };
}

export async function updateUnit(
  id: string,
  societyId: string,
  input: UnitUpdateInput,
  actorUserId?: string
): Promise<{ success: boolean; data?: Unit; error?: string }> {
  const adminClient = createAdminClient();
  const { data, error } = await adminClient
    .from("units")
    .update({ ...input, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("society_id", societyId)
    .select()
    .single();

  if (error || !data) {
    return { success: false, error: error?.message || "Failed to update unit" };
  }

  await recordAuditLog({
    actorUserId,
    societyId,
    action: "UNIT_UPDATED",
    resourceType: "units",
    resourceId: id,
    metadata: input,
  });

  return { success: true, data: data as Unit };
}

