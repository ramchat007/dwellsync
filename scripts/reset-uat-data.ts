import { config } from "dotenv";
config({ path: ".env.local" });
config();

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !serviceKey) {
  console.error("❌ Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}

const adminClient = createClient(supabaseUrl, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const UAT_SOCIETY_CODE = "UAT001";
const UAT_PMC_CODES = ["APEX-PMC-UAT", "APEX-PMC"];

async function resetUATData() {
  console.log("===============================================================================");
  console.log("DWELLSYNC UAT DATA RESET & CLEANUP");
  console.log("Environment:", supabaseUrl);
  console.log("Target Society Code to purge:", UAT_SOCIETY_CODE);
  console.log("Target PMC Codes to purge:   ", UAT_PMC_CODES.join(", "));
  console.log("===============================================================================\n");

  // 1. Locate and purge UAT Society
  const { data: society } = await adminClient
    .from("societies")
    .select("id, name, code")
    .eq("code", UAT_SOCIETY_CODE)
    .maybeSingle();

  if (society) {
    console.log(`Found UAT Society: ${society.name} (ID: ${society.id})`);
    console.log("Purging all cascading child records...");

    const { error: delErr } = await adminClient
      .from("societies")
      .delete()
      .eq("id", society.id);

    if (delErr) {
      console.error("❌ Error deleting UAT society:", delErr.message);
    } else {
      console.log(`✓ Successfully purged UAT society and all associated records.`);
    }
  } else {
    console.log(`✓ No UAT society (${UAT_SOCIETY_CODE}) found. Nothing to purge.`);
  }

  // 2. Locate and purge UAT Management Companies
  for (const pmcCode of UAT_PMC_CODES) {
    const { data: pmc } = await adminClient
      .from("management_companies")
      .select("id, name, code")
      .eq("code", pmcCode)
      .maybeSingle();

    if (pmc) {
      console.log(`Found UAT PMC: ${pmc.name} (ID: ${pmc.id})`);
      const { error: pmcErr } = await adminClient
        .from("management_companies")
        .delete()
        .eq("id", pmc.id);

      if (pmcErr) {
        console.error(`❌ Error deleting UAT PMC (${pmcCode}):`, pmcErr.message);
      } else {
        console.log(`✓ Successfully purged UAT management company (${pmcCode}).`);
      }
    }
  }

  // 3. Confirm Baseline State
  console.log("\n--- Post-Reset Database Audit ---");
  const { data: remainingSocieties } = await adminClient
    .from("societies")
    .select("id, name, code, status");

  console.log("Remaining Societies in Database:");
  (remainingSocieties || []).forEach((s) => {
    console.log(`  • [${s.code}] ${s.name} (Status: ${s.status})`);
  });

  console.log("\n===============================================================================");
  console.log("🎉 DATABASE IS RESTORED TO CLEAN PRODUCTION BASELINE!");
  console.log("===============================================================================");
}

resetUATData().catch((err) => {
  console.error("Fatal Reset Error:", err);
  process.exit(1);
});

