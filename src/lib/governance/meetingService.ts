import { createAdminClient } from "@/lib/supabase/admin";
import { recordAuditLog } from "@/lib/auth/audit";
import { sendDomainNotification } from "@/lib/services/notificationService";
import {
  SocietyMeeting,
  MeetingAgenda,
  MeetingAttendee,
  MeetingMinutes,
  MeetingActionItem,
  MeetingType,
  MeetingLocationType,
  MeetingStatus,
  AgendaStatus,
  AttendeeType,
  ActionItemStatus,
} from "@/lib/types/database";

export interface ScheduleMeetingInput {
  societyId: string;
  title: string;
  meetingType: MeetingType;
  committeeId?: string | null;
  presidingOfficerId?: string | null;
  scheduledAt: string;
  durationMinutes?: number;
  locationType?: MeetingLocationType;
  locationDetails?: string | null;
  meetingLink?: string | null;
  quorumRequired?: number;
  agenda?: string | null;
  actorUserId: string;
  effectiveUserId?: string;
}

export interface UpdateMeetingInput {
  societyId: string;
  meetingId: string;
  title?: string;
  scheduledAt?: string;
  durationMinutes?: number;
  locationType?: MeetingLocationType;
  locationDetails?: string | null;
  meetingLink?: string | null;
  presidingOfficerId?: string | null;
  quorumRequired?: number;
  status?: MeetingStatus;
  agenda?: string | null;
  actorUserId: string;
  effectiveUserId?: string;
}

export interface CreateAgendaInput {
  societyId: string;
  meetingId: string;
  title: string;
  description?: string | null;
  itemOrder?: number;
  actorUserId: string;
  effectiveUserId?: string;
}

export interface UpdateAgendaInput {
  societyId: string;
  meetingId: string;
  agendaId: string;
  title?: string;
  description?: string | null;
  itemOrder?: number;
  status?: AgendaStatus;
  actorUserId: string;
  effectiveUserId?: string;
}

export interface RecordAttendanceInput {
  societyId: string;
  meetingId: string;
  attendees: {
    userId: string;
    attendeeType: AttendeeType;
    attended: boolean;
    notes?: string | null;
  }[];
  actorUserId: string;
  effectiveUserId?: string;
}

export interface UpsertMinutesInput {
  societyId: string;
  meetingId: string;
  contentSummary: string;
  decisionsSummary?: string | null;
  actorUserId: string;
  effectiveUserId?: string;
}

export interface PublishMinutesInput {
  societyId: string;
  meetingId: string;
  actorUserId: string;
  effectiveUserId?: string;
}

export interface CreateActionItemInput {
  societyId: string;
  meetingId: string;
  title: string;
  description?: string | null;
  assignedTo?: string | null;
  dueDate?: string | null;
  actorUserId: string;
  effectiveUserId?: string;
}

export interface UpdateActionItemInput {
  societyId: string;
  meetingId: string;
  actionItemId: string;
  title?: string;
  description?: string | null;
  assignedTo?: string | null;
  dueDate?: string | null;
  status?: ActionItemStatus;
  actorUserId: string;
  effectiveUserId?: string;
  isAssigneeOnly?: boolean;
}

/**
 * Valid lifecycle transitions for society meetings:
 * SCHEDULED -> IN_PROGRESS, CANCELLED
 * IN_PROGRESS -> COMPLETED, CANCELLED
 * COMPLETED and CANCELLED are terminal.
 */
export function isValidMeetingTransition(
  current: MeetingStatus,
  target: MeetingStatus
): boolean {
  if (current === target) return true;
  if (current === "COMPLETED" || current === "CANCELLED") return false;
  if (current === "SCHEDULED") {
    return target === "IN_PROGRESS" || target === "CANCELLED";
  }
  if (current === "IN_PROGRESS") {
    return target === "COMPLETED" || target === "CANCELLED";
  }
  return false;
}

/**
 * Lists meetings for a society with optional committee/type/status filtering.
 */
