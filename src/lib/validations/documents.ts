import { z } from "zod";

export const DocumentCategoryEnum = z.enum([
  "SOCIETY_BYLAWS",
  "AGM_MINUTES",
  "FINANCIAL_REPORT",
  "FORMS_TEMPLATES",
  "RULES_REGULATIONS",
  "STATUTORY_COMPLIANCE",
  "ENGINEERING_MAINTENANCE",
  "LEGAL_CONTRACTS",
  "BUILDER_HANDOVER",
  "NOTICES_CIRCULARS",
  "RESIDENT_UNIT_DOCUMENTS",
  "GENERAL",
]);

export const DocumentVisibilityEnum = z.enum([
  "ALL_RESIDENTS",
  "OWNERS_ONLY",
  "COMMITTEE_ONLY",
  "ADMIN_ONLY",
  "ROLE_RESTRICTED",
]);

export const DocumentStatusEnum = z.enum([
  "DRAFT",
  "UNDER_REVIEW",
  "APPROVED",
  "PUBLISHED",
  "ARCHIVED",
]);

export const DocumentEntityTypeEnum = z.enum([
  "FINANCIAL_REPORT",
  "EXPENSE_VOUCHER",
  "INVOICE",
  "PAYMENT",
  "RECEIPT",
  "BANK_RECONCILIATION",
  "NOTICE",
  "MEETING",
  "HANDOVER_PROJECT",
  "HANDOVER_DEFECT",
  "HANDOVER_ASSET",
  "HANDOVER_CONTRACT",
  "COMPLAINT",
  "UNIT",
  "RESIDENT",
  "GENERAL",
]);

const dateRegex = /^\d{4}-\d{2}-\d{2}$/;

// Folder Schemas
export const CreateDocumentFolderSchema = z.object({
  name: z.string().trim().min(1, "Folder name is required.").max(100),
  description: z.string().max(500).optional().nullable(),
  parent_id: z.string().uuid("Invalid parent folder ID").optional().nullable().or(z.literal("")),
  color: z.string().max(30).optional().nullable(),
  icon: z.string().max(50).optional().nullable(),
});

export const UpdateDocumentFolderSchema = z.object({
  name: z.string().trim().min(1).max(100).optional(),
  description: z.string().max(500).optional().nullable(),
  parent_id: z.string().uuid().optional().nullable().or(z.literal("")),
  color: z.string().max(30).optional().nullable(),
  icon: z.string().max(50).optional().nullable(),
});

// Document Schemas
export const CreateCompleteDocumentSchema = z.object({
  title: z.string().trim().min(3, "Title must be at least 3 characters.").max(200),
  description: z.string().max(2000).optional().nullable().or(z.literal("")),
  category: DocumentCategoryEnum,
  subcategory: z.string().trim().max(100).optional().nullable().or(z.literal("")),
  folder_id: z.string().uuid("Invalid folder ID").optional().nullable().or(z.literal("")),
  tags: z.array(z.string().trim().max(50)).default([]),
  metadata: z.record(z.unknown()).default({}),
  status: DocumentStatusEnum.default("PUBLISHED"),
  visibility: DocumentVisibilityEnum.default("ALL_RESIDENTS"),
  allowed_roles: z.array(z.string()).default([]),
  unit_id: z.string().uuid("Invalid unit ID").optional().nullable().or(z.literal("")),
  resident_id: z.string().uuid("Invalid resident ID").optional().nullable().or(z.literal("")),
  document_date: z.string().regex(dateRegex, "Format must be YYYY-MM-DD").optional().nullable().or(z.literal("")),
  effective_date: z.string().regex(dateRegex, "Format must be YYYY-MM-DD").optional().nullable().or(z.literal("")),
  expiry_date: z.string().regex(dateRegex, "Format must be YYYY-MM-DD").optional().nullable().or(z.literal("")),
  file_url: z.string().min(1, "File URL or attachment reference is required"),
  file_path: z.string().optional().nullable(),
  file_type: z.string().max(50).optional().nullable(),
  file_size_kb: z.coerce.number().int().nonnegative().optional().nullable(),
  // Optional initial entity link
  entity_type: DocumentEntityTypeEnum.optional().nullable(),
  entity_id: z.string().uuid().optional().nullable().or(z.literal("")),
});

export const UpdateCompleteDocumentSchema = z.object({
  title: z.string().trim().min(3).max(200).optional(),
  description: z.string().max(2000).optional().nullable(),
  category: DocumentCategoryEnum.optional(),
  subcategory: z.string().trim().max(100).optional().nullable(),
  folder_id: z.string().uuid().optional().nullable().or(z.literal("")),
  tags: z.array(z.string().trim().max(50)).optional(),
  metadata: z.record(z.unknown()).optional(),
  visibility: DocumentVisibilityEnum.optional(),
  allowed_roles: z.array(z.string()).optional(),
  unit_id: z.string().uuid().optional().nullable().or(z.literal("")),
  resident_id: z.string().uuid().optional().nullable().or(z.literal("")),
  document_date: z.string().regex(dateRegex).optional().nullable().or(z.literal("")),
  effective_date: z.string().regex(dateRegex).optional().nullable().or(z.literal("")),
  expiry_date: z.string().regex(dateRegex).optional().nullable().or(z.literal("")),
});

// Version Schema
export const UploadDocumentVersionSchema = z.object({
  file_url: z.string().min(1, "File URL is required"),
  file_path: z.string().optional().nullable(),
  file_name: z.string().max(255).optional().nullable(),
  file_type: z.string().max(50).optional().nullable(),
  file_size_kb: z.coerce.number().int().nonnegative().optional().nullable(),
  change_summary: z.string().max(1000).optional().nullable(),
});

// Lifecycle Action Schema
export const DocumentLifecycleSchema = z.object({
  action: z.enum(["SUBMIT_REVIEW", "APPROVE", "PUBLISH", "ARCHIVE", "RESTORE"]),
  publication_notes: z.string().max(1000).optional().nullable(),
  broadcast_notification: z.boolean().default(false),
});

// Entity Link Schema
export const CreateDocumentEntityLinkSchema = z.object({
  entity_type: DocumentEntityTypeEnum,
  entity_id: z.string().uuid("Invalid entity ID"),
  relationship_type: z.string().max(50).default("ATTACHMENT"),
  notes: z.string().max(500).optional().nullable(),
});
