import React from "react";
import { redirect } from "next/navigation";
import { requireSocietyAccess } from "@/lib/auth/server";
import { getSocietyEntitlementSummary } from "@/lib/services/entitlementService";
import { SubscriptionClient } from "./SubscriptionClient";

export const dynamic = "force-dynamic";

export default async function SocietySubscriptionPage(props: {
  params: Promise<{ societyId: string }>;
}) {
  const params = await props.params;
  const { societyId } = params;
  const { identity, society } = await requireSocietyAccess(societyId);

  // Normal residents should not access subscription internals
  const allowedRoles = ["SUPER_ADMIN", "SOCIETY_ADMIN", "SECRETARY", "TREASURER", "MANAGER"];
  const currentRole = identity.currentRole || "";
  if (!allowedRoles.includes(currentRole) && !identity.isSuperAdmin) {
    redirect("/unauthorized");
  }

  const summary = await getSocietyEntitlementSummary(societyId);

  return <SubscriptionClient summary={summary} societyName={society.name} />;
}
