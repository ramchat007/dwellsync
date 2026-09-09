// DwellSync Phase 13: Builder Handover TypeScript Types

// ============================================================
// Enums / Literal Types
// ============================================================

export type HandoverProjectStatus =
  | "DRAFT"
  | "IN_PROGRESS"
  | "UNDER_REVIEW"
  | "READY_FOR_HANDOVER"
  | "HANDOVER_COMPLETED"
  | "CLOSED"
  | "CANCELLED";

export type HandoverChecklistCategory =
  | "LEGAL"
  | "STATUTORY"
  | "BUILDING"
  | "ELECTRICAL"
  | "PLUMBING"
  | "WATER"
  | "FIRE_SAFETY"
  | "LIFT"
  | "SECURITY"
  | "COMMON_AREAS"
  | "PARKING"
  | "LANDSCAPING"
  | "AMENITIES"
  | "METERS"
  | "ASSETS"
  | "VENDORS"
  | "AMC"
  | "DOCUMENTATION"
  | "DEFECTS"
  | "OTHER";

export type HandoverPriority = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export type HandoverChecklistStatus =
  | "PENDING"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "NOT_APPLICABLE"
  | "BLOCKED";

export type HandoverDefectCategory =
  | "STRUCTURAL"
  | "ELECTRICAL"
  | "PLUMBING"
  | "FINISHING"
  | "WATERPROOFING"
  | "TILING"
  | "PAINTING"
  | "CARPENTRY"
  | "SANITARY"
  | "COMMON_AREA"
  | "OTHER";

export type HandoverDefectSeverity = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export type HandoverDefectStatus =
  | "OPEN"
  | "ASSIGNED"
  | "IN_PROGRESS"
  | "PENDING_BUILDER"
  | "RESOLVED"
  | "VERIFIED"
  | "CLOSED";

export type HandoverCommitmentCategory =
  | "CIVIL"
  | "ELECTRICAL"
  | "PLUMBING"
  | "LANDSCAPING"
  | "AMENITY"
  | "DOCUMENTATION"
  | "STATUTORY"
  | "INFRASTRUCTURE"
  | "OTHER";

export type HandoverCommitmentStatus =
  | "PENDING"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "OVERDUE"
  | "DISPUTED"
  | "WAIVED";

export type HandoverVerificationStatus = "UNVERIFIED" | "VERIFIED" | "REJECTED";

export type HandoverStatutoryStatus =
  | "PENDING"
  | "RECEIVED"
  | "VERIFIED"
  | "EXPIRED"
  | "NOT_APPLICABLE";

export type HandoverAssetCategory =
  | "PUMP"
  | "DG_SET"
  | "TRANSFORMER"
  | "LIFT"
  | "FIRE_EQUIPMENT"
  | "CCTV"
  | "ACCESS_CONTROL"
  | "GYM_EQUIPMENT"
  | "CLUBHOUSE_EQUIPMENT"
  | "GARDEN_EQUIPMENT"
  | "ELECTRICAL_INFRA"
  | "WATER_INFRA"
  | "SOLAR_PANEL"
  | "INTERCOM"
  | "OTHER";

export type HandoverAssetCondition =
  | "EXCELLENT"
  | "GOOD"
  | "FAIR"
  | "POOR"
  | "DEFECTIVE";

export type HandoverAssetStatus =
  | "PENDING"
  | "INSPECTED"
  | "ACCEPTED"
  | "REJECTED"
  | "UNDER_REPAIR";

export type HandoverAmcContractType =
  | "AMC"
  | "WARRANTY"
  | "SERVICE_CONTRACT"
  | "VENDOR_CONTRACT"
  | "OTHER";

export type HandoverAmcStatus =
  | "ACTIVE"
  | "EXPIRED"
  | "TRANSFERRED"
  | "CANCELLED"
  | "RENEWAL_DUE";

export type HandoverMeterType =
  | "ELECTRICITY_MAIN"
  | "ELECTRICITY_DG"
  | "WATER_MAIN"
  | "WATER_STP"
  | "GAS"
  | "SOLAR"
  | "LIFT_ELECTRICITY"
  | "OTHER";

export type HandoverDocumentEntityType =
  | "PROJECT"
  | "CHECKLIST_ITEM"
  | "DEFECT"
  | "COMMITMENT"
  | "STATUTORY"
  | "ASSET"
  | "AMC_WARRANTY"
  | "METER"
  | "GENERAL";

// ============================================================
// Interfaces
// ============================================================

export interface HandoverProject {
  id: string;
  society_id: string;
  title: string;
  description?: string | null;
  builder_name: string;
  builder_contact_name?: string | null;
  builder_contact_email?: string | null;
  builder_contact_phone?: string | null;
  handover_start_date?: string | null;
  target_handover_date?: string | null;
  actual_handover_date?: string | null;
  status: HandoverProjectStatus;
  overall_progress: number;
  created_by: string;
  updated_by?: string | null;
  created_at: string;
  updated_at: string;
  // Optional join fields
  creator?: { id: string; full_name: string | null; display_name: string | null };
  updater?: { id: string; full_name: string | null; display_name: string | null };
  // Aggregates (populated by summary queries)
  total_checklist?: number;
  completed_checklist?: number;
  open_defects?: number;
  critical_defects?: number;
  pending_commitments?: number;
}

