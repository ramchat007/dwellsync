import { createAdminClient } from "@/lib/supabase/admin";
import {
  EntitledFeature,
  EntitlementCheckResult,
  FeatureLimits,
  SocietySubscription,
  SubscriptionPlan,
  SubscriptionBillingCycle,
} from "@/lib/types/database";

export const DEFAULT_FREE_LIMITS: FeatureLimits = {
  max_units: 30,
  max_buildings: 2,
  max_residents: 60,
  max_storage_mb: 100,
  max_active_complaints: 25,
  max_events_per_month: 5,
  max_polls_per_month: 5,
  max_staff_members: 5,
  max_invoices_per_month: 50,
};

export const DEFAULT_FREE_FEATURES: EntitledFeature[] = [
  "units",
  "residents",
  "buildings",
  "gate_passes",
  "complaints",
  "notices",
  "documents",
  "events_polls",
  "maintenance_billing",
];

const DEFAULT_FREE_PLAN: SubscriptionPlan = {
  id: "free-plan-default",
  code: "FREE",
  name: "Free Community Tier",
  description: "Default free community tier for small housing societies.",
  is_active: true,
  monthly_price: 0,
  annual_price: 0,
  currency: "INR",
  feature_limits: DEFAULT_FREE_LIMITS,
  enabled_features: DEFAULT_FREE_FEATURES,
  sort_order: 1,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

/**
 * Retrieves the active subscription for a society.
 * Falls back to the standard FREE tier if no explicit record exists in the database.
 */
export async function getSocietySubscription(
  societyId: string
): Promise<SocietySubscription> {
  const adminClient = createAdminClient();

  const { data: sub } = await adminClient
    .from("society_subscriptions")
    .select("*, plan:subscription_plans(*)")
    .eq("society_id", societyId)
    .maybeSingle();

  if (sub && sub.plan) {
    return sub as SocietySubscription;
  }

  // Fallback: If free plan exists in DB, link it, otherwise use in-memory default
  const { data: freePlanDb } = await adminClient
    .from("subscription_plans")
    .select("*")
    .eq("code", "FREE")
    .maybeSingle();

  const plan = (freePlanDb as SubscriptionPlan) || DEFAULT_FREE_PLAN;

  return {
    id: `virtual-sub-${societyId}`,
    society_id: societyId,
    plan_id: plan.id,
    status: "ACTIVE",
    billing_cycle: "monthly" as SubscriptionBillingCycle,
    current_period_start: new Date().toISOString(),
    current_period_end: new Date(Date.now() + 30 * 86400 * 1000).toISOString(),
    cancel_at_period_end: false,
    provider: "FREE_LOCAL_PROVIDER",
    metadata: { is_virtual_fallback: true },
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    plan,
  };
}

/**
 * Returns the numeric limit for a specific feature, or null if unlimited (-1 or undefined).
 */
export async function getFeatureLimit(
  societyId: string,
  feature: EntitledFeature | string
): Promise<number | null> {
  const subscription = await getSocietySubscription(societyId);
  const limits = subscription.plan?.feature_limits || DEFAULT_FREE_LIMITS;

  let rawLimit: number | undefined;

  switch (feature) {
    case "units":
      rawLimit = limits.max_units;
      break;
    case "buildings":
      rawLimit = limits.max_buildings;
      break;
    case "residents":
      rawLimit = limits.max_residents;
      break;
    case "documents":
    case "storage":
      rawLimit = limits.max_storage_mb;
      break;
    case "complaints":
      rawLimit = limits.max_active_complaints;
      break;
    case "events_polls":
    case "events":
      rawLimit = limits.max_events_per_month;
      break;
    case "polls":
      rawLimit = limits.max_polls_per_month;
      break;
    case "staff":
      rawLimit = limits.max_staff_members;
      break;
    case "maintenance_billing":
    case "invoices":
      rawLimit = limits.max_invoices_per_month;
      break;
    default:
      rawLimit = limits[feature];
      break;
  }

  if (rawLimit === undefined || rawLimit === null || rawLimit < 0) {
    return null; // Unlimited
  }

  return rawLimit;
}

/**
 * Returns the current real-time usage count for a specific feature within the society.
 */
export async function getUsage(
  societyId: string,
  feature: EntitledFeature | string
): Promise<number> {
  const adminClient = createAdminClient();

  switch (feature) {
    case "units": {
      const { count } = await adminClient
        .from("units")
        .select("id", { count: "exact", head: true })
        .eq("society_id", societyId);
      return count || 0;
    }

    case "buildings": {
      const { count } = await adminClient
        .from("buildings")
        .select("id", { count: "exact", head: true })
        .eq("society_id", societyId);
      return count || 0;
    }

    case "residents": {
      const { count } = await adminClient
        .from("society_memberships")
        .select("id", { count: "exact", head: true })
        .eq("society_id", societyId)
        .eq("status", "ACTIVE")
        .in("role_id", ["RESIDENT", "OWNER", "TENANT"]);
      return count || 0;
    }

    case "staff": {
      const { count } = await adminClient
        .from("society_memberships")
        .select("id", { count: "exact", head: true })
        .eq("society_id", societyId)
        .eq("status", "ACTIVE")
        .in("role_id", ["STAFF", "MANAGER", "SECURITY"]);
      return count || 0;
    }

    case "complaints": {
      const { count } = await adminClient
        .from("complaints")
        .select("id", { count: "exact", head: true })
        .eq("society_id", societyId)
        .not("status", "in", '("RESOLVED","CLOSED")');
      return count || 0;
    }

    case "documents": {
      const { count } = await adminClient
        .from("documents")
        .select("id", { count: "exact", head: true })
        .eq("society_id", societyId);
      return count || 0;
    }

    case "storage": {
      const { data } = await adminClient
        .from("documents")
        .select("file_size_kb")
        .eq("society_id", societyId);
      if (!data || data.length === 0) return 0;
      const totalKb = data.reduce((acc, row) => acc + (row.file_size_kb || 0), 0);
      return Math.ceil(totalKb / 1024); // Return in MB
    }

    case "events_polls":
    case "events": {
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const { count } = await adminClient
        .from("society_events")
        .select("id", { count: "exact", head: true })
        .eq("society_id", societyId)
        .gte("created_at", startOfMonth.toISOString());
      return count || 0;
    }

    case "polls": {
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const { count } = await adminClient
        .from("society_polls")
        .select("id", { count: "exact", head: true })
        .eq("society_id", societyId)
        .gte("created_at", startOfMonth.toISOString());
      return count || 0;
    }

    case "maintenance_billing":
    case "invoices": {
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const { count } = await adminClient
        .from("maintenance_invoices")
        .select("id", { count: "exact", head: true })
        .eq("society_id", societyId)
        .gte("created_at", startOfMonth.toISOString());
      return count || 0;
    }

    default:
      return 0;
  }
}

/**
 * Checks whether the society can use a specific feature or add another item.
 * Evaluates subscription status, feature enablement, and quantitative usage limits.
 */
export async function canUseFeature(
  societyId: string,
  feature: EntitledFeature | string
): Promise<EntitlementCheckResult> {
  const subscription = await getSocietySubscription(societyId);

  // 1. Subscription status checks
  if (subscription.status === "EXPIRED" || subscription.status === "CANCELLED") {
    return {
      allowed: false,
      reason: "PLAN_EXPIRED",
      feature,
    };
  }

  const enabledFeatures = subscription.plan?.enabled_features || DEFAULT_FREE_FEATURES;

  // 2. Feature inclusion check
  // Sub-keys like 'storage', 'invoices', 'events', 'polls' map to their parent module
  const moduleMapping: Record<string, EntitledFeature> = {
    storage: "documents",
    invoices: "maintenance_billing",
    events: "events_polls",
    polls: "events_polls",
  };

  const featureToCheck = (moduleMapping[feature] || feature) as EntitledFeature;

  if (!enabledFeatures.includes(featureToCheck)) {
    return {
      allowed: false,
      reason: "FEATURE_DISABLED",
      feature,
    };
  }

  // 3. Quantitative limit check
  const limit = await getFeatureLimit(societyId, feature);
  if (limit !== null) {
    const current = await getUsage(societyId, feature);
    if (current >= limit) {
      return {
        allowed: false,
        reason: "LIMIT_EXCEEDED",
        limit,
        current,
        feature,
      };
    }
    return {
      allowed: true,
      reason: "ACTIVE",
      limit,
      current,
      feature,
    };
  }

  return {
    allowed: true,
    reason: "ACTIVE",
    limit: null,
    feature,
  };
}

export interface MetricSummary {
  key: string;
  label: string;
  current: number;
  limit: number | null;
  percentUsed: number;
  isUnlimited: boolean;
  isExceeded: boolean;
}

export interface SocietyEntitlementSummary {
  societyId: string;
  subscription: SocietySubscription;
  metrics: MetricSummary[];
  enabledFeatures: EntitledFeature[];
}

/**
 * Returns a comprehensive usage vs quota report for a society dashboard.
 */
export async function getSocietyEntitlementSummary(
  societyId: string
): Promise<SocietyEntitlementSummary> {
  const subscription = await getSocietySubscription(societyId);
  const enabledFeatures = subscription.plan?.enabled_features || DEFAULT_FREE_FEATURES;

  const metricConfigs: { key: string; label: string; feature: EntitledFeature | string }[] = [
    { key: "units", label: "Flats & Units", feature: "units" },
    { key: "buildings", label: "Buildings & Wings", feature: "buildings" },
    { key: "residents", label: "Registered Residents", feature: "residents" },
    { key: "staff", label: "Staff & Management", feature: "staff" },
    { key: "complaints", label: "Active Complaints", feature: "complaints" },
    { key: "storage", label: "Document Storage (MB)", feature: "storage" },
    { key: "events", label: "Events This Month", feature: "events" },
    { key: "polls", label: "Polls This Month", feature: "polls" },
    { key: "invoices", label: "Invoices This Month", feature: "invoices" },
  ];

  const metrics: MetricSummary[] = await Promise.all(
    metricConfigs.map(async ({ key, label, feature }) => {
      const limit = await getFeatureLimit(societyId, feature);
      const current = await getUsage(societyId, feature);
      const isUnlimited = limit === null;
      const isExceeded = !isUnlimited && current >= (limit as number);
      const percentUsed = isUnlimited
        ? 0
        : Math.min(100, Math.round((current / (limit as number)) * 100));

      return {
        key,
        label,
        current,
        limit,
        percentUsed,
        isUnlimited,
        isExceeded,
      };
    })
  );

  return {
    societyId,
    subscription,
    metrics,
    enabledFeatures,
  };
}

/**
 * Throws or returns an error payload if the feature is disallowed.
 */
export async function assertCanUseFeature(
  societyId: string,
  feature: EntitledFeature | string
): Promise<void> {
  const check = await canUseFeature(societyId, feature);
  if (!check.allowed) {
    if (check.reason === "LIMIT_EXCEEDED") {
      throw new Error(
        `Feature limit reached for '${feature}'. Current usage: ${check.current}, Maximum limit: ${check.limit}. Please upgrade your society plan.`
      );
    }
    if (check.reason === "FEATURE_DISABLED") {
      throw new Error(
        `The feature '${feature}' is not enabled on your society's current subscription plan.`
      );
    }
    if (check.reason === "PLAN_EXPIRED") {
      throw new Error(
        "Your society subscription is expired or cancelled. Please contact platform support."
      );
    }
    throw new Error(`Access to '${feature}' is restricted by subscription.`);
  }
}
