import React from "react";
import { redirect } from "next/navigation";
import { getCurrentIdentity } from "@/lib/auth/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { EventsClient } from "./EventsClient";

export const dynamic = "force-dynamic";

export default async function ResidentEventsPage() {
  const identity = await getCurrentIdentity();
  if (!identity || !identity.isAuthenticated) {
    redirect("/login");
  }

  const society = identity.currentSociety;
  if (!society) {
    return (
      <div className="p-8 max-w-4xl mx-auto text-center space-y-4">
        <h2 className="text-xl font-bold text-slate-800 dark:text-slate-200">
          No Society Context Found
        </h2>
      </div>
    );
  }

  const adminClient = createAdminClient();

  // 1. Fetch eligible events
  let eventsQuery = adminClient
    .from("society_events")
    .select(`
      *,
      organizer:profiles!society_events_organizer_id_fkey (
        id,
        full_name,
        display_name
      )
    `)
    .eq("society_id", society.id)
    .in("status", ["PUBLISHED", "UPCOMING", "COMPLETED"])
    .order("event_date", { ascending: true });

  if (identity.currentRole === "OWNER") {
    eventsQuery = eventsQuery.in("target_audience", ["ALL_RESIDENTS", "OWNERS_ONLY"]);
  } else if (identity.currentRole && ["COMMITTEE_MEMBER", "SECRETARY", "TREASURER"].includes(identity.currentRole as string)) {
    eventsQuery = eventsQuery.in("target_audience", ["ALL_RESIDENTS", "COMMITTEE_ONLY"]);
  } else {
    eventsQuery = eventsQuery.eq("target_audience", "ALL_RESIDENTS");
  }

  const { data: events } = await eventsQuery;

  // Enrich events with RSVPs
  let enrichedEvents = events || [];
  if (events && events.length > 0) {
    const eventIds = events.map((e) => e.id);
    const { data: rsvps } = await adminClient
      .from("event_rsvps")
      .select("id, event_id, user_id, response, guests_count, notes")
      .in("event_id", eventIds);

    const rsvpByEvent: Record<string, { going: number; not_going: number; maybe: number; total_attendees: number }> = {};
    const userRsvpByEvent: Record<string, any> = {};

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

      if (r.user_id === identity.effectiveUser.id) {
        userRsvpByEvent[r.event_id] = r;
      }
    });

    enrichedEvents = events.map((ev) => ({
      ...ev,
      rsvp_summary: rsvpByEvent[ev.id] || { going: 0, not_going: 0, maybe: 0, total_attendees: 0 },
      user_rsvp: userRsvpByEvent[ev.id] || null,
    }));
  }

  // 2. Fetch public meetings (AGM, EGM, GENERAL)
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
    .eq("society_id", society.id)
    .in("meeting_type", ["AGM", "EGM", "GENERAL"])
    .order("scheduled_at", { ascending: true });

  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      <EventsClient
        initialEvents={enrichedEvents}
        initialMeetings={meetings || []}
        society={society}
      />
    </div>
  );
}
