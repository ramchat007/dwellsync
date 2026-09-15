import { NextRequest, NextResponse } from "next/server";
import { getCurrentIdentity } from "@/lib/auth/server";
import {
  isAuthorizedSocietyAdmin,
  validateUnitAssociation,
} from "@/lib/auth/societyAdmin";
import { createAdminClient } from "@/lib/supabase/admin";
import { reassignMemberUnit } from "@/lib/services/membershipService";

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

    if (!isAuthorizedSocietyAdmin(identity, societyId)) {
      return NextResponse.json(
        { error: "Forbidden: Society administrative privileges required to assign units." },
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
    const unitId = body.unit_id !== undefined ? body.unit_id : null;
    const unitNumber = body.unit_number !== undefined ? body.unit_number : null;

    // 2. If unitId is provided, fetch and verify target unit
    let targetUnit = null;
    if (unitId) {
      const { data: unitData, error: unitErr } = await adminClient
        .from("units")
        .select("id, society_id, unit_number")
        .eq("id", unitId)
        .maybeSingle();

      if (unitErr || !unitData) {
        return NextResponse.json(
          { error: "Target unit does not exist." },
          { status: 404 }
        );
      }
      targetUnit = unitData;
    }

    // 3. Centralized validation (checks admin auth, tenant isolation, cross-society boundaries)
    const validation = validateUnitAssociation({
      identity,
      targetSocietyId: societyId,
      targetMember,
      targetUnit,
      unitId,
      unitNumber,
    });

    if (!validation.isValid) {
      return NextResponse.json(
        { error: validation.error },
        { status: validation.statusCode }
      );
    }

    // 4. Perform reassignment
    const result = await reassignMemberUnit(
      societyId,
      memberId,
      unitId,
      unitNumber,
      identity.effectiveUser.id
    );

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || "Failed to reassign member unit." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      member: result.data,
    });
  } catch (err: any) {
    if (err?.digest?.startsWith?.("NEXT_REDIRECT") || err?.message === "NEXT_REDIRECT") {
      return NextResponse.json({ error: "Unauthorized access to society" }, { status: 403 });
    }
    console.error("[member unit PATCH] Exception:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

