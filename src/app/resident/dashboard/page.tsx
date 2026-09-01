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
  let userUnits: Unit[] = [];

  if (identity.currentSociety) {
    // 1. Check unit_owners
    const { data: ownedUnits } = await adminClient
      .from("unit_owners")
      .select("unit:units (*)")
      .eq("society_id", identity.currentSociety.id)
      .eq("user_id", identity.effectiveUser.id)
      .eq("status", "ACTIVE");

    if (ownedUnits && ownedUnits.length > 0) {
      userUnits = ownedUnits.map((o: any) => o.unit).filter(Boolean);
    }

    // 2. Check unit_occupancies if not found
    if (userUnits.length === 0) {
      const { data: occupiedUnits } = await adminClient
        .from("unit_occupancies")
        .select("unit:units (*)")
        .eq("society_id", identity.currentSociety.id)
        .eq("user_id", identity.effectiveUser.id)
        .eq("status", "ACTIVE");

      if (occupiedUnits && occupiedUnits.length > 0) {
        userUnits = occupiedUnits.map((o: any) => o.unit).filter(Boolean);
      }
    }

    // 3. Fallback: Check unit_number in society_memberships
    if (userUnits.length === 0) {
      const { data: membership } = await adminClient
        .from("society_memberships")
        .select("unit_number")
        .eq("society_id", identity.currentSociety.id)
        .eq("user_id", identity.effectiveUser.id)
        .maybeSingle();

      if (membership?.unit_number) {
        const { data: u } = await adminClient
          .from("units")
          .select("*")
          .eq("society_id", identity.currentSociety.id)
          .eq("unit_number", membership.unit_number)
          .maybeSingle();

        if (u) {
          userUnits = [u as Unit];
        }
      }
    }
  }

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto">
      <ResidentDashboardClient
        profile={identity.effectiveUser}
        society={identity.currentSociety}
        role={identity.currentRole || "RESIDENT"}
        units={userUnits}
      />
    </div>
  );
}

