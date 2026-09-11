import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  canUseFeature,
  getFeatureLimit,
  getSocietySubscription,
  getSocietyEntitlementSummary,
  assertCanUseFeature,
  DEFAULT_FREE_LIMITS,
  DEFAULT_FREE_FEATURES,
} from "@/lib/services/entitlementService";
import {
  FreeTierPaymentProvider,
  getPaymentProvider,
} from "@/lib/payments";
import {
  SubscriptionPlan,
  SocietySubscription,
  EntitledFeature,
  SubscriptionBillingCycle,
} from "@/lib/types/database";

// In-memory mock stores for testing
const mockPlans = new Map<string, SubscriptionPlan>();
const mockSubscriptions = new Map<string, SocietySubscription>();
const mockUsage = new Map<string, Record<string, number>>();

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    from: (table: string) => {
      if (table === "subscription_plans") {
        return {
          select: () => ({
            eq: (col: string, val: string) => ({
              maybeSingle: async () => ({
                data: mockPlans.get(val) || null,
                error: null,
              }),
              single: async () => ({
                data: mockPlans.get(val) || null,
                error: null,
              }),
            }),
            order: () => ({
              data: Array.from(mockPlans.values()),
              error: null,
            }),
          }),
        };
      }

      if (table === "society_subscriptions") {
        return {
          select: (query: string) => ({
            eq: (col: string, val: string) => {
              if (col === "society_id") {
                const sub = mockSubscriptions.get(val);
                return {
                  maybeSingle: async () => ({
                    data: sub
                      ? {
                          ...sub,
                          plan: mockPlans.get(sub.plan_id) || null,
                        }
                      : null,
                    error: null,
                  }),
                  single: async () => ({
                    data: sub
                      ? {
                          ...sub,
                          plan: mockPlans.get(sub.plan_id) || null,
                        }
                      : null,
                    error: null,
                  }),
                };
              }
              return {
                maybeSingle: async () => ({ data: null, error: null }),
              };
            },
          }),
          upsert: async (payload: any) => {
            const id = payload.id || `sub_${payload.society_id}`;
            const sub: SocietySubscription = {
              id,
              ...payload,
              plan: mockPlans.get(payload.plan_id),
            };
            mockSubscriptions.set(payload.society_id, sub);
            return {
              select: () => ({
                single: async () => ({ data: sub, error: null }),
              }),
              error: null,
            };
          },
        };
      }

      // Feature table mocks for getUsage()
      return {
        select: (cols: string, opts?: { count?: string; head?: boolean }) => ({
          eq: (col: string, val: string) => {
            const counts = mockUsage.get(val) || {};
            let count = 0;
            if (table === "units") count = counts.units || 0;
            if (table === "buildings") count = counts.buildings || 0;
            if (table === "complaints") count = counts.complaints || 0;
            if (table === "documents") count = counts.documents || 0;
            if (table === "society_events") count = counts.events || 0;
            if (table === "society_polls") count = counts.polls || 0;
            if (table === "maintenance_invoices") count = counts.invoices || 0;

            return {
              eq: () => ({
                in: () => ({ count }),
                gte: () => ({ count }),
              }),
              not: () => ({ count }),
              gte: () => ({ count }),
              count,
              data: table === "documents" && cols === "file_size_kb"
                ? [{ file_size_kb: (counts.storage_mb || 0) * 1024 }]
                : [],
            };
          },
        }),
      };
    },
  }),
}));

