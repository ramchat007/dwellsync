import { NextResponse } from "next/server";
import { requireSocietyAccess } from "@/lib/auth/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { recordAuditLog } from "@/lib/auth/audit";
import { roleHasPermission } from "@/lib/auth/permissions";
import { UpdateAssetSchema } from "@/lib/validations/assets";
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
    const { data: asset, error } = await adminClient
      .from("assets")
      .select(`
        *,
        building:buildings (id, name, code),
        wing:wings (id, name, code),
        assignee:profiles!assets_assigned_to_fkey (id, full_name, display_name, phone, email),
        handover_asset:handover_assets (id, asset_name, handover_status, manufacturer, model, serial_number),
        expense_voucher:expense_vouchers (id, voucher_number, amount, payment_status)
      `)
      .eq("id", assetId)
      .eq("society_id", societyId)
      .single();

    if (error || !asset) {
      return NextResponse.json({ error: "Asset not found" }, { status: 404 });
    }

    // Fetch recent maintenance history
    const { data: maintenanceRecords } = await adminClient
      .from("asset_maintenance_records")
      .select(`
        *,
        creator:profiles!asset_maintenance_records_created_by_fkey (id, full_name, display_name)
      `)
      .eq("asset_id", assetId)
      .eq("society_id", societyId)
      .order("service_date", { ascending: false });

    // Fetch linked documents if document_entity_links table exists
    const { data: docLinks } = await adminClient
      .from("document_entity_links")
      .select(`
        *,
        document:documents (id, title, file_path, category, created_at)
      `)
      .eq("society_id", societyId)
      .eq("entity_type", "ASSET")
      .eq("entity_id", assetId);

    return NextResponse.json({
      asset,
      maintenanceRecords: maintenanceRecords || [],
      documents: docLinks?.map((l: any) => l.document) || [],
    });
  } catch (err: any) {
    console.error("[API/assets/[assetId] GET] Server error:", err);
    return NextResponse.json({ error: err?.message || "Internal Server Error" }, { status: 500 });
  }
}

export async function PATCH(
  req: Request,
  context: { params: Promise<{ societyId: string; assetId: string }> }
) {
  try {
    const { societyId, assetId } = await context.params;
    const { identity } = await requireSocietyAccess(societyId);

    if (!roleHasPermission(identity.currentRole, "assets.manage")) {
      return NextResponse.json({ error: "Forbidden: insufficient permissions" }, { status: 403 });
    }

    if (!z.string().uuid().safeParse(assetId).success) {
      return NextResponse.json({ error: "Invalid asset ID" }, { status: 400 });
    }

    const body = await req.json();
    const parsed = UpdateAssetSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const adminClient = createAdminClient();

    // Verify existing asset belongs to this society
    const { data: existing, error: fetchErr } = await adminClient
      .from("assets")
      .select("id, name, asset_code, status, condition")
      .eq("id", assetId)
      .eq("society_id", societyId)
      .single();

    if (fetchErr || !existing) {
      return NextResponse.json({ error: "Asset not found" }, { status: 404 });
    }

    // Clean empty string UUIDs to null
    const updates: any = {
      ...parsed.data,
      updated_by: identity.effectiveUser.id,
      updated_at: new Date().toISOString(),
    };
    if ("building_id" in updates) updates.building_id = updates.building_id || null;
    if ("wing_id" in updates) updates.wing_id = updates.wing_id || null;
    if ("vendor_id" in updates) updates.vendor_id = updates.vendor_id || null;
    if ("expense_voucher_id" in updates) updates.expense_voucher_id = updates.expense_voucher_id || null;
    if ("assigned_to" in updates) updates.assigned_to = updates.assigned_to || null;
    if ("handover_asset_id" in updates) updates.handover_asset_id = updates.handover_asset_id || null;
    if ("purchase_date" in updates) updates.purchase_date = updates.purchase_date || null;
    if ("warranty_start" in updates) updates.warranty_start = updates.warranty_start || null;
    if ("warranty_end" in updates) updates.warranty_end = updates.warranty_end || null;
    if ("amc_start" in updates) updates.amc_start = updates.amc_start || null;
    if ("amc_end" in updates) updates.amc_end = updates.amc_end || null;

    const { data: updated, error: updateErr } = await adminClient
      .from("assets")
      .update(updates)
      .eq("id", assetId)
      .eq("society_id", societyId)
      .select(`
        *,
        building:buildings (id, name, code),
        wing:wings (id, name, code),
        assignee:profiles!assets_assigned_to_fkey (id, full_name, display_name)
      `)
      .single();

    if (updateErr) {
      console.error("[API/assets/[assetId] PATCH] Error:", updateErr);
      return NextResponse.json({ error: updateErr.message || "Failed to update asset" }, { status: 500 });
    }

    await recordAuditLog({
      actorUserId: identity.originalUser.id,
      effectiveUserId: identity.effectiveUser.id,
      societyId,
      action: "ASSET_UPDATED",
      resourceType: "assets",
      resourceId: assetId,
      metadata: {
        previous_status: existing.status,
        new_status: updated.status,
        previous_condition: existing.condition,
        new_condition: updated.condition,
        changes: Object.keys(parsed.data),
      },
    });

    return NextResponse.json({ success: true, asset: updated });
  } catch (err: any) {
    console.error("[API/assets/[assetId] PATCH] Server error:", err);
    return NextResponse.json({ error: err?.message || "Internal Server Error" }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  context: { params: Promise<{ societyId: string; assetId: string }> }
) {
  try {
    const { societyId, assetId } = await context.params;
    const { identity } = await requireSocietyAccess(societyId);

    if (!roleHasPermission(identity.currentRole, "assets.manage")) {
      return NextResponse.json({ error: "Forbidden: insufficient permissions" }, { status: 403 });
    }

    if (!z.string().uuid().safeParse(assetId).success) {
      return NextResponse.json({ error: "Invalid asset ID" }, { status: 400 });
    }

    const adminClient = createAdminClient();

    // Check if asset exists
    const { data: existing } = await adminClient
      .from("assets")
      .select("id, asset_code, name, status")
      .eq("id", assetId)
      .eq("society_id", societyId)
      .single();

    if (!existing) {
      return NextResponse.json({ error: "Asset not found" }, { status: 404 });
    }

    // Rather than hard-deleting and destroying audit history, mark as DISPOSED
    const { error: updateErr } = await adminClient
      .from("assets")
      .update({
        status: "DISPOSED",
        disposal_date: new Date().toISOString().split("T")[0],
        disposal_reason: "Archived / Removed by Administrator",
        updated_by: identity.effectiveUser.id,
        updated_at: new Date().toISOString(),
      })
      .eq("id", assetId)
      .eq("society_id", societyId);

    if (updateErr) {
      return NextResponse.json({ error: "Failed to archive asset" }, { status: 500 });
    }

    await recordAuditLog({
      actorUserId: identity.originalUser.id,
      effectiveUserId: identity.effectiveUser.id,
      societyId,
      action: "ASSET_DISPOSED",
      resourceType: "assets",
      resourceId: assetId,
      metadata: { asset_code: existing.asset_code, name: existing.name, action: "DELETED_ARCHIVED" },
    });

    return NextResponse.json({ success: true, message: "Asset archived successfully" });
  } catch (err: any) {
    console.error("[API/assets/[assetId] DELETE] Server error:", err);
    return NextResponse.json({ error: err?.message || "Internal Server Error" }, { status: 500 });
  }
}
