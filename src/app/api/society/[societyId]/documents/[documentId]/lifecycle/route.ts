import { NextResponse } from "next/server";
import { requireSocietyAccess, roleHasPermission } from "@/lib/auth/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { recordAuditLog } from "@/lib/auth/audit";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { DocumentLifecycleSchema } from "@/lib/validations/documents";
import { publishDocumentAndNotify } from "@/lib/services/documentService";
import { sendDomainNotification } from "@/lib/services/notificationService";
import { z } from "zod";

export const dynamic = "force-dynamic";

export async function POST(
  req: Request,
  context: { params: Promise<{ societyId: string; documentId: string }> }
) {
  try {
    const { societyId, documentId } = await context.params;
    const { identity } = await requireSocietyAccess(societyId);

    if (!z.string().uuid().safeParse(documentId).success) {
      return NextResponse.json({ error: "Invalid document ID" }, { status: 400 });
    }

    const body = await req.json();
    const parsed = DocumentLifecycleSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { action, publication_notes, broadcast_notification } = parsed.data;
    const adminClient = createAdminClient();

    const { data: document, error: fetchErr } = await adminClient
      .from("documents")
      .select("*")
      .eq("id", documentId)
      .eq("society_id", societyId)
      .single();

    if (fetchErr || !document) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }

    const now = new Date().toISOString();

    // 1. SUBMIT_REVIEW
    if (action === "SUBMIT_REVIEW") {
      if (!roleHasPermission(identity.currentRole, PERMISSIONS.DOCUMENTS_MANAGE)) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }

      const { data: updated, error } = await adminClient
        .from("documents")
        .update({
          status: "UNDER_REVIEW",
          updated_at: now,
        })
        .eq("id", documentId)
        .eq("society_id", societyId)
        .select()
        .single();

      if (error) throw new Error(error.message);

      // Notify committee members
      const { data: committee } = await adminClient
        .from("society_memberships")
        .select("user_id")
        .eq("society_id", societyId)
        .eq("status", "ACTIVE")
        .in("role_id", ["SOCIETY_ADMIN", "SECRETARY", "COMMITTEE_MEMBER"]);

      if (committee && committee.length > 0) {
        await sendDomainNotification({
          societyId,
          recipientIds: committee.map((c: any) => c.user_id),
          type: "DOCUMENT_REVIEW_REQUESTED",
          category: "GENERAL",
          actorId: identity.effectiveUser.id,
          data: {
            documentTitle: document.title,
            documentId: document.id,
            societyId,
          },
        });
      }

      await recordAuditLog({
        actorUserId: identity.originalUser.id,
        effectiveUserId: identity.effectiveUser.id,
        societyId,
        action: "DOCUMENT_UPDATED",
        resourceType: "document",
        resourceId: documentId,
        metadata: { status: "UNDER_REVIEW", title: document.title },
      });

      return NextResponse.json({ success: true, document: updated });
    }

    // 2. APPROVE
    if (action === "APPROVE") {
      if (!roleHasPermission(identity.currentRole, PERMISSIONS.DOCUMENTS_APPROVE)) {
        return NextResponse.json({ error: "Forbidden: requires documents.approve permission" }, { status: 403 });
      }

      const { data: updated, error } = await adminClient
        .from("documents")
        .update({
          status: "APPROVED",
          approved_by: identity.effectiveUser.id,
          approved_at: now,
          updated_at: now,
        })
        .eq("id", documentId)
        .eq("society_id", societyId)
        .select()
        .single();

      if (error) throw new Error(error.message);

      await recordAuditLog({
        actorUserId: identity.originalUser.id,
        effectiveUserId: identity.effectiveUser.id,
        societyId,
        action: "DOCUMENT_APPROVED",
        resourceType: "document",
        resourceId: documentId,
        metadata: { title: document.title },
      });

      return NextResponse.json({ success: true, document: updated });
    }

    // 3. PUBLISH
    if (action === "PUBLISH") {
      if (!roleHasPermission(identity.currentRole, PERMISSIONS.DOCUMENTS_APPROVE)) {
        return NextResponse.json({ error: "Forbidden: requires documents.approve permission" }, { status: 403 });
      }

      const published = await publishDocumentAndNotify({
        societyId,
        documentId,
        actorId: identity.effectiveUser.id,
        publicationNotes: publication_notes,
        broadcastNotification: broadcast_notification,
      });

      return NextResponse.json({ success: true, document: published });
    }

    // 4. ARCHIVE
    if (action === "ARCHIVE") {
      if (!roleHasPermission(identity.currentRole, PERMISSIONS.DOCUMENTS_ARCHIVE)) {
        return NextResponse.json({ error: "Forbidden: requires documents.archive permission" }, { status: 403 });
      }

      const { data: updated, error } = await adminClient
        .from("documents")
        .update({
          is_archived: true,
          status: "ARCHIVED",
          archived_at: now,
          archived_by: identity.effectiveUser.id,
          updated_at: now,
        })
        .eq("id", documentId)
        .eq("society_id", societyId)
        .select()
        .single();

      if (error) throw new Error(error.message);

      await recordAuditLog({
        actorUserId: identity.originalUser.id,
        effectiveUserId: identity.effectiveUser.id,
        societyId,
        action: "DOCUMENT_ARCHIVED",
        resourceType: "document",
        resourceId: documentId,
        metadata: { title: document.title },
      });

      return NextResponse.json({ success: true, document: updated });
    }

    // 5. RESTORE
    if (action === "RESTORE") {
      if (!roleHasPermission(identity.currentRole, PERMISSIONS.DOCUMENTS_ARCHIVE)) {
        return NextResponse.json({ error: "Forbidden: requires documents.archive permission" }, { status: 403 });
      }

      const { data: updated, error } = await adminClient
        .from("documents")
        .update({
          is_archived: false,
          status: "PUBLISHED",
          archived_at: null,
          archived_by: null,
          updated_at: now,
        })
        .eq("id", documentId)
        .eq("society_id", societyId)
        .select()
        .single();

      if (error) throw new Error(error.message);

      await recordAuditLog({
        actorUserId: identity.originalUser.id,
        effectiveUserId: identity.effectiveUser.id,
        societyId,
        action: "DOCUMENT_RESTORED",
        resourceType: "document",
        resourceId: documentId,
        metadata: { title: document.title },
      });

      return NextResponse.json({ success: true, document: updated });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (err: any) {
    console.error("[API/society/documents/[documentId]/lifecycle POST] Exception:", err);
    return NextResponse.json(
      { error: err?.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}
