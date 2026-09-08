import React from "react";
import { requireSuperAdmin } from "@/lib/auth/server";
import { getPlatformAnalytics } from "@/lib/services/analyticsService";
import { PlatformAnalyticsClient } from "./PlatformAnalyticsClient";

export const dynamic = "force-dynamic";

export default async function SuperAdminAnalyticsPage() {
  // Gate strictly to platform Super Admin (disallows impersonated sessions)
  await requireSuperAdmin();

  // Fetch initial 30-day global platform analytics telemetry
  const initialData = await getPlatformAnalytics("30d");

  return <PlatformAnalyticsClient initialData={initialData} />;
}

