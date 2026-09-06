import { NextResponse } from "next/server";
import { requireSocietyAccess } from "@/lib/auth/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { recordAuditLog } from "@/lib/auth/audit";
import { CreateAmenitySchema, UpdateAmenitySchema } from "@/lib/validations/operations";
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

    const { data: amenities, error: amenErr } = await adminClient
      .from("amenities")
      .select("*")
      .eq("society_id", societyId)
      .order("created_at", { ascending: true });

    if (amenErr) {
      console.error("[API/society/amenities] Error fetching amenities:", amenErr);
      return NextResponse.json({ error: "Failed to fetch amenities" }, { status: 500 });
    }

    // Fetch upcoming bookings for society
    const { data: bookings, error: bookErr } = await adminClient
      .from("amenity_bookings")
      .select(`
        *,
        amenity:amenities (id, name, category),
        unit:units (id, unit_number, building:buildings(name)),
        booker:profiles!amenity_bookings_booked_by_fkey (id, full_name, display_name, phone)
      `)
      .eq("society_id", societyId)
      .order("booking_date", { ascending: false });

    return NextResponse.json({
      amenities: amenities || [],
      bookings: bookings || [],
    });
  } catch (err: any) {
    console.error("[API/society/amenities] Exception:", err);
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
    const parsed = CreateAmenitySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const adminClient = createAdminClient();

    const { data: amenity, error: insertError } = await adminClient
      .from("amenities")
      .insert({
        society_id: societyId,
        name: parsed.data.name,
        description: parsed.data.description || null,
        category: parsed.data.category,
        capacity: parsed.data.capacity || null,
        operating_hours_start: parsed.data.operating_hours_start,
        operating_hours_end: parsed.data.operating_hours_end,
        slot_duration_minutes: parsed.data.slot_duration_minutes,
        rules: parsed.data.rules || null,
        status: parsed.data.status,
      })
      .select()
      .single();

    if (insertError) {
      console.error("[API/society/amenities] Error creating amenity:", insertError);
      return NextResponse.json({ error: "Failed to create amenity" }, { status: 500 });
    }

    await recordAuditLog({
      actorUserId: identity.originalUser.id,
      effectiveUserId: identity.effectiveUser.id,
      societyId,
      action: "AMENITY_CREATED",
      resourceType: "amenity",
      resourceId: amenity.id,
      metadata: {
        name: amenity.name,
        category: amenity.category,
      },
    });

    return NextResponse.json({ success: true, amenity });
  } catch (err: any) {
    console.error("[API/society/amenities] Exception:", err);
    return NextResponse.json(
      { error: err?.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}

const PatchAmenityBodySchema = UpdateAmenitySchema.extend({
  id: z.string().uuid("Invalid amenity ID"),
});

export async function PATCH(
  req: Request,
  context: { params: Promise<{ societyId: string }> }
) {
  try {
    const { societyId } = await context.params;
    const { identity } = await requireSocietyAccess(societyId);

    const body = await req.json();
    const parsed = PatchAmenityBodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const adminClient = createAdminClient();
    const { id, ...updates } = parsed.data;

    const { data: updated, error: updateErr } = await adminClient
      .from("amenities")
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .eq("society_id", societyId)
      .select()
      .single();

    if (updateErr) {
      console.error("[API/society/amenities] Error updating amenity:", updateErr);
      return NextResponse.json({ error: "Failed to update amenity" }, { status: 500 });
    }

    await recordAuditLog({
      actorUserId: identity.originalUser.id,
      effectiveUserId: identity.effectiveUser.id,
      societyId,
      action: "AMENITY_UPDATED",
      resourceType: "amenity",
      resourceId: id,
      metadata: updates,
    });

    return NextResponse.json({ success: true, amenity: updated });
  } catch (err: any) {
    console.error("[API/society/amenities] Exception:", err);
    return NextResponse.json(
      { error: err?.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}
