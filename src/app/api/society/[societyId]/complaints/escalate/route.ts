import { NextResponse } from "next/server";
import { requireSocietyAccess } from "@/lib/auth/server";
import { roleHasPermission } from "@/lib/auth/permissions";
import { evaluateAndEscalateComplaints } from "@/lib/services/escalationService";

export const dynamic = "force-dynamic";

export async function POST(
  req: Request,
  context: { params: Promise<{ societyId: string }> }
) {
  try {
    const { societyId } = await context.params;
    const { identity } = await requireSocietyAccess(societyId);

    if (!roleHasPermission(identity.currentRole, "complaints.manage")) {
      return NextResponse.json({ error: "Forbidden: requires complaints.manage permission" }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const complaintId = body?.complaintId || undefined;

    const result = await evaluateAndEscalateComplaints({
      societyId,
      actorId: identity.effectiveUser.id,
      complaintId,
    });

    return NextResponse.json({
      success: true,
      message: `Checked ${result.totalChecked} complaints, escalated ${result.escalated.length}.`,
      escalated: result.escalated,
      totalChecked: result.totalChecked,
    });
  } catch (err: any) {
    console.error("[API/complaints/escalate POST]", err);
    return NextResponse.json({ error: err?.message || "Internal Server Error" }, { status: 500 });
  }
}

