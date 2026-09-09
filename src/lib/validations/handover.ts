import { z } from "zod";

// ============================================================
// Enum schemas
// ============================================================

export const HandoverProjectStatusEnum = z.enum([
  "DRAFT",
  "IN_PROGRESS",
  "UNDER_REVIEW",
  "READY_FOR_HANDOVER",
  "HANDOVER_COMPLETED",
  "CLOSED",
  "CANCELLED",
]);

export const HandoverPriorityEnum = z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]);

export const HandoverChecklistCategoryEnum = z.enum([
  "LEGAL",
  "STATUTORY",
  "BUILDING",
  "ELECTRICAL",
  "PLUMBING",
  "WATER",
  "FIRE_SAFETY",
  "LIFT",
  "SECURITY",
  "COMMON_AREAS",
  "PARKING",
  "LANDSCAPING",
  "AMENITIES",
  "METERS",
  "ASSETS",
  "VENDORS",
  "AMC",
  "DOCUMENTATION",
  "DEFECTS",
  "OTHER",
]);

export const HandoverChecklistStatusEnum = z.enum([
  "PENDING",
  "IN_PROGRESS",
  "COMPLETED",
  "NOT_APPLICABLE",
  "BLOCKED",
]);

export const HandoverDefectCategoryEnum = z.enum([
  "STRUCTURAL",
  "ELECTRICAL",
  "PLUMBING",
  "FINISHING",
  "WATERPROOFING",
  "TILING",
  "PAINTING",
  "CARPENTRY",
  "SANITARY",
  "COMMON_AREA",
  "OTHER",
]);

export const HandoverDefectSeverityEnum = z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]);

export const HandoverDefectStatusEnum = z.enum([
  "OPEN",
  "ASSIGNED",
  "IN_PROGRESS",
  "PENDING_BUILDER",
  "RESOLVED",
  "VERIFIED",
  "CLOSED",
]);

export const HandoverCommitmentCategoryEnum = z.enum([
  "CIVIL",
  "ELECTRICAL",
  "PLUMBING",
  "LANDSCAPING",
  "AMENITY",
  "DOCUMENTATION",
  "STATUTORY",
  "INFRASTRUCTURE",
  "OTHER",
]);

export const HandoverCommitmentStatusEnum = z.enum([
  "PENDING",
  "IN_PROGRESS",
  "COMPLETED",
  "OVERDUE",
  "DISPUTED",
  "WAIVED",
]);

export const HandoverVerificationStatusEnum = z.enum([
  "UNVERIFIED",
  "VERIFIED",
  "REJECTED",
]);

export const HandoverStatutoryStatusEnum = z.enum([
  "PENDING",
  "RECEIVED",
  "VERIFIED",
  "EXPIRED",
  "NOT_APPLICABLE",
]);

export const HandoverAssetCategoryEnum = z.enum([
  "PUMP",
  "DG_SET",
  "TRANSFORMER",
  "LIFT",
  "FIRE_EQUIPMENT",
  "CCTV",
  "ACCESS_CONTROL",
  "GYM_EQUIPMENT",
  "CLUBHOUSE_EQUIPMENT",
  "GARDEN_EQUIPMENT",
  "ELECTRICAL_INFRA",
  "WATER_INFRA",
  "SOLAR_PANEL",
  "INTERCOM",
  "OTHER",
]);

export const HandoverAssetConditionEnum = z.enum([
  "EXCELLENT",
  "GOOD",
  "FAIR",
  "POOR",
  "DEFECTIVE",
]);

export const HandoverAssetStatusEnum = z.enum([
  "PENDING",
  "INSPECTED",
  "ACCEPTED",
  "REJECTED",
  "UNDER_REPAIR",
]);

export const HandoverAmcContractTypeEnum = z.enum([
  "AMC",
  "WARRANTY",
  "SERVICE_CONTRACT",
  "VENDOR_CONTRACT",
  "OTHER",
]);

export const HandoverAmcStatusEnum = z.enum([
  "ACTIVE",
  "EXPIRED",
  "TRANSFERRED",
  "CANCELLED",
  "RENEWAL_DUE",
]);

export const HandoverMeterTypeEnum = z.enum([
  "ELECTRICITY_MAIN",
  "ELECTRICITY_DG",
  "WATER_MAIN",
  "WATER_STP",
  "GAS",
  "SOLAR",
  "LIFT_ELECTRICITY",
  "OTHER",
]);

