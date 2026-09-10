import { NextRequest, NextResponse } from "next/server";
import { requireSocietyAccess, roleHasPermission } from "@/lib/auth/server";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { createAdminClient } from "@/lib/supabase/admin";
import { CreateUnitChargeOverrideSchema } from "@/lib/validations/finance";
import { recordAuditLog } from "@/lib/auth/audit";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ societyId: string }> }
) {
  try {
    const { societyId } = await params;
    const { identity } = await requireSocietyAccess(societyId);

    if (!roleHasPermission(identity.currentRole, PERMISSIONS.BILLING_VIEW)) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 403 });
    }

    const adminClient = createAdminClient();
    const { data, error } = await adminClient
      .from("unit_charge_overrides")
      .select("*, unit:units(unit_number), charge_config:maintenance_configurations(name)")
      .eq("society_id", societyId)
      .order("created_at", { ascending: false });

    if (error) throw new Error(error.message);

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error("[API:OverridesGET] Error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to load unit overrides" },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ societyId: string }> }
) {
  try {
    const { societyId } = await params;
    const { identity } = await requireSocietyAccess(societyId);

    if (!roleHasPermission(identity.currentRole, PERMISSIONS.BILLING_MANAGE_CONFIG)) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 403 });
    }

    const body = await request.json();
    const parsed = CreateUnitChargeOverrideSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: "Invalid override payload", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const adminClient = createAdminClient();
    const { data, error } = await adminClient
      .from("unit_charge_overrides")
      .insert({
        society_id: societyId,
        ...parsed.data,
        created_by: identity.effectiveUser.id,
      })
      .select()
      .single();

    if (error) throw new Error(error.message);

    await recordAuditLog({
      actorUserId: identity.effectiveUser.id,
      societyId,
      action: "UNIT_CHARGE_OVERRIDE_CREATED",
      resourceType: "unit_charge_override",
      resourceId: data.id,
      metadata: { unit_id: parsed.data.unit_id, type: parsed.data.override_type, amount: parsed.data.amount },
    });

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error("[API:OverridesPOST] Error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to create unit override" },
      { status: 500 }
    );
  }
}

