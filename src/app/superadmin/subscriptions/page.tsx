import React from "react";
import { redirect } from "next/navigation";
import { getCurrentIdentity } from "@/lib/auth/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { SubscriptionsAdminClient } from "./SubscriptionsAdminClient";
import { SubscriptionPlan } from "@/lib/types/database";

export const dynamic = "force-dynamic";

export default async function SubscriptionsPage() {
  const identity = await getCurrentIdentity();

  if (!identity || !identity.isSuperAdmin || identity.isImpersonating) {
    redirect("/unauthorized");
  }

  const adminClient = createAdminClient();

  // Fetch plans
  const { data: plans } = await adminClient
    .from("subscription_plans")
    .select("*")
    .order("sort_order", { ascending: true });

  // Fetch societies
  const { data: societies } = await adminClient
    .from("societies")
    .select("id, name, registration_number, status")
    .order("name", { ascending: true });

  // Fetch subscriptions
  const { data: subscriptions } = await adminClient
    .from("society_subscriptions")
    .select("*, plan:subscription_plans(*)");

  const subMap = new Map<string, any>();
  (subscriptions || []).forEach((s) => {
    subMap.set(s.society_id, s);
  });

  const enrichedSocieties = (societies || []).map((soc) => ({
    ...soc,
    subscription: subMap.get(soc.id) || null,
  }));

  return (
    <SubscriptionsAdminClient
      initialPlans={(plans as SubscriptionPlan[]) || []}
      initialSocieties={enrichedSocieties}
    />
  );
}
