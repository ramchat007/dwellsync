import { config } from "dotenv";
config({ path: ".env.local" });

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const client = createClient(supabaseUrl, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function checkTables() {
  const tables = [
    "societies",
    "profiles",
    "society_memberships",
    "society_meetings",
    "platform_admins",
    "society_settings",
    "governance_resolutions",
    "society_access_requests",
    "committees",
    "committee_members",
    "meeting_agendas",
    "meeting_attendees",
    "meeting_minutes",
    "meeting_action_items",
  ];

  console.log("Checking tables on remote DB:", supabaseUrl);
  for (const table of tables) {
    const { error } = await client.from(table).select("*").limit(0);
    console.log(`Table '${table}': ${error ? `NOT FOUND / ERROR (${error.message})` : "EXISTS"}`);
  }

  console.log("\nChecking OpenAPI schema definitions...");
  try {
    const res = await fetch(`${supabaseUrl}/rest/v1/?apikey=${serviceKey}`);
    const spec: any = await res.json();
    const hasSocietySettings = !!spec.definitions?.society_settings;
    const hasResolutions = !!spec.definitions?.governance_resolutions;
    console.log(`OpenAPI definitions -> society_settings: ${hasSocietySettings ? "EXISTS" : "NOT FOUND"}`);
    console.log(`OpenAPI definitions -> governance_resolutions: ${hasResolutions ? "EXISTS" : "NOT FOUND"}`);
    if (hasSocietySettings) {
      console.log("society_settings properties:", Object.keys(spec.definitions.society_settings.properties || {}));
    }
    if (hasResolutions) {
      console.log("governance_resolutions properties:", Object.keys(spec.definitions.governance_resolutions.properties || {}));
    }
  } catch (err: any) {
    console.error("OpenAPI fetch failed:", err.message);
  }
}

checkTables().catch(console.error);

