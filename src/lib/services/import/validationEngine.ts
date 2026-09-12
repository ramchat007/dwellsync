import { createAdminClient } from "@/lib/supabase/admin";
import { getFeatureLimit, getUsage } from "@/lib/services/entitlementService";
import { IMPORT_SCHEMAS } from "./columnDetector";
import {
  escapeCsvFormula,
  normalizeEmail,
  normalizePhone,
  normalizeText,
  normalizeUnitNumber,
} from "./sanitizer";
import {
  ImportErrorDetail,
  ImportType,
  ValidationSummary,
} from "./types";

export interface ValidateImportOptions {
  societyId: string;
  importType: ImportType;
  rows: Record<string, any>[];
  columnMapping: Record<string, string>; // canonicalField -> spreadsheetColumnName
}

/**
 * Executes multi-tenant dry-run validation against database state and subscription quotas.
 * Does NOT write any mutations to the database.
 */
export async function validateImportData({
  societyId,
  importType,
  rows,
  columnMapping,
}: ValidateImportOptions): Promise<ValidationSummary> {
  const schema = IMPORT_SCHEMAS[importType];
  if (!schema) {
    throw new Error(`Unknown import type: ${importType}`);
  }

  const adminClient = createAdminClient();
  const errors: ImportErrorDetail[] = [];
  const previewRows: ValidationSummary["preview_rows"] = [];

  // Check subscription entitlement quotas for units / residents
  let quotaFeature: "units" | "residents" | null = null;
  if (importType === "UNITS_STRUCTURE" || importType === "MASTER_SOCIETY_DATA") {
    quotaFeature = "units";
  } else if (importType === "RESIDENTS_MEMBERS") {
    quotaFeature = "residents";
  }

  let quotaLimit: number | null = null;
  let currentUsage = 0;
  if (quotaFeature) {
    quotaLimit = await getFeatureLimit(societyId, quotaFeature);
    currentUsage = await getUsage(societyId, quotaFeature);
  }

  // Load existing society entities for duplicate & merge detection
  let existingUnitNumbers = new Set<string>();
  let existingEmails = new Set<string>();

  if (importType === "UNITS_STRUCTURE" || importType === "MASTER_SOCIETY_DATA" || importType === "OWNERSHIP_OCCUPANCY") {
    const { data: dbUnits } = await adminClient
      .from("units")
      .select("unit_number")
      .eq("society_id", societyId);
    if (dbUnits) {
      existingUnitNumbers = new Set(dbUnits.map((u) => u.unit_number.toUpperCase()));
    }
  }

  if (importType === "RESIDENTS_MEMBERS" || importType === "MASTER_SOCIETY_DATA") {
    const { data: dbMembers } = await adminClient
      .from("society_memberships")
      .select("user:profiles(email)")
      .eq("society_id", societyId);
    if (dbMembers) {
      for (const m of dbMembers) {
        const email = (m as any)?.user?.email;
        if (email) existingEmails.add(email.toLowerCase());
      }
    }
  }

  // Track intra-file uniqueness
  const fileSeenUnits = new Set<string>();
  const fileSeenEmails = new Set<string>();

  let validRowsCount = 0;
  let invalidRowsCount = 0;
  let duplicateRowsCount = 0;
  let createsCount = 0;
  let updatesCount = 0;
  let skipsCount = 0;

  for (let i = 0; i < rows.length; i++) {
    const rowNumber = i + 2; // Row 1 is header, data starts at row 2
    const rawRow = rows[i];
    const rowErrors: string[] = [];
    const mappedData: Record<string, any> = {};

    // 1. Extract and normalize fields based on mapping
    for (const field of schema.fields) {
      const colName = columnMapping[field.name];
      const rawVal = colName ? rawRow[colName] : undefined;
      const cleanText = normalizeText(rawVal);

      // Check required
      if (field.required && (!cleanText || cleanText.length === 0)) {
        const errMsg = `Missing required column value for '${field.label}'`;
        rowErrors.push(errMsg);
        errors.push({
          row_number: rowNumber,
          field: field.name,
          value: rawVal,
          error_code: "REQUIRED_FIELD_MISSING",
          message: errMsg,
        });
        continue;
      }

      if (!cleanText) {
        mappedData[field.name] = null;
        continue;
      }

      // Format-specific validations
      if (field.type === "email") {
        const validEmail = normalizeEmail(cleanText);
        if (!validEmail) {
          const errMsg = `Invalid email format: '${cleanText}'`;
          rowErrors.push(errMsg);
          errors.push({
            row_number: rowNumber,
            field: field.name,
            value: cleanText,
            error_code: "INVALID_EMAIL",
            message: errMsg,
          });
        } else {
          mappedData[field.name] = validEmail;
        }
      } else if (field.type === "phone") {
        const validPhone = normalizePhone(cleanText);
        if (!validPhone) {
          const errMsg = `Invalid phone number: '${cleanText}'. Must be a valid phone/mobile number.`;
          rowErrors.push(errMsg);
          errors.push({
            row_number: rowNumber,
            field: field.name,
            value: cleanText,
            error_code: "INVALID_PHONE",
            message: errMsg,
          });
        } else {
          mappedData[field.name] = validPhone;
        }
      } else if (field.type === "number") {
        const num = Number(cleanText.replace(/,/g, ""));
        if (isNaN(num)) {
          const errMsg = `'${field.label}' must be a valid number, received: '${cleanText}'`;
          rowErrors.push(errMsg);
          errors.push({
            row_number: rowNumber,
            field: field.name,
            value: cleanText,
            error_code: "INVALID_NUMBER",
            message: errMsg,
          });
        } else {
          mappedData[field.name] = num;
        }
      } else if (field.type === "enum" && field.enumValues) {
        const upper = cleanText.toUpperCase().replace(/\s+/g, "_");
        if (!field.enumValues.includes(upper)) {
          // If not in standard enum, try to default or warn
          if (field.name === "unit_type") {
            mappedData[field.name] = "OTHER";
          } else if (field.name === "role") {
            mappedData[field.name] = "RESIDENT";
          } else if (field.name === "occupancy_type") {
            mappedData[field.name] = "OWNER_OCCUPIED";
          } else {
            const errMsg = `Invalid choice for '${field.label}'. Expected one of: ${field.enumValues.join(", ")}`;
            rowErrors.push(errMsg);
            errors.push({
              row_number: rowNumber,
              field: field.name,
              value: cleanText,
              error_code: "INVALID_ENUM",
              message: errMsg,
            });
          }
        } else {
          mappedData[field.name] = upper;
        }
      } else {
        if (field.name === "unit_number") {
          mappedData[field.name] = normalizeUnitNumber(cleanText);
        } else {
          mappedData[field.name] = cleanText;
        }
      }
    }

    // 2. Intra-file duplicate detection
    const unitNo = mappedData["unit_number"] ? String(mappedData["unit_number"]).toUpperCase() : null;
    const email = mappedData["email"] || mappedData["owner_email"];

    if (unitNo && (importType === "UNITS_STRUCTURE" || importType === "MASTER_SOCIETY_DATA")) {
      if (fileSeenUnits.has(unitNo)) {
        const errMsg = `Duplicate unit number '${unitNo}' found multiple times in this file.`;
        rowErrors.push(errMsg);
        errors.push({
          row_number: rowNumber,
          field: "unit_number",
          value: unitNo,
          error_code: "FILE_DUPLICATE_UNIT",
          message: errMsg,
        });
      } else {
        fileSeenUnits.add(unitNo);
      }
    }

    if (email && importType === "RESIDENTS_MEMBERS") {
      const lowerEmail = String(email).toLowerCase();
      if (fileSeenEmails.has(lowerEmail)) {
        const errMsg = `Duplicate email '${lowerEmail}' found multiple times in this file.`;
        rowErrors.push(errMsg);
        errors.push({
          row_number: rowNumber,
          field: "email",
          value: lowerEmail,
          error_code: "FILE_DUPLICATE_EMAIL",
          message: errMsg,
        });
      } else {
        fileSeenEmails.add(lowerEmail);
      }
    }

    // 3. Evaluate Action: CREATE vs UPDATE vs SKIP vs ERROR
    let action: "CREATE" | "UPDATE" | "SKIP" | "ERROR" = "CREATE";

    if (rowErrors.length > 0) {
      action = "ERROR";
      invalidRowsCount++;
    } else {
      validRowsCount++;

      // Check if unit already exists in database
      if (unitNo && existingUnitNumbers.has(unitNo)) {
        if (importType === "UNITS_STRUCTURE") {
          action = "UPDATE";
          updatesCount++;
          duplicateRowsCount++;
        } else if (importType === "OWNERSHIP_OCCUPANCY") {
          action = "UPDATE";
          updatesCount++;
        } else {
          action = "UPDATE";
          updatesCount++;
          duplicateRowsCount++;
        }
      } else if (unitNo && importType === "OWNERSHIP_OCCUPANCY" && !existingUnitNumbers.has(unitNo)) {
        // In ownership occupancy import, if unit doesn't exist in society, flag an error
        const errMsg = `Unit '${unitNo}' does not exist in this society. Please import society units first.`;
        rowErrors.push(errMsg);
        errors.push({
          row_number: rowNumber,
          field: "unit_number",
          value: unitNo,
          error_code: "UNIT_NOT_FOUND",
          message: errMsg,
        });
        action = "ERROR";
        invalidRowsCount++;
        validRowsCount--;
      } else if (email && existingEmails.has(String(email).toLowerCase())) {
        action = "UPDATE";
        updatesCount++;
        duplicateRowsCount++;
      } else {
        action = "CREATE";
        createsCount++;
      }
    }

    if (previewRows.length < 50) {
      previewRows.push({
        row_number: rowNumber,
        action,
        data: mappedData,
        errors: rowErrors.length > 0 ? rowErrors : undefined,
      });
    }
  }

  // 4. Entitlement Quota Projection
  const projectedUsage = currentUsage + createsCount;
  const exceedsQuota = quotaLimit !== null && projectedUsage > quotaLimit;

  if (exceedsQuota && quotaLimit !== null) {
    errors.push({
      row_number: 0,
      field: quotaFeature || "subscription_limit",
      value: projectedUsage,
      error_code: "SUBSCRIPTION_QUOTA_EXCEEDED",
      message: `Importing ${createsCount} new items would exceed your society's ${quotaFeature} limit (${quotaLimit}). Current usage: ${currentUsage}.`,
    });
  }

  return {
    total_rows: rows.length,
    valid_rows: validRowsCount,
    invalid_rows: invalidRowsCount,
    duplicate_rows: duplicateRowsCount,
    creates_count: createsCount,
    updates_count: updatesCount,
    skips_count: skipsCount,
    quota_limit: quotaLimit,
    current_usage: currentUsage,
    projected_usage: projectedUsage,
    exceeds_quota: exceedsQuota,
    errors,
    preview_rows: previewRows,
  };
}

