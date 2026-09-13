import { NextResponse } from "next/server";
import { getCurrentIdentity } from "@/lib/auth/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const identity = await getCurrentIdentity();
    if (!identity || !identity.isAuthenticated) {
      return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    }

    const adminClient = createAdminClient();
    const { data: societies, error } = await adminClient
      .from("societies")
      .select("id, name, code, city, state, status")
      .in("status", ["ACTIVE", "ONBOARDING"])
      .order("name", { ascending: true });

    if (error) {
      console.error("[society/directory GET] Error:", error);
      return NextResponse.json({ error: "Failed to fetch societies" }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      societies: societies || [],
    });
  } catch (err: any) {
    console.error("[society/directory GET] Exception:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
