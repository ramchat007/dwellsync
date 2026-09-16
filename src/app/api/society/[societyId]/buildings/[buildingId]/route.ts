import { NextRequest, NextResponse } from "next/server";
import { getCurrentIdentity } from "@/lib/auth/server";
import { isAuthorizedSocietyAdmin } from "@/lib/auth/societyAdmin";
import {
  getBuilding,
  updateBuilding,
  deleteBuilding,
} from "@/lib/services/buildingService";
import { isValidUuid } from "@/lib/utils";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ societyId: string; buildingId: string }> }
) {
  try {
    const { societyId, buildingId } = await params;
    if (!isValidUuid(societyId) || !isValidUuid(buildingId)) {
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

    const result = await getBuilding(buildingId, societyId);
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 404 });
    }

    return NextResponse.json(result);
  } catch (error: any) {
    console.error("[building GET] Error:", error);
    return NextResponse.json({ error: "Failed to fetch building." }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ societyId: string; buildingId: string }> }
) {
  try {
    const { societyId, buildingId } = await params;
    if (!isValidUuid(societyId) || !isValidUuid(buildingId)) {
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

    const body = await req.json().catch(() => ({}));
    const result = await updateBuilding(buildingId, societyId, body, identity.effectiveUser.id);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json(result);
  } catch (error: any) {
    console.error("[building PATCH] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ societyId: string; buildingId: string }> }
) {
  try {
    const { societyId, buildingId } = await params;
    if (!isValidUuid(societyId) || !isValidUuid(buildingId)) {
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

    const result = await deleteBuilding(buildingId, societyId, identity.effectiveUser.id);
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json(result);
  } catch (error: any) {
    console.error("[building DELETE] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
