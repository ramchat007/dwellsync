import { NextResponse } from "next/server";
import { requireSocietyAccess } from "@/lib/auth/server";
import { createUnit, getUnits } from "@/lib/services/buildingService";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ societyId: string }> }
) {
  try {
    const { societyId } = await params;
    await requireSocietyAccess(societyId);

    const units = await getUnits(societyId);
    return NextResponse.json({ success: true, data: units });
  } catch (error) {
    console.error("[units GET] Error:", error);
    return NextResponse.json({ error: "Failed to fetch units" }, { status: 500 });
  }
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ societyId: string }> }
) {
  try {
    const { societyId } = await params;
    const { identity } = await requireSocietyAccess(societyId);

    const body = await req.json();
    const result = await createUnit(
      {
        ...body,
        society_id: societyId,
      },
      identity.originalUser.id
    );

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("[units POST] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

