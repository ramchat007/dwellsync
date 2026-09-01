import React from "react";
import { requireSocietyAccess } from "@/lib/auth/server";
import { getSocietyMembers } from "@/lib/services/membershipService";
import { PeopleDirectoryClient } from "./PeopleDirectoryClient";

export const dynamic = "force-dynamic";

export default async function SocietyPeoplePage({
  params,
}: {
  params: Promise<{ societyId: string }>;
}) {
  const { societyId } = await params;
  await requireSocietyAccess(societyId);

  const members = await getSocietyMembers(societyId);

  return <PeopleDirectoryClient societyId={societyId} initialMembers={members} />;
}

