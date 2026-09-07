import { createAdminClient } from "@/lib/supabase/admin";
import { recordAuditLog } from "@/lib/auth/audit";
import { sendDomainNotification } from "@/lib/services/notificationService";
import {
  Committee,
  CommitteeMember,
  CommitteeType,
  CommitteeStatus,
  CommitteeMemberDesignation,
} from "@/lib/types/database";

export interface CreateCommitteeInput {
  societyId: string;
  name: string;
  committeeType: CommitteeType;
  termStartDate: string;
  termEndDate: string;
  description?: string | null;
  actorUserId: string;
  effectiveUserId?: string;
}

export interface UpdateCommitteeInput {
  societyId: string;
  committeeId: string;
  name?: string;
  termStartDate?: string;
  termEndDate?: string;
  status?: CommitteeStatus;
  description?: string | null;
  actorUserId: string;
  effectiveUserId?: string;
}

export interface AppointMemberInput {
  societyId: string;
  committeeId: string;
  userId: string;
  designation: CommitteeMemberDesignation;
  appointedAt?: string;
  termEndDate?: string | null;
  votingRights?: boolean;
  notes?: string | null;
  actorUserId: string;
  effectiveUserId?: string;
}

export interface UpdateDesignationInput {
  societyId: string;
  committeeId: string;
  memberId: string;
  designation?: CommitteeMemberDesignation;
  votingRights?: boolean;
  notes?: string | null;
  actorUserId: string;
  effectiveUserId?: string;
}

export interface ResignMemberInput {
  societyId: string;
  committeeId: string;
  memberId: string;
  resignedAt?: string;
  reason?: string;
  actorUserId: string;
  effectiveUserId?: string;
}

export interface RemoveMemberInput {
  societyId: string;
  committeeId: string;
  memberId: string;
  removedAt?: string;
  reason?: string;
  actorUserId: string;
  effectiveUserId?: string;
}

export interface ReplaceMemberInput {
  societyId: string;
  committeeId: string;
  outgoingMemberId: string;
  incomingUserId: string;
  designation?: CommitteeMemberDesignation;
  replacementDate?: string;
  notes?: string;
  actorUserId: string;
  effectiveUserId?: string;
}

const SINGLE_SEAT_OFFICERS: CommitteeMemberDesignation[] = [
  "PRESIDENT",
  "CHAIRMAN",
  "SECRETARY",
  "TREASURER",
];

/**
 * Lists committees for a society with member count.
 */
export async function getCommittees(
  societyId: string,
  options?: { includeExpired?: boolean }
): Promise<Committee[]> {
  const adminClient = createAdminClient();

  let query = adminClient
    .from("committees")
    .select(`
      *,
      creator:profiles!committees_created_by_fkey(id, full_name, display_name),
      members:committee_members(
        id,
        user_id,
        designation,
        status,
        voting_rights,
        profile:profiles!committee_members_user_id_fkey(id, full_name, display_name, avatar_url)
      )
    `)
    .eq("society_id", societyId)
    .order("term_start_date", { ascending: false });

  if (!options?.includeExpired) {
    query = query.eq("status", "ACTIVE");
  }

  const { data, error } = await query;
  if (error) {
    console.error("[GovernanceService] Error fetching committees:", error);
    return [];
  }

  return (data || []) as Committee[];
}

/**
 * Fetches single committee detail with complete member roster and succession history.
 */
export async function getCommitteeDetail(
  societyId: string,
  committeeId: string,
  options?: { includeHistory?: boolean }
): Promise<Committee | null> {
  const adminClient = createAdminClient();

  const { data: committee, error } = await adminClient
    .from("committees")
    .select(`
      *,
      creator:profiles!committees_created_by_fkey(id, full_name, display_name)
    `)
    .eq("id", committeeId)
    .eq("society_id", societyId)
    .maybeSingle();

  if (error || !committee) {
    return null;
  }

  let memberQuery = adminClient
    .from("committee_members")
    .select(`
      *,
      profile:profiles!committee_members_user_id_fkey(id, full_name, display_name, email, phone, avatar_url),
      replaced_by:committee_members!committee_members_replaced_by_id_fkey(
        id,
        user_id,
        designation,
        profile:profiles!committee_members_user_id_fkey(id, full_name, display_name)
      )
    `)
    .eq("committee_id", committeeId)
    .eq("society_id", societyId)
    .order("appointed_at", { ascending: false });

  if (!options?.includeHistory) {
    memberQuery = memberQuery.eq("status", "ACTIVE");
  }

  const { data: members } = await memberQuery;
  return {
    ...(committee as Committee),
    members: (members || []) as CommitteeMember[],
  };
}

