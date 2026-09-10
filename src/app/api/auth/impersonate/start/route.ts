import { NextResponse } from "next/server";
import { startImpersonationAction, IMPERSONATION_COOKIE_NAME } from "@/lib/auth/impersonation";

export const dynamic = "force-dynamic";

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

    const response = NextResponse.json(result);

    if (result.sessionToken) {
      response.cookies.set(IMPERSONATION_COOKIE_NAME, result.sessionToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 60 * 60 * 4,
      });

      if (result.targetSocietyId) {
        response.cookies.set("DwellSyncHub_active_society", result.targetSocietyId, {
          path: "/",
          httpOnly: false,
          sameSite: "lax",
          maxAge: 60 * 60 * 4,
        });
      }
    }

    return response;
  } catch (error) {
    console.error("[API/impersonate/start] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
