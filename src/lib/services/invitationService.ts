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

export async function getInvitationByToken(
  token: string
): Promise<{ success: boolean; data?: Invitation; error?: string }> {
  if (!token || typeof token !== "string") {
    return { success: false, error: "Invalid invitation token." };
  }

  const adminClient = createAdminClient();
  const { data: invite, error } = await adminClient
    .from("invitations")
    .select(`
      *,
      society:societies (*),
      unit:units (
        *,
        building:buildings (name, code),
        wing:wings (name, code),
        floor:floors (name, floor_number)
      )
    `)
    .eq("token", token)
    .single();

  if (error || !invite) {
    return { success: false, error: "Invitation not found or invalid link." };
  }

  if (invite.status !== "PENDING") {
    return {
      success: false,
      error: `This invitation has already been ${invite.status.toLowerCase()}.`,
    };
  }

  if (new Date(invite.expires_at) < new Date()) {
    await adminClient.from("invitations").update({ status: "EXPIRED" }).eq("id", invite.id);
    return {
      success: false,
      error: "This invitation has expired. Please contact your society administrator for a new invite.",
    };
  }

  return { success: true, data: invite as Invitation };
}

export async function acceptInvitation(
  token: string,
  userId: string,
  userEmail: string
): Promise<{
  success: boolean;
  data?: { societyId: string; roleId: RoleId; unitId?: string | null };
  error?: string;
}> {
  const adminClient = createAdminClient();

  // 1. Fetch invitation
  const { data: invite, error: inviteErr } = await adminClient
    .from("invitations")
    .select("*, society:societies(*)")
    .eq("token", token)
    .single();

  if (inviteErr || !invite) {
    return { success: false, error: "Invalid invitation token." };
  }

  // 2. Check status
  if (invite.status !== "PENDING") {
    return {
      success: false,
      error: `This invitation has already been ${invite.status.toLowerCase()}.`,
    };
  }

  // 3. Check expiration
  if (new Date(invite.expires_at) < new Date()) {
    await adminClient.from("invitations").update({ status: "EXPIRED" }).eq("id", invite.id);
    return {
      success: false,
      error: "This invitation has expired. Please request a new invitation.",
    };
  }

  // 4. Verify email binding (anti-theft check)
  if (invite.email.toLowerCase() !== userEmail.toLowerCase()) {
    return {
      success: false,
      error: `This invitation was issued for ${invite.email}. Please sign in with that email address to claim this membership.`,
    };
  }

  // 5. Verify resident profile exists
  const { data: profile } = await adminClient
    .from("profiles")
    .select("id, status")
    .eq("id", userId)
    .single();

  if (!profile || profile.status === "SUSPENDED") {
    return { success: false, error: "User profile not found or account suspended." };
  }

  // 6. Create or update society membership
  const { error: membershipErr } = await adminClient
    .from("society_memberships")
    .upsert(
      {
        society_id: invite.society_id,
        user_id: userId,
        role_id: invite.role_id,
        unit_number: invite.unit_number || null,
        status: "ACTIVE",
        joined_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      { onConflict: "society_id,user_id,role_id" }
    );

  if (membershipErr) {
    console.error("[invitationService] Membership creation error:", membershipErr);
    return { success: false, error: "Failed to establish society membership." };
  }

  // 7. Establish Unit Relationship if unit_id was designated
  if (invite.unit_id) {
    if (invite.role_id === "OWNER") {
      await adminClient
        .from("unit_owners")
        .upsert(
          {
            society_id: invite.society_id,
            unit_id: invite.unit_id,
            user_id: userId,
            is_primary: true,
            ownership_percentage: 100.0,
            ownership_type: "PRIMARY",
            start_date: new Date().toISOString().split("T")[0],
            status: "ACTIVE",
            updated_at: new Date().toISOString(),
          },
          { onConflict: "unit_id,user_id" }
        );
    } else {
      const occupancyType =
        invite.role_id === "TENANT" ? "TENANT_OCCUPIED" : "OWNER_OCCUPIED";
      await adminClient
        .from("unit_occupancies")
        .upsert(
          {
            society_id: invite.society_id,
            unit_id: invite.unit_id,
            user_id: userId,
            occupancy_type: occupancyType,
            is_primary_tenant: true,
            status: "ACTIVE",
            updated_at: new Date().toISOString(),
          },
          { onConflict: "unit_id,user_id" }
        );

      await adminClient
        .from("units")
        .update({ status: "OCCUPIED" })
        .eq("id", invite.unit_id);
    }
  }

  // 8. Mark invitation as ACCEPTED
  await adminClient
    .from("invitations")
    .update({
      status: "ACCEPTED",
      accepted_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", invite.id);

  // 9. Record audit log
  await recordAuditLog({
    actorUserId: userId,
    effectiveUserId: userId,
    societyId: invite.society_id,
    action: "INVITATION_ACCEPTED" as any,
    resourceType: "invitations",
    resourceId: invite.id,
    metadata: {
      role_id: invite.role_id,
      unit_id: invite.unit_id,
      unit_number: invite.unit_number,
    },
  });

  return {
    success: true,
    data: {
      societyId: invite.society_id,
      roleId: invite.role_id as RoleId,
      unitId: invite.unit_id,
    },
  };
}


