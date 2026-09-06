import { NextResponse } from "next/server";
import { requireSocietyAccess } from "@/lib/auth/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { recordAuditLog } from "@/lib/auth/audit";
import { CreateMaintenanceConfigSchema } from "@/lib/validations/billing";

export const dynamic = "force-dynamic";

export async function GET(
  req: Request,
  context: { params: Promise<{ societyId: string }> }
) {
  try {
    const { societyId } = await context.params;
    await requireSocietyAccess(societyId);

    const adminClient = createAdminClient();

    const { data: configs, error } = await adminClient
      .from("maintenance_configurations")
      .select("*")
      .eq("society_id", societyId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("[API/billing/configs] Error fetching configs:", error);
      return NextResponse.json({ error: "Failed to fetch configurations" }, { status: 500 });
    }

    return NextResponse.json({ configs: configs || [] });
  } catch (err: any) {
    console.error("[API/billing/configs] Exception:", err);
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
    const parsed = CreateMaintenanceConfigSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const adminClient = createAdminClient();

    const { data: config, error: insertErr } = await adminClient
      .from("maintenance_configurations")
      .insert({
        society_id: societyId,
        name: parsed.data.name,
        description: parsed.data.description || null,
        charge_type: parsed.data.charge_type,
        rate: parsed.data.rate,
        unit_type_rates: parsed.data.unit_type_rates || {},
        frequency: parsed.data.frequency,
        effective_from: parsed.data.effective_from,
        effective_to: parsed.data.effective_to || null,
        is_active: true,
      })
      .select()
      .single();

    if (insertErr || !config) {
      console.error("[API/billing/configs] Insert error:", insertErr);
      return NextResponse.json({ error: "Failed to create configuration" }, { status: 500 });
    }

    await recordAuditLog({
      actorUserId: identity.originalUser.id,
      effectiveUserId: identity.effectiveUser.id,
      societyId,
      action: "MAINTENANCE_CONFIG_CREATED",
      resourceType: "maintenance_configuration",
      resourceId: config.id,
      metadata: {
        name: config.name,
        charge_type: config.charge_type,
        rate: config.rate,
        frequency: config.frequency,
      },
    });

    return NextResponse.json({ config }, { status: 201 });
  } catch (err: any) {
    console.error("[API/billing/configs] Exception:", err);
    return NextResponse.json(
      { error: err?.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}
