import { NextResponse } from "next/server";
import { getCurrentIdentity } from "@/lib/auth/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(req: Request) {
  try {
    const identity = await getCurrentIdentity();
    if (!identity || !identity.isSuperAdmin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const societyId = searchParams.get("societyId");
    const roleId = searchParams.get("roleId");

    if (!societyId) {
      return NextResponse.json({ error: "Society ID is required" }, { status: 400 });
    }

    const adminClient = createAdminClient();
    let query = adminClient
      .from("society_memberships")
      .select(`
        user_id,
        role_id,
        unit_number,
        profile:profiles (*)
      `)
      .eq("society_id", societyId)
      .eq("status", "ACTIVE");

    if (roleId) {
      query = query.eq("role_id", roleId);
    }

    const { data, error } = await query;
    if (error) {
      console.error("[view-as members GET] Error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, data: data || [] });
  } catch (err) {
    console.error("[view-as members GET] Server error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

