import { NextResponse } from "next/server";
import { requireSocietyAccess } from "@/lib/auth/server";
import { getFamilyMembers, addFamilyMember } from "@/lib/services/ownershipService";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ societyId: string; unitId: string }> }
) {
  try {
    const { societyId, unitId } = await params;
    await requireSocietyAccess(societyId);

    const family = await getFamilyMembers(unitId);
    return NextResponse.json({ success: true, data: family });
  } catch (error) {
    console.error("[family members GET] Error:", error);
    return NextResponse.json({ error: "Failed to fetch family members" }, { status: 500 });
  }
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ societyId: string; unitId: string }> }
) {
  try {
    const { societyId, unitId } = await params;
    const { identity } = await requireSocietyAccess(societyId);

    const body = await req.json();
    const result = await addFamilyMember(
      {
        ...body,
        society_id: societyId,
        unit_id: unitId,
        primary_member_id: body.primary_member_id || identity.effectiveUser.id,
      },
      identity.originalUser.id
    );

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("[family members POST] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

