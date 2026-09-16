import { createAdminClient } from "../supabase/admin";
import {
  Building,
  Wing,
  Floor,
  Unit,
  UnitStatus,
  UnitType,
  UnitOwner,
  UnitOccupancy,
  SocietyMembership,
} from "../types/database";
import {
  buildingSchema,
  wingSchema,
  floorSchema,
  unitSchema,
  BuildingInput,
  BuildingUpdateInput,
  WingInput,
  WingUpdateInput,
  FloorInput,
  FloorUpdateInput,
  UnitInput,
  UnitUpdateInput,
} from "../validations";
import { recordAuditLog } from "../auth/audit";
import { isValidUuid } from "../utils";

export interface BuildingWithHierarchy extends Building {
  wings: Wing[];
  floors: Floor[];
  unitsCount: number;
}

export interface SocietyStructureStats {
  totalBuildings: number;
  totalWings: number;
  totalFloors: number;
  totalUnits: number;
  occupiedUnits: number;
  vacantUnits: number;
}

export interface SocietyStructure {
  society_id: string;
  buildings: (Building & {
    wings: (Wing & { floors: Floor[]; unitsCount: number })[];
    floors: Floor[];
    unitsCount: number;
  })[];
  stats: SocietyStructureStats;
}

export interface UnitFilterOptions {
  page?: number;
  limit?: number;
  search?: string;
  buildingId?: string;
  wingId?: string;
  floorId?: string;
  status?: UnitStatus;
  unitType?: UnitType;
}