export async function getMeetings(
  societyId: string,
  options?: {
    committeeId?: string;
    meetingType?: MeetingType;
    status?: MeetingStatus;
    includePrivate?: boolean;
  }
): Promise<SocietyMeeting[]> {
  const adminClient = createAdminClient();

  let query = adminClient
    .from("society_meetings")
    .select(`
      *,
      committee:committees(id, name, committee_type, status),
      presiding_officer:profiles!society_meetings_presiding_officer_id_fkey(id, full_name, display_name),
      organizer:profiles!society_meetings_organized_by_fkey(id, full_name, display_name)
    `)
    .eq("society_id", societyId)
    .order("scheduled_at", { ascending: false });

  if (options?.committeeId) {
    query = query.eq("committee_id", options.committeeId);
  }

  if (options?.meetingType) {
    query = query.eq("meeting_type", options.meetingType);
  }

  if (options?.status) {
    query = query.eq("status", options.status);
  }

  // If ordinary resident / public query, only return public general meetings
  if (options?.includePrivate === false) {
    query = query.in("meeting_type", ["AGM", "EGM", "GENERAL"]);
  }

  const { data, error } = await query;
  if (error) {
    console.error("[MeetingService] Error fetching meetings:", error);
    return [];
  }

  return (data || []) as SocietyMeeting[];
}

/**
 * Fetches complete details of a single meeting (agendas, attendees, minutes, action items).
 */
export async function getMeetingDetail(
  societyId: string,
  meetingId: string,
  options?: { includePrivate?: boolean }
): Promise<SocietyMeeting | null> {
  const adminClient = createAdminClient();

  const { data: meeting, error } = await adminClient
    .from("society_meetings")
    .select(`
      *,
      committee:committees(id, name, committee_type, status),
      presiding_officer:profiles!society_meetings_presiding_officer_id_fkey(id, full_name, display_name),
      organizer:profiles!society_meetings_organized_by_fkey(id, full_name, display_name)
    `)
    .eq("id", meetingId)
    .eq("society_id", societyId)
    .maybeSingle();

  if (error || !meeting) {
    return null;
  }

  // Fetch related child records in parallel
  const [agendasRes, attendeesRes, minutesRes, actionItemsRes] = await Promise.all([
    adminClient
      .from("meeting_agendas")
      .select("*")
      .eq("meeting_id", meetingId)
      .eq("society_id", societyId)
      .order("item_order", { ascending: true }),

    adminClient
      .from("meeting_attendees")
      .select(`
        *,
        profile:profiles!meeting_attendees_user_id_fkey(id, full_name, display_name, avatar_url)
      `)
      .eq("meeting_id", meetingId)
      .eq("society_id", societyId)
      .order("marked_at", { ascending: true }),

    adminClient
      .from("meeting_minutes")
      .select(`
        *,
        recorder:profiles!meeting_minutes_recorded_by_fkey(id, full_name, display_name),
        publisher:profiles!meeting_minutes_published_by_fkey(id, full_name, display_name)
      `)
      .eq("meeting_id", meetingId)
      .eq("society_id", societyId)
      .maybeSingle(),

    adminClient
      .from("meeting_action_items")
      .select(`
        *,
        assignee:profiles!meeting_action_items_assigned_to_fkey(id, full_name, display_name)
      `)
      .eq("meeting_id", meetingId)
      .eq("society_id", societyId)
      .order("created_at", { ascending: true }),
  ]);

  let minutes = minutesRes.data;
  // If user is resident (includePrivate === false), only return minutes if PUBLISHED
  if (options?.includePrivate === false) {
    if (minutes && minutes.status !== "PUBLISHED") {
      minutes = null;
    }
  }

  return {
    ...(meeting as SocietyMeeting),
    agendas: (agendasRes.data || []) as MeetingAgenda[],
    attendees: (options?.includePrivate === false ? [] : (attendeesRes.data || [])) as MeetingAttendee[],
    minutes: (minutes as MeetingMinutes) || null,
    action_items: (options?.includePrivate === false ? [] : (actionItemsRes.data || [])) as MeetingActionItem[],
  };
}

/**
 * Schedules a new governance meeting with strict tenant and committee validation.
 */
