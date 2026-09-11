import { createAdminClient } from "@/lib/supabase/admin";
import {
  Complaint,
  ComplaintSlaConfig,
  ComplaintSlaStatus,
  ComplaintPriority,
  ComplaintCategory,
  ComplaintStatus,
} from "@/lib/types/database";

export interface SlaDeadlineResult {
  responseDueAt: Date;
  resolutionDueAt: Date;
  businessHoursOnly: boolean;
  responseTimeHours: number;
  resolutionTimeHours: number;
}

/**
 * Default fallback SLA configurations by priority when no custom society rule is active
 */
export const DEFAULT_SLA_FALLBACKS: Record<
  string,
  { responseHours: number; resolutionHours: number; businessHours: boolean }
> = {
  CRITICAL: { responseHours: 1, resolutionHours: 4, businessHours: false },
  EMERGENCY: { responseHours: 1, resolutionHours: 4, businessHours: false },
  HIGH: { responseHours: 2, resolutionHours: 12, businessHours: false },
  MEDIUM: { responseHours: 4, resolutionHours: 24, businessHours: true },
  LOW: { responseHours: 8, resolutionHours: 48, businessHours: true },
};

/**
 * Adds business hours to a starting date, skipping non-working hours and weekends.
 */
export function addBusinessHours(
  startDate: Date,
  hoursToAdd: number,
  options: {
    startHour?: number; // e.g. 9 for 09:00
    endHour?: number; // e.g. 18 for 18:00
    excludeWeekends?: boolean;
  } = {}
): Date {
  const startHour = options.startHour ?? 9;
  const endHour = options.endHour ?? 18;
  const excludeWeekends = options.excludeWeekends ?? true;

  if (hoursToAdd <= 0) return new Date(startDate.getTime());

  let current = new Date(startDate.getTime());
  let remainingMinutes = Math.round(hoursToAdd * 60);

  while (remainingMinutes > 0) {
    const day = current.getDay(); // 0 = Sunday, 6 = Saturday

    // Check if current day is weekend
    if (excludeWeekends && (day === 0 || day === 6)) {
      // Advance to next Monday 09:00
      const daysUntilMonday = day === 6 ? 2 : 1;
      current.setDate(current.getDate() + daysUntilMonday);
      current.setHours(startHour, 0, 0, 0);
      continue;
    }

    const currentHour = current.getHours();
    const currentMinute = current.getMinutes();

    // Before business hours: fast-forward to start of business hours today
    if (currentHour < startHour) {
      current.setHours(startHour, 0, 0, 0);
      continue;
    }

    // After business hours: fast-forward to start of business hours tomorrow
    if (currentHour >= endHour) {
      current.setDate(current.getDate() + 1);
      current.setHours(startHour, 0, 0, 0);
      continue;
    }

    // Currently inside business hours today
    const currentMinutesFromMidnight = currentHour * 60 + currentMinute;
    const endMinutesFromMidnight = endHour * 60;
    const availableMinutesToday = endMinutesFromMidnight - currentMinutesFromMidnight;

    if (remainingMinutes <= availableMinutesToday) {
      current = new Date(current.getTime() + remainingMinutes * 60 * 1000);
      remainingMinutes = 0;
    } else {
      remainingMinutes -= availableMinutesToday;
      // Advance to next day at startHour
      current.setDate(current.getDate() + 1);
      current.setHours(startHour, 0, 0, 0);
    }
  }

  return current;
}

/**
 * Calculates response and resolution deadlines given SLA configuration rules
 */
