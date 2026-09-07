import { NextResponse } from "next/server";
import { requireSocietyAccess } from "@/lib/auth/server";
import { roleHasPermission, PERMISSIONS } from "@/lib/auth/permissions";
import { RecordMeetingAttendanceSchema } from "@/lib/validations/governance";
import { recordMeetingAttendance } from "@/lib/governance/meetingService";

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

    const body = await req.json();
    const parsed = RecordMeetingAttendanceSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const result = await recordMeetingAttendance({
      societyId,
      meetingId,
      attendees: parsed.data.attendees.map((a) => ({
        userId: a.user_id,
        attendeeType: a.attendee_type,
        attended: a.attended,
        notes: a.notes,
      })),
      actorUserId: identity.originalUser.id,
      effectiveUserId: identity.effectiveUser.id,
    });

    if (result.error || !result.success) {
      return NextResponse.json(
        { error: result.error || "Failed to record attendance" },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      quorumMet: result.quorumMet,
      attendedCount: result.attendedCount,
    });
  } catch (err: any) {
    console.error("[API/meetings/attendance/POST] Exception:", err);
    return NextResponse.json(
      { error: err?.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}
