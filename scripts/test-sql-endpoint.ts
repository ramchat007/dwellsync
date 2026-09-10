import { config } from "dotenv";
config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

async function testEndpoints() {
  const endpoints = [
    `${supabaseUrl}/rest/v1/rpc/exec_sql`,
    `${supabaseUrl}/database/query`,
    `${supabaseUrl}/pg/query`,
    `${supabaseUrl}/api/v1/query`,
    `${supabaseUrl}/sql`,
  ];

  for (const url of endpoints) {
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "apikey": serviceKey,
          "Authorization": `Bearer ${serviceKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ query: "SELECT 1" }),
      });
      const text = await res.text();
      console.log(`Endpoint ${url} -> status: ${res.status}, body: ${text.slice(0, 100)}`);
    } catch (e: any) {
      console.log(`Endpoint ${url} -> error: ${e.message}`);
    }
  }
}

testEndpoints().catch(console.error);
