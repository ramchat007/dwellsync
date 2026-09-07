import { NextResponse } from "next/server";
import { requireSocietyAccess } from "@/lib/auth/server";
import { roleHasPermission, PERMISSIONS } from "@/lib/auth/permissions";
import { AppointCommitteeMemberSchema } from "@/lib/validations/governance";
import { appointCommitteeMember } from "@/lib/governance/service";

export const dynamic = "force-dynamic";

export async function POST(
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
    const parsed = AppointCommitteeMemberSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const result = await appointCommitteeMember({
      societyId,
      committeeId,
      userId: parsed.data.user_id,
      designation: parsed.data.designation,
      appointedAt: parsed.data.appointed_at,
      termEndDate: parsed.data.term_end_date,
      votingRights: parsed.data.voting_rights,
      notes: parsed.data.notes,
      actorUserId: identity.originalUser.id,
      effectiveUserId: identity.effectiveUser.id,
    });

    if (result.error || !result.member) {
      return NextResponse.json({ error: result.error || "Failed to appoint member" }, { status: 400 });
    }

    return NextResponse.json({ success: true, member: result.member }, { status: 201 });
  } catch (err: any) {
    console.error("[API/committee/members/POST] Exception:", err);
    return NextResponse.json(
      { error: err?.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}
