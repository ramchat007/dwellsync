import { NextResponse } from "next/server";
import { requireSocietyAccess } from "@/lib/auth/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { recordAuditLog } from "@/lib/auth/audit";
import { CreateDocumentSchema } from "@/lib/validations/operations";
import { z } from "zod";

export const dynamic = "force-dynamic";

export async function GET(
  req: Request,
  context: { params: Promise<{ societyId: string }> }
) {
  try {
    const { societyId } = await context.params;
    await requireSocietyAccess(societyId);

    const adminClient = createAdminClient();

    const { data: documents, error } = await adminClient
      .from("documents")
      .select(`
        *,
        uploader:profiles!uploaded_by (
          id,
          full_name,
          display_name
        )
      `)
      .eq("society_id", societyId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("[API/society/documents] Error fetching documents:", error);
      return NextResponse.json({ error: "Failed to fetch documents" }, { status: 500 });
    }

    return NextResponse.json({ documents: documents || [] });
  } catch (err: any) {
    console.error("[API/society/documents] Exception:", err);
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

    const body = await req.json();
    const parsed = CreateDocumentSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const adminClient = createAdminClient();

    const { data: document, error: insertError } = await adminClient
      .from("documents")
      .insert({
        society_id: societyId,
        title: parsed.data.title,
        description: parsed.data.description || null,
        category: parsed.data.category,
        file_url: parsed.data.file_url,
        file_type: parsed.data.file_type || "PDF",
        file_size_kb: parsed.data.file_size_kb || null,
        visibility: parsed.data.visibility,
        uploaded_by: identity.effectiveUser.id,
      })
      .select()
      .single();

    if (insertError) {
      console.error("[API/society/documents] Error creating document:", insertError);
      return NextResponse.json({ error: "Failed to add document" }, { status: 500 });
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
      },
    });

    return NextResponse.json({ success: true, document });
  } catch (err: any) {
    console.error("[API/society/documents] Exception:", err);
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
      metadata: {
        title: existing.title,
      },
    });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("[API/society/documents] Exception:", err);
    return NextResponse.json(
      { error: err?.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}
