import React from "react";
import { requireSocietyAdmin } from "@/lib/auth/server";
import { getUnitsPaginated, getBuildingsWithHierarchy } from "@/lib/services/buildingService";
import { UnitsExplorerClient } from "./UnitsExplorerClient";

export const dynamic = "force-dynamic";

export default async function SocietyUnitsPage({
  params,
}: {
  params: Promise<{ societyId: string }>;
}) {
  const { societyId } = await params;
  await requireSocietyAdmin(societyId);

  const [paginatedResult, buildings] = await Promise.all([
    getUnitsPaginated(societyId, { page: 1, limit: 20 }),
    getBuildingsWithHierarchy(societyId),
  ]);

  return (
    <UnitsExplorerClient
      societyId={societyId}
      initialResult={paginatedResult}
      buildings={buildings}
    />
  );
}