export function calculateDeadlines(
  createdAt: Date,
  config?: Partial<ComplaintSlaConfig> | null,
  priority: string = "MEDIUM"
): SlaDeadlineResult {
  const normalizedPriority = priority.toUpperCase();
  const fallback = DEFAULT_SLA_FALLBACKS[normalizedPriority] || DEFAULT_SLA_FALLBACKS.MEDIUM;

  const responseTimeHours = Number(config?.response_time_hours) || fallback.responseHours;
  const resolutionTimeHours = Number(config?.resolution_time_hours) || fallback.resolutionHours;
  const businessHoursOnly = config?.business_hours_only ?? fallback.businessHours;
  const excludeWeekends = config?.exclude_weekends ?? true;

  let startHour = 9;
  let endHour = 18;

  if (config?.business_hours_start) {
    const parts = config.business_hours_start.split(":");
    startHour = parseInt(parts[0], 10) || 9;
  }
  if (config?.business_hours_end) {
    const parts = config.business_hours_end.split(":");
    endHour = parseInt(parts[0], 10) || 18;
  }

  let responseDueAt: Date;
  let resolutionDueAt: Date;

  if (businessHoursOnly) {
    responseDueAt = addBusinessHours(createdAt, responseTimeHours, {
      startHour,
      endHour,
      excludeWeekends,
    });
    resolutionDueAt = addBusinessHours(createdAt, resolutionTimeHours, {
      startHour,
      endHour,
      excludeWeekends,
    });
  } else {
    responseDueAt = new Date(createdAt.getTime() + responseTimeHours * 3600 * 1000);
    resolutionDueAt = new Date(createdAt.getTime() + resolutionTimeHours * 3600 * 1000);
  }

  return {
    responseDueAt,
    resolutionDueAt,
    businessHoursOnly,
    responseTimeHours,
    resolutionTimeHours,
  };
}

/**
 * Resolves the active SLA configuration for a complaint from the database.
 */
export async function getSlaConfigForComplaint(
  societyId: string,
  category: ComplaintCategory | string,
  priority: ComplaintPriority | string
): Promise<ComplaintSlaConfig | null> {
  try {
    const adminClient = createAdminClient();
    const todayStr = new Date().toISOString().split("T")[0];

    const { data: configs, error } = await adminClient
      .from("complaint_sla_configs")
      .select("*")
      .eq("society_id", societyId)
      .eq("is_active", true)
      .lte("effective_from", todayStr);

    if (error || !configs || configs.length === 0) {
      return null;
    }

    // Filter out configs with expired effective_to
    const activeConfigs = configs.filter(
      (c) => !c.effective_to || c.effective_to >= todayStr
    );

    // 1. Exact match (category, priority)
    const exact = activeConfigs.find(
      (c) => c.category === category && c.priority === priority
    );
    if (exact) return exact;

    // 2. Category match with priority ALL
    const catAll = activeConfigs.find(
      (c) => c.category === category && c.priority === "ALL"
    );
    if (catAll) return catAll;

    // 3. Priority match with category ALL
    const allPri = activeConfigs.find(
      (c) => c.category === "ALL" && c.priority === priority
    );
    if (allPri) return allPri;

    // 4. Fallback rule (ALL, ALL)
    const allAll = activeConfigs.find(
      (c) => c.category === "ALL" && c.priority === "ALL"
    );
    return allAll || null;
  } catch (err) {
    console.error("[SlaService] Error resolving SLA config:", err);
    return null;
  }
}

/**
 * Evaluates the current SLA status of a complaint
 */
