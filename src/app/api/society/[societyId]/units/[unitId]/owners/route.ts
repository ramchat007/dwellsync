import { NextResponse } from "next/server";
import { requireSocietyAccess } from "@/lib/auth/server";
import { getUnitOwners, addUnitOwner, removeUnitOwner } from "@/lib/services/ownershipService";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ societyId: string; unitId: string }> }
) {
  try {
    const { societyId, unitId } = await params;
    await requireSocietyAccess(societyId);

    const owners = await getUnitOwners(unitId);
    return NextResponse.json({ success: true, data: owners });
  } catch (error) {
    console.error("[unit owners GET] Error:", error);
    return NextResponse.json({ error: "Failed to fetch owners" }, { status: 500 });
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
    const result = await addUnitOwner(
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
    console.error("[unit owners POST] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ societyId: string; unitId: string }> }
) {
  try {
    const { societyId } = await params;
    const { identity } = await requireSocietyAccess(societyId);

    const { searchParams } = new URL(req.url);
    const ownerId = searchParams.get("ownerId");

    if (!ownerId) {
      return NextResponse.json({ error: "Owner ID required" }, { status: 400 });
    }

    const result = await removeUnitOwner(ownerId, societyId, identity.originalUser.id);
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("[unit owners DELETE] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