export async function scheduleMeeting(
  input: ScheduleMeetingInput
): Promise<{ meeting: SocietyMeeting | null; error?: string }> {
  const adminClient = createAdminClient();

  // 1. If committee_id is provided, verify it belongs to this society
  let targetCommittee = null;
  if (input.committeeId) {
    const { data: comm } = await adminClient
      .from("committees")
      .select("id, name, status, society_id")
      .eq("id", input.committeeId)
      .eq("society_id", input.societyId)
      .maybeSingle();

    if (!comm) {
      return { meeting: null, error: "Referenced committee does not belong to this society" };
    }
    targetCommittee = comm;
  }

  // 2. If presiding_officer_id is provided, verify user has active society membership
  if (input.presidingOfficerId) {
    const { data: member } = await adminClient
      .from("society_memberships")
      .select("id")
      .eq("society_id", input.societyId)
      .eq("user_id", input.presidingOfficerId)
      .eq("status", "ACTIVE")
      .maybeSingle();

    if (!member) {
      return { meeting: null, error: "Presiding officer must be an active member of this society" };
    }
  }

  // 3. Quorum calculation: If not explicitly supplied and it's a committee meeting, calculate default quorum
  let quorumRequired = input.quorumRequired || 0;
  if (quorumRequired <= 0 && input.committeeId) {
    const { count } = await adminClient
      .from("committee_members")
      .select("id", { count: "exact", head: true })
      .eq("committee_id", input.committeeId)
      .eq("society_id", input.societyId)
      .eq("status", "ACTIVE")
      .eq("voting_rights", true);

    const votingCount = count || 0;
    quorumRequired = votingCount > 0 ? Math.ceil(votingCount / 2) : 1;
  }

  // 4. Insert meeting record
  const { data: meeting, error } = await adminClient
    .from("society_meetings")
    .insert({
      society_id: input.societyId,
      committee_id: input.committeeId || null,
      title: input.title,
      agenda: input.agenda || null,
      meeting_type: input.meetingType,
      location_type: input.locationType || "PHYSICAL",
      location_details: input.locationDetails || null,
      meeting_link: input.meetingLink || null,
      scheduled_at: input.scheduledAt,
      duration_minutes: input.durationMinutes || 60,
      status: "SCHEDULED",
      quorum_required: quorumRequired,
      quorum_met: false,
      presiding_officer_id: input.presidingOfficerId || null,
      organized_by: input.effectiveUserId || input.actorUserId,
    })
    .select()
    .single();

  if (error || !meeting) {
    console.error("[MeetingService] Error scheduling meeting:", error);
    return { meeting: null, error: error?.message || "Failed to schedule meeting" };
  }

  // 5. Audit log
  await recordAuditLog({
    actorUserId: input.actorUserId,
    effectiveUserId: input.effectiveUserId || input.actorUserId,
    societyId: input.societyId,
    action: "MEETING_SCHEDULED",
    resourceType: "society_meeting",
    resourceId: meeting.id,
    metadata: {
      title: meeting.title,
      meeting_type: meeting.meeting_type,
      committee_id: meeting.committee_id,
      scheduled_at: meeting.scheduled_at,
      quorum_required: quorumRequired,
    },
  });

  // 6. Notify relevant committee members or broadcast
  try {
    if (input.committeeId) {
      const { data: members } = await adminClient
        .from("committee_members")
        .select("user_id")
        .eq("committee_id", input.committeeId)
        .eq("status", "ACTIVE");

      const recipientIds = (members || []).map((m) => m.user_id);
      if (recipientIds.length > 0) {
        await sendDomainNotification({
          societyId: input.societyId,
          type: "MEETING_SCHEDULED",
          recipientIds,
          data: {
            meetingTitle: meeting.title,
            date: new Date(meeting.scheduled_at).toLocaleDateString("en-IN"),
            agenda: meeting.agenda || "Committee proceedings",
          },
        });
      }
    }
  } catch (notifErr) {
    console.warn("[MeetingService] Notification warning:", notifErr);
  }

  return { meeting: meeting as SocietyMeeting };
}

/**
 * Updates meeting schedule, location, presiding officer, or lifecycle status.
 */
