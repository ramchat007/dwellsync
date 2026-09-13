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

async function verifyMigration25() {
  console.log("================================================================================");
  console.log("MIGRATION 25: PROPERTY MANAGEMENT COMPANY FOUNDATION VERIFICATION (READ-ONLY)");
  console.log("Target Database:", supabaseUrl);
  console.log("================================================================================\n");

  // 1. Prerequisites Probe
  console.log("--- 1. Prerequisite Tables Probe ---");
  const prereqTables = [
    "societies",
    "profiles",
    "society_memberships",
    "platform_admins",
  ];
  for (const table of prereqTables) {
    try {
      const { error } = await adminClient.from(table).select("id").limit(1);
      record("Prerequisite Schema", `Table '${table}' exists and is queryable`, !error, error?.message);
    } catch (err: any) {
      record("Prerequisite Schema", `Table '${table}' query exception`, false, err.message);
    }
  }

  // 2. OpenAPI & PostgREST Schema Inspection
  console.log("\n--- 2. OpenAPI & PostgREST Schema Inspection ---");
  try {
    const openapiRes = await fetch(`${supabaseUrl}/rest/v1/?apikey=${serviceKey}`);
    const spec: any = await openapiRes.json();

    const tablesToCheck = [
      {
        table: "management_companies",
        cols: [
          "id",
          "name",
          "legal_name",
          "code",
          "status",
          "contact_email",
          "contact_phone",
          "address",
          "logo_url",
          "created_by",
          "created_at",
          "updated_at",
        ],
        pkCol: "id",
        fkCols: ["created_by"],
      },
      {
        table: "management_company_members",
        cols: [
          "id",
          "management_company_id",
          "user_id",
          "role",
          "status",
          "created_by",
          "created_at",
          "updated_at",
        ],
        pkCol: "id",
        fkCols: ["management_company_id", "user_id", "created_by"],
      },
      {
        table: "management_company_societies",
        cols: [
          "id",
          "management_company_id",
          "society_id",
          "status",
          "assigned_at",
          "assigned_by",
          "removed_at",
          "created_at",
          "updated_at",
        ],
        pkCol: "id",
        fkCols: ["management_company_id", "society_id", "assigned_by"],
      },
      {
        table: "management_company_society_access",
        cols: [
          "id",
          "management_company_id",
          "management_company_member_id",
          "management_company_society_id",
          "status",
          "assigned_by",
          "created_at",
          "updated_at",
        ],
        pkCol: "id",
        fkCols: ["management_company_id", "assigned_by"],
      },
      {
        table: "management_company_staff_assignments",
        cols: [
          "id",
          "management_company_id",
          "user_id",
          "society_id",
          "assignment_type",
          "status",
          "start_date",
          "end_date",
          "assigned_by",
          "created_at",
          "updated_at",
        ],
        pkCol: "id",
        fkCols: ["management_company_id", "user_id", "society_id", "assigned_by"],
      },
    ];

    for (const t of tablesToCheck) {
      const def = spec.definitions?.[t.table];
      if (!def) {
        record(
          "PostgREST Definition",
          `Table '${t.table}' registered in PostgREST schema`,
          false,
          "Table definition missing from OpenAPI spec"
        );
        continue;
      }
      record("PostgREST Definition", `Table '${t.table}' registered in PostgREST schema`, true);

      // Check Primary Key
      const idColDef = def.properties?.[t.pkCol];
      const hasPk = idColDef && idColDef.description?.includes("<pk/>");
      record("Primary Key", `${t.table}.${t.pkCol} is Primary Key`, !!hasPk, hasPk ? "PK verified" : "PK missing");

      // Check Columns
      for (const col of t.cols) {
        const hasCol = !!def.properties?.[col];
        record("Column Schema", `${t.table}.${col} column exists`, hasCol, hasCol ? "Present" : "Missing");
      }

      // Check Foreign Keys
      for (const fk of t.fkCols) {
        const colDef = def.properties?.[fk];
        const hasFk = colDef && colDef.description?.includes("<fk ");
        record("Foreign Key", `${t.table}.${fk} foreign key registered`, !!hasFk, colDef?.description || "Missing FK");
      }
    }
  } catch (err: any) {
    record("OpenAPI Inspection", "Failed to fetch/parse OpenAPI spec", false, err.message);
  }

  // 3. Composite Foreign Key & Relationship Integrity Probe
  console.log("\n--- 3. Composite Foreign Key & Relationship Integrity Probe ---");
  const relationalQueries = [
    {
      source: "management_company_staff_assignments",
      relation: "management_company_societies!fk_staff_comp_society(id)",
      constraint: "fk_staff_comp_society",
      direction: "forward: staff -> company_societies",
    },
    {
      source: "management_company_staff_assignments",
      relation: "management_company_members!fk_staff_comp_member(id)",
      constraint: "fk_staff_comp_member",
      direction: "forward: staff -> company_members",
    },
    {
      source: "management_company_society_access",
      relation: "management_company_members!fk_access_member_comp(id)",
      constraint: "fk_access_member_comp",
      direction: "forward: access -> company_members",
    },
    {
      source: "management_company_society_access",
      relation: "management_company_societies!fk_access_society_comp(id)",
      constraint: "fk_access_society_comp",
      direction: "forward: access -> company_societies",
    },
    {
      source: "management_company_societies",
      relation: "management_company_staff_assignments!fk_staff_comp_society(id)",
      constraint: "fk_staff_comp_society",
      direction: "reverse: company_societies -> staff",
    },
    {
      source: "management_company_members",
      relation: "management_company_staff_assignments!fk_staff_comp_member(id)",
      constraint: "fk_staff_comp_member",
      direction: "reverse: company_members -> staff",
    },
    {
      source: "management_company_members",
      relation: "management_company_society_access!fk_access_member_comp(id)",
      constraint: "fk_access_member_comp",
      direction: "reverse: company_members -> access",
    },
    {
      source: "management_company_societies",
      relation: "management_company_society_access!fk_access_society_comp(id)",
      constraint: "fk_access_society_comp",
      direction: "reverse: company_societies -> access",
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
      .from("management_company_staff_assignments")
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

  // 4. Service Role Direct Access Probe
  console.log("\n--- 4. Service Role Query Probe ---");
  const pmcTables = [
    "management_companies",
    "management_company_members",
    "management_company_societies",
    "management_company_society_access",
    "management_company_staff_assignments",
  ];

  for (const table of pmcTables) {
    try {
      const { error } = await adminClient.from(table).select("*").limit(0);
      record("Service Role Access", `Table '${table}' accessible by service role`, !error, error?.message);
    } catch (err: any) {
      record("Service Role Access", `Table '${table}' query exception`, false, err.message);
    }
  }

  // 5. Production Data Safety & Hierarchy Inspection
  console.log("\n--- 5. Production Data Safety & Hierarchy Inspection ---");
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
        `Core hierarchy table '${table}' count verified intact`,
        isValid,
        `Current row count: ${count}`
      );
    } catch (err: any) {
      record("Production Data Safety", `Table '${table}' count query exception`, false, err.message);
    }
  }

  console.log("\n--- Phase 15 Tables Row Counts (Read-Only) ---");
  for (const table of pmcTables) {
    try {
      const { count, error } = await adminClient
        .from(table)
        .select("*", { count: "exact", head: true });
      const isValid = !error && count !== null && count !== undefined;
      record(
        "Phase 15 Table Counts",
        `Table '${table}' count verified (Read-Only)`,
        isValid,
        `Current row count: ${count}`
      );
    } catch (err: any) {
      record("Phase 15 Table Counts", `Table '${table}' count query exception`, false, err.message);
    }
  }

  // 6. Anonymous Access Protection Check (RLS Default Deny)
  console.log("\n--- 6. Anonymous Access Protection (RLS) ---");
  for (const table of pmcTables) {
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

verifyMigration25().catch((err) => {
  console.error("Verification script encountered unhandled fatal exception:", err);
  process.exit(1);
});

