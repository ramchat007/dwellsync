import { NextResponse } from "next/server";
import { requireSocietyAccess } from "@/lib/auth/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { recordAuditLog } from "@/lib/auth/audit";
import { roleHasPermission } from "@/lib/auth/permissions";
import { UpdateChecklistItemSchema } from "@/lib/validations/handover";
import { z } from "zod";

export const dynamic = "force-dynamic";

export async function PATCH(
  req: Request,
  context: { params: Promise<{ societyId: string; projectId: string; itemId: string }> }
) {
  try {
    const { societyId, projectId, itemId } = await context.params;
    const { identity } = await requireSocietyAccess(societyId);

    if (!roleHasPermission(identity.currentRole, "handover.manage")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    if (!z.string().uuid().safeParse(itemId).success) {
      return NextResponse.json({ error: "Invalid item ID" }, { status: 400 });
    }

    const body = await req.json();
    const parsed = UpdateChecklistItemSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const adminClient = createAdminClient();
    // Composite tenant-safe check: item must belong to this project AND society
    const { data: existing } = await adminClient
      .from("handover_checklist_items")
      .select("*")
      .eq("id", itemId)
      .eq("handover_project_id", projectId)
      .eq("society_id", societyId)
      .single();

    if (!existing) {
      return NextResponse.json({ error: "Checklist item not found" }, { status: 404 });
    }

    const updates: Record<string, any> = {
      ...parsed.data,
      updated_by: identity.effectiveUser.id,
      updated_at: new Date().toISOString(),
    };

    // Auto-set completed_date when marking COMPLETED
    if (parsed.data.status === "COMPLETED" && !updates.completed_date && !existing.completed_date) {
      updates.completed_date = new Date().toISOString().split("T")[0];
    }

    const { data: updated, error } = await adminClient
      .from("handover_checklist_items")
      .update(updates)
      .eq("id", itemId)
      .select()
      .single();

    if (error) {
      console.error("[API/handover/checklist/[itemId] PATCH]", error);
      return NextResponse.json({ error: "Failed to update checklist item" }, { status: 500 });
    }

    await recordAuditLog({
      actorUserId: identity.originalUser.id,
      effectiveUserId: identity.effectiveUser.id,
      societyId,
      action: "HANDOVER_CHECKLIST_UPDATED",
      resourceType: "handover_checklist_item",
      resourceId: itemId,
      metadata: {
        previous_status: existing.status,
        new_status: updated.status,
        project_id: projectId,
      },
    });

    return NextResponse.json({ success: true, item: updated });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Internal Server Error" }, { status: 500 });
  }
}
