import { createAdminClient } from "@/lib/supabase/admin";
import { recordAuditLog } from "@/lib/auth/audit";
import { Invoice, InvoiceLineItem, MaintenanceConfiguration, BillingCycle } from "@/lib/types/database";

export interface GenerateBillingInvoicesParams {
  societyId: string;
  billingCycleId: string;
  chargeConfigId: string;
  actorUserId: string;
  effectiveUserId: string;
}

export interface GenerateInvoicesResult {
  success: boolean;
  generatedCount: number;
  skippedCount: number;
  invoices?: Invoice[];
  error?: string;
}

/**
 * Generates an authoritative server invoice number: INV-{YYYYMM}-{SEQ}-{RAND}
 */
export async function generateInvoiceNumber(
  societyId: string,
  periodStart: string,
  seqOffset: number = 0
): Promise<string> {
  const dateStr = periodStart ? periodStart.slice(0, 7).replace("-", "") : new Date().toISOString().slice(0, 7).replace("-", "");
  const randomSuffix = Math.random().toString(36).substring(2, 6).toUpperCase();
  const seq = String(seqOffset + 1).padStart(4, "0");
  return `INV-${dateStr}-${seq}-${randomSuffix}`;
}

/**
 * Idempotently generates invoices for all active society units based on the selected charge configuration
 */
export async function generateBillingInvoices(
  params: GenerateBillingInvoicesParams
): Promise<GenerateInvoicesResult> {
  const adminClient = createAdminClient();

  try {
    // 1. Fetch Billing Cycle
    const { data: cycle, error: cycleErr } = await adminClient
      .from("billing_cycles")
      .select("*")
      .eq("id", params.billingCycleId)
      .eq("society_id", params.societyId)
      .single();

    if (cycleErr || !cycle) {
      return { success: false, generatedCount: 0, skippedCount: 0, error: "Billing cycle not found" };
    }

    // 2. Fetch Charge Configuration
    const { data: config, error: configErr } = await adminClient
      .from("maintenance_configurations")
      .select("*")
      .eq("id", params.chargeConfigId)
      .eq("society_id", params.societyId)
      .single();

    if (configErr || !config) {
      return { success: false, generatedCount: 0, skippedCount: 0, error: "Maintenance configuration not found" };
    }

    // 3. Fetch all active units in the society
    const { data: units, error: unitsErr } = await adminClient
      .from("units")
      .select("id, unit_number, unit_type, area_sqft, carpet_area_sqft, status")
      .eq("society_id", params.societyId)
      .neq("status", "INACTIVE");

    if (unitsErr || !units || units.length === 0) {
      return { success: false, generatedCount: 0, skippedCount: 0, error: "No units found in this society to bill" };
    }

    // 4. Fetch already existing invoices for this cycle (Idempotency enforcement)
    const { data: existingInvoices, error: existErr } = await adminClient
      .from("invoices")
      .select("unit_id")
      .eq("billing_cycle_id", cycle.id);

    if (existErr) {
      console.error("[InvoiceGenerator] Error checking existing invoices:", existErr);
    }

    const alreadyBilledUnitIds = new Set((existingInvoices || []).map((i) => i.unit_id));

    // 5. Build invoice rows for units not yet billed
    const invoicesToInsert: any[] = [];
    let seq = 1;

    for (const unit of units) {
      if (alreadyBilledUnitIds.has(unit.id)) {
        continue;
      }

      let lineItems: InvoiceLineItem[] = [];
      let totalAmount = 0;

      if (config.charge_type === "FLAT_RATE") {
        totalAmount = Number(config.rate);
        lineItems = [
          {
            description: `${config.name} (Flat Rate)`,
            amount: totalAmount,
            category: "MAINTENANCE",
          },
        ];
      } else if (config.charge_type === "AREA_BASED") {
        const area = Number(unit.area_sqft || unit.carpet_area_sqft || 1000);
        totalAmount = Math.round(Number(config.rate) * area * 100) / 100;
        lineItems = [
          {
            description: `${config.name} (${area} sqft @ ₹${config.rate}/sqft)`,
            amount: totalAmount,
            category: "MAINTENANCE",
          },
        ];
      } else if (config.charge_type === "UNIT_TYPE_BASED") {
        const typeRates = (config.unit_type_rates as Record<string, number>) || {};
        totalAmount = Number(typeRates[unit.unit_type] ?? config.rate);
        lineItems = [
          {
            description: `${config.name} (${unit.unit_type} Tier)`,
            amount: totalAmount,
            category: "MAINTENANCE",
          },
        ];
      }

      const invNumber = await generateInvoiceNumber(params.societyId, cycle.period_start, seq++);

      invoicesToInsert.push({
        society_id: params.societyId,
        unit_id: unit.id,
        billing_cycle_id: cycle.id,
        charge_config_id: config.id,
        invoice_number: invNumber,
        invoice_date: new Date().toISOString().slice(0, 10),
        due_date: cycle.due_date,
        subtotal: totalAmount,
        adjustments: 0.0,
        total_amount: totalAmount,
        amount_paid: 0.0,
        balance_due: totalAmount,
        status: "UNPAID",
        line_items: lineItems,
        notes: `Generated for cycle: ${cycle.name}`,
      });
    }

    if (invoicesToInsert.length === 0) {
      return {
        success: true,
        generatedCount: 0,
        skippedCount: alreadyBilledUnitIds.size,
      };
    }

    // 6. Bulk Insert Invoices
    const { data: insertedInvoices, error: insertErr } = await adminClient
      .from("invoices")
      .insert(invoicesToInsert)
      .select();

    if (insertErr) {
      console.error("[InvoiceGenerator] Bulk insert failed:", insertErr);
      return {
        success: false,
        generatedCount: 0,
        skippedCount: alreadyBilledUnitIds.size,
        error: "Failed to create invoice records",
      };
    }

    // 7. Mark cycle as GENERATED
    await adminClient
      .from("billing_cycles")
      .update({ status: "GENERATED", updated_at: new Date().toISOString() })
      .eq("id", cycle.id);

    // 8. Log Audit Trail
    await recordAuditLog({
      actorUserId: params.actorUserId,
      effectiveUserId: params.effectiveUserId,
      societyId: params.societyId,
      action: "INVOICES_BULK_GENERATED",
      resourceType: "billing_cycle",
      resourceId: cycle.id,
      metadata: {
        cycle_name: cycle.name,
        charge_config_name: config.name,
        generated_count: invoicesToInsert.length,
        skipped_count: alreadyBilledUnitIds.size,
      },
    });

    return {
      success: true,
      generatedCount: invoicesToInsert.length,
      skippedCount: alreadyBilledUnitIds.size,
      invoices: insertedInvoices as Invoice[],
    };
  } catch (err: any) {
    console.error("[InvoiceGenerator] Exception:", err);
    return { success: false, generatedCount: 0, skippedCount: 0, error: err?.message || "Internal server error" };
  }
}
