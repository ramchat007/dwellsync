import { NextResponse } from "next/server";
import { requireSocietyAccess } from "@/lib/auth/server";
import { roleHasPermission, PERMISSIONS } from "@/lib/auth/permissions";
import { RemoveMemberSchema } from "@/lib/validations/governance";
import { removeCommitteeMember } from "@/lib/governance/service";

export const dynamic = "force-dynamic";

export async function POST(
  req: Request,
  context: { params: Promise<{ societyId: string; committeeId: string; memberId: string }> }
) {
  try {
    const { societyId, committeeId, memberId } = await context.params;
    const { identity } = await requireSocietyAccess(societyId);

    if (!roleHasPermission(identity.currentRole, PERMISSIONS.COMMITTEE_MANAGE)) {
      return NextResponse.json({ error: "Forbidden: Insufficient permissions" }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const parsed = RemoveMemberSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const result = await removeCommitteeMember({
      societyId,
      committeeId,
      memberId,
      removedAt: parsed.data.removed_at,
      reason: parsed.data.reason || undefined,
      actorUserId: identity.originalUser.id,
      effectiveUserId: identity.effectiveUser.id,
    });

    if (!result.success) {
      return NextResponse.json({ error: result.error || "Failed to remove member" }, { status: 400 });
    }

    return NextResponse.json({ success: true, message: "Member successfully removed from committee" });
  } catch (err: any) {
    console.error("[API/committee/members/remove/POST] Exception:", err);
    return NextResponse.json(
      { error: err?.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}
