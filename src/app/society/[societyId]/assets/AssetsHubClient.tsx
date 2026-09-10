"use client";

import React, { useState, useMemo } from "react";
import {
  Asset,
  AssetCategory,
  AssetStatus,
  AssetCondition,
  AssetMaintenanceRecord,
  MaintenanceType,
  MaintenanceStatus,
  InventoryItem,
  InventoryCategory,
  UnitOfMeasure,
  InventoryStockMovement,
  MovementType,
  AdjustmentReason,
  RoleId,
} from "@/lib/types/database";
import { BuildingWithHierarchy } from "@/lib/services/buildingService";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Boxes,
  Package,
  Wrench,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Plus,
  Search,
  Trash2,
  Eye,
  ShieldCheck,
  Layers,
  Building2,
  X,
} from "lucide-react";

interface AssetsHubClientProps {
  societyId: string;
  initialAssets: Asset[];
  initialMaintenanceRecords: AssetMaintenanceRecord[];
  initialInventory: InventoryItem[];
  initialMovements: InventoryStockMovement[];
  initialHandoverAssets: any[];
  buildings: BuildingWithHierarchy[];
  kpis: {
    totalAssets: number;
    activeAssets: number;
    underMaintenance: number;
    totalAssetValue: number;
    expiringWarrantiesOrAmcs: number;
    totalInventoryItems: number;
    lowStockCount: number;
    unimportedHandoverCount: number;
  };
  permissions: {
    canViewAssets: boolean;
    canManageAssets: boolean;
    canMaintainAssets: boolean;
    canDisposeAssets: boolean;
    canViewInventory: boolean;
    canManageInventory: boolean;
    canIssueInventory: boolean;
    canAdjustInventory: boolean;
  };
  userRole: RoleId | null;
  userId: string;
}

type TabType = "ASSETS" | "MAINTENANCE" | "INVENTORY" | "MOVEMENTS" | "HANDOVER";

const ASSET_CATEGORIES: { label: string; value: AssetCategory }[] = [
  { label: "Electrical & Substation", value: "ELECTRICAL" },
  { label: "Plumbing & Pumps", value: "PLUMBING" },
  { label: "HVAC & Elevators", value: "HVAC_LIFTS" },
  { label: "Fire Safety Systems", value: "FIRE_SAFETY" },
  { label: "CCTV & Security", value: "SECURITY_SURVEILLANCE" },
  { label: "DG & Power Backup", value: "DG_POWER" },
  { label: "Civil Infrastructure", value: "CIVIL_INFRASTRUCTURE" },
  { label: "Common Area Furniture", value: "COMMON_AREA_FURNITURE" },
  { label: "Clubhouse & Gym", value: "CLUBHOUSE_GYM" },
  { label: "Gardening & Landscaping", value: "GARDENING_LANDSCAPING" },
  { label: "Office & IT Systems", value: "OFFICE_IT" },
  { label: "Other Asset", value: "OTHER" },
];

const INVENTORY_CATEGORIES: { label: string; value: InventoryCategory }[] = [
  { label: "Electrical Consumables", value: "ELECTRICAL" },
  { label: "Plumbing Parts", value: "PLUMBING" },
  { label: "Housekeeping & Chemicals", value: "HOUSEKEEPING" },
  { label: "Security & Stationery", value: "SECURITY_STATIONERY" },
  { label: "Civil & Masonry Supplies", value: "CIVIL_REPAIR" },
  { label: "Hardware & Tools", value: "HARDWARE_TOOLS" },
  { label: "Gardening Supplies", value: "GARDENING" },
  { label: "Fire Safety Consumables", value: "FIRE_SAFETY" },
  { label: "Office Supplies", value: "OFFICE_SUPPLIES" },
  { label: "Other Consumables", value: "OTHER" },
];

