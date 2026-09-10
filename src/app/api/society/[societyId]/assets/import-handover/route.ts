import { NextResponse } from "next/server";
import { requireSocietyAccess } from "@/lib/auth/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { recordAuditLog } from "@/lib/auth/audit";
import { roleHasPermission } from "@/lib/auth/permissions";
import { ImportHandoverAssetSchema, AssetCategoryEnum } from "@/lib/validations/assets";
import { AssetCategory } from "@/lib/types/database";

export const dynamic = "force-dynamic";

// Map Handover category to Operational Asset category
const HANDOVER_TO_ASSET_CATEGORY_MAP: Record<string, AssetCategory> = {
  PUMP: "PLUMBING",
  WATER_INFRA: "PLUMBING",
  DG_SET: "DG_POWER",
  TRANSFORMER: "ELECTRICAL",
  ELECTRICAL_INFRA: "ELECTRICAL",
  SOLAR_PANEL: "ELECTRICAL",
  LIFT: "HVAC_LIFTS",
  FIRE_EQUIPMENT: "FIRE_SAFETY",
  CCTV: "SECURITY_SURVEILLANCE",
  ACCESS_CONTROL: "SECURITY_SURVEILLANCE",
  INTERCOM: "SECURITY_SURVEILLANCE",
  GYM_EQUIPMENT: "CLUBHOUSE_GYM",
  CLUBHOUSE_EQUIPMENT: "CLUBHOUSE_GYM",
  GARDEN_EQUIPMENT: "GARDENING_LANDSCAPING",
  OTHER: "OTHER",
};

