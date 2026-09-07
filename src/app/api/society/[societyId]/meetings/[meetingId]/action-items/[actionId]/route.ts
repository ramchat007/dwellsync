import { NextResponse } from "next/server";
import { requireSocietyAccess } from "@/lib/auth/server";
import { roleHasPermission, PERMISSIONS } from "@/lib/auth/permissions";
import { UpdateActionItemSchema } from "@/lib/validations/governance";
import { updateMeetingActionItem } from "@/lib/governance/meetingService";

export const dynamic = "force-dynamic";

export async function PATCH(
  req: Request,
  context: { params: Promise<{ societyId: string; meetingId: string; actionId: string }> }
) {
  try {
    const { societyId, meetingId, actionId } = await context.params;
    const { identity } = await requireSocietyAccess(societyId);

    const isManagement = roleHasPermission(identity.currentRole, PERMISSIONS.MEETINGS_MANAGE);

    const body = await req.json();
    const parsed = UpdateActionItemSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    // If not management, caller must be the assignee (updating status only)
    const isAssigneeOnly = !isManagement;

    const result = await updateMeetingActionItem({
      societyId,
      meetingId,
      actionItemId: actionId,
      title: parsed.data.title,
      description: parsed.data.description,
      assignedTo: parsed.data.assigned_to,
      dueDate: parsed.data.due_date,
      status: parsed.data.status,
      actorUserId: identity.originalUser.id,
      effectiveUserId: identity.effectiveUser.id,
      isAssigneeOnly,
    });

    if (result.error || !result.actionItem) {
      return NextResponse.json(
        { error: result.error || "Failed to update action item" },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true, actionItem: result.actionItem });
  } catch (err: any) {
    console.error("[API/meetings/action-items/item/PATCH] Exception:", err);
    return NextResponse.json(
      { error: err?.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}
