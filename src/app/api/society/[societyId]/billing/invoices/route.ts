import { NextResponse } from "next/server";
import { requireSocietyAccess } from "@/lib/auth/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export async function GET(
  req: Request,
  context: { params: Promise<{ societyId: string }> }
) {
  try {
    const { societyId } = await context.params;
    await requireSocietyAccess(societyId);

    const { searchParams } = new URL(req.url);
    const statusFilter = searchParams.get("status");
    const unitIdFilter = searchParams.get("unit_id");
    const cycleIdFilter = searchParams.get("cycle_id");

    const adminClient = createAdminClient();

    let query = adminClient
      .from("invoices")
      .select(`
        *,
        unit:units (
          id,
          unit_number,
          unit_type,
          area_sqft,
          building:buildings (name, code),
          wing:wings (name, code)
        ),
        billing_cycle:billing_cycles (
          id,
          name,
          period_start,
          period_end,
          due_date
        ),
        charge_config:maintenance_configurations (
          id,
          name,
          charge_type,
          rate
        )
      `)
      .eq("society_id", societyId)
      .order("created_at", { ascending: false });

    if (statusFilter && statusFilter !== "ALL") {
      query = query.eq("status", statusFilter);
    }
    if (unitIdFilter) {
      query = query.eq("unit_id", unitIdFilter);
    }
    if (cycleIdFilter) {
      query = query.eq("billing_cycle_id", cycleIdFilter);
    }

    const { data: invoices, error } = await query;

    if (error) {
      console.error("[API/billing/invoices] Error fetching invoices:", error);
      return NextResponse.json({ error: "Failed to fetch invoices" }, { status: 500 });
    }

    return NextResponse.json({ invoices: invoices || [] });
  } catch (err: any) {
    console.error("[API/billing/invoices] Exception:", err);
    return NextResponse.json(
      { error: err?.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}
