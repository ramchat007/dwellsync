"use client";

import React, { useState } from "react";
import { Building, Wing, UnitType } from "@/lib/types/database";
import { GeneratedUnitItem, generateUnitDefinitions } from "@/lib/services/unitBatchService";
import { Layers, Plus, Trash2, Loader2, Check, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

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

export function BulkUnitGeneratorDialog({
  open,
  onOpenChange,
  societyId,
  buildings,
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  societyId: string;
  buildings: (Building & { wings: Wing[] })[];
  onSuccess: () => void;
}) {
  const [selectedBuildingId, setSelectedBuildingId] = useState<string>(buildings[0]?.id || "");
  const [selectedWingId, setSelectedWingId] = useState<string>("");
  const [startFloor, setStartFloor] = useState(1);
  const [endFloor, setEndFloor] = useState(buildings[0]?.number_of_floors || 5);
  const [unitsPerFloor, setUnitsPerFloor] = useState(4);
  const [prefix, setPrefix] = useState(buildings[0]?.code || "A");
  const [unitType, setUnitType] = useState<UnitType>("2_BHK");
  const [areaSqft, setAreaSqft] = useState<string>("950");

  const [generatedUnits, setGeneratedUnits] = useState<GeneratedUnitItem[]>([]);
  const [isGenerated, setIsGenerated] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedBuilding = buildings.find((b) => b.id === selectedBuildingId);

  const handleGeneratePreview = () => {
    setError(null);
    if (!selectedBuildingId) {
      setError("Please select a building.");
      return;
    }

    const units = generateUnitDefinitions({
      society_id: societyId,
      building_id: selectedBuildingId,
      wing_id: selectedWingId || null,
      start_floor: Number(startFloor),
      end_floor: Number(endFloor),
      units_per_floor: Number(unitsPerFloor),
      prefix,
      unit_type: unitType,
      area_sqft: areaSqft ? Number(areaSqft) : null,
      pattern: "{prefix}{floor}{unit}",
    });

    setGeneratedUnits(units);
    setIsGenerated(true);
  };

  const handleRemoveUnit = (index: number) => {
    setGeneratedUnits((prev) => prev.filter((_, i) => i !== index));
  };

  const handleCommitCreation = async () => {
    if (generatedUnits.length === 0) return;

    try {
      setIsSubmitting(true);
      setError(null);

      const res = await fetch(`/api/society/${societyId}/units/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          building_id: selectedBuildingId,
          wing_id: selectedWingId || null,
          start_floor: startFloor,
          end_floor: endFloor,
          units_per_floor: unitsPerFloor,
          prefix,
          unit_type: unitType,
          area_sqft: areaSqft ? Number(areaSqft) : null,
          units: generatedUnits,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        onOpenChange(false);
        setIsGenerated(false);
        setGeneratedUnits([]);
        onSuccess();
      } else {
        setError(data.error || "Failed to batch create units");
      }
    } catch (err) {
      console.error(err);
      setError("Network error creating units.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <Layers className="w-5 h-5 text-indigo-600" /> Generate Units in Bulk
        </DialogTitle>
        <DialogDescription>
          Algorithmic batch creation of floor-by-floor residential and commercial units.
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-4 mt-2 text-xs">
        {error && (
          <div className="p-2.5 bg-red-50 border border-red-200 text-red-800 rounded-lg">
            {error}
          </div>
        )}

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-3 rounded-lg border border-slate-200">
          <div className="space-y-1">
            <label className="font-semibold text-slate-700">Target Building *</label>
            <Select
              value={selectedBuildingId}
              onChange={(e) => {
                setSelectedBuildingId(e.target.value);
                const b = buildings.find((x) => x.id === e.target.value);
                if (b) {
                  setEndFloor(b.number_of_floors);
                  setPrefix(b.code);
                }
              }}
              className="text-xs bg-white"
            >
              {buildings.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name} ({b.code})
                </option>
              ))}
            </Select>
          </div>

          {selectedBuilding?.wings && selectedBuilding.wings.length > 0 && (
            <div className="space-y-1">
              <label className="font-semibold text-slate-700">Target Wing</label>
              <Select
                value={selectedWingId}
                onChange={(e) => setSelectedWingId(e.target.value)}
                className="text-xs bg-white"
              >
                <option value="">Entire Building</option>
                {selectedBuilding.wings.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name} ({w.code})
                  </option>
                ))}
              </Select>
            </div>
          )}

          <div className="space-y-1">
            <label className="font-semibold text-slate-700">Unit Prefix</label>
            <Input
              value={prefix}
              onChange={(e) => setPrefix(e.target.value)}
              placeholder="e.g. A"
              className="text-xs bg-white font-mono uppercase"
            />
          </div>

          <div className="space-y-1">
            <label className="font-semibold text-slate-700">Default Type</label>
            <Select
              value={unitType}
              onChange={(e) => setUnitType(e.target.value as UnitType)}
              className="text-xs bg-white"
            >
              {UNIT_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t.replace(/_/g, " ")}
                </option>
              ))}
            </Select>
          </div>

          <div className="space-y-1">
            <label className="font-semibold text-slate-700">Start Floor</label>
            <Input
              type="number"
              value={startFloor}
              onChange={(e) => setStartFloor(parseInt(e.target.value) || 0)}
              className="text-xs bg-white"
            />
          </div>

          <div className="space-y-1">
            <label className="font-semibold text-slate-700">End Floor</label>
            <Input
              type="number"
              value={endFloor}
              onChange={(e) => setEndFloor(parseInt(e.target.value) || 1)}
              className="text-xs bg-white"
            />
          </div>

          <div className="space-y-1">
            <label className="font-semibold text-slate-700">Units / Floor</label>
            <Input
              type="number"
              min="1"
              max="50"
              value={unitsPerFloor}
              onChange={(e) => setUnitsPerFloor(parseInt(e.target.value) || 1)}
              className="text-xs bg-white"
            />
          </div>

          <div className="space-y-1">
            <label className="font-semibold text-slate-700">Carpet Area (Sq. Ft.)</label>
            <Input
              type="number"
              value={areaSqft}
              onChange={(e) => setAreaSqft(e.target.value)}
              placeholder="e.g. 950"
              className="text-xs bg-white"
            />
          </div>
        </div>

        <div className="flex items-center justify-between">
          <Button
            type="button"
            variant="outline"
            onClick={handleGeneratePreview}
            className="text-xs gap-1.5"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Generate Preview
          </Button>

          {isGenerated && (
            <span className="text-xs font-semibold text-indigo-700 font-mono">
              {generatedUnits.length} Units Generated
            </span>
          )}
        </div>

        {/* Live Preview Table */}
        {isGenerated && (
          <div className="max-h-56 overflow-y-auto border border-slate-200 rounded-lg bg-white">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Unit Number</TableHead>
                  <TableHead>Floor</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Area (Sq. Ft.)</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {generatedUnits.map((u, idx) => (
                  <TableRow key={idx}>
                    <TableCell className="font-mono font-bold text-xs">{u.unit_number}</TableCell>
                    <TableCell className="font-mono text-xs">{u.floor_number}</TableCell>
                    <TableCell className="text-xs">{u.unit_type}</TableCell>
                    <TableCell className="font-mono text-xs">{u.area_sqft || "—"}</TableCell>
                    <TableCell className="text-right">
                      <button
                        type="button"
                        onClick={() => handleRemoveUnit(idx)}
                        className="text-red-500 hover:text-red-700 p-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        <DialogFooter className="pt-3 border-t border-slate-100">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            type="button"
            disabled={!isGenerated || generatedUnits.length === 0 || isSubmitting}
            onClick={handleCommitCreation}
            className="bg-indigo-600 hover:bg-indigo-700 text-white gap-1.5"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" /> Creating {generatedUnits.length} Units...
              </>
            ) : (
              <>
                <Check className="w-3.5 h-3.5" /> Batch Create {generatedUnits.length} Units
              </>
            )}
          </Button>
        </DialogFooter>
      </div>
    </Dialog>
  );
}

