import { NextResponse } from "next/server";
import { requireSocietyAccess } from "@/lib/auth/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { recordAuditLog } from "@/lib/auth/audit";
import { roleHasPermission } from "@/lib/auth/permissions";
import { CreateDocumentLinkSchema } from "@/lib/validations/handover";
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
    const { data: links, error } = await adminClient
      .from("handover_document_links")
      .select(`
        *,
        document:documents (id, title, file_url, file_type, category)
      `)
      .eq("handover_project_id", projectId)
      .eq("society_id", societyId)
      .order("created_at", { ascending: false });
    if (error) return NextResponse.json({ error: "Failed to fetch document links" }, { status: 500 });
    return NextResponse.json({ links: links || [] });
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
    const parsed = CreateDocumentLinkSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 400 });
    }
    const adminClient = createAdminClient();
    if (!(await verifyProject(adminClient, projectId, societyId))) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }
    // Verify document belongs to same society — cross-tenant IDOR prevention
    const { data: doc } = await adminClient
      .from("documents")
      .select("id")
      .eq("id", parsed.data.document_id)
      .eq("society_id", societyId)
      .single();
    if (!doc) {
      return NextResponse.json({ error: "Document not found in this society" }, { status: 400 });
    }
    const { data: link, error } = await adminClient
      .from("handover_document_links")
      .insert({
        ...parsed.data,
        handover_project_id: projectId,
        society_id: societyId,
        linked_by: identity.effectiveUser.id,
      })
      .select()
      .single();
    if (error) {
      if (error.code === "23505") {
        return NextResponse.json({ error: "Document already linked to this project/entity" }, { status: 409 });
      }
      return NextResponse.json({ error: "Failed to link document" }, { status: 500 });
    }
    await recordAuditLog({
      actorUserId: identity.originalUser.id,
      effectiveUserId: identity.effectiveUser.id,
      societyId,
      action: "HANDOVER_DOCUMENT_LINKED",
      resourceType: "handover_document_link",
      resourceId: link.id,
      metadata: { document_id: parsed.data.document_id, project_id: projectId, entity_type: parsed.data.entity_type },
    });
    return NextResponse.json({ success: true, link }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Internal Server Error" }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  context: { params: Promise<{ societyId: string; projectId: string }> }
) {
  try {
    const { societyId, projectId } = await context.params;
    const { identity } = await requireSocietyAccess(societyId);
    if (!roleHasPermission(identity.currentRole, "handover.manage")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const { searchParams } = new URL(req.url);
    const linkId = searchParams.get("linkId");
    if (!linkId || !z.string().uuid().safeParse(linkId).success) {
      return NextResponse.json({ error: "Valid linkId query param required" }, { status: 400 });
    }
    const adminClient = createAdminClient();
    // Composite tenant-safe delete
    const { error } = await adminClient
      .from("handover_document_links")
      .delete()
      .eq("id", linkId)
      .eq("handover_project_id", projectId)
      .eq("society_id", societyId);
    if (error) return NextResponse.json({ error: "Failed to remove document link" }, { status: 500 });
    await recordAuditLog({
      actorUserId: identity.originalUser.id,
      effectiveUserId: identity.effectiveUser.id,
      societyId,
      action: "HANDOVER_DOCUMENT_UNLINKED",
      resourceType: "handover_document_link",
      resourceId: linkId,
      metadata: { project_id: projectId },
    });
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Internal Server Error" }, { status: 500 });
  }
}
