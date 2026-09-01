import { NextResponse } from "next/server";
import { authService } from "@/lib/auth/providers/authService";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { identifier, otp, method } = body;

    if (!identifier || !otp) {
      return NextResponse.json(
        { error: "Both identifier and 6-digit OTP are required." },
        { status: 400 }
      );
    }

    if (otp.length !== 6) {
      return NextResponse.json(
        { error: "Verification code must be exactly 6 digits." },
        { status: 400 }
      );
    }

    const result = await authService.verifyOtpAndResolve({
      identifier,
      otp,
      method: method || "mobile",
    });

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      context: result.context,
    });
  } catch (err: any) {
    console.error("[OTP Verify API] Error:", err);
    return NextResponse.json(
      { error: "Verification failed. Please try again." },
      { status: 500 }
    );
  }
}

