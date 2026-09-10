import { NextResponse } from "next/server";
import { requireSocietyAccess } from "@/lib/auth/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { recordAuditLog } from "@/lib/auth/audit";
import { roleHasPermission } from "@/lib/auth/permissions";
import { CreateInventoryItemSchema } from "@/lib/validations/inventory";

export const dynamic = "force-dynamic";

export async function GET(
  req: Request,
  context: { params: Promise<{ societyId: string }> }
) {
  try {
    const { societyId } = await context.params;
    const { identity } = await requireSocietyAccess(societyId);

    if (!roleHasPermission(identity.currentRole, "inventory.view")) {
      return NextResponse.json({ error: "Forbidden: insufficient permissions" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const category = searchParams.get("category");
    const status = searchParams.get("status");
    const lowStockOnly = searchParams.get("lowStockOnly") === "true";
    const search = searchParams.get("search");

    const adminClient = createAdminClient();
    let query = adminClient
      .from("inventory_items")
      .select("*")
      .eq("society_id", societyId)
      .order("created_at", { ascending: false });

    if (status && status !== "ALL") {
      query = query.eq("status", status);
    }
    if (category && category !== "ALL") {
      query = query.eq("category", category);
    }
    if (search) {
      query = query.or(`name.ilike.%${search}%,item_code.ilike.%${search}%,storage_location.ilike.%${search}%`);
    }

    const { data: items, error } = await query;

    if (error) {
      console.error("[API/inventory GET] Error:", error);
      return NextResponse.json({ error: "Failed to fetch inventory items" }, { status: 500 });
    }

    const allItems = items || [];
    const lowStockItems = allItems.filter(
      (item) => item.status === "ACTIVE" && Number(item.current_quantity) <= Number(item.min_reorder_level)
    );

    const filteredItems = lowStockOnly ? lowStockItems : allItems;

    return NextResponse.json({
      items: filteredItems,
      totalCount: allItems.length,
      lowStockCount: lowStockItems.length,
    });
  } catch (err: any) {
    console.error("[API/inventory GET] Server error:", err);
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

    if (!roleHasPermission(identity.currentRole, "inventory.manage")) {
      return NextResponse.json({ error: "Forbidden: requires inventory.manage permission" }, { status: 403 });
    }

    const body = await req.json();
    const parsed = CreateInventoryItemSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const adminClient = createAdminClient();

    // Auto-generate item code if omitted
    let itemCode = parsed.data.item_code?.trim();
    if (!itemCode) {
      const year = new Date().getFullYear();
      const { count } = await adminClient
        .from("inventory_items")
        .select("id", { count: "exact", head: true })
        .eq("society_id", societyId);
      const nextNum = (count || 0) + 1;
      itemCode = `ITM-${year}-${String(nextNum).padStart(4, "0")}`;
    }

    const openingQty = parsed.data.opening_quantity || 0;

    const { data: item, error: insertErr } = await adminClient
      .from("inventory_items")
      .insert({
        ...parsed.data,
        society_id: societyId,
        item_code: itemCode,
        opening_quantity: openingQty,
        current_quantity: openingQty,
        created_by: identity.effectiveUser.id,
        updated_by: identity.effectiveUser.id,
      })
      .select()
      .single();

    if (insertErr) {
      console.error("[API/inventory POST] Error:", insertErr);
      return NextResponse.json({ error: insertErr.message || "Failed to create inventory item" }, { status: 500 });
    }

    // If opening quantity > 0, log initial movement for complete audit trail
    if (openingQty > 0) {
      await adminClient.from("inventory_stock_movements").insert({
        society_id: societyId,
        item_id: item.id,
        movement_type: "RECEIPT",
        quantity: openingQty,
        quantity_delta: openingQty,
        balance_before: 0,
        balance_after: openingQty,
        unit_price: item.unit_cost,
        total_cost: openingQty * item.unit_cost,
        movement_date: new Date().toISOString().split("T")[0],
        purpose: "Opening Balance / Initial Inventory Setup",
        created_by: identity.effectiveUser.id,
      });
    }

    await recordAuditLog({
      actorUserId: identity.originalUser.id,
      effectiveUserId: identity.effectiveUser.id,
      societyId,
      action: "INVENTORY_ITEM_CREATED",
      resourceType: "inventory_items",
      resourceId: item.id,
      metadata: {
        item_code: item.item_code,
        name: item.name,
        category: item.category,
        opening_quantity: openingQty,
      },
    });

    return NextResponse.json({ success: true, item }, { status: 201 });
  } catch (err: any) {
    console.error("[API/inventory POST] Server error:", err);
    return NextResponse.json({ error: err?.message || "Internal Server Error" }, { status: 500 });
  }
}
