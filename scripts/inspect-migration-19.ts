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

async function runPreflight() {
  console.log("================================================================");
  console.log("MIGRATION 19 PRE-FLIGHT: COMPLAINTS / SLA MANAGEMENT INSPECTION");
  console.log("Remote Target:", supabaseUrl);
  console.log("================================================================\n");

  // 1. Check Prerequisite Tables
  console.log("--- 1. Checking Prerequisite Tables ---");
  const prereqs = ["societies", "profiles", "society_memberships", "complaints"];
  for (const table of prereqs) {
    const { error } = await adminClient.from(table).select("*").limit(0);
    console.log(`Table '${table}': ${error ? `NOT FOUND / ERROR (${error.message})` : "EXISTS"}`);
  }

  // 2. Check Migration 19 Tables
  console.log("\n--- 2. Checking Migration 19 Dedicated Tables ---");
  const m19Tables = [
    "complaint_sla_configs",
    "complaint_sla_events",
    "complaint_escalation_rules",
  ];
  for (const table of m19Tables) {
    const { error } = await adminClient.from(table).select("*").limit(0);
    console.log(`Table '${table}': ${error ? `NOT FOUND / ERROR (${error.message})` : "EXISTS"}`);
  }

  // 3. OpenAPI Schema Inspection
  console.log("\n--- 3. OpenAPI Schema Inspection ---");
  try {
    const res = await fetch(`${supabaseUrl}/rest/v1/?apikey=${serviceKey}`);
    const spec: any = await res.json();

    console.log("\nInspecting 'complaints' columns in OpenAPI...");
    const complaintsDef = spec.definitions?.complaints;
    if (complaintsDef) {
      console.log("Found 'complaints' definition. Properties:");
      const props = Object.keys(complaintsDef.properties || {});
      const expectedCols = [
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
      ];
      for (const col of expectedCols) {
        console.log(`   - complaints.${col}: ${props.includes(col) ? "EXISTS" : "MISSING"}`);
      }
    } else {
      console.log("'complaints' definition not found in OpenAPI");
    }

    for (const table of m19Tables) {
      console.log(`\nInspecting '${table}' in OpenAPI...`);
      const def = spec.definitions?.[table];
      if (def) {
        console.log(`Found '${table}' definition. Columns:`, Object.keys(def.properties || {}));
      } else {
        console.log(`'${table}' definition NOT found in OpenAPI`);
      }
    }
  } catch (err: any) {
    console.error("OpenAPI fetch failed:", err.message);
  }

  // 4. Check Existing Data count in complaints
  console.log("\n--- 4. Checking Existing Data Count in 'complaints' ---");
  try {
    const { count, error } = await adminClient
      .from("complaints")
      .select("*", { count: "exact", head: true });
    if (error) {
      console.log("Error querying complaints count:", error.message);
    } else {
      console.log(`Existing rows in 'complaints': ${count}`);
    }
  } catch (err: any) {
    console.log("Count query exception:", err.message);
  }

  // 5. Unauthenticated RLS Denial Check
  console.log("\n--- 5. Unauthenticated RLS Denial Check ---");
  const allTables = ["complaints", ...m19Tables];
  for (const table of allTables) {
    try {
      const { data, error } = await anonClient.from(table).select("*").limit(5);
      const isBlocked = (!data || data.length === 0) || !!error;
      console.log(
        `Table '${table}' anon read: ${isBlocked ? "SECURED (0 rows returned or error)" : `UNSECURED (${data?.length} rows)`} ${error ? `(${error.message})` : ""}`
      );
    } catch (err: any) {
      console.log(`Table '${table}' anon read exception:`, err.message);
    }
  }

  console.log("\n================================================================");
  console.log("Migration 19 Pre-flight inspection finished.");
  console.log("================================================================");
}

runPreflight().catch(console.error);

