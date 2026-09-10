import { NextResponse } from "next/server";
import { requireSocietyAccess, roleHasPermission } from "@/lib/auth/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { recordAuditLog } from "@/lib/auth/audit";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { UpdateCompleteDocumentSchema } from "@/lib/validations/documents";
import { checkUserDocumentAccess } from "@/lib/services/documentService";
import { z } from "zod";

export const dynamic = "force-dynamic";

export async function GET(
  req: Request,
  context: { params: Promise<{ societyId: string; documentId: string }> }
) {
  try {
    const { societyId, documentId } = await context.params;
    const { identity } = await requireSocietyAccess(societyId);

    if (!z.string().uuid().safeParse(documentId).success) {
      return NextResponse.json({ error: "Invalid document ID" }, { status: 400 });
    }

    const adminClient = createAdminClient();

    // Fetch document with uploader and folder
    const { data: document, error } = await adminClient
      .from("documents")
      .select(`
        *,
        uploader:profiles!uploaded_by (id, full_name, display_name),
        folder:document_folders!folder_id (id, name, color, icon)
      `)
      .eq("id", documentId)
      .eq("society_id", societyId)
      .single();

    if (error || !document) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }

    // Access check
    const hasAccess = await checkUserDocumentAccess(identity, document, societyId);
    if (!hasAccess) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Parallel fetch versions and entity links
    const [versionsResult, linksResult] = await Promise.all([
      adminClient
        .from("document_versions")
        .select(`
          *,
          uploader:profiles!uploaded_by (id, full_name, display_name)
        `)
        .eq("document_id", documentId)
        .eq("society_id", societyId)
        .order("version_number", { ascending: false }),
      adminClient
        .from("document_entity_links")
        .select(`
          *,
          linker:profiles!linked_by (id, full_name, display_name)
        `)
        .eq("document_id", documentId)
        .eq("society_id", societyId)
        .order("created_at", { ascending: false }),
    ]);

    return NextResponse.json({
      document: {
        ...document,
        versions: versionsResult.data || [],
        entity_links: linksResult.data || [],
      },
    });
  } catch (err: any) {
    console.error("[API/society/documents/[documentId] GET] Exception:", err);
    return NextResponse.json(
      { error: err?.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: Request,
  context: { params: Promise<{ societyId: string; documentId: string }> }
) {
  try {
    const { societyId, documentId } = await context.params;
    const { identity } = await requireSocietyAccess(societyId);

    if (!roleHasPermission(identity.currentRole, PERMISSIONS.DOCUMENTS_MANAGE)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (!z.string().uuid().safeParse(documentId).success) {
      return NextResponse.json({ error: "Invalid document ID" }, { status: 400 });
    }

    const body = await req.json();
    const parsed = UpdateCompleteDocumentSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const adminClient = createAdminClient();

    const { data: existing, error: fetchErr } = await adminClient
      .from("documents")
      .select("*")
      .eq("id", documentId)
      .eq("society_id", societyId)
      .single();

    if (fetchErr || !existing) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }

    const { data: updated, error: updateErr } = await adminClient
      .from("documents")
      .update({
        ...parsed.data,
        updated_at: new Date().toISOString(),
      })
      .eq("id", documentId)
      .eq("society_id", societyId)
      .select()
      .single();

    if (updateErr) {
      console.error("[API/society/documents/[documentId] PATCH] Update error:", updateErr);
      return NextResponse.json({ error: "Failed to update document" }, { status: 500 });
    }

    await recordAuditLog({
      actorUserId: identity.originalUser.id,
      effectiveUserId: identity.effectiveUser.id,
      societyId,
      action: "DOCUMENT_UPDATED",
      resourceType: "document",
      resourceId: documentId,
      metadata: {
        title: updated.title,
        changes: Object.keys(parsed.data),
      },
    });

    return NextResponse.json({ success: true, document: updated });
  } catch (err: any) {
    console.error("[API/society/documents/[documentId] PATCH] Exception:", err);
    return NextResponse.json(
      { error: err?.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: Request,
  context: { params: Promise<{ societyId: string; documentId: string }> }
) {
  try {
    const { societyId, documentId } = await context.params;
    const { identity } = await requireSocietyAccess(societyId);

    if (!roleHasPermission(identity.currentRole, PERMISSIONS.DOCUMENTS_MANAGE)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (!z.string().uuid().safeParse(documentId).success) {
      return NextResponse.json({ error: "Invalid document ID" }, { status: 400 });
    }

    const adminClient = createAdminClient();

    const { data: existing, error: fetchErr } = await adminClient
      .from("documents")
      .select("*")
      .eq("id", documentId)
      .eq("society_id", societyId)
      .single();

    if (fetchErr || !existing) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }

    const canDelete = roleHasPermission(identity.currentRole, PERMISSIONS.DOCUMENTS_DELETE);

    if (canDelete) {
      const { error: delErr } = await adminClient
        .from("documents")
        .delete()
        .eq("id", documentId)
        .eq("society_id", societyId);

      if (delErr) {
        return NextResponse.json({ error: "Failed to delete document" }, { status: 500 });
      }

      await recordAuditLog({
        actorUserId: identity.originalUser.id,
        effectiveUserId: identity.effectiveUser.id,
        societyId,
        action: "DOCUMENT_DELETED",
        resourceType: "document",
        resourceId: documentId,
        metadata: { title: existing.title },
      });
    } else {
      // Soft-archive
      await adminClient
        .from("documents")
        .update({
          is_archived: true,
          status: "ARCHIVED",
          archived_at: new Date().toISOString(),
          archived_by: identity.effectiveUser.id,
        })
        .eq("id", documentId)
        .eq("society_id", societyId);

      await recordAuditLog({
        actorUserId: identity.originalUser.id,
        effectiveUserId: identity.effectiveUser.id,
        societyId,
        action: "DOCUMENT_ARCHIVED",
        resourceType: "document",
        resourceId: documentId,
        metadata: { title: existing.title },
      });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("[API/society/documents/[documentId] DELETE] Exception:", err);
    return NextResponse.json(
      { error: err?.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}
