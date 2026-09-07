import { NextResponse } from "next/server";
import { getCurrentIdentity } from "@/lib/auth/server";
import { getPublicResidentMeetings } from "@/lib/governance/meetingService";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const identity = await getCurrentIdentity();
    if (!identity || !identity.isAuthenticated) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const societyId = identity.currentSociety?.id;
    if (!societyId) {
      return NextResponse.json({ upcomingMeetings: [], pastPublishedMinutes: [] });
    }

    const data = await getPublicResidentMeetings(societyId);
    return NextResponse.json({ success: true, ...data });
  } catch (err: any) {
    console.error("[API/resident/meetings/GET] Exception:", err);
    return NextResponse.json(
      { error: err?.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}
