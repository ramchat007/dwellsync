import { NextRequest, NextResponse } from "next/server";
import { getCurrentIdentity } from "@/lib/auth/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { roleHasPermission, PERMISSIONS } from "@/lib/auth/permissions";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ societyId: string }> }
) {
  try {
    const identity = await getCurrentIdentity();
    if (!identity || !identity.isAuthenticated) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { societyId } = await params;
    if (identity.currentSociety?.id !== societyId && !identity.isSuperAdmin) {
      return NextResponse.json({ error: "Society context mismatch" }, { status: 403 });
    }

    const isAuthorized =
      identity.isSuperAdmin ||
      roleHasPermission(identity.currentRole, PERMISSIONS.NOTIFICATIONS_BROADCAST) ||
      roleHasPermission(identity.currentRole, PERMISSIONS.SOCIETY_MANAGE);

    if (!isAuthorized) {
      return NextResponse.json({ error: "Forbidden: Broadcast management permission required" }, { status: 403 });
    }

    const adminClient = createAdminClient();
    const { data: broadcasts, error } = await adminClient
      .from("notifications")
      .select("id, title, body, category, type, created_at, actor:profiles!actor_id(full_name)")
      .eq("society_id", societyId)
      .contains("metadata", { broadcast: true })
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) {
      return NextResponse.json({ error: "Failed to list broadcast history" }, { status: 500 });
    }

    return NextResponse.json({ success: true, broadcasts: broadcasts || [] });
  } catch (err: any) {
    console.error("[Society Notifications GET] Exception:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
