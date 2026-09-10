import { NextResponse } from "next/server";
import { requireSocietyAccess } from "@/lib/auth/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { recordAuditLog } from "@/lib/auth/audit";
import { roleHasPermission } from "@/lib/auth/permissions";
import { DisposeAssetSchema } from "@/lib/validations/assets";
import { z } from "zod";

export const dynamic = "force-dynamic";

export async function POST(
  req: Request,
  context: { params: Promise<{ societyId: string; assetId: string }> }
) {
  try {
    const { societyId, assetId } = await context.params;
    const { identity } = await requireSocietyAccess(societyId);

    if (!roleHasPermission(identity.currentRole, "assets.dispose")) {
      return NextResponse.json({ error: "Forbidden: requires assets.dispose permission" }, { status: 403 });
    }

    if (!z.string().uuid().safeParse(assetId).success) {
      return NextResponse.json({ error: "Invalid asset ID" }, { status: 400 });
    }

    const body = await req.json();
    const parsed = DisposeAssetSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const adminClient = createAdminClient();

    const { data: existing, error: fetchErr } = await adminClient
      .from("assets")
      .select("id, name, asset_code, status")
      .eq("id", assetId)
      .eq("society_id", societyId)
      .single();

    if (fetchErr || !existing) {
      return NextResponse.json({ error: "Asset not found" }, { status: 404 });
    }

    if (existing.status === "DISPOSED") {
      return NextResponse.json({ error: "Asset is already marked as disposed" }, { status: 400 });
    }

    const { data: updated, error: updateErr } = await adminClient
      .from("assets")
      .update({
        status: parsed.data.status,
        disposal_date: parsed.data.disposal_date,
        disposal_reason: parsed.data.disposal_reason,
        disposal_value: parsed.data.disposal_value,
        disposed_to: parsed.data.disposed_to || null,
        notes: parsed.data.notes ? `${parsed.data.notes}` : undefined,
        updated_by: identity.effectiveUser.id,
        updated_at: new Date().toISOString(),
      })
      .eq("id", assetId)
      .eq("society_id", societyId)
      .select()
      .single();

    if (updateErr) {
      console.error("[API/assets/[assetId]/dispose POST] Error:", updateErr);
      return NextResponse.json({ error: updateErr.message || "Failed to record asset disposal" }, { status: 500 });
    }

    await recordAuditLog({
      actorUserId: identity.originalUser.id,
      effectiveUserId: identity.effectiveUser.id,
      societyId,
      action: "ASSET_DISPOSED",
      resourceType: "assets",
      resourceId: assetId,
      metadata: {
        asset_code: existing.asset_code,
        name: existing.name,
        disposal_status: parsed.data.status,
        disposal_date: parsed.data.disposal_date,
        disposal_reason: parsed.data.disposal_reason,
        disposal_value: parsed.data.disposal_value,
        disposed_to: parsed.data.disposed_to,
      },
    });

    return NextResponse.json({ success: true, asset: updated });
  } catch (err: any) {
    console.error("[API/assets/[assetId]/dispose POST] Server error:", err);
    return NextResponse.json({ error: err?.message || "Internal Server Error" }, { status: 500 });
  }
}
