import { NextRequest, NextResponse } from "next/server";
import { getCurrentIdentity } from "@/lib/auth/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { recordAuditLog } from "@/lib/auth/audit";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const identity = await getCurrentIdentity();
    if (!identity || !identity.isAuthenticated) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const societyId = identity.currentSociety?.id;
    if (!societyId) {
      return NextResponse.json({ error: "No active society context" }, { status: 400 });
    }

    const { id: notificationId } = await params;
    const recipientId = identity.effectiveUser.id;
    const adminClient = createAdminClient();

    // Verify ownership and tenant isolation
    const { data: notification, error: findErr } = await adminClient
      .from("notifications")
      .select("id, recipient_id, society_id, is_read")
      .eq("id", notificationId)
      .eq("society_id", societyId)
      .eq("recipient_id", recipientId)
      .maybeSingle();

    if (findErr || !notification) {
      return NextResponse.json({ error: "Notification not found" }, { status: 404 });
    }

    if (!notification.is_read) {
      const now = new Date().toISOString();
      const { error: updateErr } = await adminClient
        .from("notifications")
        .update({
          is_read: true,
          read_at: now,
          updated_at: now,
        })
        .eq("id", notificationId);

      if (updateErr) {
        return NextResponse.json({ error: "Failed to update notification" }, { status: 500 });
      }

      await recordAuditLog({
        actorUserId: identity.user.id,
        effectiveUserId: recipientId,
        societyId,
        action: "NOTIFICATION_READ",
        resourceType: "notifications",
        resourceId: notificationId,
      });
    }

    return NextResponse.json({ success: true, is_read: true });
  } catch (err: any) {
    console.error("[Notification Read PATCH] Exception:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
