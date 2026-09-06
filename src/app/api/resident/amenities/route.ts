import { NextResponse } from "next/server";
import { getCurrentIdentity } from "@/lib/auth/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { recordAuditLog } from "@/lib/auth/audit";
import { BookAmenitySchema } from "@/lib/validations/operations";
import { z } from "zod";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const identity = await getCurrentIdentity();
    if (!identity || !identity.isAuthenticated) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const societyId = identity.currentSociety?.id;
    if (!societyId) {
      return NextResponse.json({ amenities: [], myBookings: [] });
    }

    const userId = identity.effectiveUser.id;
    const adminClient = createAdminClient();

    // 1. Fetch available society amenities
    const { data: amenities, error: amenErr } = await adminClient
      .from("amenities")
      .select("*")
      .eq("society_id", societyId)
      .order("name", { ascending: true });

    if (amenErr) {
      console.error("[API/resident/amenities] Error fetching amenities:", amenErr);
      return NextResponse.json({ error: "Failed to fetch amenities" }, { status: 500 });
    }

    // 2. Fetch resident's bookings
    const { data: myBookings, error: bookErr } = await adminClient
      .from("amenity_bookings")
      .select(`
        *,
        amenity:amenities (
          id,
          name,
          category,
          capacity,
          rules
        ),
        unit:units (
          id,
          unit_number,
          building:buildings (name)
        )
      `)
      .eq("society_id", societyId)
      .eq("booked_by", userId)
      .order("booking_date", { ascending: false });

    if (bookErr) {
      console.error("[API/resident/amenities] Error fetching bookings:", bookErr);
    }

    return NextResponse.json({
      amenities: amenities || [],
      myBookings: myBookings || [],
    });
  } catch (err) {
    console.error("[API/resident/amenities] Exception:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const identity = await getCurrentIdentity();
    if (!identity || !identity.isAuthenticated) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const societyId = identity.currentSociety?.id;
    if (!societyId) {
      return NextResponse.json({ error: "No active society context" }, { status: 400 });
    }

    const body = await req.json();
    const parsed = BookAmenitySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { amenity_id, booking_date, start_time, end_time, notes } = parsed.data;
    const userId = identity.effectiveUser.id;
    const adminClient = createAdminClient();

    // Verify amenity belongs to society and is AVAILABLE
    const { data: amenity, error: amenErr } = await adminClient
      .from("amenities")
      .select("*")
      .eq("id", amenity_id)
      .eq("society_id", societyId)
      .single();

    if (amenErr || !amenity) {
      return NextResponse.json({ error: "Amenity not found in this society" }, { status: 404 });
    }

    if (amenity.status !== "AVAILABLE") {
      return NextResponse.json(
        { error: `This amenity is currently ${amenity.status.toLowerCase()} and cannot be booked.` },
        { status: 400 }
      );
    }

    // Conflict detection: check for overlapping CONFIRMED booking for same amenity & date
    const { data: existingBookings } = await adminClient
      .from("amenity_bookings")
      .select("id, start_time, end_time")
      .eq("amenity_id", amenity_id)
      .eq("booking_date", booking_date)
      .eq("status", "CONFIRMED");

    if (existingBookings && existingBookings.length > 0) {
      const hasConflict = existingBookings.some((b) => {
        // Overlap if (start_time < b.end_time) and (end_time > b.start_time)
        return start_time < b.end_time && end_time > b.start_time;
      });

      if (hasConflict) {
        return NextResponse.json(
          { error: "This time slot is already reserved. Please select a different time or date." },
          { status: 409 }
        );
      }
    }

    // Auto-resolve unit_id if not passed
    let targetUnitId = parsed.data.unit_id || null;
    if (!targetUnitId) {
      const { data: unitOcc } = await adminClient
        .from("unit_occupancies")
        .select("unit_id")
        .eq("society_id", societyId)
        .eq("user_id", userId)
        .eq("status", "ACTIVE")
        .limit(1)
        .maybeSingle();

      if (unitOcc?.unit_id) {
        targetUnitId = unitOcc.unit_id;
      } else {
        const { data: unitOwn } = await adminClient
          .from("unit_owners")
          .select("unit_id")
          .eq("society_id", societyId)
          .eq("user_id", userId)
          .eq("status", "ACTIVE")
          .limit(1)
          .maybeSingle();

        if (unitOwn?.unit_id) {
          targetUnitId = unitOwn.unit_id;
        }
      }
    }

    const { data: booking, error: bookErr } = await adminClient
      .from("amenity_bookings")
      .insert({
        society_id: societyId,
        amenity_id,
        unit_id: targetUnitId,
        booked_by: userId,
        booking_date,
        start_time,
        end_time,
        status: "CONFIRMED",
        notes: notes || null,
      })
      .select(`
        *,
        amenity:amenities (
          id,
          name,
          category
        )
      `)
      .single();

    if (bookErr) {
      console.error("[API/resident/amenities] Error creating booking:", bookErr);
      return NextResponse.json({ error: "Failed to reserve amenity slot" }, { status: 500 });
    }

    await recordAuditLog({
      actorUserId: identity.originalUser.id,
      effectiveUserId: userId,
      societyId,
      action: "AMENITY_BOOKED",
      resourceType: "amenity_booking",
      resourceId: booking.id,
      metadata: {
        amenity_id,
        amenity_name: amenity.name,
        booking_date,
        start_time,
        end_time,
      },
    });

    return NextResponse.json({ success: true, booking });
  } catch (err) {
    console.error("[API/resident/amenities] Exception:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

const CancelBookingSchema = z.object({
  bookingId: z.string().uuid("Invalid booking ID"),
});

export async function PATCH(req: Request) {
  try {
    const identity = await getCurrentIdentity();
    if (!identity || !identity.isAuthenticated) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const societyId = identity.currentSociety?.id;
    if (!societyId) {
      return NextResponse.json({ error: "No active society context" }, { status: 400 });
    }

    const body = await req.json();
    const parsed = CancelBookingSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const userId = identity.effectiveUser.id;
    const adminClient = createAdminClient();

    // Verify booking belongs to user
    const { data: booking, error: fetchErr } = await adminClient
      .from("amenity_bookings")
      .select("*")
      .eq("id", parsed.data.bookingId)
      .eq("society_id", societyId)
      .eq("booked_by", userId)
      .single();

    if (fetchErr || !booking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    const { data: updated, error: updateErr } = await adminClient
      .from("amenity_bookings")
      .update({
        status: "CANCELLED",
        updated_at: new Date().toISOString(),
      })
      .eq("id", booking.id)
      .select()
      .single();

    if (updateErr) {
      return NextResponse.json({ error: "Failed to cancel booking" }, { status: 500 });
    }

    await recordAuditLog({
      actorUserId: identity.originalUser.id,
      effectiveUserId: userId,
      societyId,
      action: "AMENITY_BOOKING_CANCELLED",
      resourceType: "amenity_booking",
      resourceId: booking.id,
      metadata: {
        amenity_id: booking.amenity_id,
        booking_date: booking.booking_date,
      },
    });

    return NextResponse.json({ success: true, booking: updated });
  } catch (err) {
    console.error("[API/resident/amenities] Exception:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
