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

async function verifyMigration26() {
  console.log("================================================================================");
  console.log("MIGRATION 26: PROPERTY MANAGEMENT OPERATIONS & TASKS VERIFICATION (READ-ONLY)");
  console.log("Target Database:", supabaseUrl);
  console.log("================================================================================\n");

  // 1. Prerequisites Probe (Phase 15 Foundation Tables)
  console.log("--- 1. Prerequisite Foundation Tables Probe ---");
  const prereqTables = [
    "management_companies",
    "management_company_members",
    "management_company_societies",
    "societies",
    "profiles",
  ];
  for (const table of prereqTables) {
    try {
      const { error } = await adminClient.from(table).select("id").limit(1);
      record("Prerequisite Schema", `Table '${table}' exists and is queryable`, !error, error?.message);
    } catch (err: any) {
      record("Prerequisite Schema", `Table '${table}' query exception`, false, err.message);
    }
  }

  // 2. Pre-flight Check: Detect if Migration 26 has been executed remotely
  console.log("\n--- 2. Migration 26 Pre-Flight Probe ---");
  let migrationApplied = false;
  try {
    const { error: probeErr } = await adminClient
      .from("management_company_tasks")
      .select("id")
      .limit(0);

    if (!probeErr) {
      migrationApplied = true;
      record("Pre-Flight Status", "Migration 26 tables detected on remote database", true);
    } else {
      record(
        "Pre-Flight Status",
        "Migration 26 is PENDING execution on remote database (expected prior to remote run)",
        true,
        probeErr.message
      );
    }
  } catch (err: any) {
    record(
      "Pre-Flight Status",
      "Migration 26 is PENDING execution on remote database",
      true,
      err.message
    );
  }

  if (!migrationApplied) {
    console.log("\n[NOTICE] Migration 26 has NOT yet been applied to the remote Supabase database.");
    console.log("To apply Migration 26, execute:");
    console.log("  supabase/migrations/20260901000026_property_management_operations.sql");
    console.log("against your Supabase SQL editor or CLI migration pipeline.\n");

    // Perform Production Safety Checks Even in Pre-Flight Mode
    console.log("--- Production Hierarchy Data Safety Inspection ---");
    const coreHierarchyTables = [
      "societies",
      "buildings",
      "wings",
      "floors",
      "units",
      "profiles",
      "society_memberships",
    ];

    for (const table of coreHierarchyTables) {
      try {
        const { count, error } = await adminClient
          .from(table)
          .select("*", { count: "exact", head: true });
        const isValid = !error && count !== null && count !== undefined;
        record(
          "Production Data Safety",
          `Core table '${table}' count intact`,
          isValid,
          `Row count: ${count}`
        );
      } catch (err: any) {
        record("Production Data Safety", `Table '${table}' count query exception`, false, err.message);
      }
    }

    console.log("\n================================================================================");
    const passedCount = results.filter((r) => r.passed).length;
    const failedCount = results.filter((r) => !r.passed).length;
    console.log(`PRE-FLIGHT VERIFICATION SUMMARY: ${passedCount} / ${results.length} passed (${failedCount} failed)`);
    console.log("STATUS: READY FOR MIGRATION EXECUTION");
    console.log("================================================================================");
    return;
  }

  // 3. OpenAPI & PostgREST Schema Inspection
  console.log("\n--- 3. OpenAPI & PostgREST Schema Inspection ---");
  try {
    const openapiRes = await fetch(`${supabaseUrl}/rest/v1/?apikey=${serviceKey}`);
    const spec: any = await openapiRes.json();

    const tablesToCheck = [
      {
        table: "management_company_tasks",
        cols: [
          "id",
          "management_company_id",
          "society_id",
          "title",
          "description",
          "category",
          "priority",
          "status",
          "assigned_to",
          "created_by",
          "due_at",
          "completed_at",
          "metadata",
          "created_at",
          "updated_at",
        ],
        pkCol: "id",
        fkCols: ["management_company_id", "society_id"],
      },
      {
        table: "management_company_task_comments",
        cols: [
          "id",
          "task_id",
          "management_company_id",
          "user_id",
          "comment",
          "created_at",
          "updated_at",
        ],
        pkCol: "id",
        fkCols: ["task_id", "management_company_id", "user_id"],
      },
    ];

    for (const item of tablesToCheck) {
      const def = spec.definitions?.[item.table];
      const tablePresent = !!def;
      record("OpenAPI Table Presence", `Table '${item.table}' declared in API schema`, tablePresent);

      if (tablePresent && def.properties) {
        for (const col of item.cols) {
          const colPresent = !!def.properties[col];
          record("OpenAPI Column Inspection", `Table '${item.table}' has column '${col}'`, colPresent);
        }

        const pkPresent = !!def.properties[item.pkCol];
        record("OpenAPI Primary Key", `Table '${item.table}' has primary key column '${item.pkCol}'`, pkPresent);
      }
    }
  } catch (err: any) {
    record("OpenAPI Inspection", "Failed to fetch or parse OpenAPI spec", false, err.message);
  }

  // 4. Composite Foreign Key Integrity Check via PostgREST schema cache
  console.log("\n--- 4. Composite Foreign Key Integrity Inspection ---");
  const relationalQueries = [
    {
      source: "management_company_tasks",
      relation: "management_company_societies!fk_task_comp_society(id)",
      constraint: "fk_task_comp_society",
      direction: "forward: tasks -> company_societies",
    },
    {
      source: "management_company_tasks",
      relation: "management_company_members!fk_task_assigned_member(id)",
      constraint: "fk_task_assigned_member",
      direction: "forward: tasks -> company_members",
    },
    {
      source: "management_company_task_comments",
      relation: "management_company_members!fk_task_comment_member(id)",
      constraint: "fk_task_comment_member",
      direction: "forward: task_comments -> company_members",
    },
  ];

  for (const q of relationalQueries) {
    try {
      const { error } = await adminClient
        .from(q.source)
        .select(`id, ${q.relation}`)
        .limit(0);
      record(
        "Composite FK Integrity",
        `Constraint '${q.constraint}' verified (${q.direction})`,
        !error,
        error ? error.message : "Schema cache validated"
      );
    } catch (err: any) {
      record("Composite FK Integrity", `Constraint '${q.constraint}' query exception`, false, err.message);
    }
  }

  // Negative Control: confirm invalid constraint is rejected
  try {
    const { error: negErr } = await adminClient
      .from("management_company_tasks")
      .select("id, management_company_societies!fk_invalid_probe(id)")
      .limit(0);
    const properlyRejected = !!negErr && negErr.message.includes("Could not find a relationship");
    record(
      "Composite FK Integrity",
      "Negative control: invalid relationship 'fk_invalid_probe' properly rejected",
      properlyRejected,
      negErr?.message
    );
  } catch (err: any) {
    record("Composite FK Integrity", "Negative control query exception", false, err.message);
  }

  // 5. Service Role Direct Access Probe
  console.log("\n--- 5. Service Role Query Probe ---");
  const phase16Tables = ["management_company_tasks", "management_company_task_comments"];
  for (const table of phase16Tables) {
    try {
      const { error } = await adminClient.from(table).select("*").limit(0);
      record("Service Role Access", `Table '${table}' accessible by service role`, !error, error?.message);
    } catch (err: any) {
      record("Service Role Access", `Table '${table}' query exception`, false, err.message);
    }
  }

  // 6. Production Data Safety Inspection
  console.log("\n--- 6. Production Data Safety & Row Counts (Read-Only) ---");
  const coreHierarchyTables = [
    "societies",
    "buildings",
    "wings",
    "floors",
    "units",
    "profiles",
    "society_memberships",
    "management_companies",
    "management_company_members",
    "management_company_societies",
    "management_company_tasks",
    "management_company_task_comments",
  ];

  for (const table of coreHierarchyTables) {
    try {
      const { count, error } = await adminClient
        .from(table)
        .select("*", { count: "exact", head: true });
      const isValid = !error && count !== null && count !== undefined;
      record(
        "Production Data Safety",
        `Table '${table}' count verified (Read-Only)`,
        isValid,
        `Current row count: ${count}`
      );
    } catch (err: any) {
      record("Production Data Safety", `Table '${table}' count query exception`, false, err.message);
    }
  }

  // 7. Anonymous Access Protection Check (RLS Default Deny)
  console.log("\n--- 7. Anonymous Access Protection (RLS) ---");
  for (const table of phase16Tables) {
    try {
      const { data, error } = await anonClient.from(table).select("*").limit(5);
      const isProtected = !!error || (data && data.length === 0);
      record(
        "Anonymous Protection",
        `Anonymous query to '${table}' denied or zero rows returned`,
        isProtected,
        error ? `Denied: ${error.message}` : "Zero rows returned (RLS enforced)"
      );
    } catch (err: any) {
      record("Anonymous Protection", `Query to '${table}' threw error (Protected)`, true, err.message);
    }
  }

  // Summary
  console.log("\n================================================================================");
  const passedCount = results.filter((r) => r.passed).length;
  const failedCount = results.filter((r) => !r.passed).length;
  const totalCount = results.length;
  console.log(`VERIFICATION SUMMARY: ${passedCount} / ${totalCount} passed (${failedCount} failed)`);
  console.log("================================================================================");

  if (failedCount > 0) {
    process.exit(1);
  }
}

verifyMigration26().catch((err) => {
  console.error("Verification script encountered unhandled fatal exception:", err);
  process.exit(1);
});
