import { NextResponse } from "next/server";
import { requireSocietyAccess, roleHasPermission } from "@/lib/auth/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { recordAuditLog } from "@/lib/auth/audit";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { UpdateDocumentFolderSchema } from "@/lib/validations/documents";
import { z } from "zod";

export const dynamic = "force-dynamic";

export async function PATCH(
  req: Request,
  context: { params: Promise<{ societyId: string; folderId: string }> }
) {
  try {
    const { societyId, folderId } = await context.params;
    const { identity } = await requireSocietyAccess(societyId);

    if (!roleHasPermission(identity.currentRole, PERMISSIONS.DOCUMENTS_MANAGE)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (!z.string().uuid().safeParse(folderId).success) {
      return NextResponse.json({ error: "Invalid folder ID" }, { status: 400 });
    }

    const body = await req.json();
    const parsed = UpdateDocumentFolderSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const adminClient = createAdminClient();

    const { data: updated, error } = await adminClient
      .from("document_folders")
      .update({
        ...parsed.data,
        updated_at: new Date().toISOString(),
      })
      .eq("id", folderId)
      .eq("society_id", societyId)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: "Failed to update folder" }, { status: 500 });
    }

    await recordAuditLog({
      actorUserId: identity.originalUser.id,
      effectiveUserId: identity.effectiveUser.id,
      societyId,
      action: "DOCUMENT_FOLDER_UPDATED",
      resourceType: "document_folder",
      resourceId: folderId,
      metadata: { name: updated.name },
    });

    return NextResponse.json({ success: true, folder: updated });
  } catch (err: any) {
    console.error("[API/society/documents/folders/[folderId] PATCH] Exception:", err);
    return NextResponse.json(
      { error: err?.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: Request,
  context: { params: Promise<{ societyId: string; folderId: string }> }
) {
  try {
    const { societyId, folderId } = await context.params;
    const { identity } = await requireSocietyAccess(societyId);

    if (!roleHasPermission(identity.currentRole, PERMISSIONS.DOCUMENTS_MANAGE)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (!z.string().uuid().safeParse(folderId).success) {
      return NextResponse.json({ error: "Invalid folder ID" }, { status: 400 });
    }

    const adminClient = createAdminClient();

    // 1. Move all documents in this folder to root (folder_id = null)
    await adminClient
      .from("documents")
      .update({ folder_id: null })
      .eq("folder_id", folderId)
      .eq("society_id", societyId);

    // 2. Delete the folder record
    const { error: delErr } = await adminClient
      .from("document_folders")
      .delete()
      .eq("id", folderId)
      .eq("society_id", societyId);

    if (delErr) {
      return NextResponse.json({ error: "Failed to delete folder" }, { status: 500 });
    }

    await recordAuditLog({
      actorUserId: identity.originalUser.id,
      effectiveUserId: identity.effectiveUser.id,
      societyId,
      action: "DOCUMENT_FOLDER_DELETED",
      resourceType: "document_folder",
      resourceId: folderId,
      metadata: { folder_id: folderId },
    });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("[API/society/documents/folders/[folderId] DELETE] Exception:", err);
    return NextResponse.json(
      { error: err?.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}
