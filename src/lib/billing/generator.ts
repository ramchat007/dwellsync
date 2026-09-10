import { createAdminClient } from "@/lib/supabase/admin";
import { recordAuditLog } from "@/lib/auth/audit";
import { Invoice, MaintenanceConfiguration, Unit, UnitChargeOverride } from "@/lib/types/database";
import { calculateUnitMaintenance } from "./calculationEngine";
import { createJournalEntry, seedDefaultChartOfAccounts } from "@/lib/services/financeService";

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
 * and automatically posts balancing double-entry transactions to the General Ledger.
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

    // 3. Fetch all active units, overrides, and occupant statistics
    const [
      { data: units, error: unitsErr },
      { data: overrides = [] },
      { data: occupancies = [] },
    ] = await Promise.all([
      adminClient
        .from("units")
        .select("id, unit_number, unit_type, area_sqft, carpet_area_sqft, built_up_area_sqft, parking_slots, status")
        .eq("society_id", params.societyId)
        .neq("status", "INACTIVE"),
      adminClient
        .from("unit_charge_overrides")
        .select("*")
        .eq("society_id", params.societyId)
        .eq("is_active", true),
      adminClient
        .from("unit_occupancies")
        .select("unit_id")
        .eq("society_id", params.societyId)
        .eq("status", "ACTIVE"),
    ]);

    if (unitsErr || !units || units.length === 0) {
      return { success: false, generatedCount: 0, skippedCount: 0, error: "No units found in this society to bill" };
    }

    const overridesMap = new Map<string, UnitChargeOverride>();
    (overrides || []).forEach((ov: any) => overridesMap.set(ov.unit_id, ov));

    const occupantCounts: Record<string, number> = {};
    (occupancies || []).forEach((occ: any) => {
      occupantCounts[occ.unit_id] = (occupantCounts[occ.unit_id] || 0) + 1;
    });

    // 4. Fetch already existing invoices for this cycle (Idempotency enforcement)
    const { data: existingInvoices, error: existErr } = await adminClient
      .from("invoices")
      .select("unit_id")
      .eq("billing_cycle_id", cycle.id);

    if (existErr) {
      console.error("[InvoiceGenerator] Error checking existing invoices:", existErr);
    }

    const alreadyBilledUnitIds = new Set((existingInvoices || []).map((i) => i.unit_id));

    // 5. Build invoice rows for units not yet billed using calculationEngine
    const invoicesToInsert: any[] = [];
    let seq = 1;
    let totalBilledSum = 0;

    for (const rawUnit of units) {
      if (alreadyBilledUnitIds.has(rawUnit.id)) {
        continue;
      }

      const unit = rawUnit as unknown as Unit;
      const activeOverride = overridesMap.get(unit.id) || null;
      const occCount = occupantCounts[unit.id] || 1;

      const calc = calculateUnitMaintenance(unit, config as MaintenanceConfiguration, occCount, activeOverride);
      const invNumber = await generateInvoiceNumber(params.societyId, cycle.period_start, seq++);

      invoicesToInsert.push({
        society_id: params.societyId,
        unit_id: unit.id,
        billing_cycle_id: cycle.id,
        charge_config_id: config.id,
        invoice_number: invNumber,
        invoice_date: new Date().toISOString().slice(0, 10),
        due_date: cycle.due_date,
        subtotal: calc.baseAmount,
        adjustments: calc.adjustments,
        total_amount: calc.totalAmount,
        amount_paid: 0.0,
        balance_due: calc.totalAmount,
        status: "UNPAID",
        line_items: calc.lineItems,
        notes: `Generated for cycle: ${cycle.name} (Config v${config.version || 1})`,
      });

      totalBilledSum += calc.totalAmount;
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

    // 8. Auto-post balancing double-entry journal voucher to Accounting General Ledger:
    // Debit: 1110 Accounts Receivable - Maintenance Dues
    // Credit: 4010 Maintenance Charges Income
    try {
      const accounts = await seedDefaultChartOfAccounts(params.societyId, params.actorUserId);
      const arAccount = accounts.find((a) => a.account_code === "1110") || accounts[0];
      const incomeAccount = accounts.find((a) => a.account_code === "4010") || accounts[1];

      if (arAccount && incomeAccount && totalBilledSum > 0) {
        const roundedSum = Math.round(totalBilledSum * 100) / 100;
        await createJournalEntry(
          params.societyId,
          {
            entry_date: new Date().toISOString().slice(0, 10),
            entry_type: "INVOICE_BILLING",
            narration: `Maintenance Billing Cycle ${cycle.name}: ${invoicesToInsert.length} invoices generated`,
            source_reference_type: "BILLING_CYCLE",
            source_reference_id: cycle.id,
            lines: [
              {
                account_id: arAccount.id,
                debit_amount: roundedSum,
                credit_amount: 0,
                description: `Maintenance dues receivable for cycle ${cycle.name}`,
              },
              {
                account_id: incomeAccount.id,
                debit_amount: 0,
                credit_amount: roundedSum,
                description: `Maintenance income recognized for cycle ${cycle.name}`,
              },
            ],
          },
          params.actorUserId
        );
      }
    } catch (acctErr) {
      console.warn("[InvoiceGenerator] Accounting post-hook warning:", acctErr);
    }

    // 9. Log Audit Trail
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
        total_amount: Math.round(totalBilledSum * 100) / 100,
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
