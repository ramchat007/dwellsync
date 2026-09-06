import { NextResponse } from "next/server";
import { requireSocietyAccess } from "@/lib/auth/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { recordAuditLog } from "@/lib/auth/audit";
import { CreateBillingCycleSchema } from "@/lib/validations/billing";
import { generateBillingInvoices } from "@/lib/billing/generator";

export const dynamic = "force-dynamic";

export async function GET(
  req: Request,
  context: { params: Promise<{ societyId: string }> }
) {
  try {
    const { societyId } = await context.params;
    await requireSocietyAccess(societyId);

    const adminClient = createAdminClient();

    const { data: cycles, error } = await adminClient
      .from("billing_cycles")
      .select(`
        *,
        creator:profiles!billing_cycles_created_by_fkey (
          id,
          full_name,
          display_name
        )
      `)
      .eq("society_id", societyId)
      .order("period_start", { ascending: false });

    if (error) {
      console.error("[API/billing/cycles] Error fetching cycles:", error);
      return NextResponse.json({ error: "Failed to fetch billing cycles" }, { status: 500 });
    }

    return NextResponse.json({ cycles: cycles || [] });
  } catch (err: any) {
    console.error("[API/billing/cycles] Exception:", err);
    return NextResponse.json(
      { error: err?.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}

export async function POST(
  req: Request,
  context: { params: Promise<{ societyId: string }> }
) {
  try {
    const { societyId } = await context.params;
    const { identity } = await requireSocietyAccess(societyId);

    const body = await req.json();
    const parsed = CreateBillingCycleSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const adminClient = createAdminClient();

    // Prevent duplicate billing cycle for identical period
    const { data: existingCycle } = await adminClient
      .from("billing_cycles")
      .select("id")
      .eq("society_id", societyId)
      .eq("period_start", parsed.data.period_start)
      .eq("period_end", parsed.data.period_end)
      .maybeSingle();

    if (existingCycle) {
      return NextResponse.json(
        { error: "A billing cycle already exists for this exact date range" },
        { status: 409 }
      );
    }

    const { data: cycle, error: insertErr } = await adminClient
      .from("billing_cycles")
      .insert({
        society_id: societyId,
        name: parsed.data.name,
        period_start: parsed.data.period_start,
        period_end: parsed.data.period_end,
        due_date: parsed.data.due_date,
        status: "DRAFT",
        notes: parsed.data.notes || null,
        created_by: identity.effectiveUser.id,
      })
      .select()
      .single();

    if (insertErr || !cycle) {
      console.error("[API/billing/cycles] Insert error:", insertErr);
      return NextResponse.json({ error: "Failed to create billing cycle" }, { status: 500 });
    }

    await recordAuditLog({
      actorUserId: identity.originalUser.id,
      effectiveUserId: identity.effectiveUser.id,
      societyId,
      action: "BILLING_CYCLE_CREATED",
      resourceType: "billing_cycle",
      resourceId: cycle.id,
      metadata: {
        name: cycle.name,
        period_start: cycle.period_start,
        period_end: cycle.period_end,
        due_date: cycle.due_date,
      },
    });

    // If charge_config_id is supplied, automatically trigger idempotent invoice generation
    let generationResult = null;
    if (parsed.data.charge_config_id) {
      generationResult = await generateBillingInvoices({
        societyId,
        billingCycleId: cycle.id,
        chargeConfigId: parsed.data.charge_config_id,
        actorUserId: identity.originalUser.id,
        effectiveUserId: identity.effectiveUser.id,
      });
    }

    return NextResponse.json({ cycle, generation: generationResult }, { status: 201 });
  } catch (err: any) {
    console.error("[API/billing/cycles] Exception:", err);
    return NextResponse.json(
      { error: err?.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}