export async function updateMeeting(
  input: UpdateMeetingInput
): Promise<{ meeting: SocietyMeeting | null; error?: string }> {
  const adminClient = createAdminClient();

  const { data: existing } = await adminClient
    .from("society_meetings")
    .select("*")
    .eq("id", input.meetingId)
    .eq("society_id", input.societyId)
    .maybeSingle();

  if (!existing) {
    return { meeting: null, error: "Meeting not found in this society" };
  }

  // Validate lifecycle transition
  if (input.status && !isValidMeetingTransition(existing.status as MeetingStatus, input.status)) {
    return {
      meeting: null,
      error: `Invalid status transition from "${existing.status}" to "${input.status}". Terminal states cannot be changed.`,
    };
  }

  // Disallow schedule/metadata modifications if meeting is COMPLETED or CANCELLED
  if ((existing.status === "COMPLETED" || existing.status === "CANCELLED") && input.status === undefined) {
    return {
      meeting: null,
      error: `Cannot modify details of a meeting that is already ${existing.status}`,
    };
  }

  // If presiding officer updated, verify society membership
  if (input.presidingOfficerId) {
    const { data: member } = await adminClient
      .from("society_memberships")
      .select("id")
      .eq("society_id", input.societyId)
      .eq("user_id", input.presidingOfficerId)
      .eq("status", "ACTIVE")
      .maybeSingle();

    if (!member) {
      return { meeting: null, error: "Presiding officer must be an active member of this society" };
    }
  }

  const updates: Record<string, any> = {
    updated_at: new Date().toISOString(),
  };

  if (input.title !== undefined) updates.title = input.title;
  if (input.scheduledAt !== undefined) updates.scheduled_at = input.scheduledAt;
  if (input.durationMinutes !== undefined) updates.duration_minutes = input.durationMinutes;
  if (input.locationType !== undefined) updates.location_type = input.locationType;
  if (input.locationDetails !== undefined) updates.location_details = input.locationDetails;
  if (input.meetingLink !== undefined) updates.meeting_link = input.meetingLink;
  if (input.presidingOfficerId !== undefined) updates.presiding_officer_id = input.presidingOfficerId;
  if (input.quorumRequired !== undefined) updates.quorum_required = input.quorumRequired;
  if (input.status !== undefined) updates.status = input.status;
  if (input.agenda !== undefined) updates.agenda = input.agenda;

  const { data: updated, error } = await adminClient
    .from("society_meetings")
    .update(updates)
    .eq("id", input.meetingId)
    .eq("society_id", input.societyId)
    .select()
    .single();

  if (error || !updated) {
    return { meeting: null, error: error?.message || "Failed to update meeting" };
  }

  // Determine audit action
  let auditAction = "MEETING_UPDATED";
  if (input.status === "CANCELLED") auditAction = "MEETING_CANCELLED";
  else if (input.status && input.status !== existing.status) auditAction = "MEETING_STATUS_CHANGED";
  else if (input.scheduledAt && input.scheduledAt !== existing.scheduled_at) auditAction = "MEETING_RESCHEDULED";

  await recordAuditLog({
    actorUserId: input.actorUserId,
    effectiveUserId: input.effectiveUserId || input.actorUserId,
    societyId: input.societyId,
    action: auditAction,
    resourceType: "society_meeting",
    resourceId: updated.id,
    metadata: updates,
  });

  // Notifications
  try {
    if (input.status === "CANCELLED") {
      const { data: attendees } = await adminClient
        .from("meeting_attendees")
        .select("user_id")
        .eq("meeting_id", updated.id);

      const recipientIds = (attendees || []).map((a) => a.user_id);
      if (recipientIds.length > 0) {
        await sendDomainNotification({
          societyId: input.societyId,
          type: "MEETING_CANCELLED",
          recipientIds,
          data: { meetingTitle: updated.title },
        });
      }
    }
  } catch (notifErr) {
    console.warn("[MeetingService] Notification warning:", notifErr);
  }

  return { meeting: updated as SocietyMeeting };
}

/**
 * Adds an agenda item to a meeting.
 */
