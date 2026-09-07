import { NextResponse } from "next/server";
import { requireSocietyAccess } from "@/lib/auth/server";
import { roleHasPermission, PERMISSIONS } from "@/lib/auth/permissions";
import { CreateCommitteeSchema } from "@/lib/validations/governance";
import { getCommittees, createCommittee } from "@/lib/governance/service";

export const dynamic = "force-dynamic";

export async function GET(
  req: Request,
  context: { params: Promise<{ societyId: string }> }
) {
  try {
    const { societyId } = await context.params;
    const { identity } = await requireSocietyAccess(societyId);

    if (!roleHasPermission(identity.currentRole, PERMISSIONS.COMMITTEE_VIEW)) {
      return NextResponse.json({ error: "Forbidden: Insufficient permissions" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const includeExpired = searchParams.get("includeExpired") === "true";

    const committees = await getCommittees(societyId, { includeExpired });
    return NextResponse.json({ success: true, committees });
  } catch (err: any) {
    console.error("[API/committees/GET] Exception:", err);
    return NextResponse.json(
      { error: err?.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}

export async function POST(
  req: Request,
  context: { params: Promise<{ societyId: string }> }
) {
  try {
    const { societyId } = await context.params;
    const { identity } = await requireSocietyAccess(societyId);

    if (!roleHasPermission(identity.currentRole, PERMISSIONS.COMMITTEE_MANAGE)) {
      return NextResponse.json({ error: "Forbidden: Insufficient permissions" }, { status: 403 });
    }

    const body = await req.json();
    const parsed = CreateCommitteeSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const result = await createCommittee({
      societyId,
      name: parsed.data.name,
      committeeType: parsed.data.committee_type,
      termStartDate: parsed.data.term_start_date,
      termEndDate: parsed.data.term_end_date,
      description: parsed.data.description,
      actorUserId: identity.originalUser.id,
      effectiveUserId: identity.effectiveUser.id,
    });

    if (result.error || !result.committee) {
      return NextResponse.json({ error: result.error || "Failed to create committee" }, { status: 400 });
    }

    return NextResponse.json({ success: true, committee: result.committee }, { status: 201 });
  } catch (err: any) {
    console.error("[API/committees/POST] Exception:", err);
    return NextResponse.json(
      { error: err?.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}
