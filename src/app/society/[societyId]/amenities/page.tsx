import React from "react";
import { requireSocietyAccess } from "@/lib/auth/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { AmenitiesAdminClient } from "./AmenitiesAdminClient";

export const dynamic = "force-dynamic";

export default async function SocietyAmenitiesPage({
  params,
}: {
  params: Promise<{ societyId: string }>;
}) {
  const { societyId } = await params;
  await requireSocietyAccess(societyId);

  const adminClient = createAdminClient();

  const { data: amenities } = await adminClient
    .from("amenities")
    .select("*")
    .eq("society_id", societyId)
    .order("name", { ascending: true });

  const { data: bookings } = await adminClient
    .from("amenity_bookings")
    .select(`
      *,
      amenity:amenities (id, name, category),
      unit:units (id, unit_number, building:buildings(name)),
      booker:profiles!amenity_bookings_booked_by_fkey (id, full_name, display_name, phone)
    `)
    .eq("society_id", societyId)
    .order("booking_date", { ascending: false });

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <AmenitiesAdminClient
        initialAmenities={amenities || []}
        initialBookings={bookings || []}
        societyId={societyId}
      />
    </div>
  );
}
