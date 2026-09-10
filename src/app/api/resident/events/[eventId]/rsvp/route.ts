import { NextResponse } from "next/server";
import { getCurrentIdentity } from "@/lib/auth/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { recordAuditLog } from "@/lib/auth/audit";
import { roleHasPermission } from "@/lib/auth/permissions";
import { SubmitEventRsvpSchema } from "@/lib/validations/events";
import { z } from "zod";

export const dynamic = "force-dynamic";

export async function POST(
  req: Request,
  context: { params: Promise<{ eventId: string }> }
) {
  try {
    const identity = await getCurrentIdentity();
    if (!identity || !identity.isAuthenticated) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const societyId = identity.currentSociety?.id;
    if (!societyId) {
      return NextResponse.json({ error: "No active society context" }, { status: 400 });
    }

    if (!roleHasPermission(identity.currentRole, "events.rsvp")) {
      return NextResponse.json({ error: "Forbidden: requires events.rsvp permission" }, { status: 403 });
    }

    const { eventId } = await context.params;
    if (!z.string().uuid().safeParse(eventId).success) {
      return NextResponse.json({ error: "Invalid event ID" }, { status: 400 });
    }

    const body = await req.json();
    const parsed = SubmitEventRsvpSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 400 });
    }

    const adminClient = createAdminClient();

    // Fetch event
    const { data: event, error: eventErr } = await adminClient
      .from("society_events")
      .select("id, title, capacity, status, target_audience")
      .eq("id", eventId)
      .eq("society_id", societyId)
      .single();

    if (eventErr || !event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    if (["COMPLETED", "CANCELLED"].includes(event.status)) {
      return NextResponse.json({ error: `Cannot RSVP to an event that is ${event.status.toLowerCase()}` }, { status: 400 });
    }

    // Audience verification
    if (event.target_audience === "OWNERS_ONLY" && identity.currentRole !== "OWNER") {
      return NextResponse.json({ error: "This event is exclusively open to property owners" }, { status: 403 });
    }

    if (
      event.target_audience === "COMMITTEE_ONLY" &&
      (!identity.currentRole || !["COMMITTEE_MEMBER", "SECRETARY", "TREASURER"].includes(identity.currentRole as string))
    ) {
      return NextResponse.json({ error: "This event is exclusively open to committee members" }, { status: 403 });
    }

    // Capacity enforcement
    const requestedHeadcount = 1 + (parsed.data.guests_count || 0);

    if (parsed.data.response === "GOING" && event.capacity) {
      const { data: existingGoing } = await adminClient
        .from("event_rsvps")
        .select("guests_count")
        .eq("event_id", eventId)
        .eq("response", "GOING")
        .neq("user_id", identity.effectiveUser.id);

      const currentAttendees = (existingGoing || []).reduce(
        (sum, r) => sum + 1 + (r.guests_count || 0),
        0
      );

      const availableSpots = event.capacity - currentAttendees;
      if (requestedHeadcount > availableSpots) {
        return NextResponse.json(
          {
            error: availableSpots <= 0
              ? "Event is fully booked. No capacity remaining."
              : `Event capacity exceeded. Only ${availableSpots} spot${availableSpots === 1 ? "" : "s"} remaining.`,
          },
          { status: 400 }
        );
      }
    }

    // Upsert RSVP
    const { data: rsvp, error: rsvpErr } = await adminClient
      .from("event_rsvps")
      .upsert(
        {
          society_id: societyId,
          event_id: eventId,
          user_id: identity.effectiveUser.id,
          response: parsed.data.response,
          guests_count: parsed.data.guests_count || 0,
          notes: parsed.data.notes || null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "event_id,user_id" }
      )
      .select()
      .single();

    if (rsvpErr) {
      console.error("[API/resident/events/[eventId]/rsvp POST]", rsvpErr);
      return NextResponse.json({ error: "Failed to submit RSVP" }, { status: 500 });
    }

    await recordAuditLog({
      actorUserId: identity.originalUser.id,
      effectiveUserId: identity.effectiveUser.id,
      societyId,
      action: "EVENT_RSVP_SUBMITTED",
      resourceType: "event_rsvp",
      resourceId: rsvp.id,
      metadata: {
        event_id: eventId,
        event_title: event.title,
        response: parsed.data.response,
        guests_count: parsed.data.guests_count,
      },
    });

    return NextResponse.json({ success: true, rsvp });
  } catch (err: any) {
    console.error("[API/resident/events/[eventId]/rsvp POST]", err);
    return NextResponse.json({ error: err?.message || "Internal Server Error" }, { status: 500 });
  }
}
