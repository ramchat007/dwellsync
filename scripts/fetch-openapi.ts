import { config } from "dotenv";
config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

async function fetchSchema() {
  const res = await fetch(`${supabaseUrl}/rest/v1/`, {
    headers: {
      "apikey": serviceKey,
      "Authorization": `Bearer ${serviceKey}`,
    },
  });

  const schema = await res.json();
  const paths = Object.keys(schema.paths || {});
  console.log("Total paths in schema:", paths.length);
  
  const rpcs = paths.filter((p) => p.startsWith("/rpc/"));
  console.log("Available RPC functions:", rpcs);

  const tables = paths.filter((p) => !p.startsWith("/rpc/") && p !== "/").sort();
  console.log(`All ${tables.length} tables/views in remote database:`);
  tables.forEach((t) => console.log(" ", t));
}

fetchSchema().catch(console.error);
