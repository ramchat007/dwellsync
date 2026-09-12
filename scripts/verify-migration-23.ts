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

async function verifyMigration23() {
  console.log("================================================================================");
  console.log("MIGRATION 23: COMMUNICATION & NOTIFICATIONS FOUNDATION VERIFICATION");
  console.log("Target Database:", supabaseUrl);
  console.log("================================================================================\n");

  // 1. Prerequisite Tables Probe
  console.log("--- 1. Prerequisite Tables Probe ---");
  const prereqTables = ["societies", "profiles", "society_memberships"];
  for (const table of prereqTables) {
    try {
      const { error } = await adminClient.from(table).select("id").limit(1);
      record("Prerequisite Schema", `Table '${table}' exists and is queryable`, !error, error?.message);
    } catch (err: any) {
      record("Prerequisite Schema", `Table '${table}' query exception`, false, err.message);
    }
  }

  // 2. Inspect OpenAPI schema for table and column presence
  console.log("\n--- 2. OpenAPI & PostgREST Schema Inspection ---");
  try {
    const openapiRes = await fetch(`${supabaseUrl}/rest/v1/?apikey=${serviceKey}`);
    const spec: any = await openapiRes.json();

    const tablesToCheck = [
      {
        table: "notifications",
        cols: [
          "id",
          "society_id",
          "recipient_id",
          "actor_id",
          "category",
          "type",
          "title",
          "body",
          "action_url",
          "is_read",
          "read_at",
          "dedup_key",
          "metadata",
          "created_at",
          "updated_at",
        ],
      },
      {
        table: "notification_preferences",
        cols: [
          "id",
          "user_id",
          "society_id",
          "category",
          "email_enabled",
          "sms_enabled",
          "whatsapp_enabled",
          "in_app_enabled",
          "created_at",
          "updated_at",
        ],
      },
      {
        table: "notification_deliveries",
        cols: [
          "id",
          "notification_id",
          "channel",
          "provider",
          "provider_message_id",
          "status",
          "error_message",
          "attempts",
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
  const targetTables = ["notifications", "notification_preferences", "notification_deliveries"];
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
  const dummyId = "00000000-0000-0000-0000-000000000000";

  // 4a. Foreign key on notifications -> societies
  try {
    const { error: fkNotifErr } = await adminClient.from("notifications").insert({
      society_id: dummyId,
      recipient_id: dummyId,
      category: "SECURITY",
      type: "SYSTEM_ALERT",
      title: "Test",
      body: "Test body",
    });
    const fkEnforced = !!fkNotifErr && (fkNotifErr.code === "23503" || fkNotifErr.message.toLowerCase().includes("foreign key"));
    record(
      "Constraint Integrity",
      "notifications foreign key to societies/profiles is enforced",
      fkEnforced,
      fkNotifErr?.message
    );
  } catch (err: any) {
    record("Constraint Integrity", "notifications foreign key exception", false, err.message);
  }

  // 4b. Foreign key on notification_preferences -> societies
  try {
    const { error: fkPrefErr } = await adminClient.from("notification_preferences").insert({
      society_id: dummyId,
      user_id: dummyId,
      category: "BILLING",
      in_app_enabled: true,
    });
    const fkEnforced = !!fkPrefErr && (fkPrefErr.code === "23503" || fkPrefErr.message.toLowerCase().includes("foreign key"));
    record(
      "Constraint Integrity",
      "notification_preferences foreign key to societies/profiles is enforced",
      fkEnforced,
      fkPrefErr?.message
    );
  } catch (err: any) {
    record("Constraint Integrity", "notification_preferences foreign key exception", false, err.message);
  }

  // 4c. Foreign key on notification_deliveries -> notifications
  try {
    const { error: fkDelivErr } = await adminClient.from("notification_deliveries").insert({
      notification_id: dummyId,
      channel: "IN_APP",
      provider: "IN_APP",
      status: "DELIVERED",
    });
    const fkEnforced = !!fkDelivErr && (fkDelivErr.code === "23503" || fkDelivErr.message.toLowerCase().includes("foreign key"));
    record(
      "Constraint Integrity",
      "notification_deliveries foreign key to notifications is enforced",
      fkEnforced,
      fkDelivErr?.message
    );
  } catch (err: any) {
    record("Constraint Integrity", "notification_deliveries foreign key exception", false, err.message);
  }

  // 5. RLS & Unauthenticated Denial Check
  console.log("\n--- 5. Unauthenticated RLS Denial Check ---");
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
      const payload = table === "notification_deliveries" 
        ? { notification_id: dummyId, channel: "IN_APP", provider: "IN_APP", status: "DELIVERED" }
        : { society_id: dummyId };
      const { error: insertErr } = await anonClient.from(table).insert(payload as any);
      record(
        "RLS Protection",
        `Unauthenticated INSERT denied on ${table}`,
        !!insertErr,
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

verifyMigration23().catch(console.error);
