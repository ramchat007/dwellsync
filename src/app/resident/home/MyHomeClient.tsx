"use client";

import React from "react";
import Link from "next/link";
import {
  Building2,
  Key,
  Users,
  Zap,
  Flame,
  Droplets,
  PhoneCall,
  ShieldCheck,
  CheckCircle2,
  Calendar,
  Layers,
  Sparkles,
} from "lucide-react";
import { Profile, Society, Unit } from "@/lib/types/database";

interface MyHomeClientProps {
  profile: Profile;
  society: Society | null;
  units: (Unit & {
    building?: { name: string; code: string };
    wing?: { name: string; code: string };
    floor?: { name: string; floor_number: number };
    occupancy?: {
      occupancy_type: string;
      move_in_date: string;
      police_verification_status: string;
    };
    ownership?: {
      ownership_type: string;
      ownership_percentage?: number;
      share_percentage?: number;
      start_date?: string;
      ownership_start_date?: string;
    };
  })[];
}

export function MyHomeClient({ profile, society, units }: MyHomeClientProps) {
  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            <Building2 className="w-7 h-7 text-blue-600 dark:text-blue-400" />
            My Home & Units
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Registered residential units and utility meters in {society?.name || "your society"}.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/resident/family"
            className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-xl bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 hover:bg-blue-100 transition"
          >
            <Users className="w-4 h-4" />
            Manage Family
          </Link>
        </div>
      </div>

      {/* Units List */}
      {units.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-8 text-center shadow-sm">
          <div className="w-12 h-12 rounded-full bg-amber-50 dark:bg-amber-950/40 text-amber-600 mx-auto flex items-center justify-center mb-3">
            <Key className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-slate-900 dark:text-white">No Unit Registered</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
            You are a member of {society?.name}, but no flat or unit has been assigned to your profile yet.
            Please contact your society office or manager to link your flat.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6">
          {units.map((unit) => {
            const buildingName = unit.building?.name || "Building";
            const wingName = unit.wing?.name || "";
            const floorNum = unit.floor?.name || `Floor ${unit.floor_id || 1}`;
            const occupancyType = unit.occupancy?.occupancy_type || "RESIDENT";
            const isOwner = !!unit.ownership;

            return (
              <div
                key={unit.id}
                className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-6"
              >
                {/* Unit Top Bar */}
                <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 rounded-2xl bg-blue-600 text-white flex items-center justify-center font-black text-lg shadow-md shadow-blue-500/20">
                      {unit.unit_number}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                          Unit {unit.unit_number}
                        </h2>
                        <span className="px-2.5 py-0.5 text-[11px] font-bold rounded-full bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                          {unit.unit_type?.replace("_", " ") || "2 BHK"}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500">
                        {buildingName} {wingName ? `• ${wingName}` : ""} • {floorNum}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {isOwner ? (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-bold rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Owner ({unit.ownership?.ownership_percentage ?? unit.ownership?.share_percentage ?? 100}%)
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-bold rounded-full bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                        <Key className="w-3.5 h-3.5" />
                        {occupancyType.replace("_", " ")}
                      </span>
                    )}
                  </div>
                </div>

                {/* Specs Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div className="bg-slate-50 dark:bg-slate-800/50 p-3.5 rounded-xl">
                    <span className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">
                      Carpet Area
                    </span>
                    <p className="text-sm font-bold text-slate-900 dark:text-white mt-0.5">
                      {unit.carpet_area_sqft || unit.area_sqft || "—"} sq.ft
                    </p>
                  </div>
                  <div className="bg-slate-50 dark:bg-slate-800/50 p-3.5 rounded-xl">
                    <span className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">
                      Layout
                    </span>
                    <p className="text-sm font-bold text-slate-900 dark:text-white mt-0.5">
                      {unit.bedrooms || 2} Bed • {unit.bathrooms || 2} Bath
                    </p>
                  </div>
                  <div className="bg-slate-50 dark:bg-slate-800/50 p-3.5 rounded-xl">
                    <span className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">
                      Parking Slots
                    </span>
                    <p className="text-sm font-bold text-slate-900 dark:text-white mt-0.5">
                      {unit.parking_slots || 1} Assigned
                    </p>
                  </div>
                  <div className="bg-slate-50 dark:bg-slate-800/50 p-3.5 rounded-xl">
                    <span className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">
                      Intercom Ext.
                    </span>
                    <p className="text-sm font-bold text-slate-900 dark:text-white mt-0.5">
                      {unit.intercom_number || `Ext ${unit.unit_number.replace(/\D/g, "")}`}
                    </p>
                  </div>
                </div>

                {/* Utility Meters */}
                <div className="space-y-3 pt-2">
                  <h3 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                    Registered Utility Meters
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="flex items-center gap-3 p-3 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900">
                      <div className="w-8 h-8 rounded-lg bg-amber-50 dark:bg-amber-950/40 text-amber-600 flex items-center justify-center">
                        <Zap className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-500 block">Electricity Meter</span>
                        <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                          {unit.meter_number_electricity || "MSEB-789234"}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 p-3 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900">
                      <div className="w-8 h-8 rounded-lg bg-orange-50 dark:bg-orange-950/40 text-orange-600 flex items-center justify-center">
                        <Flame className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-500 block">Piped Gas Meter</span>
                        <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                          {unit.meter_number_gas || "MGL-99214"}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 p-3 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900">
                      <div className="w-8 h-8 rounded-lg bg-cyan-50 dark:bg-cyan-950/40 text-cyan-600 flex items-center justify-center">
                        <Droplets className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-500 block">Water Meter</span>
                        <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                          {unit.meter_number_water || "WM-00452"}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

