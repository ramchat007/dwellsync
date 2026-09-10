import { NextResponse } from "next/server";
import { requireSocietyAccess, roleHasPermission } from "@/lib/auth/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { recordAuditLog } from "@/lib/auth/audit";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { CreateDocumentEntityLinkSchema } from "@/lib/validations/documents";
import { z } from "zod";

export const dynamic = "force-dynamic";

export async function GET(
  req: Request,
  context: { params: Promise<{ societyId: string; documentId: string }> }
) {
  try {
    const { societyId, documentId } = await context.params;
    const { identity } = await requireSocietyAccess(societyId);

    if (!roleHasPermission(identity.currentRole, PERMISSIONS.DOCUMENTS_VIEW)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (!z.string().uuid().safeParse(documentId).success) {
      return NextResponse.json({ error: "Invalid document ID" }, { status: 400 });
    }

    const adminClient = createAdminClient();

    const { data: links, error } = await adminClient
      .from("document_entity_links")
      .select(`
        *,
        linker:profiles!linked_by (id, full_name, display_name)
      `)
      .eq("document_id", documentId)
      .eq("society_id", societyId)
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: "Failed to fetch entity links" }, { status: 500 });
    }

    return NextResponse.json({ links: links || [] });
  } catch (err: any) {
    console.error("[API/society/documents/[documentId]/entity-links GET] Exception:", err);
    return NextResponse.json(
      { error: err?.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}

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
    const parsed = CreateDocumentEntityLinkSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const adminClient = createAdminClient();

    // Verify document belongs to society
    const { data: doc } = await adminClient
      .from("documents")
      .select("id, title")
      .eq("id", documentId)
      .eq("society_id", societyId)
      .single();

    if (!doc) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }

    const { data: link, error: insertErr } = await adminClient
      .from("document_entity_links")
      .insert({
        society_id: societyId,
        document_id: documentId,
        entity_type: parsed.data.entity_type,
        entity_id: parsed.data.entity_id,
        relationship_type: parsed.data.relationship_type || "ATTACHMENT",
        notes: parsed.data.notes || null,
        linked_by: identity.effectiveUser.id,
      })
      .select()
      .single();

    if (insertErr) {
      if (insertErr.code === "23505") {
        return NextResponse.json({ error: "Document is already linked to this entity." }, { status: 409 });
      }
      return NextResponse.json({ error: "Failed to link entity" }, { status: 500 });
    }

    await recordAuditLog({
      actorUserId: identity.originalUser.id,
      effectiveUserId: identity.effectiveUser.id,
      societyId,
      action: "DOCUMENT_ENTITY_LINKED",
      resourceType: "document_entity_link",
      resourceId: link.id,
      metadata: {
        document_id: documentId,
        entity_type: parsed.data.entity_type,
        entity_id: parsed.data.entity_id,
      },
    });

    return NextResponse.json({ success: true, link }, { status: 201 });
  } catch (err: any) {
    console.error("[API/society/documents/[documentId]/entity-links POST] Exception:", err);
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

    const { searchParams } = new URL(req.url);
    const linkId = searchParams.get("linkId");
    if (!linkId || !z.string().uuid().safeParse(linkId).success) {
      return NextResponse.json({ error: "Valid linkId is required" }, { status: 400 });
    }

    const adminClient = createAdminClient();

    const { error: delErr } = await adminClient
      .from("document_entity_links")
      .delete()
      .eq("id", linkId)
      .eq("document_id", documentId)
      .eq("society_id", societyId);

    if (delErr) {
      return NextResponse.json({ error: "Failed to remove entity link" }, { status: 500 });
    }

    await recordAuditLog({
      actorUserId: identity.originalUser.id,
      effectiveUserId: identity.effectiveUser.id,
      societyId,
      action: "DOCUMENT_ENTITY_UNLINKED",
      resourceType: "document_entity_link",
      resourceId: linkId,
      metadata: { document_id: documentId },
    });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("[API/society/documents/[documentId]/entity-links DELETE] Exception:", err);
    return NextResponse.json(
      { error: err?.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}