export const HandoverDocumentEntityTypeEnum = z.enum([
  "PROJECT",
  "CHECKLIST_ITEM",
  "DEFECT",
  "COMMITMENT",
  "STATUTORY",
  "ASSET",
  "AMC_WARRANTY",
  "METER",
  "GENERAL",
]);

const dateRegex = /^\d{4}-\d{2}-\d{2}$/;

// ============================================================
// Project Schemas
// ============================================================

export const CreateHandoverProjectSchema = z.object({
  title: z.string().trim().min(3, "Title must be at least 3 characters.").max(200),
  description: z.string().max(2000).optional().nullable(),
  builder_name: z.string().trim().min(1, "Builder name is required.").max(200),
  builder_contact_name: z.string().max(150).optional().nullable(),
  builder_contact_email: z.string().email().optional().nullable().or(z.literal("")),
  builder_contact_phone: z.string().max(20).optional().nullable(),
  handover_start_date: z.string().regex(dateRegex, "Format: YYYY-MM-DD").optional().nullable(),
  target_handover_date: z.string().regex(dateRegex, "Format: YYYY-MM-DD").optional().nullable(),
});

export const UpdateHandoverProjectSchema = z.object({
  title: z.string().trim().min(3).max(200).optional(),
  description: z.string().max(2000).optional().nullable(),
  builder_name: z.string().trim().min(1).max(200).optional(),
  builder_contact_name: z.string().max(150).optional().nullable(),
  builder_contact_email: z.string().email().optional().nullable().or(z.literal("")),
  builder_contact_phone: z.string().max(20).optional().nullable(),
  handover_start_date: z.string().regex(dateRegex).optional().nullable(),
  target_handover_date: z.string().regex(dateRegex).optional().nullable(),
  actual_handover_date: z.string().regex(dateRegex).optional().nullable(),
  status: HandoverProjectStatusEnum.optional(),
  overall_progress: z.coerce.number().int().min(0).max(100).optional(),
});

// ============================================================
// Checklist Schemas
// ============================================================

export const CreateChecklistItemSchema = z.object({
  category: HandoverChecklistCategoryEnum,
  title: z.string().trim().min(3, "Title must be at least 3 characters.").max(255),
  description: z.string().max(2000).optional().nullable(),
  priority: HandoverPriorityEnum.default("MEDIUM"),
  responsible_person: z.string().max(150).optional().nullable(),
  builder_responsibility: z.boolean().default(false),
  society_responsibility: z.boolean().default(true),
  due_date: z.string().regex(dateRegex, "Format: YYYY-MM-DD").optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
  evidence_urls: z.array(z.string().url()).default([]),
});

export const UpdateChecklistItemSchema = z.object({
  category: HandoverChecklistCategoryEnum.optional(),
  title: z.string().trim().min(3).max(255).optional(),
  description: z.string().max(2000).optional().nullable(),
  priority: HandoverPriorityEnum.optional(),
  status: HandoverChecklistStatusEnum.optional(),
  responsible_person: z.string().max(150).optional().nullable(),
  builder_responsibility: z.boolean().optional(),
  society_responsibility: z.boolean().optional(),
  due_date: z.string().regex(dateRegex).optional().nullable(),
  completed_date: z.string().regex(dateRegex).optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
  evidence_urls: z.array(z.string().url()).optional(),
});

// ============================================================
// Defect Schemas
// ============================================================

export const CreateDefectSchema = z.object({
  category: HandoverDefectCategoryEnum,
  title: z.string().trim().min(3, "Title must be at least 3 characters.").max(255),
  description: z.string().trim().min(5, "Description must be at least 5 characters.").max(3000),
  severity: HandoverDefectSeverityEnum.default("MEDIUM"),
  location_description: z.string().max(500).optional().nullable(),
  building_id: z.string().uuid("Invalid building UUID").optional().nullable(),
  unit_id: z.string().uuid("Invalid unit UUID").optional().nullable(),
  builder_responsibility: z.boolean().default(true),
  assigned_to: z.string().uuid("Invalid user UUID").optional().nullable(),
  target_resolution_date: z.string().regex(dateRegex, "Format: YYYY-MM-DD").optional().nullable(),
  reported_date: z.string().regex(dateRegex).optional(),
  evidence_urls: z.array(z.string().url()).default([]),
});

