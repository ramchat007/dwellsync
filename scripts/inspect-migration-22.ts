import { config } from "dotenv";
config({ path: ".env.local" });

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const client = createClient(supabaseUrl, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function runPreflight() {
  console.log("================================================================");
  console.log("PRE-FLIGHT REMOTE DATABASE INSPECTION FOR MIGRATION 22");
  console.log("Database URL:", supabaseUrl);
  console.log("================================================================\n");

  // 1. Inspect OpenAPI / Rest API
  try {
    const res = await fetch(`${supabaseUrl}/rest/v1/?apikey=${serviceKey}`);
    const spec = await res.json();

    const importJobsDef = spec.definitions?.import_jobs;
    if (importJobsDef) {
      console.log("[STATUS] Table 'public.import_jobs' ALREADY EXISTS in remote schema.");
      console.log("Existing columns:", Object.keys(importJobsDef.properties || {}));
    } else {
      console.log("[STATUS] Table 'public.import_jobs' DOES NOT EXIST on remote database yet.");
    }
  } catch (err: any) {
    console.log("[WARN] OpenAPI fetch error:", err.message);
  }

  // 2. Direct Query Test
  console.log("\n--- Direct PostgREST Table Probe ---");
  const { data, error } = await client.from("import_jobs").select("*").limit(0);
  if (!error) {
    console.log("Direct query probe: 'import_jobs' is accessible.");
  } else {
    console.log(`Direct query probe: 'import_jobs' returned error -> ${error.message} (${error.code})`);
  }

  // 3. Check Prerequisite Tables
  console.log("\n--- Prerequisite Dependency Tables ---");
  const deps = ["societies", "profiles", "society_memberships", "platform_admins"];
  for (const dep of deps) {
    const { error: depErr } = await client.from(dep).select("id").limit(1);
    if (!depErr) {
      console.log(`  ✓ ${dep} exists and accessible`);
    } else {
      console.log(`  ✗ ${dep} error: ${depErr.message}`);
    }
  }

  console.log("\n================================================================");
  console.log("Pre-flight inspection complete.");
  console.log("================================================================");
}

runPreflight();

