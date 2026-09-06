import React from "react";
import { redirect } from "next/navigation";
import { getCurrentIdentity } from "@/lib/auth/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { AmenitiesClient } from "./AmenitiesClient";

export const dynamic = "force-dynamic";

export default async function ResidentAmenitiesPage() {
  const identity = await getCurrentIdentity();
  if (!identity || !identity.isAuthenticated) {
    redirect("/login");
  }

  const society = identity.currentSociety;
  const user = identity.effectiveUser;

  if (!society) {
    return (
      <div className="p-8 max-w-4xl mx-auto text-center space-y-4">
        <h2 className="text-xl font-bold text-slate-800 dark:text-slate-200">
          No Society Context Found
        </h2>
        <p className="text-sm text-slate-500">
          You must belong to an active housing society to view amenities.
        </p>
      </div>
    );
  }

  const adminClient = createAdminClient();

  // 1. Fetch available amenities
  const { data: amenities } = await adminClient
    .from("amenities")
    .select("*")
    .eq("society_id", society.id)
    .order("name", { ascending: true });

  // 2. Fetch resident's bookings
  const { data: myBookings } = await adminClient
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
    .eq("society_id", society.id)
    .eq("booked_by", user.id)
    .order("booking_date", { ascending: false });

  // 3. Fetch resident's units
  const { data: ownedUnits } = await adminClient
    .from("unit_owners")
    .select("unit:units(id, unit_number, building:buildings(name))")
    .eq("society_id", society.id)
    .eq("user_id", user.id)
    .eq("status", "ACTIVE");

  const { data: occupiedUnits } = await adminClient
    .from("unit_occupancies")
    .select("unit:units(id, unit_number, building:buildings(name))")
    .eq("society_id", society.id)
    .eq("user_id", user.id)
    .eq("status", "ACTIVE");

  const combinedUnitsMap = new Map<string, any>();
  ownedUnits?.forEach((ou: any) => {
    if (ou.unit) combinedUnitsMap.set(ou.unit.id, ou.unit);
  });
  occupiedUnits?.forEach((ou: any) => {
    if (ou.unit) combinedUnitsMap.set(ou.unit.id, ou.unit);
  });
  const residentUnits = Array.from(combinedUnitsMap.values());

  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      <AmenitiesClient
        initialAmenities={amenities || []}
        initialBookings={myBookings || []}
        residentUnits={residentUnits}
        society={society}
      />
    </div>
  );
}
