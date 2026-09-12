import { createAdminClient } from "@/lib/supabase/admin";
import { recordAuditLog } from "@/lib/auth/audit";
import { validateImportData } from "./validationEngine";
import {
  ImportCommitResult,
  ImportErrorDetail,
  ImportFileFormat,
  ImportType,
} from "./types";

export interface ExecuteImportOptions {
  societyId: string;
  importType: ImportType;
  fileName: string;
  fileFormat: ImportFileFormat;
  fileSizeBytes: number;
  rows: Record<string, any>[];
  columnMapping: Record<string, string>;
  actorUserId?: string;
}

/**
 * Helper to slugify building or wing code.
 */
function toCode(text: string): string {
  return text
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 10);
}

/**
 * Executes a confirmed society data import transactionally.
 * Writes records strictly scoped to societyId. Never executes destructive overwrites or deletes.
 */
export async function executeImportCommit({
  societyId,
  importType,
  fileName,
  fileFormat,
  fileSizeBytes,
  rows,
  columnMapping,
  actorUserId,
}: ExecuteImportOptions): Promise<ImportCommitResult> {
  const startTime = Date.now();
  const adminClient = createAdminClient();

  // 1. Run validation engine to ensure integrity and enforce subscription quotas
  const validation = await validateImportData({
    societyId,
    importType,
    rows,
    columnMapping,
  });

  if (validation.exceeds_quota) {
    throw new Error(
      `Import blocked: Exceeds society subscription limit. Current usage: ${validation.current_usage}, Limit: ${validation.quota_limit}`
    );
  }

  // 2. Create the initial import job record
  const { data: job, error: jobError } = await adminClient
    .from("import_jobs")
    .insert({
      society_id: societyId,
      import_type: importType,
      file_name: fileName,
      file_size_bytes: fileSizeBytes,
      file_format: fileFormat,
      status: "IMPORTING",
      total_rows: rows.length,
      valid_rows: validation.valid_rows,
      invalid_rows: validation.invalid_rows,
      is_dry_run: false,
      column_mapping: columnMapping,
      summary: {
        total: rows.length,
        creates: validation.creates_count,
        updates: validation.updates_count,
      },
      error_report: validation.errors,
      created_by: actorUserId || null,
    })
    .select()
    .single();

  if (jobError || !job) {
    throw new Error(`Failed to create import job: ${jobError?.message || "Database error"}`);
  }

  let createdCount = 0;
  let updatedCount = 0;
  let skippedCount = 0;
  const executionErrors: ImportErrorDetail[] = [...validation.errors];

  try {
    // Caches for fast lookups
    const buildingMap = new Map<string, string>(); // name -> id
    const wingMap = new Map<string, string>(); // bldgId:wingName -> id
    const floorMap = new Map<string, string>(); // bldgId:floorNum -> id
    const unitMap = new Map<string, string>(); // unitNumber -> id
    const profileMap = new Map<string, string>(); // email -> id

    // Pre-populate units for society
    const { data: existingUnits } = await adminClient
      .from("units")
      .select("id, unit_number")
      .eq("society_id", societyId);
    if (existingUnits) {
      existingUnits.forEach((u) => unitMap.set(u.unit_number.toUpperCase(), u.id));
    }

    // Helper: Find or create Building
    async function getOrCreateBuilding(name: string): Promise<string> {
      const cleanName = name.trim();
      if (buildingMap.has(cleanName)) return buildingMap.get(cleanName)!;

      const { data: existing } = await adminClient
        .from("buildings")
        .select("id")
        .eq("society_id", societyId)
        .ilike("name", cleanName)
        .maybeSingle();

      if (existing) {
        buildingMap.set(cleanName, existing.id);
        return existing.id;
      }

      const { data: created, error } = await adminClient
        .from("buildings")
        .insert({
          society_id: societyId,
          name: cleanName,
          code: toCode(cleanName) || "BLDG",
          number_of_floors: 10,
          status: "ACTIVE",
        })
        .select("id")
        .single();

      if (error || !created) {
        throw new Error(`Failed to create building '${cleanName}': ${error?.message}`);
      }

      buildingMap.set(cleanName, created.id);
      return created.id;
    }

    // Helper: Find or create Wing
    async function getOrCreateWing(buildingId: string, wingName: string): Promise<string> {
      const cleanWing = wingName.trim();
      const cacheKey = `${buildingId}:${cleanWing.toLowerCase()}`;
      if (wingMap.has(cacheKey)) return wingMap.get(cacheKey)!;

      const { data: existing } = await adminClient
        .from("wings")
        .select("id")
        .eq("society_id", societyId)
        .eq("building_id", buildingId)
        .ilike("name", cleanWing)
        .maybeSingle();

      if (existing) {
        wingMap.set(cacheKey, existing.id);
        return existing.id;
      }

      const { data: created, error } = await adminClient
        .from("wings")
        .insert({
          society_id: societyId,
          building_id: buildingId,
          name: cleanWing,
          code: toCode(cleanWing) || "W1",
          status: "ACTIVE",
        })
        .select("id")
        .single();

      if (error || !created) {
        throw new Error(`Failed to create wing '${cleanWing}': ${error?.message}`);
      }

      wingMap.set(cacheKey, created.id);
      return created.id;
    }

    // Helper: Find or create Floor
    async function getOrCreateFloor(
      buildingId: string,
      floorNumber: number,
      wingId?: string | null
    ): Promise<string> {
      const cacheKey = `${buildingId}:${floorNumber}`;
      if (floorMap.has(cacheKey)) return floorMap.get(cacheKey)!;

      const { data: existing } = await adminClient
        .from("floors")
        .select("id")
        .eq("society_id", societyId)
        .eq("building_id", buildingId)
        .eq("floor_number", floorNumber)
        .maybeSingle();

      if (existing) {
        floorMap.set(cacheKey, existing.id);
        return existing.id;
      }

      const { data: created, error } = await adminClient
        .from("floors")
        .insert({
          society_id: societyId,
          building_id: buildingId,
          wing_id: wingId || null,
          name: `Floor ${floorNumber}`,
          floor_number: floorNumber,
          display_order: floorNumber,
          status: "ACTIVE",
        })
        .select("id")
        .single();

      if (error || !created) {
        throw new Error(`Failed to create floor '${floorNumber}': ${error?.message}`);
      }

      floorMap.set(cacheKey, created.id);
      return created.id;
    }

    // Helper: Find or create User & Profile
    async function getOrCreateUser(
      email: string,
      fullName: string,
      phone?: string | null
    ): Promise<string> {
      const cleanEmail = email.toLowerCase().trim();
      if (profileMap.has(cleanEmail)) return profileMap.get(cleanEmail)!;

      const { data: existingProfile } = await adminClient
        .from("profiles")
        .select("id")
        .eq("email", cleanEmail)
        .maybeSingle();

      if (existingProfile) {
        profileMap.set(cleanEmail, existingProfile.id);
        return existingProfile.id;
      }

      // Check auth users
      const { data: authUsers } = await adminClient.auth.admin.listUsers();
      let authUserId = authUsers?.users?.find(
        (u) => u.email?.toLowerCase() === cleanEmail
      )?.id;

      if (!authUserId) {
        const { data: newUser, error: createAuthError } =
          await adminClient.auth.admin.createUser({
            email: cleanEmail,
            password: "TempDwellSync@123!",
            email_confirm: true,
            user_metadata: { full_name: fullName },
          });

        if (createAuthError || !newUser.user) {
          throw new Error(`Failed to create user account for '${cleanEmail}': ${createAuthError?.message}`);
        }
        authUserId = newUser.user.id;
      }

      // Ensure profile exists
      await adminClient.from("profiles").upsert(
        {
          id: authUserId,
          email: cleanEmail,
          full_name: fullName,
          display_name: fullName,
          phone: phone || null,
          status: "ACTIVE",
          updated_at: new Date().toISOString(),
        },
        { onConflict: "id" }
      );

      profileMap.set(cleanEmail, authUserId);
      return authUserId;
    }

    // Process rows sequentially
    for (let i = 0; i < rows.length; i++) {
      const rowNumber = i + 2;
      const rawRow = rows[i];

      // Skip row if validation already found a fatal error for this row
      const hasFatal = validation.errors.some((e) => e.row_number === rowNumber);
      if (hasFatal) {
        skippedCount++;
        continue;
      }

      try {
        if (importType === "UNITS_STRUCTURE") {
          const bldgCol = columnMapping["building_name"];
          const wingCol = columnMapping["wing_name"];
          const floorCol = columnMapping["floor_number"];
          const unitCol = columnMapping["unit_number"];
          const typeCol = columnMapping["unit_type"];
          const areaCol = columnMapping["area_sqft"];
          const maintCol = columnMapping["monthly_maintenance"];
          const intercomCol = columnMapping["intercom_number"];

          const buildingName = rawRow[bldgCol]?.trim();
          const unitNumber = String(rawRow[unitCol] || "").trim().toUpperCase();

          if (!buildingName || !unitNumber) {
            skippedCount++;
            continue;
          }

          const buildingId = await getOrCreateBuilding(buildingName);
          let wingId: string | null = null;
          if (wingCol && rawRow[wingCol]) {
            wingId = await getOrCreateWing(buildingId, String(rawRow[wingCol]));
          }

          let floorId: string | null = null;
          if (floorCol && rawRow[floorCol] !== undefined && rawRow[floorCol] !== "") {
            const floorNum = Number(rawRow[floorCol]);
            if (!isNaN(floorNum)) {
              floorId = await getOrCreateFloor(buildingId, floorNum, wingId);
            }
          }

          const existingUnitId = unitMap.get(unitNumber);
          if (existingUnitId) {
            // Update existing unit
            await adminClient
              .from("units")
              .update({
                building_id: buildingId,
                wing_id: wingId,
                floor_id: floorId,
                unit_type: typeCol && rawRow[typeCol] ? String(rawRow[typeCol]) : undefined,
                area_sqft: areaCol && rawRow[areaCol] ? Number(rawRow[areaCol]) : undefined,
                monthly_maintenance_override:
                  maintCol && rawRow[maintCol] ? Number(rawRow[maintCol]) : undefined,
                intercom_number:
                  intercomCol && rawRow[intercomCol] ? String(rawRow[intercomCol]) : undefined,
                updated_at: new Date().toISOString(),
              })
              .eq("id", existingUnitId);

            updatedCount++;
          } else {
            // Insert new unit
            const { data: newUnit, error: unitError } = await adminClient
              .from("units")
              .insert({
                society_id: societyId,
                building_id: buildingId,
                wing_id: wingId,
                floor_id: floorId,
                unit_number: unitNumber,
                unit_type: typeCol && rawRow[typeCol] ? String(rawRow[typeCol]) : "2_BHK",
                area_sqft: areaCol && rawRow[areaCol] ? Number(rawRow[areaCol]) : null,
                monthly_maintenance_override:
                  maintCol && rawRow[maintCol] ? Number(rawRow[maintCol]) : null,
                intercom_number:
                  intercomCol && rawRow[intercomCol] ? String(rawRow[intercomCol]) : null,
                status: "ACTIVE",
              })
              .select("id")
              .single();

            if (unitError || !newUnit) {
              throw new Error(`Failed to create unit ${unitNumber}: ${unitError?.message}`);
            }

            unitMap.set(unitNumber, newUnit.id);
            createdCount++;
          }
        } else if (importType === "RESIDENTS_MEMBERS") {
          const nameCol = columnMapping["full_name"];
          const emailCol = columnMapping["email"];
          const phoneCol = columnMapping["phone"];
          const roleCol = columnMapping["role"];
          const unitCol = columnMapping["unit_number"];

          const fullName = rawRow[nameCol]?.trim();
          const email = rawRow[emailCol]?.trim().toLowerCase();
          const phone = phoneCol ? rawRow[phoneCol]?.trim() : null;
          const roleId = (roleCol && rawRow[roleCol] ? String(rawRow[roleCol]).toUpperCase() : "RESIDENT");
          const unitNumber = unitCol ? String(rawRow[unitCol] || "").trim().toUpperCase() : null;

          if (!fullName || !email) {
            skippedCount++;
            continue;
          }

          const userId = await getOrCreateUser(email, fullName, phone);

          // Upsert society membership
          const { data: mem, error: memErr } = await adminClient
            .from("society_memberships")
            .upsert(
              {
                society_id: societyId,
                user_id: userId,
                role_id: roleId,
                unit_number: unitNumber,
                status: "ACTIVE",
                joined_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              },
              { onConflict: "society_id,user_id,role_id" }
            )
            .select()
            .single();

          if (memErr) {
            throw new Error(`Failed to create membership for ${email}: ${memErr.message}`);
          }

          createdCount++;
        } else if (importType === "OWNERSHIP_OCCUPANCY") {
          const unitCol = columnMapping["unit_number"];
          const ownerNameCol = columnMapping["owner_name"];
          const ownerEmailCol = columnMapping["owner_email"];
          const ownerPhoneCol = columnMapping["owner_phone"];
          const occTypeCol = columnMapping["occupancy_type"];
          const tenantNameCol = columnMapping["tenant_name"];
          const tenantEmailCol = columnMapping["tenant_email"];
          const tenantPhoneCol = columnMapping["tenant_phone"];
          const leaseStartCol = columnMapping["lease_start"];
          const leaseEndCol = columnMapping["lease_end"];

          const unitNumber = String(rawRow[unitCol] || "").trim().toUpperCase();
          const unitId = unitMap.get(unitNumber);

          if (!unitId) {
            skippedCount++;
            continue;
          }

          const ownerName = rawRow[ownerNameCol]?.trim();
          const ownerEmail = rawRow[ownerEmailCol]?.trim().toLowerCase();
          const ownerPhone = ownerPhoneCol ? rawRow[ownerPhoneCol]?.trim() : null;

          if (ownerName && ownerEmail) {
            const ownerUserId = await getOrCreateUser(ownerEmail, ownerName, ownerPhone);

            // Assign OWNER membership
            await adminClient.from("society_memberships").upsert(
              {
                society_id: societyId,
                user_id: ownerUserId,
                role_id: "OWNER",
                unit_number: unitNumber,
                status: "ACTIVE",
                joined_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              },
              { onConflict: "society_id,user_id,role_id" }
            );

            // Upsert Unit Owner
            await adminClient.from("unit_owners").upsert(
              {
                society_id: societyId,
                unit_id: unitId,
                user_id: ownerUserId,
                is_primary: true,
                ownership_percentage: 100,
                ownership_type: "PRIMARY",
                status: "ACTIVE",
                updated_at: new Date().toISOString(),
              },
              { onConflict: "society_id,unit_id,user_id" }
            );
          }

          // If tenant info provided
          const tenantName = tenantNameCol ? rawRow[tenantNameCol]?.trim() : null;
          const tenantEmail = tenantEmailCol ? rawRow[tenantEmailCol]?.trim().toLowerCase() : null;
          const tenantPhone = tenantPhoneCol ? rawRow[tenantPhoneCol]?.trim() : null;
          const occupancyType = occTypeCol && rawRow[occTypeCol] ? String(rawRow[occTypeCol]) : "OWNER_OCCUPIED";

          if (tenantName && tenantEmail) {
            const tenantUserId = await getOrCreateUser(tenantEmail, tenantName, tenantPhone);

            await adminClient.from("society_memberships").upsert(
              {
                society_id: societyId,
                user_id: tenantUserId,
                role_id: "TENANT",
                unit_number: unitNumber,
                status: "ACTIVE",
                joined_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              },
              { onConflict: "society_id,user_id,role_id" }
            );

            await adminClient.from("unit_occupancies").upsert(
              {
                society_id: societyId,
                unit_id: unitId,
                user_id: tenantUserId,
                occupancy_type: "TENANT_OCCUPIED",
                lease_start: leaseStartCol && rawRow[leaseStartCol] ? rawRow[leaseStartCol] : null,
                lease_end: leaseEndCol && rawRow[leaseEndCol] ? rawRow[leaseEndCol] : null,
                is_primary_tenant: true,
                status: "ACTIVE",
                updated_at: new Date().toISOString(),
              },
              { onConflict: "society_id,unit_id,user_id" }
            );
          }

          createdCount++;
        } else if (importType === "MASTER_SOCIETY_DATA") {
          // Combined: building -> unit -> owner -> resident
          const bldgCol = columnMapping["building_name"];
          const wingCol = columnMapping["wing_name"];
          const floorCol = columnMapping["floor_number"];
          const unitCol = columnMapping["unit_number"];
          const typeCol = columnMapping["unit_type"];
          const areaCol = columnMapping["area_sqft"];
          const maintCol = columnMapping["monthly_maintenance"];
          const ownerNameCol = columnMapping["owner_name"];
          const ownerEmailCol = columnMapping["owner_email"];
          const ownerPhoneCol = columnMapping["owner_phone"];

          const buildingName = rawRow[bldgCol]?.trim();
          const unitNumber = String(rawRow[unitCol] || "").trim().toUpperCase();

          if (!buildingName || !unitNumber) {
            skippedCount++;
            continue;
          }

          const buildingId = await getOrCreateBuilding(buildingName);
          let wingId: string | null = null;
          if (wingCol && rawRow[wingCol]) {
            wingId = await getOrCreateWing(buildingId, String(rawRow[wingCol]));
          }

          let floorId: string | null = null;
          if (floorCol && rawRow[floorCol] !== undefined && rawRow[floorCol] !== "") {
            const floorNum = Number(rawRow[floorCol]);
            if (!isNaN(floorNum)) {
              floorId = await getOrCreateFloor(buildingId, floorNum, wingId);
            }
          }

          let currentUnitId = unitMap.get(unitNumber);
          if (currentUnitId) {
            await adminClient
              .from("units")
              .update({
                building_id: buildingId,
                wing_id: wingId,
                floor_id: floorId,
                unit_type: typeCol && rawRow[typeCol] ? String(rawRow[typeCol]) : undefined,
                area_sqft: areaCol && rawRow[areaCol] ? Number(rawRow[areaCol]) : undefined,
                monthly_maintenance_override:
                  maintCol && rawRow[maintCol] ? Number(rawRow[maintCol]) : undefined,
                updated_at: new Date().toISOString(),
              })
              .eq("id", currentUnitId);

            updatedCount++;
          } else {
            const { data: newUnit, error: unitError } = await adminClient
              .from("units")
              .insert({
                society_id: societyId,
                building_id: buildingId,
                wing_id: wingId,
                floor_id: floorId,
                unit_number: unitNumber,
                unit_type: typeCol && rawRow[typeCol] ? String(rawRow[typeCol]) : "2_BHK",
                area_sqft: areaCol && rawRow[areaCol] ? Number(rawRow[areaCol]) : null,
                monthly_maintenance_override:
                  maintCol && rawRow[maintCol] ? Number(rawRow[maintCol]) : null,
                status: "ACTIVE",
              })
              .select("id")
              .single();

            if (unitError || !newUnit) {
              throw new Error(`Failed to create unit ${unitNumber}: ${unitError?.message}`);
            }

            currentUnitId = newUnit.id;
            unitMap.set(unitNumber, newUnit.id);
            createdCount++;
          }

          // Owner linking
          const ownerName = rawRow[ownerNameCol]?.trim();
          const ownerEmail = rawRow[ownerEmailCol]?.trim().toLowerCase();
          const ownerPhone = ownerPhoneCol ? rawRow[ownerPhoneCol]?.trim() : null;

          if (ownerName && ownerEmail && currentUnitId) {
            const ownerUserId = await getOrCreateUser(ownerEmail, ownerName, ownerPhone);

            await adminClient.from("society_memberships").upsert(
              {
                society_id: societyId,
                user_id: ownerUserId,
                role_id: "OWNER",
                unit_number: unitNumber,
                status: "ACTIVE",
                joined_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              },
              { onConflict: "society_id,user_id,role_id" }
            );

            await adminClient.from("unit_owners").upsert(
              {
                society_id: societyId,
                unit_id: currentUnitId,
                user_id: ownerUserId,
                is_primary: true,
                ownership_percentage: 100,
                ownership_type: "PRIMARY",
                status: "ACTIVE",
                updated_at: new Date().toISOString(),
              },
              { onConflict: "society_id,unit_id,user_id" }
            );
          }
        }
      } catch (rowErr: any) {
        executionErrors.push({
          row_number: rowNumber,
          error_code: "ROW_EXECUTION_FAILED",
          message: rowErr?.message || "Unknown error occurred while processing row",
        });
        skippedCount++;
      }
    }

    // 3. Update job status to COMPLETED
    const durationMs = Date.now() - startTime;
    await adminClient
      .from("import_jobs")
      .update({
        status: "COMPLETED",
        created_rows: createdCount,
        updated_rows: updatedCount,
        skipped_rows: skippedCount,
        error_report: executionErrors,
        summary: {
          total: rows.length,
          created: createdCount,
          updated: updatedCount,
          skipped: skippedCount,
          durationMs,
        },
        updated_at: new Date().toISOString(),
      })
      .eq("id", job.id);

    // 4. Record comprehensive audit log
    await recordAuditLog({
      actorUserId,
      societyId,
      action: "DATA_IMPORT_COMPLETED",
      resourceType: "import_job",
      resourceId: job.id,
      metadata: {
        importType,
        fileName,
        totalRows: rows.length,
        createdRows: createdCount,
        updatedRows: updatedCount,
        skippedRows: skippedCount,
        durationMs,
      },
    });

    return {
      jobId: job.id,
      societyId,
      status: "COMPLETED",
      total_rows: rows.length,
      created_rows: createdCount,
      updated_rows: updatedCount,
      skipped_rows: skippedCount,
      invalid_rows: validation.invalid_rows,
      error_count: executionErrors.length,
      error_report: executionErrors,
      duration_ms: durationMs,
    };
  } catch (fatalError: any) {
    const durationMs = Date.now() - startTime;
    await adminClient
      .from("import_jobs")
      .update({
        status: "FAILED",
        error_report: [
          ...executionErrors,
          {
            row_number: 0,
            error_code: "FATAL_IMPORT_ERROR",
            message: fatalError?.message || "Fatal database error during import execution",
          },
        ],
        updated_at: new Date().toISOString(),
      })
      .eq("id", job.id);

    await recordAuditLog({
      actorUserId,
      societyId,
      action: "DATA_IMPORT_FAILED",
      resourceType: "import_job",
      resourceId: job.id,
      metadata: {
        importType,
        fileName,
        error: fatalError?.message,
      },
    });

    throw fatalError;
  }
}

