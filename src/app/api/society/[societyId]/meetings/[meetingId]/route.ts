import { NextResponse } from "next/server";
import { requireSocietyAccess } from "@/lib/auth/server";
import { roleHasPermission, PERMISSIONS } from "@/lib/auth/permissions";
import { UpdateGovernanceMeetingSchema } from "@/lib/validations/governance";
import { getMeetingDetail, updateMeeting } from "@/lib/governance/meetingService";

export const dynamic = "force-dynamic";

export async function GET(
  req: Request,
  context: { params: Promise<{ societyId: string; meetingId: string }> }
) {
  try {
    const { societyId, meetingId } = await context.params;
    const { identity } = await requireSocietyAccess(societyId);

    if (!roleHasPermission(identity.currentRole, PERMISSIONS.MEETINGS_VIEW)) {
      return NextResponse.json({ error: "Forbidden: Insufficient permissions" }, { status: 403 });
    }

    const isManagement = roleHasPermission(identity.currentRole, PERMISSIONS.MEETINGS_MANAGE);

    const meeting = await getMeetingDetail(societyId, meetingId, {
      includePrivate: isManagement,
    });

    if (!meeting) {
      return NextResponse.json({ error: "Meeting not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, meeting });
  } catch (err: any) {
    console.error("[API/meetings/detail/GET] Exception:", err);
    return NextResponse.json(
      { error: err?.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}

export async function PATCH(
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
    const parsed = UpdateGovernanceMeetingSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const result = await updateMeeting({
      societyId,
      meetingId,
      title: parsed.data.title,
      scheduledAt: parsed.data.scheduled_at,
      durationMinutes: parsed.data.duration_minutes,
      locationType: parsed.data.location_type,
      locationDetails: parsed.data.location_details,
      meetingLink: parsed.data.meeting_link,
      presidingOfficerId: parsed.data.presiding_officer_id,
      quorumRequired: parsed.data.quorum_required,
      status: parsed.data.status,
      agenda: parsed.data.agenda,
      actorUserId: identity.originalUser.id,
      effectiveUserId: identity.effectiveUser.id,
    });

    if (result.error || !result.meeting) {
      return NextResponse.json(
        { error: result.error || "Failed to update meeting" },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true, meeting: result.meeting });
  } catch (err: any) {
    console.error("[API/meetings/detail/PATCH] Exception:", err);
    return NextResponse.json(
      { error: err?.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}
