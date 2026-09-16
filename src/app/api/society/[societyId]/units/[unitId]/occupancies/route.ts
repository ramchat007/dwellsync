import { NextRequest, NextResponse } from "next/server";
import { getCurrentIdentity, requireSocietyAccess } from "@/lib/auth/server";
import { isAuthorizedSocietyAdmin } from "@/lib/auth/societyAdmin";
import { getUnitOccupancies, addUnitOccupancy } from "@/lib/services/ownershipService";
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

    const occupancies = await getUnitOccupancies(unitId);
    const sanitizedOccupancies = occupancies.map((o) => ({
      ...o,
      profile: o.profile
        ? {
            id: o.profile.id,
            full_name: o.profile.full_name,
            display_name: o.profile.display_name,
            avatar_url: o.profile.avatar_url,
          }
        : null,
    }));

    return NextResponse.json({ success: true, data: sanitizedOccupancies });
  } catch (error) {
    console.error("[unit occupancies GET] Error:", error);
    return NextResponse.json({ error: "Failed to fetch occupancies" }, { status: 500 });
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

    if (!isAuthorizedSocietyAdmin(identity, societyId)) {
      return NextResponse.json(
        { error: "Forbidden: Society administrator privileges required." },
        { status: 403 }
      );
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
    const result = await addUnitOccupancy(
      {
        ...body,
        society_id: societyId,
        unit_id: unitId,
      },
      identity.effectiveUser.id
    );

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error("[unit occupancies POST] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
