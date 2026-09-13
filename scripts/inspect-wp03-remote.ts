import * as fs from "fs";
import * as path from "path";
import { createClient } from "@supabase/supabase-js";

// Load .env.local manually
const envPath = path.resolve(process.cwd(), ".env.local");
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, "utf8");
  for (const line of envContent.split("\n")) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith("#") && trimmed.includes("=")) {
      const idx = trimmed.indexOf("=");
      const key = trimmed.slice(0, idx).trim();
      const val = trimmed.slice(idx + 1).trim();
      process.env[key] = val;
    }
  }
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const client = createClient(supabaseUrl, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function inspectRemote() {
  console.log("=== REMOTE SUPABASE DATABASE PREFLIGHT INSPECTION ===");
  console.log("Supabase URL:", supabaseUrl);

  // 1. PostgREST OpenAPI Definitions
  try {
    const res = await fetch(`${supabaseUrl}/rest/v1/?apikey=${serviceKey}`);
    const spec = await res.json();
    console.log("\n--- OpenAPI Definitions ---");
    const reqDef = spec.definitions?.society_access_requests;
    if (reqDef) {
      console.log("Table 'society_access_requests' definition found in OpenAPI:");
      console.log("Properties:", Object.keys(reqDef.properties || {}));
      console.log("Properties detail:", JSON.stringify(reqDef.properties, null, 2));
      console.log("Required:", reqDef.required);
      console.log("Description:", reqDef.description);
    } else {
      console.log("Table 'society_access_requests' NOT found in OpenAPI definitions!");
    }
  } catch (err: any) {
    console.error("OpenAPI fetch error:", err.message);
  }

  // 2. Query Row Counts & Status Distribution
  console.log("\n--- Table Counts & Distribution ---");
  const { data: requests, error: reqErr, count: reqCount } = await client
    .from("society_access_requests")
    .select("*", { count: "exact" });

  if (reqErr) {
    console.error("Error querying society_access_requests:", reqErr);
  } else {
    console.log(`Total society_access_requests count: ${reqCount} (rows returned: ${requests?.length})`);
    
    // Status distribution
    const statusDist: Record<string, number> = {};
    for (const r of requests || []) {
      statusDist[r.status] = (statusDist[r.status] || 0) + 1;
    }
    console.log("Status distribution:", statusDist);
    console.log("Existing rows:", JSON.stringify(requests, null, 2));
  }

  // Memberships count
  const { count: memCount, error: memErr } = await client
    .from("society_memberships")
    .select("*", { count: "exact", head: true });
  console.log(`Total society_memberships count: ${memCount} (error: ${memErr?.message || "none"})`);

  // Profiles count
  const { count: profCount, error: profErr } = await client
    .from("profiles")
    .select("*", { count: "exact", head: true });
  console.log(`Total profiles count: ${profCount} (error: ${profErr?.message || "none"})`);

  // Societies count
  const { count: socCount, error: socErr } = await client
    .from("societies")
    .select("*", { count: "exact", head: true });
  console.log(`Total societies count: ${socCount} (error: ${socErr?.message || "none"})`);
}

inspectRemote().catch(console.error);
