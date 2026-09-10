import { Profile } from "./database";

export type DocumentCategory =
  | "SOCIETY_BYLAWS"
  | "AGM_MINUTES"
  | "FINANCIAL_REPORT"
  | "FORMS_TEMPLATES"
  | "RULES_REGULATIONS"
  | "STATUTORY_COMPLIANCE"
  | "ENGINEERING_MAINTENANCE"
  | "LEGAL_CONTRACTS"
  | "BUILDER_HANDOVER"
  | "NOTICES_CIRCULARS"
  | "RESIDENT_UNIT_DOCUMENTS"
  | "GENERAL";

export type DocumentVisibility =
  | "ALL_RESIDENTS"
  | "OWNERS_ONLY"
  | "COMMITTEE_ONLY"
  | "ADMIN_ONLY"
  | "ROLE_RESTRICTED";

export type DocumentStatus =
  | "DRAFT"
  | "UNDER_REVIEW"
  | "APPROVED"
  | "PUBLISHED"
  | "ARCHIVED";

export type DocumentEntityType =
  | "FINANCIAL_REPORT"
  | "EXPENSE_VOUCHER"
  | "INVOICE"
  | "PAYMENT"
  | "RECEIPT"
  | "BANK_RECONCILIATION"
  | "NOTICE"
  | "MEETING"
  | "HANDOVER_PROJECT"
  | "HANDOVER_DEFECT"
  | "HANDOVER_ASSET"
  | "HANDOVER_CONTRACT"
  | "COMPLAINT"
  | "UNIT"
  | "RESIDENT"
  | "GENERAL";

export interface DocumentFolder {
  id: string;
  society_id: string;
  name: string;
  description?: string | null;
  parent_id?: string | null;
  color?: string | null;
  icon?: string | null;
  created_by?: string | null;
  created_at: string;
  updated_at: string;
  parent?: DocumentFolder | null;
  document_count?: number;
}

export interface DocumentVersion {
  id: string;
  society_id: string;
  document_id: string;
  version_number: number;
  file_url: string;
  file_path?: string | null;
  file_name?: string | null;
  file_type?: string | null;
  file_size_kb?: number | null;
  change_summary?: string | null;
  uploaded_by: string;
  created_at: string;
  uploader?: Profile;
}

export interface DocumentEntityLink {
  id: string;
  society_id: string;
  document_id: string;
  entity_type: DocumentEntityType;
  entity_id: string;
  relationship_type?: string | null;
  notes?: string | null;
  linked_by: string;
  created_at: string;
  linker?: Profile;
}

export interface SocietyDocument {
  id: string;
  society_id: string;
  title: string;
  description?: string | null;
  category: DocumentCategory;
  subcategory?: string | null;
  folder_id?: string | null;
  tags: string[];
  metadata: Record<string, any>;
  status: DocumentStatus;
  visibility: DocumentVisibility;
  allowed_roles: string[];
  unit_id?: string | null;
  resident_id?: string | null;
  document_date?: string | null;
  effective_date?: string | null;
  expiry_date?: string | null;
  file_url: string;
  file_path?: string | null;
  file_type?: string | null;
  file_size_kb?: number | null;
  current_version: number;
  is_archived: boolean;
  archived_at?: string | null;
  archived_by?: string | null;
  approved_by?: string | null;
  approved_at?: string | null;
  published_by?: string | null;
  published_at?: string | null;
  publication_notes?: string | null;
  uploaded_by: string;
  created_at: string;
  updated_at: string;
  uploader?: Profile;
  folder?: DocumentFolder | null;
  versions?: DocumentVersion[];
  entity_links?: DocumentEntityLink[];
  approver?: Profile | null;
  publisher?: Profile | null;
}

export interface DocumentDashboardKPIs {
  totalDocuments: number;
  publishedDocuments: number;
  underReviewDocuments: number;
  draftDocuments: number;
  archivedDocuments: number;
  expiringWithin30Days: number;
  totalFolders: number;
}