export function evaluateSlaStatus(
  complaint: {
    status: ComplaintStatus | string;
    resolution_due_at?: string | Date | null;
    response_due_at?: string | Date | null;
    responded_at?: string | Date | null;
    sla_paused_at?: string | Date | null;
  },
  now: Date = new Date()
): {
  slaStatus: ComplaintSlaStatus;
  isResponseBreached: boolean;
  isResolutionBreached: boolean;
  remainingMinutes: number | null;
} {
  const status = complaint.status;

  // 1. Completed
  if (status === "RESOLVED" || status === "CLOSED") {
    return {
      slaStatus: "COMPLETED",
      isResponseBreached: false,
      isResolutionBreached: false,
      remainingMinutes: 0,
    };
  }

  // 2. Paused
  if (status === "ON_HOLD") {
    return {
      slaStatus: "PAUSED",
      isResponseBreached: false,
      isResolutionBreached: false,
      remainingMinutes: null,
    };
  }

  const resDue = complaint.resolution_due_at
    ? new Date(complaint.resolution_due_at).getTime()
    : null;
  const respDue = complaint.response_due_at
    ? new Date(complaint.response_due_at).getTime()
    : null;
  const respAt = complaint.responded_at
    ? new Date(complaint.responded_at).getTime()
    : null;
  const nowMs = now.getTime();

  let isResponseBreached = false;
  if (respDue && !respAt && nowMs > respDue) {
    isResponseBreached = true;
  }

  let isResolutionBreached = false;
  let remainingMinutes: number | null = null;

  if (resDue) {
    remainingMinutes = Math.round((resDue - nowMs) / 60000);
    if (nowMs > resDue) {
      isResolutionBreached = true;
    }
  }

  // 3. Breached
  if (isResolutionBreached || isResponseBreached) {
    return {
      slaStatus: "BREACHED",
      isResponseBreached,
      isResolutionBreached,
      remainingMinutes,
    };
  }

  // 4. Due soon (< 2 hours = 120 minutes)
  if (remainingMinutes !== null && remainingMinutes <= 120 && remainingMinutes >= 0) {
    return {
      slaStatus: "DUE_SOON",
      isResponseBreached: false,
      isResolutionBreached: false,
      remainingMinutes,
    };
  }

  // 5. On Track
  return {
    slaStatus: "ON_TRACK",
    isResponseBreached: false,
    isResolutionBreached: false,
    remainingMinutes,
  };
}

/**
 * Computes updated deadlines when resuming a paused complaint
 */
export function calculateResumedDeadlines(
  pausedAtIso: string,
  resolutionDueAtIso: string,
  currentTotalPausedMinutes: number = 0,
  now: Date = new Date()
): {
  resumedResolutionDueAt: Date;
  addedPausedMinutes: number;
  newTotalPausedMinutes: number;
} {
  const pausedTime = new Date(pausedAtIso).getTime();
  const nowTime = now.getTime();
  const addedPausedMinutes = Math.max(0, Math.round((nowTime - pausedTime) / 60000));
  const newTotalPausedMinutes = currentTotalPausedMinutes + addedPausedMinutes;

  const currentDue = new Date(resolutionDueAtIso).getTime();
  const resumedResolutionDueAt = new Date(currentDue + addedPausedMinutes * 60000);

  return {
    resumedResolutionDueAt,
    addedPausedMinutes,
    newTotalPausedMinutes,
  };
}

/**
 * Records an immutable lifecycle event into public.complaint_sla_events
 */
export async function logComplaintTimelineEvent(params: {
  societyId: string;
  complaintId: string;
  cycleNumber: number;
  eventType:
    | "CREATED"
    | "ACKNOWLEDGED"
    | "ASSIGNED"
    | "STATUS_CHANGE"
    | "PRIORITY_CHANGE"
    | "SLA_PAUSED"
    | "SLA_RESUMED"
    | "RESOLVED"
    | "CLOSED"
    | "REOPENED"
    | "ESCALATED"
    | "NOTE_ADDED";
  fromStatus?: string | null;
  toStatus?: string | null;
  actorId?: string | null;
  notes?: string | null;
  metadata?: Record<string, any>;
}): Promise<void> {
  try {
    const adminClient = createAdminClient();
    await adminClient.from("complaint_sla_events").insert({
      society_id: params.societyId,
      complaint_id: params.complaintId,
      cycle_number: params.cycleNumber,
      event_type: params.eventType,
      from_status: params.fromStatus || null,
      to_status: params.toStatus || null,
      actor_id: params.actorId || null,
      notes: params.notes || null,
      metadata: params.metadata || {},
    });
  } catch (err) {
    console.error("[SlaService] Error recording timeline event:", err);
  }
}

