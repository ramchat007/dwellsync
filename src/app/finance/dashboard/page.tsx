import React from "react";
import { redirect } from "next/navigation";
import { getCurrentIdentity } from "@/lib/auth/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { FinanceDashboardClient } from "./FinanceDashboardClient";

export const dynamic = "force-dynamic";

export default async function FinanceDashboardPage() {
  const identity = await getCurrentIdentity();
  if (!identity || !identity.isAuthenticated) {
    redirect("/login");
  }

  const adminClient = createAdminClient();
  let totalUnits = 0;

  if (identity.currentSociety) {
    const { count } = await adminClient
      .from("units")
      .select("id", { count: "exact", head: true })
      .eq("society_id", identity.currentSociety.id);

    totalUnits = count || 0;
  }

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto">
      <FinanceDashboardClient
        profile={identity.effectiveUser}
        society={identity.currentSociety}
        role={identity.currentRole || "TREASURER"}
        totalUnits={totalUnits}
      />
    </div>
  );
}

