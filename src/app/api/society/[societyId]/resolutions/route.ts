import { NextRequest, NextResponse } from "next/server";
import { requireSocietyAccess } from "@/lib/auth/server";
import { listResolutions, createResolution } from "@/lib/governance/resolutionService";
import { CreateResolutionSchema } from "@/lib/validations/governance";
import { ResolutionStatus, ResolutionType } from "@/lib/types/database";

export const dynamic = "force-dynamic";

const MANAGEMENT_ROLES = ["SUPER_ADMIN", "SOCIETY_ADMIN", "SECRETARY", "MANAGER", "TREASURER"];

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ societyId: string }> }
) {
  try {
    const { societyId } = await params;
    await requireSocietyAccess(societyId);

    const url = new URL(req.url);
    const meetingId = url.searchParams.get("meetingId") || undefined;
    const status = (url.searchParams.get("status") as ResolutionStatus) || undefined;
    const type = (url.searchParams.get("type") as ResolutionType) || undefined;
    const limit = url.searchParams.get("limit") ? parseInt(url.searchParams.get("limit")!) : undefined;

    const { resolutions, error } = await listResolutions(societyId, {
      meetingId,
      status,
      type,
      limit,
    });

    if (error) {
      return NextResponse.json({ error }, { status: 500 });
    }

    return NextResponse.json({ success: true, resolutions });
  } catch (err: any) {
    console.error("[resolutions GET] Exception:", err);
    return NextResponse.json({ error: "Unauthorized or server error" }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ societyId: string }> }
) {
  try {
    const { societyId } = await params;
    const { identity } = await requireSocietyAccess(societyId);

    if (!(identity.currentRole && MANAGEMENT_ROLES.includes(identity.currentRole)) && !identity.isSuperAdmin) {
      return NextResponse.json(
        { error: "Forbidden: Management authorization required to create governance resolutions." },
        { status: 403 }
      );
    }

    const body = await req.json();
    const parseResult = CreateResolutionSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        { error: "Invalid resolution format", details: parseResult.error.flatten() },
        { status: 400 }
      );
    }

    const { resolution, error } = await createResolution({
      societyId,
      ...parseResult.data,
      actorUserId: identity.effectiveUser.id,
      effectiveUserId: identity.effectiveUser.id,
    });

    if (error || !resolution) {
      return NextResponse.json({ error: error || "Failed to create resolution" }, { status: 500 });
    }

    return NextResponse.json({ success: true, resolution }, { status: 201 });
  } catch (err: any) {
    console.error("[resolutions POST] Exception:", err);
    return NextResponse.json({ error: "Unauthorized or server error" }, { status: 500 });
  }
}
