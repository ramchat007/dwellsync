import React from "react";
import { redirect } from "next/navigation";
import { getCurrentIdentity } from "@/lib/auth/server";
import { getPublicCommitteeRoster } from "@/lib/governance/service";
import { ResidentCommitteeClient } from "./ResidentCommitteeClient";

export const dynamic = "force-dynamic";

export default async function ResidentCommitteePage() {
  const identity = await getCurrentIdentity();
  if (!identity || !identity.isAuthenticated) {
    redirect("/login");
  }

  const society = identity.currentSociety;
  if (!society) {
    redirect("/dashboard");
  }

  const { committee, roster } = await getPublicCommitteeRoster(society.id);

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto">
      <ResidentCommitteeClient
        societyName={society.name}
        committee={committee}
        roster={roster}
      />
    </div>
  );
}
