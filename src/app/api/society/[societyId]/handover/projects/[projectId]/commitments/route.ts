import { NextResponse } from "next/server";
import { requireSocietyAccess } from "@/lib/auth/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { recordAuditLog } from "@/lib/auth/audit";
import { roleHasPermission } from "@/lib/auth/permissions";
import { CreateCommitmentSchema } from "@/lib/validations/handover";
import { z } from "zod";

export const dynamic = "force-dynamic";

async function verifyProject(adminClient: any, projectId: string, societyId: string) {
  const { data } = await adminClient
    .from("handover_projects")
    .select("id")
    .eq("id", projectId)
    .eq("society_id", societyId)
    .single();
  return !!data;
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
    const priority = searchParams.get("priority");

    let query = adminClient
      .from("handover_commitments")
      .select("*")
      .eq("handover_project_id", projectId)
      .eq("society_id", societyId)
      .order("created_at", { ascending: false });

    if (status && status !== "ALL") query = query.eq("status", status);
    if (priority && priority !== "ALL") query = query.eq("priority", priority);

    const { data: commitments, error } = await query;
    if (error) {
      console.error("[API/handover/commitments GET]", error);
      return NextResponse.json({ error: "Failed to fetch commitments" }, { status: 500 });
    }

    return NextResponse.json({ commitments: commitments || [] });
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
    const parsed = CreateCommitmentSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const adminClient = createAdminClient();
    if (!(await verifyProject(adminClient, projectId, societyId))) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    const { data: commitment, error } = await adminClient
      .from("handover_commitments")
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
      console.error("[API/handover/commitments POST]", error);
      return NextResponse.json({ error: "Failed to create commitment" }, { status: 500 });
    }

    await recordAuditLog({
      actorUserId: identity.originalUser.id,
      effectiveUserId: identity.effectiveUser.id,
      societyId,
      action: "HANDOVER_COMMITMENT_CREATED",
      resourceType: "handover_commitment",
      resourceId: commitment.id,
      metadata: { title: commitment.title, project_id: projectId },
    });

    return NextResponse.json({ success: true, commitment }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Internal Server Error" }, { status: 500 });
  }
}
