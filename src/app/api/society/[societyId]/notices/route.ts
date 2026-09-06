import { NextResponse } from "next/server";
import { requireSocietyAccess } from "@/lib/auth/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { recordAuditLog } from "@/lib/auth/audit";
import { broadcastSocietyNotification } from "@/lib/services/notificationService";
import { CreateNoticeSchema } from "@/lib/validations/operations";
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

    const { data: notices, error } = await adminClient
      .from("notices")
      .select(`
        *,
        publisher:profiles!published_by (
          id,
          full_name,
          display_name
        )
      `)
      .eq("society_id", societyId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("[API/society/notices] Error fetching notices:", error);
      return NextResponse.json({ error: "Failed to fetch notices" }, { status: 500 });
    }

    return NextResponse.json({ notices: notices || [] });
  } catch (err: any) {
    console.error("[API/society/notices] Exception:", err);
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
    const parsed = CreateNoticeSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const adminClient = createAdminClient();

    const { data: notice, error: insertError } = await adminClient
      .from("notices")
      .insert({
        society_id: societyId,
        title: parsed.data.title,
        description: parsed.data.description,
        category: parsed.data.category,
        priority: parsed.data.priority,
        published_by: identity.effectiveUser.id,
        published_at: new Date().toISOString(),
        expires_at: parsed.data.expires_at || null,
        attachment_url: parsed.data.attachment_url || null,
        status: "PUBLISHED",
      })
      .select()
      .single();

    if (insertError) {
      console.error("[API/society/notices] Error publishing notice:", insertError);
      return NextResponse.json({ error: "Failed to publish notice" }, { status: 500 });
    }

    await recordAuditLog({
      actorUserId: identity.originalUser.id,
      effectiveUserId: identity.effectiveUser.id,
      societyId,
      action: "NOTICE_CREATED",
      resourceType: "notice",
      resourceId: notice.id,
      metadata: {
        title: notice.title,
        category: notice.category,
        priority: notice.priority,
      },
    });

    // If published immediately, dispatch broadcast notification
    if (notice.status === "PUBLISHED") {
      await broadcastSocietyNotification({
        societyId,
        actorId: identity.effectiveUser.id,
        category: "NOTICES",
        type: notice.priority === "URGENT" ? "IMPORTANT_NOTICE_PUBLISHED" : "NOTICE_PUBLISHED",
        title: notice.title,
        body: notice.body,
        actionUrl: "/resident/notices",
      });
    }

    return NextResponse.json({ success: true, notice });
  } catch (err: any) {
    console.error("[API/society/notices] Exception:", err);
    return NextResponse.json(
      { error: err?.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}

const PatchNoticeSchema = CreateNoticeSchema.partial().extend({
  id: z.string().uuid("Invalid notice ID"),
  status: z.enum(["PUBLISHED", "DRAFT", "ARCHIVED"]).optional(),
});

export async function PATCH(
  req: Request,
  context: { params: Promise<{ societyId: string }> }
) {
  try {
    const { societyId } = await context.params;
    const { identity } = await requireSocietyAccess(societyId);

    const body = await req.json();
    const parsed = PatchNoticeSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const adminClient = createAdminClient();
    const { id, ...updates } = parsed.data;

    const { data: updated, error: updateErr } = await adminClient
      .from("notices")
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .eq("society_id", societyId)
      .select()
      .single();

    if (updateErr) {
      console.error("[API/society/notices] Error updating notice:", updateErr);
      return NextResponse.json({ error: "Failed to update notice" }, { status: 500 });
    }

    const action = updates.status === "ARCHIVED" ? "NOTICE_ARCHIVED" : "NOTICE_UPDATED";

    await recordAuditLog({
      actorUserId: identity.originalUser.id,
      effectiveUserId: identity.effectiveUser.id,
      societyId,
      action,
      resourceType: "notice",
      resourceId: id,
      metadata: updates,
    });

    return NextResponse.json({ success: true, notice: updated });
  } catch (err: any) {
    console.error("[API/society/notices] Exception:", err);
    return NextResponse.json(
      { error: err?.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}
