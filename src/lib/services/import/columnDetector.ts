import {
  CanonicalFieldDefinition,
  DetectedMapping,
  ImportType,
  ImportTypeSchema,
} from "./types";

export const IMPORT_SCHEMAS: Record<ImportType, ImportTypeSchema> = {
  UNITS_STRUCTURE: {
    type: "UNITS_STRUCTURE",
    label: "Units & Building Structure",
    description: "Import buildings, wings, floors, and residential/commercial units.",
    fields: [
      {
        name: "building_name",
        label: "Building / Tower Name",
        required: true,
        description: "Name or designation of the building/tower (e.g. 'Tower A', 'Wing 1').",
        aliases: ["building", "tower", "block", "building name", "bldg", "tower name", "structure"],
        example: "Tower A",
        type: "string",
      },
      {
        name: "wing_name",
        label: "Wing / Section",
        required: false,
        description: "Wing or section within the building if applicable (e.g. 'Wing A', 'East Wing').",
        aliases: ["wing", "section", "wing name", "wing code", "block name"],
        example: "East Wing",
        type: "string",
      },
      {
        name: "floor_number",
        label: "Floor Number",
        required: false,
        description: "Floor number on which unit is located (e.g. 1, 2, 10).",
        aliases: ["floor", "level", "floor no", "floor number", "storey", "flr"],
        example: "4",
        type: "number",
      },
      {
        name: "unit_number",
        label: "Unit / Flat Number",
        required: true,
        description: "Unique flat, unit, or apartment number within the society.",
        aliases: ["unit", "flat", "flat no", "unit no", "apartment", "apt no", "flat number", "door no", "unit_number", "flat_no"],
        example: "A-402",
        type: "string",
      },
      {
        name: "unit_type",
        label: "Unit Configuration / Type",
        required: false,
        description: "Configuration of the unit (1_BHK, 2_BHK, 3_BHK, 4_BHK, PENTHOUSE, SHOP, OFFICE, OTHER).",
        aliases: ["type", "configuration", "bhk", "unit type", "flat type", "config"],
        example: "2_BHK",
        type: "enum",
        enumValues: ["1_BHK", "2_BHK", "3_BHK", "4_BHK", "PENTHOUSE", "SHOP", "OFFICE", "PARKING", "OTHER"],
      },
      {
        name: "area_sqft",
        label: "Area (Sq. Ft.)",
        required: false,
        description: "Total or super built-up area in square feet.",
        aliases: ["area", "sqft", "area sqft", "super builtup area", "carpet area", "size", "built up area"],
        example: "1150",
        type: "number",
      },
      {
        name: "monthly_maintenance",
        label: "Monthly Maintenance Amount",
        required: false,
        description: "Fixed monthly maintenance override for this unit if applicable.",
        aliases: ["maintenance", "monthly maintenance", "maintenance fee", "maintenance amount", "charges"],
        example: "3500",
        type: "number",
      },
      {
        name: "intercom_number",
        label: "Intercom / Extension",
        required: false,
        description: "Internal intercom or telephone extension number.",
        aliases: ["intercom", "intercom no", "extension", "intercom extension", "phone extension"],
        example: "402",
        type: "string",
      },
    ],
  },

  RESIDENTS_MEMBERS: {
    type: "RESIDENTS_MEMBERS",
    label: "Residents & Members Directory",
    description: "Import resident profiles and society memberships.",
    fields: [
      {
        name: "full_name",
        label: "Full Name",
        required: true,
        description: "Full legal or preferred name of the resident/member.",
        aliases: ["name", "full name", "resident name", "member name", "resident", "person name", "contact name"],
        example: "Rajesh Sharma",
        type: "string",
      },
      {
        name: "email",
        label: "Email Address",
        required: true,
        description: "Valid email address for login, notices, and notifications.",
        aliases: ["email", "email address", "mail", "contact email", "e-mail"],
        example: "rajesh.sharma@example.com",
        type: "email",
      },
      {
        name: "phone",
        label: "Mobile / Phone Number",
        required: true,
        description: "Primary mobile contact number.",
        aliases: ["phone", "mobile", "contact", "contact number", "mobile number", "phone number", "cell", "cell phone"],
        example: "9876543210",
        type: "phone",
      },
      {
        name: "role",
        label: "Society Role",
        required: false,
        description: "Membership role (RESIDENT, OWNER, TENANT, COMMITTEE_MEMBER, MANAGER, STAFF, etc.). Default: RESIDENT.",
        aliases: ["role", "member role", "designation", "user type", "membership", "role_id"],
        example: "RESIDENT",
        type: "enum",
        enumValues: ["RESIDENT", "OWNER", "TENANT", "COMMITTEE_MEMBER", "MANAGER", "STAFF"],
      },
      {
        name: "unit_number",
        label: "Unit / Flat Number",
        required: false,
        description: "Unit number the member resides in or owns.",
        aliases: ["unit", "flat", "flat no", "unit no", "apartment", "unit_number", "flat_no"],
        example: "A-402",
        type: "string",
      },
    ],
  },

  OWNERSHIP_OCCUPANCY: {
    type: "OWNERSHIP_OCCUPANCY",
    label: "Ownership & Occupancy",
    description: "Map owners, tenants, and occupancy records to society units.",
    fields: [
      {
        name: "unit_number",
        label: "Unit / Flat Number",
        required: true,
        description: "Target flat or unit number.",
        aliases: ["unit", "flat", "flat no", "unit no", "apartment", "unit_number", "flat_no"],
        example: "A-402",
        type: "string",
      },
      {
        name: "owner_name",
        label: "Owner Full Name",
        required: true,
        description: "Primary owner's full name.",
        aliases: ["owner", "owner name", "landlord", "proprietor", "owner full name"],
        example: "Sunita Patel",
        type: "string",
      },
      {
        name: "owner_email",
        label: "Owner Email",
        required: true,
        description: "Owner email address for communications and ownership verification.",
        aliases: ["owner email", "owner's email", "landlord email", "email"],
        example: "sunita.patel@example.com",
        type: "email",
      },
      {
        name: "owner_phone",
        label: "Owner Mobile",
        required: false,
        description: "Owner contact phone number.",
        aliases: ["owner phone", "owner mobile", "landlord phone", "phone", "mobile"],
        example: "9823456789",
        type: "phone",
      },
      {
        name: "occupancy_type",
        label: "Occupancy Type",
        required: false,
        description: "OWNER_OCCUPIED, TENANT_OCCUPIED, or FAMILY_OCCUPIED.",
        aliases: ["occupancy", "occupancy type", "status", "living status", "occupied by"],
        example: "OWNER_OCCUPIED",
        type: "enum",
        enumValues: ["OWNER_OCCUPIED", "TENANT_OCCUPIED", "FAMILY_OCCUPIED"],
      },
      {
        name: "tenant_name",
        label: "Tenant Name (if rented)",
        required: false,
        description: "Full name of the active tenant if rented.",
        aliases: ["tenant", "tenant name", "occupant", "occupant name", "renter"],
        example: "Amit Kumar",
        type: "string",
      },
      {
        name: "tenant_email",
        label: "Tenant Email (if rented)",
        required: false,
        description: "Tenant email address.",
        aliases: ["tenant email", "occupant email", "renter email"],
        example: "amit.kumar@example.com",
        type: "email",
      },
      {
        name: "tenant_phone",
        label: "Tenant Phone (if rented)",
        required: false,
        description: "Tenant mobile contact number.",
        aliases: ["tenant phone", "tenant mobile", "occupant phone"],
        example: "9123456780",
        type: "phone",
      },
      {
        name: "lease_start",
        label: "Lease / Agreement Start",
        required: false,
        description: "Lease commencement date (YYYY-MM-DD).",
        aliases: ["lease start", "agreement start", "possession date", "start date"],
        example: "2026-01-01",
        type: "date",
      },
      {
        name: "lease_end",
        label: "Lease / Agreement End",
        required: false,
        description: "Lease expiration date (YYYY-MM-DD).",
        aliases: ["lease end", "agreement end", "end date"],
        example: "2026-12-31",
        type: "date",
      },
    ],
  },

  MASTER_SOCIETY_DATA: {
    type: "MASTER_SOCIETY_DATA",
    label: "Master Society Onboarding",
    description: "All-in-one spreadsheet combining building, wing, floor, unit, owner, and resident info.",
    fields: [
      {
        name: "building_name",
        label: "Building / Tower",
        required: true,
        description: "Building name or block.",
        aliases: ["building", "tower", "block", "building name", "bldg"],
        example: "Tower A",
        type: "string",
      },
      {
        name: "wing_name",
        label: "Wing",
        required: false,
        description: "Wing or section.",
        aliases: ["wing", "section", "wing name"],
        example: "Wing 1",
        type: "string",
      },
      {
        name: "floor_number",
        label: "Floor",
        required: false,
        description: "Floor number.",
        aliases: ["floor", "level", "floor no"],
        example: "2",
        type: "number",
      },
      {
        name: "unit_number",
        label: "Unit / Flat No",
        required: true,
        description: "Flat or unit number.",
        aliases: ["unit", "flat", "flat no", "unit no", "apartment", "door no"],
        example: "A-201",
        type: "string",
      },
      {
        name: "unit_type",
        label: "Configuration",
        required: false,
        description: "Configuration (e.g. 2_BHK, 3_BHK).",
        aliases: ["type", "configuration", "bhk", "unit type"],
        example: "2_BHK",
        type: "enum",
        enumValues: ["1_BHK", "2_BHK", "3_BHK", "4_BHK", "PENTHOUSE", "SHOP", "OFFICE", "PARKING", "OTHER"],
      },
      {
        name: "area_sqft",
        label: "Area Sqft",
        required: false,
        description: "Unit area in sq. ft.",
        aliases: ["area", "sqft", "area sqft", "size"],
        example: "1200",
        type: "number",
      },
      {
        name: "monthly_maintenance",
        label: "Maintenance Override",
        required: false,
        description: "Monthly maintenance charge override.",
        aliases: ["maintenance", "monthly maintenance", "maintenance fee"],
        example: "4000",
        type: "number",
      },
      {
        name: "owner_name",
        label: "Owner Name",
        required: true,
        description: "Owner full name.",
        aliases: ["owner", "owner name", "landlord", "member name"],
        example: "Priya Sharma",
        type: "string",
      },
      {
        name: "owner_email",
        label: "Owner Email",
        required: true,
        description: "Owner email address.",
        aliases: ["owner email", "owner's email", "email", "contact email"],
        example: "priya.sharma@example.com",
        type: "email",
      },
      {
        name: "owner_phone",
        label: "Owner Mobile",
        required: true,
        description: "Owner mobile number.",
        aliases: ["owner phone", "owner mobile", "phone", "mobile", "contact"],
        example: "9876543210",
        type: "phone",
      },
      {
        name: "occupancy_type",
        label: "Occupancy Type",
        required: false,
        description: "OWNER_OCCUPIED, TENANT_OCCUPIED, etc.",
        aliases: ["occupancy", "occupancy type", "living status"],
        example: "OWNER_OCCUPIED",
        type: "enum",
        enumValues: ["OWNER_OCCUPIED", "TENANT_OCCUPIED", "FAMILY_OCCUPIED"],
      },
    ],
  },
};

