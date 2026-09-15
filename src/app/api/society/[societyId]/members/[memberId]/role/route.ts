import { NextRequest, NextResponse } from "next/server";
import { getCurrentIdentity } from "@/lib/auth/server";
import { canManageRoles, validateRoleChange } from "@/lib/auth/societyAdmin";
import { createAdminClient } from "@/lib/supabase/admin";
import { recordAuditLog } from "@/lib/auth/audit";

export const dynamic = "force-dynamic";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ societyId: string; memberId: string }> }
) {
  try {
    const { societyId, memberId } = await params;
    const identity = await getCurrentIdentity();

    if (!identity || !identity.isAuthenticated) {
      return NextResponse.json(
        { error: "Authentication required." },
        { status: 401 }
      );
    }

    // 1. Authorization check: Only authorized role managers (SOCIETY_ADMIN, SECRETARY, non-impersonating SUPER_ADMIN)
    if (!canManageRoles(identity, societyId)) {
      return NextResponse.json(
        { error: "Forbidden: Administrator privileges required to manage roles." },
        { status: 403 }
      );
    }

    const adminClient = createAdminClient();

    // 2. Fetch existing membership within target society
    const { data: targetMember, error: fetchErr } = await adminClient
      .from("society_memberships")
      .select("id, user_id, society_id, role_id, unit_number, status")
      .eq("id", memberId)
      .eq("society_id", societyId)
      .maybeSingle();

    if (fetchErr || !targetMember) {
      return NextResponse.json(
        { error: "Member not found in this society." },
        { status: 404 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const role = body.role_id || body.role;

    if (!role) {
      return NextResponse.json(
        { error: "Role is required for role modification." },
        { status: 400 }
      );
    }

    // 3. Centralized validation: prevent self-escalation, prevent SUPER_ADMIN, enforce whitelist
    const validation = validateRoleChange({
      identity,
      targetSocietyId: societyId,
      targetMember,
      newRole: role,
    });

    if (!validation.isValid) {
      return NextResponse.json(
        { error: validation.error },
        { status: validation.statusCode }
      );
    }

    // 4. Update member role
    const { data: updated, error: updateErr } = await adminClient
      .from("society_memberships")
      .update({
        role_id: role,
        updated_at: new Date().toISOString(),
      })
      .eq("id", memberId)
      .eq("society_id", societyId)
      .select(`
        id,
        user_id,
        society_id,
        role_id,
        unit_number,
        status,
        created_at,
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
      return NextResponse.json(
        { error: updateErr?.message || "Failed to update member role" },
        { status: 500 }
      );
    }

    // 5. Audit Logging
    await recordAuditLog({
      actorUserId: identity.effectiveUser.id,
      societyId,
      action: "MEMBER_ROLE_CHANGED",
      resourceType: "society_memberships",
      resourceId: memberId,
      metadata: {
        targetUserId: targetMember.user_id,
        previousRole: targetMember.role_id,
        newRole: role,
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
    console.error("[member/role PATCH] Exception:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