export const UpdateDefectSchema = z.object({
  category: HandoverDefectCategoryEnum.optional(),
  title: z.string().trim().min(3).max(255).optional(),
  description: z.string().trim().min(5).max(3000).optional(),
  severity: HandoverDefectSeverityEnum.optional(),
  location_description: z.string().max(500).optional().nullable(),
  building_id: z.string().uuid().optional().nullable(),
  unit_id: z.string().uuid().optional().nullable(),
  builder_responsibility: z.boolean().optional(),
  assigned_to: z.string().uuid().optional().nullable(),
  target_resolution_date: z.string().regex(dateRegex).optional().nullable(),
  status: HandoverDefectStatusEnum.optional(),
  resolution_notes: z.string().max(3000).optional().nullable(),
  resolved_date: z.string().regex(dateRegex).optional().nullable(),
  evidence_urls: z.array(z.string().url()).optional(),
});

// ============================================================
// Commitment Schemas
// ============================================================

export const CreateCommitmentSchema = z.object({
  title: z.string().trim().min(3, "Title must be at least 3 characters.").max(255),
  description: z.string().max(2000).optional().nullable(),
  category: HandoverCommitmentCategoryEnum.default("OTHER"),
  builder_name: z.string().max(200).optional().nullable(),
  responsible_person: z.string().max(150).optional().nullable(),
  target_date: z.string().regex(dateRegex, "Format: YYYY-MM-DD").optional().nullable(),
  priority: HandoverPriorityEnum.default("MEDIUM"),
  notes: z.string().max(2000).optional().nullable(),
  evidence_urls: z.array(z.string().url()).default([]),
});

export const UpdateCommitmentSchema = z.object({
  title: z.string().trim().min(3).max(255).optional(),
  description: z.string().max(2000).optional().nullable(),
  category: HandoverCommitmentCategoryEnum.optional(),
  builder_name: z.string().max(200).optional().nullable(),
  responsible_person: z.string().max(150).optional().nullable(),
  target_date: z.string().regex(dateRegex).optional().nullable(),
  priority: HandoverPriorityEnum.optional(),
  status: HandoverCommitmentStatusEnum.optional(),
  notes: z.string().max(2000).optional().nullable(),
  evidence_urls: z.array(z.string().url()).optional(),
  completion_date: z.string().regex(dateRegex).optional().nullable(),
  verification_status: HandoverVerificationStatusEnum.optional(),
});

// ============================================================
// Statutory Record Schemas
// ============================================================

export const CreateStatutoryRecordSchema = z.object({
  document_type: z.string().trim().min(2, "Document type is required.").max(150),
  document_number: z.string().max(100).optional().nullable(),
  issuing_authority: z.string().max(200).optional().nullable(),
  issue_date: z.string().regex(dateRegex, "Format: YYYY-MM-DD").optional().nullable(),
  expiry_date: z.string().regex(dateRegex, "Format: YYYY-MM-DD").optional().nullable(),
  status: HandoverStatutoryStatusEnum.default("PENDING"),
  document_url: z.string().url().optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
});

export const UpdateStatutoryRecordSchema = z.object({
  document_type: z.string().trim().min(2).max(150).optional(),
  document_number: z.string().max(100).optional().nullable(),
  issuing_authority: z.string().max(200).optional().nullable(),
  issue_date: z.string().regex(dateRegex).optional().nullable(),
  expiry_date: z.string().regex(dateRegex).optional().nullable(),
  status: HandoverStatutoryStatusEnum.optional(),
  document_url: z.string().url().optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
});

// ============================================================
// Asset Schemas
// ============================================================

export const CreateAssetSchema = z.object({
  asset_name: z.string().trim().min(2, "Asset name is required.").max(255),
  category: HandoverAssetCategoryEnum,
  location_description: z.string().max(500).optional().nullable(),
  building_id: z.string().uuid("Invalid building UUID").optional().nullable(),
  manufacturer: z.string().max(200).optional().nullable(),
  model: z.string().max(200).optional().nullable(),
  serial_number: z.string().max(100).optional().nullable(),
  installation_date: z.string().regex(dateRegex, "Format: YYYY-MM-DD").optional().nullable(),
  warranty_start: z.string().regex(dateRegex, "Format: YYYY-MM-DD").optional().nullable(),
  warranty_end: z.string().regex(dateRegex, "Format: YYYY-MM-DD").optional().nullable(),
  current_condition: HandoverAssetConditionEnum.default("GOOD"),
  handover_status: HandoverAssetStatusEnum.default("PENDING"),
  builder_vendor: z.string().max(200).optional().nullable(),
  document_urls: z.array(z.string().url()).default([]),
  notes: z.string().max(2000).optional().nullable(),
});

