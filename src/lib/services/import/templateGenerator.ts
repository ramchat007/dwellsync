import * as XLSX from "xlsx";
import { IMPORT_SCHEMAS } from "./columnDetector";
import { ImportType } from "./types";
import { sanitizeRecordForExport } from "./sanitizer";

/**
 * Sample rows for template generation.
 */
const SAMPLE_DATA: Record<ImportType, Record<string, any>[]> = {
  UNITS_STRUCTURE: [
    {
      building_name: "Tower A",
      wing_name: "Wing 1",
      floor_number: 1,
      unit_number: "A-101",
      unit_type: "2_BHK",
      area_sqft: 1050,
      monthly_maintenance: 3500,
      intercom_number: "101",
    },
    {
      building_name: "Tower A",
      wing_name: "Wing 1",
      floor_number: 1,
      unit_number: "A-102",
      unit_type: "3_BHK",
      area_sqft: 1450,
      monthly_maintenance: 4500,
      intercom_number: "102",
    },
    {
      building_name: "Tower B",
      wing_name: "Wing 2",
      floor_number: 2,
      unit_number: "B-201",
      unit_type: "2_BHK",
      area_sqft: 1100,
      monthly_maintenance: 3600,
      intercom_number: "201",
    },
  ],
  RESIDENTS_MEMBERS: [
    {
      full_name: "Rajesh Sharma",
      email: "rajesh.sharma@example.com",
      phone: "9876543210",
      role: "RESIDENT",
      unit_number: "A-101",
    },
    {
      full_name: "Pooja Verma",
      email: "pooja.verma@example.com",
      phone: "9823456789",
      role: "COMMITTEE_MEMBER",
      unit_number: "A-102",
    },
    {
      full_name: "Vikram Singh",
      email: "vikram.singh@example.com",
      phone: "9123456780",
      role: "RESIDENT",
      unit_number: "B-201",
    },
  ],
  OWNERSHIP_OCCUPANCY: [
    {
      unit_number: "A-101",
      owner_name: "Rajesh Sharma",
      owner_email: "rajesh.sharma@example.com",
      owner_phone: "9876543210",
      occupancy_type: "OWNER_OCCUPIED",
      tenant_name: "",
      tenant_email: "",
      tenant_phone: "",
      lease_start: "",
      lease_end: "",
    },
    {
      unit_number: "B-201",
      owner_name: "Sunita Patel",
      owner_email: "sunita.patel@example.com",
      owner_phone: "9988776655",
      occupancy_type: "TENANT_OCCUPIED",
      tenant_name: "Vikram Singh",
      tenant_email: "vikram.singh@example.com",
      tenant_phone: "9123456780",
      lease_start: "2026-01-01",
      lease_end: "2026-12-31",
    },
  ],
  MASTER_SOCIETY_DATA: [
    {
      building_name: "Tower A",
      wing_name: "Wing 1",
      floor_number: 1,
      unit_number: "A-101",
      unit_type: "2_BHK",
      area_sqft: 1050,
      monthly_maintenance: 3500,
      owner_name: "Rajesh Sharma",
      owner_email: "rajesh.sharma@example.com",
      owner_phone: "9876543210",
      occupancy_type: "OWNER_OCCUPIED",
    },
    {
      building_name: "Tower A",
      wing_name: "Wing 1",
      floor_number: 1,
      unit_number: "A-102",
      unit_type: "3_BHK",
      area_sqft: 1450,
      monthly_maintenance: 4500,
      owner_name: "Pooja Verma",
      owner_email: "pooja.verma@example.com",
      owner_phone: "9823456789",
      occupancy_type: "OWNER_OCCUPIED",
    },
  ],
};

/**
 * Generates a downloadable CSV string for the specified import type.
 */
export function generateTemplateCsv(importType: ImportType): string {
  const schema = IMPORT_SCHEMAS[importType];
  if (!schema) {
    throw new Error(`Unknown import type: ${importType}`);
  }

  const sampleRows = SAMPLE_DATA[importType] || [];
  const headers = schema.fields.map((f) => f.name);

  // Build rows array for SheetJS
  const wsData = [
    headers,
    ...sampleRows.map((row) =>
      headers.map((h) => {
        const val = row[h];
        return val !== undefined && val !== null ? val : "";
      })
    ),
  ];

  const ws = XLSX.utils.aoa_to_sheet(wsData);
  return XLSX.utils.sheet_to_csv(ws);
}

/**
 * Generates a downloadable XLSX buffer for the specified import type.
 */
export function generateTemplateXlsx(importType: ImportType): Buffer {
  const schema = IMPORT_SCHEMAS[importType];
  if (!schema) {
    throw new Error(`Unknown import type: ${importType}`);
  }

  const sampleRows = SAMPLE_DATA[importType] || [];
  const headers = schema.fields.map((f) => f.name);

  const wsData = [
    headers,
    ...sampleRows.map((row) =>
      headers.map((h) => {
        const val = row[h];
        return val !== undefined && val !== null ? val : "";
      })
    ),
  ];

  const ws = XLSX.utils.aoa_to_sheet(wsData);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Import Template");

  return XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer;
}

