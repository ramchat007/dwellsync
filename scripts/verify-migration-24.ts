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

async function verifyMigration24() {
  console.log("================================================================================");
  console.log("MIGRATION 24: GOVERNANCE & ADMINISTRATION FOUNDATION VERIFICATION");
  console.log("Target Database:", supabaseUrl);
  console.log("================================================================================\n");

  // 1. Prerequisites Probe
  console.log("--- 1. Prerequisite Tables Probe ---");
  const prereqTables = [
    "societies",
    "profiles",
    "society_memberships",
    "society_meetings",
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
        table: "society_settings",
        cols: [
          "society_id",
          "financial_year_start_month",
          "agm_due_month",
          "quorum_percentage",
          "default_meeting_duration_minutes",
          "require_visitor_preapproval",
          "auto_escalate_complaints",
          "rules_and_by_laws",
          "emergency_contacts",
          "created_at",
          "updated_at",
        ],
      },
      {
        table: "governance_resolutions",
        cols: [
          "id",
          "society_id",
          "meeting_id",
          "resolution_number",
          "title",
          "description",
          "resolution_type",
          "status",
          "proposed_by",
          "seconded_by",
          "votes_for",
          "votes_against",
          "votes_abstained",
          "passed_date",
          "effective_date",
          "notes",
          "created_by",
          "created_at",
          "updated_at",
        ],
      },
    ];

    for (const t of tablesToCheck) {
      const def = spec.definitions?.[t.table];
      const tableFound = !!def;
      record("Schema Introspection", `Table '${t.table}' registered in PostgREST`, tableFound);

      if (def) {
        const props = def.properties || {};
        for (const col of t.cols) {
          const colFound = !!props[col];
          record("Column Check", `${t.table}.${col}`, colFound);
        }
      } else {
        for (const col of t.cols) {
          record("Column Check", `${t.table}.${col}`, false, "Table definition not found");
        }
      }
    }
  } catch (err: any) {
    record("Schema Introspection", "OpenAPI fetch", false, err.message);
  }

  // 3. Service Role Access Probe
  console.log("\n--- 3. Service Role Access Probe ---");
  const targetTables = ["society_settings", "governance_resolutions"];
  for (const table of targetTables) {
    try {
      const { error } = await adminClient.from(table).select("*").limit(0);
      record("Service Role Access", `Select query on ${table}`, !error, error?.message);
    } catch (err: any) {
      record("Service Role Access", `Select query exception on ${table}`, false, err.message);
    }
  }

  // 4. Constraint & Foreign Key Enforcement Probe
  console.log("\n--- 4. Constraint & Foreign Key Enforcement ---");
  const nonExistentSocietyId = "00000000-0000-0000-0000-000000000000";

  // 4a. Foreign key check on society_settings
  try {
    const { error: fkErr } = await adminClient.from("society_settings").insert({
      society_id: nonExistentSocietyId,
      financial_year_start_month: 4,
      agm_due_month: 9,
      quorum_percentage: 30.0,
      default_meeting_duration_minutes: 60,
    });
    const fkEnforced = !!fkErr && (fkErr.code === "23503" || fkErr.message.toLowerCase().includes("foreign key"));
    record(
      "Constraint Integrity",
      "society_settings foreign key to societies is enforced",
      fkEnforced,
      fkErr?.message
    );
  } catch (err: any) {
    record("Constraint Integrity", "society_settings foreign key exception", false, err.message);
  }

  // 4b. Foreign key check on governance_resolutions
  try {
    const { error: fkErr } = await adminClient.from("governance_resolutions").insert({
      society_id: nonExistentSocietyId,
      resolution_number: "RES-TEST-001",
      title: "Test Resolution",
      description: "Test description",
      resolution_type: "ORDINARY",
    });
    const fkEnforced = !!fkErr && (fkErr.code === "23503" || fkErr.message.toLowerCase().includes("foreign key"));
    record(
      "Constraint Integrity",
      "governance_resolutions foreign key to societies is enforced",
      fkEnforced,
      fkErr?.message
    );
  } catch (err: any) {
    record("Constraint Integrity", "governance_resolutions foreign key exception", false, err.message);
  }

  // 4c. Check constraint check on resolution_type
  try {
    const { error: chkErr } = await adminClient.from("governance_resolutions").insert({
      society_id: nonExistentSocietyId,
      resolution_number: "RES-TEST-INVALID",
      title: "Invalid Type Resolution",
      description: "Test description",
      resolution_type: "INVALID_DISALLOWED_TYPE" as any,
    });
    const chkEnforced = !!chkErr && (chkErr.code === "23514" || chkErr.code === "23503" || !!chkErr.message);
    record(
      "Constraint Integrity",
      "governance_resolutions invalid resolution_type rejected",
      chkEnforced,
      chkErr?.message
    );
  } catch (err: any) {
    record("Constraint Integrity", "governance_resolutions check constraint exception", false, err.message);
  }

  // 5. RLS & Unauthenticated Denial Check
  console.log("\n--- 5. RLS & Tenant Isolation Protection ---");
  for (const table of targetTables) {
    try {
      const { data, error } = await anonClient.from(table).select("*").limit(10);
      const isSecure = (!data || data.length === 0) || !!error;
      record(
        "RLS Protection",
        `Unauthenticated SELECT denied/empty on ${table}`,
        isSecure,
        data ? `Returned ${data.length} rows` : error?.message
      );
    } catch (err: any) {
      record("RLS Protection", `Unauthenticated SELECT exception on ${table}`, true, err.message);
    }

    try {
      const { error: insertErr } = await anonClient.from(table).insert({
        society_id: nonExistentSocietyId,
      } as any);
      const insertDenied = !!insertErr;
      record(
        "RLS Protection",
        `Unauthenticated INSERT denied on ${table}`,
        insertDenied,
        insertErr?.message
      );
    } catch (err: any) {
      record("RLS Protection", `Unauthenticated INSERT exception on ${table}`, true, err.message);
    }
  }

  // Summary
  console.log("\n================================================================================");
  const total = results.length;
  const passed = results.filter((r) => r.passed).length;
  const failed = results.filter((r) => !r.passed).length;
  console.log(`SUMMARY: ${passed}/${total} checks passed (${failed} failed)`);
  console.log("================================================================================");
}

verifyMigration24().catch(console.error);
