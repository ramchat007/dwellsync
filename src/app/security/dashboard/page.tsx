import React from "react";
import { redirect } from "next/navigation";
import { getCurrentIdentity } from "@/lib/auth/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { SecurityDashboardClient } from "./SecurityDashboardClient";

export const dynamic = "force-dynamic";

export default async function SecurityDashboardPage() {
  const identity = await getCurrentIdentity();
  if (!identity || !identity.isAuthenticated) {
    redirect("/login");
  }

  const society = identity.currentSociety;
  const adminClient = createAdminClient();

  let societyUnits: any[] = [];
  let visitors: any[] = [];

  if (society) {
    // 1. Fetch society units for walk-in destination lookup
    const { data: units } = await adminClient
      .from("units")
      .select(`
        id,
        unit_number,
        building:buildings (name, code),
        wing:wings (name, code)
      `)
      .eq("society_id", society.id)
      .order("unit_number", { ascending: true })
      .limit(150);

    societyUnits = units || [];

    // 2. Fetch visitor queue for security checkpoint
    const { data: vList } = await adminClient
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
        creator:profiles!visitors_created_by_fkey (
          id,
          full_name,
          display_name,
          phone
        ),
        check_in_guard:profiles!visitors_check_in_by_fkey (
          id,
          full_name
        )
      `)
      .eq("society_id", society.id)
      .order("created_at", { ascending: false })
      .limit(100);

    visitors = vList || [];
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
      <SecurityDashboardClient
        profile={identity.effectiveUser}
        society={society}
        role={identity.currentRole || "SECURITY"}
        units={societyUnits}
        initialVisitors={visitors}
      />
    </div>
  );
}
