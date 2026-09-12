import { createAdminClient } from "@/lib/supabase/admin";
import { recordAuditLog } from "@/lib/auth/audit";
import {
  GovernanceResolution,
  ResolutionType,
  ResolutionStatus,
} from "@/lib/types/database";

export interface CreateResolutionInput {
  societyId: string;
  meetingId?: string | null;
  resolutionNumber?: string;
  title: string;
  description: string;
  resolutionType?: ResolutionType;
  status?: ResolutionStatus;
  proposedBy?: string | null;
  secondedBy?: string | null;
  votesFor?: number;
  votesAgainst?: number;
  votesAbstained?: number;
  passedDate?: string;
  effectiveDate?: string;
  notes?: string | null;
  actorUserId: string;
  effectiveUserId?: string;
}

export interface UpdateResolutionInput {
  societyId: string;
  resolutionId: string;
  title?: string;
  description?: string;
  resolutionType?: ResolutionType;
  status?: ResolutionStatus;
  proposedBy?: string | null;
  secondedBy?: string | null;
  votesFor?: number;
  votesAgainst?: number;
  votesAbstained?: number;
  passedDate?: string;
  effectiveDate?: string;
  notes?: string | null;
  actorUserId: string;
  effectiveUserId?: string;
}

/**
 * Lists resolutions for a society with optional filtering.
 */
export async function listResolutions(
  societyId: string,
  filters?: {
    meetingId?: string;
    status?: ResolutionStatus;
    type?: ResolutionType;
    limit?: number;
  }
): Promise<{ resolutions: GovernanceResolution[]; error?: string }> {
  try {
    const adminClient = createAdminClient();
    let query = adminClient
      .from("governance_resolutions")
      .select(`
        *,
        meeting:society_meetings(id, title, meeting_type, scheduled_at),
        proposer:profiles!governance_resolutions_proposed_by_fkey(id, full_name, display_name),
        seconder:profiles!governance_resolutions_seconded_by_fkey(id, full_name, display_name)
      `)
      .eq("society_id", societyId)
      .order("passed_date", { ascending: false });

    if (filters?.meetingId) {
      query = query.eq("meeting_id", filters.meetingId);
    }
    if (filters?.status) {
      query = query.eq("status", filters.status);
    }
    if (filters?.type) {
      query = query.eq("resolution_type", filters.type);
    }
    if (filters?.limit) {
      query = query.limit(filters.limit);
    }

    const { data, error } = await query;
    if (error) {
      return { resolutions: [], error: error.message };
    }

    return { resolutions: (data || []) as unknown as GovernanceResolution[] };
  } catch (err: any) {
    return { resolutions: [], error: err.message || "Failed to fetch resolutions" };
  }
}

/**
 * Retrieves a specific resolution by ID with tenant isolation.
 */
export async function getResolution(
  societyId: string,
  resolutionId: string
): Promise<{ resolution: GovernanceResolution | null; error?: string }> {
  try {
    const adminClient = createAdminClient();
    const { data, error } = await adminClient
      .from("governance_resolutions")
      .select(`
        *,
        meeting:society_meetings(id, title, meeting_type, scheduled_at),
        proposer:profiles!governance_resolutions_proposed_by_fkey(id, full_name, display_name),
        seconder:profiles!governance_resolutions_seconded_by_fkey(id, full_name, display_name)
      `)
      .eq("society_id", societyId)
      .eq("id", resolutionId)
      .maybeSingle();

    if (error) {
      return { resolution: null, error: error.message };
    }
    if (!data) {
      return { resolution: null, error: "Resolution not found" };
    }

    return { resolution: data as unknown as GovernanceResolution };
  } catch (err: any) {
    return { resolution: null, error: err.message || "Failed to load resolution" };
  }
}

/**
 * Creates an official governance resolution.
 */
