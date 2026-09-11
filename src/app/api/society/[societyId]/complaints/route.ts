import { NextResponse } from "next/server";
import { getCurrentIdentity, requireSocietyAccess } from "@/lib/auth/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { recordAuditLog } from "@/lib/auth/audit";
import { sendDomainNotification } from "@/lib/services/notificationService";
import { UpdateComplaintSchema } from "@/lib/validations/operations";
import {
  evaluateSlaStatus,
  calculateResumedDeadlines,
  logComplaintTimelineEvent,
} from "@/lib/services/slaService";
import { UpdateComplaintBaseSchema } from "@/lib/validations/complaints";
import { z } from "zod";

export const dynamic = "force-dynamic";

export async function GET(
  req: Request,
  context: { params: Promise<{ societyId: string }> }
) {
  try {
    const { societyId } = await context.params;
    await requireSocietyAccess(societyId);

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const priority = searchParams.get("priority");
    const category = searchParams.get("category");
    const slaStatus = searchParams.get("sla_status");
    const assignedTo = searchParams.get("assigned_to");

    const adminClient = createAdminClient();

    let query = adminClient
      .from("complaints")
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
          display_name,
          email,
          phone
        ),
        assignee:profiles!complaints_assigned_to_fkey (
          id,
          full_name,
          display_name,
          email
        )
      `)
      .eq("society_id", societyId)
      .order("created_at", { ascending: false });

    if (status && status !== "ALL") {
      query = query.eq("status", status);
    }
    if (priority && priority !== "ALL") {
      query = query.eq("priority", priority);
    }
    if (category && category !== "ALL") {
      query = query.eq("category", category);
    }
    if (assignedTo && assignedTo !== "ALL") {
      if (assignedTo === "UNASSIGNED") {
        query = query.is("assigned_to", null);
      } else {
        query = query.eq("assigned_to", assignedTo);
      }
    }

    const { data: complaints, error } = await query;

    if (error) {
      console.error("[API/society/complaints] Error fetching complaints:", error);
      return NextResponse.json({ error: "Failed to fetch complaints" }, { status: 500 });
    }

    // Also fetch staff / managers in this society for easy assignment
    // Annotate open complaints with real-time evaluated SLA status
    const now = new Date();
    const evaluatedComplaints = (complaints || []).map((c) => {
      const evalResult = evaluateSlaStatus(c, now);
      return {
        ...c,
        sla_status: evalResult.slaStatus,
        is_response_breached: evalResult.isResponseBreached,
        is_resolution_breached: evalResult.isResolutionBreached,
        remaining_minutes: evalResult.remainingMinutes,
      };
    });

    // Filter by SLA status if requested
    const filteredComplaints = slaStatus && slaStatus !== "ALL"
      ? evaluatedComplaints.filter((c) => c.sla_status === slaStatus)
      : evaluatedComplaints;

    // Fetch staff / managers in this society for assignment
    const { data: staffMembers } = await adminClient
      .from("society_memberships")
      .select(`
        user_id,
        role_id,
        user:profiles (
          id,
          full_name,
          display_name,
          email
        )
      `)
      .eq("society_id", societyId)
      .eq("status", "ACTIVE")
      .in("role_id", ["STAFF", "MANAGER", "SOCIETY_ADMIN", "SECRETARY", "COMMITTEE_MEMBER"]);

    return NextResponse.json({
      complaints: filteredComplaints,
      staffMembers: (staffMembers || []).map((sm) => ({
        ...sm.user,
        role_id: sm.role_id,
      })),
    });
  } catch (err: any) {
    console.error("[API/society/complaints] Exception:", err);
    return NextResponse.json(
      { error: err?.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}

const PatchComplaintBodySchema = UpdateComplaintBaseSchema.extend({
  id: z.string().uuid("Invalid complaint ID"),
}).refine(
  (data) => {
    if (data.status === "ON_HOLD" && !data.on_hold_reason) {
      return false;
    }
    return true;
  },
  {
    message: "An on-hold reason is required when moving complaint to ON_HOLD",
    path: ["on_hold_reason"],
  }
);

export async function PATCH(
  req: Request,
  context: { params: Promise<{ societyId: string }> }
) {
  try {
    const { societyId } = await context.params;
    const { identity } = await requireSocietyAccess(societyId);

    const body = await req.json();
    const parsed = PatchComplaintBodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const adminClient = createAdminClient();
    const { id, status, priority, assigned_to, resolution_notes, on_hold_reason, closure_reason } = parsed.data;

    // Verify complaint belongs to society
    const { data: existing, error: fetchErr } = await adminClient
      .from("complaints")
      .select("*")
      .eq("id", id)
      .eq("society_id", societyId)
      .single();

    if (fetchErr || !existing) {
      return NextResponse.json({ error: "Complaint not found in this society" }, { status: 404 });
    }

    const now = new Date();
    const nowIso = now.toISOString();
    const updates: Record<string, any> = {
      updated_at: nowIso,
    };

    let timelineEventType: any = "STATUS_CHANGE";
    let timelineNotes = "";

    // 1. Priority Update
    if (priority && priority !== existing.priority) {
      updates.priority = priority;
      timelineEventType = "PRIORITY_CHANGE";
      timelineNotes = `Priority changed from ${existing.priority} to ${priority}`;
    }

    // 2. Assignment Update
    if (assigned_to !== undefined && assigned_to !== existing.assigned_to) {
      updates.assigned_to = assigned_to || null;
      timelineEventType = "ASSIGNED";
      timelineNotes = assigned_to ? "Assigned technician" : "Unassigned";

      // First assignment also counts as response acknowledgement
      if (!existing.responded_at) {
        updates.responded_at = nowIso;
      }
      if (["SUBMITTED", "NEW"].includes(existing.status) && !status) {
        updates.status = "ASSIGNED";
      }
    }

    // 3. Status Transition Logic & SLA Pausing / Resuming
    if (status && status !== existing.status) {
      updates.status = status;

      if (status === "ACKNOWLEDGED") {
        timelineEventType = "ACKNOWLEDGED";
        timelineNotes = "Ticket acknowledged by management";
        if (!existing.responded_at) {
          updates.responded_at = nowIso;
        }
      } else if (status === "ON_HOLD") {
        timelineEventType = "SLA_PAUSED";
        timelineNotes = `SLA paused. Reason: ${on_hold_reason || "On hold"}`;
        updates.sla_status = "PAUSED";
        updates.sla_paused_at = nowIso;
        updates.on_hold_reason = on_hold_reason || null;
      } else if (status === "IN_PROGRESS") {
        timelineEventType = "STATUS_CHANGE";
        timelineNotes = "Work started on ticket";

        // If resuming from ON_HOLD, extend resolution due time
        if (existing.status === "ON_HOLD" && existing.sla_paused_at && existing.resolution_due_at) {
          const resumed = calculateResumedDeadlines(
            existing.sla_paused_at,
            existing.resolution_due_at,
            existing.total_paused_duration_minutes || 0,
            now
          );
          updates.resolution_due_at = resumed.resumedResolutionDueAt.toISOString();
          updates.total_paused_duration_minutes = resumed.newTotalPausedMinutes;
          updates.sla_paused_at = null;
          updates.sla_status = "ON_TRACK";
          timelineEventType = "SLA_RESUMED";
          timelineNotes = `SLA resumed after ${resumed.addedPausedMinutes} min pause. Due date extended to ${resumed.resumedResolutionDueAt.toISOString()}`;
        }
      } else if (status === "RESOLVED") {
        timelineEventType = "RESOLVED";
        timelineNotes = `Resolved. Notes: ${resolution_notes || "None"}`;
        updates.resolved_at = nowIso;
        updates.sla_status = "COMPLETED";
      } else if (status === "CLOSED") {
        timelineEventType = "CLOSED";
        timelineNotes = `Closed. Reason: ${closure_reason || "Completed"}`;
        updates.closed_at = nowIso;
        updates.sla_status = "COMPLETED";
        updates.closure_reason = closure_reason || null;
      }
    }

    if (resolution_notes !== undefined) {
      updates.resolution_notes = resolution_notes || null;
    }
    if (on_hold_reason !== undefined) {
      updates.on_hold_reason = on_hold_reason || null;
    }
    if (closure_reason !== undefined) {
      updates.closure_reason = closure_reason || null;
    }

    const { data: updated, error: updateErr } = await adminClient
      .from("complaints")
      .update(updates)
      .eq("id", id)
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
      console.error("[API/society/complaints] Error updating complaint:", updateErr);
      return NextResponse.json({ error: "Failed to update complaint" }, { status: 500 });
    }

    // Determine audit action
    let auditAction = "COMPLAINT_STATUS_CHANGED";
    if (assigned_to && assigned_to !== existing.assigned_to) {
      auditAction = "COMPLAINT_ASSIGNED";
    } else if (status === "RESOLVED") {
      auditAction = "COMPLAINT_RESOLVED";
    } else if (status === "CLOSED") {
      auditAction = "COMPLAINT_CLOSED";
    }
    // Log timeline event
    await logComplaintTimelineEvent({
      societyId,
      complaintId: id,
      cycleNumber: existing.sla_cycle_number || 1,
      eventType: timelineEventType,
      fromStatus: existing.status,
      toStatus: updated.status,
      actorId: identity.effectiveUser.id,
      notes: timelineNotes,
      metadata: {
        updates,
      },
    });

    // Audit log
    await recordAuditLog({
      actorUserId: identity.originalUser.id,
      effectiveUserId: identity.effectiveUser.id,
      societyId,
      action: auditAction || "COMPLAINT_UPDATED",
      resourceType: "complaint",
      resourceId: id,
      metadata: {
        previous_status: existing.status,
        new_status: updated.status,
        assigned_to: updated.assigned_to,
        resolution_notes: updated.resolution_notes,
        sla_status: updated.sla_status,
      },
    });

    // Notify complaint creator if status changed or assigned
    if (existing.created_by) {
      let notifType: any = "COMPLAINT_STATUS_CHANGED";
      if (updated.status === "RESOLVED") notifType = "COMPLAINT_RESOLVED";
      if (updated.status === "CLOSED") notifType = "COMPLAINT_CLOSED";
      if (assigned_to && assigned_to !== existing.assigned_to) notifType = "COMPLAINT_ASSIGNED";

      await sendDomainNotification({
        societyId,
        recipientIds: [existing.created_by],
        type: notifType,
        category: "COMPLAINTS",
        actorId: identity.effectiveUser.id,
        data: {
          ticketNumber: existing.id.substring(0, 8),
          complaintId: existing.id,
          status: updated.status,
          assignedTo: updated.assignee?.full_name || null,
          remarks: updated.resolution_notes || updated.on_hold_reason || null,
        },
      });
    }

    return NextResponse.json({ success: true, complaint: updated });
  } catch (err: any) {
    console.error("[API/society/complaints PATCH]", err);
    return NextResponse.json(
      { error: err?.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}
