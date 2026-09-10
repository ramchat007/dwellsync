import { NextResponse } from "next/server";
import { requireSocietyAccess } from "@/lib/auth/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { recordAuditLog } from "@/lib/auth/audit";
import { roleHasPermission } from "@/lib/auth/permissions";
import { UpdateMaintenanceRecordSchema } from "@/lib/validations/assets";
import { z } from "zod";

export const dynamic = "force-dynamic";

export async function PATCH(
  req: Request,
  context: { params: Promise<{ societyId: string; assetId: string; recordId: string }> }
) {
  try {
    const { societyId, assetId, recordId } = await context.params;
    const { identity } = await requireSocietyAccess(societyId);

    if (!roleHasPermission(identity.currentRole, "assets.maintain")) {
      return NextResponse.json({ error: "Forbidden: requires assets.maintain permission" }, { status: 403 });
    }

    if (!z.string().uuid().safeParse(assetId).success || !z.string().uuid().safeParse(recordId).success) {
      return NextResponse.json({ error: "Invalid ID format" }, { status: 400 });
    }

    const body = await req.json();
    const parsed = UpdateMaintenanceRecordSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const adminClient = createAdminClient();

    // Verify existing record
    const { data: existing, error: fetchErr } = await adminClient
      .from("asset_maintenance_records")
      .select("id, status, asset_id")
      .eq("id", recordId)
      .eq("asset_id", assetId)
      .eq("society_id", societyId)
      .single();

    if (fetchErr || !existing) {
      return NextResponse.json({ error: "Maintenance record not found" }, { status: 404 });
    }

    const updates: any = {
      ...parsed.data,
      updated_by: identity.effectiveUser.id,
      updated_at: new Date().toISOString(),
    };
    if ("expense_voucher_id" in updates) updates.expense_voucher_id = updates.expense_voucher_id || null;
    if ("completion_date" in updates) updates.completion_date = updates.completion_date || null;
    if ("next_service_date" in updates) updates.next_service_date = updates.next_service_date || null;

    if (parsed.data.status === "COMPLETED" && !updates.completion_date) {
      updates.completion_date = new Date().toISOString().split("T")[0];
    }

    const { data: updated, error: updateErr } = await adminClient
      .from("asset_maintenance_records")
      .update(updates)
      .eq("id", recordId)
      .select()
      .single();

    if (updateErr) {
      console.error("[API/assets/.../maintenance/[recordId] PATCH] Error:", updateErr);
      return NextResponse.json({ error: updateErr.message || "Failed to update maintenance record" }, { status: 500 });
    }

    // If status became COMPLETED, restore asset from UNDER_MAINTENANCE to ACTIVE
    if (parsed.data.status === "COMPLETED" && existing.status !== "COMPLETED") {
      const { data: asset } = await adminClient
        .from("assets")
        .select("status")
        .eq("id", assetId)
        .single();
      if (asset?.status === "UNDER_MAINTENANCE") {
        await adminClient
          .from("assets")
          .update({ status: "ACTIVE", updated_at: new Date().toISOString() })
          .eq("id", assetId);
      }
    }

    await recordAuditLog({
      actorUserId: identity.originalUser.id,
      effectiveUserId: identity.effectiveUser.id,
      societyId,
      action: "ASSET_MAINTENANCE_UPDATED",
      resourceType: "asset_maintenance_records",
      resourceId: recordId,
      metadata: {
        asset_id: assetId,
        previous_status: existing.status,
        new_status: updated.status,
        changes: Object.keys(parsed.data),
      },
    });

    return NextResponse.json({ success: true, record: updated });
  } catch (err: any) {
    console.error("[API/assets/.../maintenance/[recordId] PATCH] Server error:", err);
    return NextResponse.json({ error: err?.message || "Internal Server Error" }, { status: 500 });
  }
}
