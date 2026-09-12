import { config } from "dotenv";
config({ path: ".env.local" });

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const adminClient = createClient(supabaseUrl, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const anonClient = createClient(supabaseUrl, anonKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

interface CheckResult {
  category: string;
  name: string;
  passed: boolean;
  details?: string;
}

const results: CheckResult[] = [];

function record(category: string, name: string, passed: boolean, details?: string) {
  results.push({ category, name, passed, details });
  const mark = passed ? "PASS" : "FAIL";
  console.log(`[${mark}] ${category} :: ${name}${details ? ` -> ${details}` : ""}`);
}

async function verifyMigration22() {
  console.log("================================================================================");
  console.log("MIGRATION 22: FREE MIGRATION / SOCIETY DATA IMPORT REMOTE DB VERIFICATION");
  console.log("Target Database:", supabaseUrl);
  console.log("================================================================================\n");

  // 1. Inspect OpenAPI schema for table and column presence
  console.log("--- 1. OpenAPI & PostgREST Schema Inspection ---");
  try {
    const openapiRes = await fetch(`${supabaseUrl}/rest/v1/?apikey=${serviceKey}`);
    const spec: any = await openapiRes.json();

    const def = spec.definitions?.import_jobs;
    const tableFound = !!def;
    record("Schema Introspection", "Table 'import_jobs' registered in PostgREST", tableFound);

    const requiredCols = [
      "id",
      "society_id",
      "import_type",
      "file_name",
      "file_size_bytes",
      "file_format",
      "status",
      "total_rows",
      "valid_rows",
      "invalid_rows",
      "created_rows",
      "updated_rows",
      "skipped_rows",
      "is_dry_run",
      "column_mapping",
      "summary",
      "error_report",
      "created_by",
      "created_at",
      "updated_at",
    ];

    if (def) {
      const props = def.properties || {};
      for (const col of requiredCols) {
        const colFound = !!props[col];
        record("Column Check", `import_jobs.${col}`, colFound);
      }
    } else {
      for (const col of requiredCols) {
        record("Column Check", `import_jobs.${col}`, false, "Table not found in schema");
      }
    }
  } catch (err: any) {
    record("Schema Introspection", "OpenAPI fetch", false, err.message);
  }

  // 2. Query probe with Service Role
  console.log("\n--- 2. Service Role Access Probe ---");
  try {
    const { data, error } = await adminClient.from("import_jobs").select("*").limit(0);
    if (!error) {
      record("Service Role Access", "Select query on import_jobs", true);
    } else {
      record("Service Role Access", "Select query on import_jobs", false, error.message);
    }
  } catch (err: any) {
    record("Service Role Access", "Select query exception", false, err.message);
  }

  // 3. RLS & Unauthenticated Denial Check
  console.log("\n--- 3. RLS & Anonymous Access Denial ---");
  try {
    const { data, error } = await anonClient.from("import_jobs").select("*").limit(1);
    // Unauthenticated user should get empty array or an error (denied by RLS)
    if (!error && (!data || data.length === 0)) {
      record("RLS Security", "Anonymous/unauthenticated user gets 0 records", true);
    } else if (error) {
      record("RLS Security", "Anonymous request blocked by RLS", true, error.message);
    } else {
      record("RLS Security", "Anonymous access leaked records!", false, `Leaked ${data.length} records`);
    }
  } catch (err: any) {
    record("RLS Security", "Anonymous request failed safely", true, err.message);
  }

  // Summary
  console.log("\n================================================================================");
  const total = results.length;
  const passed = results.filter((r) => r.passed).length;
  const failed = total - passed;
  console.log(`TOTAL CHECKS: ${total} | PASSED: ${passed} | FAILED: ${failed}`);
  console.log("================================================================================");

  if (failed > 0) {
    console.log("\n[ACTION REQUIRED] Migration 22 has not yet been executed in remote Supabase SQL Editor.");
  } else {
    console.log("\n[SUCCESS] Migration 22 successfully verified against remote database!");
  }
}

verifyMigration22();

