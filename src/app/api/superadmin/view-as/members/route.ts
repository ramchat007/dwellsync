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
    if (roleId) {
      const { data: roleMembers, error: roleError } = await adminClient
        .from("society_memberships")
        .select(`
          user_id,
          role_id,
          unit_number,
          profile:profiles (*)
        `)
        .eq("society_id", societyId)
        .eq("status", "ACTIVE")
        .eq("role_id", roleId);

      if (roleError) {
        console.error("[view-as members GET] Error:", roleError);
        return NextResponse.json({ error: roleError.message }, { status: 500 });
      }

      if (roleMembers && roleMembers.length > 0) {
        return NextResponse.json({ success: true, data: roleMembers, isFallbackRole: false });
      }

      // If no members exist for this specific role, allow selecting any active society member to test the persona
      const { data: fallbackMembers, error: fallbackError } = await adminClient
        .from("society_memberships")
        .select(`
          user_id,
          role_id,
          unit_number,
          profile:profiles (*)
        `)
        .eq("society_id", societyId)
        .eq("status", "ACTIVE");

      if (fallbackError) {
        console.error("[view-as members GET] Error:", fallbackError);
        return NextResponse.json({ error: fallbackError.message }, { status: 500 });
      }

      return NextResponse.json({ success: true, data: fallbackMembers || [], isFallbackRole: true });
    }

    const { data, error } = await adminClient
      .from("society_memberships")
      .select(`
        user_id,
        role_id,
        unit_number,
        profile:profiles (*)
      `)
      .eq("society_id", societyId)
      .eq("status", "ACTIVE");

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

