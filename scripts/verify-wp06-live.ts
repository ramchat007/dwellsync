import * as fs from "fs";
import * as path from "path";
import { createClient } from "@supabase/supabase-js";

// 1. Load environment variables from .env.local
const envPath = path.resolve(process.cwd(), ".env.local");
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, "utf8");
  for (const line of envContent.split("\n")) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith("#") && trimmed.includes("=")) {
      const idx = trimmed.indexOf("=");
      const key = trimmed.slice(0, idx).trim();
      const val = trimmed.slice(idx + 1).trim();
      process.env[key] = val;
    }
  }
}

// 2. Import service layer functions after env variables are populated
import {
  getSocietyStructure,
  getBuilding,
  createBuilding,
  updateBuilding,
  deleteBuilding,
  getWings,
  getWing,
  createWing,
  updateWing,
  deleteWing,
  getFloors,
  getFloor,
  createFloor,
  updateFloor,
  deleteFloor,
  getUnitsPaginated,
  getUnitWithDetails,
  createUnit,
  updateUnit,
  deleteUnit,
} from "../src/lib/services/buildingService";
import { validateImportData } from "../src/lib/services/import/validationEngine";
import { executeImportCommit } from "../src/lib/services/import/importExecutor";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !serviceKey) {
  console.error("Missing Supabase configuration in .env.local");
  process.exit(1);
}