export interface PaginatedUnitsResult {
  data: Unit[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface UnitDetail extends Unit {
  building?: Building;
  wing?: Wing;
  floor?: Floor;
  owners: (UnitOwner & {
    profile?: {
      id: string;
      full_name: string | null;
      display_name: string | null;
      avatar_url: string | null;
    };
  })[];
  occupants: (UnitOccupancy & {
    profile?: {
      id: string;
      full_name: string | null;
      display_name: string | null;
      avatar_url: string | null;
    };
  })[];
  members: (SocietyMembership & {
    profile?: {
      id: string;
      full_name: string | null;
      display_name: string | null;
    };
  })[];
}

// ============================================================================
// SOCIETY STRUCTURE & HIERARCHY
// ============================================================================

export async function getBuildingsWithHierarchy(
  societyId: string
): Promise<BuildingWithHierarchy[]> {
  if (!isValidUuid(societyId)) return [];
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

export async function getSocietyStructure(societyId: string): Promise<SocietyStructure> {
  if (!isValidUuid(societyId)) {
    throw new Error("Invalid society ID");
  }

  const adminClient = createAdminClient();

  const [buildingsRes, wingsRes, floorsRes, unitsRes] = await Promise.all([
    adminClient.from("buildings").select("*").eq("society_id", societyId).order("name"),
    adminClient.from("wings").select("*").eq("society_id", societyId).order("name"),
    adminClient.from("floors").select("*").eq("society_id", societyId).order("display_order"),
    adminClient
      .from("units")
      .select("id, building_id, wing_id, floor_id, status")
      .eq("society_id", societyId),
  ]);

  const buildings = (buildingsRes.data as Building[]) || [];
  const wings = (wingsRes.data as Wing[]) || [];
  const floors = (floorsRes.data as Floor[]) || [];
  const units = (unitsRes.data as Unit[]) || [];

  let occupiedCount = 0;
  let vacantCount = 0;
  const buildingUnitCountMap = new Map<string, number>();
  const wingUnitCountMap = new Map<string, number>();

  for (const u of units) {
    if (u.status === "OCCUPIED") occupiedCount++;
    if (u.status === "VACANT") vacantCount++;
    if (u.building_id) {
      buildingUnitCountMap.set(u.building_id, (buildingUnitCountMap.get(u.building_id) || 0) + 1);
    }
    if (u.wing_id) {
      wingUnitCountMap.set(u.wing_id, (wingUnitCountMap.get(u.wing_id) || 0) + 1);
    }
  }

  const structuredBuildings = buildings.map((b) => {
    const buildingWings = wings
      .filter((w) => w.building_id === b.id)
      .map((w) => ({
        ...w,
        floors: floors.filter((f) => f.building_id === b.id && f.wing_id === w.id),
        unitsCount: wingUnitCountMap.get(w.id) || 0,
      }));

    return {
      ...b,
      wings: buildingWings,
      floors: floors.filter((f) => f.building_id === b.id),
      unitsCount: buildingUnitCountMap.get(b.id) || 0,
    };
  });

  return {
    society_id: societyId,
    buildings: structuredBuildings,
    stats: {
      totalBuildings: buildings.length,
      totalWings: wings.length,
      totalFloors: floors.length,
      totalUnits: units.length,
      occupiedUnits: occupiedCount,
      vacantUnits: vacantCount,
    },
  };
}

// ============================================================================
// BUILDINGS MANAGEMENT
// ============================================================================

export async function getBuilding(
  id: string,
  societyId: string
): Promise<{ success: boolean; data?: Building; error?: string }> {
  if (!isValidUuid(id) || !isValidUuid(societyId)) {
    return { success: false, error: "Invalid building or society ID format" };
  }

  const adminClient = createAdminClient();
  const { data, error } = await adminClient
    .from("buildings")
    .select("*")
    .eq("id", id)
    .eq("society_id", societyId)
    .maybeSingle();

  if (error || !data) {
    return { success: false, error: "Building not found in this society." };
  }

  return { success: true, data: data as Building };
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

  // Validate uniqueness of code within society
  const { data: existingCode } = await adminClient
    .from("buildings")
    .select("id")
    .eq("society_id", parsed.data.society_id)
    .eq("code", parsed.data.code)
    .maybeSingle();

  if (existingCode) {
    return {
      success: false,
      error: `A building with code '${parsed.data.code}' already exists in this society.`,
    };
  }

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
  if (!isValidUuid(id) || !isValidUuid(societyId)) {
    return { success: false, error: "Invalid building or society ID format" };
  }

  const adminClient = createAdminClient();

  // Check building exists in society
  const { data: currentBldg, error: findErr } = await adminClient
    .from("buildings")
    .select("id, code")
    .eq("id", id)
    .eq("society_id", societyId)
    .maybeSingle();

  if (findErr || !currentBldg) {
    return { success: false, error: "Building not found in this society." };
  }

  // Check code uniqueness if changing
  if (input.code && input.code !== currentBldg.code) {
    const { data: dupCode } = await adminClient
      .from("buildings")
      .select("id")
      .eq("society_id", societyId)
      .eq("code", input.code)
      .maybeSingle();

    if (dupCode) {
      return {
        success: false,
        error: `Building code '${input.code}' is already used by another building.`,
      };
    }
  }

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
  if (!isValidUuid(id) || !isValidUuid(societyId)) {
    return { success: false, error: "Invalid building or society ID format" };
  }

  const adminClient = createAdminClient();

  // Safe deletion checks: prevent deletion if child wings, floors, or units exist
  const [wingsCheck, unitsCheck, floorsCheck] = await Promise.all([
    adminClient.from("wings").select("id").eq("building_id", id).limit(1),
    adminClient.from("units").select("id").eq("building_id", id).limit(1),
    adminClient.from("floors").select("id").eq("building_id", id).limit(1),
  ]);

  if (wingsCheck.data && wingsCheck.data.length > 0) {
    return {
      success: false,
      error: "Cannot delete building: active wings exist in this building. Remove or reassign wings first.",
    };
  }

  if (unitsCheck.data && unitsCheck.data.length > 0) {
    return {
      success: false,
      error: "Cannot delete building: active units are assigned to this building. Remove or reassign units first.",
    };
  }

  if (floorsCheck.data && floorsCheck.data.length > 0) {
    return {
      success: false,
      error: "Cannot delete building: active floors exist in this building. Remove or reassign floors first.",
    };
  }

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

// ============================================================================
// WINGS MANAGEMENT
// ============================================================================

export async function getWings(
  societyId: string,
  buildingId?: string
): Promise<Wing[]> {
  if (!isValidUuid(societyId)) return [];
  if (buildingId && !isValidUuid(buildingId)) return [];

  const adminClient = createAdminClient();
  let query = adminClient.from("wings").select("*").eq("society_id", societyId);

  if (buildingId) {
    query = query.eq("building_id", buildingId);
  }

  const { data, error } = await query.order("name");
  if (error) {
    console.error("[buildingService] Error fetching wings:", error);
    return [];
  }
  return (data as Wing[]) || [];
}

export async function getWing(
  id: string,
  societyId: string
): Promise<{ success: boolean; data?: Wing; error?: string }> {
  if (!isValidUuid(id) || !isValidUuid(societyId)) {
    return { success: false, error: "Invalid wing or society ID format" };
  }

  const adminClient = createAdminClient();
  const { data, error } = await adminClient
    .from("wings")
    .select("*")
    .eq("id", id)
    .eq("society_id", societyId)
    .maybeSingle();

  if (error || !data) {
    return { success: false, error: "Wing not found in this society." };
  }

  return { success: true, data: data as Wing };
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

  // Tenant Isolation: Verify building belongs to target society
  const { data: building, error: bldgErr } = await adminClient
    .from("buildings")
    .select("id")
    .eq("id", parsed.data.building_id)
    .eq("society_id", parsed.data.society_id)
    .maybeSingle();

  if (bldgErr || !building) {
    return {
      success: false,
      error: "Building does not exist or does not belong to this society.",
    };
  }

  // Uniqueness check: wing code within building
  const { data: existingCode } = await adminClient
    .from("wings")
    .select("id")
    .eq("building_id", parsed.data.building_id)
    .eq("code", parsed.data.code)
    .maybeSingle();

  if (existingCode) {
    return {
      success: false,
      error: `Wing code '${parsed.data.code}' already exists in this building.`,
    };
  }

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

export async function updateWing(
  id: string,
  societyId: string,
  input: WingUpdateInput,
  actorUserId?: string
): Promise<{ success: boolean; data?: Wing; error?: string }> {
  if (!isValidUuid(id) || !isValidUuid(societyId)) {
    return { success: false, error: "Invalid wing or society ID format" };
  }

  const adminClient = createAdminClient();

  const { data: currentWing, error: findErr } = await adminClient
    .from("wings")
    .select("id, building_id, code")
    .eq("id", id)
    .eq("society_id", societyId)
    .maybeSingle();

  if (findErr || !currentWing) {
    return { success: false, error: "Wing not found in this society." };
  }

  // If code changed, check uniqueness in building
  if (input.code && input.code !== currentWing.code) {
    const { data: dupCode } = await adminClient
      .from("wings")
      .select("id")
      .eq("building_id", currentWing.building_id)
      .eq("code", input.code)
      .maybeSingle();

    if (dupCode) {
      return {
        success: false,
        error: `Wing code '${input.code}' already exists in this building.`,
      };
    }
  }

  const { data, error } = await adminClient
    .from("wings")
    .update({ ...input, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("society_id", societyId)
    .select()
    .single();

  if (error || !data) {
    return { success: false, error: error?.message || "Failed to update wing" };
  }

  await recordAuditLog({
    actorUserId,
    societyId,
    action: "WING_UPDATED",
    resourceType: "wings",
    resourceId: id,
    metadata: input,
  });

  return { success: true, data: data as Wing };
}

export async function deleteWing(
  id: string,
  societyId: string,
  actorUserId?: string
): Promise<{ success: boolean; error?: string }> {
  if (!isValidUuid(id) || !isValidUuid(societyId)) {
    return { success: false, error: "Invalid wing or society ID format" };
  }

  const adminClient = createAdminClient();

  // Check if units or floors are associated with this wing
  const [unitsCheck, floorsCheck] = await Promise.all([
    adminClient.from("units").select("id").eq("wing_id", id).limit(1),
    adminClient.from("floors").select("id").eq("wing_id", id).limit(1),
  ]);

  if (unitsCheck.data && unitsCheck.data.length > 0) {
    return {
      success: false,
      error: "Cannot delete wing: units are assigned to this wing. Remove or reassign units first.",
    };
  }

  if (floorsCheck.data && floorsCheck.data.length > 0) {
    return {
      success: false,
      error: "Cannot delete wing: floors are assigned to this wing. Remove or reassign floors first.",
    };
  }

  const { error } = await adminClient
    .from("wings")
    .delete()
    .eq("id", id)
    .eq("society_id", societyId);

  if (error) {
    return { success: false, error: error.message };
  }

  await recordAuditLog({
    actorUserId,
    societyId,
    action: "WING_DELETED",
    resourceType: "wings",
    resourceId: id,
  });

  return { success: true };
}

// ============================================================================
// FLOORS MANAGEMENT
// ============================================================================

export async function getFloors(
  societyId: string,
  buildingId?: string,
  wingId?: string
): Promise<Floor[]> {
  if (!isValidUuid(societyId)) return [];
  if (buildingId && !isValidUuid(buildingId)) return [];
  if (wingId && !isValidUuid(wingId)) return [];

  const adminClient = createAdminClient();
  let query = adminClient.from("floors").select("*").eq("society_id", societyId);

  if (buildingId) query = query.eq("building_id", buildingId);
  if (wingId) query = query.eq("wing_id", wingId);

  const { data, error } = await query.order("display_order").order("floor_number");
  if (error) {
    console.error("[buildingService] Error fetching floors:", error);
    return [];
  }
  return (data as Floor[]) || [];
}

export async function getFloor(
  id: string,
  societyId: string
): Promise<{ success: boolean; data?: Floor; error?: string }> {
  if (!isValidUuid(id) || !isValidUuid(societyId)) {
    return { success: false, error: "Invalid floor or society ID format" };
  }

  const adminClient = createAdminClient();
  const { data, error } = await adminClient
    .from("floors")
    .select("*")
    .eq("id", id)
    .eq("society_id", societyId)
    .maybeSingle();

  if (error || !data) {
    return { success: false, error: "Floor not found in this society." };
  }

  return { success: true, data: data as Floor };
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

  // Verify building belongs to society
  const { data: building, error: bldgErr } = await adminClient
    .from("buildings")
    .select("id")
    .eq("id", parsed.data.building_id)
    .eq("society_id", parsed.data.society_id)
    .maybeSingle();

  if (bldgErr || !building) {
    return {
      success: false,
      error: "Building does not exist or does not belong to this society.",
    };
  }

  // If wing_id provided, verify wing belongs to building and society
  if (parsed.data.wing_id) {
    const { data: wing, error: wingErr } = await adminClient
      .from("wings")
      .select("id")
      .eq("id", parsed.data.wing_id)
      .eq("building_id", parsed.data.building_id)
      .eq("society_id", parsed.data.society_id)
      .maybeSingle();

    if (wingErr || !wing) {
      return {
        success: false,
        error: "Wing does not belong to the selected building and society.",
      };
    }
  }

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

export async function updateFloor(
  id: string,
  societyId: string,
  input: FloorUpdateInput,
  actorUserId?: string
): Promise<{ success: boolean; data?: Floor; error?: string }> {
  if (!isValidUuid(id) || !isValidUuid(societyId)) {
    return { success: false, error: "Invalid floor or society ID format" };
  }

  const adminClient = createAdminClient();

  const { data: currentFloor, error: findErr } = await adminClient
    .from("floors")
    .select("id, building_id")
    .eq("id", id)
    .eq("society_id", societyId)
    .maybeSingle();

  if (findErr || !currentFloor) {
    return { success: false, error: "Floor not found in this society." };
  }

  // If wing_id is changed, verify wing belongs to building & society
  if (input.wing_id) {
    const { data: wing, error: wingErr } = await adminClient
      .from("wings")
      .select("id")
      .eq("id", input.wing_id)
      .eq("building_id", currentFloor.building_id)
      .eq("society_id", societyId)
      .maybeSingle();

    if (wingErr || !wing) {
      return {
        success: false,
        error: "Wing does not belong to this building and society.",
      };
    }
  }

  const { data, error } = await adminClient
    .from("floors")
    .update({ ...input, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("society_id", societyId)
    .select()
    .single();

  if (error || !data) {
    return { success: false, error: error?.message || "Failed to update floor" };
  }

  await recordAuditLog({
    actorUserId,
    societyId,
    action: "FLOOR_UPDATED",
    resourceType: "floors",
    resourceId: id,
    metadata: input,
  });

  return { success: true, data: data as Floor };
}

export async function deleteFloor(
  id: string,
  societyId: string,
  actorUserId?: string
): Promise<{ success: boolean; error?: string }> {
  if (!isValidUuid(id) || !isValidUuid(societyId)) {
    return { success: false, error: "Invalid floor or society ID format" };
  }

  const adminClient = createAdminClient();

  // Check if units are associated with this floor
  const { data: unitsCheck } = await adminClient
    .from("units")
    .select("id")
    .eq("floor_id", id)
    .limit(1);

  if (unitsCheck && unitsCheck.length > 0) {
    return {
      success: false,
      error: "Cannot delete floor: units are assigned to this floor. Remove or reassign units first.",
    };
  }

  const { error } = await adminClient
    .from("floors")
    .delete()
    .eq("id", id)
    .eq("society_id", societyId);

  if (error) {
    return { success: false, error: error.message };
  }

  await recordAuditLog({
    actorUserId,
    societyId,
    action: "FLOOR_DELETED",
    resourceType: "floors",
    resourceId: id,
  });

  return { success: true };
}

// ============================================================================
// UNITS MANAGEMENT & REGISTRY
// ============================================================================

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
  if (!isValidUuid(societyId)) return [];

  const adminClient = createAdminClient();
  let query = adminClient
    .from("units")
    .select("*, building:buildings(*), wing:wings(*), floor:floors(*)")
    .eq("society_id", societyId);

  if (options?.buildingId && isValidUuid(options.buildingId)) query = query.eq("building_id", options.buildingId);
  if (options?.wingId && isValidUuid(options.wingId)) query = query.eq("wing_id", options.wingId);
  if (options?.floorId && isValidUuid(options.floorId)) query = query.eq("floor_id", options.floorId);
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

export async function getUnitsPaginated(
  societyId: string,
  options: UnitFilterOptions = {}
): Promise<PaginatedUnitsResult> {
  if (!isValidUuid(societyId)) {
    return { data: [], pagination: { total: 0, page: 1, limit: 20, totalPages: 0 } };
  }

  const page = Math.max(1, options.page || 1);
  const limit = Math.min(100, Math.max(1, options.limit || 20));
  const offset = (page - 1) * limit;

  const adminClient = createAdminClient();
  let query = adminClient
    .from("units")
    .select("*, building:buildings(*), wing:wings(*), floor:floors(*)", { count: "exact" })
    .eq("society_id", societyId);

  if (options.buildingId && isValidUuid(options.buildingId)) {
    query = query.eq("building_id", options.buildingId);
  }
  if (options.wingId && isValidUuid(options.wingId)) {
    query = query.eq("wing_id", options.wingId);
  }
  if (options.floorId && isValidUuid(options.floorId)) {
    query = query.eq("floor_id", options.floorId);
  }
  if (options.status) {
    query = query.eq("status", options.status);
  }
  if (options.unitType) {
    query = query.eq("unit_type", options.unitType);
  }
  if (options.search && options.search.trim()) {
    query = query.ilike("unit_number", `%${options.search.trim()}%`);
  }

  query = query.order("unit_number").range(offset, offset + limit - 1);

  const { data, count, error } = await query;
  if (error) {
    console.error("[buildingService] Error fetching paginated units:", error);
    return { data: [], pagination: { total: 0, page, limit, totalPages: 0 } };
  }

  const total = count || 0;
  const totalPages = Math.ceil(total / limit);

  return {
    data: (data as Unit[]) || [],
    pagination: {
      total,
      page,
      limit,
      totalPages,
    },
  };
}

export async function getUnitWithDetails(
  id: string,
  societyId: string
): Promise<{ success: boolean; data?: UnitDetail; error?: string }> {
  if (!isValidUuid(id) || !isValidUuid(societyId)) {
    return { success: false, error: "Invalid unit or society ID format" };
  }

  const adminClient = createAdminClient();

  const { data: unit, error: unitErr } = await adminClient
    .from("units")
    .select("*, building:buildings(*), wing:wings(*), floor:floors(*)")
    .eq("id", id)
    .eq("society_id", societyId)
    .maybeSingle();

  if (unitErr || !unit) {
    return { success: false, error: "Unit not found in this society." };
  }

  // Fetch owners, occupancies, and society members associated with this unit
  const [ownersRes, occRes, membersRes] = await Promise.all([
    adminClient
      .from("unit_owners")
      .select(`
        id, society_id, unit_id, user_id, is_primary, ownership_percentage, ownership_type, start_date, end_date, status, created_at, updated_at,
        profile:profiles (id, full_name, display_name, avatar_url)
      `)
      .eq("unit_id", id)
      .eq("society_id", societyId)
      .eq("status", "ACTIVE")
      .order("is_primary", { ascending: false }),
    adminClient
      .from("unit_occupancies")
      .select(`
        id, society_id, unit_id, user_id, occupancy_type, lease_start, lease_end, is_primary_tenant, status, created_at, updated_at,
        profile:profiles (id, full_name, display_name, avatar_url)
      `)
      .eq("unit_id", id)
      .eq("society_id", societyId)
      .eq("status", "ACTIVE")
      .order("created_at", { ascending: false }),
    adminClient
      .from("society_memberships")
      .select(`
        id, society_id, user_id, role_id, unit_number, status, created_at, updated_at,
        profile:profiles (id, full_name, display_name)
      `)
      .eq("society_id", societyId)
      .eq("unit_number", unit.unit_number)
      .eq("status", "ACTIVE"),
  ]);

  const detail: UnitDetail = {
    ...(unit as Unit),
    owners: (ownersRes.data as any) || [],
    occupants: (occRes.data as any) || [],
    members: (membersRes.data as any) || [],
  };

  return { success: true, data: detail };
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

  // 1. Verify building belongs to society
  const { data: building, error: bldgErr } = await adminClient
    .from("buildings")
    .select("id")
    .eq("id", parsed.data.building_id)
    .eq("society_id", parsed.data.society_id)
    .maybeSingle();

  if (bldgErr || !building) {
    return {
      success: false,
      error: "Building does not exist or does not belong to this society.",
    };
  }

  // 2. If wing_id provided, verify wing belongs to building & society
  if (parsed.data.wing_id) {
    const { data: wing, error: wingErr } = await adminClient
      .from("wings")
      .select("id")
      .eq("id", parsed.data.wing_id)
      .eq("building_id", parsed.data.building_id)
      .eq("society_id", parsed.data.society_id)
      .maybeSingle();

    if (wingErr || !wing) {
      return {
        success: false,
        error: "Wing does not belong to the selected building and society.",
      };
    }
  }

  // 3. If floor_id provided, verify floor belongs to building & society
  if (parsed.data.floor_id) {
    const { data: floor, error: floorErr } = await adminClient
      .from("floors")
      .select("id")
      .eq("id", parsed.data.floor_id)
      .eq("building_id", parsed.data.building_id)
      .eq("society_id", parsed.data.society_id)
      .maybeSingle();

    if (floorErr || !floor) {
      return {
        success: false,
        error: "Floor does not belong to the selected building and society.",
      };
    }
  }

  // 4. Duplicate unit_number check within society
  const normalizedUnitNo = parsed.data.unit_number.trim().toUpperCase();
  const { data: existingUnit } = await adminClient
    .from("units")
    .select("id")
    .eq("society_id", parsed.data.society_id)
    .ilike("unit_number", normalizedUnitNo)
    .maybeSingle();

  if (existingUnit) {
    return {
      success: false,
      error: `Unit number '${parsed.data.unit_number}' already exists in this society.`,
    };
  }

  const { data, error } = await adminClient
    .from("units")
    .insert({
      ...parsed.data,
      unit_number: normalizedUnitNo,
    })
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
  if (!isValidUuid(id) || !isValidUuid(societyId)) {
    return { success: false, error: "Invalid unit or society ID format" };
  }

  const adminClient = createAdminClient();

  const { data: currentUnit, error: findErr } = await adminClient
    .from("units")
    .select("id, building_id, wing_id, floor_id, unit_number")
    .eq("id", id)
    .eq("society_id", societyId)
    .maybeSingle();

  if (findErr || !currentUnit) {
    return { success: false, error: "Unit not found in this society." };
  }

  // If unit_number is changed, check uniqueness
  if (input.unit_number && input.unit_number.trim().toUpperCase() !== currentUnit.unit_number.toUpperCase()) {
    const normalizedNew = input.unit_number.trim().toUpperCase();
    const { data: dupUnit } = await adminClient
      .from("units")
      .select("id")
      .eq("society_id", societyId)
      .ilike("unit_number", normalizedNew)
      .maybeSingle();

    if (dupUnit) {
      return {
        success: false,
        error: `Unit number '${input.unit_number}' is already used by another unit.`,
      };
    }
  }

  // If wing_id changed, verify it belongs to building and society
  if (input.wing_id !== undefined && input.wing_id !== null) {
    const { data: wing, error: wingErr } = await adminClient
      .from("wings")
      .select("id")
      .eq("id", input.wing_id)
      .eq("building_id", currentUnit.building_id)
      .eq("society_id", societyId)
      .maybeSingle();

    if (wingErr || !wing) {
      return {
        success: false,
        error: "Wing does not belong to this building and society.",
      };
    }
  }

  // If floor_id changed, verify it belongs to building and society
  if (input.floor_id !== undefined && input.floor_id !== null) {
    const { data: floor, error: floorErr } = await adminClient
      .from("floors")
      .select("id")
      .eq("id", input.floor_id)
      .eq("building_id", currentUnit.building_id)
      .eq("society_id", societyId)
      .maybeSingle();

    if (floorErr || !floor) {
      return {
        success: false,
        error: "Floor does not belong to this building and society.",
      };
    }
  }

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

export async function deleteUnit(
  id: string,
  societyId: string,
  actorUserId?: string
): Promise<{ success: boolean; error?: string }> {
  if (!isValidUuid(id) || !isValidUuid(societyId)) {
    return { success: false, error: "Invalid unit or society ID format" };
  }

  const adminClient = createAdminClient();

  // Safe deletion checks: prevent deleting unit if active ownership or occupancy exists
  const [ownersCheck, occCheck] = await Promise.all([
    adminClient.from("unit_owners").select("id").eq("unit_id", id).eq("status", "ACTIVE").limit(1),
    adminClient.from("unit_occupancies").select("id").eq("unit_id", id).eq("status", "ACTIVE").limit(1),
  ]);

  if (ownersCheck.data && ownersCheck.data.length > 0) {
    return {
      success: false,
      error: "Cannot delete unit: active ownership records exist. Remove or transfer ownership first.",
    };
  }

  if (occCheck.data && occCheck.data.length > 0) {
    return {
      success: false,
      error: "Cannot delete unit: active occupancy records exist. Terminate occupancy first.",
    };
  }

  const { error } = await adminClient
    .from("units")
    .delete()
    .eq("id", id)
    .eq("society_id", societyId);

  if (error) {
    return { success: false, error: error.message };
  }

  await recordAuditLog({
    actorUserId,
    societyId,
    action: "UNIT_DELETED",
    resourceType: "units",
    resourceId: id,
  });

  return { success: true };
}
