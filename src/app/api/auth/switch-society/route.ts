import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getCurrentIdentity } from "@/lib/auth/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(req: Request) {
  try {
    const identity = await getCurrentIdentity();
    if (!identity || !identity.isAuthenticated) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { societyId } = await req.json();
    if (!societyId) {
      return NextResponse.json({ error: "Society ID is required" }, { status: 400 });
    }

    // Verify membership or superadmin
    if (!identity.isSuperAdmin) {
      const adminClient = createAdminClient();
      const { data: membership } = await adminClient
        .from("society_memberships")
        .select("id")
        .eq("society_id", societyId)
        .eq("user_id", identity.effectiveUser.id)
        .eq("status", "ACTIVE")
        .maybeSingle();

      if (!membership) {
        return NextResponse.json(
          { error: "Access denied to target society tenant" },
          { status: 403 }
        );
      }
    }

    const cookieStore = await cookies();
    cookieStore.set("DwellSyncHub_active_society", societyId, {
      path: "/",
      httpOnly: false,
      sameSite: "lax",
      maxAge: 30 * 24 * 60 * 60, // 30 days
    });

    return NextResponse.json({ success: true, activeSocietyId: societyId });
  } catch (err) {
    console.error("[switch-society API] Error:", err);
    return NextResponse.json({ error: "Failed to switch society" }, { status: 500 });
  }
}