export async function createMeetingAgenda(
  input: CreateAgendaInput
): Promise<{ agenda: MeetingAgenda | null; error?: string }> {
  const adminClient = createAdminClient();

  const { data: meeting } = await adminClient
    .from("society_meetings")
    .select("id, status")
    .eq("id", input.meetingId)
    .eq("society_id", input.societyId)
    .maybeSingle();

  if (!meeting) {
    return { agenda: null, error: "Meeting not found in this society" };
  }
  if (meeting.status === "CANCELLED") {
    return { agenda: null, error: "Cannot add agenda items to a cancelled meeting" };
  }

  const { data: agenda, error } = await adminClient
    .from("meeting_agendas")
    .insert({
      society_id: input.societyId,
      meeting_id: input.meetingId,
      title: input.title,
      description: input.description || null,
      item_order: input.itemOrder || 1,
      status: "PENDING",
    })
    .select()
    .single();

  if (error || !agenda) {
    return { agenda: null, error: error?.message || "Failed to create agenda item" };
  }

  return { agenda: agenda as MeetingAgenda };
}

/**
 * Updates an agenda item's status, order, or content.
 */
export async function updateMeetingAgenda(
  input: UpdateAgendaInput
): Promise<{ agenda: MeetingAgenda | null; error?: string }> {
  const adminClient = createAdminClient();

  const updates: Record<string, any> = {
    updated_at: new Date().toISOString(),
  };

  if (input.title !== undefined) updates.title = input.title;
  if (input.description !== undefined) updates.description = input.description;
  if (input.itemOrder !== undefined) updates.item_order = input.itemOrder;
  if (input.status !== undefined) updates.status = input.status;

  const { data: updated, error } = await adminClient
    .from("meeting_agendas")
    .update(updates)
    .eq("id", input.agendaId)
    .eq("meeting_id", input.meetingId)
    .eq("society_id", input.societyId)
    .select()
    .single();

  if (error || !updated) {
    return { agenda: null, error: error?.message || "Failed to update agenda item" };
  }

  return { agenda: updated as MeetingAgenda };
}

/**
 * Records attendee presence, validates society membership, and recalculates quorum.
 */
export async function recordMeetingAttendance(
  input: RecordAttendanceInput
): Promise<{ success: boolean; quorumMet: boolean; attendedCount: number; error?: string }> {
  const adminClient = createAdminClient();

  const { data: meeting } = await adminClient
    .from("society_meetings")
    .select("id, society_id, committee_id, quorum_required, status")
    .eq("id", input.meetingId)
    .eq("society_id", input.societyId)
    .maybeSingle();

  if (!meeting) {
    return { success: false, quorumMet: false, attendedCount: 0, error: "Meeting not found in this society" };
  }
  if (meeting.status === "CANCELLED") {
    return { success: false, quorumMet: false, attendedCount: 0, error: "Cannot record attendance for a cancelled meeting" };
  }

  // Verify all attendees belong to this society
  for (const attendee of input.attendees) {
    const { data: membership } = await adminClient
      .from("society_memberships")
      .select("id")
      .eq("society_id", input.societyId)
      .eq("user_id", attendee.userId)
      .eq("status", "ACTIVE")
      .maybeSingle();

    if (!membership) {
      return {
        success: false,
        quorumMet: false,
        attendedCount: 0,
        error: `User ${attendee.userId} is not an active member of this society`,
      };
    }
  }

  // Upsert attendance records
  for (const att of input.attendees) {
    const { error: upsertErr } = await adminClient
      .from("meeting_attendees")
      .upsert(
        {
          society_id: input.societyId,
          meeting_id: input.meetingId,
          user_id: att.userId,
          attendee_type: att.attendeeType,
          attended: att.attended,
          notes: att.notes || null,
          marked_at: new Date().toISOString(),
        },
        { onConflict: "meeting_id, user_id" }
      );

    if (upsertErr) {
      return { success: false, quorumMet: false, attendedCount: 0, error: upsertErr.message };
    }
  }

  // Authoritative Quorum Recalculation:
  // Count attendees with attended === true
  const { count: attendedCountRaw } = await adminClient
    .from("meeting_attendees")
    .select("id", { count: "exact", head: true })
    .eq("meeting_id", input.meetingId)
    .eq("society_id", input.societyId)
    .eq("attended", true);

  const attendedCount = attendedCountRaw || 0;
  const quorumMet = attendedCount >= meeting.quorum_required;

  // Persist updated quorum_met on society_meetings
  await adminClient
    .from("society_meetings")
    .update({
      quorum_met: quorumMet,
      updated_at: new Date().toISOString(),
    })
    .eq("id", input.meetingId);

  // Record audit log
  await recordAuditLog({
    actorUserId: input.actorUserId,
    effectiveUserId: input.effectiveUserId || input.actorUserId,
    societyId: input.societyId,
    action: "MEETING_ATTENDANCE_RECORDED",
    resourceType: "meeting_attendance",
    resourceId: input.meetingId,
    metadata: {
      attended_count: attendedCount,
      quorum_required: meeting.quorum_required,
      quorum_met: quorumMet,
    },
  });

  return { success: true, quorumMet, attendedCount };
}

