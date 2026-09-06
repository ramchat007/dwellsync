import { NextResponse } from "next/server";
import { getCurrentIdentity } from "@/lib/auth/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const identity = await getCurrentIdentity();
    if (!identity || !identity.isAuthenticated) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const societyId = identity.currentSociety?.id;
    if (!societyId) {
      return NextResponse.json({ events: [], meetings: [] });
    }

    const adminClient = createAdminClient();

    // 1. Fetch public events
    const { data: events, error: evErr } = await adminClient
      .from("society_events")
      .select(`
        *,
        organizer:profiles!society_events_organizer_id_fkey (
          id,
          full_name,
          display_name
        )
      `)
      .eq("society_id", societyId)
      .eq("visibility", "ALL_RESIDENTS")
      .order("event_date", { ascending: true });

    if (evErr) {
      console.error("[API/resident/events] Error fetching events:", evErr);
    }

    // 2. Fetch public meetings (AGM, EGM, GENERAL)
    const { data: meetings, error: mtErr } = await adminClient
      .from("society_meetings")
      .select(`
        *,
        organizer:profiles!society_meetings_organized_by_fkey (
          id,
          full_name,
          display_name
        ),
        minutes_document:documents!society_meetings_minutes_document_id_fkey (
          id,
          title,
          file_url
        )
      `)
      .eq("society_id", societyId)
      .in("meeting_type", ["AGM", "EGM", "GENERAL"])
      .order("scheduled_at", { ascending: true });

    if (mtErr) {
      console.error("[API/resident/events] Error fetching meetings:", mtErr);
    }

    return NextResponse.json({
      events: events || [],
      meetings: meetings || [],
    });
  } catch (err) {
    console.error("[API/resident/events] Exception:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
