import { NextResponse } from "next/server";
import { requireSocietyAccess } from "@/lib/auth/server";
import { RecordPaymentSchema } from "@/lib/validations/billing";
import { recordManualPayment } from "@/lib/payments/service";

export const dynamic = "force-dynamic";

export async function POST(
  req: Request,
  context: { params: Promise<{ societyId: string }> }
) {
  try {
    const { societyId } = await context.params;
    const { identity } = await requireSocietyAccess(societyId);

    const body = await req.json();
    const parsed = RecordPaymentSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const result = await recordManualPayment({
      societyId,
      invoiceId: parsed.data.invoice_id,
      amount: parsed.data.amount,
      paymentDate: parsed.data.payment_date,
      paymentMethod: parsed.data.payment_method,
      referenceNumber: parsed.data.reference_number || null,
      notes: parsed.data.notes || null,
      recordedBy: identity.effectiveUser.id,
      actorUserId: identity.originalUser.id,
    });

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json(
      {
        payment: result.payment,
        receipt: result.receipt,
        invoice: result.invoice,
      },
      { status: 201 }
    );
  } catch (err: any) {
    console.error("[API/billing/payments] Exception:", err);
    return NextResponse.json(
      { error: err?.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}
