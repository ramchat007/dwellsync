import { NextResponse } from "next/server";
import { requireSocietyAccess } from "@/lib/auth/server";
import {
  approveAccessRequest,
  rejectAccessRequest,
} from "@/lib/services/onboardingVerificationService";

export const dynamic = "force-dynamic";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ societyId: string; requestId: string }> }
) {
  try {
    const { societyId, requestId } = await params;
    const { identity } = await requireSocietyAccess(societyId);

    const body = await req.json();
    const action = body.action as "APPROVE" | "REJECT";
    const notes = body.notes as string | undefined;

    if (action === "APPROVE") {
      const result = await approveAccessRequest(requestId, identity.originalUser.id);
      return NextResponse.json(result);
    } else if (action === "REJECT") {
      const result = await rejectAccessRequest(requestId, identity.originalUser.id, notes);
      return NextResponse.json(result);
    } else {
      return NextResponse.json({ error: "Invalid action. Expected APPROVE or REJECT." }, { status: 400 });
    }
  } catch (error: any) {
    console.error("[access-requests action POST] Error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to process access request." },
      { status: 500 }
    );
  }
}
