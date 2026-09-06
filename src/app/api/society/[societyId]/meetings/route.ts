import { NextResponse } from "next/server";
import { requireSocietyAccess } from "@/lib/auth/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { recordAuditLog } from "@/lib/auth/audit";
import { CreateMeetingSchema } from "@/lib/validations/operations";
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

    const { data: meetings, error } = await adminClient
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

    if (error) {
      console.error("[API/society/meetings] Error fetching meetings:", error);
      return NextResponse.json({ error: "Failed to fetch meetings" }, { status: 500 });
    }

    return NextResponse.json({ meetings: meetings || [] });
  } catch (err: any) {
    console.error("[API/society/meetings] Exception:", err);
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
    const parsed = CreateMeetingSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const adminClient = createAdminClient();

    const { data: meeting, error: insertError } = await adminClient
      .from("society_meetings")
      .insert({
        society_id: societyId,
        title: parsed.data.title,
        agenda: parsed.data.agenda || null,
        meeting_type: parsed.data.meeting_type,
        location_type: parsed.data.location_type,
        location_details: parsed.data.location_details || null,
        meeting_link: parsed.data.meeting_link || null,
        scheduled_at: parsed.data.scheduled_at,
        duration_minutes: parsed.data.duration_minutes,
        status: "SCHEDULED",
        organized_by: identity.effectiveUser.id,
      })
      .select()
      .single();

    if (insertError) {
      console.error("[API/society/meetings] Error scheduling meeting:", insertError);
      return NextResponse.json({ error: "Failed to schedule meeting" }, { status: 500 });
    }

    await recordAuditLog({
      actorUserId: identity.originalUser.id,
      effectiveUserId: identity.effectiveUser.id,
      societyId,
      action: "MEETING_SCHEDULED",
      resourceType: "society_meeting",
      resourceId: meeting.id,
      metadata: {
        title: meeting.title,
        meeting_type: meeting.meeting_type,
        scheduled_at: meeting.scheduled_at,
      },
    });

    return NextResponse.json({ success: true, meeting });
  } catch (err: any) {
    console.error("[API/society/meetings] Exception:", err);
    return NextResponse.json(
      { error: err?.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}

const PatchMeetingSchema = CreateMeetingSchema.partial().extend({
  id: z.string().uuid("Invalid meeting ID"),
  status: z.enum(["SCHEDULED", "IN_PROGRESS", "COMPLETED", "CANCELLED"]).optional(),
  minutes_document_id: z.string().uuid().optional().nullable().or(z.literal("")),
});

export async function PATCH(
  req: Request,
  context: { params: Promise<{ societyId: string }> }
) {
  try {
    const { societyId } = await context.params;
    const { identity } = await requireSocietyAccess(societyId);

    const body = await req.json();
    const parsed = PatchMeetingSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const adminClient = createAdminClient();
    const { id, minutes_document_id, ...updates } = parsed.data;

    const payload: Record<string, any> = {
      ...updates,
      updated_at: new Date().toISOString(),
    };

    if (minutes_document_id !== undefined) {
      payload.minutes_document_id = minutes_document_id || null;
    }

    const { data: updated, error: updateErr } = await adminClient
      .from("society_meetings")
      .update(payload)
      .eq("id", id)
      .eq("society_id", societyId)
      .select()
      .single();

    if (updateErr) {
      console.error("[API/society/meetings] Error updating meeting:", updateErr);
      return NextResponse.json({ error: "Failed to update meeting" }, { status: 500 });
    }

    const action = updates.status === "COMPLETED" ? "MEETING_COMPLETED" : "MEETING_UPDATED";

    await recordAuditLog({
      actorUserId: identity.originalUser.id,
      effectiveUserId: identity.effectiveUser.id,
      societyId,
      action,
      resourceType: "society_meeting",
      resourceId: id,
      metadata: payload,
    });

    return NextResponse.json({ success: true, meeting: updated });
  } catch (err: any) {
    console.error("[API/society/meetings] Exception:", err);
    return NextResponse.json(
      { error: err?.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}
