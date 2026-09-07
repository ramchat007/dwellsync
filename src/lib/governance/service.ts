import { createAdminClient } from "@/lib/supabase/admin";
import { recordAuditLog } from "@/lib/auth/audit";
import {
  Committee,
  CommitteeMember,
  CommitteeType,
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

export interface ResignMemberInput {
  societyId: string;
  committeeId: string;
  memberId: string;
  resignedAt?: string;
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
 * Creates a new committee within a society after validating:
 * 1. Term end date is on or after term start date.
 * 2. Only ONE active MANAGING_COMMITTEE can exist per society.
 * 3. Records immutable audit log.
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
 * Appoints a member to a committee within a society:
 * 1. Verifies committee belongs to the society and is ACTIVE.
 * 2. Enforces at most ONE active seat for this user in the same committee.
 * 3. Enforces single-holder rule for key designations (President, Chairman, Secretary, Treasurer).
 * 4. Records immutable audit log.
 */
export async function appointCommitteeMember(
  input: AppointMemberInput
): Promise<{ member: CommitteeMember | null; error?: string }> {
  const adminClient = createAdminClient();

  // 1. Verify committee belongs to this society and is ACTIVE
  const { data: committee } = await adminClient
    .from("committees")
    .select("id, status, society_id")
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
    .select()
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

  return { member: member as CommitteeMember };
}

/**
 * Records a member's resignation, setting status to RESIGNED and preserving the historical record.
 */
export async function recordMemberResignation(
  input: ResignMemberInput
): Promise<{ success: boolean; error?: string }> {
  const adminClient = createAdminClient();
  const resignedDate = input.resignedAt || new Date().toISOString().split("T")[0];

  const { data: member, error } = await adminClient
    .from("committee_members")
    .update({
      status: "RESIGNED",
      resigned_at: resignedDate,
      notes: input.reason ? `Resigned: ${input.reason}` : undefined,
      updated_at: new Date().toISOString(),
    })
    .eq("id", input.memberId)
    .eq("committee_id", input.committeeId)
    .eq("society_id", input.societyId)
    .eq("status", "ACTIVE")
    .select()
    .maybeSingle();

  if (error || !member) {
    return { success: false, error: error?.message || "Active committee member appointment not found" };
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

  return { success: true };
}

/**
 * Replaces an outgoing committee member with an incoming member, creating
 * an explicit temporal chain of succession (`replaced_by_id`).
 */
export async function replaceCommitteeMember(
  input: ReplaceMemberInput
): Promise<{ newMember: CommitteeMember | null; error?: string }> {
  const adminClient = createAdminClient();
  const replacementDate = input.replacementDate || new Date().toISOString().split("T")[0];

  // 1. Fetch outgoing member
  const { data: outgoing } = await adminClient
    .from("committee_members")
    .select("*")
    .eq("id", input.outgoingMemberId)
    .eq("committee_id", input.committeeId)
    .eq("society_id", input.societyId)
    .eq("status", "ACTIVE")
    .maybeSingle();

  if (!outgoing) {
    return { newMember: null, error: "Active outgoing committee member not found" };
  }

  // 2. Determine designation
  const designation = input.designation || outgoing.designation;

  // 3. Mark outgoing as RESIGNED/REMOVED first so the single-seat constraint doesn't collide
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

  // 4. Appoint incoming member
  const appointRes = await appointCommitteeMember({
    societyId: input.societyId,
    committeeId: input.committeeId,
    userId: input.incomingUserId,
    designation,
    appointedAt: replacementDate,
    votingRights: outgoing.voting_rights,
    notes: input.notes || `Replaced outgoing member ${outgoing.id}`,
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

  // 5. Link replaced_by_id on outgoing member
  await adminClient
    .from("committee_members")
    .update({ replaced_by_id: appointRes.member.id })
    .eq("id", outgoing.id);

  return { newMember: appointRes.member };
}

