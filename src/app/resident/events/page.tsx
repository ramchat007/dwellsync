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

  // 1. Fetch public events
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
    .eq("society_id", society.id)
    .eq("visibility", "ALL_RESIDENTS")
    .order("event_date", { ascending: true });

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
        initialEvents={events || []}
        initialMeetings={meetings || []}
        society={society}
      />
    </div>
  );
}
