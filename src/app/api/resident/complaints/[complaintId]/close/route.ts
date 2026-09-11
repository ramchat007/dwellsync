import { NextResponse } from "next/server";
import { getCurrentIdentity } from "@/lib/auth/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { recordAuditLog } from "@/lib/auth/audit";
import { logComplaintTimelineEvent } from "@/lib/services/slaService";
import { CloseComplaintSchema } from "@/lib/validations/complaints";
import { z } from "zod";

export const dynamic = "force-dynamic";

export async function POST(
  req: Request,
  context: { params: Promise<{ complaintId: string }> }
) {
  try {
    const identity = await getCurrentIdentity();
    if (!identity || !identity.isAuthenticated) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const societyId = identity.currentSociety?.id;
    if (!societyId) {
      return NextResponse.json({ error: "No active society context" }, { status: 400 });
    }

    const { complaintId } = await context.params;
    if (!z.string().uuid().safeParse(complaintId).success) {
      return NextResponse.json({ error: "Invalid complaint ID" }, { status: 400 });
    }

    const body = await req.json().catch(() => ({}));
    const parsed = CloseComplaintSchema.safeParse(body);
    const closureReason = parsed.success && parsed.data.closure_reason ? parsed.data.closure_reason : "Confirmed resolved by resident";

    const userId = identity.effectiveUser.id;
    const adminClient = createAdminClient();

    const { data: existing, error: fetchErr } = await adminClient
      .from("complaints")
      .select("*")
      .eq("id", complaintId)
      .eq("society_id", societyId)
      .single();

    if (fetchErr || !existing) {
      return NextResponse.json({ error: "Complaint not found" }, { status: 404 });
    }

    if (existing.created_by !== userId) {
      return NextResponse.json({ error: "Forbidden: You can only close your own complaints" }, { status: 403 });
    }

    if (existing.status === "CLOSED") {
      return NextResponse.json({ success: true, complaint: existing, message: "Complaint is already closed" });
    }

    const now = new Date().toISOString();

    const { data: updated, error: updateErr } = await adminClient
      .from("complaints")
      .update({
        status: "CLOSED",
        closed_at: now,
        closure_reason: closureReason,
        sla_status: "COMPLETED",
        updated_at: now,
      })
      .eq("id", complaintId)
      .select(`
        *,
        unit:units (
          id,
          unit_number,
          building:buildings (name, code),
          wing:wings (name, code)
        ),
        creator:profiles!complaints_created_by_fkey (
          id,
          full_name,
          display_name
        ),
        assignee:profiles!complaints_assigned_to_fkey (
          id,
          full_name,
          display_name
        )
      `)
      .single();

    if (updateErr) {
      console.error("[API/resident/complaints/[complaintId]/close] Update error:", updateErr);
      return NextResponse.json({ error: "Failed to close complaint" }, { status: 500 });
    }

    await logComplaintTimelineEvent({
      societyId,
      complaintId,
      cycleNumber: existing.sla_cycle_number || 1,
      eventType: "CLOSED",
      fromStatus: existing.status,
      toStatus: "CLOSED",
      actorId: userId,
      notes: closureReason,
    });

    await recordAuditLog({
      actorUserId: identity.originalUser.id,
      effectiveUserId: userId,
      societyId,
      action: "COMPLAINT_CLOSED",
      resourceType: "complaint",
      resourceId: complaintId,
      metadata: { closure_reason: closureReason },
    });

    return NextResponse.json({ success: true, complaint: updated });
  } catch (err: any) {
    console.error("[API/resident/complaints/[complaintId]/close POST]", err);
    return NextResponse.json({ error: err?.message || "Internal Server Error" }, { status: 500 });
  }
}

