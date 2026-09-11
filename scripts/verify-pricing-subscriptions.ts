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

async function verifyAll() {
  console.log("================================================================================");
  console.log("PHASE MIGRATION 21: PRICING + SUBSCRIPTIONS REMOTE DB VERIFICATION");
  console.log("Target Database:", supabaseUrl);
  console.log("================================================================================\n");

  // 1. Inspect OpenAPI schema for table and column presence
  console.log("--- 1. OpenAPI Introspection ---");
  try {
    const openapiRes = await fetch(`${supabaseUrl}/rest/v1/?apikey=${serviceKey}`);
    const spec: any = await openapiRes.json();

    const tablesToCheck = [
      {
        name: "subscription_plans",
        requiredCols: [
          "id",
          "code",
          "name",
          "description",
          "is_active",
          "monthly_price",
          "annual_price",
          "currency",
          "feature_limits",
          "enabled_features",
          "sort_order",
          "created_at",
          "updated_at",
        ],
      },
      {
        name: "society_subscriptions",
        requiredCols: [
          "id",
          "society_id",
          "plan_id",
          "status",
          "billing_cycle",
          "trial_start_date",
          "trial_end_date",
          "current_period_start",
          "current_period_end",
          "cancel_at_period_end",
          "cancelled_at",
          "provider",
          "metadata",
          "created_at",
          "updated_at",
        ],
      },
    ];

    for (const t of tablesToCheck) {
      const def = spec.definitions?.[t.name];
      const tableFound = !!def;
      record("Schema Introspection", `Table '${t.name}' registered in PostgREST`, tableFound);

      if (def) {
        const props = def.properties || {};
        for (const col of t.requiredCols) {
          const colFound = !!props[col];
          record("Column Check", `${t.name}.${col}`, colFound);
        }
      }
    }
  } catch (err: any) {
    record("Schema Introspection", "OpenAPI fetch", false, err.message);
  }

  // 2. Direct Query Access & Seeded Data Verification
  console.log("\n--- 2. Direct Query & Seeded Data Verification ---");
  try {
    const { data: plans, error: planErr } = await adminClient
      .from("subscription_plans")
      .select("*")
      .order("sort_order", { ascending: true });

    if (planErr) {
      record("Seeded Plans", "Fetch subscription_plans via AdminClient", false, planErr.message);
    } else {
      record("Seeded Plans", "Fetch subscription_plans via AdminClient", true, `Found ${plans?.length || 0} plans`);

      const codes = (plans || []).map((p: any) => p.code);
      record("Seeded Plans", "Contains 'FREE' plan", codes.includes("FREE"));
      record("Seeded Plans", "Contains 'BASIC' plan", codes.includes("BASIC"));
      record("Seeded Plans", "Contains 'PROFESSIONAL' plan", codes.includes("PROFESSIONAL"));
      record("Seeded Plans", "Contains 'ENTERPRISE' plan", codes.includes("ENTERPRISE"));

      const freePlan = (plans || []).find((p: any) => p.code === "FREE");
      if (freePlan) {
        const zeroPrice = Number(freePlan.monthly_price) === 0 && Number(freePlan.annual_price) === 0;
        record("Zero-Cost Constraint", "FREE plan monthly and annual price == 0", zeroPrice, `Monthly: ₹${freePlan.monthly_price}, Annual: ₹${freePlan.annual_price}`);
        record("Free Tier Quotas", "FREE plan has valid feature limits", !!freePlan.feature_limits?.max_units);
      }
    }

    const { data: subs, error: subErr } = await adminClient
      .from("society_subscriptions")
      .select("*")
      .limit(5);

    if (subErr) {
      record("Society Subscriptions", "Query society_subscriptions via AdminClient", false, subErr.message);
    } else {
      record("Society Subscriptions", "Query society_subscriptions via AdminClient", true, `Query succeeded`);
    }
  } catch (err: any) {
    record("Direct Query", "AdminClient query exception", false, err.message);
  }

  // 3. RLS Policies & Anon Access
  console.log("\n--- 3. RLS Verification ---");
  try {
    // Anon client should be able to view active plans
    const { data: anonPlans, error: anonPlanErr } = await anonClient
      .from("subscription_plans")
      .select("id, code, name, monthly_price")
      .eq("is_active", true);

    if (anonPlanErr) {
      record("RLS Read", "Anon client can read active subscription plans", false, anonPlanErr.message);
    } else {
      record("RLS Read", "Anon client can read active subscription plans", true, `Read ${anonPlans?.length || 0} active plans`);
    }

    // Anon client should NOT be able to insert plans
    const { error: anonInsertErr } = await anonClient
      .from("subscription_plans")
      .insert({
        code: "HACKED_PLAN",
        name: "Hacked Plan",
        monthly_price: 99999,
      } as any);

    record("RLS Guard", "Anon client cannot insert or mutate plans", !!anonInsertErr, anonInsertErr ? "Blocked by RLS as expected" : "SECURITY VIOLATION: Insert allowed!");

    // Anon client should NOT be able to view society subscriptions
    const { data: anonSubs, error: anonSubErr } = await anonClient
      .from("society_subscriptions")
      .select("*");

    const blocked = !anonSubs || anonSubs.length === 0 || !!anonSubErr;
    record("RLS Guard", "Anon client cannot access tenant society subscriptions", blocked, anonSubErr ? anonSubErr.message : `Returned ${anonSubs?.length || 0} rows`);
  } catch (err: any) {
    record("RLS Guard", "Anon query exception", false, err.message);
  }

  // 4. Summary Output
  console.log("\n================================================================================");
  console.log("VERIFICATION SUMMARY");
  console.log("================================================================================");
  const total = results.length;
  const passed = results.filter((r) => r.passed).length;
  const failed = results.filter((r) => !r.passed).length;
  console.log(`Total Checks: ${total} | Passed: ${passed} | Failed: ${failed}`);

  if (failed > 0) {
    console.log("\nFailed Items:");
    results.filter((r) => !r.passed).forEach((r) => {
      console.log(`- [${r.category}] ${r.name}: ${r.details || "Failed"}`);
    });
  }
}

verifyAll().catch(console.error);

