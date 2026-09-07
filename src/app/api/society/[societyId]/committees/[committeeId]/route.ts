import { NextResponse } from "next/server";
import { requireSocietyAccess } from "@/lib/auth/server";
import { roleHasPermission, PERMISSIONS } from "@/lib/auth/permissions";
import { UpdateCommitteeSchema } from "@/lib/validations/governance";
import { getCommitteeDetail, updateCommittee } from "@/lib/governance/service";

export const dynamic = "force-dynamic";

export async function GET(
  req: Request,
  context: { params: Promise<{ societyId: string; committeeId: string }> }
) {
  try {
    const { societyId, committeeId } = await context.params;
    const { identity } = await requireSocietyAccess(societyId);

    if (!roleHasPermission(identity.currentRole, PERMISSIONS.COMMITTEE_VIEW)) {
      return NextResponse.json({ error: "Forbidden: Insufficient permissions" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const includeHistory = searchParams.get("includeHistory") === "true";

    const committee = await getCommitteeDetail(societyId, committeeId, { includeHistory });
    if (!committee) {
      return NextResponse.json({ error: "Committee not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, committee });
  } catch (err: any) {
    console.error("[API/committee/detail/GET] Exception:", err);
    return NextResponse.json(
      { error: err?.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: Request,
  context: { params: Promise<{ societyId: string; committeeId: string }> }
) {
  try {
    const { societyId, committeeId } = await context.params;
    const { identity } = await requireSocietyAccess(societyId);

    if (!roleHasPermission(identity.currentRole, PERMISSIONS.COMMITTEE_MANAGE)) {
      return NextResponse.json({ error: "Forbidden: Insufficient permissions" }, { status: 403 });
    }

    const body = await req.json();
    const parsed = UpdateCommitteeSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const result = await updateCommittee({
      societyId,
      committeeId,
      name: parsed.data.name,
      termStartDate: parsed.data.term_start_date,
      termEndDate: parsed.data.term_end_date,
      status: parsed.data.status,
      description: parsed.data.description,
      actorUserId: identity.originalUser.id,
      effectiveUserId: identity.effectiveUser.id,
    });

    if (result.error || !result.committee) {
      return NextResponse.json({ error: result.error || "Failed to update committee" }, { status: 400 });
    }

    return NextResponse.json({ success: true, committee: result.committee });
  } catch (err: any) {
    console.error("[API/committee/detail/PATCH] Exception:", err);
    return NextResponse.json(
      { error: err?.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}
