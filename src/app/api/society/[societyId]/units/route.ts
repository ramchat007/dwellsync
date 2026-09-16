import { NextRequest, NextResponse } from "next/server";
import { getCurrentIdentity } from "@/lib/auth/server";
import { isAuthorizedSocietyAdmin } from "@/lib/auth/societyAdmin";
import { createUnit, getUnitsPaginated } from "@/lib/services/buildingService";
import { UnitStatus, UnitType } from "@/lib/types/database";
import { isValidUuid } from "@/lib/utils";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ societyId: string }> }
) {
  try {
    const { societyId } = await params;
    if (!isValidUuid(societyId)) {
      return NextResponse.json({ error: "Invalid society ID format." }, { status: 400 });
    }

    const identity = await getCurrentIdentity();
    if (!identity || !identity.isAuthenticated) {
      return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    }

    if (!isAuthorizedSocietyAdmin(identity, societyId)) {
      return NextResponse.json(
        { error: "Forbidden: Society administrator privileges required to access unit registry." },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "20", 10);
    const search = searchParams.get("search") || undefined;
    const buildingId = searchParams.get("buildingId") || undefined;
    const wingId = searchParams.get("wingId") || undefined;
    const floorId = searchParams.get("floorId") || undefined;
    const status = (searchParams.get("status") as UnitStatus) || undefined;
    const unitType = (searchParams.get("unitType") as UnitType) || undefined;

    const result = await getUnitsPaginated(societyId, {
      page,
      limit,
      search,
      buildingId,
      wingId,
      floorId,
      status,
      unitType,
    });

    return NextResponse.json({ success: true, ...result });
  } catch (error: any) {
    console.error("[units GET] Error:", error);
    return NextResponse.json({ error: "Failed to fetch units" }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ societyId: string }> }
) {
  try {
    const { societyId } = await params;
    if (!isValidUuid(societyId)) {
      return NextResponse.json({ error: "Invalid society ID format." }, { status: 400 });
    }

    const identity = await getCurrentIdentity();
    if (!identity || !identity.isAuthenticated) {
      return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    }

    if (!isAuthorizedSocietyAdmin(identity, societyId)) {
      return NextResponse.json(
        { error: "Forbidden: Society administrator privileges required to create units." },
        { status: 403 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const result = await createUnit(
      {
        ...body,
        society_id: societyId,
      },
      identity.effectiveUser.id
    );

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json(result, { status: 201 });
  } catch (error: any) {
    console.error("[units POST] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
