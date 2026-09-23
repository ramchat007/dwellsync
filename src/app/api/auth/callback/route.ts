import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { setAuthSessionCookie } from "@/lib/auth/session";
import { getAppOrigin, sanitizeRedirectPath } from "@/lib/auth/url";
import { resolvePostLoginRouting, syncProfileFromAuth } from "@/lib/auth/onboarding";
import { getCurrentIdentity } from "@/lib/auth/server";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const errorParam = searchParams.get("error");
  const errorDescription = searchParams.get("error_description");
  const rawRedirectTo = searchParams.get("redirectTo");
  const origin = getAppOrigin(request);
  const safeRedirectTo = sanitizeRedirectPath(rawRedirectTo, "/dashboard");

  if (errorParam) {
    console.error("[OAuth Callback] Provider returned error:", errorParam, errorDescription);
    return NextResponse.redirect(
      `${origin}/login?error=${encodeURIComponent(errorDescription || errorParam)}`
    );
  }

  if (code) {
    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
      console.error("[OAuth Callback] exchangeCodeForSession failed:", error.message);
      return NextResponse.redirect(
        `${origin}/login?error=${encodeURIComponent(error.message || "Failed to exchange auth code.")}`
      );
    }

    if (data.user) {
      const adminClient = createAdminClient();

      // Check if user is Super Admin
      const { data: platformAdmin } = await adminClient
        .from("platform_admins")
        .select("id")
        .eq("user_id", data.user.id)
        .eq("role_id", "SUPER_ADMIN")
        .maybeSingle();

      const isSuperAdmin = !!platformAdmin;

      // Safe non-destructive profile synchronization
      await syncProfileFromAuth(data.user);

      await setAuthSessionCookie({
        userId: data.user.id,
        email: data.user.email,
        phone: data.user.phone,
        isSuperAdmin,
      });

      // 1. If caller requested a specific sub-route (not default /dashboard), respect it
      if (rawRedirectTo && rawRedirectTo !== "/dashboard") {
        return NextResponse.redirect(`${origin}${safeRedirectTo}`);
      }

      // 2. Resolve identity and deterministic routing
      const identity = await getCurrentIdentity();
      const cookieStore = await cookies();
      const preferredSocietyId = cookieStore.get("DwellSyncHub_active_society")?.value;

      const routing = resolvePostLoginRouting(identity, preferredSocietyId);
      const response = NextResponse.redirect(`${origin}${routing.destination}`);

      if (routing.activeSocietyId) {
        response.cookies.set("DwellSyncHub_active_society", routing.activeSocietyId, {
          path: "/",
          httpOnly: false,
          sameSite: "lax",
          maxAge: 30 * 24 * 60 * 60,
        });
      } else if (routing.isUnlinked || routing.requiresSocietySelection) {
        response.cookies.delete("DwellSyncHub_active_society");
      }

      return response;
    }
  }

  return NextResponse.redirect(`${origin}/login?error=oauth_callback_failed`);
}
