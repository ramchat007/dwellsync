import { NextResponse } from "next/server";
import { requireSocietyAccess } from "@/lib/auth/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { recordAuditLog } from "@/lib/auth/audit";
import { roleHasPermission } from "@/lib/auth/permissions";
import { CreateAdvancedEventSchema, UpdateAdvancedEventSchema } from "@/lib/validations/events";
import { z } from "zod";

export const dynamic = "force-dynamic";

export async function GET(
  req: Request,
  context: { params: Promise<{ societyId: string }> }
) {
  try {
    const { societyId } = await context.params;
    const { identity } = await requireSocietyAccess(societyId);

    const adminClient = createAdminClient();

    const { data: events, error } = await adminClient
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

    if (error) {
      console.error("[API/society/events] Error fetching events:", error);
      return NextResponse.json({ error: "Failed to fetch events" }, { status: 500 });
    }

    if (!events || events.length === 0) {
      return NextResponse.json({ events: [] });
    }

    // Fetch RSVPs for these events to enrich with attendance metrics
    const eventIds = events.map((e) => e.id);
    const { data: rsvps } = await adminClient
      .from("event_rsvps")
      .select("id, event_id, user_id, response, guests_count")
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

    const enrichedEvents = events.map((ev) => ({
      ...ev,
      rsvp_summary: rsvpByEvent[ev.id] || { going: 0, not_going: 0, maybe: 0, total_attendees: 0 },
      user_rsvp: userRsvpByEvent[ev.id] || null,
    }));

    return NextResponse.json({ events: enrichedEvents });
  } catch (err: any) {
    console.error("[API/society/events] Exception:", err);
    return NextResponse.json(
      { error: err?.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}

export async function POST(
  req: Request,
  context: { params: Promise<{ societyId: string }> }
) {
  try {
    const { societyId } = await context.params;
    const { identity } = await requireSocietyAccess(societyId);

    if (!roleHasPermission(identity.currentRole, "events.manage")) {
      return NextResponse.json({ error: "Forbidden: requires events.manage permission" }, { status: 403 });
    }

    const body = await req.json();
    const parsed = CreateAdvancedEventSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const adminClient = createAdminClient();
    const { reminder_offsets, ...eventPayload } = parsed.data;

    const { data: event, error: insertError } = await adminClient
      .from("society_events")
      .insert({
        society_id: societyId,
        title: eventPayload.title,
        description: eventPayload.description,
        category: eventPayload.category,
        event_date: eventPayload.event_date,
        start_time: eventPayload.start_time || null,
        end_time: eventPayload.end_time || null,
        location: eventPayload.location,
        organizer_name: eventPayload.organizer_name || identity.effectiveUser.display_name || identity.effectiveUser.full_name,
        organizer_id: identity.effectiveUser.id,
        visibility: eventPayload.visibility,
        target_audience: eventPayload.target_audience,
        capacity: eventPayload.capacity || null,
        status: eventPayload.status || "PUBLISHED",
      })
      .select()
      .single();

    if (insertError) {
      console.error("[API/society/events] Error creating event:", insertError);
      return NextResponse.json({ error: "Failed to schedule event" }, { status: 500 });
    }

    // Schedule automated activity reminders if specified
    if (reminder_offsets && reminder_offsets.length > 0 && event) {
      const eventTime = event.start_time || "10:00";
      const startDateTime = new Date(`${event.event_date}T${eventTime}:00Z`);

      const reminderRows = reminder_offsets.map((offsetHours) => {
        const scheduledTime = new Date(startDateTime.getTime() - offsetHours * 60 * 60 * 1000);
        return {
          society_id: societyId,
          target_type: "EVENT",
          target_id: event.id,
          reminder_type: "HOURS_BEFORE_START",
          trigger_offset_hours: offsetHours,
          scheduled_at: scheduledTime.toISOString(),
          audience: "ALL_ELIGIBLE",
          status: "PENDING",
          created_by: identity.effectiveUser.id,
        };
      });

      await adminClient.from("activity_reminders").insert(reminderRows);
    }

    await recordAuditLog({
      actorUserId: identity.originalUser.id,
      effectiveUserId: identity.effectiveUser.id,
      societyId,
      action: "EVENT_CREATED",
      resourceType: "society_event",
      resourceId: event.id,
      metadata: {
        title: event.title,
        event_date: event.event_date,
        capacity: event.capacity,
        target_audience: event.target_audience,
        visibility: event.visibility,
      },
    });

    return NextResponse.json({ success: true, event }, { status: 201 });
  } catch (err: any) {
    console.error("[API/society/events] Exception:", err);
    return NextResponse.json(
      { error: err?.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}

const PatchEventPayloadSchema = UpdateAdvancedEventSchema.extend({
  id: z.string().uuid("Invalid event ID"),
});

export async function PATCH(
  req: Request,
  context: { params: Promise<{ societyId: string }> }
) {
  try {
    const { societyId } = await context.params;
    const { identity } = await requireSocietyAccess(societyId);

    if (!roleHasPermission(identity.currentRole, "events.manage")) {
      return NextResponse.json({ error: "Forbidden: requires events.manage permission" }, { status: 403 });
    }

    const body = await req.json();
    const parsed = PatchEventPayloadSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const adminClient = createAdminClient();
    const { id, reminder_offsets, ...updates } = parsed.data;

    const { data: updated, error: updateErr } = await adminClient
      .from("society_events")
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .eq("society_id", societyId)
      .select()
      .single();

    if (updateErr) {
      console.error("[API/society/events] Error updating event:", updateErr);
      return NextResponse.json({ error: "Failed to update event" }, { status: 500 });
    }

    const action = updates.status === "CANCELLED" ? "EVENT_CANCELLED" : "EVENT_UPDATED";

    await recordAuditLog({
      actorUserId: identity.originalUser.id,
      effectiveUserId: identity.effectiveUser.id,
      societyId,
      action,
      resourceType: "society_event",
      resourceId: id,
      metadata: updates,
    });

    return NextResponse.json({ success: true, event: updated });
  } catch (err: any) {
    console.error("[API/society/events] Exception:", err);
    return NextResponse.json(
      { error: err?.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}
