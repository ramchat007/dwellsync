import { NextResponse } from "next/server";
import { requireSocietyAccess } from "@/lib/auth/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { recordAuditLog } from "@/lib/auth/audit";
import { roleHasPermission } from "@/lib/auth/permissions";
import { CreateStockMovementSchema } from "@/lib/validations/inventory";
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

    // Verify item belongs to society
    const { data: item, error: itemErr } = await adminClient
      .from("inventory_items")
      .select("id, item_code, name, current_quantity, unit_of_measure")
      .eq("id", itemId)
      .eq("society_id", societyId)
      .single();

    if (itemErr || !item) {
      return NextResponse.json({ error: "Inventory item not found" }, { status: 404 });
    }

    const { data: movements, error } = await adminClient
      .from("inventory_stock_movements")
      .select(`
        *,
        creator:profiles!inventory_stock_movements_created_by_fkey (id, full_name, display_name),
        building:buildings (id, name, code),
        unit:units (id, unit_number)
      `)
      .eq("item_id", itemId)
      .eq("society_id", societyId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("[API/inventory/[itemId]/movements GET] Error:", error);
      return NextResponse.json({ error: "Failed to fetch stock movements" }, { status: 500 });
    }

    return NextResponse.json({ item, movements: movements || [] });
  } catch (err: any) {
    console.error("[API/inventory/[itemId]/movements GET] Server error:", err);
    return NextResponse.json({ error: err?.message || "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(
  req: Request,
  context: { params: Promise<{ societyId: string; itemId: string }> }
) {
  try {
    const { societyId, itemId } = await context.params;
    const { identity } = await requireSocietyAccess(societyId);

    if (!z.string().uuid().safeParse(itemId).success) {
      return NextResponse.json({ error: "Invalid item ID" }, { status: 400 });
    }

    const body = await req.json();
    const parsed = CreateStockMovementSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    // Role permission check depending on movement type
    const movementType = parsed.data.movement_type;
    const currentRole = identity.currentRole;

    if (movementType === "ISSUE") {
      if (
        !roleHasPermission(currentRole, "inventory.issue") &&
        !roleHasPermission(currentRole, "inventory.manage")
      ) {
        return NextResponse.json(
          { error: "Forbidden: requires inventory.issue or inventory.manage permission" },
          { status: 403 }
        );
      }
    } else if (movementType === "ADJUSTMENT") {
      if (
        !roleHasPermission(currentRole, "inventory.adjust") &&
        !roleHasPermission(currentRole, "inventory.manage")
      ) {
        return NextResponse.json(
          { error: "Forbidden: requires inventory.adjust or inventory.manage permission" },
          { status: 403 }
        );
      }
    } else {
      // RECEIPT or RETURN
      if (!roleHasPermission(currentRole, "inventory.manage")) {
        return NextResponse.json(
          { error: "Forbidden: requires inventory.manage permission" },
          { status: 403 }
        );
      }
    }

    const adminClient = createAdminClient();

    // Fetch existing item
    const { data: item, error: itemErr } = await adminClient
      .from("inventory_items")
      .select("id, item_code, name, status, current_quantity, unit_cost")
      .eq("id", itemId)
      .eq("society_id", societyId)
      .single();

    if (itemErr || !item) {
      return NextResponse.json({ error: "Inventory item not found" }, { status: 404 });
    }

    if (item.status === "DISCONTINUED") {
      return NextResponse.json(
        { error: "Cannot record stock movements for a discontinued inventory item." },
        { status: 400 }
      );
    }

    const quantity = parsed.data.quantity;
    let delta = 0;

    if (movementType === "RECEIPT" || movementType === "RETURN") {
      delta = quantity;
    } else if (movementType === "ISSUE") {
      delta = -quantity;
    } else if (movementType === "ADJUSTMENT") {
      delta = parsed.data.is_reduction ? -quantity : quantity;
    }

    const balanceBefore = Number(item.current_quantity) || 0;
    const balanceAfter = balanceBefore + delta;

    if (balanceAfter < 0) {
      return NextResponse.json(
        {
          error: `Insufficient stock. Current balance is ${balanceBefore}, cannot issue/reduce by ${Math.abs(delta)}.`,
        },
        { status: 400 }
      );
    }

    const unitPrice =
      parsed.data.unit_price !== undefined && parsed.data.unit_price > 0
        ? parsed.data.unit_price
        : Number(item.unit_cost) || 0;

    const totalCost = Number((unitPrice * quantity).toFixed(2));

    // Update item current_quantity
    const { error: updateErr } = await adminClient
      .from("inventory_items")
      .update({
        current_quantity: balanceAfter,
        updated_by: identity.effectiveUser.id,
        updated_at: new Date().toISOString(),
      })
      .eq("id", itemId)
      .eq("society_id", societyId);

    if (updateErr) {
      console.error("[API/inventory/[itemId]/movements POST] Error updating stock:", updateErr);
      return NextResponse.json({ error: "Failed to update item balance" }, { status: 500 });
    }

    // Insert stock movement record
    const movementInsert = {
      society_id: societyId,
      item_id: itemId,
      movement_type: movementType,
      quantity: quantity,
      quantity_delta: delta,
      balance_before: balanceBefore,
      balance_after: balanceAfter,
      unit_price: unitPrice,
      total_cost: totalCost,
      movement_date: parsed.data.movement_date || new Date().toISOString().split("T")[0],
      issued_to_name: parsed.data.issued_to_name || null,
      issued_to_profile_id: parsed.data.issued_to_profile_id || null,
      department: parsed.data.department || null,
      purpose: parsed.data.purpose || null,
      building_id: parsed.data.building_id || null,
      unit_id: parsed.data.unit_id || null,
      adjustment_reason: parsed.data.adjustment_reason || null,
      notes: parsed.data.notes || null,
      expense_voucher_id: parsed.data.expense_voucher_id || null,
      created_by: identity.effectiveUser.id,
    };

    const { data: movement, error: insertErr } = await adminClient
      .from("inventory_stock_movements")
      .insert(movementInsert)
      .select(`
        *,
        creator:profiles!inventory_stock_movements_created_by_fkey (id, full_name, display_name)
      `)
      .single();

    if (insertErr) {
      console.error("[API/inventory/[itemId]/movements POST] Insert error:", insertErr);
      return NextResponse.json({ error: "Failed to create stock movement record" }, { status: 500 });
    }

    await recordAuditLog({
      actorUserId: identity.originalUser.id,
      effectiveUserId: identity.effectiveUser.id,
      societyId,
      action: "STOCK_MOVEMENT_RECORDED",
      resourceType: "inventory_stock_movements",
      resourceId: movement.id,
      metadata: {
        item_id: itemId,
        item_code: item.item_code,
        item_name: item.name,
        movement_type: movementType,
        quantity,
        delta,
        balance_before: balanceBefore,
        balance_after: balanceAfter,
      },
    });

    return NextResponse.json(
      {
        success: true,
        movement,
        new_quantity: balanceAfter,
      },
      { status: 201 }
    );
  } catch (err: any) {
    console.error("[API/inventory/[itemId]/movements POST] Server error:", err);
    return NextResponse.json({ error: err?.message || "Internal Server Error" }, { status: 500 });
  }
}
