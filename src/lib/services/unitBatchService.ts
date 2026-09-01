import { createAdminClient } from "../supabase/admin";
import { UnitType, UnitStatus, Unit } from "../types/database";
import { UnitBatchGenerationInput, unitBatchGenerationSchema } from "../validations/unit";
import { recordAuditLog } from "../auth/audit";

export interface GeneratedUnitItem {
  unit_number: string;
  floor_number: number;
  unit_type: UnitType;
  area_sqft?: number | null;
  status: UnitStatus;
}

export function generateUnitDefinitions(input: UnitBatchGenerationInput): GeneratedUnitItem[] {
  const { start_floor, end_floor, units_per_floor, prefix, unit_type, area_sqft } = input;
  const units: GeneratedUnitItem[] = [];

  for (let floor = start_floor; floor <= end_floor; floor++) {
    for (let u = 1; u <= units_per_floor; u++) {
      const unitPad = u < 10 ? `0${u}` : `${u}`;
      const floorStr = floor === 0 ? "G" : floor < 0 ? `B${Math.abs(floor)}` : `${floor}`;
      const prefixStr = prefix ? `${prefix}-` : "";
      const unitNumber = `${prefixStr}${floorStr}${unitPad}`;

      units.push({
        unit_number: unitNumber,
        floor_number: floor,
        unit_type,
        area_sqft,
        status: "VACANT",
      });
    }
  }

  return units;
}

export async function bulkCreateUnits(
  params: {
    society_id: string;
    building_id: string;
    wing_id?: string | null;
    units: GeneratedUnitItem[];
  },
  actorUserId?: string
): Promise<{ success: boolean; createdCount: number; error?: string }> {
  if (!params.units || params.units.length === 0) {
    return { success: false, createdCount: 0, error: "No units provided for batch creation" };
  }

  const adminClient = createAdminClient();

  // 1. Fetch or create floors for the building to associate floor_id where possible
  const { data: floors } = await adminClient
    .from("floors")
    .select("id, floor_number")
    .eq("building_id", params.building_id);

  const floorMap = new Map<number, string>();
  for (const f of floors || []) {
    floorMap.set(f.floor_number, f.id);
  }

  // 2. Prepare payload
  const rows = params.units.map((u) => ({
    society_id: params.society_id,
    building_id: params.building_id,
    wing_id: params.wing_id || null,
    floor_id: floorMap.get(u.floor_number) || null,
    unit_number: u.unit_number,
    unit_type: u.unit_type,
    area_sqft: u.area_sqft || null,
    status: u.status || "VACANT",
  }));

  // 3. Batch insert
  const { data: inserted, error } = await adminClient
    .from("units")
    .insert(rows)
    .select("id");

  if (error) {
    console.error("[unitBatchService] Error inserting units:", error);
    return { success: false, createdCount: 0, error: error.message };
  }

  // 4. Audit Log
  await recordAuditLog({
    actorUserId,
    societyId: params.society_id,
    action: "UNITS_BULK_GENERATED",
    resourceType: "units",
    resourceId: params.building_id,
    metadata: {
      count: inserted?.length || 0,
      building_id: params.building_id,
      wing_id: params.wing_id,
    },
  });

  return { success: true, createdCount: inserted?.length || 0 };
}

