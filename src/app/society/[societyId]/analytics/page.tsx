import React from "react";
import { redirect } from "next/navigation";
import { requireSocietyAccess, roleHasPermission } from "@/lib/auth/server";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { getSocietyAnalytics } from "@/lib/services/analyticsService";
import { AnalyticsDashboardClient } from "./AnalyticsDashboardClient";

export const dynamic = "force-dynamic";

export default async function SocietyAnalyticsPage({
  params,
}: {
  params: Promise<{ societyId: string }>;
}) {
  const { societyId } = await params;
  const { identity } = await requireSocietyAccess(societyId);

  // Security authorization check: Verify caller possesses ANALYTICS_VIEW permission
  if (!roleHasPermission(identity.currentRole, PERMISSIONS.ANALYTICS_VIEW)) {
    redirect("/unauthorized");
  }

  // Load initial 30-day analytics dataset server-side
  const initialData = await getSocietyAnalytics(societyId, "30d");

  return (
    <AnalyticsDashboardClient
      initialData={initialData}
      societyId={societyId}
    />
  );
}

