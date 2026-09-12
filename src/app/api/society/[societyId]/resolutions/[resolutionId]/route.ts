import { NextRequest, NextResponse } from "next/server";
import { requireSocietyAccess } from "@/lib/auth/server";
import { getResolution, updateResolution, deleteResolution } from "@/lib/governance/resolutionService";
import { UpdateResolutionSchema } from "@/lib/validations/governance";

export const dynamic = "force-dynamic";

const MANAGEMENT_ROLES = ["SUPER_ADMIN", "SOCIETY_ADMIN", "SECRETARY", "MANAGER", "TREASURER"];

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ societyId: string; resolutionId: string }> }
) {
  try {
    const { societyId, resolutionId } = await params;
    await requireSocietyAccess(societyId);

    const { resolution, error } = await getResolution(societyId, resolutionId);
    if (error || !resolution) {
      return NextResponse.json({ error: error || "Resolution not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, resolution });
  } catch (err: any) {
    console.error("[resolution GET] Exception:", err);
    return NextResponse.json({ error: "Unauthorized or server error" }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ societyId: string; resolutionId: string }> }
) {
  try {
    const { societyId, resolutionId } = await params;
    const { identity } = await requireSocietyAccess(societyId);

    if (!(identity.currentRole && MANAGEMENT_ROLES.includes(identity.currentRole)) && !identity.isSuperAdmin) {
      return NextResponse.json(
        { error: "Forbidden: Management authorization required to modify resolutions." },
        { status: 403 }
      );
    }

    const body = await req.json();
    const parseResult = UpdateResolutionSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        { error: "Invalid resolution update format", details: parseResult.error.flatten() },
        { status: 400 }
      );
    }

    const { resolution, error } = await updateResolution({
      societyId,
      resolutionId,
      ...parseResult.data,
      actorUserId: identity.effectiveUser.id,
      effectiveUserId: identity.effectiveUser.id,
    });

    if (error || !resolution) {
      return NextResponse.json({ error: error || "Failed to update resolution" }, { status: 500 });
    }

    return NextResponse.json({ success: true, resolution });
  } catch (err: any) {
    console.error("[resolution PATCH] Exception:", err);
    return NextResponse.json({ error: "Unauthorized or server error" }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ societyId: string; resolutionId: string }> }
) {
  try {
    const { societyId, resolutionId } = await params;
    const { identity } = await requireSocietyAccess(societyId);

    if (!(identity.currentRole && ["SUPER_ADMIN", "SOCIETY_ADMIN", "SECRETARY"].includes(identity.currentRole)) && !identity.isSuperAdmin) {
      return NextResponse.json(
        { error: "Forbidden: Administrator authorization required to delete resolutions." },
        { status: 403 }
      );
    }

    const { success, error } = await deleteResolution(
      societyId,
      resolutionId,
      identity.effectiveUser.id,
      identity.effectiveUser.id
    );

    if (!success) {
      return NextResponse.json({ error: error || "Failed to delete resolution" }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: "Resolution deleted successfully." });
  } catch (err: any) {
    console.error("[resolution DELETE] Exception:", err);
    return NextResponse.json({ error: "Unauthorized or server error" }, { status: 500 });
  }
}
