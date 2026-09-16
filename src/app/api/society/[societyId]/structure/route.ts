import { NextRequest, NextResponse } from "next/server";
import { getCurrentIdentity } from "@/lib/auth/server";
import { isAuthorizedSocietyAdmin } from "@/lib/auth/societyAdmin";
import { getSocietyStructure } from "@/lib/services/buildingService";
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
        { error: "Forbidden: Society administrator privileges required to view structure." },
        { status: 403 }
      );
    }

    const structure = await getSocietyStructure(societyId);
    return NextResponse.json({ success: true, data: structure });
  } catch (error: any) {
    console.error("[society structure GET] Error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to fetch society structure." },
      { status: 500 }
    );
  }
}
