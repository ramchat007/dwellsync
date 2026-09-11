import { NextResponse } from "next/server";
import { getCurrentIdentity } from "@/lib/auth/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { recordAuditLog } from "@/lib/auth/audit";
import { BillingCycle, SubscriptionStatus } from "@/lib/types/database";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const identity = await getCurrentIdentity();
    if (!identity || !identity.isSuperAdmin || identity.isImpersonating) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const adminClient = createAdminClient();

    // Fetch all societies
    const { data: societies, error: socError } = await adminClient
      .from("societies")
      .select("id, name, registration_number, created_at, status")
      .order("name", { ascending: true });

    if (socError) {
      return NextResponse.json({ error: socError.message }, { status: 500 });
    }

    // Fetch all active subscriptions
    const { data: subscriptions, error: subError } = await adminClient
      .from("society_subscriptions")
      .select("*, plan:subscription_plans(*)");

    if (subError) {
      return NextResponse.json({ error: subError.message }, { status: 500 });
    }

    // Fetch all plans for assignment dropdown
    const { data: plans } = await adminClient
      .from("subscription_plans")
      .select("*")
      .order("sort_order", { ascending: true });

    // Map subscriptions to societies
    const subMap = new Map<string, any>();
    (subscriptions || []).forEach((s) => {
      subMap.set(s.society_id, s);
    });

    const enrichedSocieties = (societies || []).map((soc) => ({
      ...soc,
      subscription: subMap.get(soc.id) || null,
    }));

    return NextResponse.json({
      societies: enrichedSocieties,
      plans: plans || [],
    });
  } catch (err: any) {
    console.error("[API/superadmin/subscriptions] GET Exception:", err);
    return NextResponse.json({ error: err?.message || "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const identity = await getCurrentIdentity();
    if (!identity || !identity.isSuperAdmin || identity.isImpersonating) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const body = await req.json();
    const {
      society_id,
      plan_id,
      status,
      billing_cycle,
      current_period_end,
      cancel_at_period_end,
    } = body;

    if (!society_id || !plan_id) {
      return NextResponse.json({ error: "society_id and plan_id are required." }, { status: 400 });
    }

    const adminClient = createAdminClient();

    // Verify plan exists
    const { data: plan, error: planErr } = await adminClient
      .from("subscription_plans")
      .select("*")
      .eq("id", plan_id)
      .single();

    if (planErr || !plan) {
      return NextResponse.json({ error: "Invalid plan selected." }, { status: 400 });
    }

    const periodEnd =
      current_period_end ||
      new Date(
        Date.now() + (billing_cycle === "annual" ? 365 : 30) * 86400 * 1000
      ).toISOString();

    const payload = {
      society_id,
      plan_id,
      status: (status as SubscriptionStatus) || "ACTIVE",
      billing_cycle: (billing_cycle as BillingCycle) || "monthly",
      current_period_start: new Date().toISOString(),
      current_period_end: periodEnd,
      cancel_at_period_end: !!cancel_at_period_end,
      provider: "FREE_LOCAL_PROVIDER",
      updated_at: new Date().toISOString(),
    };

    const { data: updatedSub, error: upsertErr } = await adminClient
      .from("society_subscriptions")
      .upsert(payload, { onConflict: "society_id" })
      .select("*, plan:subscription_plans(*)")
      .single();

    if (upsertErr) {
      return NextResponse.json({ error: upsertErr.message }, { status: 500 });
    }

    await recordAuditLog({
      actorUserId: identity.originalUser.id,
      effectiveUserId: identity.effectiveUser.id,
      societyId: society_id,
      action: "ASSIGN_SUBSCRIPTION",
      resourceType: "SOCIETY_SUBSCRIPTION",
      resourceId: updatedSub.id,
      metadata: {
        planCode: plan.code,
        status: payload.status,
        billingCycle: payload.billing_cycle,
      },
    });

    return NextResponse.json({ subscription: updatedSub });
  } catch (err: any) {
    console.error("[API/superadmin/subscriptions] POST Exception:", err);
    return NextResponse.json({ error: err?.message || "Internal server error" }, { status: 500 });
  }
}