/**
 * Normalizes a header string for fuzzy alias matching.
 */
function cleanHeaderString(header: string): string {
  return header
    .toLowerCase()
    .replace(/[_\-\.]+/g, " ")
    .replace(/[^a-z0-9 ]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Automatically detects column mappings for a given import type from a list of spreadsheet headers.
 */
export function detectColumnMappings(
  importType: ImportType,
  spreadsheetHeaders: string[]
): DetectedMapping[] {
  const schema = IMPORT_SCHEMAS[importType];
  if (!schema) {
    throw new Error(`Unknown import type: ${importType}`);
  }

  const cleanedHeaders = spreadsheetHeaders.map((header) => ({
    original: header,
    cleaned: cleanHeaderString(header),
  }));

  const results: DetectedMapping[] = [];
  const assignedHeaders = new Set<string>();

  for (const field of schema.fields) {
    let bestMatch: string | null = null;
    let highestConfidence = 0;

    const candidateAliases = [
      field.name.toLowerCase(),
      field.label.toLowerCase(),
      ...field.aliases.map((a) => a.toLowerCase()),
    ].map(cleanHeaderString);

    for (const { original, cleaned } of cleanedHeaders) {
      if (assignedHeaders.has(original)) continue;

      // 1. Exact match on field name or label
      if (
        cleaned === cleanHeaderString(field.name) ||
        cleaned === cleanHeaderString(field.label)
      ) {
        if (highestConfidence < 1.0) {
          highestConfidence = 1.0;
          bestMatch = original;
        }
        continue;
      }

      // 2. Exact match on one of the aliases
      if (candidateAliases.includes(cleaned)) {
        if (highestConfidence < 0.9) {
          highestConfidence = 0.9;
          bestMatch = original;
        }
        continue;
      }

      // 3. Substring match
      for (const alias of candidateAliases) {
        if (cleaned.includes(alias) || alias.includes(cleaned)) {
          const confidence = 0.75;
          if (highestConfidence < confidence) {
            highestConfidence = confidence;
            bestMatch = original;
          }
        }
      }
    }

    if (bestMatch && highestConfidence >= 0.7) {
      assignedHeaders.add(bestMatch);
      results.push({
        canonicalField: field.name,
        spreadsheetColumn: bestMatch,
        confidence: highestConfidence,
        required: field.required,
      });
    } else {
      results.push({
        canonicalField: field.name,
        spreadsheetColumn: null,
        confidence: 0,
        required: field.required,
      });
    }
  }

  return results;
}

