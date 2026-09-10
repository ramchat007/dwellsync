import { NextResponse } from "next/server";
import { stopImpersonationAction, IMPERSONATION_COOKIE_NAME } from "@/lib/auth/impersonation";

export const dynamic = "force-dynamic";

export async function POST() {
  try {
    const result = await stopImpersonationAction();
    const response = NextResponse.json(result);
    response.cookies.delete(IMPERSONATION_COOKIE_NAME);
    return response;
  } catch (error) {
    console.error("[API/impersonate/exit] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
