import * as fs from "fs";
import * as path from "path";
import { createClient } from "@supabase/supabase-js";

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

const adminClient = createClient(supabaseUrl, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function run() {
  // Check unit_occupancies by trying to select single columns
  const testColsOcc = ["id", "society_id", "unit_id", "user_id", "occupancy_type", "lease_start", "lease_end", "is_primary_tenant", "status", "start_date", "end_date", "created_at", "updated_at"];
  for (const col of testColsOcc) {
    const { error } = await adminClient.from("unit_occupancies").select(col).limit(1);
    console.log(`unit_occupancies.${col}:`, error ? `NO (${error.message})` : "YES");
  }

  // Check family_members by trying to select single columns
  const testColsFam = ["id", "society_id", "unit_id", "primary_member_id", "user_id", "full_name", "relationship", "phone", "email", "is_emergency_contact", "created_at", "updated_at"];
  for (const col of testColsFam) {
    const { error } = await adminClient.from("family_members").select(col).limit(1);
    console.log(`family_members.${col}:`, error ? `NO (${error.message})` : "YES");
  }
}

run();

