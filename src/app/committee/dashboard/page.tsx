import React from "react";
import { redirect } from "next/navigation";
import { getCurrentIdentity } from "@/lib/auth/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { CommitteeDashboardClient } from "./CommitteeDashboardClient";

export const dynamic = "force-dynamic";

export default async function CommitteeDashboardPage() {
  const identity = await getCurrentIdentity();
  if (!identity || !identity.isAuthenticated) {
    redirect("/login");
  }

  const adminClient = createAdminClient();
  let totalBuildings = 0;
  let totalUnits = 0;
  let totalMembers = 0;

  if (identity.currentSociety) {
    const sid = identity.currentSociety.id;

    const [bRes, uRes, mRes] = await Promise.all([
      adminClient.from("buildings").select("id", { count: "exact", head: true }).eq("society_id", sid),
      adminClient.from("units").select("id", { count: "exact", head: true }).eq("society_id", sid),
      adminClient.from("society_memberships").select("id", { count: "exact", head: true }).eq("society_id", sid).eq("status", "ACTIVE"),
    ]);

    totalBuildings = bRes.count || 0;
    totalUnits = uRes.count || 0;
    totalMembers = mRes.count || 0;
  }

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto">
      <CommitteeDashboardClient
        profile={identity.effectiveUser}
        society={identity.currentSociety}
        role={identity.currentRole || "COMMITTEE_MEMBER"}
        stats={{ totalBuildings, totalUnits, totalMembers }}
      />
    </div>
  );
}

