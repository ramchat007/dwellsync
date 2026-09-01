import crypto from "crypto";
import { createAdminClient } from "../supabase/admin";
import { Invitation, RoleId } from "../types/database";
import { invitationSchema, InvitationInput } from "../validations/invitation";
import { recordAuditLog } from "../auth/audit";

export async function createInvitation(
  input: InvitationInput,
  actorUserId?: string
): Promise<{ success: boolean; data?: Invitation; error?: string }> {
  const parsed = invitationSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const adminClient = createAdminClient();
  const data = parsed.data;

  // 1. Generate secure 256-bit single-use token
  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(); // 7 days

  const { data: newInvite, error } = await adminClient
    .from("invitations")
    .insert({
      society_id: data.society_id,
      email: data.email.toLowerCase().trim(),
      role_id: data.role_id,
      unit_id: data.unit_id || null,
      unit_number: data.unit_number || null,
      token,
      expires_at: expiresAt,
      invited_by: actorUserId || null,
      status: "PENDING",
    })
    .select()
    .single();

  if (error || !newInvite) {
    console.error("[invitationService] Error creating invite:", error);
    return { success: false, error: error?.message || "Failed to create invitation" };
  }

  await recordAuditLog({
    actorUserId,
    societyId: data.society_id,
    action: "MEMBER_INVITED",
    resourceType: "invitations",
    resourceId: newInvite.id,
    metadata: {
      email: data.email,
      role_id: data.role_id,
      unit_number: data.unit_number,
    },
  });

  return { success: true, data: newInvite as Invitation };
}

export async function getInvitations(societyId: string): Promise<Invitation[]> {
  const adminClient = createAdminClient();
  const { data, error } = await adminClient
    .from("invitations")
    .select("*")
    .eq("society_id", societyId)
    .order("created_at", { ascending: false });

  if (error || !data) {
    console.error("[invitationService] Error fetching invites:", error);
    return [];
  }
  return data as Invitation[];
}

