import { NextResponse } from "next/server";
import { requireSocietyAccess } from "@/lib/auth/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { recordAuditLog } from "@/lib/auth/audit";
import { roleHasPermission } from "@/lib/auth/permissions";
import { CreateMaintenanceRecordSchema } from "@/lib/validations/assets";
import { z } from "zod";

export const dynamic = "force-dynamic";

export async function GET(
  req: Request,
  context: { params: Promise<{ societyId: string; assetId: string }> }
) {
  try {
    const { societyId, assetId } = await context.params;
    const { identity } = await requireSocietyAccess(societyId);

    if (!roleHasPermission(identity.currentRole, "assets.view")) {
      return NextResponse.json({ error: "Forbidden: insufficient permissions" }, { status: 403 });
    }

    if (!z.string().uuid().safeParse(assetId).success) {
      return NextResponse.json({ error: "Invalid asset ID" }, { status: 400 });
    }

    const adminClient = createAdminClient();
    const { data: records, error } = await adminClient
      .from("asset_maintenance_records")
      .select(`
        *,
        creator:profiles!asset_maintenance_records_created_by_fkey (id, full_name, display_name)
      `)
      .eq("asset_id", assetId)
      .eq("society_id", societyId)
      .order("service_date", { ascending: false });

    if (error) {
      console.error("[API/assets/[assetId]/maintenance GET] Error:", error);
      return NextResponse.json({ error: "Failed to fetch maintenance history" }, { status: 500 });
    }

    return NextResponse.json({ records: records || [] });
  } catch (err: any) {
    console.error("[API/assets/[assetId]/maintenance GET] Server error:", err);
    return NextResponse.json({ error: err?.message || "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(
  req: Request,
  context: { params: Promise<{ societyId: string; assetId: string }> }
) {
  try {
    const { societyId, assetId } = await context.params;
    const { identity } = await requireSocietyAccess(societyId);

    if (!roleHasPermission(identity.currentRole, "assets.maintain")) {
      return NextResponse.json({ error: "Forbidden: requires assets.maintain permission" }, { status: 403 });
    }

    if (!z.string().uuid().safeParse(assetId).success) {
      return NextResponse.json({ error: "Invalid asset ID" }, { status: 400 });
    }

    const body = await req.json();
    const parsed = CreateMaintenanceRecordSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const adminClient = createAdminClient();

    // Verify asset belongs to society
    const { data: asset, error: assetErr } = await adminClient
      .from("assets")
      .select("id, name, asset_code, status")
      .eq("id", assetId)
      .eq("society_id", societyId)
      .single();

    if (assetErr || !asset) {
      return NextResponse.json({ error: "Asset not found" }, { status: 404 });
    }

    const insertData: any = {
      ...parsed.data,
      society_id: societyId,
      asset_id: assetId,
      expense_voucher_id: parsed.data.expense_voucher_id || null,
      completion_date: parsed.data.completion_date || null,
      next_service_date: parsed.data.next_service_date || null,
      created_by: identity.effectiveUser.id,
      updated_by: identity.effectiveUser.id,
    };

    const { data: record, error: insertErr } = await adminClient
      .from("asset_maintenance_records")
      .insert(insertData)
      .select(`
        *,
        creator:profiles!asset_maintenance_records_created_by_fkey (id, full_name, display_name)
      `)
      .single();

    if (insertErr) {
      console.error("[API/assets/[assetId]/maintenance POST] Error:", insertErr);
      return NextResponse.json({ error: insertErr.message || "Failed to create maintenance record" }, { status: 500 });
    }

    // If maintenance is ongoing, set asset status to UNDER_MAINTENANCE
    if (parsed.data.status === "IN_PROGRESS") {
      await adminClient
        .from("assets")
        .update({ status: "UNDER_MAINTENANCE", updated_at: new Date().toISOString() })
        .eq("id", assetId);
    } else if (parsed.data.status === "COMPLETED" && asset.status === "UNDER_MAINTENANCE") {
      await adminClient
        .from("assets")
        .update({ status: "ACTIVE", updated_at: new Date().toISOString() })
        .eq("id", assetId);
    }

    await recordAuditLog({
      actorUserId: identity.originalUser.id,
      effectiveUserId: identity.effectiveUser.id,
      societyId,
      action: "ASSET_MAINTENANCE_CREATED",
      resourceType: "asset_maintenance_records",
      resourceId: record.id,
      metadata: {
        asset_id: assetId,
        asset_code: asset.asset_code,
        title: record.title,
        maintenance_type: record.maintenance_type,
        cost: record.cost,
        status: record.status,
      },
    });

    return NextResponse.json({ success: true, record }, { status: 201 });
  } catch (err: any) {
    console.error("[API/assets/[assetId]/maintenance POST] Server error:", err);
    return NextResponse.json({ error: err?.message || "Internal Server Error" }, { status: 500 });
  }
}
