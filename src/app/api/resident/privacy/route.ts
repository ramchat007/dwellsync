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

    const { data: privacy } = await adminClient
      .from("profile_privacy_settings")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();

    const defaultPrivacy = {
      user_id: userId,
      profile_visible_in_directory: true,
      phone_visible_in_directory: false,
      email_visible_in_directory: false,
      allow_neighbor_chat: true,
    };

    return NextResponse.json({ privacy: privacy || defaultPrivacy });
  } catch (err) {
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const identity = await getCurrentIdentity();
    if (!identity || !identity.isAuthenticated) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const {
      profile_visible_in_directory,
      phone_visible_in_directory,
      email_visible_in_directory,
      allow_neighbor_chat,
    } = body;

    const adminClient = createAdminClient();
    const userId = identity.effectiveUser.id;

    const payload = {
      user_id: userId,
      profile_visible_in_directory: profile_visible_in_directory !== false,
      phone_visible_in_directory: !!phone_visible_in_directory,
      email_visible_in_directory: !!email_visible_in_directory,
      allow_neighbor_chat: allow_neighbor_chat !== false,
      updated_at: new Date().toISOString(),
    };

    const { data: updated, error } = await adminClient
      .from("profile_privacy_settings")
      .upsert(payload, { onConflict: "user_id" })
      .select()
      .single();

    if (error) {
      console.error("[API/resident/privacy] Update error:", error);
      return NextResponse.json({ error: "Failed to update privacy settings." }, { status: 500 });
    }

    await recordAuditLog({
      actorUserId: userId,
      societyId: identity.currentSociety?.id,
      action: "PRIVACY_SETTINGS_UPDATED" as any,
      resourceType: "profile_privacy_settings",
      resourceId: updated.id,
    });

    return NextResponse.json({ success: true, privacy: updated });
  } catch (err) {
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

