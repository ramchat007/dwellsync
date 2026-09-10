import { NextResponse } from "next/server";
import { requireSocietyAccess } from "@/lib/auth/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { recordAuditLog } from "@/lib/auth/audit";
import { roleHasPermission } from "@/lib/auth/permissions";
import { CreateAssetSchema } from "@/lib/validations/assets";

export const dynamic = "force-dynamic";

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

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const category = searchParams.get("category");
    const buildingId = searchParams.get("buildingId");
    const search = searchParams.get("search");
    const warrantyExpiring = searchParams.get("warrantyExpiring") === "true";
    const amcExpiring = searchParams.get("amcExpiring") === "true";

    const adminClient = createAdminClient();
    let query = adminClient
      .from("assets")
      .select(`
        *,
        building:buildings (id, name, code),
        wing:wings (id, name, code),
        assignee:profiles!assets_assigned_to_fkey (id, full_name, display_name)
      `)
      .eq("society_id", societyId)
      .order("created_at", { ascending: false });

    if (status && status !== "ALL") {
      query = query.eq("status", status);
    }
    if (category && category !== "ALL") {
      query = query.eq("category", category);
    }
    if (buildingId && buildingId !== "ALL") {
      query = query.eq("building_id", buildingId);
    }
    if (search) {
      query = query.or(`name.ilike.%${search}%,asset_code.ilike.%${search}%,location_description.ilike.%${search}%`);
    }

    const today = new Date().toISOString().split("T")[0];
    const thirtyDaysLater = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

    if (warrantyExpiring) {
      query = query.gte("warranty_end", today).lte("warranty_end", thirtyDaysLater);
    }
    if (amcExpiring) {
      query = query.gte("amc_end", today).lte("amc_end", thirtyDaysLater);
    }

    const { data: assets, error } = await query;

    if (error) {
      console.error("[API/assets GET] Error:", error);
      return NextResponse.json({ error: "Failed to fetch assets" }, { status: 500 });
    }

    return NextResponse.json({ assets: assets || [] });
  } catch (err: any) {
    console.error("[API/assets GET] Server error:", err);
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
      return NextResponse.json({ error: "Forbidden: insufficient permissions" }, { status: 403 });
    }

    const body = await req.json();
    const parsed = CreateAssetSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const adminClient = createAdminClient();

    // Auto-generate asset code if not provided
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

    // Prepare insert payload (clean empty UUID strings to null)
    const insertPayload: any = {
      ...parsed.data,
      society_id: societyId,
      asset_code: assetCode,
      building_id: parsed.data.building_id || null,
      wing_id: parsed.data.wing_id || null,
      vendor_id: parsed.data.vendor_id || null,
      expense_voucher_id: parsed.data.expense_voucher_id || null,
      assigned_to: parsed.data.assigned_to || null,
      handover_asset_id: parsed.data.handover_asset_id || null,
      purchase_date: parsed.data.purchase_date || null,
      warranty_start: parsed.data.warranty_start || null,
      warranty_end: parsed.data.warranty_end || null,
      amc_start: parsed.data.amc_start || null,
      amc_end: parsed.data.amc_end || null,
      created_by: identity.effectiveUser.id,
      updated_by: identity.effectiveUser.id,
    };

    const { data: asset, error } = await adminClient
      .from("assets")
      .insert(insertPayload)
      .select(`
        *,
        building:buildings (id, name, code),
        wing:wings (id, name, code),
        assignee:profiles!assets_assigned_to_fkey (id, full_name, display_name)
      `)
      .single();

    if (error) {
      console.error("[API/assets POST] Error:", error);
      return NextResponse.json({ error: error.message || "Failed to create asset" }, { status: 500 });
    }

    await recordAuditLog({
      actorUserId: identity.originalUser.id,
      effectiveUserId: identity.effectiveUser.id,
      societyId,
      action: "ASSET_CREATED",
      resourceType: "assets",
      resourceId: asset.id,
      metadata: {
        asset_code: asset.asset_code,
        name: asset.name,
        category: asset.category,
        purchase_cost: asset.purchase_cost,
        handover_asset_id: asset.handover_asset_id,
      },
    });

    return NextResponse.json({ success: true, asset }, { status: 201 });
  } catch (err: any) {
    console.error("[API/assets POST] Server error:", err);
    return NextResponse.json({ error: err?.message || "Internal Server Error" }, { status: 500 });
  }
}
