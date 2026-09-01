import { IAuthProvider } from "./types";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export class GoogleAuthProvider implements IAuthProvider {
  readonly id = "google_oauth";
  readonly name = "Google OAuth";
  readonly isConfigured = true;

  async getOAuthUrl(redirectTo?: string): Promise<{ url: string | null; error?: string }> {
    try {
      const supabase = await createServerSupabaseClient();
      const origin = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${origin}/api/auth/callback?redirectTo=${encodeURIComponent(redirectTo || "/dashboard")}`,
        },
      });

      if (error) {
        return { url: null, error: error.message };
      }

      return { url: data.url };
    } catch (err: any) {
      return { url: null, error: err?.message || "Failed to initialize Google OAuth." };
    }
  }
}

