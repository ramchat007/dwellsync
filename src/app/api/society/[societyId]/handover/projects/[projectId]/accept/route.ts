import { NextResponse } from "next/server";
import { requireSocietyAccess } from "@/lib/auth/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { recordAuditLog } from "@/lib/auth/audit";
import { roleHasPermission } from "@/lib/auth/permissions";
import { HandoverAcceptanceSchema } from "@/lib/validations/handover";
import { z } from "zod";

export const dynamic = "force-dynamic";

/**
 * POST /api/society/[societyId]/handover/projects/[projectId]/accept
 *
 * Controlled final handover acceptance workflow.
 * Requires handover.approve permission.
 * Business validations:
 *   1. Project must be in READY_FOR_HANDOVER status
 *   2. No open CRITICAL defects unless acknowledged
 *   3. Outstanding items preserved — never silently completed
 */
export async function POST(
  req: Request,
  context: { params: Promise<{ societyId: string; projectId: string }> }
) {
  try {
    const { societyId, projectId } = await context.params;
    const { identity } = await requireSocietyAccess(societyId);

    // Requires approve permission
    if (!roleHasPermission(identity.currentRole, "handover.approve")) {
      return NextResponse.json(
        { error: "Forbidden: final handover acceptance requires handover.approve permission" },
        { status: 403 }
      );
    }
    if (!z.string().uuid().safeParse(projectId).success) {
      return NextResponse.json({ error: "Invalid project ID" }, { status: 400 });
    }

    const body = await req.json();
    const parsed = HandoverAcceptanceSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const adminClient = createAdminClient();

    // Fetch project with tenant-safe check
    const { data: project } = await adminClient
      .from("handover_projects")
      .select("*")
      .eq("id", projectId)
      .eq("society_id", societyId)
      .single();

    if (!project) {
      return NextResponse.json({ error: "Handover project not found" }, { status: 404 });
    }

    // 1. Status gate
    if (project.status !== "READY_FOR_HANDOVER") {
      return NextResponse.json(
        {
          error: `Project must be in READY_FOR_HANDOVER status to proceed. Current status: ${project.status}`,
        },
        { status: 422 }
      );
    }

    // 2. Check for open CRITICAL defects (business validation — not a hard block if acknowledged)
    const { data: criticalDefects } = await adminClient
      .from("handover_defects")
      .select("id, title, severity, status")
      .eq("handover_project_id", projectId)
      .eq("society_id", societyId)
      .eq("severity", "CRITICAL")
      .not("status", "in", '("VERIFIED","CLOSED")');

    const openCriticalCount = criticalDefects?.length || 0;

    if (openCriticalCount > 0 && !parsed.data.acknowledge_outstanding) {
      return NextResponse.json(
        {
          error: `There are ${openCriticalCount} open CRITICAL defect(s) that have not been verified or closed. Set acknowledge_outstanding: true to proceed with outstanding items on record.`,
          open_critical_defects: criticalDefects,
        },
        { status: 422 }
      );
    }

    // 3. Check for unreviewed CRITICAL checklist items — warn but collect for metadata
    const { data: pendingCritical } = await adminClient
      .from("handover_checklist_items")
      .select("id, title, status, priority")
      .eq("handover_project_id", projectId)
      .eq("society_id", societyId)
      .eq("priority", "CRITICAL")
      .not("status", "in", '("COMPLETED","NOT_APPLICABLE")');

    // 4. Check for unverified CRITICAL commitments
    const { data: pendingCommitments } = await adminClient
      .from("handover_commitments")
      .select("id, title, status, priority")
      .eq("handover_project_id", projectId)
      .eq("society_id", societyId)
      .eq("priority", "CRITICAL")
      .not("status", "in", '("COMPLETED","WAIVED")');

    // Proceed to mark HANDOVER_COMPLETED — outstanding items are PRESERVED, not silently completed
    const { data: completed, error: updateErr } = await adminClient
      .from("handover_projects")
      .update({
        status: "HANDOVER_COMPLETED",
        actual_handover_date: parsed.data.actual_handover_date,
        overall_progress: 100,
        updated_by: identity.effectiveUser.id,
        updated_at: new Date().toISOString(),
      })
      .eq("id", projectId)
      .eq("society_id", societyId)
      .select()
      .single();

    if (updateErr) {
      console.error("[API/handover/accept POST]", updateErr);
      return NextResponse.json({ error: "Failed to complete handover" }, { status: 500 });
    }

    await recordAuditLog({
      actorUserId: identity.originalUser.id,
      effectiveUserId: identity.effectiveUser.id,
      societyId,
      action: "HANDOVER_COMPLETED",
      resourceType: "handover_project",
      resourceId: projectId,
      metadata: {
        actual_handover_date: parsed.data.actual_handover_date,
        notes: parsed.data.notes || null,
        acknowledged_outstanding: parsed.data.acknowledge_outstanding,
        open_critical_defects_at_completion: openCriticalCount,
        pending_critical_checklist: pendingCritical?.length || 0,
        pending_critical_commitments: pendingCommitments?.length || 0,
      },
    });

    return NextResponse.json({
      success: true,
      project: completed,
      warnings: {
        open_critical_defects: openCriticalCount,
        pending_critical_checklist: pendingCritical?.length || 0,
        pending_critical_commitments: pendingCommitments?.length || 0,
        message:
          openCriticalCount > 0 || (pendingCritical?.length || 0) > 0
            ? "Handover completed with outstanding items on record. These items remain open and must be tracked separately."
            : null,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Internal Server Error" }, { status: 500 });
  }
}
