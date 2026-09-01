import { NextResponse } from "next/server";
import { authService } from "@/lib/auth/providers/authService";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const redirectTo = searchParams.get("redirectTo") || "/dashboard";

    const { url, error } = await authService.getGoogleOAuthUrl(redirectTo);
    if (error || !url) {
      return NextResponse.json({ error: error || "OAuth provider not configured" }, { status: 500 });
    }

    return NextResponse.redirect(url);
  } catch (err: any) {
    return NextResponse.json({ error: "Failed to initialize Google OAuth." }, { status: 500 });
  }
}

