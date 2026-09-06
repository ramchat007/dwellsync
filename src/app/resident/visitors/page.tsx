import React from "react";
import { redirect } from "next/navigation";
import { getCurrentIdentity } from "@/lib/auth/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { ResidentVisitorsClient } from "./ResidentVisitorsClient";

export const dynamic = "force-dynamic";

export default async function ResidentVisitorsPage() {
  const identity = await getCurrentIdentity();
  if (!identity || !identity.isAuthenticated) {
    redirect("/login");
  }

  const society = identity.currentSociety;
  const user = identity.effectiveUser;
  const adminClient = createAdminClient();

  let userUnits: any[] = [];
  let initialVisitors: any[] = [];

  if (society) {
    const societyId = society.id;
    const userId = user.id;

    // 1. Fetch resident's authorized units with hierarchy
    const { data: owned } = await adminClient
      .from("unit_owners")
      .select(`
        unit:units (
          id,
          unit_number,
          building:buildings (name, code),
          wing:wings (name, code),
          floor:floors (name, floor_number)
        )
      `)
      .eq("society_id", societyId)
      .eq("user_id", userId)
      .eq("status", "ACTIVE");

    const { data: occupied } = await adminClient
      .from("unit_occupancies")
      .select(`
        unit:units (
          id,
          unit_number,
          building:buildings (name, code),
          wing:wings (name, code),
          floor:floors (name, floor_number)
        )
      `)
      .eq("society_id", societyId)
      .eq("user_id", userId)
      .eq("status", "ACTIVE");

    const rawUnits = [
      ...(owned || []).map((o: any) => o.unit),
      ...(occupied || []).map((occ: any) => occ.unit),
    ].filter(Boolean);

    // Deduplicate units by ID
    const seen = new Set<string>();
    userUnits = rawUnits.filter((u) => {
      if (seen.has(u.id)) return false;
      seen.add(u.id);
      return true;
    });

    // Fallback: If no explicit unit_owners / occupancies, check society_memberships
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
            id,
            unit_number,
            building:buildings (name, code),
            wing:wings (name, code),
            floor:floors (name, floor_number)
          `)
          .eq("society_id", societyId)
          .eq("unit_number", membership.unit_number)
          .maybeSingle();

        if (fallbackUnit) {
          userUnits.push(fallbackUnit);
        }
      }
    }

    const authorizedUnitIds = userUnits.map((u) => u.id);

    // 2. Fetch existing visitors
    if (authorizedUnitIds.length > 0 || identity.isSuperAdmin) {
      let query = adminClient
        .from("visitors")
        .select(`
          *,
          unit:units (
            id,
            unit_number,
            building:buildings (name, code),
            wing:wings (name, code),
            floor:floors (name, floor_number)
          ),
          check_in_guard:profiles!visitors_check_in_by_fkey (
            id,
            full_name,
            display_name
          )
        `)
        .eq("society_id", societyId)
        .order("created_at", { ascending: false });

      if (!identity.isSuperAdmin) {
        query = query.in("unit_id", authorizedUnitIds);
      }

      const { data: visitors } = await query;
      initialVisitors = visitors || [];
    }
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
      <ResidentVisitorsClient
        society={society}
        units={userUnits}
        initialVisitors={initialVisitors}
      />
    </div>
  );
}
