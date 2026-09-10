import { NextResponse } from "next/server";
import { requireSocietyAccess } from "@/lib/auth/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { recordAuditLog } from "@/lib/auth/audit";
import { roleHasPermission } from "@/lib/auth/permissions";
import { SubmitEventRsvpSchema } from "@/lib/validations/events";
import { z } from "zod";

export const dynamic = "force-dynamic";

export async function GET(
  req: Request,
  context: { params: Promise<{ societyId: string; eventId: string }> }
) {
  try {
    const { societyId, eventId } = await context.params;
    const { identity } = await requireSocietyAccess(societyId);

    if (!roleHasPermission(identity.currentRole, "events.view")) {
      return NextResponse.json({ error: "Forbidden: requires events.view permission" }, { status: 403 });
    }

    if (!z.string().uuid().safeParse(eventId).success) {
      return NextResponse.json({ error: "Invalid event ID" }, { status: 400 });
    }

    const adminClient = createAdminClient();

    // Verify event belongs to this society
    const { data: event, error: eventErr } = await adminClient
      .from("society_events")
      .select("id, title, capacity, status")
      .eq("id", eventId)
      .eq("society_id", societyId)
      .single();

    if (eventErr || !event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    const { data: rsvps, error } = await adminClient
      .from("event_rsvps")
      .select(`
        *,
        user:profiles!event_rsvps_user_id_fkey (
          id,
          full_name,
          display_name,
          email
        )
      `)
      .eq("event_id", eventId)
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: "Failed to fetch RSVPs" }, { status: 500 });
    }

    let going = 0;
    let not_going = 0;
    let maybe = 0;
    let total_attendees = 0;

    (rsvps || []).forEach((r) => {
      if (r.response === "GOING") {
        going += 1;
        total_attendees += 1 + (r.guests_count || 0);
      } else if (r.response === "NOT_GOING") {
        not_going += 1;
      } else if (r.response === "MAYBE") {
        maybe += 1;
      }
    });

    return NextResponse.json({
      summary: {
        going,
        not_going,
        maybe,
        total_attendees,
        capacity: event.capacity,
        spots_remaining: event.capacity ? Math.max(0, event.capacity - total_attendees) : null,
      },
      rsvps: rsvps || [],
    });
  } catch (err: any) {
    console.error("[API/society/events/[eventId]/rsvp GET]", err);
    return NextResponse.json({ error: err?.message || "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(
  req: Request,
  context: { params: Promise<{ societyId: string; eventId: string }> }
) {
  try {
    const { societyId, eventId } = await context.params;
    const { identity } = await requireSocietyAccess(societyId);

    if (!roleHasPermission(identity.currentRole, "events.rsvp")) {
      return NextResponse.json({ error: "Forbidden: requires events.rsvp permission" }, { status: 403 });
    }

    if (!z.string().uuid().safeParse(eventId).success) {
      return NextResponse.json({ error: "Invalid event ID" }, { status: 400 });
    }

    const body = await req.json();
    const parsed = SubmitEventRsvpSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 400 });
    }

    const adminClient = createAdminClient();

    // Verify event exists, belongs to society, and is active
    const { data: event, error: eventErr } = await adminClient
      .from("society_events")
      .select("id, title, capacity, status, target_audience, event_date")
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
    if (event.target_audience === "OWNERS_ONLY" && identity.currentRole !== "OWNER" && !roleHasPermission(identity.currentRole, "events.manage")) {
      return NextResponse.json({ error: "This event is exclusively open to property owners" }, { status: 403 });
    }

    if (event.target_audience === "COMMITTEE_ONLY" && (!identity.currentRole || !["COMMITTEE_MEMBER", "SECRETARY", "TREASURER"].includes(identity.currentRole as string)) && !roleHasPermission(identity.currentRole, "events.manage")) {
      return NextResponse.json({ error: "This event is exclusively open to committee members" }, { status: 403 });
    }

    // Capacity enforcement if response is GOING
    const requestedHeadcount = 1 + (parsed.data.guests_count || 0);

    if (parsed.data.response === "GOING" && event.capacity) {
      // Calculate current attendees excluding this user's prior RSVP if any
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
      console.error("[API/society/events/[eventId]/rsvp POST]", rsvpErr);
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
    console.error("[API/society/events/[eventId]/rsvp POST]", err);
    return NextResponse.json({ error: err?.message || "Internal Server Error" }, { status: 500 });
  }
}
