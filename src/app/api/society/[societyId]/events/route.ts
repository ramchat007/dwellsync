import { NextResponse } from "next/server";
import { requireSocietyAccess } from "@/lib/auth/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { recordAuditLog } from "@/lib/auth/audit";
import { CreateEventSchema } from "@/lib/validations/operations";
import { z } from "zod";

export const dynamic = "force-dynamic";

export async function GET(
  req: Request,
  context: { params: Promise<{ societyId: string }> }
) {
  try {
    const { societyId } = await context.params;
    await requireSocietyAccess(societyId);

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

    return NextResponse.json({ events: events || [] });
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

    const body = await req.json();
    const parsed = CreateEventSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const adminClient = createAdminClient();

    const { data: event, error: insertError } = await adminClient
      .from("society_events")
      .insert({
        society_id: societyId,
        title: parsed.data.title,
        description: parsed.data.description,
        category: parsed.data.category,
        event_date: parsed.data.event_date,
        start_time: parsed.data.start_time || null,
        end_time: parsed.data.end_time || null,
        location: parsed.data.location,
        organizer_name: parsed.data.organizer_name || identity.effectiveUser.display_name || identity.effectiveUser.full_name,
        organizer_id: identity.effectiveUser.id,
        visibility: parsed.data.visibility,
        status: "UPCOMING",
      })
      .select()
      .single();

    if (insertError) {
      console.error("[API/society/events] Error creating event:", insertError);
      return NextResponse.json({ error: "Failed to schedule event" }, { status: 500 });
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
        visibility: event.visibility,
      },
    });

    return NextResponse.json({ success: true, event });
  } catch (err: any) {
    console.error("[API/society/events] Exception:", err);
    return NextResponse.json(
      { error: err?.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}

const PatchEventSchema = CreateEventSchema.partial().extend({
  id: z.string().uuid("Invalid event ID"),
  status: z.enum(["UPCOMING", "COMPLETED", "CANCELLED"]).optional(),
});

export async function PATCH(
  req: Request,
  context: { params: Promise<{ societyId: string }> }
) {
  try {
    const { societyId } = await context.params;
    const { identity } = await requireSocietyAccess(societyId);

    const body = await req.json();
    const parsed = PatchEventSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const adminClient = createAdminClient();
    const { id, ...updates } = parsed.data;

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
