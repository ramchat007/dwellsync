"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { BuildingWithHierarchy } from "@/lib/services/buildingService";
import { Building, Wing, Floor, Unit, UnitType, UnitStatus, Society } from "@/lib/types/database";
import {
  Building2,
  Layers,
  Plus,
  DoorOpen,
  ChevronRight,
  ChevronDown,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { BulkUnitGeneratorDialog } from "./BulkUnitGeneratorDialog";

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

export function BuildingHierarchyClient({
  societyId,
  initialBuildings,
  society,
}: {
  societyId: string;
  initialBuildings: BuildingWithHierarchy[];
  society?: Society;
}) {
  const router = useRouter();
  const [buildings, setBuildings] = useState<BuildingWithHierarchy[]>(initialBuildings);
  const [expandedBuildingId, setExpandedBuildingId] = useState<string | null>(
    initialBuildings[0]?.id || null
  );
  const [isCompletingOnboarding, setIsCompletingOnboarding] = useState(false);

  // Sync state when initialBuildings prop updates from router.refresh()
  useEffect(() => {
    setBuildings(initialBuildings);
  }, [initialBuildings]);

  // Modals
  const [isAddBuildingOpen, setIsAddBuildingOpen] = useState(false);
  const [isAddWingOpen, setIsAddWingOpen] = useState(false);
  const [isAddFloorOpen, setIsAddFloorOpen] = useState(false);
  const [isAddUnitOpen, setIsAddUnitOpen] = useState(false);
  const [isBulkGeneratorOpen, setIsBulkGeneratorOpen] = useState(false);

  const [selectedBuilding, setSelectedBuilding] = useState<BuildingWithHierarchy | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form states
  const [buildingForm, setBuildingForm] = useState({ name: "", code: "", number_of_floors: 1 });
  const [wingForm, setWingForm] = useState({ name: "", code: "" });
  const [floorForm, setFloorForm] = useState({ name: "", floor_number: 1, wing_id: "" });
  const [unitForm, setUnitForm] = useState<{
    unit_number: string;
    unit_type: UnitType;
    status: UnitStatus;
    wing_id: string;
    floor_id: string;
    area_sqft: string;
  }>({
    unit_number: "",
    unit_type: "2_BHK",
    status: "VACANT",
    wing_id: "",
    floor_id: "",
    area_sqft: "",
  });

  const handleCreateBuilding = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSubmitting(true);
      const res = await fetch(`/api/society/${societyId}/buildings`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: buildingForm.name,
          code: buildingForm.code,
          number_of_floors: Number(buildingForm.number_of_floors),
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setIsAddBuildingOpen(false);
        setBuildingForm({ name: "", code: "", number_of_floors: 1 });
        router.refresh();
      } else {
        alert(data.error || "Failed to create building");
      }
    } catch (err) {
      console.error(err);
      alert("Error creating building");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateWing = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBuilding) return;

    try {
      setIsSubmitting(true);
      const res = await fetch(`/api/society/${societyId}/wings`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          building_id: selectedBuilding.id,
          name: wingForm.name,
          code: wingForm.code,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setIsAddWingOpen(false);
        setWingForm({ name: "", code: "" });
        router.refresh();
      } else {
        alert(data.error || "Failed to create wing");
      }
    } catch (err) {
      console.error(err);
      alert("Error creating wing");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateFloor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBuilding) return;

    try {
      setIsSubmitting(true);
      const res = await fetch(`/api/society/${societyId}/floors`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          building_id: selectedBuilding.id,
          name: floorForm.name,
          floor_number: Number(floorForm.floor_number),
          wing_id: floorForm.wing_id || null,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setIsAddFloorOpen(false);
        setFloorForm({ name: "", floor_number: 1, wing_id: "" });
        router.refresh();
      } else {
        alert(data.error || "Failed to create floor");
      }
    } catch (err) {
      console.error(err);
      alert("Error creating floor");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateUnit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBuilding) return;

    try {
      setIsSubmitting(true);
      const res = await fetch(`/api/society/${societyId}/units`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          building_id: selectedBuilding.id,
          wing_id: unitForm.wing_id || null,
          floor_id: unitForm.floor_id || null,
          unit_number: unitForm.unit_number,
          unit_type: unitForm.unit_type,
          status: unitForm.status,
          area_sqft: unitForm.area_sqft ? Number(unitForm.area_sqft) : null,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setIsAddUnitOpen(false);
        setUnitForm({
          unit_number: "",
          unit_type: "2_BHK",
          status: "VACANT",
          wing_id: "",
          floor_id: "",
          area_sqft: "",
        });
        router.refresh();
      } else {
        alert(data.error || "Failed to create unit");
      }
    } catch (err) {
      console.error(err);
      alert("Error creating unit");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCompleteOnboarding = async () => {
    try {
      setIsCompletingOnboarding(true);
      const res = await fetch(`/api/superadmin/societies/${societyId}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "ACTIVE" }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        router.push(`/superadmin/societies/${societyId}`);
      } else {
        alert(data.error || "Failed to activate society");
      }
    } catch (err) {
      console.error(err);
      alert("Error completing onboarding");
    } finally {
      setIsCompletingOnboarding(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Buildings & Structural Hierarchy</h1>
          <p className="text-xs text-slate-500">
            Configure towers, wings, floor plans, and residential units within this society tenant.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {buildings.length > 0 && (
            <Button
              onClick={() => setIsBulkGeneratorOpen(true)}
              variant="outline"
              className="text-xs gap-1.5 border-indigo-200 text-indigo-700 hover:bg-indigo-50"
            >
              <Sparkles className="w-3.5 h-3.5" /> Generate Units
            </Button>
          )}

          <Button
            onClick={() => setIsAddBuildingOpen(true)}
            className="bg-indigo-600 hover:bg-indigo-700 text-white gap-1.5 text-xs"
          >
            <Plus className="w-4 h-4" /> Add Building / Tower
          </Button>
        </div>
      </div>

      {/* Onboarding Stage Physical Hierarchy Banner */}
      {society?.status === "ONBOARDING" && (
        <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-2xs animate-in fade-in-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-amber-100 rounded-lg text-amber-700 shrink-0">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <div className="font-bold text-xs">Onboarding Step: Physical Hierarchy Configuration</div>
              <p className="text-[11px] text-amber-700">
                Create buildings, wings, floors, and residential units for <strong>{society.name}</strong>. Once configured, click Complete to promote this society to ACTIVE.
              </p>
            </div>
          </div>

          <Button
            onClick={handleCompleteOnboarding}
            disabled={isCompletingOnboarding}
            className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs gap-1.5 font-semibold shrink-0 shadow"
          >
            {isCompletingOnboarding ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <CheckCircle2 className="w-3.5 h-3.5" />
            )}
            Complete Onboarding & Activate
          </Button>
        </div>
      )}

      {buildings.length > 0 ? (
        <div className="space-y-4">
          {buildings.map((building) => {
            const isExpanded = expandedBuildingId === building.id;

            return (
              <Card key={building.id} className="overflow-hidden border-slate-200 shadow-sm transition-all">
                <CardHeader className="bg-white p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-100">
                  <div
                    onClick={() => setExpandedBuildingId(isExpanded ? null : building.id)}
                    className="flex items-center gap-3 cursor-pointer select-none"
                  >
                    <div className="p-2.5 bg-indigo-50 text-indigo-700 rounded-xl">
                      <Building2 className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <CardTitle className="text-base font-bold">{building.name}</CardTitle>
                        <Badge variant="secondary" className="font-mono text-[10px]">
                          Code: {building.code}
                        </Badge>
                      </div>
                      <CardDescription className="text-xs mt-0.5">
                        {building.number_of_floors} Floors &middot; {building.wings.length} Wings &middot;{" "}
                        <strong className="text-slate-800">{building.unitsCount} Units</strong>
                      </CardDescription>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedBuilding(building);
                        setIsAddWingOpen(true);
                      }}
                      className="text-xs h-8 gap-1"
                    >
                      <Plus className="w-3.5 h-3.5" /> Wing
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedBuilding(building);
                        setIsAddFloorOpen(true);
                      }}
                      className="text-xs h-8 gap-1"
                    >
                      <Plus className="w-3.5 h-3.5" /> Floor
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => {
                        setSelectedBuilding(building);
                        setIsAddUnitOpen(true);
                      }}
                      className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs h-8 gap-1"
                    >
                      <Plus className="w-3.5 h-3.5" /> Unit
                    </Button>
                    <button
                      onClick={() => setExpandedBuildingId(isExpanded ? null : building.id)}
                      className="p-1 text-slate-400 hover:text-slate-700 transition-colors"
                    >
                      {isExpanded ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
                    </button>
                  </div>
                </CardHeader>

                {isExpanded && (
                  <CardContent className="p-4 sm:p-6 bg-slate-50/50 space-y-4">
                    {/* Wings Overview */}
                    <div className="space-y-2">
                      <div className="text-xs font-bold text-slate-700 uppercase tracking-wide flex items-center justify-between">
                        <span>Wings in {building.name} ({building.wings.length})</span>
                      </div>
                      {building.wings.length > 0 ? (
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                          {building.wings.map((w) => (
                            <div
                              key={w.id}
                              className="p-3 rounded-lg bg-white border border-slate-200 shadow-2xs text-xs"
                            >
                              <div className="font-bold text-slate-900">{w.name}</div>
                              <div className="text-[10px] text-slate-500 font-mono">Code: {w.code}</div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="p-3 rounded-lg bg-white border border-dashed border-slate-300 text-xs text-slate-400 italic">
                          No separate wings defined (Single block building)
                        </div>
                      )}
                    </div>

                    {/* Floors Overview */}
                    <div className="space-y-2 pt-2 border-t border-slate-200">
                      <div className="text-xs font-bold text-slate-700 uppercase tracking-wide flex items-center justify-between">
                        <span>Floor Layouts ({building.floors.length})</span>
                      </div>
                      {building.floors.length > 0 ? (
                        <div className="grid grid-cols-2 sm:grid-cols-6 gap-2">
                          {building.floors.map((f) => (
                            <div
                              key={f.id}
                              className="p-2.5 rounded-lg bg-white border border-slate-200 text-center text-xs"
                            >
                              <div className="font-bold text-slate-800">{f.name}</div>
                              <div className="text-[10px] text-slate-400 font-mono">
                                Level {f.floor_number}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="p-3 rounded-lg bg-white border border-dashed border-slate-300 text-xs text-slate-400 italic">
                          No individual floor levels logged yet.
                        </div>
                      )}
                    </div>
                  </CardContent>
                )}
              </Card>
            );
          })}
        </div>
      ) : (
        <Card className="border-dashed border-2 border-slate-300 bg-white">
          <CardHeader className="text-center py-12">
            <div className="w-12 h-12 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto mb-3">
              <Building2 className="w-6 h-6" />
            </div>
            <CardTitle className="text-lg font-bold text-slate-900">No Buildings Configured</CardTitle>
            <CardDescription className="text-xs text-slate-500 max-w-sm mx-auto">
              Get started by adding your first building, tower or block to organize floors and units.
            </CardDescription>
            <div className="pt-4">
              <Button
                onClick={() => setIsAddBuildingOpen(true)}
                className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs gap-1.5"
              >
                <Plus className="w-4 h-4" /> Add Building Now
              </Button>
            </div>
          </CardHeader>
        </Card>
      )}

      {/* Bulk Unit Generator Dialog */}
      <BulkUnitGeneratorDialog
        open={isBulkGeneratorOpen}
        onOpenChange={setIsBulkGeneratorOpen}
        societyId={societyId}
        buildings={buildings}
        onSuccess={() => router.refresh()}
      />

      {/* Add Building Dialog */}
      <Dialog open={isAddBuildingOpen} onOpenChange={setIsAddBuildingOpen}>
        <DialogHeader>
          <DialogTitle>Add Building / Tower</DialogTitle>
          <DialogDescription>
            Create a structural building or tower within this housing society.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleCreateBuilding} className="space-y-3.5 mt-3 text-xs">
          <div className="space-y-1">
            <label className="font-semibold text-slate-700">Building Name *</label>
            <Input
              required
              placeholder="e.g. Tower A / Block 1"
              value={buildingForm.name}
              onChange={(e) => setBuildingForm({ ...buildingForm, name: e.target.value })}
              className="text-xs"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="font-semibold text-slate-700">Building Code *</label>
              <Input
                required
                placeholder="e.g. TWR-A"
                value={buildingForm.code}
                onChange={(e) => setBuildingForm({ ...buildingForm, code: e.target.value.toUpperCase() })}
                className="text-xs font-mono uppercase"
              />
            </div>
            <div className="space-y-1">
              <label className="font-semibold text-slate-700">Total Floors</label>
              <Input
                type="number"
                min="0"
                value={buildingForm.number_of_floors}
                onChange={(e) =>
                  setBuildingForm({ ...buildingForm, number_of_floors: parseInt(e.target.value) || 0 })
                }
                className="text-xs"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsAddBuildingOpen(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting} className="bg-indigo-600 hover:bg-indigo-700">
              {isSubmitting ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> : null}
              Create Building
            </Button>
          </DialogFooter>
        </form>
      </Dialog>

      {/* Add Wing Dialog */}
      <Dialog open={isAddWingOpen} onOpenChange={setIsAddWingOpen}>
        <DialogHeader>
          <DialogTitle>Add Wing to {selectedBuilding?.name}</DialogTitle>
          <DialogDescription>Specify a wing or section within this building.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleCreateWing} className="space-y-3.5 mt-3 text-xs">
          <div className="space-y-1">
            <label className="font-semibold text-slate-700">Wing Name *</label>
            <Input
              required
              placeholder="e.g. Wing A / East Wing"
              value={wingForm.name}
              onChange={(e) => setWingForm({ ...wingForm, name: e.target.value })}
              className="text-xs"
            />
          </div>
          <div className="space-y-1">
            <label className="font-semibold text-slate-700">Wing Code *</label>
            <Input
              required
              placeholder="e.g. WING-A"
              value={wingForm.code}
              onChange={(e) => setWingForm({ ...wingForm, code: e.target.value.toUpperCase() })}
              className="text-xs font-mono uppercase"
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsAddWingOpen(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting} className="bg-indigo-600 hover:bg-indigo-700">
              {isSubmitting ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> : null}
              Create Wing
            </Button>
          </DialogFooter>
        </form>
      </Dialog>

      {/* Add Floor Dialog */}
      <Dialog open={isAddFloorOpen} onOpenChange={setIsAddFloorOpen}>
        <DialogHeader>
          <DialogTitle>Add Floor to {selectedBuilding?.name}</DialogTitle>
          <DialogDescription>Register a floor level in the building hierarchy.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleCreateFloor} className="space-y-3.5 mt-3 text-xs">
          <div className="space-y-1">
            <label className="font-semibold text-slate-700">Floor Name / Label *</label>
            <Input
              required
              placeholder="e.g. Ground Floor / 1st Floor / Basement"
              value={floorForm.name}
              onChange={(e) => setFloorForm({ ...floorForm, name: e.target.value })}
              className="text-xs"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="font-semibold text-slate-700">Floor Number *</label>
              <Input
                type="number"
                required
                placeholder="0 for Ground, -1 for Basement"
                value={floorForm.floor_number}
                onChange={(e) => setFloorForm({ ...floorForm, floor_number: parseInt(e.target.value) || 0 })}
                className="text-xs font-mono"
              />
            </div>
            {selectedBuilding?.wings && selectedBuilding.wings.length > 0 && (
              <div className="space-y-1">
                <label className="font-semibold text-slate-700">Wing (Optional)</label>
                <Select
                  value={floorForm.wing_id}
                  onChange={(e) => setFloorForm({ ...floorForm, wing_id: e.target.value })}
                  className="text-xs"
                >
                  <option value="">All / Building Level</option>
                  {selectedBuilding.wings.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.name} ({w.code})
                    </option>
                  ))}
                </Select>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsAddFloorOpen(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting} className="bg-indigo-600 hover:bg-indigo-700">
              {isSubmitting ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> : null}
              Create Floor
            </Button>
          </DialogFooter>
        </form>
      </Dialog>

      {/* Add Unit Dialog */}
      <Dialog open={isAddUnitOpen} onOpenChange={setIsAddUnitOpen}>
        <DialogHeader>
          <DialogTitle>Add Unit / Flat to {selectedBuilding?.name}</DialogTitle>
          <DialogDescription>Register an individual apartment or commercial unit.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleCreateUnit} className="space-y-3.5 mt-3 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="font-semibold text-slate-700">Unit / Flat Number *</label>
              <Input
                required
                placeholder="e.g. 101 / A-204"
                value={unitForm.unit_number}
                onChange={(e) => setUnitForm({ ...unitForm, unit_number: e.target.value })}
                className="text-xs font-mono font-semibold"
              />
            </div>
            <div className="space-y-1">
              <label className="font-semibold text-slate-700">Unit Type</label>
              <Select
                value={unitForm.unit_type}
                onChange={(e) => setUnitForm({ ...unitForm, unit_type: e.target.value as UnitType })}
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
            <div className="space-y-1">
              <label className="font-semibold text-slate-700">Unit Status</label>
              <Select
                value={unitForm.status}
                onChange={(e) => setUnitForm({ ...unitForm, status: e.target.value as UnitStatus })}
                className="text-xs"
              >
                {UNIT_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s.replace(/_/g, " ")}
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-1">
              <label className="font-semibold text-slate-700">Carpet Area (sq. ft.)</label>
              <Input
                type="number"
                placeholder="e.g. 850"
                value={unitForm.area_sqft}
                onChange={(e) => setUnitForm({ ...unitForm, area_sqft: e.target.value })}
                className="text-xs"
              />
            </div>
          </div>

          {selectedBuilding?.wings && selectedBuilding.wings.length > 0 && (
            <div className="space-y-1">
              <label className="font-semibold text-slate-700">Assigned Wing</label>
              <Select
                value={unitForm.wing_id}
                onChange={(e) => setUnitForm({ ...unitForm, wing_id: e.target.value })}
                className="text-xs"
              >
                <option value="">No Wing Assignment</option>
                {selectedBuilding.wings.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name}
                  </option>
                ))}
              </Select>
            </div>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsAddUnitOpen(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting} className="bg-indigo-600 hover:bg-indigo-700">
              {isSubmitting ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> : null}
              Create Unit
            </Button>
          </DialogFooter>
        </form>
      </Dialog>
    </div>
  );
}

