import { RoleId, UnitType, OwnershipType, OccupancyType } from "@/lib/types/database";

export type ImportType =
  | "UNITS_STRUCTURE"
  | "RESIDENTS_MEMBERS"
  | "OWNERSHIP_OCCUPANCY"
  | "MASTER_SOCIETY_DATA";

export type ImportFileFormat = "csv" | "xlsx";

export type ImportJobStatus =
  | "PENDING"
  | "VALIDATING"
  | "VALIDATED"
  | "IMPORTING"
  | "COMPLETED"
  | "FAILED"
  | "ROLLED_BACK";

export interface ImportJob {
  id: string;
  society_id: string;
  import_type: ImportType;
  file_name: string;
  file_size_bytes: number;
  file_format: ImportFileFormat;
  status: ImportJobStatus;
  total_rows: number;
  valid_rows: number;
  invalid_rows: number;
  created_rows: number;
  updated_rows: number;
  skipped_rows: number;
  is_dry_run: boolean;
  column_mapping: Record<string, string>;
  summary: Record<string, any>;
  error_report: ImportErrorDetail[];
  created_by?: string | null;
  created_at: string;
  updated_at: string;
}

export interface ImportErrorDetail {
  row_number: number;
  field?: string;
  value?: any;
  error_code: string;
  message: string;
}

export interface CanonicalFieldDefinition {
  name: string;
  label: string;
  required: boolean;
  description: string;
  aliases: string[];
  example: string;
  type: "string" | "number" | "email" | "phone" | "date" | "enum";
  enumValues?: string[];
}

export interface ImportTypeSchema {
  type: ImportType;
  label: string;
  description: string;
  fields: CanonicalFieldDefinition[];
}

export interface ParsedSpreadsheet {
  fileName: string;
  fileFormat: ImportFileFormat;
  fileSizeBytes: number;
  headers: string[];
  rows: Record<string, any>[];
  totalRows: number;
}

export interface DetectedMapping {
  canonicalField: string;
  spreadsheetColumn: string | null;
  confidence: number;
  required: boolean;
}

export interface ValidationSummary {
  total_rows: number;
  valid_rows: number;
  invalid_rows: number;
  duplicate_rows: number;
  creates_count: number;
  updates_count: number;
  skips_count: number;
  quota_limit: number | null;
  current_usage: number;
  projected_usage: number;
  exceeds_quota: boolean;
  errors: ImportErrorDetail[];
  preview_rows: Array<{
    row_number: number;
    action: "CREATE" | "UPDATE" | "SKIP" | "ERROR";
    data: Record<string, any>;
    errors?: string[];
  }>;
}

export interface ImportCommitResult {
  jobId: string;
  societyId: string;
  status: "COMPLETED" | "FAILED";
  total_rows: number;
  created_rows: number;
  updated_rows: number;
  skipped_rows: number;
  invalid_rows: number;
  error_count: number;
  error_report: ImportErrorDetail[];
  duration_ms: number;
}

