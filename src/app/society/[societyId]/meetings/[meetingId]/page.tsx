import React from "react";
import { notFound } from "next/navigation";
import { requireSocietyAccess } from "@/lib/auth/server";
import { getMeetingDetail } from "@/lib/governance/meetingService";
import { getSocietyMembers } from "@/lib/services/membershipService";
import { MeetingWorkspaceClient } from "./MeetingWorkspaceClient";

export const dynamic = "force-dynamic";

export default async function SocietyMeetingWorkspacePage({
  params,
}: {
  params: Promise<{ societyId: string; meetingId: string }>;
}) {
  const { societyId, meetingId } = await params;
  const { identity } = await requireSocietyAccess(societyId);

  const [meeting, members] = await Promise.all([
    getMeetingDetail(societyId, meetingId, { includePrivate: true }),
    getSocietyMembers(societyId),
  ]);

  if (!meeting) {
    notFound();
  }

  return (
    <MeetingWorkspaceClient
      societyId={societyId}
      initialMeeting={meeting}
      eligibleMembers={members}
      userRole={identity.currentRole || "COMMITTEE_MEMBER"}
      currentUserId={identity.user.id}
    />
  );
}