/**
 * Creates a new committee within a society.
 */
export async function createCommittee(
  input: CreateCommitteeInput
): Promise<{ committee: Committee | null; error?: string }> {
  if (input.termEndDate < input.termStartDate) {
    return { committee: null, error: "Term end date cannot be earlier than term start date" };
  }

  const adminClient = createAdminClient();

  // Validate single active managing committee constraint
  if (input.committeeType === "MANAGING_COMMITTEE") {
    const { data: existingActive } = await adminClient
      .from("committees")
      .select("id, name")
      .eq("society_id", input.societyId)
      .eq("committee_type", "MANAGING_COMMITTEE")
      .eq("status", "ACTIVE")
      .maybeSingle();

    if (existingActive) {
      return {
        committee: null,
        error: `An active Managing Committee ("${existingActive.name}") already exists for this society. Conclude or dissolve the existing term before establishing a new one.`,
      };
    }
  }

  const { data: committee, error } = await adminClient
    .from("committees")
    .insert({
      society_id: input.societyId,
      name: input.name,
      committee_type: input.committeeType,
      term_start_date: input.termStartDate,
      term_end_date: input.termEndDate,
      status: "ACTIVE",
      description: input.description || null,
      created_by: input.effectiveUserId || input.actorUserId,
    })
    .select()
    .single();

  if (error || !committee) {
    console.error("[GovernanceService] Error creating committee:", error);
    return { committee: null, error: error?.message || "Failed to create committee" };
  }

  await recordAuditLog({
    actorUserId: input.actorUserId,
    effectiveUserId: input.effectiveUserId || input.actorUserId,
    societyId: input.societyId,
    action: "COMMITTEE_CREATED",
    resourceType: "committee",
    resourceId: committee.id,
    metadata: {
      name: committee.name,
      committee_type: committee.committee_type,
      term_start_date: committee.term_start_date,
      term_end_date: committee.term_end_date,
    },
  });

  return { committee: committee as Committee };
}

/**
 * Updates an existing committee's metadata, dates, or lifecycle status.
 */
export async function updateCommittee(
  input: UpdateCommitteeInput
): Promise<{ committee: Committee | null; error?: string }> {
  const adminClient = createAdminClient();

  const { data: existing } = await adminClient
    .from("committees")
    .select("*")
    .eq("id", input.committeeId)
    .eq("society_id", input.societyId)
    .maybeSingle();

  if (!existing) {
    return { committee: null, error: "Committee not found in this society" };
  }

  const newStartDate = input.termStartDate || existing.term_start_date;
  const newEndDate = input.termEndDate || existing.term_end_date;

  if (newEndDate < newStartDate) {
    return { committee: null, error: "Term end date cannot be earlier than term start date" };
  }

  // F11.2-01: Controlled application pre-check when reactivating a Managing Committee
  if (
    input.status === "ACTIVE" &&
    existing.committee_type === "MANAGING_COMMITTEE" &&
    existing.status !== "ACTIVE"
  ) {
    const { data: existingActive } = await adminClient
      .from("committees")
      .select("id, name")
      .eq("society_id", input.societyId)
      .eq("committee_type", "MANAGING_COMMITTEE")
      .eq("status", "ACTIVE")
      .neq("id", input.committeeId)
      .maybeSingle();

    if (existingActive) {
      return {
        committee: null,
        error: `Cannot reactivate this Managing Committee. An active Managing Committee ("${existingActive.name}") already exists for this society. Conclude or dissolve the existing active committee first.`,
      };
    }
  }

  const updates: Record<string, any> = {
    updated_at: new Date().toISOString(),
  };

  if (input.name !== undefined) updates.name = input.name;
  if (input.termStartDate !== undefined) updates.term_start_date = input.termStartDate;
  if (input.termEndDate !== undefined) updates.term_end_date = input.termEndDate;
  if (input.status !== undefined) updates.status = input.status;
  if (input.description !== undefined) updates.description = input.description;

  const { data: updated, error } = await adminClient
    .from("committees")
    .update(updates)
    .eq("id", input.committeeId)
    .eq("society_id", input.societyId)
    .select()
    .single();

  if (error || !updated) {
    return { committee: null, error: error?.message || "Failed to update committee" };
  }

  await recordAuditLog({
    actorUserId: input.actorUserId,
    effectiveUserId: input.effectiveUserId || input.actorUserId,
    societyId: input.societyId,
    action: "COMMITTEE_UPDATED",
    resourceType: "committee",
    resourceId: updated.id,
    metadata: updates,
  });

  return { committee: updated as Committee };
}

