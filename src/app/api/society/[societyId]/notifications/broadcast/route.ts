import { NextRequest, NextResponse } from "next/server";
import { getCurrentIdentity } from "@/lib/auth/server";
import { roleHasPermission, PERMISSIONS } from "@/lib/auth/permissions";
import { BroadcastNotificationSchema } from "@/lib/validations/notifications";
import { broadcastSocietyNotification } from "@/lib/services/notificationService";

export async function POST(
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
      roleHasPermission(identity.currentRole, PERMISSIONS.NOTIFICATIONS_BROADCAST);

    if (!isAuthorized) {
      return NextResponse.json({ error: "Forbidden: Broadcast permission required" }, { status: 403 });
    }

    const body = await req.json();
    const parseResult = BroadcastNotificationSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        { error: "Invalid broadcast payload", details: parseResult.error.flatten() },
        { status: 400 }
      );
    }

    const { title, body: msgBody, category, action_url, target_role } = parseResult.data;

    const result = await broadcastSocietyNotification({
      societyId,
      actorId: identity.effectiveUser.id,
      category,
      type: "SOCIETY_BROADCAST",
      title,
      body: msgBody,
      actionUrl: action_url,
      targetRole: target_role,
    });

    if (!result.success) {
      return NextResponse.json({ error: result.error || "Failed to broadcast notification" }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      recipientCount: result.recipientCount,
    });
  } catch (err: any) {
    console.error("[Society Broadcast POST] Exception:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
