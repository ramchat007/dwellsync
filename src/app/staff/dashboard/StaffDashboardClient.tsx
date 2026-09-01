"use client";

import React from "react";
import Link from "next/link";
import { Profile, Society, RoleId } from "@/lib/types/database";
import {
  Wrench,
  Building2,
  Users,
  DoorOpen,
  CheckSquare,
  Clock,
  Sparkles,
  ArrowRight,
  ClipboardList,
  AlertCircle,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export function StaffDashboardClient({
  profile,
  society,
  role,
}: {
  profile: Profile;
  society: Society | null;
  role: RoleId;
}) {
  const sid = society?.id || "default";

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      {/* Top Banner */}
      <div className="p-5 sm:p-6 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white shadow-lg border border-slate-700 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Badge variant="default" className="font-mono text-[10px] px-2 py-0.5">
              OPERATIONS & MAINTENANCE
            </Badge>
            <span className="text-xs text-slate-400 font-medium">{society?.name || "Society"}</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight">
            Staff Portal — {profile.full_name || "Team Member"}
          </h1>
          <p className="text-xs text-slate-300">
            Work tickets, preventive maintenance, building equipment, and facility tasks.
          </p>
        </div>

        <Link href={`/society/${sid}/units`}>
          <Button variant="secondary" size="sm" className="text-xs font-semibold gap-1.5 shadow-sm">
            <DoorOpen className="w-3.5 h-3.5" />
            <span>Units & Assets</span>
          </Button>
        </Link>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        {/* Left Column: Assigned Work Orders */}
        <div className="md:col-span-7 space-y-4">
          <Card className="border-slate-200 shadow-sm bg-white">
            <CardHeader className="pb-3 border-b border-slate-100">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <ClipboardList className="w-4 h-4 text-indigo-600" /> Assigned Work Orders
                </CardTitle>
                <Badge variant="purple" className="font-mono text-[9px]">
                  COMING SOON
                </Badge>
              </div>
              <CardDescription className="text-xs">
                Maintenance tickets dispatched by society residents or facility manager.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-4 text-xs text-slate-500 text-center py-8">
              <Wrench className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <div className="font-bold text-slate-800">No active work orders</div>
              <p className="text-[11px] text-slate-400 mt-1 max-w-xs mx-auto">
                Ticketing workflow module will be activated in upcoming maintenance release.
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Shortcuts */}
        <div className="md:col-span-5 space-y-4">
          <div className="text-xs font-bold text-slate-700 uppercase tracking-wide">
            Facility Directory Access
          </div>

          <div className="space-y-3">
            <Link href={`/society/${sid}/units`}>
              <Card className="border-slate-200 hover:border-indigo-400 transition-all p-3.5 bg-white shadow-2xs group cursor-pointer">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-xs text-slate-900">Units & Towers</span>
                  <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-indigo-600" />
                </div>
                <div className="text-[11px] text-slate-500">Locate flat numbers, floors and wings</div>
              </Card>
            </Link>

            <Link href={`/society/${sid}/people`}>
              <Card className="border-slate-200 hover:border-indigo-400 transition-all p-3.5 bg-white shadow-2xs group cursor-pointer">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-xs text-slate-900">Society Contact Directory</span>
                  <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-indigo-600" />
                </div>
                <div className="text-[11px] text-slate-500">View society management and staff roster</div>
              </Card>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

