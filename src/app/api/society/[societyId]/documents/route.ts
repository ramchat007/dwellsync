import { NextResponse } from "next/server";
import { requireSocietyAccess, roleHasPermission } from "@/lib/auth/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { recordAuditLog } from "@/lib/auth/audit";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { CreateCompleteDocumentSchema } from "@/lib/validations/documents";

export const dynamic = "force-dynamic";

export async function GET(
  req: Request,
  context: { params: Promise<{ societyId: string }> }
) {
  try {
    const { societyId } = await context.params;
    const { identity } = await requireSocietyAccess(societyId);

    if (!roleHasPermission(identity.currentRole, PERMISSIONS.DOCUMENTS_VIEW)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search");
    const category = searchParams.get("category");
    const subcategory = searchParams.get("subcategory");
    const folderId = searchParams.get("folderId");
    const status = searchParams.get("status");
    const visibility = searchParams.get("visibility");
    const tag = searchParams.get("tag");
    const includeArchived = searchParams.get("includeArchived") === "true";

    const adminClient = createAdminClient();

    let query = adminClient
      .from("documents")
      .select(`
        *,
        uploader:profiles!uploaded_by (id, full_name, display_name),
        folder:document_folders!folder_id (id, name, color, icon)
      `)
      .eq("society_id", societyId);

    // Archive filter
    if (status === "ARCHIVED") {
      query = query.or("is_archived.eq.true,status.eq.ARCHIVED");
    } else if (!includeArchived) {
      query = query.eq("is_archived", false).neq("status", "ARCHIVED");
    }

    // Category / Subcategory
    if (category && category !== "ALL") {
      query = query.eq("category", category);
    }
    if (subcategory) {
      query = query.eq("subcategory", subcategory);
    }

    // Folder
    if (folderId === "ROOT") {
      query = query.is("folder_id", null);
    } else if (folderId && folderId !== "ALL") {
      query = query.eq("folder_id", folderId);
    }

    // Status / Visibility
    if (status && status !== "ALL" && status !== "ARCHIVED") {
      query = query.eq("status", status);
    }
    if (visibility && visibility !== "ALL") {
      query = query.eq("visibility", visibility);
    }

    // Search by title or description
    if (search && search.trim()) {
      query = query.or(`title.ilike.%${search.trim()}%,description.ilike.%${search.trim()}%`);
    }

    // Filter by tag
    if (tag) {
      query = query.contains("tags", [tag]);
    }

    query = query.order("created_at", { ascending: false });

    const { data: documents, error } = await query;

    if (error) {
      console.error("[API/society/documents GET] Error:", error);
      return NextResponse.json({ error: "Failed to fetch documents" }, { status: 500 });
    }

    return NextResponse.json({ documents: documents || [] });
  } catch (err: any) {
    console.error("[API/society/documents GET] Exception:", err);
    return NextResponse.json(
      { error: err?.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}

export async function POST(
  req: Request,
  context: { params: Promise<{ societyId: string }> }
) {
  try {
    const { societyId } = await context.params;
    const { identity } = await requireSocietyAccess(societyId);

    if (!roleHasPermission(identity.currentRole, PERMISSIONS.DOCUMENTS_MANAGE)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const parsed = CreateCompleteDocumentSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const adminClient = createAdminClient();
    const canApprove = roleHasPermission(identity.currentRole, PERMISSIONS.DOCUMENTS_APPROVE);

    // If attempting to directly publish but user lacks approval permission, downgrade to UNDER_REVIEW
    let initialStatus = parsed.data.status || "PUBLISHED";
    if (initialStatus === "PUBLISHED" && !canApprove) {
      initialStatus = "UNDER_REVIEW";
    }

    // 1. Insert parent document record
    const { data: document, error: insertError } = await adminClient
      .from("documents")
      .insert({
        society_id: societyId,
        title: parsed.data.title,
        description: parsed.data.description || null,
        category: parsed.data.category,
        subcategory: parsed.data.subcategory || null,
        folder_id: parsed.data.folder_id || null,
        tags: parsed.data.tags || [],
        metadata: parsed.data.metadata || {},
        status: initialStatus,
        visibility: parsed.data.visibility || "ALL_RESIDENTS",
        allowed_roles: parsed.data.allowed_roles || [],
        unit_id: parsed.data.unit_id || null,
        resident_id: parsed.data.resident_id || null,
        document_date: parsed.data.document_date || null,
        effective_date: parsed.data.effective_date || null,
        expiry_date: parsed.data.expiry_date || null,
        file_url: parsed.data.file_url,
        file_path: parsed.data.file_path || null,
        file_type: parsed.data.file_type || "FILE",
        file_size_kb: parsed.data.file_size_kb || null,
        current_version: 1,
        uploaded_by: identity.effectiveUser.id,
        published_by: initialStatus === "PUBLISHED" ? identity.effectiveUser.id : null,
        published_at: initialStatus === "PUBLISHED" ? new Date().toISOString() : null,
        approved_by: initialStatus === "PUBLISHED" || initialStatus === "APPROVED" ? identity.effectiveUser.id : null,
        approved_at: initialStatus === "PUBLISHED" || initialStatus === "APPROVED" ? new Date().toISOString() : null,
      })
      .select()
      .single();

    if (insertError || !document) {
      console.error("[API/society/documents POST] Insert error:", insertError);
      return NextResponse.json({ error: "Failed to create document record" }, { status: 500 });
    }

    // 2. Create Version 1 record in document_versions
    await adminClient
      .from("document_versions")
      .insert({
        society_id: societyId,
        document_id: document.id,
        version_number: 1,
        file_url: parsed.data.file_url,
        file_path: parsed.data.file_path || null,
        file_name: parsed.data.title,
        file_type: parsed.data.file_type || "FILE",
        file_size_kb: parsed.data.file_size_kb || null,
        change_summary: "Initial upload",
        uploaded_by: identity.effectiveUser.id,
      });

    // 3. Optional Entity Link
    if (parsed.data.entity_type && parsed.data.entity_id) {
      await adminClient
        .from("document_entity_links")
        .insert({
          society_id: societyId,
          document_id: document.id,
          entity_type: parsed.data.entity_type,
          entity_id: parsed.data.entity_id,
          relationship_type: "ATTACHMENT",
          linked_by: identity.effectiveUser.id,
        });
    }

    await recordAuditLog({
      actorUserId: identity.originalUser.id,
      effectiveUserId: identity.effectiveUser.id,
      societyId,
      action: "DOCUMENT_UPLOADED",
      resourceType: "document",
      resourceId: document.id,
      metadata: {
        title: document.title,
        category: document.category,
        visibility: document.visibility,
        status: document.status,
      },
    });

    return NextResponse.json({ success: true, document }, { status: 201 });
  } catch (err: any) {
    console.error("[API/society/documents POST] Exception:", err);
    return NextResponse.json(
      { error: err?.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: Request,
  context: { params: Promise<{ societyId: string }> }
) {
  try {
    const { societyId } = await context.params;
    const { identity } = await requireSocietyAccess(societyId);

    if (!roleHasPermission(identity.currentRole, PERMISSIONS.DOCUMENTS_MANAGE)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "Document ID is required" }, { status: 400 });
    }

    const adminClient = createAdminClient();

    const { data: existing, error: fetchErr } = await adminClient
      .from("documents")
      .select("*")
      .eq("id", id)
      .eq("society_id", societyId)
      .single();

    if (fetchErr || !existing) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }

    // Hard delete requires DOCUMENTS_DELETE permission; otherwise soft-archive
    const canDelete = roleHasPermission(identity.currentRole, PERMISSIONS.DOCUMENTS_DELETE);

    if (canDelete) {
      const { error: deleteErr } = await adminClient
        .from("documents")
        .delete()
        .eq("id", id)
        .eq("society_id", societyId);

      if (deleteErr) {
        return NextResponse.json({ error: "Failed to delete document" }, { status: 500 });
      }

      await recordAuditLog({
        actorUserId: identity.originalUser.id,
        effectiveUserId: identity.effectiveUser.id,
        societyId,
        action: "DOCUMENT_DELETED",
        resourceType: "document",
        resourceId: id,
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
        .eq("id", id)
        .eq("society_id", societyId);

      await recordAuditLog({
        actorUserId: identity.originalUser.id,
        effectiveUserId: identity.effectiveUser.id,
        societyId,
        action: "DOCUMENT_ARCHIVED",
        resourceType: "document",
        resourceId: id,
        metadata: { title: existing.title },
      });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("[API/society/documents DELETE] Exception:", err);
    return NextResponse.json(
      { error: err?.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}