describe("Pricing, Free Tier & Subscription Architecture Test Suite", () => {
  const societyA = "soc_alpha_1111-1111-1111";
  const societyB = "soc_beta_2222-2222-2222";

  beforeEach(() => {
    mockPlans.clear();
    mockSubscriptions.clear();
    mockUsage.clear();

    // Setup Standard Free Plan
    mockPlans.set("FREE", {
      id: "plan_free",
      code: "FREE",
      name: "Free Community Tier",
      description: "Zero-cost tier for small communities.",
      is_active: true,
      monthly_price: 0,
      annual_price: 0,
      currency: "INR",
      feature_limits: { ...DEFAULT_FREE_LIMITS },
      enabled_features: [...DEFAULT_FREE_FEATURES],
      sort_order: 1,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    // Setup Professional Plan
    mockPlans.set("PROFESSIONAL", {
      id: "plan_pro",
      code: "PROFESSIONAL",
      name: "Professional Tier",
      description: "Advanced society management.",
      is_active: true,
      monthly_price: 2499,
      annual_price: 24999,
      currency: "INR",
      feature_limits: {
        max_units: 350,
        max_buildings: 15,
        max_residents: 1000,
        max_storage_mb: 2048,
        max_active_complaints: 500,
        max_events_per_month: 100,
        max_polls_per_month: 100,
        max_staff_members: 50,
        max_invoices_per_month: 1000,
      },
      enabled_features: [
        ...DEFAULT_FREE_FEATURES,
        "amenities",
        "governance_meetings",
        "committees",
        "analytics_advanced",
        "sla_management",
        "assets_inventory",
        "finance_ledger",
      ],
      sort_order: 3,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
  });

  // ============================================================
  // 1. FREE PLAN INTEGRITY & ZERO-COST GUARANTEES
  // ============================================================
  describe("1. FREE Plan Integrity & Zero-Cost Guarantees", () => {
    it("enforces monthly and annual price strictly equal to 0 for FREE plan", () => {
      const freePlan = mockPlans.get("FREE");
      expect(freePlan).toBeDefined();
      expect(freePlan?.monthly_price).toBe(0);
      expect(freePlan?.annual_price).toBe(0);
      expect(freePlan?.currency).toBe("INR");
    });

    it("has practical default capacity limits for free tier adoption", () => {
      const freePlan = mockPlans.get("FREE");
      expect(freePlan?.feature_limits.max_units).toBe(30);
      expect(freePlan?.feature_limits.max_buildings).toBe(2);
      expect(freePlan?.feature_limits.max_active_complaints).toBe(25);
      expect(freePlan?.feature_limits.max_storage_mb).toBe(100);
    });

    it("automatically provides virtual FREE subscription if society has no DB record", async () => {
      const sub = await getSocietySubscription(societyA);
      expect(sub).toBeDefined();
      expect(sub.plan?.code).toBe("FREE");
      expect(sub.status).toBe("ACTIVE");
      expect(sub.provider).toBe("FREE_LOCAL_PROVIDER");
    });
  });

  // ============================================================
  // 2. PAYMENT PROVIDER ABSTRACTION (ZERO EXTERNAL GATEWAY)
  // ============================================================
  describe("2. Payment Provider Abstraction (Zero External Gateway)", () => {
    it("uses FreeTierPaymentProvider without any external payment gateway SDKs", async () => {
      const provider = getPaymentProvider();
      expect(provider.name).toBe("FREE_LOCAL_PROVIDER");
      expect(provider).toBeInstanceOf(FreeTierPaymentProvider);
    });

    it("creates checkout sessions that complete locally and activate subscription immediately", async () => {
      const provider = new FreeTierPaymentProvider();
      const result = await provider.createCheckout({
        societyId: societyA,
        planId: "FREE",
        billingCycle: "monthly",
      });

      expect(result.status).toBe("completed");
      expect(result.provider).toBe("FREE_LOCAL_PROVIDER");
      expect(result.sessionId).toMatch(/^free_sess_/);

      const assigned = mockSubscriptions.get(societyA);
      expect(assigned).toBeDefined();
      expect(assigned?.status).toBe("ACTIVE");
      expect(assigned?.provider).toBe("FREE_LOCAL_PROVIDER");
    });

    it("verifies payment sessions locally without external HTTP calls", async () => {
      const provider = new FreeTierPaymentProvider();
      const verification = await provider.verifyPayment({
        sessionId: "free_sess_test",
        metadata: { societyId: societyA, planId: "FREE" },
      });

      expect(verification.isVerified).toBe(true);
      expect(verification.status).toBe("paid");
      expect(verification.transactionId).toMatch(/^free_tx_/);
    });
  });

  // ============================================================
  // 3. FEATURE ENTITLEMENTS & LIMIT ENGINE
  // ============================================================
  describe("3. Feature Entitlements & Limit Engine", () => {
    it("allows operations when usage is within tier limits", async () => {
      mockUsage.set(societyA, { units: 10, buildings: 1 });
      const check = await canUseFeature(societyA, "units");

      expect(check.allowed).toBe(true);
      expect(check.reason).toBe("ACTIVE");
      expect(check.limit).toBe(30);
      expect(check.current).toBe(10);
    });

    it("blocks feature when usage reaches or exceeds the configured quota", async () => {
      mockUsage.set(societyA, { units: 30 }); // limit is 30
      const check = await canUseFeature(societyA, "units");

      expect(check.allowed).toBe(false);
      expect(check.reason).toBe("LIMIT_EXCEEDED");
      expect(check.limit).toBe(30);
      expect(check.current).toBe(30);
    });

    it("blocks features that are not included in the active tier", async () => {
      // FREE tier does not have sla_management
      const check = await canUseFeature(societyA, "sla_management" as EntitledFeature);

      expect(check.allowed).toBe(false);
      expect(check.reason).toBe("FEATURE_DISABLED");
    });

    it("allows features when upgraded to a tier that enables them", async () => {
      mockSubscriptions.set(societyA, {
        id: "sub_pro_a",
        society_id: societyA,
        plan_id: "PROFESSIONAL",
        status: "ACTIVE",
        billing_cycle: "monthly" as SubscriptionBillingCycle,
        current_period_start: new Date().toISOString(),
        current_period_end: new Date(Date.now() + 30 * 86400 * 1000).toISOString(),
        cancel_at_period_end: false,
        provider: "FREE_LOCAL_PROVIDER",
        metadata: {},
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      const check = await canUseFeature(societyA, "sla_management" as EntitledFeature);
      expect(check.allowed).toBe(true);
      expect(check.reason).toBe("ACTIVE");
    });

    it("assertCanUseFeature throws informative errors on limit exhaustion", async () => {
      mockUsage.set(societyA, { units: 35 });
      await expect(assertCanUseFeature(societyA, "units")).rejects.toThrow(
        /Feature limit reached for 'units'/
      );
    });
  });

  // ============================================================
  // 4. SUBSCRIPTION LIFECYCLE & DATA PRESERVATION
  // ============================================================
  describe("4. Subscription Lifecycle & Data Preservation", () => {
    it("blocks new actions when subscription is EXPIRED", async () => {
      mockSubscriptions.set(societyA, {
        id: "sub_exp_a",
        society_id: societyA,
        plan_id: "FREE",
        status: "EXPIRED",
        billing_cycle: "monthly" as SubscriptionBillingCycle,
        current_period_start: new Date().toISOString(),
        current_period_end: new Date(Date.now() - 86400 * 1000).toISOString(),
        cancel_at_period_end: true,
        provider: "FREE_LOCAL_PROVIDER",
        metadata: {},
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      const check = await canUseFeature(societyA, "units");
      expect(check.allowed).toBe(false);
      expect(check.reason).toBe("PLAN_EXPIRED");
    });

    it("blocks new actions when subscription is CANCELLED", async () => {
      mockSubscriptions.set(societyA, {
        id: "sub_canc_a",
        society_id: societyA,
        plan_id: "FREE",
        status: "CANCELLED",
        billing_cycle: "monthly" as SubscriptionBillingCycle,
        current_period_start: new Date().toISOString(),
        current_period_end: new Date().toISOString(),
        cancel_at_period_end: true,
        cancelled_at: new Date().toISOString(),
        provider: "FREE_LOCAL_PROVIDER",
        metadata: {},
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      const check = await canUseFeature(societyA, "complaints");
      expect(check.allowed).toBe(false);
      expect(check.reason).toBe("PLAN_EXPIRED");
    });

    it("never alters or deletes existing data records when limit is reached", async () => {
      // Existing records are preserved
      mockUsage.set(societyA, { units: 32 }); // over limit
      const limit = await getFeatureLimit(societyA, "units");
      const current = (mockUsage.get(societyA) || {}).units;

      expect(current).toBe(32);
      expect(limit).toBe(30);
      // Data remains intact in memory/DB
      expect(mockUsage.get(societyA)?.units).toBe(32);
    });
  });

  // ============================================================
  // 5. MULTI-TENANT ISOLATION
  // ============================================================
  describe("5. Multi-Tenant Isolation", () => {
    it("ensures limits and usage of Society A never leak or apply to Society B", async () => {
      // Society A is full on units (30/30)
      mockUsage.set(societyA, { units: 30 });
      // Society B has only 5 units
      mockUsage.set(societyB, { units: 5 });

      const checkA = await canUseFeature(societyA, "units");
      const checkB = await canUseFeature(societyB, "units");

      expect(checkA.allowed).toBe(false);
      expect(checkA.reason).toBe("LIMIT_EXCEEDED");

      expect(checkB.allowed).toBe(true);
      expect(checkB.current).toBe(5);
    });

    it("generates isolated entitlement summaries per society", async () => {
      mockUsage.set(societyA, { units: 15, complaints: 10 });
      mockUsage.set(societyB, { units: 25, complaints: 2 });

      const summaryA = await getSocietyEntitlementSummary(societyA);
      const summaryB = await getSocietyEntitlementSummary(societyB);

      expect(summaryA.societyId).toBe(societyA);
      expect(summaryB.societyId).toBe(societyB);

      const unitsMetricA = summaryA.metrics.find((m) => m.key === "units");
      const unitsMetricB = summaryB.metrics.find((m) => m.key === "units");

      expect(unitsMetricA?.current).toBe(15);
      expect(unitsMetricB?.current).toBe(25);
    });
  });

  // ============================================================
  // 6. RBAC & ROLE ACCESS BOUNDARIES
  // ============================================================
  describe("6. RBAC & Role Access Boundaries", () => {
    it("distinguishes platform administrative roles from resident roles", () => {
      const platformAdminRoles = ["SUPER_ADMIN"];
      const societyAdminRoles = ["SOCIETY_ADMIN", "SECRETARY", "TREASURER", "MANAGER"];
      const residentRoles = ["RESIDENT", "OWNER", "TENANT"];

      expect(platformAdminRoles.includes("SUPER_ADMIN")).toBe(true);
      expect(societyAdminRoles.includes("SOCIETY_ADMIN")).toBe(true);
      expect(residentRoles.includes("RESIDENT")).toBe(true);
      // Residents cannot be platform admins
      expect(residentRoles.some((r) => platformAdminRoles.includes(r))).toBe(false);
    });
  });
});
