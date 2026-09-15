import { NextRequest, NextResponse } from "next/server";
import { getCurrentIdentity } from "@/lib/auth/server";
import { validateRelationshipAccess } from "@/lib/auth/societyAdmin";
import { createAdminClient } from "@/lib/supabase/admin";
import { getMemberRelationships } from "@/lib/services/membershipService";

export const dynamic = "force-dynamic";

export async function GET(
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

    // 2. Centralized validation (checks admin or self access, tenant isolation)
    const validation = validateRelationshipAccess({
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

    // 3. Fetch comprehensive relationship data
    const result = await getMemberRelationships(societyId, memberId);

    if (!result.success || !result.data) {
      return NextResponse.json(
        { error: result.error || "Failed to fetch member relationships." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      ...result.data,
    });
  } catch (err: any) {
    if (err?.digest?.startsWith?.("NEXT_REDIRECT") || err?.message === "NEXT_REDIRECT") {
      return NextResponse.json({ error: "Unauthorized access to society" }, { status: 403 });
    }
    console.error("[member relationships GET] Exception:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

