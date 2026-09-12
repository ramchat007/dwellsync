import React from "react";
import { requireSocietyAccess } from "@/lib/auth/server";
import { listResolutions } from "@/lib/governance/resolutionService";
import { getMeetings } from "@/lib/governance/meetingService";
import { ResolutionsClient } from "./ResolutionsClient";

export const dynamic = "force-dynamic";

const MANAGEMENT_ROLES = ["SUPER_ADMIN", "SOCIETY_ADMIN", "SECRETARY", "MANAGER", "TREASURER"];

export default async function SocietyResolutionsPage({
  params,
}: {
  params: Promise<{ societyId: string }>;
}) {
  const { societyId } = await params;
  const { identity } = await requireSocietyAccess(societyId);

  const [resolutionsRes, meetings] = await Promise.all([
    listResolutions(societyId),
    getMeetings(societyId),
  ]);

  const canManage =
    (identity.currentRole ? MANAGEMENT_ROLES.includes(identity.currentRole) : false) || identity.isSuperAdmin;

  return (
    <ResolutionsClient
      societyId={societyId}
      initialResolutions={resolutionsRes.resolutions || []}
      meetings={meetings || []}
      canManage={canManage}
      userRole={identity.currentRole || "RESIDENT"}
    />
  );
}