export async function GET(
  req: Request,
  context: { params: Promise<{ societyId: string }> }
) {
  try {
    const { societyId } = await context.params;
    const { identity } = await requireSocietyAccess(societyId);

    if (!roleHasPermission(identity.currentRole, "assets.view")) {
      return NextResponse.json({ error: "Forbidden: insufficient permissions" }, { status: 403 });
    }

    const adminClient = createAdminClient();

    // 1. Get list of handover_asset_ids that are already imported into operational assets
    const { data: alreadyImported } = await adminClient
      .from("assets")
      .select("handover_asset_id")
      .eq("society_id", societyId)
      .not("handover_asset_id", "is", null);

    const importedIds = new Set((alreadyImported || []).map((a: any) => a.handover_asset_id));

    // 2. Fetch all handover assets belonging to this society
    const { data: handoverAssets, error } = await adminClient
      .from("handover_assets")
      .select(`
        *,
        building:buildings (id, name, code)
      `)
      .eq("society_id", societyId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("[API/assets/import-handover GET] Error:", error);
      return NextResponse.json({ error: "Failed to fetch handover assets" }, { status: 500 });
    }

    // Filter out already imported assets
    const available = (handoverAssets || []).filter((ha: any) => !importedIds.has(ha.id));

    return NextResponse.json({ availableHandoverAssets: available });
  } catch (err: any) {
    console.error("[API/assets/import-handover GET] Server error:", err);
    return NextResponse.json({ error: err?.message || "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(
  req: Request,
  context: { params: Promise<{ societyId: string }> }
) {
  try {
    const { societyId } = await context.params;
    const { identity } = await requireSocietyAccess(societyId);

    if (!roleHasPermission(identity.currentRole, "assets.manage")) {
      return NextResponse.json({ error: "Forbidden: requires assets.manage permission" }, { status: 403 });
    }

    const body = await req.json();
    const parsed = ImportHandoverAssetSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const adminClient = createAdminClient();

    // 1. Fetch source handover asset
    const { data: handoverAsset, error: haErr } = await adminClient
      .from("handover_assets")
      .select("*")
      .eq("id", parsed.data.handover_asset_id)
      .eq("society_id", societyId)
      .single();

    if (haErr || !handoverAsset) {
      return NextResponse.json({ error: "Handover asset not found" }, { status: 404 });
    }

    // 2. Check if already linked to an operational asset
    const { data: existingLink } = await adminClient
      .from("assets")
      .select("id, asset_code")
      .eq("handover_asset_id", parsed.data.handover_asset_id)
      .eq("society_id", societyId)
      .maybeSingle();

    if (existingLink) {
      return NextResponse.json(
        { error: `This handover asset has already been imported as ${existingLink.asset_code}` },
        { status: 409 }
      );
    }

    // 3. Auto-generate asset code
    let assetCode = parsed.data.asset_code?.trim();
    if (!assetCode) {
      const year = new Date().getFullYear();
      const { count } = await adminClient
        .from("assets")
        .select("id", { count: "exact", head: true })
        .eq("society_id", societyId);
      const nextNum = (count || 0) + 1;
      assetCode = `AST-${year}-${String(nextNum).padStart(4, "0")}`;
    }

    // 4. Determine operational category
    const mappedCategory =
      parsed.data.category ||
      HANDOVER_TO_ASSET_CATEGORY_MAP[handoverAsset.category] ||
      "OTHER";

    // Map condition
    let assetCondition = "GOOD";
    if (["EXCELLENT", "GOOD", "FAIR", "POOR"].includes(handoverAsset.current_condition)) {
      assetCondition = handoverAsset.current_condition;
    } else if (handoverAsset.current_condition === "DEFECTIVE") {
      assetCondition = "POOR";
    }

    // 5. Insert into operational assets
    const { data: asset, error: insertErr } = await adminClient
      .from("assets")
      .insert({
        society_id: societyId,
        asset_code: assetCode,
        name: handoverAsset.asset_name,
        description: handoverAsset.notes || `Transferred from Builder Handover (${handoverAsset.category})`,
        category: mappedCategory,
        subcategory: parsed.data.subcategory || handoverAsset.category,
        building_id: parsed.data.building_id || handoverAsset.building_id || null,
        wing_id: parsed.data.wing_id || null,
        location_description: parsed.data.location_description || handoverAsset.location_description || null,
        purchase_date: handoverAsset.installation_date || null,
        purchase_cost: parsed.data.purchase_cost || 0,
        vendor_name: handoverAsset.builder_vendor || null,
        status: handoverAsset.handover_status === "UNDER_REPAIR" ? "UNDER_MAINTENANCE" : "ACTIVE",
        condition: assetCondition,
        manufacturer: handoverAsset.manufacturer || null,
        model_number: handoverAsset.model || null,
        serial_number: handoverAsset.serial_number || null,
        warranty_provider: handoverAsset.builder_vendor || null,
        warranty_start: handoverAsset.warranty_start || null,
        warranty_end: handoverAsset.warranty_end || null,
        photos: Array.isArray(handoverAsset.document_urls) ? handoverAsset.document_urls : [],
        notes: parsed.data.notes || handoverAsset.notes || null,
        handover_asset_id: handoverAsset.id,
        created_by: identity.effectiveUser.id,
        updated_by: identity.effectiveUser.id,
      })
      .select(`
        *,
        building:buildings (id, name, code),
        wing:wings (id, name, code)
      `)
      .single();

    if (insertErr) {
      console.error("[API/assets/import-handover POST] Error:", insertErr);
      return NextResponse.json({ error: insertErr.message || "Failed to import asset" }, { status: 500 });
    }

    // 6. Record Audit Log
    await recordAuditLog({
      actorUserId: identity.originalUser.id,
      effectiveUserId: identity.effectiveUser.id,
      societyId,
      action: "ASSET_HANDOVER_LINKED",
      resourceType: "assets",
      resourceId: asset.id,
      metadata: {
        asset_code: asset.asset_code,
        name: asset.name,
        handover_asset_id: handoverAsset.id,
        handover_status: handoverAsset.handover_status,
      },
    });

    return NextResponse.json({ success: true, asset }, { status: 201 });
  } catch (err: any) {
    console.error("[API/assets/import-handover POST] Server error:", err);
    return NextResponse.json({ error: err?.message || "Internal Server Error" }, { status: 500 });
  }
}
