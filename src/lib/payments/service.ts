import { createAdminClient } from "@/lib/supabase/admin";
import { recordAuditLog } from "@/lib/auth/audit";
import { PaymentMethod, Payment, Receipt, Invoice } from "@/lib/types/database";
import { PaymentGatewayProvider } from "./types";
import { OfflinePaymentProvider } from "./offlineProvider";
import { SimulatedGatewayProvider } from "./simulatedProvider";

// Registry of payment providers
const providers: Record<string, PaymentGatewayProvider> = {
  OFFLINE: new OfflinePaymentProvider(),
  SIMULATED: new SimulatedGatewayProvider(),
};

export function getPaymentProvider(name: string = "OFFLINE"): PaymentGatewayProvider {
  return providers[name.toUpperCase()] || providers.OFFLINE;
}

export interface RecordManualPaymentParams {
  societyId: string;
  invoiceId: string;
  amount: number;
  paymentDate: string;
  paymentMethod: PaymentMethod;
  referenceNumber?: string | null;
  notes?: string | null;
  recordedBy: string;
  actorUserId: string;
}

export interface RecordPaymentResult {
  success: boolean;
  payment?: Payment;
  receipt?: Receipt;
  invoice?: Invoice;
  error?: string;
}

/**
 * Generates an authoritative sequential receipt number: REC-{YYYYMM}-{SEQ}
 */
export async function generateReceiptNumber(societyId: string): Promise<string> {
  const adminClient = createAdminClient();
  const dateStr = new Date().toISOString().slice(0, 7).replace("-", ""); // e.g. 202609

  // Count existing receipts for this society in this month
  const { count } = await adminClient
    .from("receipts")
    .select("id", { count: "exact", head: true })
    .eq("society_id", societyId);

  const seq = String((count || 0) + 1).padStart(4, "0");
  const randomSuffix = Math.random().toString(36).substring(2, 5).toUpperCase();
  return `REC-${dateStr}-${seq}-${randomSuffix}`;
}

/**
 * Server-authoritative payment recording with balance reduction and receipt issuance
 */
export async function recordManualPayment(
  params: RecordManualPaymentParams
): Promise<RecordPaymentResult> {
  const adminClient = createAdminClient();

  try {
    // 1. Fetch invoice and verify society ownership
    const { data: invoice, error: invError } = await adminClient
      .from("invoices")
      .select("*, unit:units(id, unit_number)")
      .eq("id", params.invoiceId)
      .eq("society_id", params.societyId)
      .single();

    if (invError || !invoice) {
      return { success: false, error: "Invoice not found in this society" };
    }

    // 2. Validate state machine rules
    if (invoice.status === "PAID") {
      return { success: false, error: "Invoice is already fully paid" };
    }
    if (invoice.status === "CANCELLED") {
      return { success: false, error: "Cannot record payment for a cancelled invoice" };
    }

    // 3. Prevent overpayment & invalid amounts
    if (params.amount <= 0) {
      return { success: false, error: "Payment amount must be greater than zero" };
    }

    const currentBalanceDue = Number(invoice.balance_due);
    if (params.amount > currentBalanceDue) {
      return {
        success: false,
        error: `Payment amount (${params.amount}) exceeds outstanding balance (${currentBalanceDue})`,
      };
    }

    // 4. Create Payment record
    const { data: payment, error: payError } = await adminClient
      .from("payments")
      .insert({
        society_id: params.societyId,
        invoice_id: invoice.id,
        unit_id: invoice.unit_id,
        amount: params.amount,
        payment_date: params.paymentDate,
        payment_method: params.paymentMethod,
        reference_number: params.referenceNumber || null,
        status: "COMPLETED",
        recorded_by: params.recordedBy,
        notes: params.notes || null,
      })
      .select()
      .single();

    if (payError || !payment) {
      console.error("[BillingService] Error inserting payment:", payError);
      return { success: false, error: "Failed to record payment" };
    }

    // 5. Generate and create Receipt
    const receiptNumber = await generateReceiptNumber(params.societyId);
    const { data: receipt, error: recError } = await adminClient
      .from("receipts")
      .insert({
        society_id: params.societyId,
        invoice_id: invoice.id,
        payment_id: payment.id,
        unit_id: invoice.unit_id,
        receipt_number: receiptNumber,
        amount: params.amount,
        receipt_date: params.paymentDate,
        issued_by: params.recordedBy,
        notes: params.notes || null,
      })
      .select()
      .single();

    if (recError || !receipt) {
      console.error("[BillingService] Error creating receipt:", recError);
      return { success: false, error: "Payment recorded but failed to issue receipt" };
    }

    // 6. Update invoice balances and status
    const newAmountPaid = Number(invoice.amount_paid) + params.amount;
    const newBalanceDue = currentBalanceDue - params.amount;
    const newStatus = newBalanceDue === 0 ? "PAID" : "PARTIALLY_PAID";

    const { data: updatedInvoice, error: updateError } = await adminClient
      .from("invoices")
      .update({
        amount_paid: newAmountPaid,
        balance_due: newBalanceDue,
        status: newStatus,
        updated_at: new Date().toISOString(),
      })
      .eq("id", invoice.id)
      .select()
      .single();

    if (updateError) {
      console.error("[BillingService] Error updating invoice:", updateError);
    }

    // 7. Record Audit Events
    await recordAuditLog({
      actorUserId: params.actorUserId,
      effectiveUserId: params.recordedBy,
      societyId: params.societyId,
      action: "PAYMENT_RECORDED",
      resourceType: "payment",
      resourceId: payment.id,
      metadata: {
        invoice_id: invoice.id,
        invoice_number: invoice.invoice_number,
        amount: params.amount,
        payment_method: params.paymentMethod,
        reference_number: params.referenceNumber,
        new_balance: newBalanceDue,
        new_status: newStatus,
      },
    });

    await recordAuditLog({
      actorUserId: params.actorUserId,
      effectiveUserId: params.recordedBy,
      societyId: params.societyId,
      action: "RECEIPT_GENERATED",
      resourceType: "receipt",
      resourceId: receipt.id,
      metadata: {
        receipt_number: receiptNumber,
        invoice_id: invoice.id,
        payment_id: payment.id,
        amount: params.amount,
      },
    });

    return {
      success: true,
      payment,
      receipt,
      invoice: updatedInvoice || invoice,
    };
  } catch (err: any) {
    console.error("[BillingService] Exception in recordManualPayment:", err);
    return { success: false, error: err?.message || "Internal server error" };
  }
}
