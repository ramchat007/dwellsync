import { createClient, type SupabaseClient } from "@supabase/supabase-js";

if (process.env.NODE_ENV !== "production") {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
}

let cachedAdminClient: SupabaseClient | null = null;

function getClient(): SupabaseClient {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://dummy-project.supabase.co";
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "dummy-service-role-key-DwellSyncHub-prephase0";

  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

export function createAdminClient(): SupabaseClient {
  if (!cachedAdminClient) {
    cachedAdminClient = getClient();
  }
  return cachedAdminClient;
}
