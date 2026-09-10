import React from "react";
import { requireSocietyAccess } from "@/lib/auth/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { roleHasPermission } from "@/lib/auth/permissions";
import { redirect } from "next/navigation";
import { getBuildingsWithHierarchy } from "@/lib/services/buildingService";
import { AssetsHubClient } from "./AssetsHubClient";
import {
  Asset,
  AssetMaintenanceRecord,
  InventoryItem,
  InventoryStockMovement,
} from "@/lib/types/database";

export const dynamic = "force-dynamic";

export default async function AssetsPage({
  params,
}: {
  params: Promise<{ societyId: string }>;
}) {
  const { societyId } = await params;
  const { identity } = await requireSocietyAccess(societyId);

  const hasViewPermission =
    roleHasPermission(identity.currentRole, "assets.view") ||
    roleHasPermission(identity.currentRole, "inventory.view");

  if (!hasViewPermission) {
    redirect("/unauthorized");
  }

  const adminClient = createAdminClient();

  const today = new Date().toISOString().split("T")[0];
  const thirtyDaysLater = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    .toISOString()
    .split("T")[0];

  // Parallel data fetching for performance
  const [
    assetsRes,
    maintenanceRes,
    inventoryRes,
    movementsRes,
    handoverAssetsRes,
    buildings,
  ] = await Promise.all([
    adminClient
      .from("assets")
      .select(`
        *,
        building:buildings (id, name, code),
        wing:wings (id, name, code),
        assignee:profiles!assets_assigned_to_fkey (id, full_name, display_name)
      `)
      .eq("society_id", societyId)
      .order("created_at", { ascending: false }),

    adminClient
      .from("asset_maintenance_records")
      .select(`
        *,
        asset:assets (id, asset_code, name),
        creator:profiles!asset_maintenance_records_created_by_fkey (id, full_name, display_name)
      `)
      .eq("society_id", societyId)
      .order("service_date", { ascending: false })
      .limit(100),

    adminClient
      .from("inventory_items")
      .select("*")
      .eq("society_id", societyId)
      .order("name", { ascending: true }),

    adminClient
      .from("inventory_stock_movements")
      .select(`
        *,
        item:inventory_items (id, item_code, name, unit_of_measure),
        creator:profiles!inventory_stock_movements_created_by_fkey (id, full_name, display_name),
        building:buildings (id, name, code)
      `)
      .eq("society_id", societyId)
      .order("created_at", { ascending: false })
      .limit(100),

    adminClient
      .from("handover_assets")
      .select(`
        *,
        project:handover_projects!handover_assets_handover_project_id_fkey (id, title, status)
      `)
      .eq("society_id", societyId)
      .in("status", ["ACCEPTED", "OPERATIONAL"]),

    getBuildingsWithHierarchy(societyId),
  ]);

  const assets = (assetsRes.data as Asset[]) || [];
  const maintenanceRecords = (maintenanceRes.data as AssetMaintenanceRecord[]) || [];
  const inventoryItems = (inventoryRes.data as InventoryItem[]) || [];
  const stockMovements = (movementsRes.data as InventoryStockMovement[]) || [];

  // Filter unimported handover equipment
  const importedHandoverIds = new Set(
    assets.map((a) => a.handover_asset_id).filter(Boolean)
  );
  const unimportedHandoverAssets = (handoverAssetsRes.data || []).filter(
    (ha: any) => !importedHandoverIds.has(ha.id)
  );

  // Compute KPIs
  const totalAssets = assets.length;
  const activeAssets = assets.filter((a) => a.status === "ACTIVE").length;
  const underMaintenance = assets.filter((a) => a.status === "UNDER_MAINTENANCE").length;
  const totalAssetValue = assets
    .filter((a) => a.status !== "DISPOSED" && a.status !== "LOST")
    .reduce((sum, a) => sum + (Number(a.purchase_cost) || 0), 0);

  const expiringWarrantiesOrAmcs = assets.filter((a) => {
    const wExp = a.warranty_end && a.warranty_end >= today && a.warranty_end <= thirtyDaysLater;
    const aExp = a.amc_end && a.amc_end >= today && a.amc_end <= thirtyDaysLater;
    return wExp || aExp;
  }).length;

  const lowStockItems = inventoryItems.filter(
    (i) => i.status === "ACTIVE" && Number(i.current_quantity) <= Number(i.min_reorder_level)
  );

  const kpis = {
    totalAssets,
    activeAssets,
    underMaintenance,
    totalAssetValue,
    expiringWarrantiesOrAmcs,
    totalInventoryItems: inventoryItems.filter((i) => i.status === "ACTIVE").length,
    lowStockCount: lowStockItems.length,
    unimportedHandoverCount: unimportedHandoverAssets.length,
  };

  const permissions = {
    canViewAssets: roleHasPermission(identity.currentRole, "assets.view"),
    canManageAssets: roleHasPermission(identity.currentRole, "assets.manage"),
    canMaintainAssets:
      roleHasPermission(identity.currentRole, "assets.maintain") ||
      roleHasPermission(identity.currentRole, "assets.manage"),
    canDisposeAssets:
      roleHasPermission(identity.currentRole, "assets.dispose") ||
      roleHasPermission(identity.currentRole, "assets.manage"),
    canViewInventory: roleHasPermission(identity.currentRole, "inventory.view"),
    canManageInventory: roleHasPermission(identity.currentRole, "inventory.manage"),
    canIssueInventory:
      roleHasPermission(identity.currentRole, "inventory.issue") ||
      roleHasPermission(identity.currentRole, "inventory.manage"),
    canAdjustInventory:
      roleHasPermission(identity.currentRole, "inventory.adjust") ||
      roleHasPermission(identity.currentRole, "inventory.manage"),
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto py-2">
      <AssetsHubClient
        societyId={societyId}
        initialAssets={assets}
        initialMaintenanceRecords={maintenanceRecords}
        initialInventory={inventoryItems}
        initialMovements={stockMovements}
        initialHandoverAssets={unimportedHandoverAssets}
        buildings={buildings}
        kpis={kpis}
        permissions={permissions}
        userRole={identity.currentRole}
        userId={identity.effectiveUser.id}
      />
    </div>
  );
}
