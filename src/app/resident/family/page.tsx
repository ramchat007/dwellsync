import React from "react";
import { redirect } from "next/navigation";
import { getCurrentIdentity } from "@/lib/auth/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { FamilyMembersClient } from "./FamilyMembersClient";
import { Unit } from "@/lib/types/database";

export const dynamic = "force-dynamic";

export default async function ResidentFamilyPage() {
  const identity = await getCurrentIdentity();
  if (!identity || !identity.isAuthenticated) {
    redirect("/login");
  }

  const societyId = identity.currentSociety?.id;
  const adminClient = createAdminClient();
  let familyMembers: any[] = [];
  let userUnits: Unit[] = [];

  if (societyId) {
    const { data: members } = await adminClient
      .from("family_members")
      .select(`
        *,
        unit:units (
          id,
          unit_number,
          building:buildings (name)
        )
      `)
      .eq("society_id", societyId)
      .eq("primary_member_id", identity.effectiveUser.id)
      .order("created_at", { ascending: true });

    familyMembers = members || [];

    // Fetch resident's units (both occupied and owned)
    const { data: occupancies } = await adminClient
      .from("unit_occupancies")
      .select("unit:units (*)")
      .eq("society_id", societyId)
      .eq("user_id", identity.effectiveUser.id)
      .eq("status", "ACTIVE");

    if (occupancies) {
      userUnits = occupancies.map((o: any) => o.unit).filter(Boolean);
    }

    const { data: owned } = await adminClient
      .from("unit_owners")
      .select("unit:units (*)")
      .eq("society_id", societyId)
      .eq("user_id", identity.effectiveUser.id)
      .eq("status", "ACTIVE");

    if (owned) {
      owned.forEach((o: any) => {
        if (o.unit && !userUnits.some((u) => u.id === o.unit.id)) {
          userUnits.push(o.unit);
        }
      });
    }
  }

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto">
      <FamilyMembersClient
        initialMembers={familyMembers}
        society={identity.currentSociety}
        units={userUnits}
      />
    </div>
  );
}

