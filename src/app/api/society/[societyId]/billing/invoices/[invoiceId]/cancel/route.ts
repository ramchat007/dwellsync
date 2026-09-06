import { NextResponse } from "next/server";
import { requireSocietyAccess } from "@/lib/auth/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { recordAuditLog } from "@/lib/auth/audit";
import { CancelInvoiceSchema } from "@/lib/validations/billing";

export const dynamic = "force-dynamic";

export async function POST(
  req: Request,
  context: { params: Promise<{ societyId: string; invoiceId: string }> }
) {
  try {
    const { societyId, invoiceId } = await context.params;
    const { identity } = await requireSocietyAccess(societyId);

    const body = await req.json().catch(() => ({}));
    const parsed = CancelInvoiceSchema.safeParse(body);
    const reason = parsed.success ? parsed.data.reason : "Administrative cancellation";

    const adminClient = createAdminClient();

    // 1. Fetch invoice
    const { data: invoice, error: fetchErr } = await adminClient
      .from("invoices")
      .select("*")
      .eq("id", invoiceId)
      .eq("society_id", societyId)
      .single();

    if (fetchErr || !invoice) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }

    // 2. Validate state machine: Invoices with completed payments cannot be directly cancelled
    if (invoice.status === "PAID") {
      return NextResponse.json(
        { error: "Paid invoices cannot be cancelled. Payment must be refunded or voided first." },
        { status: 400 }
      );
    }
    if (Number(invoice.amount_paid) > 0) {
      return NextResponse.json(
        { error: "Invoices with partial payments recorded cannot be cancelled directly." },
        { status: 400 }
      );
    }

    // 3. Mark CANCELLED
    const { data: updatedInvoice, error: updateErr } = await adminClient
      .from("invoices")
      .update({
        status: "CANCELLED",
        notes: invoice.notes ? `${invoice.notes} | Cancelled: ${reason}` : `Cancelled: ${reason}`,
        updated_at: new Date().toISOString(),
      })
      .eq("id", invoiceId)
      .select()
      .single();

    if (updateErr) {
      console.error("[API/billing/invoices/cancel] Error cancelling invoice:", updateErr);
      return NextResponse.json({ error: "Failed to cancel invoice" }, { status: 500 });
    }

    // 4. Audit Log
    await recordAuditLog({
      actorUserId: identity.originalUser.id,
      effectiveUserId: identity.effectiveUser.id,
      societyId,
      action: "INVOICE_CANCELLED",
      resourceType: "invoice",
      resourceId: invoice.id,
      metadata: {
        invoice_number: invoice.invoice_number,
        total_amount: invoice.total_amount,
        reason,
      },
    });

    return NextResponse.json({ invoice: updatedInvoice });
  } catch (err: any) {
    console.error("[API/billing/invoices/cancel] Exception:", err);
    return NextResponse.json(
      { error: err?.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}