const UNITS_OF_MEASURE: { label: string; value: UnitOfMeasure }[] = [
  { label: "Pieces (Pcs)", value: "PIECES" },
  { label: "Meters (m)", value: "METERS" },
  { label: "Liters (L)", value: "LITERS" },
  { label: "Kilograms (Kg)", value: "KGS" },
  { label: "Boxes", value: "BOXES" },
  { label: "Packets", value: "PACKETS" },
  { label: "Sets", value: "SETS" },
  { label: "Rolls", value: "ROLLS" },
  { label: "Other", value: "OTHER" },
];

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatDate(dateString?: string | null): string {
  if (!dateString) return "—";
  return new Date(dateString).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function AssetsHubClient({
  societyId,
  initialAssets,
  initialMaintenanceRecords,
  initialInventory,
  initialMovements,
  initialHandoverAssets,
  buildings,
  kpis,
  permissions,
}: AssetsHubClientProps) {
  const [activeTab, setActiveTab] = useState<TabType>("ASSETS");
  const [assets, setAssets] = useState<Asset[]>(initialAssets);
  const [maintenanceRecords, setMaintenanceRecords] = useState<AssetMaintenanceRecord[]>(
    initialMaintenanceRecords
  );
  const [inventory, setInventory] = useState<InventoryItem[]>(initialInventory);
  const [movements, setMovements] = useState<InventoryStockMovement[]>(initialMovements);
  const [handoverAssets, setHandoverAssets] = useState<any[]>(initialHandoverAssets);

  // Asset Filters
  const [assetSearch, setAssetSearch] = useState("");
  const [assetCategoryFilter, setAssetCategoryFilter] = useState("ALL");
  const [assetStatusFilter, setAssetStatusFilter] = useState("ALL");
  const [assetBuildingFilter, setAssetBuildingFilter] = useState("ALL");

  // Maintenance Filters
  const [maintSearch, setMaintSearch] = useState("");
  const [maintStatusFilter, setMaintStatusFilter] = useState("ALL");
  const [maintTypeFilter, setMaintTypeFilter] = useState("ALL");

  // Inventory Filters
  const [invSearch, setInvSearch] = useState("");
  const [invCategoryFilter, setInvCategoryFilter] = useState("ALL");
  const [showLowStockOnly, setShowLowStockOnly] = useState(false);

  // Movement Filters
  const [movementSearch, setMovementSearch] = useState("");
  const [movementTypeFilter, setMovementTypeFilter] = useState("ALL");

  // Modals
  const [showCreateAssetModal, setShowCreateAssetModal] = useState(false);
  const [selectedAssetForView, setSelectedAssetForView] = useState<Asset | null>(null);
  const [assetToDispose, setAssetToDispose] = useState<Asset | null>(null);
  const [showCreateMaintModal, setShowCreateMaintModal] = useState(false);
  const [preselectedAssetId, setPreselectedAssetId] = useState<string>("");
  const [showCreateInvModal, setShowCreateInvModal] = useState(false);
  const [movementModalItem, setMovementModalItem] = useState<InventoryItem | null>(null);
  const [movementDefaultType, setMovementDefaultType] = useState<MovementType>("RECEIPT");
  const [handoverToImport, setHandoverToImport] = useState<any | null>(null);

  // Forms & Loading states
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Filtered Assets
  const filteredAssets = useMemo(() => {
    return assets.filter((a) => {
      const matchesSearch =
        assetSearch === "" ||
        a.name.toLowerCase().includes(assetSearch.toLowerCase()) ||
        a.asset_code.toLowerCase().includes(assetSearch.toLowerCase()) ||
        (a.location_description &&
          a.location_description.toLowerCase().includes(assetSearch.toLowerCase())) ||
        (a.manufacturer && a.manufacturer.toLowerCase().includes(assetSearch.toLowerCase()));

      const matchesCat = assetCategoryFilter === "ALL" || a.category === assetCategoryFilter;
      const matchesStatus = assetStatusFilter === "ALL" || a.status === assetStatusFilter;
      const matchesBuilding =
        assetBuildingFilter === "ALL" || a.building_id === assetBuildingFilter;

      return matchesSearch && matchesCat && matchesStatus && matchesBuilding;
    });
  }, [assets, assetSearch, assetCategoryFilter, assetStatusFilter, assetBuildingFilter]);

  // Filtered Maintenance
  const filteredMaintenance = useMemo(() => {
    return maintenanceRecords.filter((m) => {
      const matchesSearch =
        maintSearch === "" ||
        m.title.toLowerCase().includes(maintSearch.toLowerCase()) ||
        (m.asset?.name && m.asset.name.toLowerCase().includes(maintSearch.toLowerCase())) ||
        (m.asset?.asset_code &&
          m.asset.asset_code.toLowerCase().includes(maintSearch.toLowerCase())) ||
        (m.vendor_name && m.vendor_name.toLowerCase().includes(maintSearch.toLowerCase())) ||
        (m.technician_name && m.technician_name.toLowerCase().includes(maintSearch.toLowerCase()));

      const matchesStatus = maintStatusFilter === "ALL" || m.status === maintStatusFilter;
      const matchesType = maintTypeFilter === "ALL" || m.maintenance_type === maintTypeFilter;

      return matchesSearch && matchesStatus && matchesType;
    });
  }, [maintenanceRecords, maintSearch, maintStatusFilter, maintTypeFilter]);

  // Filtered Inventory
  const filteredInventory = useMemo(() => {
    return inventory.filter((i) => {
      const matchesSearch =
        invSearch === "" ||
        i.name.toLowerCase().includes(invSearch.toLowerCase()) ||
        i.item_code.toLowerCase().includes(invSearch.toLowerCase()) ||
        (i.storage_location &&
          i.storage_location.toLowerCase().includes(invSearch.toLowerCase())) ||
        (i.supplier_name && i.supplier_name.toLowerCase().includes(invSearch.toLowerCase()));

      const matchesCat = invCategoryFilter === "ALL" || i.category === invCategoryFilter;
      const isLowStock = Number(i.current_quantity) <= Number(i.min_reorder_level);
      const matchesLowStock = !showLowStockOnly || isLowStock;

      return matchesSearch && matchesCat && matchesLowStock;
    });
  }, [inventory, invSearch, invCategoryFilter, showLowStockOnly]);

  // Filtered Movements
  const filteredMovements = useMemo(() => {
    return movements.filter((mv) => {
      const matchesSearch =
        movementSearch === "" ||
        (mv.item?.name && mv.item.name.toLowerCase().includes(movementSearch.toLowerCase())) ||
        (mv.item?.item_code &&
          mv.item.item_code.toLowerCase().includes(movementSearch.toLowerCase())) ||
        (mv.issued_to_name &&
          mv.issued_to_name.toLowerCase().includes(movementSearch.toLowerCase())) ||
        (mv.purpose && mv.purpose.toLowerCase().includes(movementSearch.toLowerCase())) ||
        (mv.notes && mv.notes.toLowerCase().includes(movementSearch.toLowerCase()));

      const matchesType =
        movementTypeFilter === "ALL" || mv.movement_type === movementTypeFilter;

      return matchesSearch && matchesType;
    });
  }, [movements, movementSearch, movementTypeFilter]);

  // Status & condition badge helpers
  const getAssetStatusBadge = (status: AssetStatus) => {
    switch (status) {
      case "ACTIVE":
        return <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200">Active</Badge>;
      case "UNDER_MAINTENANCE":
        return <Badge className="bg-amber-100 text-amber-800 border-amber-200">Under Maintenance</Badge>;
      case "DAMAGED":
        return <Badge className="bg-rose-100 text-rose-800 border-rose-200">Damaged</Badge>;
      case "DISPOSED":
        return <Badge className="bg-slate-100 text-slate-800 border-slate-200">Disposed</Badge>;
      case "LOST":
        return <Badge className="bg-red-100 text-red-800 border-red-200">Lost</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getConditionBadge = (condition: AssetCondition) => {
    switch (condition) {
      case "EXCELLENT":
        return <Badge variant="outline" className="text-emerald-700 border-emerald-300">Excellent</Badge>;
      case "GOOD":
        return <Badge variant="outline" className="text-blue-700 border-blue-300">Good</Badge>;
      case "FAIR":
        return <Badge variant="outline" className="text-amber-700 border-amber-300">Fair</Badge>;
      case "POOR":
        return <Badge variant="outline" className="text-orange-700 border-orange-300">Poor</Badge>;
      case "SCRAP":
        return <Badge variant="outline" className="text-rose-700 border-rose-300">Scrap</Badge>;
      default:
        return <Badge variant="outline">{condition}</Badge>;
    }
  };

  // ==========================================
  // HANDLERS: ASSETS
  // ==========================================
  const handleCreateAsset = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setFormLoading(true);
    setFormError(null);

    const formData = new FormData(e.currentTarget);
    const payload = {
      asset_code: (formData.get("asset_code") as string)?.trim() || undefined,
      name: (formData.get("name") as string)?.trim(),
      description: (formData.get("description") as string)?.trim() || null,
      category: formData.get("category") as AssetCategory,
      building_id: (formData.get("building_id") as string) || null,
      wing_id: (formData.get("wing_id") as string) || null,
      location_description: (formData.get("location_description") as string)?.trim() || null,
      purchase_date: (formData.get("purchase_date") as string) || null,
      purchase_cost: Number(formData.get("purchase_cost")) || 0,
      vendor_name: (formData.get("vendor_name") as string)?.trim() || null,
      status: (formData.get("status") as AssetStatus) || "ACTIVE",
      condition: (formData.get("condition") as AssetCondition) || "GOOD",
      department: (formData.get("department") as string)?.trim() || null,
      manufacturer: (formData.get("manufacturer") as string)?.trim() || null,
      model_number: (formData.get("model_number") as string)?.trim() || null,
      serial_number: (formData.get("serial_number") as string)?.trim() || null,
      warranty_provider: (formData.get("warranty_provider") as string)?.trim() || null,
      warranty_start: (formData.get("warranty_start") as string) || null,
      warranty_end: (formData.get("warranty_end") as string) || null,
      amc_vendor: (formData.get("amc_vendor") as string)?.trim() || null,
      amc_start: (formData.get("amc_start") as string) || null,
      amc_end: (formData.get("amc_end") as string) || null,
      amc_cost: Number(formData.get("amc_cost")) || 0,
      expected_life_years: formData.get("expected_life_years")
        ? Number(formData.get("expected_life_years"))
        : null,
      notes: (formData.get("notes") as string)?.trim() || null,
    };

    try {
      const res = await fetch(`/api/society/${societyId}/assets`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to create asset");
      }

      setAssets([data.asset, ...assets]);
      setShowCreateAssetModal(false);
    } catch (err: any) {
      setFormError(err.message);
    } finally {
      setFormLoading(false);
    }
  };

  const handleDisposeAsset = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!assetToDispose) return;

    setFormLoading(true);
    setFormError(null);

    const formData = new FormData(e.currentTarget);
    const payload = {
      disposal_date: formData.get("disposal_date") as string,
      disposal_reason: formData.get("disposal_reason") as string,
      disposal_value: Number(formData.get("disposal_value")) || 0,
      disposed_to: (formData.get("disposed_to") as string)?.trim() || null,
      notes: (formData.get("notes") as string)?.trim() || null,
    };

    try {
      const res = await fetch(`/api/society/${societyId}/assets/${assetToDispose.id}/dispose`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to dispose asset");
      }

      setAssets(assets.map((a) => (a.id === assetToDispose.id ? data.asset : a)));
      setAssetToDispose(null);
      if (selectedAssetForView?.id === assetToDispose.id) {
        setSelectedAssetForView(data.asset);
      }
    } catch (err: any) {
      setFormError(err.message);
    } finally {
      setFormLoading(false);
    }
  };

  // ==========================================
  // HANDLERS: MAINTENANCE
  // ==========================================
  const handleCreateMaintenance = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setFormLoading(true);
    setFormError(null);

    const formData = new FormData(e.currentTarget);
    const assetId = formData.get("asset_id") as string;
    const payload = {
      title: formData.get("title") as string,
      maintenance_type: formData.get("maintenance_type") as MaintenanceType,
      status: (formData.get("status") as MaintenanceStatus) || "SCHEDULED",
      service_date: formData.get("service_date") as string,
      completion_date: (formData.get("completion_date") as string) || null,
      work_description: formData.get("work_description") as string,
      vendor_name: (formData.get("vendor_name") as string)?.trim() || null,
      technician_name: (formData.get("technician_name") as string)?.trim() || null,
      technician_contact: (formData.get("technician_contact") as string)?.trim() || null,
      cost: Number(formData.get("cost")) || 0,
      is_covered_under_warranty: formData.get("is_covered_under_warranty") === "on",
      is_covered_under_amc: formData.get("is_covered_under_amc") === "on",
      next_service_date: (formData.get("next_service_date") as string) || null,
      notes: (formData.get("notes") as string)?.trim() || null,
    };

    try {
      const res = await fetch(`/api/society/${societyId}/assets/${assetId}/maintenance`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to create maintenance record");
      }

      setMaintenanceRecords([data.record, ...maintenanceRecords]);
      if (payload.status === "IN_PROGRESS") {
        setAssets(
          assets.map((a) => (a.id === assetId ? { ...a, status: "UNDER_MAINTENANCE" } : a))
        );
      }
      setShowCreateMaintModal(false);
      setPreselectedAssetId("");
    } catch (err: any) {
      setFormError(err.message);
    } finally {
      setFormLoading(false);
    }
  };

  const handleMarkMaintenanceCompleted = async (record: AssetMaintenanceRecord) => {
    try {
      const today = new Date().toISOString().split("T")[0];
      const res = await fetch(
        `/api/society/${societyId}/assets/${record.asset_id}/maintenance/${record.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            status: "COMPLETED",
            completion_date: today,
          }),
        }
      );

      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "Failed to update record");
        return;
      }

      setMaintenanceRecords(
        maintenanceRecords.map((m) => (m.id === record.id ? data.record : m))
      );
      setAssets(
        assets.map((a) => (a.id === record.asset_id ? { ...a, status: "ACTIVE" } : a))
      );
    } catch (err: any) {
      alert(err.message);
    }
  };

  // ==========================================
  // HANDLERS: INVENTORY & STOCK
  // ==========================================
  const handleCreateInventory = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setFormLoading(true);
    setFormError(null);

    const formData = new FormData(e.currentTarget);
    const payload = {
      item_code: (formData.get("item_code") as string)?.trim() || undefined,
      name: (formData.get("name") as string)?.trim(),
      description: (formData.get("description") as string)?.trim() || null,
      category: formData.get("category") as InventoryCategory,
      unit_of_measure: formData.get("unit_of_measure") as UnitOfMeasure,
      opening_quantity: Number(formData.get("opening_quantity")) || 0,
      min_reorder_level: Number(formData.get("min_reorder_level")) || 0,
      unit_cost: Number(formData.get("unit_cost")) || 0,
      supplier_name: (formData.get("supplier_name") as string)?.trim() || null,
      supplier_contact: (formData.get("supplier_contact") as string)?.trim() || null,
      storage_location: (formData.get("storage_location") as string)?.trim() || null,
      notes: (formData.get("notes") as string)?.trim() || null,
    };

    try {
      const res = await fetch(`/api/society/${societyId}/inventory`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to create inventory item");
      }

      setInventory([data.item, ...inventory]);
      setShowCreateInvModal(false);
    } catch (err: any) {
      setFormError(err.message);
    } finally {
      setFormLoading(false);
    }
  };

  const handleRecordMovement = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!movementModalItem) return;

    setFormLoading(true);
    setFormError(null);

    const formData = new FormData(e.currentTarget);
    const movementType = formData.get("movement_type") as MovementType;
    const isReduction =
      movementType === "ADJUSTMENT"
        ? formData.get("adjustment_direction") === "DECREASE"
        : undefined;

    const payload = {
      movement_type: movementType,
      quantity: Number(formData.get("quantity")),
      is_reduction: isReduction,
      adjustment_reason: (formData.get("adjustment_reason") as AdjustmentReason) || undefined,
      unit_price: Number(formData.get("unit_price")) || movementModalItem.unit_cost,
      movement_date: formData.get("movement_date") as string,
      issued_to_name: (formData.get("issued_to_name") as string)?.trim() || null,
      department: (formData.get("department") as string)?.trim() || null,
      purpose: (formData.get("purpose") as string)?.trim() || null,
      building_id: (formData.get("building_id") as string) || null,
      notes: (formData.get("notes") as string)?.trim() || null,
    };

    try {
      const res = await fetch(
        `/api/society/${societyId}/inventory/${movementModalItem.id}/movements`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to record movement");
      }

      setInventory(
        inventory.map((item) =>
          item.id === movementModalItem.id
            ? { ...item, current_quantity: data.new_quantity }
            : item
        )
      );

      const fullMovement: InventoryStockMovement = {
        ...data.movement,
        item: movementModalItem,
      };
      setMovements([fullMovement, ...movements]);
      setMovementModalItem(null);
    } catch (err: any) {
      setFormError(err.message);
    } finally {
      setFormLoading(false);
    }
  };

  // ==========================================
  // HANDLERS: HANDOVER IMPORT
  // ==========================================
  const handleImportHandover = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!handoverToImport) return;

    setFormLoading(true);
    setFormError(null);

    const formData = new FormData(e.currentTarget);
    const payload = {
      handover_asset_id: handoverToImport.id,
      category: formData.get("category") as AssetCategory,
      condition: (formData.get("condition") as AssetCondition) || "GOOD",
      building_id: (formData.get("building_id") as string) || null,
      wing_id: (formData.get("wing_id") as string) || null,
      location_description: (formData.get("location_description") as string)?.trim() || null,
      purchase_cost: Number(formData.get("purchase_cost")) || 0,
      notes: (formData.get("notes") as string)?.trim() || null,
    };

    try {
      const res = await fetch(`/api/society/${societyId}/assets/import-handover`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to import asset");
      }

      setAssets([data.asset, ...assets]);
      setHandoverAssets(handoverAssets.filter((h) => h.id !== handoverToImport.id));
      setHandoverToImport(null);
      setActiveTab("ASSETS");
    } catch (err: any) {
      setFormError(err.message);
    } finally {
      setFormLoading(false);
    }
  };

  // State for Cascading Building/Wing selection in modals
  const [modalBuildingId, setModalBuildingId] = useState("");
  const currentModalWings = useMemo(() => {
    return buildings.find((b) => b.id === modalBuildingId)?.wings || [];
  }, [buildings, modalBuildingId]);

  return (
    <div className="space-y-6">
      {/* Header & Page Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4">
        <div>
          <div className="flex items-center gap-2">
            <Boxes className="h-7 w-7 text-indigo-600" />
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              Assets & Inventory Management
            </h1>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Centralized register for society fixed assets, service & AMC contracts, and consumable stock.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {permissions.canManageAssets && (
            <Button
              onClick={() => {
                setFormError(null);
                setModalBuildingId("");
                setShowCreateAssetModal(true);
              }}
              className="bg-indigo-600 hover:bg-indigo-700 text-white"
            >
              <Plus className="h-4 w-4 mr-1.5" />
              Register Asset
            </Button>
          )}

          {permissions.canManageInventory && (
            <Button
              variant="outline"
              onClick={() => {
                setFormError(null);
                setShowCreateInvModal(true);
              }}
            >
              <Package className="h-4 w-4 mr-1.5" />
              Add Stock Item
            </Button>
          )}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-slate-200">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-500">Total Fixed Assets</p>
              <h3 className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
                {kpis.totalAssets}
              </h3>
              <p className="text-xs text-emerald-600 font-medium mt-0.5">
                {kpis.activeAssets} active in service
              </p>
            </div>
            <div className="p-3 bg-indigo-50 dark:bg-indigo-950 rounded-xl text-indigo-600">
              <Boxes className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-500">Asset Valuation</p>
              <h3 className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
                {formatCurrency(kpis.totalAssetValue)}
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">Acquisition cost total</p>
            </div>
            <div className="p-3 bg-emerald-50 dark:bg-emerald-950 rounded-xl text-emerald-600">
              <ShieldCheck className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-500">Under Maintenance</p>
              <h3 className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
                {kpis.underMaintenance}
              </h3>
              <p className="text-xs text-amber-600 font-medium mt-0.5">
                {kpis.expiringWarrantiesOrAmcs} warranties/AMCs expiring
              </p>
            </div>
            <div className="p-3 bg-amber-50 dark:bg-amber-950 rounded-xl text-amber-600">
              <Wrench className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-500">Consumables & Stock</p>
              <h3 className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
                {kpis.totalInventoryItems}
              </h3>
              <p
                className={`text-xs font-medium mt-0.5 ${
                  kpis.lowStockCount > 0 ? "text-rose-600 font-bold" : "text-emerald-600"
                }`}
              >
                {kpis.lowStockCount > 0
                  ? `${kpis.lowStockCount} items below reorder level`
                  : "All items well-stocked"}
              </p>
            </div>
            <div
              className={`p-3 rounded-xl ${
                kpis.lowStockCount > 0
                  ? "bg-rose-50 dark:bg-rose-950 text-rose-600"
                  : "bg-slate-50 dark:bg-slate-800 text-slate-600"
              }`}
            >
              <Package className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center space-x-1 border-b border-slate-200 overflow-x-auto pb-px">
        <button
          onClick={() => setActiveTab("ASSETS")}
          className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap flex items-center gap-2 ${
            activeTab === "ASSETS"
              ? "border-indigo-600 text-indigo-600"
              : "border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300"
          }`}
        >
          <Boxes className="h-4 w-4" />
          Asset Register ({assets.length})
        </button>

        <button
          onClick={() => setActiveTab("MAINTENANCE")}
          className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap flex items-center gap-2 ${
            activeTab === "MAINTENANCE"
              ? "border-indigo-600 text-indigo-600"
              : "border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300"
          }`}
        >
          <Wrench className="h-4 w-4" />
          Maintenance & Service ({maintenanceRecords.length})
        </button>

        <button
          onClick={() => setActiveTab("INVENTORY")}
          className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap flex items-center gap-2 ${
            activeTab === "INVENTORY"
              ? "border-indigo-600 text-indigo-600"
              : "border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300"
          }`}
        >
          <Package className="h-4 w-4" />
          Inventory & Consumables ({inventory.length})
          {kpis.lowStockCount > 0 && (
            <Badge className="bg-rose-600 text-white text-[10px] px-1.5 py-0 h-4">
              {kpis.lowStockCount}
            </Badge>
          )}
        </button>

        <button
          onClick={() => setActiveTab("MOVEMENTS")}
          className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap flex items-center gap-2 ${
            activeTab === "MOVEMENTS"
              ? "border-indigo-600 text-indigo-600"
              : "border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300"
          }`}
        >
          <Layers className="h-4 w-4" />
          Stock Movement Ledger ({movements.length})
        </button>

        <button
          onClick={() => setActiveTab("HANDOVER")}
          className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap flex items-center gap-2 ${
            activeTab === "HANDOVER"
              ? "border-indigo-600 text-indigo-600"
              : "border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300"
          }`}
        >
          <Building2 className="h-4 w-4" />
          Handover Imports
          {handoverAssets.length > 0 && (
            <Badge className="bg-amber-500 text-white text-[10px] px-1.5 py-0 h-4">
              {handoverAssets.length}
            </Badge>
          )}
        </button>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: ASSET REGISTER */}
      {/* ========================================================================= */}
      {activeTab === "ASSETS" && (
        <div className="space-y-4">
          {/* Filters Bar */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search assets by name, code, brand, or location..."
                value={assetSearch}
                onChange={(e) => setAssetSearch(e.target.value)}
                className="pl-9"
              />
            </div>

            <div className="flex flex-wrap gap-2">
              <select
                value={assetCategoryFilter}
                onChange={(e) => setAssetCategoryFilter(e.target.value)}
                className="h-10 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800"
              >
                <option value="ALL">All Categories</option>
                {ASSET_CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>

              <select
                value={assetStatusFilter}
                onChange={(e) => setAssetStatusFilter(e.target.value)}
                className="h-10 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800"
              >
                <option value="ALL">All Statuses</option>
                <option value="ACTIVE">Active</option>
                <option value="UNDER_MAINTENANCE">Under Maintenance</option>
                <option value="DAMAGED">Damaged</option>
                <option value="DISPOSED">Disposed</option>
                <option value="LOST">Lost</option>
              </select>

              {buildings.length > 0 && (
                <select
                  value={assetBuildingFilter}
                  onChange={(e) => setAssetBuildingFilter(e.target.value)}
                  className="h-10 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800"
                >
                  <option value="ALL">All Buildings</option>
                  {buildings.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              )}
            </div>
          </div>

          {/* Assets Table */}
          <Card className="border-slate-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left border-collapse">
                <thead className="bg-slate-50 text-slate-700 text-xs uppercase font-semibold border-b">
                  <tr>
                    <th className="px-4 py-3">Asset Code & Name</th>
                    <th className="px-4 py-3">Category</th>
                    <th className="px-4 py-3">Location</th>
                    <th className="px-4 py-3">Cost & Purchase</th>
                    <th className="px-4 py-3">Status / Condition</th>
                    <th className="px-4 py-3">Warranty & AMC</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredAssets.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-8 text-center text-slate-500">
                        No assets match your search criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredAssets.map((asset) => {
                      const today = new Date().toISOString().split("T")[0];
                      const hasActiveWarranty =
                        asset.warranty_end && asset.warranty_end >= today;
                      const hasActiveAmc = asset.amc_end && asset.amc_end >= today;

                      return (
                        <tr key={asset.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="px-4 py-3">
                            <div className="font-semibold text-slate-900">{asset.name}</div>
                            <div className="text-xs text-slate-500 flex items-center gap-1.5 mt-0.5">
                              <span className="font-mono bg-slate-100 px-1 py-0.5 rounded">
                                {asset.asset_code}
                              </span>
                              {asset.handover_asset_id && (
                                <Badge
                                  variant="secondary"
                                  className="text-[10px] px-1 py-0 bg-blue-50 text-blue-700"
                                >
                                  Handover
                                </Badge>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <span className="text-slate-700">
                              {ASSET_CATEGORIES.find((c) => c.value === asset.category)?.label ||
                                asset.category}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="text-slate-900 font-medium">
                              {asset.building?.name || "Common Area"}
                              {asset.wing?.name ? ` • Wing ${asset.wing.name}` : ""}
                            </div>
                            {asset.location_description && (
                              <div className="text-xs text-slate-500 truncate max-w-xs">
                                {asset.location_description}
                              </div>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <div className="font-medium text-slate-900">
                              {formatCurrency(asset.purchase_cost || 0)}
                            </div>
                            <div className="text-xs text-slate-500">
                              {formatDate(asset.purchase_date)}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex flex-col gap-1 items-start">
                              {getAssetStatusBadge(asset.status)}
                              {getConditionBadge(asset.condition)}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="space-y-1 text-xs">
                              {hasActiveWarranty ? (
                                <div className="text-emerald-700 font-medium flex items-center gap-1">
                                  <ShieldCheck className="h-3 w-3" />
                                  Warranty till {formatDate(asset.warranty_end)}
                                </div>
                              ) : asset.warranty_end ? (
                                <div className="text-slate-400">Warranty expired</div>
                              ) : null}

                              {hasActiveAmc ? (
                                <div className="text-blue-700 font-medium flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  AMC ({asset.amc_vendor || "Active"}) till {formatDate(asset.amc_end)}
                                </div>
                              ) : asset.amc_end ? (
                                <div className="text-slate-400">AMC expired</div>
                              ) : null}

                              {!hasActiveWarranty && !hasActiveAmc && !asset.warranty_end && !asset.amc_end && (
                                <span className="text-slate-400 italic">No AMC / Warranty</span>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => setSelectedAssetForView(asset)}
                                title="View Details"
                              >
                                <Eye className="h-4 w-4" />
                              </Button>

                              {permissions.canMaintainAssets && asset.status !== "DISPOSED" && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-8 text-xs text-indigo-700 border-indigo-200 hover:bg-indigo-50"
                                  onClick={() => {
                                    setFormError(null);
                                    setPreselectedAssetId(asset.id);
                                    setShowCreateMaintModal(true);
                                  }}
                                  title="Log Maintenance"
                                >
                                  <Wrench className="h-3.5 w-3.5 mr-1" />
                                  Service
                                </Button>
                              )}

                              {permissions.canDisposeAssets && asset.status !== "DISPOSED" && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-8 text-xs text-rose-600 hover:bg-rose-50"
                                  onClick={() => {
                                    setFormError(null);
                                    setAssetToDispose(asset);
                                  }}
                                  title="Dispose Asset"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: MAINTENANCE & SERVICE HISTORY */}
      {/* ========================================================================= */}
      {activeTab === "MAINTENANCE" && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row justify-between gap-3">
            <div className="flex flex-1 gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Search maintenance logs by title, asset, technician, or vendor..."
                  value={maintSearch}
                  onChange={(e) => setMaintSearch(e.target.value)}
                  className="pl-9"
                />
              </div>

              <select
                value={maintStatusFilter}
                onChange={(e) => setMaintStatusFilter(e.target.value)}
                className="h-10 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800"
              >
                <option value="ALL">All Statuses</option>
                <option value="SCHEDULED">Scheduled</option>
                <option value="IN_PROGRESS">In Progress</option>
                <option value="COMPLETED">Completed</option>
                <option value="CANCELLED">Cancelled</option>
              </select>

              <select
                value={maintTypeFilter}
                onChange={(e) => setMaintTypeFilter(e.target.value)}
                className="h-10 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800"
              >
                <option value="ALL">All Types</option>
                <option value="PREVENTIVE">Preventive</option>
                <option value="BREAKDOWN">Breakdown</option>
                <option value="AMC_SERVICE">AMC Service</option>
                <option value="INSPECTION">Inspection</option>
                <option value="STATUTORY_INSPECTION">Statutory Inspection</option>
                <option value="OVERHAUL">Major Overhaul</option>
              </select>
            </div>

            {permissions.canMaintainAssets && (
              <Button
                onClick={() => {
                  setFormError(null);
                  setPreselectedAssetId("");
                  setShowCreateMaintModal(true);
                }}
                className="bg-indigo-600 hover:bg-indigo-700 text-white shrink-0"
              >
                <Plus className="h-4 w-4 mr-1.5" />
                Log Maintenance
              </Button>
            )}
          </div>

          <Card className="border-slate-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left border-collapse">
                <thead className="bg-slate-50 text-slate-700 text-xs uppercase font-semibold border-b">
                  <tr>
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3">Service Title & Asset</th>
                    <th className="px-4 py-3">Type & Status</th>
                    <th className="px-4 py-3">Vendor / Technician</th>
                    <th className="px-4 py-3">Cost & Coverage</th>
                    <th className="px-4 py-3">Next Service</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredMaintenance.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-8 text-center text-slate-500">
                        No maintenance records found.
                      </td>
                    </tr>
                  ) : (
                    filteredMaintenance.map((rec) => (
                      <tr key={rec.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="px-4 py-3 whitespace-nowrap font-medium text-slate-700">
                          {formatDate(rec.service_date)}
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-semibold text-slate-900">{rec.title}</div>
                          <div className="text-xs text-slate-500">
                            {rec.asset?.name} ({rec.asset?.asset_code})
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-col gap-1 items-start">
                            <Badge variant="outline" className="text-xs">
                              {rec.maintenance_type}
                            </Badge>
                            {rec.status === "COMPLETED" ? (
                              <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200">
                                Completed
                              </Badge>
                            ) : rec.status === "IN_PROGRESS" ? (
                              <Badge className="bg-amber-100 text-amber-800 border-amber-200">
                                In Progress
                              </Badge>
                            ) : rec.status === "CANCELLED" ? (
                              <Badge className="bg-slate-100 text-slate-700 border-slate-200">
                                Cancelled
                              </Badge>
                            ) : (
                              <Badge className="bg-blue-100 text-blue-800 border-blue-200">
                                Scheduled
                              </Badge>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-medium text-slate-900">
                            {rec.vendor_name || "Internal Staff"}
                          </div>
                          {rec.technician_name && (
                            <div className="text-xs text-slate-500">
                              Tech: {rec.technician_name} {rec.technician_contact ? `(${rec.technician_contact})` : ""}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-medium text-slate-900">
                            {formatCurrency(rec.cost || 0)}
                          </div>
                          <div className="text-xs space-x-1 mt-0.5">
                            {rec.is_covered_under_warranty && (
                              <Badge variant="secondary" className="text-[10px] bg-emerald-50 text-emerald-700">
                                Under Warranty
                              </Badge>
                            )}
                            {rec.is_covered_under_amc && (
                              <Badge variant="secondary" className="text-[10px] bg-blue-50 text-blue-700">
                                Under AMC
                              </Badge>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-slate-700">
                          {formatDate(rec.next_service_date)}
                        </td>
                        <td className="px-4 py-3 text-right">
                          {permissions.canMaintainAssets &&
                            rec.status !== "COMPLETED" &&
                            rec.status !== "CANCELLED" && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-xs h-7 text-emerald-700 border-emerald-300 hover:bg-emerald-50"
                                onClick={() => handleMarkMaintenanceCompleted(rec)}
                              >
                                <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                                Done
                              </Button>
                            )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: INVENTORY & CONSUMABLES */}
      {/* ========================================================================= */}
      {activeTab === "INVENTORY" && (
        <div className="space-y-4">
          {/* Low Stock Warning Banner */}
          {kpis.lowStockCount > 0 && (
            <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 flex items-start justify-between">
              <div className="flex items-center gap-3">
                <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0" />
                <div>
                  <h4 className="text-sm font-semibold text-amber-900">
                    Low Stock Alert: {kpis.lowStockCount} items at or below reorder threshold
                  </h4>
                  <p className="text-xs text-amber-700 mt-0.5">
                    Replenish stock soon to prevent maintenance or operational bottlenecks.
                  </p>
                </div>
              </div>

              <Button
                size="sm"
                variant={showLowStockOnly ? "default" : "outline"}
                className={
                  showLowStockOnly
                    ? "bg-amber-700 hover:bg-amber-800 text-white"
                    : "border-amber-300 text-amber-900 hover:bg-amber-100"
                }
                onClick={() => setShowLowStockOnly(!showLowStockOnly)}
              >
                {showLowStockOnly ? "Show All Items" : "Filter Low Stock"}
              </Button>
            </div>
          )}

          {/* Filters Bar */}
          <div className="flex flex-col sm:flex-row gap-3 justify-between">
            <div className="flex flex-1 gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Search stock items by name, code, storage rack, or supplier..."
                  value={invSearch}
                  onChange={(e) => setInvSearch(e.target.value)}
                  className="pl-9"
                />
              </div>

              <select
                value={invCategoryFilter}
                onChange={(e) => setInvCategoryFilter(e.target.value)}
                className="h-10 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800"
              >
                <option value="ALL">All Categories</option>
                {INVENTORY_CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>

            {permissions.canManageInventory && (
              <Button
                onClick={() => {
                  setFormError(null);
                  setShowCreateInvModal(true);
                }}
                className="bg-indigo-600 hover:bg-indigo-700 text-white shrink-0"
              >
                <Plus className="h-4 w-4 mr-1.5" />
                Add Item
              </Button>
            )}
          </div>

          {/* Inventory Table */}
          <Card className="border-slate-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left border-collapse">
                <thead className="bg-slate-50 text-slate-700 text-xs uppercase font-semibold border-b">
                  <tr>
                    <th className="px-4 py-3">Item Code & Name</th>
                    <th className="px-4 py-3">Category</th>
                    <th className="px-4 py-3 text-right">In Stock</th>
                    <th className="px-4 py-3 text-right">Reorder Level</th>
                    <th className="px-4 py-3 text-right">Unit Cost</th>
                    <th className="px-4 py-3 text-right">Valuation</th>
                    <th className="px-4 py-3">Storage Location</th>
                    <th className="px-4 py-3 text-right">Record Movement</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredInventory.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-4 py-8 text-center text-slate-500">
                        No inventory items found.
                      </td>
                    </tr>
                  ) : (
                    filteredInventory.map((item) => {
                      const isLowStock =
                        Number(item.current_quantity) <= Number(item.min_reorder_level);
                      const valuation =
                        Number(item.current_quantity) * Number(item.unit_cost || 0);

                      return (
                        <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="px-4 py-3">
                            <div className="font-semibold text-slate-900">{item.name}</div>
                            <div className="text-xs font-mono text-slate-500 mt-0.5">
                              {item.item_code}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <span className="text-slate-700">
                              {INVENTORY_CATEGORIES.find((c) => c.value === item.category)?.label ||
                                item.category}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right font-medium">
                            <div
                              className={`inline-flex items-center gap-1 font-bold ${
                                isLowStock ? "text-rose-600" : "text-emerald-700"
                              }`}
                            >
                              {item.current_quantity} {item.unit_of_measure.toLowerCase()}
                              {isLowStock && (
                                <AlertTriangle className="h-3.5 w-3.5 text-rose-600 inline" />
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-right text-slate-600">
                            {item.min_reorder_level} {item.unit_of_measure.toLowerCase()}
                          </td>
                          <td className="px-4 py-3 text-right font-medium text-slate-800">
                            {formatCurrency(item.unit_cost || 0)}
                          </td>
                          <td className="px-4 py-3 text-right font-semibold text-slate-900">
                            {formatCurrency(valuation)}
                          </td>
                          <td className="px-4 py-3 text-slate-600">
                            {item.storage_location || "Central Store"}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex items-center justify-end gap-1">
                              {permissions.canManageInventory && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-7 text-xs text-emerald-700 border-emerald-300 hover:bg-emerald-50"
                                  onClick={() => {
                                    setFormError(null);
                                    setMovementModalItem(item);
                                    setMovementDefaultType("RECEIPT");
                                  }}
                                  title="Receive Stock"
                                >
                                  + In
                                </Button>
                              )}

                              {(permissions.canIssueInventory || permissions.canManageInventory) && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-7 text-xs text-blue-700 border-blue-300 hover:bg-blue-50"
                                  onClick={() => {
                                    setFormError(null);
                                    setMovementModalItem(item);
                                    setMovementDefaultType("ISSUE");
                                  }}
                                  title="Issue Stock"
                                  disabled={item.current_quantity <= 0}
                                >
                                  - Out
                                </Button>
                              )}

                              {(permissions.canAdjustInventory || permissions.canManageInventory) && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-7 text-xs text-amber-700 hover:bg-amber-50"
                                  onClick={() => {
                                    setFormError(null);
                                    setMovementModalItem(item);
                                    setMovementDefaultType("ADJUSTMENT");
                                  }}
                                  title="Adjust Stock"
                                >
                                  Adjust
                                </Button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: STOCK MOVEMENT LEDGER */}
      {/* ========================================================================= */}
      {activeTab === "MOVEMENTS" && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row justify-between gap-3">
            <div className="flex flex-1 gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Search ledger by item, recipient, purpose, or remarks..."
                  value={movementSearch}
                  onChange={(e) => setMovementSearch(e.target.value)}
                  className="pl-9"
                />
              </div>

              <select
                value={movementTypeFilter}
                onChange={(e) => setMovementTypeFilter(e.target.value)}
                className="h-10 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800"
              >
                <option value="ALL">All Types</option>
                <option value="RECEIPT">Receipt (+)</option>
                <option value="ISSUE">Issue (-)</option>
                <option value="ADJUSTMENT">Adjustment (±)</option>
                <option value="RETURN">Return (+)</option>
              </select>
            </div>
          </div>

          <Card className="border-slate-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left border-collapse">
                <thead className="bg-slate-50 text-slate-700 text-xs uppercase font-semibold border-b">
                  <tr>
                    <th className="px-4 py-3">Date & Time</th>
                    <th className="px-4 py-3">Item Details</th>
                    <th className="px-4 py-3">Type</th>
                    <th className="px-4 py-3 text-right">Quantity Delta</th>
                    <th className="px-4 py-3 text-right">Balance (Before → After)</th>
                    <th className="px-4 py-3">Recipient / Purpose</th>
                    <th className="px-4 py-3">Logged By</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredMovements.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-8 text-center text-slate-500">
                        No stock movement ledger records found.
                      </td>
                    </tr>
                  ) : (
                    filteredMovements.map((mv) => (
                      <tr key={mv.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="px-4 py-3 whitespace-nowrap text-slate-600">
                          <div>{formatDate(mv.movement_date)}</div>
                          <div className="text-[11px] text-slate-400">
                            {new Date(mv.created_at).toLocaleTimeString("en-IN", {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-semibold text-slate-900">{mv.item?.name}</div>
                          <div className="text-xs font-mono text-slate-500">{mv.item?.item_code}</div>
                        </td>
                        <td className="px-4 py-3">
                          {mv.movement_type === "RECEIPT" ? (
                            <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200">
                              Receipt
                            </Badge>
                          ) : mv.movement_type === "ISSUE" ? (
                            <Badge className="bg-blue-100 text-blue-800 border-blue-200">
                              Issue
                            </Badge>
                          ) : mv.movement_type === "ADJUSTMENT" ? (
                            <Badge className="bg-amber-100 text-amber-800 border-amber-200">
                              Adjustment
                            </Badge>
                          ) : (
                            <Badge className="bg-purple-100 text-purple-800 border-purple-200">
                              Return
                            </Badge>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right font-semibold">
                          <span
                            className={
                              mv.quantity_delta > 0
                                ? "text-emerald-600"
                                : mv.quantity_delta < 0
                                ? "text-rose-600"
                                : "text-slate-600"
                            }
                          >
                            {mv.quantity_delta > 0 ? `+${mv.quantity}` : `-${mv.quantity}`}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right text-slate-700 font-mono text-xs">
                          {mv.balance_before} → <span className="font-bold">{mv.balance_after}</span>
                        </td>
                        <td className="px-4 py-3">
                          {mv.issued_to_name && (
                            <div className="font-medium text-slate-800">{mv.issued_to_name}</div>
                          )}
                          {mv.department && (
                            <div className="text-xs text-slate-500">Dept: {mv.department}</div>
                          )}
                          {mv.purpose && (
                            <div className="text-xs text-slate-600">{mv.purpose}</div>
                          )}
                          {mv.adjustment_reason && (
                            <Badge variant="outline" className="text-[10px] text-amber-700">
                              Reason: {mv.adjustment_reason}
                            </Badge>
                          )}
                        </td>
                        <td className="px-4 py-3 text-slate-600 text-xs">
                          {mv.creator?.full_name || mv.creator?.display_name || "Admin"}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 5: BUILDER HANDOVER IMPORTS */}
      {/* ========================================================================= */}
      {activeTab === "HANDOVER" && (
        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-blue-50 border border-blue-200 flex items-start gap-3">
            <Building2 className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
            <div>
              <h4 className="text-sm font-semibold text-blue-900">
                Phase 13 Builder Handover Integration
              </h4>
              <p className="text-xs text-blue-700 mt-1">
                Accepted equipment, pumps, transformers, and lift systems verified during builder
                handover can be converted into active operational assets with a single click, preserving
                warranty, AMC, and provenance.
              </p>
            </div>
          </div>

          <Card className="border-slate-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left border-collapse">
                <thead className="bg-slate-50 text-slate-700 text-xs uppercase font-semibold border-b">
                  <tr>
                    <th className="px-4 py-3">Handover Asset</th>
                    <th className="px-4 py-3">Project Title</th>
                    <th className="px-4 py-3">Make / Serial No.</th>
                    <th className="px-4 py-3">Location</th>
                    <th className="px-4 py-3">Handover Status</th>
                    <th className="px-4 py-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {handoverAssets.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                        <CheckCircle2 className="h-8 w-8 text-emerald-500 mx-auto mb-2" />
                        All accepted handover equipment has already been imported into the Asset
                        Register.
                      </td>
                    </tr>
                  ) : (
                    handoverAssets.map((ha) => (
                      <tr key={ha.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="px-4 py-3 font-semibold text-slate-900">
                          {ha.name}
                          {ha.asset_category && (
                            <div className="text-xs font-normal text-slate-500">
                              {ha.asset_category}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3 text-slate-700">
                          {ha.project?.title || "Handover Project"}
                        </td>
                        <td className="px-4 py-3 text-slate-600 text-xs">
                          {ha.manufacturer && <div>Make: {ha.manufacturer}</div>}
                          {ha.serial_number && <div>S/N: {ha.serial_number}</div>}
                        </td>
                        <td className="px-4 py-3 text-slate-700">
                          {ha.location || "Common Area"}
                        </td>
                        <td className="px-4 py-3">
                          <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200">
                            {ha.status || "ACCEPTED"}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-right">
                          {permissions.canManageAssets && (
                            <Button
                              size="sm"
                              className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs h-8"
                              onClick={() => {
                                setFormError(null);
                                setModalBuildingId(ha.building_id || "");
                                setHandoverToImport(ha);
                              }}
                            >
                              Convert to Asset
                            </Button>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: REGISTER NEW ASSET */}
      {/* ========================================================================= */}
      {showCreateAssetModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-800 max-w-3xl w-full max-h-[90vh] overflow-y-auto p-6 space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <div className="flex items-center gap-2">
                <Boxes className="h-5 w-5 text-indigo-600" />
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                  Register New Society Asset
                </h2>
              </div>
              <button
                onClick={() => setShowCreateAssetModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {formError && (
              <div className="p-3 bg-rose-50 text-rose-700 border border-rose-200 rounded-lg text-sm">
                {formError}
              </div>
            )}

            <form onSubmit={handleCreateAsset} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Asset Name <span className="text-rose-500">*</span>
                  </label>
                  <Input
                    name="name"
                    required
                    placeholder="e.g., 50 HP Main Hydro-Pneumatic Pump"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Asset Code (Leave blank for auto-generation)
                  </label>
                  <Input name="asset_code" placeholder="AST-2026-0001" />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Category <span className="text-rose-500">*</span>
                  </label>
                  <select
                    name="category"
                    required
                    className="w-full h-10 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800"
                  >
                    {ASSET_CATEGORIES.map((c) => (
                      <option key={c.value} value={c.value}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Condition
                  </label>
                  <select
                    name="condition"
                    defaultValue="GOOD"
                    className="w-full h-10 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800"
                  >
                    <option value="EXCELLENT">Excellent</option>
                    <option value="GOOD">Good</option>
                    <option value="FAIR">Fair</option>
                    <option value="POOR">Poor</option>
                    <option value="SCRAP">Scrap</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Building
                  </label>
                  <select
                    name="building_id"
                    value={modalBuildingId}
                    onChange={(e) => setModalBuildingId(e.target.value)}
                    className="w-full h-10 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800"
                  >
                    <option value="">Common Campus / No Building</option>
                    {buildings.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Wing</label>
                  <select
                    name="wing_id"
                    disabled={!modalBuildingId || currentModalWings.length === 0}
                    className="w-full h-10 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 disabled:bg-slate-100"
                  >
                    <option value="">Select Wing</option>
                    {currentModalWings.map((w) => (
                      <option key={w.id} value={w.id}>
                        {w.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Location Description
                  </label>
                  <Input
                    name="location_description"
                    placeholder="e.g., Basement 2 Pump Room, Panel #3"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Purchase Date
                  </label>
                  <Input type="date" name="purchase_date" />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Purchase Cost (₹)
                  </label>
                  <Input type="number" step="0.01" name="purchase_cost" placeholder="0" />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Supplier / Vendor
                  </label>
                  <Input name="vendor_name" placeholder="Supplier Company Name" />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Manufacturer / Brand
                  </label>
                  <Input name="manufacturer" placeholder="e.g., Kirloskar, Schindler" />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Model Number
                  </label>
                  <Input name="model_number" placeholder="Model designation" />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Serial Number
                  </label>
                  <Input name="serial_number" placeholder="Unique serial / chassis number" />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Warranty Provider
                  </label>
                  <Input name="warranty_provider" placeholder="OEM / Dealer Name" />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Warranty End Date
                  </label>
                  <Input type="date" name="warranty_end" />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    AMC Service Vendor
                  </label>
                  <Input name="amc_vendor" placeholder="AMC contractor name" />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    AMC End Date
                  </label>
                  <Input type="date" name="amc_end" />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Annual AMC Cost (₹)
                  </label>
                  <Input type="number" step="0.01" name="amc_cost" placeholder="0" />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Expected Useful Life (Years)
                  </label>
                  <Input type="number" name="expected_life_years" placeholder="10" />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Description & Notes
                  </label>
                  <textarea
                    name="description"
                    rows={2}
                    className="w-full rounded-md border border-slate-200 p-2 text-sm"
                    placeholder="Technical specifications, operating instructions, location markers..."
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowCreateAssetModal(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={formLoading}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white"
                >
                  {formLoading ? "Saving Asset..." : "Register Asset"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: VIEW ASSET DETAILS */}
      {/* ========================================================================= */}
      {selectedAssetForView && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-800 max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <div>
                <span className="font-mono text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                  {selectedAssetForView.asset_code}
                </span>
                <h2 className="text-xl font-bold text-slate-900 dark:text-white mt-1">
                  {selectedAssetForView.name}
                </h2>
              </div>
              <button
                onClick={() => setSelectedAssetForView(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
              <div className="p-2.5 bg-slate-50 rounded-lg">
                <span className="text-xs text-slate-500 block">Status</span>
                <span className="font-semibold">{selectedAssetForView.status}</span>
              </div>
              <div className="p-2.5 bg-slate-50 rounded-lg">
                <span className="text-xs text-slate-500 block">Condition</span>
                <span className="font-semibold">{selectedAssetForView.condition}</span>
              </div>
              <div className="p-2.5 bg-slate-50 rounded-lg">
                <span className="text-xs text-slate-500 block">Category</span>
                <span className="font-semibold">{selectedAssetForView.category}</span>
              </div>
              <div className="p-2.5 bg-slate-50 rounded-lg">
                <span className="text-xs text-slate-500 block">Purchase Cost</span>
                <span className="font-semibold">
                  {formatCurrency(selectedAssetForView.purchase_cost || 0)}
                </span>
              </div>
              <div className="p-2.5 bg-slate-50 rounded-lg">
                <span className="text-xs text-slate-500 block">Purchase Date</span>
                <span className="font-semibold">
                  {formatDate(selectedAssetForView.purchase_date)}
                </span>
              </div>
              <div className="p-2.5 bg-slate-50 rounded-lg">
                <span className="text-xs text-slate-500 block">Location</span>
                <span className="font-semibold">
                  {selectedAssetForView.building?.name || "Common Area"}
                </span>
              </div>
            </div>

            <div className="space-y-2 border-t pt-3 text-sm">
              <h4 className="font-semibold text-slate-800">Hardware & Specs</h4>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-slate-500">Manufacturer:</span>{" "}
                  {selectedAssetForView.manufacturer || "—"}
                </div>
                <div>
                  <span className="text-slate-500">Model:</span>{" "}
                  {selectedAssetForView.model_number || "—"}
                </div>
                <div>
                  <span className="text-slate-500">Serial No:</span>{" "}
                  {selectedAssetForView.serial_number || "—"}
                </div>
                <div>
                  <span className="text-slate-500">Expected Life:</span>{" "}
                  {selectedAssetForView.expected_life_years
                    ? `${selectedAssetForView.expected_life_years} Years`
                    : "—"}
                </div>
              </div>
            </div>

            <div className="space-y-2 border-t pt-3 text-sm">
              <h4 className="font-semibold text-slate-800">Warranty & AMC Coverage</h4>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-slate-500">Warranty Provider:</span>{" "}
                  {selectedAssetForView.warranty_provider || "—"}
                </div>
                <div>
                  <span className="text-slate-500">Warranty End:</span>{" "}
                  {formatDate(selectedAssetForView.warranty_end)}
                </div>
                <div>
                  <span className="text-slate-500">AMC Vendor:</span>{" "}
                  {selectedAssetForView.amc_vendor || "—"}
                </div>
                <div>
                  <span className="text-slate-500">AMC End:</span>{" "}
                  {formatDate(selectedAssetForView.amc_end)}
                </div>
              </div>
            </div>

            {selectedAssetForView.description && (
              <div className="border-t pt-3 text-xs text-slate-600">
                <span className="font-semibold text-slate-800 block mb-0.5">Description</span>
                <p>{selectedAssetForView.description}</p>
              </div>
            )}

            {selectedAssetForView.status === "DISPOSED" && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-800">
                <strong>Disposed on {formatDate(selectedAssetForView.disposal_date)}:</strong>{" "}
                {selectedAssetForView.disposal_reason} (Value:{" "}
                {formatCurrency(selectedAssetForView.disposal_value || 0)})
              </div>
            )}

            <div className="flex justify-end gap-2 pt-3 border-t">
              <Button variant="outline" onClick={() => setSelectedAssetForView(null)}>
                Close
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: DISPOSE ASSET */}
      {/* ========================================================================= */}
      {assetToDispose && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-800 max-w-lg w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <div className="flex items-center gap-2 text-rose-600">
                <Trash2 className="h-5 w-5" />
                <h2 className="text-lg font-bold">Dispose / Retire Asset</h2>
              </div>
              <button
                onClick={() => setAssetToDispose(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <p className="text-sm text-slate-600">
              Retiring <strong>{assetToDispose.name}</strong> ({assetToDispose.asset_code}). This
              action marks the asset as DISPOSED and archives its operational status.
            </p>

            {formError && (
              <div className="p-3 bg-rose-50 text-rose-700 border border-rose-200 rounded-lg text-sm">
                {formError}
              </div>
            )}

            <form onSubmit={handleDisposeAsset} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Disposal Date <span className="text-rose-500">*</span>
                </label>
                <Input
                  type="date"
                  name="disposal_date"
                  required
                  defaultValue={new Date().toISOString().split("T")[0]}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Disposal Reason <span className="text-rose-500">*</span>
                </label>
                <textarea
                  name="disposal_reason"
                  required
                  rows={2}
                  className="w-full rounded-md border border-slate-200 p-2 text-sm"
                  placeholder="e.g., Obsolete and beyond economical repair, scrapped per AGM resolution..."
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Disposal / Scrap Value (₹)
                  </label>
                  <Input type="number" step="0.01" name="disposal_value" defaultValue="0" />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Buyer / Scrap Dealer
                  </label>
                  <Input name="disposed_to" placeholder="e.g., Metal Recyclers Pvt Ltd" />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t">
                <Button type="button" variant="outline" onClick={() => setAssetToDispose(null)}>
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={formLoading}
                  className="bg-rose-600 hover:bg-rose-700 text-white"
                >
                  {formLoading ? "Recording..." : "Confirm Disposal"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: LOG MAINTENANCE / SERVICE */}
      {/* ========================================================================= */}
      {showCreateMaintModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-800 max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <div className="flex items-center gap-2">
                <Wrench className="h-5 w-5 text-indigo-600" />
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                  Log Asset Maintenance & Service
                </h2>
              </div>
              <button
                onClick={() => setShowCreateMaintModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {formError && (
              <div className="p-3 bg-rose-50 text-rose-700 border border-rose-200 rounded-lg text-sm">
                {formError}
              </div>
            )}

            <form onSubmit={handleCreateMaintenance} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Select Asset <span className="text-rose-500">*</span>
                  </label>
                  <select
                    name="asset_id"
                    required
                    defaultValue={preselectedAssetId}
                    className="w-full h-10 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800"
                  >
                    <option value="">Select Asset to Service</option>
                    {assets
                      .filter((a) => a.status !== "DISPOSED")
                      .map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.name} ({a.asset_code}) — {a.status}
                        </option>
                      ))}
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Service Title <span className="text-rose-500">*</span>
                  </label>
                  <Input
                    name="title"
                    required
                    placeholder="e.g., Quarterly Hydro-Pneumatic Pump Greasing & Alignment"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Maintenance Type <span className="text-rose-500">*</span>
                  </label>
                  <select
                    name="maintenance_type"
                    required
                    defaultValue="PREVENTIVE"
                    className="w-full h-10 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800"
                  >
                    <option value="PREVENTIVE">Preventive Maintenance</option>
                    <option value="BREAKDOWN">Breakdown Repair</option>
                    <option value="AMC_SERVICE">AMC Scheduled Service</option>
                    <option value="INSPECTION">Inspection / Audit</option>
                    <option value="STATUTORY_INSPECTION">Statutory Safety Inspection</option>
                    <option value="OVERHAUL">Major Overhaul</option>
                    <option value="OTHER">Other Service</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Status</label>
                  <select
                    name="status"
                    defaultValue="SCHEDULED"
                    className="w-full h-10 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800"
                  >
                    <option value="SCHEDULED">Scheduled</option>
                    <option value="IN_PROGRESS">In Progress</option>
                    <option value="COMPLETED">Completed</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Service Date <span className="text-rose-500">*</span>
                  </label>
                  <Input
                    type="date"
                    name="service_date"
                    required
                    defaultValue={new Date().toISOString().split("T")[0]}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Service Cost (₹)
                  </label>
                  <Input type="number" step="0.01" name="cost" defaultValue="0" />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Vendor / Contractor
                  </label>
                  <Input name="vendor_name" placeholder="Service Contractor Name" />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Technician Name & Phone
                  </label>
                  <Input name="technician_name" placeholder="Technician Name" />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Work Description & Findings <span className="text-rose-500">*</span>
                  </label>
                  <textarea
                    name="work_description"
                    required
                    rows={2}
                    className="w-full rounded-md border border-slate-200 p-2 text-sm"
                    placeholder="Details of parts replaced, oil levels inspected, electrical voltage checked..."
                  />
                </div>

                <div className="flex items-center gap-4 sm:col-span-2">
                  <label className="flex items-center gap-2 text-xs text-slate-700 font-medium">
                    <input type="checkbox" name="is_covered_under_warranty" className="rounded" />
                    Covered under Warranty
                  </label>
                  <label className="flex items-center gap-2 text-xs text-slate-700 font-medium">
                    <input type="checkbox" name="is_covered_under_amc" className="rounded" />
                    Covered under AMC
                  </label>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Next Recommended Service Date
                  </label>
                  <Input type="date" name="next_service_date" />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowCreateMaintModal(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={formLoading}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white"
                >
                  {formLoading ? "Recording..." : "Save Record"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: ADD INVENTORY ITEM */}
      {/* ========================================================================= */}
      {showCreateInvModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-800 max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <div className="flex items-center gap-2">
                <Package className="h-5 w-5 text-indigo-600" />
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                  Add Consumable / Stock Item
                </h2>
              </div>
              <button
                onClick={() => setShowCreateInvModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {formError && (
              <div className="p-3 bg-rose-50 text-rose-700 border border-rose-200 rounded-lg text-sm">
                {formError}
              </div>
            )}

            <form onSubmit={handleCreateInventory} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Item Name <span className="text-rose-500">*</span>
                  </label>
                  <Input name="name" required placeholder="e.g., 18W LED Tube Light (Cool Day)" />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Item Code (Optional)
                  </label>
                  <Input name="item_code" placeholder="INV-2026-0001" />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Category <span className="text-rose-500">*</span>
                  </label>
                  <select
                    name="category"
                    required
                    className="w-full h-10 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800"
                  >
                    {INVENTORY_CATEGORIES.map((c) => (
                      <option key={c.value} value={c.value}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Unit of Measurement <span className="text-rose-500">*</span>
                  </label>
                  <select
                    name="unit_of_measure"
                    required
                    className="w-full h-10 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800"
                  >
                    {UNITS_OF_MEASURE.map((u) => (
                      <option key={u.value} value={u.value}>
                        {u.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Opening Stock Quantity
                  </label>
                  <Input type="number" step="0.01" name="opening_quantity" defaultValue="0" />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Minimum Reorder Level
                  </label>
                  <Input type="number" step="0.01" name="min_reorder_level" defaultValue="5" />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Unit Cost (₹)
                  </label>
                  <Input type="number" step="0.01" name="unit_cost" defaultValue="0" />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Storage Location / Rack
                  </label>
                  <Input name="storage_location" placeholder="e.g., Electrical Store Shelf B-2" />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Primary Supplier Name
                  </label>
                  <Input name="supplier_name" placeholder="Hardware store / vendor name" />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Supplier Phone / Email
                  </label>
                  <Input name="supplier_contact" placeholder="Contact number" />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t">
                <Button type="button" variant="outline" onClick={() => setShowCreateInvModal(false)}>
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={formLoading}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white"
                >
                  {formLoading ? "Saving..." : "Add Stock Item"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: RECORD STOCK MOVEMENT */}
      {/* ========================================================================= */}
      {movementModalItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-800 max-w-lg w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <div>
                <span className="font-mono text-xs text-slate-500">
                  {movementModalItem.item_code}
                </span>
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                  Record Stock Movement
                </h2>
              </div>
              <button
                onClick={() => setMovementModalItem(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-3 bg-slate-50 rounded-lg text-sm flex justify-between items-center">
              <div>
                <span className="font-semibold text-slate-900">{movementModalItem.name}</span>
                <div className="text-xs text-slate-500">
                  Unit: {movementModalItem.unit_of_measure}
                </div>
              </div>
              <div className="text-right">
                <span className="text-xs text-slate-500 block">Current Stock</span>
                <span className="text-base font-bold text-slate-900">
                  {movementModalItem.current_quantity}
                </span>
              </div>
            </div>

            {formError && (
              <div className="p-3 bg-rose-50 text-rose-700 border border-rose-200 rounded-lg text-sm">
                {formError}
              </div>
            )}

            <form onSubmit={handleRecordMovement} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Movement Type <span className="text-rose-500">*</span>
                  </label>
                  <select
                    name="movement_type"
                    required
                    defaultValue={movementDefaultType}
                    className="w-full h-10 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800"
                  >
                    <option value="RECEIPT">Stock In / Receipt (+)</option>
                    <option value="ISSUE">Issue / Consumed (-)</option>
                    <option value="ADJUSTMENT">Stock Adjustment (±)</option>
                    <option value="RETURN">Return to Store (+)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Quantity <span className="text-rose-500">*</span>
                  </label>
                  <Input type="number" step="0.01" name="quantity" required placeholder="Quantity" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Adjustment Direction
                  </label>
                  <select
                    name="adjustment_direction"
                    defaultValue="DECREASE"
                    className="w-full h-10 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800"
                  >
                    <option value="DECREASE">Reduce Balance (-)</option>
                    <option value="INCREASE">Increase Balance (+)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Adjustment Reason
                  </label>
                  <select
                    name="adjustment_reason"
                    className="w-full h-10 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800"
                  >
                    <option value="">None / Not Applicable</option>
                    <option value="DAMAGED_EXPIRED">Damaged / Expired</option>
                    <option value="AUDIT_DISCREPANCY">Audit Discrepancy</option>
                    <option value="SCRAP">Scrap / Wear & Tear</option>
                    <option value="THEFT_LOSS">Theft / Loss</option>
                    <option value="INITIAL_CORRECTION">Initial Data Correction</option>
                    <option value="OTHER">Other Reason</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Movement Date <span className="text-rose-500">*</span>
                  </label>
                  <Input
                    type="date"
                    name="movement_date"
                    required
                    defaultValue={new Date().toISOString().split("T")[0]}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Unit Price (₹)
                  </label>
                  <Input
                    type="number"
                    step="0.01"
                    name="unit_price"
                    defaultValue={movementModalItem.unit_cost || 0}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Issued To / Contractor
                  </label>
                  <Input name="issued_to_name" placeholder="Person receiving items" />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Department
                  </label>
                  <Input name="department" placeholder="e.g., Electrical, Housekeeping" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Purpose / Work Order
                </label>
                <Input name="purpose" placeholder="e.g., Wing B 4th floor corridor light replacement" />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Building Location
                </label>
                <select
                  name="building_id"
                  className="w-full h-10 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800"
                >
                  <option value="">Campus / General</option>
                  {buildings.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t">
                <Button type="button" variant="outline" onClick={() => setMovementModalItem(null)}>
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={formLoading}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white"
                >
                  {formLoading ? "Recording..." : "Record Movement"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: CONVERT HANDOVER ASSET TO OPERATIONAL ASSET */}
      {/* ========================================================================= */}
      {handoverToImport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-800 max-w-xl w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <div className="flex items-center gap-2">
                <Building2 className="h-5 w-5 text-indigo-600" />
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                  Convert Handover Equipment to Asset
                </h2>
              </div>
              <button
                onClick={() => setHandoverToImport(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-900 space-y-1">
              <div className="font-semibold text-sm">{handoverToImport.name}</div>
              <div>Project: {handoverToImport.project?.title || "Developer Handover"}</div>
              {handoverToImport.manufacturer && <div>Make: {handoverToImport.manufacturer}</div>}
              {handoverToImport.serial_number && <div>Serial No: {handoverToImport.serial_number}</div>}
            </div>

            {formError && (
              <div className="p-3 bg-rose-50 text-rose-700 border border-rose-200 rounded-lg text-sm">
                {formError}
              </div>
            )}

            <form onSubmit={handleImportHandover} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Operational Asset Category <span className="text-rose-500">*</span>
                </label>
                <select
                  name="category"
                  required
                  defaultValue={
                    ASSET_CATEGORIES.some((c) => c.value === handoverToImport.asset_category)
                      ? handoverToImport.asset_category
                      : "ELECTRICAL"
                  }
                  className="w-full h-10 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800"
                >
                  {ASSET_CATEGORIES.map((c) => (
                    <option key={c.value} value={c.value}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Building
                  </label>
                  <select
                    name="building_id"
                    value={modalBuildingId}
                    onChange={(e) => setModalBuildingId(e.target.value)}
                    className="w-full h-10 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800"
                  >
                    <option value="">Campus / General</option>
                    {buildings.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Wing</label>
                  <select
                    name="wing_id"
                    disabled={!modalBuildingId || currentModalWings.length === 0}
                    className="w-full h-10 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 disabled:bg-slate-100"
                  >
                    <option value="">Select Wing</option>
                    {currentModalWings.map((w) => (
                      <option key={w.id} value={w.id}>
                        {w.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Location Details
                </label>
                <Input
                  name="location_description"
                  defaultValue={handoverToImport.location || ""}
                  placeholder="e.g., Pump Room B-1"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Condition
                  </label>
                  <select
                    name="condition"
                    defaultValue="GOOD"
                    className="w-full h-10 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800"
                  >
                    <option value="EXCELLENT">Excellent</option>
                    <option value="GOOD">Good</option>
                    <option value="FAIR">Fair</option>
                    <option value="POOR">Poor</option>
                    <option value="SCRAP">Scrap</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Estimated Cost / Book Value (₹)
                  </label>
                  <Input type="number" step="0.01" name="purchase_cost" defaultValue="0" />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t">
                <Button type="button" variant="outline" onClick={() => setHandoverToImport(null)}>
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={formLoading}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white"
                >
                  {formLoading ? "Importing..." : "Confirm & Import to Asset Register"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
