import { NextResponse } from "next/server";
import { requireSocietyAccess } from "@/lib/auth/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { recordAuditLog } from "@/lib/auth/audit";
import { checkUserDocumentAccess, generateDocumentSignedUrl } from "@/lib/services/documentService";
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

    const { searchParams } = new URL(req.url);
    const requestedVersion = searchParams.get("version");

    const adminClient = createAdminClient();

    // 1. Fetch document
    const { data: document, error: docErr } = await adminClient
      .from("documents")
      .select("*")
      .eq("id", documentId)
      .eq("society_id", societyId)
      .single();

    if (docErr || !document) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }

    // 2. Authoritative access check
    const hasAccess = await checkUserDocumentAccess(identity, document, societyId);
    if (!hasAccess) {
      return NextResponse.json({ error: "Forbidden: You do not have access to this document" }, { status: 403 });
    }

    let targetFileUrl = document.file_url;
    let targetFilePath = document.file_path;
    let targetFileName = document.title;
    let targetFileType = document.file_type;
    let versionNum = document.current_version;

    // 3. If a specific version was requested
    if (requestedVersion) {
      const vNum = parseInt(requestedVersion, 10);
      if (!isNaN(vNum)) {
        const { data: verRecord } = await adminClient
          .from("document_versions")
          .select("*")
          .eq("document_id", documentId)
          .eq("society_id", societyId)
          .eq("version_number", vNum)
          .single();

        if (verRecord) {
          targetFileUrl = verRecord.file_url;
          targetFilePath = verRecord.file_path;
          targetFileName = verRecord.file_name || `${document.title}_v${vNum}`;
          targetFileType = verRecord.file_type || document.file_type;
          versionNum = vNum;
        }
      }
    }

    // 4. Generate signed URL for private storage path
    const downloadUrl = await generateDocumentSignedUrl(
      societyId,
      targetFilePath || targetFileUrl,
      300 // 5 minutes validity
    );

    // 5. Audit access/download
    await recordAuditLog({
      actorUserId: identity.originalUser.id,
      effectiveUserId: identity.effectiveUser.id,
      societyId,
      action: "DOCUMENT_DOWNLOADED",
      resourceType: "document",
      resourceId: documentId,
      metadata: {
        title: document.title,
        version: versionNum,
      },
    });

    return NextResponse.json({
      success: true,
      download_url: downloadUrl,
      file_name: targetFileName,
      file_type: targetFileType,
      version: versionNum,
    });
  } catch (err: any) {
    console.error("[API/society/documents/[documentId]/download GET] Exception:", err);
    return NextResponse.json(
      { error: err?.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}
