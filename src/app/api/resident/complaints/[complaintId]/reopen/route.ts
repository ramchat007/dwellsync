import { NextResponse } from "next/server";
import { getCurrentIdentity } from "@/lib/auth/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { recordAuditLog } from "@/lib/auth/audit";
import { sendDomainNotification } from "@/lib/services/notificationService";
import {
  calculateDeadlines,
  getSlaConfigForComplaint,
  logComplaintTimelineEvent,
} from "@/lib/services/slaService";
import { ReopenComplaintSchema } from "@/lib/validations/complaints";
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

    const body = await req.json();
    const parsed = ReopenComplaintSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const userId = identity.effectiveUser.id;
    const adminClient = createAdminClient();

    // Verify complaint exists, belongs to this resident, and is in RESOLVED or CLOSED
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
      return NextResponse.json({ error: "Forbidden: You can only reopen your own complaints" }, { status: 403 });
    }

    if (!["RESOLVED", "CLOSED"].includes(existing.status)) {
      return NextResponse.json(
        { error: `Cannot reopen complaint with status ${existing.status}. Only resolved or closed tickets can be reopened.` },
        { status: 400 }
      );
    }

    const newCycleNumber = (existing.sla_cycle_number || 1) + 1;
    const now = new Date();
    const nowIso = now.toISOString();

    // Calculate fresh SLA deadlines for new cycle
    const slaConfig = await getSlaConfigForComplaint(societyId, existing.category, existing.priority);
    const deadlines = calculateDeadlines(now, slaConfig, existing.priority);

    const { data: updated, error: updateErr } = await adminClient
      .from("complaints")
      .update({
        status: "REOPENED",
        sla_status: "ON_TRACK",
        sla_cycle_number: newCycleNumber,
        response_due_at: deadlines.responseDueAt.toISOString(),
        resolution_due_at: deadlines.resolutionDueAt.toISOString(),
        responded_at: null,
        resolved_at: null,
        closed_at: null,
        sla_paused_at: null,
        total_paused_duration_minutes: 0,
        is_response_breached: false,
        is_resolution_breached: false,
        escalation_level: 0,
        last_escalated_at: null,
        updated_at: nowIso,
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
      console.error("[API/resident/complaints/[complaintId]/reopen] Update error:", updateErr);
      return NextResponse.json({ error: "Failed to reopen complaint" }, { status: 500 });
    }

    // Log REOPENED event in timeline for the new cycle
    await logComplaintTimelineEvent({
      societyId,
      complaintId,
      cycleNumber: newCycleNumber,
      eventType: "REOPENED",
      fromStatus: existing.status,
      toStatus: "REOPENED",
      actorId: userId,
      notes: `Reopened by resident: ${parsed.data.reason}`,
      metadata: {
        reason: parsed.data.reason,
        cycle_number: newCycleNumber,
        new_resolution_due_at: deadlines.resolutionDueAt.toISOString(),
      },
    });

    // Audit log
    await recordAuditLog({
      actorUserId: identity.originalUser.id,
      effectiveUserId: userId,
      societyId,
      action: "COMPLAINT_REOPENED",
      resourceType: "complaint",
      resourceId: complaintId,
      metadata: {
        cycle_number: newCycleNumber,
        reason: parsed.data.reason,
      },
    });

    // Notify assigned staff and society managers
    const { data: managers } = await adminClient
      .from("society_memberships")
      .select("user_id")
      .eq("society_id", societyId)
      .eq("status", "ACTIVE")
      .in("role_id", ["MANAGER", "SOCIETY_ADMIN"]);

    const recipientSet = new Set<string>();
    if (existing.assigned_to) recipientSet.add(existing.assigned_to);
    (managers || []).forEach((m) => recipientSet.add(m.user_id));

    const recipientIds = Array.from(recipientSet);
    if (recipientIds.length > 0) {
      await sendDomainNotification({
        societyId,
        recipientIds,
        type: "COMPLAINT_REOPENED",
        category: "COMPLAINTS",
        actorId: userId,
        data: {
          ticketNumber: existing.id.substring(0, 8),
          complaintId: existing.id,
          title: existing.title,
          reason: parsed.data.reason,
          societyId,
        },
      });
    }

    return NextResponse.json({ success: true, complaint: updated });
  } catch (err: any) {
    console.error("[API/resident/complaints/[complaintId]/reopen POST]", err);
    return NextResponse.json({ error: err?.message || "Internal Server Error" }, { status: 500 });
  }
}

