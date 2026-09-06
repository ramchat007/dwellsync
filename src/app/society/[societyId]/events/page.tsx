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
        initialEvents={events || []}
        initialMeetings={meetings || []}
        societyDocuments={documents || []}
        societyId={societyId}
      />
    </div>
  );
}
