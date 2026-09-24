import { NextResponse } from "next/server";
import { getSocietyPublicInfo } from "@/lib/services/onboardingVerificationService";

export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ societyId: string }> }
) {
  try {
    const { societyId } = await params;
    const result = await getSocietyPublicInfo(societyId);

    if (!result.success) {
      return NextResponse.json({ error: result.error || "Society not found." }, { status: 404 });
    }

    return NextResponse.json(result.data);
  } catch (err: any) {
    console.error("[onboard-info GET] Error:", err);
    return NextResponse.json(
      { error: err?.message || "Failed to load society public information." },
      { status: 500 }
    );
  }
}