/**
 * Creates or updates draft meeting minutes.
 * Rejects modifications if minutes are already published (Immutability guarantee).
 */
export async function upsertMeetingMinutes(
  input: UpsertMinutesInput
): Promise<{ minutes: MeetingMinutes | null; error?: string }> {
  const adminClient = createAdminClient();

  const { data: meeting } = await adminClient
    .from("society_meetings")
    .select("id, status")
    .eq("id", input.meetingId)
    .eq("society_id", input.societyId)
    .maybeSingle();

  if (!meeting) {
    return { minutes: null, error: "Meeting not found in this society" };
  }

  const { data: existingMinutes } = await adminClient
    .from("meeting_minutes")
    .select("*")
    .eq("meeting_id", input.meetingId)
    .eq("society_id", input.societyId)
    .maybeSingle();

  // Immutability Check: Published minutes CANNOT be updated
  if (existingMinutes && existingMinutes.status === "PUBLISHED") {
    return {
      minutes: null,
      error: "Meeting minutes have already been officially PUBLISHED and are permanently locked against modifications.",
    };
  }

  const payload: Record<string, any> = {
    society_id: input.societyId,
    meeting_id: input.meetingId,
    content_summary: input.contentSummary,
    decisions_summary: input.decisionsSummary || null,
    recorded_by: input.effectiveUserId || input.actorUserId,
    status: "DRAFT",
    updated_at: new Date().toISOString(),
  };

  const { data: minutes, error } = await adminClient
    .from("meeting_minutes")
    .upsert(payload, { onConflict: "meeting_id" })
    .select()
    .single();

  if (error || !minutes) {
    return { minutes: null, error: error?.message || "Failed to save meeting minutes" };
  }

  return { minutes: minutes as MeetingMinutes };
}

/**
 * Formally publishes official meeting minutes, locking them permanently.
 */
export async function publishMeetingMinutes(
  input: PublishMinutesInput
): Promise<{ minutes: MeetingMinutes | null; error?: string }> {
  const adminClient = createAdminClient();

  const { data: meeting } = await adminClient
    .from("society_meetings")
    .select("id, title, status")
    .eq("id", input.meetingId)
    .eq("society_id", input.societyId)
    .maybeSingle();

  if (!meeting) {
    return { minutes: null, error: "Meeting not found in this society" };
  }

  const { data: existingMinutes } = await adminClient
    .from("meeting_minutes")
    .select("*")
    .eq("meeting_id", input.meetingId)
    .eq("society_id", input.societyId)
    .maybeSingle();

  if (!existingMinutes) {
    return { minutes: null, error: "No draft minutes recorded for this meeting. Create a draft before publishing." };
  }

  if (existingMinutes.status === "PUBLISHED") {
    return { minutes: existingMinutes as MeetingMinutes };
  }

  const publishedAt = new Date().toISOString();
  const publishedBy = input.effectiveUserId || input.actorUserId;

  const { data: published, error } = await adminClient
    .from("meeting_minutes")
    .update({
      status: "PUBLISHED",
      published_at: publishedAt,
      published_by: publishedBy,
      updated_at: publishedAt,
    })
    .eq("id", existingMinutes.id)
    .select()
    .single();

  if (error || !published) {
    return { minutes: null, error: error?.message || "Failed to publish meeting minutes" };
  }

  // Audit log
  await recordAuditLog({
    actorUserId: input.actorUserId,
    effectiveUserId: publishedBy,
    societyId: input.societyId,
    action: "MEETING_MINUTES_PUBLISHED",
    resourceType: "meeting_minutes",
    resourceId: published.id,
    metadata: {
      meeting_id: input.meetingId,
      published_at: publishedAt,
    },
  });

  // Notify active members of the society
  try {
    const { data: members } = await adminClient
      .from("society_memberships")
      .select("user_id")
      .eq("society_id", input.societyId)
      .eq("status", "ACTIVE");

    const recipientIds = (members || []).map((m) => m.user_id);
    if (recipientIds.length > 0) {
      await sendDomainNotification({
        societyId: input.societyId,
        type: "MINUTES_PUBLISHED",
        recipientIds,
        data: {
          meetingTitle: meeting.title,
        },
      });
    }
  } catch (notifErr) {
    console.warn("[MeetingService] Notification warning:", notifErr);
  }

  return { minutes: published as MeetingMinutes };
}

