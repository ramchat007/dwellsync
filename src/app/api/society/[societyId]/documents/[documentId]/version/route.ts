import { NextResponse } from "next/server";
import { requireSocietyAccess, roleHasPermission } from "@/lib/auth/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { recordAuditLog } from "@/lib/auth/audit";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { UploadDocumentVersionSchema } from "@/lib/validations/documents";
import { z } from "zod";

export const dynamic = "force-dynamic";

export async function POST(
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
    const parsed = UploadDocumentVersionSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const adminClient = createAdminClient();

    // 1. Fetch current document
    const { data: document, error: fetchErr } = await adminClient
      .from("documents")
      .select("*")
      .eq("id", documentId)
      .eq("society_id", societyId)
      .single();

    if (fetchErr || !document) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }

    const nextVersionNumber = (document.current_version || 1) + 1;

    // 2. Insert new version record
    const { data: newVersion, error: verErr } = await adminClient
      .from("document_versions")
      .insert({
        society_id: societyId,
        document_id: documentId,
        version_number: nextVersionNumber,
        file_url: parsed.data.file_url,
        file_path: parsed.data.file_path || null,
        file_name: parsed.data.file_name || document.title,
        file_type: parsed.data.file_type || document.file_type || "FILE",
        file_size_kb: parsed.data.file_size_kb || null,
        change_summary: parsed.data.change_summary || `Version ${nextVersionNumber}`,
        uploaded_by: identity.effectiveUser.id,
      })
      .select()
      .single();

    if (verErr || !newVersion) {
      console.error("[API/documents/[documentId]/version POST] Error inserting version:", verErr);
      return NextResponse.json({ error: "Failed to record document version" }, { status: 500 });
    }

    // 3. Update current document with latest version information
    const { data: updatedDoc, error: updateErr } = await adminClient
      .from("documents")
      .update({
        current_version: nextVersionNumber,
        file_url: parsed.data.file_url,
        file_path: parsed.data.file_path || document.file_path,
        file_type: parsed.data.file_type || document.file_type,
        file_size_kb: parsed.data.file_size_kb || document.file_size_kb,
        updated_at: new Date().toISOString(),
      })
      .eq("id", documentId)
      .eq("society_id", societyId)
      .select()
      .single();

    if (updateErr) {
      console.error("[API/documents/[documentId]/version POST] Error updating parent document:", updateErr);
    }

    await recordAuditLog({
      actorUserId: identity.originalUser.id,
      effectiveUserId: identity.effectiveUser.id,
      societyId,
      action: "DOCUMENT_VERSION_UPLOADED",
      resourceType: "document",
      resourceId: documentId,
      metadata: {
        version_number: nextVersionNumber,
        file_name: newVersion.file_name,
        change_summary: newVersion.change_summary,
      },
    });

    return NextResponse.json({
      success: true,
      version: newVersion,
      document: updatedDoc || document,
    });
  } catch (err: any) {
    console.error("[API/society/documents/[documentId]/version POST] Exception:", err);
    return NextResponse.json(
      { error: err?.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}
