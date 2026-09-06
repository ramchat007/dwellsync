import { NextResponse } from "next/server";
import { getCurrentIdentity } from "@/lib/auth/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { recordAuditLog } from "@/lib/auth/audit";

const ALLOWED_GATE_ROLES = ["SECURITY", "SOCIETY_ADMIN", "SECRETARY", "MANAGER"];

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

    const isAuthorized =
      identity.isSuperAdmin ||
      (identity.currentRole && ALLOWED_GATE_ROLES.includes(identity.currentRole));

    if (!isAuthorized) {
      return NextResponse.json({ error: "Forbidden: Security clearance required." }, { status: 403 });
    }

    const guardUserId = identity.effectiveUser.id;
    const adminClient = createAdminClient();

    // 1. Fetch visitor record in the guard's society
    const { data: visitor, error: fetchErr } = await adminClient
      .from("visitors")
      .select(`
        *,
        unit:units (
          id,
          unit_number
        )
      `)
      .eq("id", id)
      .eq("society_id", societyId)
      .single();

    if (fetchErr || !visitor) {
      return NextResponse.json({ error: "Visitor pass not found." }, { status: 404 });
    }

    if (visitor.status !== "CHECKED_IN") {
      return NextResponse.json(
        { error: `Cannot check out visitor with current status '${visitor.status}'.` },
        { status: 400 }
      );
    }

    const now = new Date().toISOString();

    // 2. Update status to CHECKED_OUT
    const { data: updated, error: updateErr } = await adminClient
      .from("visitors")
      .update({
        status: "CHECKED_OUT",
        check_out_at: now,
        check_out_by: guardUserId,
        updated_at: now,
      })
      .eq("id", id)
      .select(`
        *,
        unit:units (
          id,
          unit_number
        )
      `)
      .single();

    if (updateErr) {
      return NextResponse.json({ error: "Failed to update visitor check-out." }, { status: 500 });
    }

    // 3. Forensic audit log
    await recordAuditLog({
      actorUserId: identity.user.id,
      effectiveUserId: guardUserId,
      societyId,
      action: "VISITOR_CHECKED_OUT",
      resourceType: "visitors",
      resourceId: visitor.id,
      metadata: {
        visitor_name: visitor.visitor_name,
        unit_number: visitor.unit?.unit_number,
        check_in_at: visitor.check_in_at,
        check_out_at: now,
      },
    });

    return NextResponse.json({ success: true, visitor: updated });
  } catch (err) {
    console.error("[Security Visitor Check-Out] Error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