/**
 * Creates a post-meeting action item assigned to a society member.
 */
export async function createMeetingActionItem(
  input: CreateActionItemInput
): Promise<{ actionItem: MeetingActionItem | null; error?: string }> {
  const adminClient = createAdminClient();

  const { data: meeting } = await adminClient
    .from("society_meetings")
    .select("id")
    .eq("id", input.meetingId)
    .eq("society_id", input.societyId)
    .maybeSingle();

  if (!meeting) {
    return { actionItem: null, error: "Meeting not found in this society" };
  }

  // Validate assignee belongs to this society
  if (input.assignedTo) {
    const { data: membership } = await adminClient
      .from("society_memberships")
      .select("id")
      .eq("society_id", input.societyId)
      .eq("user_id", input.assignedTo)
      .eq("status", "ACTIVE")
      .maybeSingle();

    if (!membership) {
      return { actionItem: null, error: "Action item assignee must be an active member of this society" };
    }
  }

  const { data: actionItem, error } = await adminClient
    .from("meeting_action_items")
    .insert({
      society_id: input.societyId,
      meeting_id: input.meetingId,
      title: input.title,
      description: input.description || null,
      assigned_to: input.assignedTo || null,
      due_date: input.dueDate || null,
      status: "OPEN",
    })
    .select(`
      *,
      assignee:profiles!meeting_action_items_assigned_to_fkey(id, full_name, display_name)
    `)
    .single();

  if (error || !actionItem) {
    return { actionItem: null, error: error?.message || "Failed to create action item" };
  }

  await recordAuditLog({
    actorUserId: input.actorUserId,
    effectiveUserId: input.effectiveUserId || input.actorUserId,
    societyId: input.societyId,
    action: "ACTION_ITEM_CREATED",
    resourceType: "meeting_action_item",
    resourceId: actionItem.id,
    metadata: {
      meeting_id: input.meetingId,
      title: actionItem.title,
      assigned_to: actionItem.assigned_to,
      due_date: actionItem.due_date,
    },
  });

  if (input.assignedTo) {
    try {
      await sendDomainNotification({
        societyId: input.societyId,
        type: "ACTION_ITEM_ASSIGNED",
        recipientIds: [input.assignedTo],
        data: {
          itemTitle: actionItem.title,
          dueDate: actionItem.due_date || undefined,
        },
      });
    } catch (notifErr) {
      console.warn("[MeetingService] Notification warning:", notifErr);
    }
  }

  return { actionItem: actionItem as MeetingActionItem };
}

/**
 * Updates an action item's status, assignment, or completion.
 */
