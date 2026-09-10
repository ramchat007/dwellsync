import { z } from "zod";

// ==========================================
// MAINTENANCE CHARGE CONFIGURATION SCHEMAS
// ==========================================

export const ChargeTypeEnum = z.enum([
  "FLAT_RATE",
  "CARPET_AREA",
  "BUILT_UP_AREA",
  "PER_UNIT",
  "PER_PARKING_SLOT",
  "PER_OCCUPANT",
  "PERCENTAGE",
  "USAGE_BASED",
  "CUSTOM",
  "AREA_BASED",
  "UNIT_TYPE_BASED",
]);

export const FrequencyEnum = z.enum([
  "MONTHLY",
  "QUARTERLY",
  "BIANNUAL",
  "ANNUAL",
  "ONE_TIME",
]);

export const LateFeeTypeEnum = z.enum(["NONE", "FLAT", "PERCENTAGE"]);

export const RateComponentSchema = z.object({
  name: z.string().min(2, "Component name required"),
  charge_type: ChargeTypeEnum,
  rate: z.coerce.number().min(0, "Rate must be non-negative"),
  description: z.string().optional(),
});

export const CreateMaintenanceConfigSchema = z.object({
  name: z.string().min(3, "Name must be at least 3 characters").max(100),
  description: z.string().max(500).optional().nullable(),
  charge_type: ChargeTypeEnum,
  rate: z.coerce.number().min(0, "Rate cannot be negative"),
  unit_type_rates: z.record(z.coerce.number()).optional().default({}),
  rate_components: z.array(RateComponentSchema).optional().default([]),
  late_fee_type: LateFeeTypeEnum.default("NONE"),
  late_fee_amount: z.coerce.number().min(0).default(0),
  grace_period_days: z.coerce.number().int().min(0).default(15),
  frequency: FrequencyEnum.default("MONTHLY"),
  effective_from: z.string().min(1, "Effective start date is required"),
  effective_to: z.string().optional().nullable(),
  parent_config_id: z.string().uuid().optional().nullable(),
});

export const UpdateMaintenanceConfigSchema = CreateMaintenanceConfigSchema.partial().extend({
  is_active: z.boolean().optional(),
});

// ==========================================
// BILLING CYCLE SCHEMAS
// ==========================================

export const BillingCycleStatusEnum = z.enum(["DRAFT", "GENERATED", "CLOSED", "CANCELLED"]);

export const CreateBillingCycleSchema = z.object({
  name: z.string().min(3, "Cycle name must be at least 3 characters").max(100),
  period_start: z.string().min(1, "Start date is required"),
  period_end: z.string().min(1, "End date is required"),
  due_date: z.string().min(1, "Due date is required"),
  charge_config_id: z.string().uuid("Invalid charge configuration ID").optional().nullable(),
  notes: z.string().max(500).optional().nullable(),
});

export const GenerateInvoicesSchema = z.object({
  billing_cycle_id: z.string().uuid("Invalid billing cycle ID"),
  charge_config_id: z.string().uuid("Invalid charge configuration ID"),
});

// ==========================================
// PAYMENT & RECEIPT SCHEMAS
// ==========================================

export const PaymentMethodEnum = z.enum([
  "CASH",
  "CHEQUE",
  "BANK_TRANSFER",
  "UPI",
  "CARD",
  "OTHER",
]);

export const RecordPaymentSchema = z.object({
  invoice_id: z.string().uuid("Invalid invoice ID"),
  amount: z.coerce.number().positive("Payment amount must be greater than zero"),
  payment_date: z.string().min(1, "Payment date is required"),
  payment_method: PaymentMethodEnum,
  reference_number: z.string().max(100).optional().nullable(),
  notes: z.string().max(500).optional().nullable(),
});

export const CancelInvoiceSchema = z.object({
  reason: z.string().min(3, "Cancellation reason must be at least 3 characters").max(500),
});
