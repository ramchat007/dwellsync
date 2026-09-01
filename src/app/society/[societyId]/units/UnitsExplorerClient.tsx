"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Unit, UnitStatus, UnitType } from "@/lib/types/database";
import { DoorOpen, Search, Layers, Filter, UserCheck, ChevronRight } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { UnitDetailDrawer } from "./UnitDetailDrawer";

export function UnitsExplorerClient({
  societyId,
  initialUnits,
}: {
  societyId: string;
  initialUnits: Unit[];
}) {
  const router = useRouter();
  const [units, setUnits] = useState<Unit[]>(initialUnits);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [typeFilter, setTypeFilter] = useState<string>("ALL");
  const [selectedUnit, setSelectedUnit] = useState<Unit | null>(null);

  const filtered = units.filter((u) => {
    const matchesSearch = u.unit_number.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === "ALL" || u.status === statusFilter;
    const matchesType = typeFilter === "ALL" || u.unit_type === typeFilter;
    return matchesSearch && matchesStatus && matchesType;
  });

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
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Units & Flats Explorer</h1>
          <p className="text-xs text-slate-500">
            Real-time occupancy status, unit dimensions, multi-owner equity, and flat tenant allocations.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-48">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
            <Input
              placeholder="Search unit number..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 text-xs"
            />
          </div>

          <Select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-32 text-xs"
          >
            <option value="ALL">All Statuses</option>
            <option value="OCCUPIED">Occupied</option>
            <option value="VACANT">Vacant</option>
            <option value="UNDER_MAINTENANCE">Maintenance</option>
            <option value="INACTIVE">Inactive</option>
          </Select>

          <Select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="w-28 text-xs"
          >
            <option value="ALL">All Types</option>
            <option value="1_BHK">1 BHK</option>
            <option value="2_BHK">2 BHK</option>
            <option value="3_BHK">3 BHK</option>
            <option value="4_BHK">4 BHK</option>
            <option value="PENTHOUSE">Penthouse</option>
            <option value="SHOP">Shop</option>
            <option value="OFFICE">Office</option>
          </Select>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Unit Number</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Area (Sq. Ft.)</TableHead>
              <TableHead>Occupancy Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length > 0 ? (
              filtered.map((unit) => (
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
                      <span>Manage</span>
                      <ChevronRight className="w-3 h-3" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={5} className="py-12 text-center text-slate-400 text-xs">
                  {search || statusFilter !== "ALL" || typeFilter !== "ALL"
                    ? "No matching units found."
                    : "No units created in this society yet."}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Unit Detail Drawer for Ownership, Occupants, and Household */}
      <UnitDetailDrawer
        unit={selectedUnit}
        societyId={societyId}
        open={!!selectedUnit}
        onOpenChange={(open) => !open && setSelectedUnit(null)}
        onUnitUpdated={() => router.refresh()}
      />
    </div>
  );
}

