import { NextResponse } from "next/server";
import { getCurrentIdentity } from "@/lib/auth/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { recordAuditLog } from "@/lib/auth/audit";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const identity = await getCurrentIdentity();
    if (!identity || !identity.isAuthenticated) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const societyId = identity.currentSociety?.id;
    if (!societyId) {
      return NextResponse.json({ error: "No active society context" }, { status: 400 });
    }

    const userId = identity.effectiveUser.id;
    const adminClient = createAdminClient();

    // 1. Fetch visitor record
    const { data: visitor, error: fetchErr } = await adminClient
      .from("visitors")
      .select("*")
      .eq("id", id)
      .eq("society_id", societyId)
      .single();

    if (fetchErr || !visitor) {
      return NextResponse.json({ error: "Visitor pass not found." }, { status: 404 });
    }

    // 2. Ensure caller is creator or unit owner
    if (!identity.isSuperAdmin && visitor.created_by !== userId) {
      const { data: isOwner } = await adminClient
        .from("unit_owners")
        .select("id")
        .eq("unit_id", visitor.unit_id)
        .eq("user_id", userId)
        .eq("status", "ACTIVE")
        .maybeSingle();

      if (!isOwner) {
        return NextResponse.json(
          { error: "Unauthorized: You do not have permission to cancel this pass." },
          { status: 403 }
        );
      }
    }

    // 3. Only EXPECTED visitors can be cancelled
    if (visitor.status !== "EXPECTED") {
      return NextResponse.json(
        { error: `Cannot cancel a visitor with status '${visitor.status}'.` },
        { status: 400 }
      );
    }

    // 4. Update status
    const { data: updated, error: updateErr } = await adminClient
      .from("visitors")
      .update({
        status: "CANCELLED",
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select()
      .single();

    if (updateErr) {
      return NextResponse.json({ error: "Failed to cancel visitor pass." }, { status: 500 });
    }

    // 5. Record audit log
    await recordAuditLog({
      actorUserId: identity.user.id,
      effectiveUserId: userId,
      societyId,
      action: "VISITOR_CANCELLED",
      resourceType: "visitors",
      resourceId: id,
      metadata: {
        visitor_name: visitor.visitor_name,
        pass_code: visitor.pass_code,
        unit_id: visitor.unit_id,
      },
    });

    return NextResponse.json({ success: true, visitor: updated });
  } catch (err) {
    console.error("[Resident Visitor Cancel] Error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
