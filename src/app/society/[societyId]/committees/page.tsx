import React from "react";
import { requireSocietyAccess } from "@/lib/auth/server";
import { getCommittees } from "@/lib/governance/service";
import { getSocietyMembers } from "@/lib/services/membershipService";
import { CommitteesClient } from "./CommitteesClient";

export const dynamic = "force-dynamic";

export default async function SocietyCommitteesPage({
  params,
}: {
  params: Promise<{ societyId: string }>;
}) {
  const { societyId } = await params;
  const { identity } = await requireSocietyAccess(societyId);

  const [committees, members] = await Promise.all([
    getCommittees(societyId, { includeExpired: true }),
    getSocietyMembers(societyId),
  ]);

  return (
    <CommitteesClient
      societyId={societyId}
      initialCommittees={committees}
      eligibleMembers={members}
      userRole={identity.currentRole || "COMMITTEE_MEMBER"}
    />
  );
}
