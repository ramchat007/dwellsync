import React from "react";
import { requireSocietyAccess } from "@/lib/auth/server";
import { getMeetings } from "@/lib/governance/meetingService";
import { getCommittees } from "@/lib/governance/service";
import { getSocietyMembers } from "@/lib/services/membershipService";
import { MeetingsListClient } from "./MeetingsListClient";

export const dynamic = "force-dynamic";

export default async function SocietyMeetingsPage({
  params,
}: {
  params: Promise<{ societyId: string }>;
}) {
  const { societyId } = await params;
  const { identity } = await requireSocietyAccess(societyId);

  const [meetings, committees, members] = await Promise.all([
    getMeetings(societyId, { includePrivate: true }),
    getCommittees(societyId, { includeExpired: false }),
    getSocietyMembers(societyId),
  ]);

  return (
    <MeetingsListClient
      societyId={societyId}
      initialMeetings={meetings}
      committees={committees}
      eligibleMembers={members}
      userRole={identity.currentRole || "COMMITTEE_MEMBER"}
    />
  );
}
