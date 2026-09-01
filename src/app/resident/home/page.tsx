import React from "react";
import { redirect } from "next/navigation";
import { getCurrentIdentity } from "@/lib/auth/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { MyHomeClient } from "./MyHomeClient";

export const dynamic = "force-dynamic";

export default async function ResidentHomePage() {
  const identity = await getCurrentIdentity();
  if (!identity || !identity.isAuthenticated) {
    redirect("/login");
  }

  const societyId = identity.currentSociety?.id;
  const adminClient = createAdminClient();
  let units: any[] = [];

  if (societyId) {
    // 1. Fetch units with building, wing, floor, occupancy, and ownership details
    const { data: occupancies } = await adminClient
      .from("unit_occupancies")
      .select(`
        *,
        unit:units (
          *,
          building:buildings (name, code),
          wing:wings (name, code),
          floor:floors (name, floor_number)
        )
      `)
      .eq("society_id", societyId)
      .eq("user_id", identity.effectiveUser.id)
      .eq("status", "ACTIVE");

    if (occupancies && occupancies.length > 0) {
      units = occupancies.map((occ: any) => ({
        ...occ.unit,
        occupancy: occ,
      }));
    }

    // 2. Fetch owned units
    const { data: ownerships } = await adminClient
      .from("unit_ownerships")
      .select(`
        *,
        unit:units (
          *,
          building:buildings (name, code),
          wing:wings (name, code),
          floor:floors (name, floor_number)
        )
      `)
      .eq("society_id", societyId)
      .eq("user_id", identity.effectiveUser.id)
      .eq("status", "ACTIVE");

    if (ownerships && ownerships.length > 0) {
      ownerships.forEach((own: any) => {
        const existingIdx = units.findIndex((u) => u.id === own.unit.id);
        if (existingIdx >= 0) {
          units[existingIdx].ownership = own;
        } else {
          units.push({
            ...own.unit,
            ownership: own,
          });
        }
      });
    }

    // 3. Fallback: membership unit_number
    if (units.length === 0) {
      const { data: membership } = await adminClient
        .from("society_memberships")
        .select("unit_number")
        .eq("society_id", societyId)
        .eq("user_id", identity.effectiveUser.id)
        .maybeSingle();

      if (membership?.unit_number) {
        const { data: fallbackUnit } = await adminClient
          .from("units")
          .select(`
            *,
            building:buildings (name, code),
            wing:wings (name, code),
            floor:floors (name, floor_number)
          `)
          .eq("society_id", societyId)
          .eq("unit_number", membership.unit_number)
          .maybeSingle();

        if (fallbackUnit) {
          units.push(fallbackUnit);
        }
      }
    }
  }

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto">
      <MyHomeClient
        profile={identity.effectiveUser}
        society={identity.currentSociety}
        units={units}
      />
    </div>
  );
}

