import { createAdminClient } from "@/lib/supabase/admin";
import {
  MaintenanceConfiguration,
  RateComponent,
  Unit,
  UnitChargeOverride,
  InvoiceLineItem,
} from "@/lib/types/database";

export interface UnitCalculationResult {
  unitId: string;
  unitNumber: string;
  buildingName?: string;
  wingName?: string;
  unitType: string;
  areaSqft: number;
  carpetAreaSqft: number;
  builtUpAreaSqft: number;
  parkingSlots: number;
  occupantCount: number;
  baseAmount: number;
  componentBreakdown: { name: string; type: string; rate: number; calculatedAmount: number }[];
  overrideApplied?: {
    overrideType: string;
    amount: number;
    reason: string;
  } | null;
  lateFeeApplied?: {
    type: string;
    amount: number;
  } | null;
  adjustments: number;
  totalAmount: number;
  lineItems: InvoiceLineItem[];
}

export interface BillingPreviewResult {
  societyId: string;
  billingCycleId: string;
  billingCycleName: string;
  chargeConfigId: string;
  chargeConfigName: string;
  chargeConfigVersion: number;
  periodStart: string;
  periodEnd: string;
  dueDate: string;
  totalUnitsCount: number;
  eligibleUnitsCount: number;
  alreadyBilledCount: number;
  toBeBilledCount: number;
  totalEstimatedAmount: number;
  units: UnitCalculationResult[];
  discrepancies: string[];
}

/**
 * Calculates line items and amount for a single unit according to configuration rules and overrides.
 */
