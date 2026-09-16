import { NextRequest, NextResponse } from "next/server";
import { getCurrentIdentity } from "@/lib/auth/server";
import { isAuthorizedSocietyAdmin } from "@/lib/auth/societyAdmin";
import { createFloor, getFloors } from "@/lib/services/buildingService";
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
        { error: "Forbidden: Society administrator privileges required." },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(req.url);
    const buildingId = searchParams.get("buildingId") || undefined;
    const wingId = searchParams.get("wingId") || undefined;

    const floors = await getFloors(societyId, buildingId, wingId);
    return NextResponse.json({ success: true, data: floors });
  } catch (error: any) {
    console.error("[floors GET] Error:", error);
    return NextResponse.json({ error: "Failed to fetch floors" }, { status: 500 });
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
        { error: "Forbidden: Society administrator privileges required to create floors." },
        { status: 403 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const result = await createFloor(
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
    console.error("[floors POST] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
