import { NextResponse } from "next/server";
import { requireSocietyAccess } from "@/lib/auth/server";
import { roleHasPermission, PERMISSIONS } from "@/lib/auth/permissions";
import { UpdateMeetingAgendaSchema } from "@/lib/validations/governance";
import { updateMeetingAgenda } from "@/lib/governance/meetingService";

export const dynamic = "force-dynamic";

export async function PATCH(
  req: Request,
  context: { params: Promise<{ societyId: string; meetingId: string; agendaId: string }> }
) {
  try {
    const { societyId, meetingId, agendaId } = await context.params;
    const { identity } = await requireSocietyAccess(societyId);

    if (!roleHasPermission(identity.currentRole, PERMISSIONS.MEETINGS_MANAGE)) {
      return NextResponse.json({ error: "Forbidden: Insufficient permissions" }, { status: 403 });
    }

    const body = await req.json();
    const parsed = UpdateMeetingAgendaSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const result = await updateMeetingAgenda({
      societyId,
      meetingId,
      agendaId,
      title: parsed.data.title,
      description: parsed.data.description,
      itemOrder: parsed.data.item_order,
      status: parsed.data.status,
      actorUserId: identity.originalUser.id,
      effectiveUserId: identity.effectiveUser.id,
    });

    if (result.error || !result.agenda) {
      return NextResponse.json(
        { error: result.error || "Failed to update agenda item" },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true, agenda: result.agenda });
  } catch (err: any) {
    console.error("[API/meetings/agendas/item/PATCH] Exception:", err);
    return NextResponse.json(
      { error: err?.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}
