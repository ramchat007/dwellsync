import { NextResponse } from "next/server";
import { getCurrentIdentity } from "@/lib/auth/server";
import { createSocietyOnboarding } from "@/lib/services/onboardingService";

export async function POST(req: Request) {
  try {
    const identity = await getCurrentIdentity();
    if (!identity || !identity.isSuperAdmin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const body = await req.json();
    const result = await createSocietyOnboarding(body, identity.originalUser.id);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("[onboard API POST] Server error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

