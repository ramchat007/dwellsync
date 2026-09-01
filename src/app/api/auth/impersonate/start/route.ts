import { NextResponse } from "next/server";
import { startImpersonationAction } from "@/lib/auth/impersonation";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { targetUserId, targetSocietyId, targetRoleId, reason } = body;

    if (!targetUserId) {
      return NextResponse.json({ error: "targetUserId is required" }, { status: 400 });
    }

    const result = await startImpersonationAction({
      targetUserId,
      targetSocietyId,
      targetRoleId,
      reason,
    });

    if (!result.success) {
      return NextResponse.json({ error: result.error || "Failed to start impersonation" }, { status: 403 });
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("[API/impersonate/start] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