export const UpdateAssetSchema = z.object({
  asset_name: z.string().trim().min(2).max(255).optional(),
  category: HandoverAssetCategoryEnum.optional(),
  location_description: z.string().max(500).optional().nullable(),
  manufacturer: z.string().max(200).optional().nullable(),
  model: z.string().max(200).optional().nullable(),
  serial_number: z.string().max(100).optional().nullable(),
  installation_date: z.string().regex(dateRegex).optional().nullable(),
  warranty_start: z.string().regex(dateRegex).optional().nullable(),
  warranty_end: z.string().regex(dateRegex).optional().nullable(),
  current_condition: HandoverAssetConditionEnum.optional(),
  handover_status: HandoverAssetStatusEnum.optional(),
  builder_vendor: z.string().max(200).optional().nullable(),
  document_urls: z.array(z.string().url()).optional(),
  notes: z.string().max(2000).optional().nullable(),
});

// ============================================================
// AMC / Warranty Schemas
// ============================================================

export const CreateAmcWarrantySchema = z.object({
  title: z.string().trim().min(2, "Title is required.").max(255),
  contract_type: HandoverAmcContractTypeEnum.default("AMC"),
  handover_asset_id: z.string().uuid("Invalid asset UUID").optional().nullable(),
  vendor_name: z.string().max(200).optional().nullable(),
  contact_person: z.string().max(150).optional().nullable(),
  contact_phone: z.string().max(20).optional().nullable(),
  contact_email: z.string().email().optional().nullable().or(z.literal("")),
  start_date: z.string().regex(dateRegex, "Format: YYYY-MM-DD").optional().nullable(),
  end_date: z.string().regex(dateRegex, "Format: YYYY-MM-DD").optional().nullable(),
  renewal_date: z.string().regex(dateRegex, "Format: YYYY-MM-DD").optional().nullable(),
  contract_document_url: z.string().url().optional().nullable(),
  status: HandoverAmcStatusEnum.default("ACTIVE"),
  notes: z.string().max(2000).optional().nullable(),
});

export const UpdateAmcWarrantySchema = z.object({
  title: z.string().trim().min(2).max(255).optional(),
  contract_type: HandoverAmcContractTypeEnum.optional(),
  vendor_name: z.string().max(200).optional().nullable(),
  contact_person: z.string().max(150).optional().nullable(),
  contact_phone: z.string().max(20).optional().nullable(),
  contact_email: z.string().email().optional().nullable().or(z.literal("")),
  start_date: z.string().regex(dateRegex).optional().nullable(),
  end_date: z.string().regex(dateRegex).optional().nullable(),
  renewal_date: z.string().regex(dateRegex).optional().nullable(),
  contract_document_url: z.string().url().optional().nullable(),
  status: HandoverAmcStatusEnum.optional(),
  notes: z.string().max(2000).optional().nullable(),
});

// ============================================================
// Meter Schemas
// ============================================================

export const CreateMeterSchema = z.object({
  meter_type: HandoverMeterTypeEnum,
  meter_number: z.string().max(100).optional().nullable(),
  location_description: z.string().max(500).optional().nullable(),
  building_id: z.string().uuid("Invalid building UUID").optional().nullable(),
  unit_id: z.string().uuid("Invalid unit UUID").optional().nullable(),
  handover_reading: z.coerce.number().optional().nullable(),
  reading_date: z.string().regex(dateRegex, "Format: YYYY-MM-DD").optional().nullable(),
  unit_of_measurement: z.string().max(30).optional().nullable(),
  notes: z.string().max(1000).optional().nullable(),
  evidence_urls: z.array(z.string().url()).default([]),
});

// ============================================================
// Document Link Schemas
// ============================================================

export const CreateDocumentLinkSchema = z.object({
  document_id: z.string().uuid("Invalid document UUID"),
  entity_type: HandoverDocumentEntityTypeEnum.default("GENERAL"),
  entity_id: z.string().uuid().optional().nullable(),
  notes: z.string().max(500).optional().nullable(),
});

// ============================================================
// Meeting Link Schemas
// ============================================================

export const CreateMeetingLinkSchema = z.object({
  meeting_id: z.string().uuid("Invalid meeting UUID"),
  notes: z.string().max(500).optional().nullable(),
});

// ============================================================
// Handover Acceptance Schema
// ============================================================

export const HandoverAcceptanceSchema = z.object({
  actual_handover_date: z.string().regex(dateRegex, "Actual handover date is required."),
  notes: z.string().max(3000).optional().nullable(),
  // acknowledgement: explicitly require caller to acknowledge outstanding items
  acknowledge_outstanding: z.boolean().refine((v) => v === true, {
    message: "You must acknowledge that outstanding items have been reviewed.",
  }),
});
