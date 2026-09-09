import { NextResponse } from "next/server";
import { requireSocietyAccess } from "@/lib/auth/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { recordAuditLog } from "@/lib/auth/audit";
import { roleHasPermission } from "@/lib/auth/permissions";
import { CreateDefectSchema } from "@/lib/validations/handover";
import { sendDomainNotification } from "@/lib/services/notificationService";
import { z } from "zod";

export const dynamic = "force-dynamic";

async function verifyProject(adminClient: any, projectId: string, societyId: string) {
  const { data } = await adminClient
    .from("handover_projects")
    .select("id, title")
    .eq("id", projectId)
    .eq("society_id", societyId)
    .single();
  return data;
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
    if (!(await verifyProject(adminClient, projectId, societyId))) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const severity = searchParams.get("severity");

    let query = adminClient
      .from("handover_defects")
      .select(
        `*, assignee:profiles!handover_defects_assigned_to_fkey(id,full_name,display_name)`
      )
      .eq("handover_project_id", projectId)
      .eq("society_id", societyId)
      .order("created_at", { ascending: false });

    if (status && status !== "ALL") query = query.eq("status", status);
    if (severity && severity !== "ALL") query = query.eq("severity", severity);

    const { data: defects, error } = await query;
    if (error) {
      console.error("[API/handover/defects GET]", error);
      return NextResponse.json({ error: "Failed to fetch defects" }, { status: 500 });
    }

    return NextResponse.json({ defects: defects || [] });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(
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
    const parsed = CreateDefectSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const adminClient = createAdminClient();
    const project = await verifyProject(adminClient, projectId, societyId);
    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    // Validate building/unit cross-tenant safety
    if (parsed.data.building_id) {
      const { data: bldg } = await adminClient
        .from("buildings")
        .select("id")
        .eq("id", parsed.data.building_id)
        .eq("society_id", societyId)
        .single();
      if (!bldg) {
        return NextResponse.json({ error: "Building not found in this society" }, { status: 400 });
      }
    }

    const { data: defect, error } = await adminClient
      .from("handover_defects")
      .insert({
        ...parsed.data,
        handover_project_id: projectId,
        society_id: societyId,
        created_by: identity.effectiveUser.id,
        updated_by: identity.effectiveUser.id,
      })
      .select()
      .single();

    if (error) {
      console.error("[API/handover/defects POST]", error);
      return NextResponse.json({ error: "Failed to create defect" }, { status: 500 });
    }

    await recordAuditLog({
      actorUserId: identity.originalUser.id,
      effectiveUserId: identity.effectiveUser.id,
      societyId,
      action: "HANDOVER_DEFECT_CREATED",
      resourceType: "handover_defect",
      resourceId: defect.id,
      metadata: { title: defect.title, severity: defect.severity, project_id: projectId },
    });

    // Notify assignee if set
    if (defect.assigned_to) {
      await sendDomainNotification({
        societyId,
        recipientIds: [defect.assigned_to],
        type: "HANDOVER_DEFECT_ASSIGNED",
        category: "GENERAL",
        actorId: identity.effectiveUser.id,
        data: {
          defectTitle: defect.title,
          severity: defect.severity,
          projectTitle: project.title,
          projectId,
          societyId,
        },
      });
    }

    return NextResponse.json({ success: true, defect }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Internal Server Error" }, { status: 500 });
  }
}