export function calculateUnitMaintenance(
  unit: Unit,
  config: MaintenanceConfiguration,
  occupantCount: number = 1,
  activeOverride?: UnitChargeOverride | null,
  hasOverdueLateFee: boolean = false
): UnitCalculationResult {
  const lineItems: InvoiceLineItem[] = [];
  const componentBreakdown: { name: string; type: string; rate: number; calculatedAmount: number }[] = [];

  const carpetArea = Number(unit.carpet_area_sqft || unit.area_sqft || 0);
  const builtUpArea = Number(unit.built_up_area_sqft || unit.area_sqft || carpetArea);
  const parkingSlots = Number(unit.parking_slots || 0);

  let calculatedBaseAmount = 0;

  // 1. Check if configuration defines multi-component rates
  const components: RateComponent[] = (config.rate_components && config.rate_components.length > 0)
    ? config.rate_components
    : [
        {
          name: config.name,
          charge_type: config.charge_type,
          rate: Number(config.rate || 0),
          description: config.description || undefined,
        },
      ];

  // 2. Evaluate each component
  for (const comp of components) {
    let compAmount = 0;
    let description = comp.name;

    switch (comp.charge_type) {
      case "FLAT_RATE":
      case "PER_UNIT":
        compAmount = Number(comp.rate);
        description = `${comp.name} (Fixed Flat Rate)`;
        break;

      case "CARPET_AREA":
      case "AREA_BASED": {
        const area = carpetArea > 0 ? carpetArea : 1000;
        compAmount = Math.round(Number(comp.rate) * area * 100) / 100;
        description = `${comp.name} (${area} sqft carpet @ ₹${comp.rate}/sqft)`;
        break;
      }

      case "BUILT_UP_AREA": {
        const area = builtUpArea > 0 ? builtUpArea : 1000;
        compAmount = Math.round(Number(comp.rate) * area * 100) / 100;
        description = `${comp.name} (${area} sqft built-up @ ₹${comp.rate}/sqft)`;
        break;
      }

      case "PER_PARKING_SLOT": {
        const slots = Math.max(0, parkingSlots);
        compAmount = Number(comp.rate) * slots;
        description = `${comp.name} (${slots} slot${slots !== 1 ? "s" : ""} @ ₹${comp.rate}/slot)`;
        break;
      }

      case "PER_OCCUPANT": {
        const occupants = Math.max(1, occupantCount);
        compAmount = Number(comp.rate) * occupants;
        description = `${comp.name} (${occupants} occupant${occupants !== 1 ? "s" : ""} @ ₹${comp.rate})`;
        break;
      }

      case "UNIT_TYPE_BASED": {
        const typeRates = (config.unit_type_rates as Record<string, number>) || {};
        compAmount = Number(typeRates[unit.unit_type] ?? comp.rate);
        description = `${comp.name} (${unit.unit_type} Tier)`;
        break;
      }

      case "PERCENTAGE": {
        // Percentage of base rate (or 1000 if not set)
        const base = Number(config.rate || 1000);
        compAmount = Math.round((base * (Number(comp.rate) / 100)) * 100) / 100;
        description = `${comp.name} (${comp.rate}% of ₹${base})`;
        break;
      }

      case "USAGE_BASED":
      case "CUSTOM":
      default:
        compAmount = Number(comp.rate);
        description = `${comp.name} (Custom Charge)`;
        break;
    }

    calculatedBaseAmount += compAmount;
    componentBreakdown.push({
      name: comp.name,
      type: comp.charge_type,
      rate: comp.rate,
      calculatedAmount: compAmount,
    });

    lineItems.push({
      description,
      amount: compAmount,
      category: "MAINTENANCE",
    });
  }

  let finalAmount = calculatedBaseAmount;
  let adjustments = 0;
  let overrideApplied: UnitCalculationResult["overrideApplied"] = null;

  // 3. Apply active flat/unit override if present
  if (activeOverride && activeOverride.is_active) {
    const overrideAmount = Number(activeOverride.amount || 0);

    switch (activeOverride.override_type) {
      case "FIXED_OVERRIDE":
        adjustments = overrideAmount - calculatedBaseAmount;
        finalAmount = overrideAmount;
        overrideApplied = {
          overrideType: "FIXED_OVERRIDE",
          amount: overrideAmount,
          reason: activeOverride.reason,
        };
        lineItems.push({
          description: `Flat Override Adjustment: ${activeOverride.reason}`,
          amount: Math.round(adjustments * 100) / 100,
          category: "ADJUSTMENT",
        });
        break;

      case "ADDITIONAL_SURCHARGE":
        adjustments += overrideAmount;
        finalAmount += overrideAmount;
        overrideApplied = {
          overrideType: "ADDITIONAL_SURCHARGE",
          amount: overrideAmount,
          reason: activeOverride.reason,
        };
        lineItems.push({
          description: `Surcharge: ${activeOverride.reason}`,
          amount: overrideAmount,
          category: "SURCHARGE",
        });
        break;

      case "DISCOUNT_FIXED":
        adjustments -= overrideAmount;
        finalAmount = Math.max(0, finalAmount - overrideAmount);
        overrideApplied = {
          overrideType: "DISCOUNT_FIXED",
          amount: overrideAmount,
          reason: activeOverride.reason,
        };
        lineItems.push({
          description: `Discount: ${activeOverride.reason}`,
          amount: -overrideAmount,
          category: "DISCOUNT",
        });
        break;

      case "DISCOUNT_PERCENTAGE": {
        const discountAmt = Math.round((finalAmount * (overrideAmount / 100)) * 100) / 100;
        adjustments -= discountAmt;
        finalAmount = Math.max(0, finalAmount - discountAmt);
        overrideApplied = {
          overrideType: "DISCOUNT_PERCENTAGE",
          amount: discountAmt,
          reason: activeOverride.reason,
        };
        lineItems.push({
          description: `Discount (${overrideAmount}%): ${activeOverride.reason}`,
          amount: -discountAmt,
          category: "DISCOUNT",
        });
        break;
      }

      case "EXEMPTION":
        adjustments = -calculatedBaseAmount;
        finalAmount = 0;
        overrideApplied = {
          overrideType: "EXEMPTION",
          amount: 0,
          reason: activeOverride.reason,
        };
        lineItems.push({
          description: `Full Exemption: ${activeOverride.reason}`,
          amount: -calculatedBaseAmount,
          category: "EXEMPTION",
        });
        break;
    }
  }

  // 4. Apply Late Fee if prior invoice was overdue
  let lateFeeApplied: UnitCalculationResult["lateFeeApplied"] = null;
  if (hasOverdueLateFee && config.late_fee_type && config.late_fee_type !== "NONE") {
    let fee = 0;
    if (config.late_fee_type === "FLAT") {
      fee = Number(config.late_fee_amount || 0);
    } else if (config.late_fee_type === "PERCENTAGE") {
      fee = Math.round((finalAmount * (Number(config.late_fee_amount || 0) / 100)) * 100) / 100;
    }

    if (fee > 0) {
      finalAmount += fee;
      adjustments += fee;
      lateFeeApplied = {
        type: config.late_fee_type,
        amount: fee,
      };
      lineItems.push({
        description: `Late Payment Surcharge (${config.late_fee_type === "PERCENTAGE" ? `${config.late_fee_amount}%` : `₹${fee}`})`,
        amount: fee,
        category: "LATE_FEE",
      });
    }
  }

  return {
    unitId: unit.id,
    unitNumber: unit.unit_number,
    buildingName: unit.building?.name,
    wingName: unit.wing?.name,
    unitType: unit.unit_type,
    areaSqft: Number(unit.area_sqft || 0),
    carpetAreaSqft: carpetArea,
    builtUpAreaSqft: builtUpArea,
    parkingSlots,
    occupantCount,
    baseAmount: Math.round(calculatedBaseAmount * 100) / 100,
    componentBreakdown,
    overrideApplied,
    lateFeeApplied,
    adjustments: Math.round(adjustments * 100) / 100,
    totalAmount: Math.round(finalAmount * 100) / 100,
    lineItems,
  };
}

