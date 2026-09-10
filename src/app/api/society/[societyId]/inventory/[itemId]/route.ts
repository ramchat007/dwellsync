import { NextResponse } from "next/server";
import { requireSocietyAccess } from "@/lib/auth/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { recordAuditLog } from "@/lib/auth/audit";
import { roleHasPermission } from "@/lib/auth/permissions";
import { UpdateInventoryItemSchema } from "@/lib/validations/inventory";
import { z } from "zod";

export const dynamic = "force-dynamic";

export async function GET(
  req: Request,
  context: { params: Promise<{ societyId: string; itemId: string }> }
) {
  try {
    const { societyId, itemId } = await context.params;
    const { identity } = await requireSocietyAccess(societyId);

    if (!roleHasPermission(identity.currentRole, "inventory.view")) {
      return NextResponse.json({ error: "Forbidden: insufficient permissions" }, { status: 403 });
    }

    if (!z.string().uuid().safeParse(itemId).success) {
      return NextResponse.json({ error: "Invalid item ID" }, { status: 400 });
    }

    const adminClient = createAdminClient();
    const { data: item, error } = await adminClient
      .from("inventory_items")
      .select("*")
      .eq("id", itemId)
      .eq("society_id", societyId)
      .single();

    if (error || !item) {
      return NextResponse.json({ error: "Inventory item not found" }, { status: 404 });
    }

    // Fetch recent 10 movements
    const { data: recentMovements } = await adminClient
      .from("inventory_stock_movements")
      .select(`
        *,
        creator:profiles!inventory_stock_movements_created_by_fkey (id, full_name, display_name)
      `)
      .eq("item_id", itemId)
      .eq("society_id", societyId)
      .order("created_at", { ascending: false })
      .limit(10);

    return NextResponse.json({ item, recentMovements: recentMovements || [] });
  } catch (err: any) {
    console.error("[API/inventory/[itemId] GET] Server error:", err);
    return NextResponse.json({ error: err?.message || "Internal Server Error" }, { status: 500 });
  }
}

export async function PATCH(
  req: Request,
  context: { params: Promise<{ societyId: string; itemId: string }> }
) {
  try {
    const { societyId, itemId } = await context.params;
    const { identity } = await requireSocietyAccess(societyId);

    if (!roleHasPermission(identity.currentRole, "inventory.manage")) {
      return NextResponse.json({ error: "Forbidden: requires inventory.manage permission" }, { status: 403 });
    }

    if (!z.string().uuid().safeParse(itemId).success) {
      return NextResponse.json({ error: "Invalid item ID" }, { status: 400 });
    }

    const body = await req.json();
    const parsed = UpdateInventoryItemSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const adminClient = createAdminClient();

    const { data: existing, error: fetchErr } = await adminClient
      .from("inventory_items")
      .select("id, item_code, name, status")
      .eq("id", itemId)
      .eq("society_id", societyId)
      .single();

    if (fetchErr || !existing) {
      return NextResponse.json({ error: "Inventory item not found" }, { status: 404 });
    }

    const updates = {
      ...parsed.data,
      updated_by: identity.effectiveUser.id,
      updated_at: new Date().toISOString(),
    };

    const { data: updated, error: updateErr } = await adminClient
      .from("inventory_items")
      .update(updates)
      .eq("id", itemId)
      .eq("society_id", societyId)
      .select()
      .single();

    if (updateErr) {
      console.error("[API/inventory/[itemId] PATCH] Error:", updateErr);
      return NextResponse.json({ error: updateErr.message || "Failed to update item" }, { status: 500 });
    }

    await recordAuditLog({
      actorUserId: identity.originalUser.id,
      effectiveUserId: identity.effectiveUser.id,
      societyId,
      action: "INVENTORY_ITEM_UPDATED",
      resourceType: "inventory_items",
      resourceId: itemId,
      metadata: {
        item_code: existing.item_code,
        name: existing.name,
        changes: Object.keys(parsed.data),
      },
    });

    return NextResponse.json({ success: true, item: updated });
  } catch (err: any) {
    console.error("[API/inventory/[itemId] PATCH] Server error:", err);
    return NextResponse.json({ error: err?.message || "Internal Server Error" }, { status: 500 });
  }
}
