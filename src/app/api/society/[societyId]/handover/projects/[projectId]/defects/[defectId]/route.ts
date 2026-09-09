import { NextResponse } from "next/server";
import { requireSocietyAccess } from "@/lib/auth/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { recordAuditLog } from "@/lib/auth/audit";
import { roleHasPermission } from "@/lib/auth/permissions";
import { UpdateDefectSchema } from "@/lib/validations/handover";
import { z } from "zod";

export const dynamic = "force-dynamic";

export async function PATCH(
  req: Request,
  context: { params: Promise<{ societyId: string; projectId: string; defectId: string }> }
) {
  try {
    const { societyId, projectId, defectId } = await context.params;
    const { identity } = await requireSocietyAccess(societyId);

    if (!roleHasPermission(identity.currentRole, "handover.manage")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    if (!z.string().uuid().safeParse(defectId).success) {
      return NextResponse.json({ error: "Invalid defect ID" }, { status: 400 });
    }

    const body = await req.json();
    const parsed = UpdateDefectSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const adminClient = createAdminClient();
    // Composite tenant-safe check
    const { data: existing } = await adminClient
      .from("handover_defects")
      .select("*")
      .eq("id", defectId)
      .eq("handover_project_id", projectId)
      .eq("society_id", societyId)
      .single();

    if (!existing) {
      return NextResponse.json({ error: "Defect not found" }, { status: 404 });
    }

    // CLOSED requires VERIFIED state or approve permission
    if (parsed.data.status === "CLOSED" && existing.status !== "VERIFIED") {
      if (!roleHasPermission(identity.currentRole, "handover.approve")) {
        return NextResponse.json(
          {
            error:
              "Defect must be VERIFIED before closing, or requires handover.approve permission",
          },
          { status: 422 }
        );
      }
    }

    const updates: Record<string, any> = {
      ...parsed.data,
      updated_by: identity.effectiveUser.id,
      updated_at: new Date().toISOString(),
    };

    // Auto-set timestamps
    if (parsed.data.status === "RESOLVED" && !updates.resolved_date && !existing.resolved_date) {
      updates.resolved_date = new Date().toISOString().split("T")[0];
    }
    if (parsed.data.status === "VERIFIED") {
      updates.verified_by = identity.effectiveUser.id;
      updates.verified_at = new Date().toISOString();
    }

    const { data: updated, error } = await adminClient
      .from("handover_defects")
      .update(updates)
      .eq("id", defectId)
      .select()
      .single();

    if (error) {
      console.error("[API/handover/defects/[defectId] PATCH]", error);
      return NextResponse.json({ error: "Failed to update defect" }, { status: 500 });
    }

    await recordAuditLog({
      actorUserId: identity.originalUser.id,
      effectiveUserId: identity.effectiveUser.id,
      societyId,
      action: "HANDOVER_DEFECT_UPDATED",
      resourceType: "handover_defect",
      resourceId: defectId,
      metadata: {
        previous_status: existing.status,
        new_status: updated.status,
        project_id: projectId,
      },
    });

    return NextResponse.json({ success: true, defect: updated });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Internal Server Error" }, { status: 500 });
  }
}
