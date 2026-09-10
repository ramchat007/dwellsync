import React from "react";
import { requireSocietyAccess } from "@/lib/auth/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { EventsAdminClient } from "./EventsAdminClient";

export const dynamic = "force-dynamic";

export default async function SocietyEventsPage({
  params,
}: {
  params: Promise<{ societyId: string }>;
}) {
  const { societyId } = await params;
  await requireSocietyAccess(societyId);

  const adminClient = createAdminClient();

  const { data: events } = await adminClient
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
    .order("event_date", { ascending: false });

  // Enrich with RSVPs
  let enrichedEvents = events || [];
  if (events && events.length > 0) {
    const eventIds = events.map((e) => e.id);
    const { data: rsvps } = await adminClient
      .from("event_rsvps")
      .select("id, event_id, response, guests_count")
      .in("event_id", eventIds);

    const rsvpByEvent: Record<string, { going: number; not_going: number; maybe: number; total_attendees: number }> = {};
    (rsvps || []).forEach((r) => {
      if (!rsvpByEvent[r.event_id]) {
        rsvpByEvent[r.event_id] = { going: 0, not_going: 0, maybe: 0, total_attendees: 0 };
      }
      if (r.response === "GOING") {
        rsvpByEvent[r.event_id].going += 1;
        rsvpByEvent[r.event_id].total_attendees += 1 + (r.guests_count || 0);
      } else if (r.response === "NOT_GOING") {
        rsvpByEvent[r.event_id].not_going += 1;
      } else if (r.response === "MAYBE") {
        rsvpByEvent[r.event_id].maybe += 1;
      }
    });

    enrichedEvents = events.map((ev) => ({
      ...ev,
      rsvp_summary: rsvpByEvent[ev.id] || { going: 0, not_going: 0, maybe: 0, total_attendees: 0 },
    }));
  }

  const { data: meetings } = await adminClient
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
    .order("scheduled_at", { ascending: false });

  const { data: documents } = await adminClient
    .from("documents")
    .select("id, title")
    .eq("society_id", societyId)
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <EventsAdminClient
        initialEvents={enrichedEvents}
        initialMeetings={meetings || []}
        societyDocuments={documents || []}
        societyId={societyId}
      />
    </div>
  );
}
