import React from "react";
import { requireSocietyAccess } from "@/lib/auth/server";
import { getUnits } from "@/lib/services/buildingService";
import { UnitsExplorerClient } from "./UnitsExplorerClient";

export const dynamic = "force-dynamic";

export default async function SocietyUnitsPage({
  params,
}: {
  params: Promise<{ societyId: string }>;
}) {
  const { societyId } = await params;
  await requireSocietyAccess(societyId);

  const units = await getUnits(societyId);

  return <UnitsExplorerClient societyId={societyId} initialUnits={units} />;
}

