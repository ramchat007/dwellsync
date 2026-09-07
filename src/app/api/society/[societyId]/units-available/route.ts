import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ societyId: string }> }
) {
  try {
    const { societyId } = await params;
    const adminClient = createAdminClient();

    // Fetch units with wing info
    const { data: units, error } = await adminClient
      .from("units")
      .select(`
        id,
        unit_number,
        unit_type,
        floor_id,
        wing:wings (
          id,
          name,
          code
        ),
        building:buildings (
          id,
          name
        )
      `)
      .eq("society_id", societyId)
      .order("unit_number", { ascending: true });

    if (error) {
      console.error("[units-available GET] Error:", error);
      return NextResponse.json({ error: "Failed to fetch units" }, { status: 500 });
    }

    // Check which units already have primary owners or active occupants
    const { data: occupiedUnits } = await adminClient
      .from("unit_owners")
      .select("unit_id")
      .eq("society_id", societyId)
      .eq("status", "ACTIVE");

    const occupiedSet = new Set((occupiedUnits || []).map((o: any) => o.unit_id));

    const formattedUnits = (units || []).map((u: any) => ({
      id: u.id,
      unit_number: u.unit_number,
      unit_type: u.unit_type,
      wing_name: u.wing?.name || "Main",
      building_name: u.building?.name || "",
      is_claimed: occupiedSet.has(u.id),
    }));

    return NextResponse.json({
      success: true,
      units: formattedUnits,
    });
  } catch (err: any) {
    console.error("[units-available GET] Exception:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

