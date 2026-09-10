import { z } from "zod";

export const AssetCategoryEnum = z.enum([
  "ELECTRICAL",
  "PLUMBING",
  "HVAC_LIFTS",
  "FIRE_SAFETY",
  "SECURITY_SURVEILLANCE",
  "DG_POWER",
  "CIVIL_INFRASTRUCTURE",
  "COMMON_AREA_FURNITURE",
  "CLUBHOUSE_GYM",
  "GARDENING_LANDSCAPING",
  "OFFICE_IT",
  "OTHER",
]);

export const AssetStatusEnum = z.enum([
  "ACTIVE",
  "UNDER_MAINTENANCE",
  "DAMAGED",
  "DISPOSED",
  "LOST",
]);

export const AssetConditionEnum = z.enum([
  "EXCELLENT",
  "GOOD",
  "FAIR",
  "POOR",
  "SCRAP",
]);

export const MaintenanceTypeEnum = z.enum([
  "PREVENTIVE",
  "BREAKDOWN",
  "INSPECTION",
  "AMC_SERVICE",
  "STATUTORY_INSPECTION",
  "OVERHAUL",
  "OTHER",
]);

export const MaintenanceStatusEnum = z.enum([
  "SCHEDULED",
  "IN_PROGRESS",
  "COMPLETED",
  "CANCELLED",
]);

export const CreateAssetSchema = z.object({
  asset_code: z.string().trim().max(50).optional(),
  name: z.string().trim().min(2, "Asset name must be at least 2 characters").max(255),
  description: z.string().trim().max(1000).optional().nullable(),
  category: AssetCategoryEnum,
  subcategory: z.string().trim().max(100).optional().nullable(),
  building_id: z.string().uuid("Invalid building ID").optional().nullable().or(z.literal("")),
  wing_id: z.string().uuid("Invalid wing ID").optional().nullable().or(z.literal("")),
  location_description: z.string().trim().max(255).optional().nullable(),
  purchase_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format (YYYY-MM-DD)").optional().nullable().or(z.literal("")),
  purchase_cost: z.number().min(0, "Purchase cost cannot be negative").default(0),
  vendor_name: z.string().trim().max(255).optional().nullable(),
  vendor_id: z.string().uuid().optional().nullable().or(z.literal("")),
  expense_voucher_id: z.string().uuid().optional().nullable().or(z.literal("")),
  status: AssetStatusEnum.default("ACTIVE"),
  condition: AssetConditionEnum.default("GOOD"),
  assigned_to: z.string().uuid().optional().nullable().or(z.literal("")),
  department: z.string().trim().max(100).optional().nullable(),
  manufacturer: z.string().trim().max(100).optional().nullable(),
  model_number: z.string().trim().max(100).optional().nullable(),
  serial_number: z.string().trim().max(100).optional().nullable(),
  warranty_provider: z.string().trim().max(255).optional().nullable(),
  warranty_start: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format").optional().nullable().or(z.literal("")),
  warranty_end: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format").optional().nullable().or(z.literal("")),
  warranty_terms: z.string().max(1000).optional().nullable(),
  amc_vendor: z.string().trim().max(255).optional().nullable(),
  amc_start: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format").optional().nullable().or(z.literal("")),
  amc_end: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format").optional().nullable().or(z.literal("")),
  amc_cost: z.number().min(0).default(0),
  amc_terms: z.string().max(1000).optional().nullable(),
  expected_life_years: z.number().min(0).max(100).optional().nullable(),
  photos: z.array(z.string().url("Invalid photo URL")).default([]),
  notes: z.string().max(2000).optional().nullable(),
  handover_asset_id: z.string().uuid().optional().nullable().or(z.literal("")),
});

export const UpdateAssetSchema = CreateAssetSchema.partial();

export const DisposeAssetSchema = z.object({
  disposal_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format (YYYY-MM-DD)"),
  disposal_reason: z.string().trim().min(5, "Please provide a detailed disposal reason").max(500),
  disposal_value: z.number().min(0, "Disposal value cannot be negative").default(0),
  disposed_to: z.string().trim().max(255).optional().nullable(),
  status: z.enum(["DISPOSED", "LOST"]).default("DISPOSED"),
  notes: z.string().max(1000).optional().nullable(),
});

export const ImportHandoverAssetSchema = z.object({
  handover_asset_id: z.string().uuid("Invalid handover asset ID"),
  asset_code: z.string().trim().max(50).optional(),
  category: AssetCategoryEnum.optional(),
  subcategory: z.string().trim().max(100).optional().nullable(),
  location_description: z.string().trim().max(255).optional().nullable(),
  building_id: z.string().uuid().optional().nullable().or(z.literal("")),
  wing_id: z.string().uuid().optional().nullable().or(z.literal("")),
  purchase_cost: z.number().min(0).default(0),
  notes: z.string().max(1000).optional().nullable(),
});

export const CreateMaintenanceRecordSchema = z.object({
  title: z.string().trim().min(2, "Title must be at least 2 characters").max(255),
  maintenance_type: MaintenanceTypeEnum.default("PREVENTIVE"),
  status: MaintenanceStatusEnum.default("COMPLETED"),
  service_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid service date (YYYY-MM-DD)"),
  completion_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid completion date").optional().nullable().or(z.literal("")),
  work_description: z.string().trim().min(5, "Work description must be at least 5 characters").max(2000),
  vendor_name: z.string().trim().max(255).optional().nullable(),
  technician_name: z.string().trim().max(255).optional().nullable(),
  technician_contact: z.string().trim().max(50).optional().nullable(),
  cost: z.number().min(0, "Cost cannot be negative").default(0),
  is_covered_under_warranty: z.boolean().default(false),
  is_covered_under_amc: z.boolean().default(false),
  amc_reference: z.string().trim().max(100).optional().nullable(),
  expense_voucher_id: z.string().uuid().optional().nullable().or(z.literal("")),
  next_service_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid next service date").optional().nullable().or(z.literal("")),
  notes: z.string().max(1000).optional().nullable(),
  attachments: z.array(z.string().url()).default([]),
});

export const UpdateMaintenanceRecordSchema = CreateMaintenanceRecordSchema.partial();
