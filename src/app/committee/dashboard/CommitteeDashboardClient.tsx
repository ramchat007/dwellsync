"use client";

import React from "react";
import Link from "next/link";
import { Profile, Society, RoleId } from "@/lib/types/database";
import {
  Building2,
  Users,
  DoorOpen,
  Calendar,
  CheckSquare,
  FileText,
  Vote,
  Sparkles,
  ArrowRight,
  Shield,
  Layers,
  Settings,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export function CommitteeDashboardClient({
  profile,
  society,
  role,
  stats,
}: {
  profile: Profile;
  society: Society | null;
  role: RoleId;
  stats: { totalBuildings: number; totalUnits: number; totalMembers: number };
}) {
  const sid = society?.id || "default";

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      {/* Top Banner */}
      <div className="p-5 sm:p-6 rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white shadow-lg border border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Badge variant="purple" className="font-mono text-[10px] px-2 py-0.5">
              {role === "SECRETARY" ? "HON. SECRETARY" : "MANAGING COMMITTEE"}
            </Badge>
            <span className="text-xs text-slate-400 font-medium">{society?.name || "Society"}</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight">
            Governance Dashboard — {profile.full_name || "Committee"}
          </h1>
          <p className="text-xs text-slate-300">
            Society oversight, resolutions, physical infrastructure, and member management.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link href={`/society/${sid}/society`}>
            <Button variant="secondary" size="sm" className="text-xs font-semibold gap-1.5 shadow-sm">
              <Settings className="w-3.5 h-3.5" />
              <span>Society Profile</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* Society Quick Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-slate-200 shadow-sm bg-white">
          <CardContent className="p-4 flex items-center gap-3 text-xs">
            <div className="p-2.5 rounded-xl bg-indigo-50 text-indigo-600">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <div className="text-slate-400 text-[11px]">Registered Buildings</div>
              <div className="text-xl font-bold text-slate-900">{stats.totalBuildings}</div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-sm bg-white">
          <CardContent className="p-4 flex items-center gap-3 text-xs">
            <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-600">
              <DoorOpen className="w-5 h-5" />
            </div>
            <div>
              <div className="text-slate-400 text-[11px]">Configured Units</div>
              <div className="text-xl font-bold text-slate-900">{stats.totalUnits}</div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-sm bg-white">
          <CardContent className="p-4 flex items-center gap-3 text-xs">
            <div className="p-2.5 rounded-xl bg-amber-50 text-amber-600">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <div className="text-slate-400 text-[11px]">Active Members & Residents</div>
              <div className="text-xl font-bold text-slate-900">{stats.totalMembers}</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Grid: Management Shortcuts + Governance Modules */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        {/* Left Column: Management Hub */}
        <div className="md:col-span-7 space-y-4">
          <div className="text-xs font-bold text-slate-700 uppercase tracking-wide">
            Operational Administration
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Link href={`/society/${sid}/buildings`}>
              <Card className="border-slate-200 hover:border-indigo-400 transition-all p-4 bg-white shadow-2xs group cursor-pointer">
                <div className="flex items-center justify-between mb-2">
                  <div className="p-2 rounded-lg bg-indigo-50 text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                    <Building2 className="w-4 h-4" />
                  </div>
                  <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-indigo-600" />
                </div>
                <div className="font-bold text-xs text-slate-900">Buildings & Wings</div>
                <div className="text-[11px] text-slate-500 mt-0.5">Manage towers, wings and floors</div>
              </Card>
            </Link>

            <Link href={`/society/${sid}/units`}>
              <Card className="border-slate-200 hover:border-indigo-400 transition-all p-4 bg-white shadow-2xs group cursor-pointer">
                <div className="flex items-center justify-between mb-2">
                  <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                    <DoorOpen className="w-4 h-4" />
                  </div>
                  <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-indigo-600" />
                </div>
                <div className="font-bold text-xs text-slate-900">Units & Ownership</div>
                <div className="text-[11px] text-slate-500 mt-0.5">Explore apartments, equity & leases</div>
              </Card>
            </Link>

            <Link href={`/society/${sid}/people`}>
              <Card className="border-slate-200 hover:border-indigo-400 transition-all p-4 bg-white shadow-2xs group cursor-pointer">
                <div className="flex items-center justify-between mb-2">
                  <div className="p-2 rounded-lg bg-amber-50 text-amber-600 group-hover:bg-amber-600 group-hover:text-white transition-colors">
                    <Users className="w-4 h-4" />
                  </div>
                  <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-indigo-600" />
                </div>
                <div className="font-bold text-xs text-slate-900">People Directory</div>
                <div className="text-[11px] text-slate-500 mt-0.5">Roster of owners, tenants & staff</div>
              </Card>
            </Link>

            <Link href={`/society/${sid}/committees`}>
              <Card className="border-slate-200 hover:border-indigo-400 transition-all p-4 bg-white shadow-2xs group cursor-pointer">
                <div className="flex items-center justify-between mb-2">
                  <div className="p-2 rounded-lg bg-indigo-50 text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                    <Shield className="w-4 h-4" />
                  </div>
                  <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-indigo-600" />
                </div>
                <div className="font-bold text-xs text-slate-900">Committees & Governance</div>
                <div className="text-[11px] text-slate-500 mt-0.5">Manage office bearers, tenure & rosters</div>
              </Card>
            </Link>

            <Link href={`/society/${sid}/meetings`}>
              <Card className="border-slate-200 hover:border-indigo-400 transition-all p-4 bg-white shadow-2xs group cursor-pointer">
                <div className="flex items-center justify-between mb-2">
                  <div className="p-2 rounded-lg bg-indigo-50 text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                    <Calendar className="w-4 h-4" />
                  </div>
                  <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-indigo-600" />
                </div>
                <div className="font-bold text-xs text-slate-900">Meetings & Proceedings</div>
                <div className="text-[11px] text-slate-500 mt-0.5">Schedule meetings, agendas, quorum & minutes</div>
              </Card>
            </Link>
          </div>
        </div>

        {/* Right Column: Governance Modules */}
        <div className="md:col-span-5 space-y-4">
          <div className="text-xs font-bold text-slate-700 uppercase tracking-wide">
            Governance Administration
          </div>

          <Card className="border-slate-200 shadow-sm bg-white">
            <CardHeader className="pb-3 border-b border-slate-100">
              <CardTitle className="text-xs font-bold flex items-center justify-between text-slate-900">
                <span className="flex items-center gap-2">
                  <Shield className="w-4 h-4 text-indigo-600" /> Managing Committee
                </span>
                <Badge variant="outline" className="text-[10px] font-medium text-emerald-600 border-emerald-200">
                  Active System
                </Badge>
              </CardTitle>
              <CardDescription className="text-[11px] text-slate-500">
                Oversee constitutional bodies, office appointments and executive transitions.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-4 pb-4 text-xs space-y-3">
              <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-lg border border-slate-100 dark:border-slate-800 space-y-1">
                <div className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-indigo-600" />
                  Constitutional Committee Roster
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Manage President, Secretary, Treasurer, and executive members with temporal tenure tracking.
                </p>
              </div>

              <div className="flex flex-col gap-2">
                <Link href={`/society/${sid}/committees`} className="block w-full">
                  <Button className="w-full text-xs font-medium gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white">
                    <Shield className="w-3.5 h-3.5" />
                    <span>Open Committee Management</span>
                    <ArrowRight className="w-3.5 h-3.5 ml-auto" />
                  </Button>
                </Link>

                <Link href={`/society/${sid}/meetings`} className="block w-full">
                  <Button variant="outline" className="w-full text-xs font-medium gap-1.5 border-slate-300 hover:bg-slate-50">
                    <Calendar className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Meetings & Proceedings Workspace</span>
                    <ArrowRight className="w-3.5 h-3.5 ml-auto" />
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

