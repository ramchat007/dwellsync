import React from "react";
import { requireSocietyAccess } from "@/lib/auth/server";
import { getBuildingsWithHierarchy } from "@/lib/services/buildingService";
import { BuildingHierarchyClient } from "./BuildingHierarchyClient";

export const dynamic = "force-dynamic";

export default async function SocietyBuildingsPage({
  params,
}: {
  params: Promise<{ societyId: string }>;
}) {
  const { societyId } = await params;
  const { society } = await requireSocietyAccess(societyId);

  const buildings = await getBuildingsWithHierarchy(societyId);

  return <BuildingHierarchyClient societyId={societyId} initialBuildings={buildings} society={society} />;
}

