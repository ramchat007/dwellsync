import { NextRequest, NextResponse } from "next/server";
import { getCurrentIdentity } from "@/lib/auth/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(req: NextRequest) {
  try {
    const identity = await getCurrentIdentity();
    if (!identity || !identity.isAuthenticated) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const societyId = identity.currentSociety?.id;
    if (!societyId) {
      return NextResponse.json({ error: "No active society context" }, { status: 400 });
    }

    const recipientId = identity.effectiveUser.id;
    const adminClient = createAdminClient();
    const now = new Date().toISOString();

    const { error } = await adminClient
      .from("notifications")
      .update({
        is_read: true,
        read_at: now,
        updated_at: now,
      })
      .eq("society_id", societyId)
      .eq("recipient_id", recipientId)
      .eq("is_read", false);

    if (error) {
      return NextResponse.json({ error: "Failed to mark all as read" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("[Notification Mark All Read POST] Exception:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
