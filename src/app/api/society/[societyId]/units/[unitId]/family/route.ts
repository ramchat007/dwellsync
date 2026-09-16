import { NextRequest, NextResponse } from "next/server";
import { getCurrentIdentity, requireSocietyAccess } from "@/lib/auth/server";
import { isAuthorizedSocietyAdmin } from "@/lib/auth/societyAdmin";
import { getFamilyMembers, addFamilyMember } from "@/lib/services/ownershipService";
import { createAdminClient } from "@/lib/supabase/admin";
import { isValidUuid } from "@/lib/utils";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ societyId: string; unitId: string }> }
) {
  try {
    const { societyId, unitId } = await params;
    if (!isValidUuid(societyId) || !isValidUuid(unitId)) {
      return NextResponse.json({ error: "Invalid ID format." }, { status: 400 });
    }

    await requireSocietyAccess(societyId);

    const adminClient = createAdminClient();
    const { data: unit } = await adminClient
      .from("units")
      .select("id")
      .eq("id", unitId)
      .eq("society_id", societyId)
      .maybeSingle();

    if (!unit) {
      return NextResponse.json({ error: "Unit not found in this society." }, { status: 404 });
    }

    const family = await getFamilyMembers(unitId);
    return NextResponse.json({ success: true, data: family });
  } catch (error) {
    console.error("[family members GET] Error:", error);
    return NextResponse.json({ error: "Failed to fetch family members" }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ societyId: string; unitId: string }> }
) {
  try {
    const { societyId, unitId } = await params;
    if (!isValidUuid(societyId) || !isValidUuid(unitId)) {
      return NextResponse.json({ error: "Invalid ID format." }, { status: 400 });
    }

    const identity = await getCurrentIdentity();
    if (!identity || !identity.isAuthenticated) {
      return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    }

    const adminClient = createAdminClient();
    const { data: unit } = await adminClient
      .from("units")
      .select("id")
      .eq("id", unitId)
      .eq("society_id", societyId)
      .maybeSingle();

    if (!unit) {
      return NextResponse.json({ error: "Unit not found in this society." }, { status: 404 });
    }

    const body = await req.json().catch(() => ({}));
    const result = await addFamilyMember(
      {
        ...body,
        society_id: societyId,
        unit_id: unitId,
        primary_member_id: body.primary_member_id || identity.effectiveUser.id,
      },
      identity.effectiveUser.id
    );

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error("[family members POST] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
