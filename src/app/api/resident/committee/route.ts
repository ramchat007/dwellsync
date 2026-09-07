import { NextResponse } from "next/server";
import { getCurrentIdentity } from "@/lib/auth/server";
import { getPublicCommitteeRoster } from "@/lib/governance/service";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const identity = await getCurrentIdentity();
    if (!identity || !identity.isAuthenticated) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const societyId = identity.currentSociety?.id;
    if (!societyId) {
      return NextResponse.json({ committee: null, roster: [] });
    }

    const data = await getPublicCommitteeRoster(societyId);
    return NextResponse.json({ success: true, ...data });
  } catch (err: any) {
    console.error("[API/resident/committee/GET] Exception:", err);
    return NextResponse.json(
      { error: err?.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}
