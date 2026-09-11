import { NextResponse } from "next/server";
import { getCurrentIdentity } from "@/lib/auth/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { recordAuditLog } from "@/lib/auth/audit";
import { PlanCode, SubscriptionPlan } from "@/lib/types/database";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const identity = await getCurrentIdentity();
    if (!identity || !identity.isSuperAdmin || identity.isImpersonating) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const adminClient = createAdminClient();
    const { data: plans, error } = await adminClient
      .from("subscription_plans")
      .select("*")
      .order("sort_order", { ascending: true });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ plans: plans || [] });
  } catch (err: any) {
    console.error("[API/superadmin/plans] GET Exception:", err);
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
      id,
      code,
      name,
      description,
      is_active,
      monthly_price,
      annual_price,
      currency,
      feature_limits,
      enabled_features,
      sort_order,
    } = body;

    if (!code || !name) {
      return NextResponse.json({ error: "Plan code and name are required." }, { status: 400 });
    }

    // Hard requirement: FREE plan must have price = 0
    let mPrice = Number(monthly_price) || 0;
    let aPrice = Number(annual_price) || 0;
    if (code === "FREE") {
      mPrice = 0;
      aPrice = 0;
    }

    const adminClient = createAdminClient();
    const payload: Partial<SubscriptionPlan> = {
      code: code as PlanCode,
      name,
      description: description || null,
      is_active: is_active ?? true,
      monthly_price: mPrice,
      annual_price: aPrice,
      currency: currency || "INR",
      feature_limits: feature_limits || {},
      enabled_features: enabled_features || [],
      sort_order: Number(sort_order) || 0,
      updated_at: new Date().toISOString(),
    };

    let resultPlan: SubscriptionPlan;

    if (id) {
      const { data, error } = await adminClient
        .from("subscription_plans")
        .update(payload)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      resultPlan = data as SubscriptionPlan;

      await recordAuditLog({
        actorUserId: identity.originalUser.id,
        effectiveUserId: identity.effectiveUser.id,
        action: "UPDATE",
        resourceType: "SUBSCRIPTION_PLAN",
        resourceId: id,
        metadata: { planCode: code, changes: payload },
      });
    } else {
      const { data, error } = await adminClient
        .from("subscription_plans")
        .insert(payload)
        .select()
        .single();

      if (error) throw error;
      resultPlan = data as SubscriptionPlan;

      await recordAuditLog({
        actorUserId: identity.originalUser.id,
        effectiveUserId: identity.effectiveUser.id,
        action: "CREATE",
        resourceType: "SUBSCRIPTION_PLAN",
        resourceId: resultPlan.id,
        metadata: { planCode: code },
      });
    }

    return NextResponse.json({ plan: resultPlan });
  } catch (err: any) {
    console.error("[API/superadmin/plans] POST Exception:", err);
    return NextResponse.json({ error: err?.message || "Internal server error" }, { status: 500 });
  }
}

