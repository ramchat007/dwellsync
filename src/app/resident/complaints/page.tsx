import React from "react";
import { redirect } from "next/navigation";
import { getCurrentIdentity } from "@/lib/auth/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { ComplaintsClient } from "./ComplaintsClient";

export const dynamic = "force-dynamic";

export default async function ResidentComplaintsPage() {
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
          You must be an active resident of a housing society to access the helpdesk.
        </p>
      </div>
    );
  }

  const adminClient = createAdminClient();

  // 1. Fetch initial complaints
  const { data: initialComplaints } = await adminClient
    .from("complaints")
    .select(`
      *,
      unit:units (
        id,
        unit_number,
        building:buildings (name, code),
        wing:wings (name, code)
      ),
      creator:profiles!complaints_created_by_fkey (
        id,
        full_name,
        display_name
      ),
      assignee:profiles!complaints_assigned_to_fkey (
        id,
        full_name,
        display_name
      )
    `)
    .eq("society_id", society.id)
    .eq("created_by", user.id)
    .order("created_at", { ascending: false });

  // 2. Fetch resident's units for ticket creation selection
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
      <ComplaintsClient
        initialComplaints={initialComplaints || []}
        residentUnits={residentUnits}
        society={society}
      />
    </div>
  );
}
