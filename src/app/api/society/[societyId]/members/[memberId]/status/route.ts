import { NextRequest, NextResponse } from "next/server";
import { getCurrentIdentity } from "@/lib/auth/server";
import {
  canManageRoles,
  validateMemberStatusChange,
} from "@/lib/auth/societyAdmin";
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

    if (!canManageRoles(identity, societyId)) {
      return NextResponse.json(
        { error: "Forbidden: Administrator privileges required to manage member status." },
        { status: 403 }
      );
    }

    const adminClient = createAdminClient();

    // 1. Fetch current target member
    const { data: targetMember, error: fetchErr } = await adminClient
      .from("society_memberships")
      .select("id, user_id, society_id, role_id, unit_number, status")
      .eq("id", memberId)
      .eq("society_id", societyId)
      .maybeSingle();

    if (fetchErr || !targetMember) {
      return NextResponse.json({ error: "Member not found in this society." }, { status: 404 });
    }

    const body = await req.json().catch(() => ({}));
    const newStatus = body.status;

    if (!newStatus) {
      return NextResponse.json(
        { error: "Status field is required." },
        { status: 400 }
      );
    }

    // 2. Centralized validation (checks self-modification, tenant isolation, valid status)
    const validation = validateMemberStatusChange({
      identity,
      targetSocietyId: societyId,
      targetMember,
      newStatus,
    });

    if (!validation.isValid) {
      return NextResponse.json(
        { error: validation.error },
        { status: validation.statusCode }
      );
    }

    // 3. Update status in database
    const { data: updated, error: updateErr } = await adminClient
      .from("society_memberships")
      .update({
        status: newStatus,
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
        { error: updateErr?.message || "Failed to update member status." },
        { status: 500 }
      );
    }

    // 4. Immutable Audit Log
    await recordAuditLog({
      actorUserId: identity.effectiveUser.id,
      effectiveUserId: targetMember.user_id,
      societyId,
      action: "MEMBER_STATUS_CHANGED",
      resourceType: "society_memberships",
      resourceId: memberId,
      metadata: {
        targetUserId: targetMember.user_id,
        previousStatus: targetMember.status,
        newStatus,
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
    console.error("[member status PATCH] Exception:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

