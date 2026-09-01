import { NextResponse } from "next/server";
import { authService } from "@/lib/auth/providers/authService";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { identifier, method } = body;

    if (!identifier) {
      return NextResponse.json(
        { error: method === "mobile" ? "Mobile number is required." : "Email address is required." },
        { status: 400 }
      );
    }

    const ipAddress = req.headers.get("x-forwarded-for") || undefined;

    const result = await authService.requestOtp({
      identifier,
      method: method || "mobile",
      ipAddress,
    });

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json(result);
  } catch (err: any) {
    console.error("[OTP Send API] Error:", err);
    return NextResponse.json(
      { error: "Unable to send verification code. Please try again." },
      { status: 500 }
    );
  }
}