const adminClient = createClient(supabaseUrl, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

interface CheckResult {
  step: number;
  name: string;
  passed: boolean;
  details?: string;
}

const results: CheckResult[] = [];

function record(step: number, name: string, passed: boolean, details?: string) {
  results.push({ step, name, passed, details });
  const mark = passed ? "PASS" : "FAIL";
  console.log(`[${mark}] Step ${step.toString().padStart(2, "0")}: ${name}${details ? ` -> ${details}` : ""}`);
}

async function runLiveVerification() {
  console.log("===============================================================================");
  console.log("DWELLSYNC WP-06 LIVE VERIFICATION: SOCIETY STRUCTURE, UNITS & BULK IMPORT");
  console.log("Target Database:", supabaseUrl);
  console.log("Timestamp:", new Date().toISOString());
  console.log("===============================================================================\n");

  const societyId = "07ae6307-13cb-4d14-a547-27914536fc62";
  const foreignSocietyId = "b2c3d4e5-6789-01bc-def0-123456789abc";
  const adminUserId = "d52b51a1-026d-4828-81c3-a9f3a48780e6";

  // Pre-cleanup of any lingering test entities from prior runs
  try {
    const { data: testBldgs } = await adminClient
      .from("buildings")
      .select("id")
      .eq("society_id", societyId)
      .ilike("name", "%WP06%");
    if (testBldgs && testBldgs.length > 0) {
      const bldgIds = testBldgs.map((b) => b.id);
      await adminClient.from("units").delete().in("building_id", bldgIds);
      await adminClient.from("floors").delete().in("building_id", bldgIds);
      await adminClient.from("wings").delete().in("building_id", bldgIds);
      await adminClient.from("buildings").delete().in("id", bldgIds);
    }
    await adminClient.from("units").delete().eq("society_id", societyId).ilike("unit_number", "%WP06%");
    await adminClient.from("import_jobs").delete().eq("society_id", societyId).ilike("file_name", "%wp06%");
  } catch {
    // Ignore pre-cleanup errors
  }

  let initialUnitsCount = 0;
  let initialBuildingsCount = 0;

  // Track created test entities for clean teardown
  let testBuildingId: string | null = null;
  let testWingId: string | null = null;
  let testFloorId: string | null = null;
  let testUnitId: string | null = null;
  const importedUnitIds: string[] = [];
  let testImportJobId: string | null = null;
  let reimportJobId: string | null = null;

  try {
    // -------------------------------------------------------------------------
    // STEP 1: Retrieval of Society Physical Hierarchy Tree
    // -------------------------------------------------------------------------
    const structureRes = await getSocietyStructure(societyId);
    const hasBuildings = structureRes.buildings && structureRes.buildings.length > 0;
    const hasStats = structureRes.stats && structureRes.stats.totalUnits >= 0;
    initialUnitsCount = structureRes.stats.totalUnits;
    initialBuildingsCount = structureRes.stats.totalBuildings;
    record(
      1,
      "Retrieval of society structure tree",
      structureRes.society_id === societyId && hasBuildings && hasStats,
      `Buildings: ${structureRes.stats.totalBuildings}, Wings: ${structureRes.stats.totalWings}, Floors: ${structureRes.stats.totalFloors}, Units: ${structureRes.stats.totalUnits}`
    );

    // -------------------------------------------------------------------------
    // STEP 2: Building Creation Under Target Society
    // -------------------------------------------------------------------------
    const bldgRes = await createBuilding(
      {
        society_id: societyId,
        name: "WP06 Test Tower",
        code: "WP06TEST",
        number_of_floors: 10,
        status: "ACTIVE",
      },
      adminUserId
    );
    if (bldgRes.success && bldgRes.data) {
      testBuildingId = bldgRes.data.id;
    }
    record(
      2,
      "Building creation under target society",
      bldgRes.success && !!testBuildingId,
      `Building ID: ${testBuildingId}, Code: ${bldgRes.data?.code}`
    );

    if (!testBuildingId) {
      throw new Error(`Building creation failed: ${bldgRes.error}`);
    }

    // -------------------------------------------------------------------------
    // STEP 3: Wing Creation Under Test Building
    // -------------------------------------------------------------------------
    const wingRes = await createWing(
      {
        society_id: societyId,
        building_id: testBuildingId,
        name: "Wing Delta",
        code: "W-DELTA",
        status: "ACTIVE",
      },
      adminUserId
    );
    if (wingRes.success && wingRes.data) {
      testWingId = wingRes.data.id;
    }
    record(
      3,
      "Wing creation under test building",
      wingRes.success && !!testWingId && wingRes.data?.building_id === testBuildingId,
      `Wing ID: ${testWingId}, Code: ${wingRes.data?.code}`
    );

    if (!testWingId) {
      throw new Error(`Wing creation failed: ${wingRes.error}`);
    }

    // -------------------------------------------------------------------------
    // STEP 4: Floor Creation Under Building / Wing
    // -------------------------------------------------------------------------
    const floorRes = await createFloor(
      {
        society_id: societyId,
        building_id: testBuildingId,
        wing_id: testWingId,
        name: "Floor 99 Penthouse Level",
        floor_number: 99,
        display_order: 99,
        status: "ACTIVE",
      },
      adminUserId
    );
    if (floorRes.success && floorRes.data) {
      testFloorId = floorRes.data.id;
    }
    record(
      4,
      "Floor creation under building and wing",
      floorRes.success && !!testFloorId && floorRes.data?.floor_number === 99,
      `Floor ID: ${testFloorId}, Floor No: ${floorRes.data?.floor_number}`
    );

    // -------------------------------------------------------------------------
    // STEP 5: Unit Creation Under Building / Wing / Floor
    // -------------------------------------------------------------------------
    const unitRes = await createUnit(
      {
        society_id: societyId,
        building_id: testBuildingId,
        wing_id: testWingId,
        floor_id: testFloorId,
        unit_number: "WP06-9901",
        unit_type: "PENTHOUSE",
        area_sqft: 3200,
        bedrooms: 4,
        bathrooms: 4,
        balconies: 2,
        status: "VACANT",
      },
      adminUserId
    );
    if (unitRes.success && unitRes.data) {
      testUnitId = unitRes.data.id;
    }
    record(
      5,
      "Unit creation under building/wing/floor",
      unitRes.success && !!testUnitId && unitRes.data?.unit_number === "WP06-9901",
      `Unit ID: ${testUnitId}, Unit Number: ${unitRes.data?.unit_number}`
    );

    if (!testUnitId) {
      throw new Error(`Unit creation failed: ${unitRes.error}`);
    }

    // -------------------------------------------------------------------------
    // STEP 6: Hierarchy Relationship Integrity Check
    // -------------------------------------------------------------------------
    const unitDetails = await getUnitWithDetails(testUnitId, societyId);
    const hasHierarchyIntegrity =
      unitDetails.success &&
      unitDetails.data?.building?.id === testBuildingId &&
      unitDetails.data?.wing?.id === testWingId &&
      unitDetails.data?.floor?.id === testFloorId;
    record(
      6,
      "Hierarchy relationship integrity (building -> wing -> floor -> unit)",
      hasHierarchyIntegrity,
      `Unit ${unitDetails.data?.unit_number} verified with parent building '${unitDetails.data?.building?.name}', wing '${unitDetails.data?.wing?.name}', floor '${unitDetails.data?.floor?.name}'`
    );

    // -------------------------------------------------------------------------
    // STEP 7: Cross-Society Boundary Check (Tenant Isolation)
    // -------------------------------------------------------------------------
    const crossWingRes = await createWing(
      {
        society_id: foreignSocietyId,
        building_id: testBuildingId,
        name: "Foreign Infiltrator Wing",
        code: "FINF",
      },
      adminUserId
    );
    const crossFloorRes = await createFloor(
      {
        society_id: societyId,
        building_id: "83ccd46a-2e68-4a76-9242-e6cd76e21bf8",
        wing_id: testWingId,
        name: "Mismatched Floor",
        floor_number: 88,
      },
      adminUserId
    );
    const crossUnitRes = await createUnit(
      {
        society_id: societyId,
        building_id: "83ccd46a-2e68-4a76-9242-e6cd76e21bf8",
        wing_id: testWingId,
        unit_number: "WP06-MISMATCH",
      },
      adminUserId
    );

    const crossBoundaryBlocked =
      !crossWingRes.success && !crossFloorRes.success && !crossUnitRes.success;
    record(
      7,
      "Cross-society and cross-hierarchy boundary enforcement",
      crossBoundaryBlocked,
      `Cross-wing error: "${crossWingRes.error}", Cross-floor error: "${crossFloorRes.error}", Cross-unit error: "${crossUnitRes.error}"`
    );

    // -------------------------------------------------------------------------
    // STEP 8: Duplicate Code / Number Validation Within Same Scope
    // -------------------------------------------------------------------------
    const dupBldgRes = await createBuilding(
      {
        society_id: societyId,
        name: "Duplicate Tower",
        code: "WP06TEST",
        number_of_floors: 5,
      },
      adminUserId
    );
    const dupWingRes = await createWing(
      {
        society_id: societyId,
        building_id: testBuildingId,
        name: "Duplicate Wing",
        code: "W-DELTA",
      },
      adminUserId
    );
    const dupUnitRes = await createUnit(
      {
        society_id: societyId,
        building_id: testBuildingId,
        unit_number: "WP06-9901",
      },
      adminUserId
    );
    const duplicatesBlocked =
      !dupBldgRes.success && !dupWingRes.success && !dupUnitRes.success;
    record(
      8,
      "Duplicate code / number validation within same scope",
      duplicatesBlocked,
      `Dup building blocked: "${dupBldgRes.error}", Dup wing blocked: "${dupWingRes.error}", Dup unit blocked: "${dupUnitRes.error}"`
    );

    // -------------------------------------------------------------------------
    // STEP 9: Pagination and Filtering on Units Registry
    // -------------------------------------------------------------------------
    const filterBuildingRes = await getUnitsPaginated(societyId, {
      buildingId: testBuildingId,
    });
    const filterSearchRes = await getUnitsPaginated(societyId, {
      search: "9901",
    });
    const filterStatusRes = await getUnitsPaginated(societyId, {
      status: "VACANT",
      limit: 10,
    });
    const paginationRes = await getUnitsPaginated(societyId, {
      page: 1,
      limit: 5,
    });

    const filterBuildingOk =
      filterBuildingRes.data.length === 1 &&
      filterBuildingRes.data[0].unit_number === "WP06-9901";
    const filterSearchOk =
      filterSearchRes.data.some((u) => u.unit_number === "WP06-9901");
    const filterStatusOk =
      filterStatusRes.data.length > 0 &&
      filterStatusRes.data.every((u) => u.status === "VACANT");
    const paginationOk =
      paginationRes.data.length <= 5 &&
      paginationRes.pagination.limit === 5 &&
      paginationRes.pagination.page === 1;

    const allFiltersPassed =
      filterBuildingOk && filterSearchOk && filterStatusOk && paginationOk;
    record(
      9,
      "Pagination and filtering on units list",
      allFiltersPassed,
      `Building filter: ${filterBuildingOk} (${filterBuildingRes.data.length} units), Search filter: ${filterSearchOk}, Status filter: ${filterStatusOk}, Limit/Page pagination: ${paginationOk}`
    );

    // -------------------------------------------------------------------------
    // STEP 10: Unit Occupancy and Ownership Inspection & PII Protection
    // -------------------------------------------------------------------------
    const { data: sampleUnits } = await adminClient
      .from("units")
      .select("id, unit_number")
      .eq("society_id", societyId)
      .neq("id", testUnitId)
      .limit(1);

    const checkUnitId = sampleUnits?.[0]?.id || testUnitId;
    const inspected = await getUnitWithDetails(checkUnitId, societyId);

    let piiLeakFound = false;
    const inspectJson = JSON.stringify(inspected);
    const sensitiveTokens = ["password_hash", "encrypted_password", "token_hash", "secret_key"];
    for (const token of sensitiveTokens) {
      if (inspectJson.includes(token)) {
        piiLeakFound = true;
        break;
      }
    }

    record(
      10,
      "Unit relationship inspection and PII protection",
      inspected.success && !piiLeakFound,
      `No password hashes, auth tokens, or internal secrets exposed in relationship inspection`
    );

    // -------------------------------------------------------------------------
    // STEP 11: Unit Updates & Attribute Hardening
    // -------------------------------------------------------------------------
    const updateRes = await updateUnit(
      testUnitId,
      societyId,
      {
        status: "OCCUPIED",
        area_sqft: 3450,
        intercom_number: "9901",
      },
      adminUserId
    );
    const updateVerified =
      updateRes.success &&
      updateRes.data?.status === "OCCUPIED" &&
      updateRes.data?.area_sqft === 3450;
    record(
      11,
      "Unit update mutation with attribute validation",
      updateVerified,
      `Status updated to: ${updateRes.data?.status}, Area: ${updateRes.data?.area_sqft} sqft, Intercom: ${updateRes.data?.intercom_number}`
    );

    // -------------------------------------------------------------------------
    // STEP 12: Safe Deletion Behavior (Hierarchy Protection)
    // -------------------------------------------------------------------------
    const delBldgWithWings = await deleteBuilding(testBuildingId, societyId, adminUserId);
    const delWingWithUnits = await deleteWing(testWingId, societyId, adminUserId);

    const safeDeletionEnforced =
      !delBldgWithWings.success &&
      !delWingWithUnits.success &&
      (delBldgWithWings.error?.includes("Cannot delete building") ?? false) &&
      (delWingWithUnits.error?.includes("Cannot delete wing") ?? false);

    record(
      12,
      "Safe deletion hierarchy protection (building/wing delete blocked when children exist)",
      safeDeletionEnforced,
      `Building delete error: "${delBldgWithWings.error}", Wing delete error: "${delWingWithUnits.error}"`
    );

    // -------------------------------------------------------------------------
    // STEP 13: Bulk Import Validation Dry-Run (Valid CSV Payload)
    // -------------------------------------------------------------------------
    const validRows = [
      {
        "Building Name": "WP06 Test Tower",
        "Wing Name": "Wing Delta",
        "Floor Number": 1,
        "Unit Number": "WP06-IMP-101",
        "Unit Type": "2_BHK",
        "Area SqFt": 1100,
      },
    ];
    const columnMapping = {
      building_name: "Building Name",
      wing_name: "Wing Name",
      floor_number: "Floor Number",
      unit_number: "Unit Number",
      unit_type: "Unit Type",
      area_sqft: "Area SqFt",
    };

    const validDryRun = await validateImportData({
      societyId,
      importType: "UNITS_STRUCTURE",
      rows: validRows,
      columnMapping,
    });

    const isDryRunValid =
      validDryRun.valid_rows === 1 &&
      validDryRun.invalid_rows === 0 &&
      validDryRun.errors.length === 0 &&
      !validDryRun.exceeds_quota;

    const { data: dbCheckPreCommit } = await adminClient
      .from("units")
      .select("id")
      .eq("society_id", societyId)
      .eq("unit_number", "WP06-IMP-101");

    const dryRunWroteZeroRecords =
      !dbCheckPreCommit || dbCheckPreCommit.length === 0;

    record(
      13,
      "Bulk import validation dry-run (valid CSV payload)",
      isDryRunValid && dryRunWroteZeroRecords,
      `Valid rows: ${validDryRun.valid_rows}, Errors: ${validDryRun.errors.length}, DB mutations before commit: ${dbCheckPreCommit?.length || 0}`
    );

    // -------------------------------------------------------------------------
    // STEP 14: Bulk Import Validation Dry-Run (Invalid CSV Payload)
    // -------------------------------------------------------------------------
    const invalidRows = [
      {
        "Building Name": "",
        "Unit Number": "",
        "Unit Type": "INVALID_TYPE",
      },
      {
        "Building Name": "WP06 Test Tower",
        "Unit Number": "WP06-9901",
      },
    ];

    const invalidDryRun = await validateImportData({
      societyId,
      importType: "UNITS_STRUCTURE",
      rows: invalidRows,
      columnMapping: {
        building_name: "Building Name",
        unit_number: "Unit Number",
        unit_type: "Unit Type",
      },
    });

    const isDryRunErrorsDetected =
      invalidDryRun.invalid_rows > 0 && invalidDryRun.errors.length > 0;
    record(
      14,
      "Bulk import validation dry-run (invalid CSV payload error detection)",
      isDryRunErrorsDetected,
      `Invalid rows detected: ${invalidDryRun.invalid_rows}, Specific error details: ${invalidDryRun.errors.map((e) => `Row ${e.row_number}: ${e.message}`).join("; ")}`
    );

    // -------------------------------------------------------------------------
    // STEP 15: Bulk Import Execution / Transactional Commit
    // -------------------------------------------------------------------------
    const commitResult = await executeImportCommit({
      societyId,
      importType: "UNITS_STRUCTURE",
      fileName: "wp06_verification_units.csv",
      fileFormat: "csv",
      fileSizeBytes: 1024,
      rows: validRows,
      columnMapping,
      actorUserId: adminUserId,
    });

    testImportJobId = commitResult.jobId;

    const { data: dbImportedUnits } = await adminClient
      .from("units")
      .select("id, unit_number, building_id")
      .eq("society_id", societyId)
      .eq("unit_number", "WP06-IMP-101");

    if (dbImportedUnits) {
      dbImportedUnits.forEach((u) => {
        importedUnitIds.push(u.id);
      });
    }

    const commitSuccessful =
      commitResult.status === "COMPLETED" &&
      commitResult.created_rows === 1 &&
      dbImportedUnits?.length === 1;

    record(
      15,
      "Bulk import transactional commit",
      commitSuccessful,
      `Job ID: ${commitResult.jobId}, Created: ${commitResult.created_rows}, Units in DB: ${dbImportedUnits?.length}`
    );

    // -------------------------------------------------------------------------
    // STEP 16: Bulk Import Idempotency (Re-importing Same Units Skips / Updates)
    // -------------------------------------------------------------------------
    const idempotencyResult = await executeImportCommit({
      societyId,
      importType: "UNITS_STRUCTURE",
      fileName: "wp06_verification_units_reimport.csv",
      fileFormat: "csv",
      fileSizeBytes: 1024,
      rows: validRows,
      columnMapping,
      actorUserId: adminUserId,
    });

    reimportJobId = idempotencyResult.jobId;

    const { data: dbCheckAfterReimport } = await adminClient
      .from("units")
      .select("id")
      .eq("society_id", societyId)
      .eq("unit_number", "WP06-IMP-101");

    const isIdempotent =
      idempotencyResult.status === "COMPLETED" &&
      dbCheckAfterReimport?.length === 1 &&
      idempotencyResult.created_rows === 0 &&
      idempotencyResult.updated_rows === 1;

    record(
      16,
      "Bulk import idempotency (re-importing same units skips/updates without duplicating)",
      isIdempotent,
      `Created count on re-import: ${idempotencyResult.created_rows}, Updated count: ${idempotencyResult.updated_rows}, Total units in DB: ${dbCheckAfterReimport?.length}`
    );

    // -------------------------------------------------------------------------
    // STEP 17: Audit Log Verification for Physical Hierarchy Actions
    // -------------------------------------------------------------------------
    const { data: recentAuditLogs } = await adminClient
      .from("audit_logs")
      .select("id, action, resource_type, society_id, created_at")
      .eq("society_id", societyId)
      .order("created_at", { ascending: false })
      .limit(20);

    const actionsLogged = recentAuditLogs?.map((l) => l.action) || [];
    const hasStructureAudit = actionsLogged.some((a) =>
      [
        "BUILDING_CREATED",
        "BUILDING_CREATE",
        "WING_CREATED",
        "WING_CREATE",
        "UNIT_CREATED",
        "UNIT_CREATE",
        "DATA_IMPORT_COMPLETED",
        "IMPORT_COMMIT",
      ].includes(a)
    );

    record(
      17,
      "Audit logging verification for society structure actions",
      hasStructureAudit,
      `Actions recorded in audit_logs: [${Array.from(new Set(actionsLogged)).slice(0, 6).join(", ")}]`
    );

    // -------------------------------------------------------------------------
    // STEP 18: Safe Deletion & Non-Destructive Teardown of Test Entities
    // -------------------------------------------------------------------------
    let cleanupSuccess = true;

    // 1. Delete imported units
    if (importedUnitIds.length > 0) {
      const { error: delImpErr } = await adminClient
        .from("units")
        .delete()
        .in("id", importedUnitIds);
      if (delImpErr) cleanupSuccess = false;
    }

    // 2. Delete test unit WP06-9901
    if (testUnitId) {
      const delUnitRes = await deleteUnit(testUnitId, societyId, adminUserId);
      if (!delUnitRes.success) cleanupSuccess = false;
    }

    // 3. Delete all floors under test building (Floor 99 and imported Floor 1)
    if (testBuildingId) {
      const { error: delFloorsErr } = await adminClient
        .from("floors")
        .delete()
        .eq("building_id", testBuildingId);
      if (delFloorsErr) cleanupSuccess = false;
    }

    // 4. Delete test wing
    if (testWingId) {
      const delWingRes = await deleteWing(testWingId, societyId, adminUserId);
      if (!delWingRes.success) cleanupSuccess = false;
    }

    // 5. Delete test building
    if (testBuildingId) {
      const delBldgRes = await deleteBuilding(testBuildingId, societyId, adminUserId);
      if (!delBldgRes.success) cleanupSuccess = false;
    }

    // 6. Delete test import jobs
    if (testImportJobId) {
      await adminClient.from("import_jobs").delete().eq("id", testImportJobId);
    }
    if (reimportJobId) {
      await adminClient.from("import_jobs").delete().eq("id", reimportJobId);
    }

    record(
      18,
      "Non-destructive cleanup of test entities",
      cleanupSuccess,
      `Cleaned test units (${importedUnitIds.length + 1}), floors, wing, building, and import jobs`
    );

    // -------------------------------------------------------------------------
    // STEP 19: Post-Cleanup Society Integrity & Zero Side-Effect Check
    // -------------------------------------------------------------------------
    const postCleanupStructure = await getSocietyStructure(societyId);
    const postUnitsCount = postCleanupStructure.stats.totalUnits;
    const postBuildingsCount = postCleanupStructure.stats.totalBuildings;

    const zeroSideEffects =
      postUnitsCount === initialUnitsCount &&
      postBuildingsCount === initialBuildingsCount;

    record(
      19,
      "Post-cleanup society integrity verification (zero corruption/deletion of baseline data)",
      zeroSideEffects,
      `Pre-test units: ${initialUnitsCount}, Post-test units: ${postUnitsCount}; Pre-test buildings: ${initialBuildingsCount}, Post-test buildings: ${postBuildingsCount}`
    );

    // -------------------------------------------------------------------------
    // STEP 20: Comprehensive Verification Matrix Summary
    // -------------------------------------------------------------------------
    const totalPassed = results.filter((r) => r.passed).length;
    const totalTests = results.length;
    const allPassed = totalPassed === totalTests;

    record(
      20,
      "All 20 WP-06 Live Verification Criteria Passed",
      allPassed,
      `${totalPassed}/${totalTests} criteria satisfied with exit code 0`
    );

  } catch (err: any) {
    console.error("\n[CRITICAL ERROR DURING LIVE VERIFICATION]:", err);
    record(99, "Execution exception", false, err?.message || String(err));
  }

  console.log("\n===============================================================================");
  console.log("WP-06 LIVE VERIFICATION TEST MATRIX");
  console.log("===============================================================================");
  for (const r of results) {
    console.log(`Step ${r.step.toString().padStart(2, "0")}: [${r.passed ? " PASS " : " FAIL "}] ${r.name}`);
    if (r.details) {
      console.log(`         Details: ${r.details}`);
    }
  }
  console.log("===============================================================================");

  const failedCount = results.filter((r) => !r.passed).length;
  if (failedCount > 0) {
    console.error(`\nFAILED: ${failedCount} test(s) failed during live verification.`);
    process.exit(1);
  } else {
    console.log(`\nSUCCESS: All ${results.length} live verification steps PASSED perfectly.`);
    process.exit(0);
  }
}

runLiveVerification();
