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

    const adminClient = createAdminClient();

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
          total_amount,
          billing_cycle:billing_cycles (name)
        ),
        payment:payments (
          id,
          payment_method,
          reference_number
        ),
        issuer:profiles!receipts_issued_by_fkey (
          id,
          full_name,
          display_name
        )
      `)
      .eq("society_id", societyId)
      .order("receipt_date", { ascending: false });

    if (error) {
      console.error("[API/billing/receipts] Error fetching receipts:", error);
      return NextResponse.json({ error: "Failed to fetch receipts" }, { status: 500 });
    }

    return NextResponse.json({ receipts: receipts || [] });
  } catch (err: any) {
    console.error("[API/billing/receipts] Exception:", err);
    return NextResponse.json(
      { error: err?.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}
