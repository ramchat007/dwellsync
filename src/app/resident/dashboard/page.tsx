import React from "react";
import { redirect } from "next/navigation";
import { getCurrentIdentity } from "@/lib/auth/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { Unit } from "@/lib/types/database";
import { ResidentDashboardClient } from "./ResidentDashboardClient";

export const dynamic = "force-dynamic";

export default async function ResidentDashboardPage() {
  const identity = await getCurrentIdentity();
  if (!identity || !identity.isAuthenticated) {
    redirect("/login");
  }

  const adminClient = createAdminClient();
  let userUnits: any[] = [];
  let householdMembers: any[] = [];
  let notices: any[] = [];

  if (identity.currentSociety) {
    const societyId = identity.currentSociety.id;
    const userId = identity.effectiveUser.id;

    // 1. Check owned units with complete structural hierarchy
    const { data: ownedUnits } = await adminClient
      .from("unit_owners")
      .select(`
        *,
        unit:units (
          *,
          building:buildings (id, name, code),
          wing:wings (id, name, code),
          floor:floors (id, name, floor_number)
        )
      `)
      .eq("society_id", societyId)
      .eq("user_id", userId)
      .eq("status", "ACTIVE");

    if (ownedUnits && ownedUnits.length > 0) {
      ownedUnits.forEach((o: any) => {
        if (o.unit) {
          userUnits.push({
            ...o.unit,
            ownership: {
              ownership_percentage: o.ownership_percentage,
              ownership_type: o.ownership_type,
              start_date: o.start_date,
              is_primary: o.is_primary,
            },
          });
        }
      });
    }

    // 2. Check occupied units with complete structural hierarchy
    const { data: occupiedUnits } = await adminClient
      .from("unit_occupancies")
      .select(`
        *,
        unit:units (
          *,
          building:buildings (id, name, code),
          wing:wings (id, name, code),
          floor:floors (id, name, floor_number)
        )
      `)
      .eq("society_id", societyId)
      .eq("user_id", userId)
      .eq("status", "ACTIVE");

    if (occupiedUnits && occupiedUnits.length > 0) {
      occupiedUnits.forEach((occ: any) => {
        if (occ.unit) {
          const existingIdx = userUnits.findIndex((u) => u.id === occ.unit.id);
          const occDetails = {
            occupancy_type: occ.occupancy_type,
            lease_start: occ.lease_start,
            lease_end: occ.lease_end,
            is_primary_tenant: occ.is_primary_tenant,
          };
          if (existingIdx >= 0) {
            userUnits[existingIdx].occupancy = occDetails;
          } else {
            userUnits.push({
              ...occ.unit,
              occupancy: occDetails,
            });
          }
        }
      });
    }

    // 3. Fallback: Check unit_number in society_memberships
    if (userUnits.length === 0) {
      const { data: membership } = await adminClient
        .from("society_memberships")
        .select("unit_number")
        .eq("society_id", societyId)
        .eq("user_id", userId)
        .maybeSingle();

      if (membership?.unit_number) {
        const { data: fallbackUnit } = await adminClient
          .from("units")
          .select(`
            *,
            building:buildings (id, name, code),
            wing:wings (id, name, code),
            floor:floors (id, name, floor_number)
          `)
          .eq("society_id", societyId)
          .eq("unit_number", membership.unit_number)
          .maybeSingle();

        if (fallbackUnit) {
          userUnits.push(fallbackUnit);
        }
      }
    }

    // 4. Fetch household family members
    const { data: fData } = await adminClient
      .from("family_members")
      .select("*")
      .eq("society_id", societyId)
      .eq("primary_member_id", userId)
      .order("created_at", { ascending: true });

    householdMembers = fData || [];

    // 5. Fetch recent notices
    const { data: nData } = await adminClient
      .from("notices")
      .select("*")
      .eq("society_id", societyId)
      .eq("status", "PUBLISHED")
      .order("published_at", { ascending: false })
      .limit(3);

    notices = nData || [];
  }

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto">
      <ResidentDashboardClient
        profile={identity.effectiveUser}
        society={identity.currentSociety}
        role={identity.currentRole || "RESIDENT"}
        units={userUnits}
        householdMembers={householdMembers}
        notices={notices}
      />
    </div>
  );
}

