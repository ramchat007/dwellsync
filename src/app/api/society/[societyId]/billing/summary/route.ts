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

    // Fetch invoice aggregates
    const { data: invoices, error: invError } = await adminClient
      .from("invoices")
      .select("total_amount, amount_paid, balance_due, status, due_date")
      .eq("society_id", societyId);

    if (invError) {
      console.error("[API/billing/summary] Error fetching invoices:", invError);
      return NextResponse.json({ error: "Failed to load billing metrics" }, { status: 500 });
    }

    const todayStr = new Date().toISOString().slice(0, 10);
    let totalBilled = 0;
    let totalCollected = 0;
    let totalOutstanding = 0;
    let overdueCount = 0;
    let unpaidCount = 0;
    let paidCount = 0;

    (invoices || []).forEach((inv) => {
      if (inv.status !== "CANCELLED") {
        totalBilled += Number(inv.total_amount);
        totalCollected += Number(inv.amount_paid);
        totalOutstanding += Number(inv.balance_due);

        if (inv.status === "PAID") {
          paidCount++;
        } else {
          unpaidCount++;
          if (inv.due_date < todayStr || inv.status === "OVERDUE") {
            overdueCount++;
          }
        }
      }
    });

    return NextResponse.json({
      summary: {
        totalBilled: Math.round(totalBilled * 100) / 100,
        totalCollected: Math.round(totalCollected * 100) / 100,
        totalOutstanding: Math.round(totalOutstanding * 100) / 100,
        invoiceCount: (invoices || []).length,
        unpaidCount,
        paidCount,
        overdueCount,
      },
    });
  } catch (err: any) {
    console.error("[API/billing/summary] Exception:", err);
    return NextResponse.json(
      { error: err?.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}
