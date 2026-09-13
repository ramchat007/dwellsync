import { NextRequest, NextResponse } from "next/server";
import { requireSocietyAccess } from "@/lib/auth/server";
import {
  isAuthorizedSocietyAdmin,
  canManageRoles,
  validateRoleChange,
  validateMemberRemoval,
} from "@/lib/auth/societyAdmin";
import { createAdminClient } from "@/lib/supabase/admin";
import { recordAuditLog } from "@/lib/auth/audit";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ societyId: string; memberId: string }> }
) {
  try {
    const { societyId, memberId } = await params;
    const { identity } = await requireSocietyAccess(societyId);

    if (!isAuthorizedSocietyAdmin(identity, societyId)) {
      return NextResponse.json(
        { error: "Unauthorized: Society administrative privileges required." },
        { status: 403 }
      );
    }

    const adminClient = createAdminClient();
    const { data: member, error } = await adminClient
      .from("society_memberships")
      .select(`
        id,
        user_id,
        society_id,
        role_id,
        unit_number,
        status,
        joined_at,
        left_at,
        created_at,
        updated_at,
        profile:profiles!user_id (
          id,
          full_name,
          display_name,
          email,
          phone,
          avatar_url,
          created_at
        )
      `)
      .eq("id", memberId)
      .eq("society_id", societyId)
      .maybeSingle();

    if (error || !member) {
      return NextResponse.json(
        { error: "Member not found in this society." },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      member,
    });
  } catch (err: any) {
    if (err?.digest?.startsWith?.("NEXT_REDIRECT") || err?.message === "NEXT_REDIRECT") {
      return NextResponse.json({ error: "Unauthorized access to society" }, { status: 403 });
    }
    console.error("[member GET] Exception:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ societyId: string; memberId: string }> }
) {
  try {
    const { societyId, memberId } = await params;
    const { identity } = await requireSocietyAccess(societyId);

    const adminClient = createAdminClient();

    // 1. Fetch existing membership
    const { data: targetMember, error: fetchErr } = await adminClient
      .from("society_memberships")
      .select("id, user_id, society_id, role_id, unit_number, status")
      .eq("id", memberId)
      .eq("society_id", societyId)
      .maybeSingle();

    if (fetchErr || !targetMember) {
      return NextResponse.json({ error: "Member not found in this society." }, { status: 404 });
    }

    const body = await req.json();
    const { role_id, unit_number, status } = body;

    // 2. Validate role & status modification using centralized validator
    const validation = validateRoleChange({
      identity,
      targetSocietyId: societyId,
      targetMember,
      newRole: role_id,
      newStatus: status,
    });

    if (!validation.isValid) {
      return NextResponse.json(
        { error: validation.error },
        { status: validation.statusCode }
      );
    }

    // 3. Update membership
    const updates: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };
    if (role_id) updates.role_id = role_id;
    if (unit_number !== undefined) updates.unit_number = unit_number;
    if (status !== undefined) {
      updates.status = status;
      if (status === "REMOVED") {
        updates.left_at = new Date().toISOString();
      }
    }

    const { data: updated, error: updateErr } = await adminClient
      .from("society_memberships")
      .update(updates)
      .eq("id", memberId)
      .eq("society_id", societyId)
      .select(`
        id,
        user_id,
        society_id,
        role_id,
        unit_number,
        status,
        joined_at,
        left_at,
        updated_at,
        profile:profiles!user_id (
          id,
          full_name,
          display_name,
          email,
          phone
        )
      `)
      .single();

    if (updateErr || !updated) {
      return NextResponse.json({ error: updateErr?.message || "Failed to update member" }, { status: 500 });
    }

    // 4. Immutable Audit Log
    const callerUserId = identity.effectiveUser.id;
    await recordAuditLog({
      actorUserId: callerUserId,
      societyId,
      action: status && status !== targetMember.status ? "MEMBER_STATUS_CHANGED" : "MEMBER_ROLE_CHANGED",
      resourceType: "society_memberships",
      resourceId: memberId,
      metadata: {
        targetUserId: targetMember.user_id,
        previousRole: targetMember.role_id,
        newRole: role_id || targetMember.role_id,
        previousStatus: targetMember.status,
        newStatus: status || targetMember.status,
        unit_number: unit_number !== undefined ? unit_number : targetMember.unit_number,
      },
    });

    return NextResponse.json({
      success: true,
      member: updated,
    });
  } catch (err: any) {
    if (err?.digest?.startsWith?.("NEXT_REDIRECT") || err?.message === "NEXT_REDIRECT") {
      return NextResponse.json({ error: "Unauthorized access to society" }, { status: 403 });
    }
    console.error("[member PATCH] Exception:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ societyId: string; memberId: string }> }
) {
  try {
    const { societyId, memberId } = await params;
    const { identity } = await requireSocietyAccess(societyId);

    const adminClient = createAdminClient();

    const { data: targetMember } = await adminClient
      .from("society_memberships")
      .select("id, user_id, society_id, role_id, status")
      .eq("id", memberId)
      .eq("society_id", societyId)
      .maybeSingle();

    // Validate removal using centralized validator
    const validation = validateMemberRemoval({
      identity,
      targetSocietyId: societyId,
      targetMember,
    });

    if (!validation.isValid) {
      return NextResponse.json(
        { error: validation.error },
        { status: validation.statusCode }
      );
    }

    // Soft-delete: update status to REMOVED (matching database check constraint)
    const { error: updateErr } = await adminClient
      .from("society_memberships")
      .update({
        status: "REMOVED",
        left_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", memberId)
      .eq("society_id", societyId);

    if (updateErr) {
      return NextResponse.json({ error: updateErr.message }, { status: 500 });
    }

    await recordAuditLog({
      actorUserId: identity.effectiveUser.id,
      societyId,
      action: "MEMBERSHIP_REMOVED",
      resourceType: "society_memberships",
      resourceId: memberId,
      metadata: {
        targetUserId: targetMember?.user_id,
        role: targetMember?.role_id,
      },
    });

    return NextResponse.json({ success: true, message: "Membership removed successfully." });
  } catch (err: any) {
    if (err?.digest?.startsWith?.("NEXT_REDIRECT") || err?.message === "NEXT_REDIRECT") {
      return NextResponse.json({ error: "Unauthorized access to society" }, { status: 403 });
    }
    console.error("[member DELETE] Exception:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
