import { NextResponse } from "next/server";
import { getCurrentIdentity } from "@/lib/auth/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const identity = await getCurrentIdentity();
    if (!identity || !identity.isAuthenticated) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const societyId = identity.currentSociety?.id;
    if (!societyId) {
      return NextResponse.json({ invoices: [] });
    }

    const userId = identity.effectiveUser.id;
    const adminClient = createAdminClient();

    // 1. Fetch active units for resident
    const { data: ownedUnits } = await adminClient
      .from("unit_owners")
      .select("unit_id")
      .eq("society_id", societyId)
      .eq("user_id", userId)
      .eq("status", "ACTIVE");

    const { data: occupiedUnits } = await adminClient
      .from("unit_occupancies")
      .select("unit_id")
      .eq("society_id", societyId)
      .eq("user_id", userId)
      .eq("status", "ACTIVE");

    const unitIds = Array.from(
      new Set([
        ...(ownedUnits || []).map((u) => u.unit_id),
        ...(occupiedUnits || []).map((u) => u.unit_id),
      ])
    );

    if (unitIds.length === 0) {
      return NextResponse.json({ invoices: [] });
    }

    // 2. Fetch invoices for resident units
    const { data: invoices, error } = await adminClient
      .from("invoices")
      .select(`
        *,
        unit:units (
          id,
          unit_number,
          building:buildings (name, code),
          wing:wings (name, code)
        ),
        billing_cycle:billing_cycles (
          id,
          name,
          period_start,
          period_end,
          due_date
        )
      `)
      .eq("society_id", societyId)
      .in("unit_id", unitIds)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("[API/resident/invoices] Error fetching invoices:", error);
      return NextResponse.json({ error: "Failed to fetch invoices" }, { status: 500 });
    }

    return NextResponse.json({ invoices: invoices || [] });
  } catch (err: any) {
    console.error("[API/resident/invoices] Exception:", err);
    return NextResponse.json(
      { error: err?.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}
