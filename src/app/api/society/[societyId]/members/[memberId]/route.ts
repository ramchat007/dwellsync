import { NextRequest, NextResponse } from "next/server";
import { requireSocietyAccess } from "@/lib/auth/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { recordAuditLog } from "@/lib/auth/audit";
import { UpdateMemberRoleSchema } from "@/lib/validations/governance";

export const dynamic = "force-dynamic";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ societyId: string; memberId: string }> }
) {
  try {
    const { societyId, memberId } = await params;
    const { identity } = await requireSocietyAccess(societyId);

    // 1. Authorization: Only Society Admin, Secretary, or Super Admin can modify member roles
    const canManageRoles =
      (identity.currentRole ? ["SUPER_ADMIN", "SOCIETY_ADMIN", "SECRETARY"].includes(identity.currentRole) : false) ||
      identity.isSuperAdmin;

    if (!canManageRoles) {
      return NextResponse.json(
        { error: "Forbidden: Management authorization required to manage member roles." },
        { status: 403 }
      );
    }

    const body = await req.json();
    const parseResult = UpdateMemberRoleSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        { error: "Invalid role update format", details: parseResult.error.flatten() },
        { status: 400 }
      );
    }

    const { role_id, unit_number, status } = parseResult.data;
    const adminClient = createAdminClient();

    // 2. Fetch existing membership
    const { data: targetMember, error: fetchErr } = await adminClient
      .from("society_memberships")
      .select("id, user_id, society_id, role_id, unit_number, status")
      .eq("id", memberId)
      .eq("society_id", societyId)
      .maybeSingle();

    if (fetchErr || !targetMember) {
      return NextResponse.json({ error: "Member not found in this society." }, { status: 404 });
    }

    // 3. Prevent self-elevation / privilege manipulation
    const callerUserId = identity.effectiveUser.id;
    if (callerUserId === targetMember.user_id && role_id !== targetMember.role_id) {
      return NextResponse.json(
        { error: "Privilege Escalation Prevention: You cannot modify your own assigned role." },
        { status: 403 }
      );
    }

    // 4. Invariant: SUPER_ADMIN platform role cannot be assigned inside society scopes
    if ((role_id as string) === "SUPER_ADMIN") {
      return NextResponse.json(
        { error: "Invalid operation: SUPER_ADMIN is a platform role and cannot be assigned in a society." },
        { status: 403 }
      );
    }

    // 5. Update membership
    const updates: Record<string, any> = {
      role_id,
      updated_at: new Date().toISOString(),
    };
    if (unit_number !== undefined) updates.unit_number = unit_number;
    if (status !== undefined) updates.status = status;

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
        updated_at,
        profile:profiles!user_id(id, full_name, display_name, email, phone)
      `)
      .single();

    if (updateErr || !updated) {
      return NextResponse.json({ error: updateErr?.message || "Failed to update member" }, { status: 500 });
    }

    // 6. Immutable Audit Log
    await recordAuditLog({
      actorUserId: callerUserId,
      societyId,
      action: "MEMBER_ROLE_CHANGED",
      resourceType: "society_memberships",
      resourceId: memberId,
      metadata: {
        targetUserId: targetMember.user_id,
        previousRole: targetMember.role_id,
        newRole: role_id,
        previousStatus: targetMember.status,
        newStatus: status || targetMember.status,
      },
    });

    return NextResponse.json({
      success: true,
      member: updated,
    });
  } catch (err: any) {
    console.error("[member PATCH] Exception:", err);
    return NextResponse.json({ error: "Unauthorized or server error" }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ societyId: string; memberId: string }> }
) {
  try {
    const { societyId, memberId } = await params;
    const { identity } = await requireSocietyAccess(societyId);

    const canManageRoles =
      (identity.currentRole ? ["SUPER_ADMIN", "SOCIETY_ADMIN", "SECRETARY"].includes(identity.currentRole) : false) ||
      identity.isSuperAdmin;

    if (!canManageRoles) {
      return NextResponse.json(
        { error: "Forbidden: Administrator authorization required to remove members." },
        { status: 403 }
      );
    }

    const adminClient = createAdminClient();

    const { data: targetMember } = await adminClient
      .from("society_memberships")
      .select("id, user_id, role_id")
      .eq("id", memberId)
      .eq("society_id", societyId)
      .maybeSingle();

    if (!targetMember) {
      return NextResponse.json({ error: "Member not found" }, { status: 404 });
    }

    if (targetMember.user_id === identity.effectiveUser.id) {
      return NextResponse.json(
        { error: "Invalid action: Administrators cannot delete their own society membership." },
        { status: 400 }
      );
    }

    // Soft-delete or update status to TERMINATED
    const { error: updateErr } = await adminClient
      .from("society_memberships")
      .update({
        status: "TERMINATED",
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
        targetUserId: targetMember.user_id,
        role: targetMember.role_id,
      },
    });

    return NextResponse.json({ success: true, message: "Membership terminated successfully." });
  } catch (err: any) {
    console.error("[member DELETE] Exception:", err);
    return NextResponse.json({ error: "Unauthorized or server error" }, { status: 500 });
  }
}