/**
 * Appoints a member to a committee within a society.
 */
export async function appointCommitteeMember(
  input: AppointMemberInput
): Promise<{ member: CommitteeMember | null; error?: string }> {
  const adminClient = createAdminClient();

  // 1. Verify committee belongs to this society and is ACTIVE
  const { data: committee } = await adminClient
    .from("committees")
    .select("id, name, status, society_id")
    .eq("id", input.committeeId)
    .eq("society_id", input.societyId)
    .maybeSingle();

  if (!committee) {
    return { member: null, error: "Committee not found in this society" };
  }
  if (committee.status !== "ACTIVE") {
    return { member: null, error: "Cannot appoint members to an inactive or expired committee" };
  }

  // 2. Verify target user has an active membership in this society
  const { data: userMembership } = await adminClient
    .from("society_memberships")
    .select("id")
    .eq("society_id", input.societyId)
    .eq("user_id", input.userId)
    .eq("status", "ACTIVE")
    .maybeSingle();

  if (!userMembership) {
    return { member: null, error: "Target user is not an active member of this society" };
  }

  // 3. Verify user does not already hold an active seat in this committee
  const { data: existingSeat } = await adminClient
    .from("committee_members")
    .select("id, designation")
    .eq("committee_id", input.committeeId)
    .eq("user_id", input.userId)
    .eq("status", "ACTIVE")
    .maybeSingle();

  if (existingSeat) {
    return {
      member: null,
      error: `User already holds active seat as ${existingSeat.designation} in this committee`,
    };
  }

  // 4. If designation is single-seat, verify no other active member holds it
  if (SINGLE_SEAT_OFFICERS.includes(input.designation)) {
    const { data: existingOfficer } = await adminClient
      .from("committee_members")
      .select("id, user_id")
      .eq("committee_id", input.committeeId)
      .eq("designation", input.designation)
      .eq("status", "ACTIVE")
      .maybeSingle();

    if (existingOfficer) {
      return {
        member: null,
        error: `Designation "${input.designation}" is already held by another active member in this committee. Resign or replace the incumbent first.`,
      };
    }
  }

  // 5. Insert appointment
  const { data: member, error } = await adminClient
    .from("committee_members")
    .insert({
      committee_id: input.committeeId,
      society_id: input.societyId,
      user_id: input.userId,
      designation: input.designation,
      appointed_at: input.appointedAt || new Date().toISOString().split("T")[0],
      term_end_date: input.termEndDate || null,
      voting_rights: input.votingRights ?? true,
      status: "ACTIVE",
      notes: input.notes || null,
    })
    .select(`
      *,
      profile:profiles!committee_members_user_id_fkey(id, full_name, display_name, avatar_url)
    `)
    .single();

  if (error || !member) {
    console.error("[GovernanceService] Error appointing committee member:", error);
    return { member: null, error: error?.message || "Failed to appoint committee member" };
  }

  await recordAuditLog({
    actorUserId: input.actorUserId,
    effectiveUserId: input.effectiveUserId || input.actorUserId,
    societyId: input.societyId,
    action: "COMMITTEE_MEMBER_APPOINTED",
    resourceType: "committee_member",
    resourceId: member.id,
    metadata: {
      committee_id: member.committee_id,
      user_id: member.user_id,
      designation: member.designation,
      appointed_at: member.appointed_at,
    },
  });

  // Dispatch Phase 10 Notification
  try {
    await sendDomainNotification({
      societyId: input.societyId,
      type: "COMMITTEE_APPOINTED",
      recipientIds: [input.userId],
      data: {
        committeeName: committee.name,
        designation: member.designation,
      },
    });
  } catch (notifErr) {
    console.warn("[GovernanceService] Notification delivery warning:", notifErr);
  }

  return { member: member as CommitteeMember };
}

