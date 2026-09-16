"use client";

import React, { useState, useEffect, useTransition, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Unit,
  UnitStatus,
  UnitType,
} from "@/lib/types/database";
import {
  BuildingWithHierarchy,
  PaginatedUnitsResult,
} from "@/lib/services/buildingService";
import {
  DoorOpen,
  Search,
  Building2,
  ChevronRight,
  ChevronLeft,
  Plus,
  FileSpreadsheet,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { UnitDetailDrawer } from "./UnitDetailDrawer";

const UNIT_TYPES: UnitType[] = [
  "1_BHK",
  "2_BHK",
  "3_BHK",
  "4_BHK",
  "PENTHOUSE",
  "SHOP",
  "OFFICE",
  "PARKING",
  "OTHER",
];

const UNIT_STATUSES: UnitStatus[] = [
  "ACTIVE",
  "VACANT",
  "OCCUPIED",
  "UNDER_MAINTENANCE",
  "INACTIVE",
];

export function UnitsExplorerClient({
  societyId,
  initialResult,
  buildings,
}: {
  societyId: string;
  initialResult: PaginatedUnitsResult;
  buildings: BuildingWithHierarchy[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [units, setUnits] = useState<Unit[]>(initialResult.data);
  const [pagination, setPagination] = useState(initialResult.pagination);

  const [search, setSearch] = useState("");
  const [selectedBuildingId, setSelectedBuildingId] = useState<string>("ALL");
  const [selectedWingId, setSelectedWingId] = useState<string>("ALL");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [typeFilter, setTypeFilter] = useState<string>("ALL");
  const [selectedUnit, setSelectedUnit] = useState<Unit | null>(null);

  // Add Unit Dialog State
  const [isAddUnitOpen, setIsAddUnitOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [newUnit, setNewUnit] = useState({
    building_id: buildings[0]?.id || "",
    wing_id: "",
    floor_id: "",
    unit_number: "",
    unit_type: "2_BHK" as UnitType,
    status: "VACANT" as UnitStatus,
    area_sqft: "",
  });

  // Derived wings for the building selected in filter
  const currentBuildingInFilter = buildings.find((b) => b.id === selectedBuildingId);
  const wingsInFilter = currentBuildingInFilter?.wings || [];

  // Derived wings and floors for the building selected in "Add Unit" dialog
  const currentBuildingInForm = buildings.find((b) => b.id === newUnit.building_id);
  const wingsInForm = currentBuildingInForm?.wings || [];
  const floorsInForm = currentBuildingInForm?.floors || [];

  const fetchUnits = useCallback(async (pageToLoad = 1) => {
    try {
      const params = new URLSearchParams();
      params.set("page", pageToLoad.toString());
      params.set("limit", "20");

      if (search.trim()) params.set("search", search.trim());
      if (selectedBuildingId !== "ALL") params.set("buildingId", selectedBuildingId);
      if (selectedWingId !== "ALL") params.set("wingId", selectedWingId);
      if (statusFilter !== "ALL") params.set("status", statusFilter);
      if (typeFilter !== "ALL") params.set("unitType", typeFilter);

      const res = await fetch(`/api/society/${societyId}/units?${params.toString()}`);
      const json = await res.json();

      if (json.success) {
        setUnits(json.data || []);
        setPagination(json.pagination || { total: 0, page: 1, limit: 20, totalPages: 1 });
      }
    } catch (err) {
      console.error("Failed to load units:", err);
    }
  }, [societyId, search, selectedBuildingId, selectedWingId, statusFilter, typeFilter]);

  // Debounced search / filter update
  useEffect(() => {
    const handler = setTimeout(() => {
      fetchUnits(1);
    }, 250);
    return () => clearTimeout(handler);
  }, [fetchUnits]);

  const handleCreateUnit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setIsSubmitting(true);

    try {
      const res = await fetch(`/api/society/${societyId}/units`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          building_id: newUnit.building_id,
          wing_id: newUnit.wing_id || null,
          floor_id: newUnit.floor_id || null,
          unit_number: newUnit.unit_number.trim(),
          unit_type: newUnit.unit_type,
          status: newUnit.status,
          area_sqft: newUnit.area_sqft ? parseFloat(newUnit.area_sqft) : null,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        setFormError(json.error || "Failed to create unit.");
        return;
      }

      setIsAddUnitOpen(false);
      setNewUnit({
        building_id: buildings[0]?.id || "",
        wing_id: "",
        floor_id: "",
        unit_number: "",
        unit_type: "2_BHK",
        status: "VACANT",
        area_sqft: "",
      });

      fetchUnits(pagination.page);
      router.refresh();
    } catch (err: any) {
      setFormError(err?.message || "An unexpected error occurred.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusBadge = (status: UnitStatus) => {
    switch (status) {
      case "OCCUPIED":
        return <Badge variant="success" className="font-mono text-[10px]">OCCUPIED</Badge>;
      case "VACANT":
        return <Badge variant="secondary" className="font-mono text-[10px]">VACANT</Badge>;
      case "UNDER_MAINTENANCE":
        return <Badge variant="warning" className="font-mono text-[10px]">MAINTENANCE</Badge>;
      case "INACTIVE":
        return <Badge variant="destructive" className="font-mono text-[10px]">INACTIVE</Badge>;
      default:
        return <Badge variant="default" className="font-mono text-[10px]">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Unit Registry & Inventory</h1>
          <p className="text-xs text-slate-500">
            Authoritative flat directory with real-time occupancy status, ownership allocations, and structural binding.
          </p>
        </div>

        <div className="flex items-center gap-2.5 w-full sm:w-auto">
          <Link href={`/society/${societyId}/import`}>
            <Button variant="outline" size="sm" className="text-xs h-8 gap-1.5 border-slate-300">
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
              <span>Bulk Import</span>
            </Button>
          </Link>

          <Button
            size="sm"
            onClick={() => {
              setFormError(null);
              setIsAddUnitOpen(true);
            }}
            className="text-xs h-8 gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Unit</span>
          </Button>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
          {/* Search */}
          <div className="relative col-span-1 sm:col-span-2 md:col-span-1">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
            <Input
              placeholder="Search unit #..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 text-xs h-8"
            />
          </div>

          {/* Building Filter */}
          <Select
            value={selectedBuildingId}
            onChange={(e) => {
              setSelectedBuildingId(e.target.value);
              setSelectedWingId("ALL");
            }}
            className="text-xs h-8"
          >
            <option value="ALL">All Buildings</option>
            {buildings.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name} ({b.code})
              </option>
            ))}
          </Select>

          {/* Wing Filter */}
          <Select
            value={selectedWingId}
            onChange={(e) => setSelectedWingId(e.target.value)}
            className="text-xs h-8"
            disabled={selectedBuildingId === "ALL" || wingsInFilter.length === 0}
          >
            <option value="ALL">
              {selectedBuildingId === "ALL" ? "All Wings" : "All Wings in Bldg"}
            </option>
            {wingsInFilter.map((w) => (
              <option key={w.id} value={w.id}>
                {w.name} ({w.code})
              </option>
            ))}
          </Select>

          {/* Type Filter */}
          <Select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="text-xs h-8"
          >
            <option value="ALL">All Types</option>
            {UNIT_TYPES.map((t) => (
              <option key={t} value={t}>
                {t.replace(/_/g, " ")}
              </option>
            ))}
          </Select>

          {/* Status Filter */}
          <Select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-xs h-8"
          >
            <option value="ALL">All Statuses</option>
            {UNIT_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s.replace(/_/g, " ")}
              </option>
            ))}
          </Select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Unit Number</TableHead>
              <TableHead>Building & Wing</TableHead>
              <TableHead>Floor</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Area (Sq. Ft.)</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {units.length > 0 ? (
              units.map((unit) => {
                const bldg = (unit as any).building;
                const wing = (unit as any).wing;
                const floor = (unit as any).floor;

                return (
                  <TableRow
                    key={unit.id}
                    onClick={() => setSelectedUnit(unit)}
                    className="cursor-pointer hover:bg-slate-50 transition-colors group"
                  >
                    <TableCell>
                      <div className="flex items-center gap-2.5">
                        <div className="p-2 bg-indigo-50 text-indigo-700 rounded-lg shrink-0">
                          <DoorOpen className="w-4 h-4" />
                        </div>
                        <div className="font-bold text-xs text-slate-900 font-mono">
                          {unit.unit_number}
                        </div>
                      </div>
                    </TableCell>

                    <TableCell className="text-xs text-slate-700">
                      {bldg?.name || "—"}
                      {wing?.name ? ` / ${wing.name}` : ""}
                    </TableCell>

                    <TableCell className="text-xs text-slate-600">
                      {floor?.name ? floor.name : floor?.floor_number !== undefined ? `Floor ${floor.floor_number}` : "—"}
                    </TableCell>

                    <TableCell className="text-xs font-medium text-slate-700">
                      {unit.unit_type.replace(/_/g, " ")}
                    </TableCell>

                    <TableCell className="text-xs font-mono text-slate-600">
                      {unit.area_sqft ? `${unit.area_sqft} sq. ft.` : "—"}
                    </TableCell>

                    <TableCell>{getStatusBadge(unit.status)}</TableCell>

                    <TableCell className="text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedUnit(unit);
                        }}
                        className="text-xs h-7 px-2.5 gap-1 group-hover:border-indigo-300 group-hover:text-indigo-600"
                      >
                        <span>Details</span>
                        <ChevronRight className="w-3 h-3" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })
            ) : (
              <TableRow>
                <TableCell colSpan={7} className="py-12 text-center text-slate-400 text-xs">
                  {search || statusFilter !== "ALL" || typeFilter !== "ALL" || selectedBuildingId !== "ALL"
                    ? "No matching units found for the applied filters."
                    : "No units found in this society registry yet. Click 'Add Unit' or 'Bulk Import' to create inventory."}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>

        {/* Server-Side Pagination Bar */}
        {pagination.total > 0 && (
          <div className="px-4 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-xs text-slate-600">
            <div>
              Showing <span className="font-semibold">{units.length}</span> of{" "}
              <span className="font-semibold">{pagination.total}</span> units (Page{" "}
              {pagination.page} of {pagination.totalPages || 1})
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="h-7 px-2.5 text-xs"
                disabled={pagination.page <= 1}
                onClick={() => fetchUnits(pagination.page - 1)}
              >
                <ChevronLeft className="w-3.5 h-3.5 mr-1" />
                <span>Prev</span>
              </Button>

              <Button
                variant="outline"
                size="sm"
                className="h-7 px-2.5 text-xs"
                disabled={pagination.page >= pagination.totalPages}
                onClick={() => fetchUnits(pagination.page + 1)}
              >
                <span>Next</span>
                <ChevronRight className="w-3.5 h-3.5 ml-1" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Add Unit Dialog */}
      <Dialog open={isAddUnitOpen} onOpenChange={setIsAddUnitOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900">Add New Unit</DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Register an individual flat, office, or shop into the society structural registry.
            </DialogDescription>
          </DialogHeader>

          {formError && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          <form onSubmit={handleCreateUnit} className="space-y-4 pt-2">
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">Building *</label>
              <Select
                value={newUnit.building_id}
                onChange={(e) =>
                  setNewUnit({
                    ...newUnit,
                    building_id: e.target.value,
                    wing_id: "",
                    floor_id: "",
                  })
                }
                className="text-xs"
                required
              >
                {buildings.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name} ({b.code})
                  </option>
                ))}
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Wing (Optional)</label>
                <Select
                  value={newUnit.wing_id}
                  onChange={(e) => setNewUnit({ ...newUnit, wing_id: e.target.value })}
                  className="text-xs"
                >
                  <option value="">None / Standalone</option>
                  {wingsInForm.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.name} ({w.code})
                    </option>
                  ))}
                </Select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Floor (Optional)</label>
                <Select
                  value={newUnit.floor_id}
                  onChange={(e) => setNewUnit({ ...newUnit, floor_id: e.target.value })}
                  className="text-xs"
                >
                  <option value="">None</option>
                  {floorsInForm.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.name} (Floor {f.floor_number})
                    </option>
                  ))}
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Unit / Flat # *</label>
                <Input
                  placeholder="e.g. A-101"
                  value={newUnit.unit_number}
                  onChange={(e) => setNewUnit({ ...newUnit, unit_number: e.target.value })}
                  className="text-xs"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Unit Type</label>
                <Select
                  value={newUnit.unit_type}
                  onChange={(e) => setNewUnit({ ...newUnit, unit_type: e.target.value as UnitType })}
                  className="text-xs"
                >
                  {UNIT_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t.replace(/_/g, " ")}
                    </option>
                  ))}
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Area (Sq. Ft.)</label>
                <Input
                  type="number"
                  placeholder="e.g. 1050"
                  value={newUnit.area_sqft}
                  onChange={(e) => setNewUnit({ ...newUnit, area_sqft: e.target.value })}
                  className="text-xs"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Initial Status</label>
                <Select
                  value={newUnit.status}
                  onChange={(e) => setNewUnit({ ...newUnit, status: e.target.value as UnitStatus })}
                  className="text-xs"
                >
                  {UNIT_STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {s.replace(/_/g, " ")}
                    </option>
                  ))}
                </Select>
              </div>
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsAddUnitOpen(false)}
                className="text-xs"
              >
                Cancel
              </Button>

              <Button
                type="submit"
                size="sm"
                disabled={isSubmitting || !newUnit.unit_number.trim() || !newUnit.building_id}
                className="text-xs bg-indigo-600 hover:bg-indigo-700 text-white"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                    Creating...
                  </>
                ) : (
                  "Create Unit"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Unit Detail Drawer for Ownership, Occupants, and Household */}
      <UnitDetailDrawer
        unit={selectedUnit}
        societyId={societyId}
        open={!!selectedUnit}
        onOpenChange={(open) => !open && setSelectedUnit(null)}
        onUnitUpdated={() => {
          fetchUnits(pagination.page);
          router.refresh();
        }}
      />
    </div>
  );
}
