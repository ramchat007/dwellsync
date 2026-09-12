import { config } from "dotenv";
config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

async function checkDetails() {
  const res = await fetch(`${supabaseUrl}/rest/v1/?apikey=${serviceKey}`);
  const spec = await res.json();

  for (const t of ["notifications", "notification_preferences", "notification_deliveries"]) {
    const def = spec.definitions?.[t];
    if (def) {
      console.log(`\nTable ${t}:`, Object.keys(def.properties || {}));
    } else {
      console.log(`\nTable ${t} not found in OpenAPI`);
    }
  }
}

checkDetails();

