import { NextResponse } from "next/server";
import { requireSocietyAccess, roleHasPermission } from "@/lib/auth/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { recordAuditLog } from "@/lib/auth/audit";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { CreateDocumentFolderSchema } from "@/lib/validations/documents";

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

    const adminClient = createAdminClient();

    const { data: folders, error } = await adminClient
      .from("document_folders")
      .select(`
        *,
        creator:profiles!created_by (id, full_name, display_name)
      `)
      .eq("society_id", societyId)
      .order("name", { ascending: true });

    if (error) {
      return NextResponse.json({ error: "Failed to fetch folders" }, { status: 500 });
    }

    // Get document count per folder
    const { data: counts } = await adminClient
      .from("documents")
      .select("folder_id")
      .eq("society_id", societyId)
      .eq("is_archived", false);

    const countMap: Record<string, number> = {};
    (counts || []).forEach((c: any) => {
      const fid = c.folder_id || "ROOT";
      countMap[fid] = (countMap[fid] || 0) + 1;
    });

    const enriched = (folders || []).map((f: any) => ({
      ...f,
      document_count: countMap[f.id] || 0,
    }));

    return NextResponse.json({
      folders: enriched,
      root_count: countMap["ROOT"] || 0,
    });
  } catch (err: any) {
    console.error("[API/society/documents/folders GET] Exception:", err);
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
    const parsed = CreateDocumentFolderSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const adminClient = createAdminClient();

    const { data: folder, error } = await adminClient
      .from("document_folders")
      .insert({
        society_id: societyId,
        name: parsed.data.name,
        description: parsed.data.description || null,
        parent_id: parsed.data.parent_id || null,
        color: parsed.data.color || "#3B82F6",
        icon: parsed.data.icon || "Folder",
        created_by: identity.effectiveUser.id,
      })
      .select()
      .single();

    if (error) {
      if (error.code === "23505") {
        return NextResponse.json({ error: "A folder with this name already exists at this level." }, { status: 409 });
      }
      return NextResponse.json({ error: "Failed to create folder" }, { status: 500 });
    }

    await recordAuditLog({
      actorUserId: identity.originalUser.id,
      effectiveUserId: identity.effectiveUser.id,
      societyId,
      action: "DOCUMENT_FOLDER_CREATED",
      resourceType: "document_folder",
      resourceId: folder.id,
      metadata: { name: folder.name },
    });

    return NextResponse.json({ success: true, folder }, { status: 201 });
  } catch (err: any) {
    console.error("[API/society/documents/folders POST] Exception:", err);
    return NextResponse.json(
      { error: err?.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}
