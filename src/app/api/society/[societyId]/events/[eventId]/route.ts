import { NextResponse } from "next/server";
import { requireSocietyAccess } from "@/lib/auth/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { recordAuditLog } from "@/lib/auth/audit";
import { roleHasPermission } from "@/lib/auth/permissions";
import { UpdateAdvancedEventSchema } from "@/lib/validations/events";
import { z } from "zod";

export const dynamic = "force-dynamic";

export async function GET(
  req: Request,
  context: { params: Promise<{ societyId: string; eventId: string }> }
) {
  try {
    const { societyId, eventId } = await context.params;
    const { identity } = await requireSocietyAccess(societyId);

    if (!z.string().uuid().safeParse(eventId).success) {
      return NextResponse.json({ error: "Invalid event ID" }, { status: 400 });
    }

    const adminClient = createAdminClient();

    const { data: event, error } = await adminClient
      .from("society_events")
      .select(`
        *,
        organizer:profiles!society_events_organizer_id_fkey (
          id,
          full_name,
          display_name
        )
      `)
      .eq("id", eventId)
      .eq("society_id", societyId)
      .single();

    if (error || !event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    // Check audience access if resident
    if (
      !roleHasPermission(identity.currentRole, "events.manage") &&
      event.target_audience === "COMMITTEE_ONLY" &&
      (!identity.currentRole || !["COMMITTEE_MEMBER", "SECRETARY", "TREASURER"].includes(identity.currentRole as string))
    ) {
      return NextResponse.json({ error: "Forbidden: committee access only" }, { status: 403 });
    }

    // Fetch RSVPs and attendees
    const { data: rsvps } = await adminClient
      .from("event_rsvps")
      .select(`
        *,
        user:profiles!event_rsvps_user_id_fkey (
          id,
          full_name,
          display_name
        )
      `)
      .eq("event_id", eventId)
      .order("created_at", { ascending: false });

    let going = 0;
    let not_going = 0;
    let maybe = 0;
    let total_attendees = 0;
    let user_rsvp: any = null;

    (rsvps || []).forEach((r) => {
      if (r.response === "GOING") {
        going += 1;
        total_attendees += 1 + (r.guests_count || 0);
      } else if (r.response === "NOT_GOING") {
        not_going += 1;
      } else if (r.response === "MAYBE") {
        maybe += 1;
      }

      if (r.user_id === identity.effectiveUser.id) {
        user_rsvp = r;
      }
    });

    // Fetch any scheduled reminders for this event
    const { data: reminders } = await adminClient
      .from("activity_reminders")
      .select("*")
      .eq("target_type", "EVENT")
      .eq("target_id", eventId)
      .order("scheduled_at", { ascending: true });

    return NextResponse.json({
      event: {
        ...event,
        rsvp_summary: { going, not_going, maybe, total_attendees },
        user_rsvp,
        rsvps: rsvps || [],
        reminders: reminders || [],
      },
    });
  } catch (err: any) {
    console.error("[API/society/events/[eventId] GET]", err);
    return NextResponse.json({ error: err?.message || "Internal Server Error" }, { status: 500 });
  }
}

export async function PATCH(
  req: Request,
  context: { params: Promise<{ societyId: string; eventId: string }> }
) {
  try {
    const { societyId, eventId } = await context.params;
    const { identity } = await requireSocietyAccess(societyId);

    if (!roleHasPermission(identity.currentRole, "events.manage")) {
      return NextResponse.json({ error: "Forbidden: requires events.manage permission" }, { status: 403 });
    }

    if (!z.string().uuid().safeParse(eventId).success) {
      return NextResponse.json({ error: "Invalid event ID" }, { status: 400 });
    }

    const body = await req.json();
    const parsed = UpdateAdvancedEventSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 400 });
    }

    const adminClient = createAdminClient();

    const { data: existing } = await adminClient
      .from("society_events")
      .select("id, status, title")
      .eq("id", eventId)
      .eq("society_id", societyId)
      .single();

    if (!existing) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    const { reminder_offsets, ...updates } = parsed.data;

    const { data: updated, error: updateErr } = await adminClient
      .from("society_events")
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq("id", eventId)
      .eq("society_id", societyId)
      .select()
      .single();

    if (updateErr) {
      return NextResponse.json({ error: "Failed to update event" }, { status: 500 });
    }

    await recordAuditLog({
      actorUserId: identity.originalUser.id,
      effectiveUserId: identity.effectiveUser.id,
      societyId,
      action: updates.status === "CANCELLED" ? "EVENT_CANCELLED" : "EVENT_UPDATED",
      resourceType: "society_event",
      resourceId: eventId,
      metadata: { previous_status: existing.status, updates },
    });

    return NextResponse.json({ success: true, event: updated });
  } catch (err: any) {
    console.error("[API/society/events/[eventId] PATCH]", err);
    return NextResponse.json({ error: err?.message || "Internal Server Error" }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  context: { params: Promise<{ societyId: string; eventId: string }> }
) {
  try {
    const { societyId, eventId } = await context.params;
    const { identity } = await requireSocietyAccess(societyId);

    if (!roleHasPermission(identity.currentRole, "events.manage")) {
      return NextResponse.json({ error: "Forbidden: requires events.manage permission" }, { status: 403 });
    }

    if (!z.string().uuid().safeParse(eventId).success) {
      return NextResponse.json({ error: "Invalid event ID" }, { status: 400 });
    }

    const adminClient = createAdminClient();

    // Soft delete by setting status to CANCELLED
    const { data: updated, error } = await adminClient
      .from("society_events")
      .update({
        status: "CANCELLED",
        updated_at: new Date().toISOString(),
      })
      .eq("id", eventId)
      .eq("society_id", societyId)
      .select()
      .single();

    if (error || !updated) {
      return NextResponse.json({ error: "Failed to cancel event" }, { status: 500 });
    }

    // Cancel pending reminders for this event
    await adminClient
      .from("activity_reminders")
      .update({ status: "CANCELLED", updated_at: new Date().toISOString() })
      .eq("target_type", "EVENT")
      .eq("target_id", eventId)
      .eq("status", "PENDING");

    await recordAuditLog({
      actorUserId: identity.originalUser.id,
      effectiveUserId: identity.effectiveUser.id,
      societyId,
      action: "EVENT_CANCELLED",
      resourceType: "society_event",
      resourceId: eventId,
      metadata: { cancelled_by: identity.effectiveUser.id },
    });

    return NextResponse.json({ success: true, message: "Event cancelled successfully" });
  } catch (err: any) {
    console.error("[API/society/events/[eventId] DELETE]", err);
    return NextResponse.json({ error: err?.message || "Internal Server Error" }, { status: 500 });
  }
}
