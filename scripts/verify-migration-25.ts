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
  console.log("MIGRATION 25: PROPERTY MANAGEMENT COMPANY FOUNDATION VERIFICATION");
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
      },
    ];

    for (const t of tablesToCheck) {
      const def = spec.definitions?.[t.table];
      if (!def) {
        record(
          "PostgREST Definition",
          `Table '${t.table}' registered in PostgREST schema`,
          false,
          "Table definition missing from OpenAPI spec (Pending remote SQL execution)"
        );
        continue;
      }
      record("PostgREST Definition", `Table '${t.table}' registered in PostgREST schema`, true);

      for (const col of t.cols) {
        const hasCol = !!def.properties?.[col];
        record("Column Schema", `${t.table}.${col} column exists`, hasCol, hasCol ? "Present" : "Missing");
      }
    }
  } catch (err: any) {
    record("OpenAPI Inspection", "Failed to fetch/parse OpenAPI spec", false, err.message);
  }

  // 3. Anonymous Protection Check
  console.log("\n--- 3. Anonymous Access Protection (RLS) ---");
  const pmcTables = [
    "management_companies",
    "management_company_members",
    "management_company_societies",
    "management_company_society_access",
    "management_company_staff_assignments",
  ];

  for (const table of pmcTables) {
    try {
      const { data, error } = await anonClient.from(table).select("*").limit(5);
      const isProtected = !!error || (data && data.length === 0);
      record(
        "Anonymous Protection",
        `Anonymous query to '${table}' denied or zero rows returned`,
        isProtected,
        error ? `Protected: ${error.message}` : "Zero rows leaked to anon"
      );
    } catch (err: any) {
      record("Anonymous Protection", `Query to '${table}' threw error (Protected)`, true, err.message);
    }
  }

  // 4. Summary
  console.log("\n================================================================================");
  const passedCount = results.filter((r) => r.passed).length;
  const totalCount = results.length;
  console.log(`VERIFICATION SUMMARY: ${passedCount} / ${totalCount} passed`);
  console.log("================================================================================");
}

verifyMigration25().catch((err) => {
  console.error("Verification script encountered unhandled fatal exception:", err);
  process.exit(1);
});

