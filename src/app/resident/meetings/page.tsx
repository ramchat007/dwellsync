import React from "react";
import { redirect } from "next/navigation";
import { getCurrentIdentity } from "@/lib/auth/server";
import { getPublicResidentMeetings } from "@/lib/governance/meetingService";
import { ResidentMeetingsClient } from "./ResidentMeetingsClient";

export const dynamic = "force-dynamic";

export default async function ResidentMeetingsPage() {
  const identity = await getCurrentIdentity();
  if (!identity || !identity.isAuthenticated) {
    redirect("/login");
  }

  const society = identity.currentSociety;
  if (!society) {
    redirect("/dashboard");
  }

  const { upcomingMeetings, pastPublishedMinutes } = await getPublicResidentMeetings(society.id);

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto">
      <ResidentMeetingsClient
        societyName={society.name}
        upcomingMeetings={upcomingMeetings}
        pastPublishedMinutes={pastPublishedMinutes}
      />
    </div>
  );
}
