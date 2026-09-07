import { NextResponse } from "next/server";
import { requireSocietyAccess } from "@/lib/auth/server";
import { roleHasPermission, PERMISSIONS } from "@/lib/auth/permissions";
import { UpdateCommitteeMemberSchema } from "@/lib/validations/governance";
import { updateMemberDesignation } from "@/lib/governance/service";

export const dynamic = "force-dynamic";

export async function PATCH(
  req: Request,
  context: { params: Promise<{ societyId: string; committeeId: string; memberId: string }> }
) {
  try {
    const { societyId, committeeId, memberId } = await context.params;
    const { identity } = await requireSocietyAccess(societyId);

    if (!roleHasPermission(identity.currentRole, PERMISSIONS.COMMITTEE_MANAGE)) {
      return NextResponse.json({ error: "Forbidden: Insufficient permissions" }, { status: 403 });
    }

    const body = await req.json();
    const parsed = UpdateCommitteeMemberSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const result = await updateMemberDesignation({
      societyId,
      committeeId,
      memberId,
      designation: parsed.data.designation,
      votingRights: parsed.data.voting_rights,
      notes: parsed.data.notes,
      actorUserId: identity.originalUser.id,
      effectiveUserId: identity.effectiveUser.id,
    });

    if (result.error || !result.member) {
      return NextResponse.json({ error: result.error || "Failed to update member designation" }, { status: 400 });
    }

    return NextResponse.json({ success: true, member: result.member });
  } catch (err: any) {
    console.error("[API/committee/members/PATCH] Exception:", err);
    return NextResponse.json(
      { error: err?.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}
