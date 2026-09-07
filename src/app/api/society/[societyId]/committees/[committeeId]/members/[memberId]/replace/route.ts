import { NextResponse } from "next/server";
import { requireSocietyAccess } from "@/lib/auth/server";
import { roleHasPermission, PERMISSIONS } from "@/lib/auth/permissions";
import { ReplaceMemberSchema } from "@/lib/validations/governance";
import { replaceCommitteeMember } from "@/lib/governance/service";

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

    const body = await req.json();
    const parsed = ReplaceMemberSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const result = await replaceCommitteeMember({
      societyId,
      committeeId,
      outgoingMemberId: memberId,
      incomingUserId: parsed.data.incoming_user_id,
      designation: parsed.data.designation,
      replacementDate: parsed.data.replacement_date,
      notes: parsed.data.notes || undefined,
      actorUserId: identity.originalUser.id,
      effectiveUserId: identity.effectiveUser.id,
    });

    if (result.error || !result.newMember) {
      return NextResponse.json({ error: result.error || "Failed to replace member" }, { status: 400 });
    }

    return NextResponse.json({ success: true, newMember: result.newMember }, { status: 201 });
  } catch (err: any) {
    console.error("[API/committee/members/replace/POST] Exception:", err);
    return NextResponse.json(
      { error: err?.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}