export async function createResolution(
  input: CreateResolutionInput
): Promise<{ resolution: GovernanceResolution | null; error?: string }> {
  try {
    const adminClient = createAdminClient();

    // 1. Verify meeting belongs to society if specified
    if (input.meetingId) {
      const { data: meeting } = await adminClient
        .from("society_meetings")
        .select("id")
        .eq("id", input.meetingId)
        .eq("society_id", input.societyId)
        .maybeSingle();

      if (!meeting) {
        return { resolution: null, error: "Referenced meeting does not exist in this society" };
      }
    }

    // 2. Generate resolution number if not explicitly provided
    let resolutionNumber = input.resolutionNumber;
    if (!resolutionNumber) {
      const year = new Date().getFullYear();
      const { count } = await adminClient
        .from("governance_resolutions")
        .select("*", { count: "exact", head: true })
        .eq("society_id", input.societyId);

      const seq = ((count || 0) + 1).toString().padStart(3, "0");
      resolutionNumber = `RES-${year}-${seq}`;
    }

    // 3. Insert record
    const { data, error } = await adminClient
      .from("governance_resolutions")
      .insert({
        society_id: input.societyId,
        meeting_id: input.meetingId || null,
        resolution_number: resolutionNumber,
        title: input.title,
        description: input.description,
        resolution_type: input.resolutionType || "ORDINARY",
        status: input.status || "PASSED",
        proposed_by: input.proposedBy || null,
        seconded_by: input.secondedBy || null,
        votes_for: input.votesFor ?? 0,
        votes_against: input.votesAgainst ?? 0,
        votes_abstained: input.votesAbstained ?? 0,
        passed_date: input.passedDate || new Date().toISOString().split("T")[0],
        effective_date: input.effectiveDate || new Date().toISOString().split("T")[0],
        notes: input.notes || null,
        created_by: input.actorUserId,
      })
      .select(`
        *,
        meeting:society_meetings(id, title, meeting_type, scheduled_at),
        proposer:profiles!governance_resolutions_proposed_by_fkey(id, full_name, display_name),
        seconder:profiles!governance_resolutions_seconded_by_fkey(id, full_name, display_name)
      `)
      .single();

    if (error || !data) {
      return { resolution: null, error: error?.message || "Failed to create resolution" };
    }

    // 4. Immutable Audit Log
    await recordAuditLog({
      actorUserId: input.actorUserId,
      effectiveUserId: input.effectiveUserId || input.actorUserId,
      societyId: input.societyId,
      action: "RESOLUTION_CREATED",
      resourceType: "governance_resolutions",
      resourceId: data.id,
      metadata: {
        resolution_number: data.resolution_number,
        title: data.title,
        status: data.status,
        type: data.resolution_type,
        meeting_id: data.meeting_id,
      },
    });

    return { resolution: data as unknown as GovernanceResolution };
  } catch (err: any) {
    return { resolution: null, error: err.message || "Failed to create resolution" };
  }
}

/**
 * Updates an existing governance resolution.
 */
export async function updateResolution(
  input: UpdateResolutionInput
): Promise<{ resolution: GovernanceResolution | null; error?: string }> {
  try {
    const adminClient = createAdminClient();

    // 1. Verify existence
    const { data: existing } = await adminClient
      .from("governance_resolutions")
      .select("*")
      .eq("id", input.resolutionId)
      .eq("society_id", input.societyId)
      .maybeSingle();

    if (!existing) {
      return { resolution: null, error: "Resolution not found in this society" };
    }

    const updates: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };

    if (input.title !== undefined) updates.title = input.title;
    if (input.description !== undefined) updates.description = input.description;
    if (input.resolutionType !== undefined) updates.resolution_type = input.resolutionType;
    if (input.status !== undefined) updates.status = input.status;
    if (input.proposedBy !== undefined) updates.proposed_by = input.proposedBy;
    if (input.secondedBy !== undefined) updates.seconded_by = input.secondedBy;
    if (input.votesFor !== undefined) updates.votes_for = input.votesFor;
    if (input.votesAgainst !== undefined) updates.votes_against = input.votesAgainst;
    if (input.votesAbstained !== undefined) updates.votes_abstained = input.votesAbstained;
    if (input.passedDate !== undefined) updates.passed_date = input.passedDate;
    if (input.effectiveDate !== undefined) updates.effective_date = input.effectiveDate;
    if (input.notes !== undefined) updates.notes = input.notes;

    const { data, error } = await adminClient
      .from("governance_resolutions")
      .update(updates)
      .eq("id", input.resolutionId)
      .eq("society_id", input.societyId)
      .select(`
        *,
        meeting:society_meetings(id, title, meeting_type, scheduled_at),
        proposer:profiles!governance_resolutions_proposed_by_fkey(id, full_name, display_name),
        seconder:profiles!governance_resolutions_seconded_by_fkey(id, full_name, display_name)
      `)
      .single();

    if (error || !data) {
      return { resolution: null, error: error?.message || "Failed to update resolution" };
    }

    // Immutable Audit Log
    await recordAuditLog({
      actorUserId: input.actorUserId,
      effectiveUserId: input.effectiveUserId || input.actorUserId,
      societyId: input.societyId,
      action: "RESOLUTION_UPDATED",
      resourceType: "governance_resolutions",
      resourceId: data.id,
      metadata: {
        resolution_number: data.resolution_number,
        updated_fields: Object.keys(updates),
      },
    });

    return { resolution: data as unknown as GovernanceResolution };
  } catch (err: any) {
    return { resolution: null, error: err.message || "Failed to update resolution" };
  }
}

/**
 * Deletes a governance resolution.
 */
export async function deleteResolution(
  societyId: string,
  resolutionId: string,
  actorUserId: string,
  effectiveUserId?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const adminClient = createAdminClient();

    const { data: existing } = await adminClient
      .from("governance_resolutions")
      .select("id, resolution_number, title")
      .eq("id", resolutionId)
      .eq("society_id", societyId)
      .maybeSingle();

    if (!existing) {
      return { success: false, error: "Resolution not found" };
    }

    const { error } = await adminClient
      .from("governance_resolutions")
      .delete()
      .eq("id", resolutionId)
      .eq("society_id", societyId);

    if (error) {
      return { success: false, error: error.message };
    }

    await recordAuditLog({
      actorUserId,
      effectiveUserId: effectiveUserId || actorUserId,
      societyId,
      action: "RESOLUTION_DELETED",
      resourceType: "governance_resolutions",
      resourceId: resolutionId,
      metadata: {
        resolution_number: existing.resolution_number,
        title: existing.title,
      },
    });

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to delete resolution" };
  }
}