/**
 * Preview calculation across all units for a billing cycle before generating invoices.
 */
export async function previewBillingCalculation(
  societyId: string,
  billingCycleId: string,
  chargeConfigId: string
): Promise<BillingPreviewResult> {
  const adminClient = createAdminClient();

  // 1. Fetch Cycle & Config
  const [
    { data: cycle, error: cycleErr },
    { data: config, error: configErr },
    { data: units = [] },
    { data: overrides = [] },
    { data: occupancies = [] },
    { data: existingInvoices = [] },
  ] = await Promise.all([
    adminClient.from("billing_cycles").select("*").eq("id", billingCycleId).eq("society_id", societyId).single(),
    adminClient.from("maintenance_configurations").select("*").eq("id", chargeConfigId).eq("society_id", societyId).single(),
    adminClient
      .from("units")
      .select("id, unit_number, unit_type, area_sqft, carpet_area_sqft, built_up_area_sqft, parking_slots, status, building:buildings(name), wing:wings(name)")
      .eq("society_id", societyId)
      .neq("status", "INACTIVE"),
    adminClient
      .from("unit_charge_overrides")
      .select("*")
      .eq("society_id", societyId)
      .eq("is_active", true),
    adminClient
      .from("unit_occupancies")
      .select("unit_id")
      .eq("society_id", societyId)
      .eq("status", "ACTIVE"),
    adminClient
      .from("invoices")
      .select("unit_id")
      .eq("billing_cycle_id", billingCycleId),
  ]);

  if (cycleErr || !cycle) {
    throw new Error("Billing cycle not found");
  }
  if (configErr || !config) {
    throw new Error("Maintenance configuration not found");
  }

  const alreadyBilledSet = new Set((existingInvoices || []).map((i: any) => i.unit_id));
  const overridesMap = new Map<string, UnitChargeOverride>();
  (overrides || []).forEach((ov: any) => {
    overridesMap.set(ov.unit_id, ov);
  });

  // Count occupants per unit
  const occupantCounts: Record<string, number> = {};
  (occupancies || []).forEach((occ: any) => {
    occupantCounts[occ.unit_id] = (occupantCounts[occ.unit_id] || 0) + 1;
  });

  const discrepancies: string[] = [];
  const calculationResults: UnitCalculationResult[] = [];
  let totalEstimated = 0;

  for (const rawUnit of units || []) {
    const unit = rawUnit as unknown as Unit;
    const isAlreadyBilled = alreadyBilledSet.has(unit.id);
    if (isAlreadyBilled) continue;

    const occupantCount = occupantCounts[unit.id] || 1;
    const activeOverride = overridesMap.get(unit.id) || null;

    // Check for missing area data if area-based
    if (
      (config.charge_type === "CARPET_AREA" || config.charge_type === "AREA_BASED") &&
      !unit.carpet_area_sqft &&
      !unit.area_sqft
    ) {
      discrepancies.push(`Unit ${unit.unit_number} is missing carpet area data; using default 1000 sqft.`);
    }

    const result = calculateUnitMaintenance(unit, config as MaintenanceConfiguration, occupantCount, activeOverride);
    calculationResults.push(result);
    totalEstimated += result.totalAmount;
  }

  return {
    societyId,
    billingCycleId: cycle.id,
    billingCycleName: cycle.name,
    chargeConfigId: config.id,
    chargeConfigName: config.name,
    chargeConfigVersion: config.version || 1,
    periodStart: cycle.period_start,
    periodEnd: cycle.period_end,
    dueDate: cycle.due_date,
    totalUnitsCount: (units || []).length,
    eligibleUnitsCount: (units || []).length,
    alreadyBilledCount: alreadyBilledSet.size,
    toBeBilledCount: calculationResults.length,
    totalEstimatedAmount: Math.round(totalEstimated * 100) / 100,
    units: calculationResults,
    discrepancies,
  };
}

