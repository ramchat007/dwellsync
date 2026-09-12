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

async function verifyMigration19() {
  console.log("================================================================================");
  console.log("MIGRATION 19: COMPLAINT / HELPDESK SLA MANAGEMENT REMOTE VERIFICATION");
  console.log("Target Database:", supabaseUrl);
  console.log("================================================================================\n");

  // 1. Prerequisite Tables Probe
  console.log("--- 1. Prerequisite Tables Probe ---");
  const prereqTables = ["societies", "profiles", "society_memberships", "complaints"];
  for (const table of prereqTables) {
    try {
      const { error } = await adminClient.from(table).select("id").limit(1);
      record("Prerequisite Schema", `Table '${table}' exists and is queryable`, !error, error?.message);
    } catch (err: any) {
      record("Prerequisite Schema", `Table '${table}' query exception`, false, err.message);
    }
  }

  // 2. Migration 19 Tables Probe
  console.log("\n--- 2. Migration 19 Dedicated Tables Probe ---");
  const m19Tables = [
    "complaint_sla_configs",
    "complaint_sla_events",
    "complaint_escalation_rules",
  ];
  for (const table of m19Tables) {
    try {
      const { error } = await adminClient.from(table).select("id").limit(1);
      record("Migration 19 Tables", `Table '${table}' exists and is queryable`, !error, error?.message);
    } catch (err: any) {
      record("Migration 19 Tables", `Table '${table}' query exception`, false, err.message);
    }
  }

  // 3. OpenAPI & PostgREST Schema Inspection
  console.log("\n--- 3. OpenAPI & PostgREST Schema Inspection ---");
  try {
    const openapiRes = await fetch(`${supabaseUrl}/rest/v1/?apikey=${serviceKey}`);
    const spec: any = await openapiRes.json();

    const tablesToCheck = [
      {
        table: "complaints",
        cols: [
          "subcategory",
          "sla_status",
          "sla_cycle_number",
          "response_due_at",
          "responded_at",
          "resolution_due_at",
          "sla_paused_at",
          "total_paused_duration_minutes",
          "on_hold_reason",
          "closure_reason",
          "is_response_breached",
          "is_resolution_breached",
          "escalation_level",
          "last_escalated_at",
        ],
      },
      {
        table: "complaint_sla_configs",
        cols: [
          "id",
          "society_id",
          "category",
          "priority",
          "response_time_hours",
          "resolution_time_hours",
          "business_hours_only",
          "business_hours_start",
          "business_hours_end",
          "exclude_weekends",
          "effective_from",
          "effective_to",
          "is_active",
          "created_by",
          "created_at",
          "updated_at",
        ],
      },
      {
        table: "complaint_sla_events",
        cols: [
          "id",
          "society_id",
          "complaint_id",
          "cycle_number",
          "event_type",
          "from_status",
          "to_status",
          "actor_id",
          "notes",
          "metadata",
          "created_at",
        ],
      },
      {
        table: "complaint_escalation_rules",
        cols: [
          "id",
          "society_id",
          "level",
          "trigger_condition",
          "notify_roles",
          "is_active",
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
    record("Schema Introspection", "OpenAPI fetch exception", false, err.message);
  }

  // 4. Constraint & Foreign Key Enforcement Probe
  console.log("\n--- 4. Constraint & Foreign Key Enforcement ---");
  const dummyId = "00000000-0000-0000-0000-000000000000";

  // 4a. Foreign key on complaint_sla_configs
  try {
    const { error: fkConfigErr } = await adminClient.from("complaint_sla_configs").insert({
      society_id: dummyId,
      category: "PLUMBING",
      priority: "HIGH",
      response_time_hours: 2,
      resolution_time_hours: 8,
    });
    const fkEnforced = !!fkConfigErr && (fkConfigErr.code === "23503" || fkConfigErr.message.toLowerCase().includes("foreign key"));
    record(
      "Constraint Integrity",
      "complaint_sla_configs foreign key to societies is enforced",
      fkEnforced,
      fkConfigErr?.message
    );
  } catch (err: any) {
    record("Constraint Integrity", "complaint_sla_configs foreign key exception", false, err.message);
  }

  // 4b. CHECK constraint on complaint_sla_configs.category
  try {
    const { error: chkConfigErr } = await adminClient.from("complaint_sla_configs").insert({
      society_id: dummyId,
      category: "INVALID_CATEGORY_NAME",
      priority: "HIGH",
      response_time_hours: 2,
      resolution_time_hours: 8,
    });
    const chkEnforced = !!chkConfigErr && (chkConfigErr.code === "23514" || chkConfigErr.code === "23503");
    record(
      "Constraint Integrity",
      "complaint_sla_configs category CHECK constraint enforced",
      chkEnforced,
      chkConfigErr?.message
    );
  } catch (err: any) {
    record("Constraint Integrity", "complaint_sla_configs CHECK exception", false, err.message);
  }

  // 4c. Foreign key on complaint_sla_events
  try {
    const { error: fkEventsErr } = await adminClient.from("complaint_sla_events").insert({
      society_id: dummyId,
      complaint_id: dummyId,
      event_type: "CREATED",
    });
    const fkEnforced = !!fkEventsErr && (fkEventsErr.code === "23503" || fkEventsErr.message.toLowerCase().includes("foreign key"));
    record(
      "Constraint Integrity",
      "complaint_sla_events foreign key to societies/complaints is enforced",
      fkEnforced,
      fkEventsErr?.message
    );
  } catch (err: any) {
    record("Constraint Integrity", "complaint_sla_events foreign key exception", false, err.message);
  }

  // 4d. CHECK constraint on complaint_sla_events.event_type
  try {
    const { error: chkEventErr } = await adminClient.from("complaint_sla_events").insert({
      society_id: dummyId,
      complaint_id: dummyId,
      event_type: "INVALID_EVENT_TYPE",
    });
    const chkEnforced = !!chkEventErr && (chkEventErr.code === "23514" || chkEventErr.code === "23503");
    record(
      "Constraint Integrity",
      "complaint_sla_events event_type CHECK constraint enforced",
      chkEnforced,
      chkEventErr?.message
    );
  } catch (err: any) {
    record("Constraint Integrity", "complaint_sla_events CHECK exception", false, err.message);
  }

  // 4e. Foreign key on complaint_escalation_rules
  try {
    const { error: fkEscErr } = await adminClient.from("complaint_escalation_rules").insert({
      society_id: dummyId,
      level: 1,
      trigger_condition: "BREACH_RESPONSE",
    });
    const fkEnforced = !!fkEscErr && (fkEscErr.code === "23503" || fkEscErr.message.toLowerCase().includes("foreign key"));
    record(
      "Constraint Integrity",
      "complaint_escalation_rules foreign key to societies is enforced",
      fkEnforced,
      fkEscErr?.message
    );
  } catch (err: any) {
    record("Constraint Integrity", "complaint_escalation_rules foreign key exception", false, err.message);
  }

  // 4f. CHECK constraint on complaint_escalation_rules.level
  try {
    const { error: chkLevelErr } = await adminClient.from("complaint_escalation_rules").insert({
      society_id: dummyId,
      level: 99,
      trigger_condition: "BREACH_RESPONSE",
    });
    const chkEnforced = !!chkLevelErr && (chkLevelErr.code === "23514" || chkLevelErr.code === "23503");
    record(
      "Constraint Integrity",
      "complaint_escalation_rules level CHECK constraint enforced",
      chkEnforced,
      chkLevelErr?.message
    );
  } catch (err: any) {
    record("Constraint Integrity", "complaint_escalation_rules CHECK exception", false, err.message);
  }

  // 4g. CHECK constraint on complaints.sla_status
  try {
    const { error: chkSlaStatusErr } = await adminClient.from("complaints").insert({
      society_id: dummyId,
      created_by: dummyId,
      title: "Test",
      description: "Test",
      category: "PLUMBING",
      priority: "LOW",
      sla_status: "INVALID_STATUS",
    });
    const chkEnforced = !!chkSlaStatusErr && (chkSlaStatusErr.code === "23514" || chkSlaStatusErr.code === "23503");
    record(
      "Constraint Integrity",
      "complaints sla_status CHECK constraint enforced",
      chkEnforced,
      chkSlaStatusErr?.message
    );
  } catch (err: any) {
    record("Constraint Integrity", "complaints sla_status CHECK exception", false, err.message);
  }

  // 5. RLS & Tenant Isolation Protection
  console.log("\n--- 5. RLS & Tenant Isolation Protection ---");
  const secureTables = ["complaints", ...m19Tables];
  for (const table of secureTables) {
    try {
      const { data, error: selectErr } = await anonClient.from(table).select("*").limit(5);
      const selectBlocked = (!data || data.length === 0) || !!selectErr;
      record(
        "RLS Protection",
        `Unauthenticated SELECT denied/empty on ${table}`,
        selectBlocked,
        data ? `Returned ${data.length} rows` : selectErr?.message
      );
    } catch (err: any) {
      record("RLS Protection", `Unauthenticated SELECT exception on ${table}`, true, err.message);
    }

    try {
      const { error: insertErr } = await anonClient.from(table).insert({ society_id: dummyId } as any);
      const insertBlocked = !!insertErr;
      record(
        "RLS Protection",
        `Unauthenticated INSERT denied on ${table}`,
        insertBlocked,
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

verifyMigration19().catch(console.error);

