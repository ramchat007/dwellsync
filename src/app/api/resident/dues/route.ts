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
      return NextResponse.json({
        summary: { totalOutstanding: 0, totalPaid: 0, unpaidCount: 0, overdueCount: 0 },
        invoices: [],
        receipts: [],
        units: [],
      });
    }

    const userId = identity.effectiveUser.id;
    const adminClient = createAdminClient();

    // 1. Identify all units where user is an active Owner or Occupant
    const { data: ownedUnits } = await adminClient
      .from("unit_owners")
      .select("unit_id, unit:units(id, unit_number, building:buildings(name))")
      .eq("society_id", societyId)
      .eq("user_id", userId)
      .eq("status", "ACTIVE");

    const { data: occupiedUnits } = await adminClient
      .from("unit_occupancies")
      .select("unit_id, unit:units(id, unit_number, building:buildings(name))")
      .eq("society_id", societyId)
      .eq("user_id", userId)
      .eq("status", "ACTIVE");

    const userUnitMap = new Map<string, any>();
    (ownedUnits || []).forEach((u) => {
      if (u.unit) userUnitMap.set(u.unit_id, u.unit);
    });
    (occupiedUnits || []).forEach((u) => {
      if (u.unit) userUnitMap.set(u.unit_id, u.unit);
    });

    const unitIds = Array.from(userUnitMap.keys());
    if (unitIds.length === 0) {
      return NextResponse.json({
        summary: { totalOutstanding: 0, totalPaid: 0, unpaidCount: 0, overdueCount: 0 },
        invoices: [],
        receipts: [],
        units: [],
      });
    }

    // 2. Fetch Invoices for these authorized units only
    const { data: invoices, error: invError } = await adminClient
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
          period_end
        )
      `)
      .eq("society_id", societyId)
      .in("unit_id", unitIds)
      .order("created_at", { ascending: false });

    if (invError) {
      console.error("[API/resident/dues] Error fetching invoices:", invError);
      return NextResponse.json({ error: "Failed to fetch invoices" }, { status: 500 });
    }

    // 3. Fetch Receipts for these authorized units only
    const { data: receipts, error: recError } = await adminClient
      .from("receipts")
      .select(`
        *,
        unit:units (
          id,
          unit_number
        ),
        invoice:invoices (
          id,
          invoice_number
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

    if (recError) {
      console.error("[API/resident/dues] Error fetching receipts:", recError);
    }

    // 4. Compute Metrics
    const todayStr = new Date().toISOString().slice(0, 10);
    let totalOutstanding = 0;
    let totalPaid = 0;
    let unpaidCount = 0;
    let overdueCount = 0;

    (invoices || []).forEach((inv) => {
      if (inv.status !== "CANCELLED") {
        totalOutstanding += Number(inv.balance_due);
        totalPaid += Number(inv.amount_paid);

        if (inv.status !== "PAID") {
          unpaidCount++;
          if (inv.due_date < todayStr || inv.status === "OVERDUE") {
            overdueCount++;
          }
        }
      }
    });

    return NextResponse.json({
      summary: {
        totalOutstanding: Math.round(totalOutstanding * 100) / 100,
        totalPaid: Math.round(totalPaid * 100) / 100,
        unpaidCount,
        overdueCount,
      },
      invoices: invoices || [],
      receipts: receipts || [],
      units: Array.from(userUnitMap.values()),
    });
  } catch (err: any) {
    console.error("[API/resident/dues] Exception:", err);
    return NextResponse.json(
      { error: err?.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}
