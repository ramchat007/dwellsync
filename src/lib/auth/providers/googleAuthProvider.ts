import { IAuthProvider } from "./types";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getAppOrigin, sanitizeRedirectPath } from "../url";

export class GoogleAuthProvider implements IAuthProvider {
  readonly id = "google_oauth";
  readonly name = "Google OAuth";
  readonly isConfigured = true;

  async getOAuthUrl(
    redirectTo?: string,
    originOverride?: string
  ): Promise<{ url: string | null; error?: string }> {
    try {
      const supabase = await createServerSupabaseClient();
      const origin = originOverride || getAppOrigin();
      const safeRedirect = sanitizeRedirectPath(redirectTo, "/dashboard");

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${origin}/api/auth/callback?redirectTo=${encodeURIComponent(safeRedirect)}`,
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

