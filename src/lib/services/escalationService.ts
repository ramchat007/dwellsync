import { createAdminClient } from "@/lib/supabase/admin";
import { recordAuditLog } from "@/lib/auth/audit";
import { sendDomainNotification } from "@/lib/services/notificationService";
import {
  evaluateSlaStatus,
  logComplaintTimelineEvent,
} from "./slaService";

export interface EscalationResult {
  complaintId: string;
  previousLevel: number;
  newLevel: number;
  reason: string;
  notifiedCount: number;
}

/**
 * Evaluates pending complaints in a society against escalation rules and dispatches notifications
 */
export async function evaluateAndEscalateComplaints(params: {
  societyId: string;
  actorId: string;
  complaintId?: string; // Optional single complaint evaluation
}): Promise<{ escalated: EscalationResult[]; totalChecked: number }> {
  const { societyId, actorId, complaintId } = params;
  const adminClient = createAdminClient();
  const now = new Date();
  const nowMs = now.getTime();

  let query = adminClient
    .from("complaints")
    .select(`
      id,
      society_id,
      title,
      priority,
      status,
      assigned_to,
      created_by,
      created_at,
      response_due_at,
      responded_at,
      resolution_due_at,
      sla_paused_at,
      sla_cycle_number,
      escalation_level,
      last_escalated_at,
      unit:units(unit_number)
    `)
    .eq("society_id", societyId)
    .not("status", "in", '("RESOLVED","CLOSED")');

  if (complaintId) {
    query = query.eq("id", complaintId);
  }

  const { data: complaints, error } = await query;
  if (error || !complaints) {
    console.error("[EscalationService] Error querying open complaints:", error);
    return { escalated: [], totalChecked: 0 };
  }

  // Pre-fetch society members by role for escalation notifications
  const { data: managers } = await adminClient
    .from("society_memberships")
    .select("user_id, role_id")
    .eq("society_id", societyId)
    .eq("status", "ACTIVE")
    .in("role_id", ["MANAGER", "SOCIETY_ADMIN", "SECRETARY", "COMMITTEE_MEMBER"]);

  const managerUserIds = (managers || [])
    .filter((m) => ["MANAGER", "SOCIETY_ADMIN"].includes(m.role_id))
    .map((m) => m.user_id);

  const seniorAdminUserIds = (managers || [])
    .filter((m) => ["SOCIETY_ADMIN", "SECRETARY"].includes(m.role_id))
    .map((m) => m.user_id);

  const committeeUserIds = (managers || []).map((m) => m.user_id);

  const escalated: EscalationResult[] = [];

  for (const c of complaints) {
    const currentLevel = c.escalation_level || 0;
    const lastEscalatedMs = c.last_escalated_at ? new Date(c.last_escalated_at).getTime() : 0;
    const cooldownPeriodMs = 4 * 3600 * 1000; // 4 hour cooldown between repeat alerts

    // Skip if recently escalated, unless it is CRITICAL / EMERGENCY
    const isCritical = ["CRITICAL", "EMERGENCY"].includes(c.priority);
    if (!isCritical && lastEscalatedMs > 0 && nowMs - lastEscalatedMs < cooldownPeriodMs) {
      continue;
    }

    const { slaStatus, isResponseBreached, isResolutionBreached } = evaluateSlaStatus(c, now);

    let targetLevel = currentLevel;
    let reason = "";

    // 1. Critical unassigned for > 1 hour
    const createdMs = new Date(c.created_at).getTime();
    if (isCritical && !c.assigned_to && nowMs - createdMs > 3600 * 1000 && targetLevel < 2) {
      targetLevel = 2;
      reason = "Critical priority ticket unassigned for over 1 hour";
    }

    // 2. Resolution SLA breached
    if (isResolutionBreached && targetLevel < 2) {
      targetLevel = 2;
      reason = "Resolution SLA target breached";
    }

    // 3. Response SLA breached
    if (isResponseBreached && targetLevel < 1) {
      targetLevel = 1;
      reason = "Response SLA target breached";
    }

    // 4. If already at Level 2 and breached for > 24 hours -> Level 3 (Full Committee)
    if (
      isResolutionBreached &&
      currentLevel === 2 &&
      lastEscalatedMs > 0 &&
      nowMs - lastEscalatedMs > 24 * 3600 * 1000
    ) {
      targetLevel = 3;
      reason = "Breached ticket unresolved after 24h of Level 2 escalation";
    }

    if (targetLevel > currentLevel) {
      // Determine recipient set based on targetLevel
      const recipientSet = new Set<string>();

      if (c.assigned_to) {
        recipientSet.add(c.assigned_to);
      }

      if (targetLevel === 1) {
        managerUserIds.forEach((uid) => recipientSet.add(uid));
      } else if (targetLevel === 2) {
        managerUserIds.forEach((uid) => recipientSet.add(uid));
        seniorAdminUserIds.forEach((uid) => recipientSet.add(uid));
      } else if (targetLevel === 3) {
        committeeUserIds.forEach((uid) => recipientSet.add(uid));
      }

      const recipientIds = Array.from(recipientSet);

      if (recipientIds.length > 0) {
        await sendDomainNotification({
          societyId,
          recipientIds,
          type: "COMPLAINT_ESCALATED",
          category: "COMPLAINTS",
          actorId,
          data: {
            ticketNumber: c.id.substring(0, 8),
            complaintId: c.id,
            title: c.title,
            level: targetLevel,
            reason,
            societyId,
          },
        });
      }

      // Update complaint
      await adminClient
        .from("complaints")
        .update({
          escalation_level: targetLevel,
          last_escalated_at: now.toISOString(),
          sla_status: slaStatus,
          is_response_breached: isResponseBreached,
          is_resolution_breached: isResolutionBreached,
          updated_at: now.toISOString(),
        })
        .eq("id", c.id);

      // Record timeline event
      await logComplaintTimelineEvent({
        societyId,
        complaintId: c.id,
        cycleNumber: c.sla_cycle_number || 1,
        eventType: "ESCALATED",
        actorId,
        notes: `Escalated to Level ${targetLevel}: ${reason}`,
        metadata: {
          previous_level: currentLevel,
          new_level: targetLevel,
          reason,
          notified_recipients: recipientIds.length,
        },
      });

      // Audit log
      await recordAuditLog({
        actorUserId: actorId,
        effectiveUserId: actorId,
        societyId,
        action: "COMPLAINT_ESCALATED",
        resourceType: "complaint",
        resourceId: c.id,
        metadata: {
          previous_level: currentLevel,
          new_level: targetLevel,
          reason,
        },
      });

      escalated.push({
        complaintId: c.id,
        previousLevel: currentLevel,
        newLevel: targetLevel,
        reason,
        notifiedCount: recipientIds.length,
      });
    }
  }

  return {
    escalated,
    totalChecked: complaints.length,
  };
}

