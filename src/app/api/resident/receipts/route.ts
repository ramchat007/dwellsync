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
      return NextResponse.json({ receipts: [] });
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
      return NextResponse.json({ receipts: [] });
    }

    // 2. Fetch receipts for resident units
    const { data: receipts, error } = await adminClient
      .from("receipts")
      .select(`
        *,
        unit:units (
          id,
          unit_number,
          building:buildings (name, code),
          wing:wings (name, code)
        ),
        invoice:invoices (
          id,
          invoice_number,
          total_amount
        ),
        payment:payments (
          id,
          payment_method,
          reference_number
        )
      `)
      .eq("society_id", societyId)
      .in("unit_id", unitIds)
      .order("receipt_date", { ascending: false });

    if (error) {
      console.error("[API/resident/receipts] Error fetching receipts:", error);
      return NextResponse.json({ error: "Failed to fetch receipts" }, { status: 500 });
    }

    return NextResponse.json({ receipts: receipts || [] });
  } catch (err: any) {
    console.error("[API/resident/receipts] Exception:", err);
    return NextResponse.json(
      { error: err?.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}
