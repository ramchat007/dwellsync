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

async function inspectSchema() {
  console.log("=== Fetching OpenAPI Schema from Remote Supabase ===");
  const res = await fetch(`${supabaseUrl}/rest/v1/?apikey=${serviceKey}`);
  const spec = await res.json();

  const tables = [
    "society_events",
    "event_rsvps",
    "society_polls",
    "poll_options",
    "poll_votes",
    "activity_reminders",
  ];

  for (const table of tables) {
    console.log(`\n---------------- ${table} ----------------`);
    const def = spec.definitions?.[table];
    if (!def) {
      console.log(`❌ Table definition NOT found in OpenAPI schema!`);
      continue;
    }
    console.log(`✅ Table definition found!`);
    console.log("Columns & Types:");
    const props = def.properties || {};
    for (const [col, info] of Object.entries(props)) {
      const typeInfo = (info as any).type || (info as any).format || JSON.stringify(info);
      console.log(`   - ${col}: ${typeInfo}`);
    }
  }

  console.log("\n=== Testing Query Access & RLS on Remote Database ===");
  for (const table of tables) {
    // Test admin access
    const adminRes = await adminClient.from(table).select("*").limit(1);
    if (adminRes.error) {
      console.log(`❌ Admin query on ${table} failed:`, adminRes.error.message);
    } else {
      console.log(`✅ Admin query on ${table} succeeded (count: ${adminRes.data.length})`);
    }

    // Test anon access (should return 0 rows or error due to RLS)
    const anonRes = await anonClient.from(table).select("*").limit(5);
    if (anonRes.error) {
      console.log(`🛡️ Anon access on ${table} properly restricted: ${anonRes.error.message}`);
    } else if (anonRes.data.length === 0) {
      console.log(`🛡️ Anon access on ${table} properly filtered by RLS (0 rows returned)`);
    } else {
      console.log(`⚠️ Anon query returned ${anonRes.data.length} rows on ${table}`);
    }
  }
}

inspectSchema().catch(console.error);

