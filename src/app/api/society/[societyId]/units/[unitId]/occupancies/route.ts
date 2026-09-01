import { NextResponse } from "next/server";
import { requireSocietyAccess } from "@/lib/auth/server";
import { getUnitOccupancies, addUnitOccupancy } from "@/lib/services/ownershipService";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ societyId: string; unitId: string }> }
) {
  try {
    const { societyId, unitId } = await params;
    await requireSocietyAccess(societyId);

    const occupancies = await getUnitOccupancies(unitId);
    return NextResponse.json({ success: true, data: occupancies });
  } catch (error) {
    console.error("[unit occupancies GET] Error:", error);
    return NextResponse.json({ error: "Failed to fetch occupancies" }, { status: 500 });
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
    const result = await addUnitOccupancy(
      {
        ...body,
        society_id: societyId,
        unit_id: unitId,
      },
      identity.originalUser.id
    );

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("[unit occupancies POST] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