export async function updateMeetingActionItem(
  input: UpdateActionItemInput
): Promise<{ actionItem: MeetingActionItem | null; error?: string }> {
  const adminClient = createAdminClient();

  const { data: existing } = await adminClient
    .from("meeting_action_items")
    .select("*")
    .eq("id", input.actionItemId)
    .eq("meeting_id", input.meetingId)
    .eq("society_id", input.societyId)
    .maybeSingle();

  if (!existing) {
    return { actionItem: null, error: "Action item not found in this meeting and society" };
  }

  // If user is only assignee, they can only update status
  if (input.isAssigneeOnly && (input.title || input.assignedTo || input.dueDate)) {
    return { actionItem: null, error: "Assignees may only update task progress status" };
  }

  // Validate assignee if changed
  if (input.assignedTo && input.assignedTo !== existing.assigned_to) {
    const { data: membership } = await adminClient
      .from("society_memberships")
      .select("id")
      .eq("society_id", input.societyId)
      .eq("user_id", input.assignedTo)
      .eq("status", "ACTIVE")
      .maybeSingle();

    if (!membership) {
      return { actionItem: null, error: "Assignee must be an active member of this society" };
    }
  }

  const updates: Record<string, any> = {
    updated_at: new Date().toISOString(),
  };

  if (input.title !== undefined) updates.title = input.title;
  if (input.description !== undefined) updates.description = input.description;
  if (input.assignedTo !== undefined) updates.assigned_to = input.assignedTo;
  if (input.dueDate !== undefined) updates.due_date = input.dueDate;
  if (input.status !== undefined) {
    updates.status = input.status;
    if (input.status === "COMPLETED") {
      updates.completed_at = new Date().toISOString();
    }
  }

  const { data: updated, error } = await adminClient
    .from("meeting_action_items")
    .update(updates)
    .eq("id", input.actionItemId)
    .eq("meeting_id", input.meetingId)
    .eq("society_id", input.societyId)
    .select(`
      *,
      assignee:profiles!meeting_action_items_assigned_to_fkey(id, full_name, display_name)
    `)
    .single();

  if (error || !updated) {
    return { actionItem: null, error: error?.message || "Failed to update action item" };
  }

  if (input.status === "COMPLETED") {
    await recordAuditLog({
      actorUserId: input.actorUserId,
      effectiveUserId: input.effectiveUserId || input.actorUserId,
      societyId: input.societyId,
      action: "ACTION_ITEM_COMPLETED",
      resourceType: "meeting_action_item",
      resourceId: updated.id,
      metadata: {
        completed_at: updated.completed_at,
      },
    });
  }

  return { actionItem: updated as MeetingActionItem };
}

/**
 * Returns public transparency meetings and published minutes for residents.
 */
export async function getPublicResidentMeetings(
  societyId: string
): Promise<{ upcomingMeetings: SocietyMeeting[]; pastPublishedMinutes: SocietyMeeting[] }> {
  const adminClient = createAdminClient();

  const [upcomingRes, pastRes] = await Promise.all([
    adminClient
      .from("society_meetings")
      .select(`
        id,
        title,
        meeting_type,
        location_type,
        location_details,
        meeting_link,
        scheduled_at,
        duration_minutes,
        status,
        agenda,
        committee:committees(id, name)
      `)
      .eq("society_id", societyId)
      .in("meeting_type", ["AGM", "EGM", "GENERAL"])
      .gte("scheduled_at", new Date().toISOString())
      .order("scheduled_at", { ascending: true }),

    adminClient
      .from("society_meetings")
      .select(`
        id,
        title,
        meeting_type,
        scheduled_at,
        status,
        committee:committees(id, name),
        minutes:meeting_minutes(
          id,
          content_summary,
          decisions_summary,
          status,
          published_at
        )
      `)
      .eq("society_id", societyId)
      .order("scheduled_at", { ascending: false }),
  ]);

  // Filter past meetings to those with published minutes
  const pastPublished = (pastRes.data || [])
    .filter((m: any) => m.minutes && (m.minutes.status === "PUBLISHED" || (Array.isArray(m.minutes) && m.minutes.some((min: any) => min.status === "PUBLISHED"))))
    .slice(0, 20);

  return {
    upcomingMeetings: (upcomingRes.data || []) as unknown as SocietyMeeting[],
    pastPublishedMinutes: pastPublished as unknown as SocietyMeeting[],
  };
}