/**
 * Updates a committee member's designation, voting rights, or notes.
 */
export async function updateMemberDesignation(
  input: UpdateDesignationInput
): Promise<{ member: CommitteeMember | null; error?: string }> {
  const adminClient = createAdminClient();

  // 1. Fetch current appointment
  const { data: current } = await adminClient
    .from("committee_members")
    .select("*, committee:committees(id, name, status)")
    .eq("id", input.memberId)
    .eq("committee_id", input.committeeId)
    .eq("society_id", input.societyId)
    .eq("status", "ACTIVE")
    .maybeSingle();

  if (!current) {
    return { member: null, error: "Active committee appointment not found" };
  }

  const updates: Record<string, any> = {
    updated_at: new Date().toISOString(),
  };

  // 2. If designation is being changed
  if (input.designation && input.designation !== current.designation) {
    // Check single-seat conflict
    if (SINGLE_SEAT_OFFICERS.includes(input.designation)) {
      const { data: existingOfficer } = await adminClient
        .from("committee_members")
        .select("id")
        .eq("committee_id", input.committeeId)
        .eq("designation", input.designation)
        .eq("status", "ACTIVE")
        .neq("id", current.id)
        .maybeSingle();

      if (existingOfficer) {
        return {
          member: null,
          error: `Designation "${input.designation}" is already occupied by another active member in this committee.`,
        };
      }
    }
    updates.designation = input.designation;
  }

  if (input.votingRights !== undefined) updates.voting_rights = input.votingRights;
  if (input.notes !== undefined) updates.notes = input.notes;

  const { data: updated, error } = await adminClient
    .from("committee_members")
    .update(updates)
    .eq("id", current.id)
    .select(`
      *,
      profile:profiles!committee_members_user_id_fkey(id, full_name, display_name, avatar_url)
    `)
    .single();

  if (error || !updated) {
    return { member: null, error: error?.message || "Failed to update committee member" };
  }

  await recordAuditLog({
    actorUserId: input.actorUserId,
    effectiveUserId: input.effectiveUserId || input.actorUserId,
    societyId: input.societyId,
    action: "COMMITTEE_MEMBER_UPDATED",
    resourceType: "committee_member",
    resourceId: updated.id,
    metadata: updates,
  });

  if (input.designation && input.designation !== current.designation) {
    try {
      await sendDomainNotification({
        societyId: input.societyId,
        type: "COMMITTEE_DESIGNATION_CHANGED",
        recipientIds: [current.user_id],
        data: {
          committeeName: current.committee?.name || "Committee",
          designation: updated.designation,
        },
      });
    } catch (notifErr) {
      console.warn("[GovernanceService] Notification delivery warning:", notifErr);
    }
  }

  return { member: updated as CommitteeMember };
}

/**
 * Records a member's resignation, enforcing that resigned_at >= appointed_at.
 */
