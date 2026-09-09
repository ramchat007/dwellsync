import { NextResponse } from "next/server";
import { requireSocietyAccess } from "@/lib/auth/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { recordAuditLog } from "@/lib/auth/audit";
import { roleHasPermission } from "@/lib/auth/permissions";
import { UpdateHandoverProjectSchema } from "@/lib/validations/handover";
import { sendDomainNotification } from "@/lib/services/notificationService";
import { z } from "zod";

export const dynamic = "force-dynamic";

// Allowed status transitions — no arbitrary jumps
const VALID_TRANSITIONS: Record<string, string[]> = {
  DRAFT: ["IN_PROGRESS", "CANCELLED"],
  IN_PROGRESS: ["UNDER_REVIEW", "CANCELLED"],
  UNDER_REVIEW: ["READY_FOR_HANDOVER", "IN_PROGRESS", "CANCELLED"],
  READY_FOR_HANDOVER: ["HANDOVER_COMPLETED", "UNDER_REVIEW"],
  HANDOVER_COMPLETED: ["CLOSED"],
  CLOSED: [],
  CANCELLED: [],
};

async function fetchProject(adminClient: any, projectId: string, societyId: string) {
  return adminClient
    .from("handover_projects")
    .select(
      `*, creator:profiles!handover_projects_created_by_fkey(id,full_name,display_name)`
    )
    .eq("id", projectId)
    .eq("society_id", societyId)
    .single();
}

export async function GET(
  req: Request,
  context: { params: Promise<{ societyId: string; projectId: string }> }
) {
  try {
    const { societyId, projectId } = await context.params;
    const { identity } = await requireSocietyAccess(societyId);

    if (!roleHasPermission(identity.currentRole, "handover.view")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    if (!z.string().uuid().safeParse(projectId).success) {
      return NextResponse.json({ error: "Invalid project ID" }, { status: 400 });
    }

    const adminClient = createAdminClient();
    const { data: project, error } = await fetchProject(adminClient, projectId, societyId);
    if (error || !project) {
      return NextResponse.json({ error: "Handover project not found" }, { status: 404 });
    }

    return NextResponse.json({ project });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Internal Server Error" }, { status: 500 });
  }
}

export async function PATCH(
  req: Request,
  context: { params: Promise<{ societyId: string; projectId: string }> }
) {
  try {
    const { societyId, projectId } = await context.params;
    const { identity } = await requireSocietyAccess(societyId);

    if (!roleHasPermission(identity.currentRole, "handover.manage")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    if (!z.string().uuid().safeParse(projectId).success) {
      return NextResponse.json({ error: "Invalid project ID" }, { status: 400 });
    }

    const body = await req.json();
    const parsed = UpdateHandoverProjectSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const adminClient = createAdminClient();
    const { data: existing, error: fetchErr } = await fetchProject(adminClient, projectId, societyId);
    if (fetchErr || !existing) {
      return NextResponse.json({ error: "Handover project not found" }, { status: 404 });
    }

    // Validate lifecycle transition
    if (parsed.data.status && parsed.data.status !== existing.status) {
      const allowed = VALID_TRANSITIONS[existing.status] || [];
      if (!allowed.includes(parsed.data.status)) {
        return NextResponse.json(
          {
            error: `Invalid status transition from ${existing.status} to ${parsed.data.status}. Allowed: ${allowed.join(", ") || "none"}`,
          },
          { status: 422 }
        );
      }
      // HANDOVER_COMPLETED requires approve permission
      if (
        parsed.data.status === "HANDOVER_COMPLETED" &&
        !roleHasPermission(identity.currentRole, "handover.approve")
      ) {
        return NextResponse.json(
          { error: "Forbidden: finalizing handover requires handover.approve permission" },
          { status: 403 }
        );
      }
    }

    const { data: updated, error: updateErr } = await adminClient
      .from("handover_projects")
      .update({
        ...parsed.data,
        updated_by: identity.effectiveUser.id,
        updated_at: new Date().toISOString(),
      })
      .eq("id", projectId)
      .eq("society_id", societyId)
      .select()
      .single();

    if (updateErr) {
      console.error("[API/handover/projects/[projectId] PATCH]", updateErr);
      return NextResponse.json({ error: "Failed to update handover project" }, { status: 500 });
    }

    await recordAuditLog({
      actorUserId: identity.originalUser.id,
      effectiveUserId: identity.effectiveUser.id,
      societyId,
      action: "HANDOVER_PROJECT_UPDATED",
      resourceType: "handover_project",
      resourceId: projectId,
      metadata: {
        previous_status: existing.status,
        new_status: updated.status,
        changes: Object.keys(parsed.data),
      },
    });

    // Notify committee when ready for handover
    if (parsed.data.status === "READY_FOR_HANDOVER" && existing.status !== "READY_FOR_HANDOVER") {
      const { data: members } = await adminClient
        .from("society_memberships")
        .select("user_id")
        .eq("society_id", societyId)
        .eq("status", "ACTIVE")
        .in("role_id", ["SOCIETY_ADMIN", "SECRETARY", "COMMITTEE_MEMBER"]);

      if (members && members.length > 0) {
        await sendDomainNotification({
          societyId,
          recipientIds: members.map((m: any) => m.user_id),
          type: "HANDOVER_READY_FOR_ACCEPTANCE",
          category: "GENERAL",
          actorId: identity.effectiveUser.id,
          data: {
            projectTitle: updated.title,
            projectId: updated.id,
            societyId,
          },
        });
      }
    }

    return NextResponse.json({ success: true, project: updated });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Internal Server Error" }, { status: 500 });
  }
}