export interface HandoverChecklistItem {
  id: string;
  society_id: string;
  handover_project_id: string;
  category: HandoverChecklistCategory;
  title: string;
  description?: string | null;
  priority: HandoverPriority;
  status: HandoverChecklistStatus;
  responsible_person?: string | null;
  builder_responsibility: boolean;
  society_responsibility: boolean;
  due_date?: string | null;
  completed_date?: string | null;
  notes?: string | null;
  evidence_urls: string[];
  created_by: string;
  updated_by?: string | null;
  created_at: string;
  updated_at: string;
}

export interface HandoverDefect {
  id: string;
  society_id: string;
  handover_project_id: string;
  location_description?: string | null;
  building_id?: string | null;
  unit_id?: string | null;
  category: HandoverDefectCategory;
  title: string;
  description: string;
  severity: HandoverDefectSeverity;
  reported_date: string;
  builder_responsibility: boolean;
  assigned_to?: string | null;
  target_resolution_date?: string | null;
  status: HandoverDefectStatus;
  resolution_notes?: string | null;
  evidence_urls: string[];
  resolved_date?: string | null;
  verified_by?: string | null;
  verified_at?: string | null;
  created_by: string;
  updated_by?: string | null;
  created_at: string;
  updated_at: string;
  // Join fields
  assignee?: { id: string; full_name: string | null; display_name: string | null } | null;
  verifier?: { id: string; full_name: string | null; display_name: string | null } | null;
}

export interface HandoverCommitment {
  id: string;
  society_id: string;
  handover_project_id: string;
  title: string;
  description?: string | null;
  category: HandoverCommitmentCategory;
  builder_name?: string | null;
  responsible_person?: string | null;
  target_date?: string | null;
  priority: HandoverPriority;
  status: HandoverCommitmentStatus;
  notes?: string | null;
  evidence_urls: string[];
  completion_date?: string | null;
  verification_status: HandoverVerificationStatus;
  verified_by?: string | null;
  verified_at?: string | null;
  created_by: string;
  updated_by?: string | null;
  created_at: string;
  updated_at: string;
  verifier?: { id: string; full_name: string | null; display_name: string | null } | null;
}

export interface HandoverStatutoryRecord {
  id: string;
  society_id: string;
  handover_project_id: string;
  document_type: string;
  document_number?: string | null;
  issuing_authority?: string | null;
  issue_date?: string | null;
  expiry_date?: string | null;
  status: HandoverStatutoryStatus;
  document_url?: string | null;
  notes?: string | null;
  created_by: string;
  updated_by?: string | null;
  created_at: string;
  updated_at: string;
}

export interface HandoverAsset {
  id: string;
  society_id: string;
  handover_project_id: string;
  asset_name: string;
  category: HandoverAssetCategory;
  location_description?: string | null;
  building_id?: string | null;
  manufacturer?: string | null;
  model?: string | null;
  serial_number?: string | null;
  installation_date?: string | null;
  warranty_start?: string | null;
  warranty_end?: string | null;
  current_condition: HandoverAssetCondition;
  handover_status: HandoverAssetStatus;
  builder_vendor?: string | null;
  document_urls: string[];
  notes?: string | null;
  created_by: string;
  updated_by?: string | null;
  created_at: string;
  updated_at: string;
}

export interface HandoverAmcWarranty {
  id: string;
  society_id: string;
  handover_project_id: string;
  handover_asset_id?: string | null;
  title: string;
  contract_type: HandoverAmcContractType;
  vendor_name?: string | null;
  contact_person?: string | null;
  contact_phone?: string | null;
  contact_email?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  renewal_date?: string | null;
  contract_document_url?: string | null;
  status: HandoverAmcStatus;
  notes?: string | null;
  created_by: string;
  updated_by?: string | null;
  created_at: string;
  updated_at: string;
}

export interface HandoverMeter {
  id: string;
  society_id: string;
  handover_project_id: string;
  meter_type: HandoverMeterType;
  meter_number?: string | null;
  location_description?: string | null;
  building_id?: string | null;
  unit_id?: string | null;
  handover_reading?: number | null;
  reading_date?: string | null;
  unit_of_measurement?: string | null;
  notes?: string | null;
  evidence_urls: string[];
  created_by: string;
  updated_by?: string | null;
  created_at: string;
  updated_at: string;
}

export interface HandoverDocumentLink {
  id: string;
  society_id: string;
  handover_project_id: string;
  document_id: string;
  entity_type: HandoverDocumentEntityType;
  entity_id?: string | null;
  notes?: string | null;
  linked_by: string;
  created_at: string;
  document?: {
    id: string;
    title: string;
    file_url: string;
    file_type?: string | null;
    category: string;
  };
}

export interface HandoverMeetingLink {
  id: string;
  society_id: string;
  handover_project_id: string;
  meeting_id: string;
  notes?: string | null;
  linked_by: string;
  created_at: string;
  meeting?: {
    id: string;
    title: string;
    scheduled_at: string;
    status: string;
    meeting_type: string;
  };
}

// ============================================================
// Dashboard KPI Summary
// ============================================================

export interface HandoverProjectSummary {
  projectId: string;
  totalChecklistItems: number;
  completedChecklistItems: number;
  overdueChecklistItems: number;
  openDefects: number;
  criticalDefects: number;
  pendingCommitments: number;
  overdueCommitments: number;
  pendingDocuments: number;
  expiringAmcs: number;
  totalAssets: number;
  acceptedAssets: number;
  overallProgress: number;
}