export async function recordMemberResignation(
  input: ResignMemberInput
): Promise<{ success: boolean; error?: string }> {
  const adminClient = createAdminClient();
  const resignedDate = input.resignedAt || new Date().toISOString().split("T")[0];

  const { data: member } = await adminClient
    .from("committee_members")
    .select("*, committee:committees(id, name)")
    .eq("id", input.memberId)
    .eq("committee_id", input.committeeId)
    .eq("society_id", input.societyId)
    .eq("status", "ACTIVE")
    .maybeSingle();

  if (!member) {
    return { success: false, error: "Active committee appointment not found" };
  }

  // F2 Check: resigned_at must be >= appointed_at
  if (resignedDate < member.appointed_at) {
    return {
      success: false,
      error: `Resignation date (${resignedDate}) cannot precede appointment date (${member.appointed_at})`,
    };
  }

  const { error } = await adminClient
    .from("committee_members")
    .update({
      status: "RESIGNED",
      resigned_at: resignedDate,
      notes: input.reason ? `Resigned: ${input.reason}` : member.notes,
      updated_at: new Date().toISOString(),
    })
    .eq("id", member.id);

  if (error) {
    return { success: false, error: error.message };
  }

  await recordAuditLog({
    actorUserId: input.actorUserId,
    effectiveUserId: input.effectiveUserId || input.actorUserId,
    societyId: input.societyId,
    action: "COMMITTEE_MEMBER_RESIGNED",
    resourceType: "committee_member",
    resourceId: member.id,
    metadata: {
      user_id: member.user_id,
      designation: member.designation,
      resigned_at: resignedDate,
      reason: input.reason || null,
    },
  });

  try {
    await sendDomainNotification({
      societyId: input.societyId,
      type: "COMMITTEE_MEMBER_RESIGNED",
      recipientIds: [member.user_id],
      data: {
        committeeName: member.committee?.name || "Committee",
      },
    });
  } catch (notifErr) {
    console.warn("[GovernanceService] Notification delivery warning:", notifErr);
  }

  return { success: true };
}

/**
 * Removes a committee member, transitioning status to REMOVED.
 */
export async function removeCommitteeMember(
  input: RemoveMemberInput
): Promise<{ success: boolean; error?: string }> {
  const adminClient = createAdminClient();
  const removedDate = input.removedAt || new Date().toISOString().split("T")[0];

  const { data: member } = await adminClient
    .from("committee_members")
    .select("*, committee:committees(id, name)")
    .eq("id", input.memberId)
    .eq("committee_id", input.committeeId)
    .eq("society_id", input.societyId)
    .eq("status", "ACTIVE")
    .maybeSingle();

  if (!member) {
    return { success: false, error: "Active committee appointment not found" };
  }

  if (removedDate < member.appointed_at) {
    return {
      success: false,
      error: `Removal date (${removedDate}) cannot precede appointment date (${member.appointed_at})`,
    };
  }

  const { error } = await adminClient
    .from("committee_members")
    .update({
      status: "REMOVED",
      resigned_at: removedDate,
      notes: input.reason ? `Removed: ${input.reason}` : member.notes,
      updated_at: new Date().toISOString(),
    })
    .eq("id", member.id);

  if (error) {
    return { success: false, error: error.message };
  }

  await recordAuditLog({
    actorUserId: input.actorUserId,
    effectiveUserId: input.effectiveUserId || input.actorUserId,
    societyId: input.societyId,
    action: "COMMITTEE_MEMBER_REMOVED",
    resourceType: "committee_member",
    resourceId: member.id,
    metadata: {
      user_id: member.user_id,
      designation: member.designation,
      removed_at: removedDate,
      reason: input.reason || null,
    },
  });

  try {
    await sendDomainNotification({
      societyId: input.societyId,
      type: "COMMITTEE_MEMBER_REMOVED",
      recipientIds: [member.user_id],
      data: {
        committeeName: member.committee?.name || "Committee",
      },
    });
  } catch (notifErr) {
    console.warn("[GovernanceService] Notification delivery warning:", notifErr);
  }

  return { success: true };
}

/**
 * Replaces an outgoing committee member with an incoming member, creating
 * an explicit temporal chain of succession (`replaced_by_id`).
 */
