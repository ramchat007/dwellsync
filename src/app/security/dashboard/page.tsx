import React from "react";
import { redirect } from "next/navigation";
import { getCurrentIdentity } from "@/lib/auth/server";
import { SecurityDashboardClient } from "./SecurityDashboardClient";

export const dynamic = "force-dynamic";

export default async function SecurityDashboardPage() {
  const identity = await getCurrentIdentity();
  if (!identity || !identity.isAuthenticated) {
    redirect("/login");
  }

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto">
      <SecurityDashboardClient
        profile={identity.effectiveUser}
        society={identity.currentSociety}
        role={identity.currentRole || "SECURITY"}
      />
    </div>
  );
}

