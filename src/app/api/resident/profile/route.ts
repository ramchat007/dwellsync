import { NextResponse } from "next/server";
import { getCurrentIdentity } from "@/lib/auth/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { recordAuditLog } from "@/lib/auth/audit";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const identity = await getCurrentIdentity();
    if (!identity || !identity.isAuthenticated) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const adminClient = createAdminClient();
    const userId = identity.effectiveUser.id;

    const { data: profile, error } = await adminClient
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single();

    if (error) {
      return NextResponse.json({ profile: identity.effectiveUser });
    }

    return NextResponse.json({ profile });
  } catch (err) {
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const identity = await getCurrentIdentity();
    if (!identity || !identity.isAuthenticated) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { display_name, avatar_url } = body;

    if (!display_name || !display_name.trim()) {
      return NextResponse.json({ error: "Display name cannot be empty." }, { status: 400 });
    }

    const adminClient = createAdminClient();
    const userId = identity.effectiveUser.id;

    const { data: updated, error } = await adminClient
      .from("profiles")
      .update({
        display_name: display_name.trim(),
        avatar_url: avatar_url || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", userId)
      .select()
      .single();

    if (error) {
      console.error("[API/resident/profile] Update error:", error);
      return NextResponse.json({ error: "Failed to update profile." }, { status: 500 });
    }

    await recordAuditLog({
      actorUserId: userId,
      societyId: identity.currentSociety?.id,
      action: "PROFILE_UPDATED" as any,
      resourceType: "profiles",
      resourceId: userId,
      metadata: { display_name },
    });

    return NextResponse.json({ success: true, profile: updated });
  } catch (err) {
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

