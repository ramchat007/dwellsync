import { NextResponse } from "next/server";
import { requireSocietyAccess } from "@/lib/auth/server";
import { roleHasPermission, PERMISSIONS } from "@/lib/auth/permissions";
import { publishMeetingMinutes } from "@/lib/governance/meetingService";

export const dynamic = "force-dynamic";

export async function POST(
  req: Request,
  context: { params: Promise<{ societyId: string; meetingId: string }> }
) {
  try {
    const { societyId, meetingId } = await context.params;
    const { identity } = await requireSocietyAccess(societyId);

    if (!roleHasPermission(identity.currentRole, PERMISSIONS.MEETINGS_MANAGE)) {
      return NextResponse.json({ error: "Forbidden: Insufficient permissions" }, { status: 403 });
    }

    const result = await publishMeetingMinutes({
      societyId,
      meetingId,
      actorUserId: identity.originalUser.id,
      effectiveUserId: identity.effectiveUser.id,
    });

    if (result.error || !result.minutes) {
      return NextResponse.json(
        { error: result.error || "Failed to publish minutes" },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true, minutes: result.minutes });
  } catch (err: any) {
    console.error("[API/meetings/minutes/publish/POST] Exception:", err);
    return NextResponse.json(
      { error: err?.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}