export async function replaceCommitteeMember(
  input: ReplaceMemberInput
): Promise<{ newMember: CommitteeMember | null; error?: string }> {
  // Prevent self-replacement
  if (input.outgoingMemberId === input.incomingUserId) {
    return { newMember: null, error: "Cannot replace member with themselves" };
  }

  const adminClient = createAdminClient();
  const replacementDate = input.replacementDate || new Date().toISOString().split("T")[0];

  // 1. Fetch outgoing member
  const { data: outgoing } = await adminClient
    .from("committee_members")
    .select("*, committee:committees(id, name)")
    .eq("id", input.outgoingMemberId)
    .eq("committee_id", input.committeeId)
    .eq("society_id", input.societyId)
    .eq("status", "ACTIVE")
    .maybeSingle();

  if (!outgoing) {
    return { newMember: null, error: "Active outgoing committee member not found" };
  }

  // Prevent cross-user collision
  if (outgoing.user_id === input.incomingUserId) {
    return { newMember: null, error: "Incoming user already holds this appointment" };
  }

  const designation = input.designation || outgoing.designation;

  // 2. Mark outgoing as REMOVED first so single-seat officer constraint doesn't collide
  const { error: outgoingUpdateErr } = await adminClient
    .from("committee_members")
    .update({
      status: "REMOVED",
      resigned_at: replacementDate,
      updated_at: new Date().toISOString(),
    })
    .eq("id", outgoing.id);

  if (outgoingUpdateErr) {
    return { newMember: null, error: outgoingUpdateErr.message };
  }

  // 3. Appoint incoming member
  const appointRes = await appointCommitteeMember({
    societyId: input.societyId,
    committeeId: input.committeeId,
    userId: input.incomingUserId,
    designation,
    appointedAt: replacementDate,
    votingRights: outgoing.voting_rights,
    notes: input.notes || `Successor to outgoing member ${outgoing.id}`,
    actorUserId: input.actorUserId,
    effectiveUserId: input.effectiveUserId,
  });

  if (!appointRes.member) {
    // Rollback outgoing update if appointment fails
    await adminClient
      .from("committee_members")
      .update({ status: "ACTIVE", resigned_at: null })
      .eq("id", outgoing.id);

    return { newMember: null, error: appointRes.error };
  }

  // 4. Link replaced_by_id on outgoing member
  await adminClient
    .from("committee_members")
    .update({ replaced_by_id: appointRes.member.id })
    .eq("id", outgoing.id);

  // F11.2-03: Dispatch removal/replacement notification to outgoing member
  try {
    await sendDomainNotification({
      societyId: input.societyId,
      type: "COMMITTEE_MEMBER_REMOVED",
      recipientIds: [outgoing.user_id],
      data: {
        committeeName: outgoing.committee?.name || "Committee",
      },
    });
  } catch (notifErr) {
    console.warn("[GovernanceService] Notification delivery warning for replaced outgoing member:", notifErr);
  }

  return { newMember: appointRes.member };
}

/**
 * Returns current active Managing Committee and public officer roster for residents.
 * Sanitizes internal notes, phone numbers, and audit details.
 */
export async function getPublicCommitteeRoster(
  societyId: string
): Promise<{ committee: Committee | null; roster: any[] }> {
  const adminClient = createAdminClient();

  const { data: committee } = await adminClient
    .from("committees")
    .select("id, name, committee_type, term_start_date, term_end_date, status, description")
    .eq("society_id", societyId)
    .eq("committee_type", "MANAGING_COMMITTEE")
    .eq("status", "ACTIVE")
    .maybeSingle();

  if (!committee) {
    return { committee: null, roster: [] };
  }

  const { data: members } = await adminClient
    .from("committee_members")
    .select(`
      id,
      designation,
      appointed_at,
      voting_rights,
      profile:profiles!committee_members_user_id_fkey(
        id,
        full_name,
        display_name,
        avatar_url
      )
    `)
    .eq("committee_id", committee.id)
    .eq("society_id", societyId)
    .eq("status", "ACTIVE")
    .order("appointed_at", { ascending: true });

  return {
    committee: committee as Committee,
    roster: members || [],
  };
}
