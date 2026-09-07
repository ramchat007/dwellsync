import { NextResponse } from "next/server";
import { requireSocietyAccess } from "@/lib/auth/server";
import { roleHasPermission, PERMISSIONS } from "@/lib/auth/permissions";
import { UpsertMeetingMinutesSchema } from "@/lib/validations/governance";
import { upsertMeetingMinutes } from "@/lib/governance/meetingService";

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
    const parsed = UpsertMeetingMinutesSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const result = await upsertMeetingMinutes({
      societyId,
      meetingId,
      contentSummary: parsed.data.content_summary,
      decisionsSummary: parsed.data.decisions_summary,
      actorUserId: identity.originalUser.id,
      effectiveUserId: identity.effectiveUser.id,
    });

    if (result.error || !result.minutes) {
      return NextResponse.json(
        { error: result.error || "Failed to save minutes" },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true, minutes: result.minutes });
  } catch (err: any) {
    console.error("[API/meetings/minutes/POST] Exception:", err);
    return NextResponse.json(
      { error: err?.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}
