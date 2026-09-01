import { NextResponse } from "next/server";
import { stopImpersonationAction } from "@/lib/auth/impersonation";

export async function POST() {
  try {
    const result = await stopImpersonationAction();
    return NextResponse.json(result);
  } catch (error) {
    console.error("[API/impersonate/exit] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
