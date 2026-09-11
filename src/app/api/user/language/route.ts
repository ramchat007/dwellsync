import { NextResponse } from "next/server";
import { getCurrentIdentity } from "@/lib/auth/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { Locale } from "@/lib/i18n/types";

export const dynamic = "force-dynamic";

const VALID_LOCALES: Locale[] = ["en", "mr", "hi"];

export async function GET() {
  try {
    const identity = await getCurrentIdentity();
    if (!identity || !identity.isAuthenticated) {
      return NextResponse.json({ preferredLanguage: "en" });
    }

    const adminClient = createAdminClient();
    const userId = identity.effectiveUser.id;

    const { data: profile, error } = await adminClient
      .from("profiles")
      .select("preferred_language")
      .eq("id", userId)
      .single();

    if (error || !profile?.preferred_language) {
      return NextResponse.json({ preferredLanguage: "en" });
    }

    return NextResponse.json({ preferredLanguage: profile.preferred_language });
  } catch (err) {
    return NextResponse.json({ preferredLanguage: "en" });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const preferredLanguage = body?.preferredLanguage as Locale;

    if (!preferredLanguage || !VALID_LOCALES.includes(preferredLanguage)) {
      return NextResponse.json(
        { error: `Invalid language. Must be one of: ${VALID_LOCALES.join(", ")}` },
        { status: 400 }
      );
    }

    const identity = await getCurrentIdentity();
    if (identity && identity.isAuthenticated) {
      const adminClient = createAdminClient();
      const userId = identity.effectiveUser.id;

      await adminClient
        .from("profiles")
        .update({
          preferred_language: preferredLanguage,
          updated_at: new Date().toISOString(),
        })
        .eq("id", userId);
    }

    const response = NextResponse.json({ success: true, preferredLanguage });
    response.cookies.set("dwellsync_locale", preferredLanguage, {
      path: "/",
      maxAge: 31536000,
      sameSite: "lax",
    });

    return response;
  } catch (err) {
    console.error("[API/user/language] Error:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

