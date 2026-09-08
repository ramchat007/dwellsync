import React from "react";
import Link from "next/link";
import { requireSocietyAccess, roleHasPermission } from "@/lib/auth/server";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { getSocietyMetrics } from "@/lib/services/societyService";
import {
  Building2,
  Users,
  Layers,
  DoorOpen,
  Receipt,
  MessageSquare,
  ShieldAlert,
  ArrowRight,
  Plus,
  Sparkles,
  UserPlus,
  Send,
  BarChart3,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/shell/PageHeader";

export const dynamic = "force-dynamic";

export default async function SocietyDashboardPage({
  params,
}: {
  params: Promise<{ societyId: string }>;
}) {
  const { societyId } = await params;
  const { identity, society } = await requireSocietyAccess(societyId);
  const metrics = await getSocietyMetrics(societyId);

  return (
    <div className="space-y-6">
      <PageHeader
        title={society.name}
        description={`Operating System for ${society.name} (${society.code}) — ${society.city || "India"}.`}
        badge={
          <Badge variant="success" className="font-mono text-[10px]">
            {society.status} TENANT
          </Badge>
        }
        actions={
          <div className="flex items-center gap-2">
            {roleHasPermission(identity.currentRole, PERMISSIONS.ANALYTICS_VIEW) && (
              <Link href={`/society/${societyId}/analytics`}>
                <Button variant="outline" size="sm" className="text-xs gap-1.5 border-slate-300">
                  <BarChart3 className="w-3.5 h-3.5 text-indigo-600" /> Analytics & Reports
                </Button>
              </Link>
            )}
            <Link href={`/society/${societyId}/buildings`}>
              <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs gap-1.5 shadow">
                <Plus className="w-3.5 h-3.5" /> Manage Buildings & Units
              </Button>
            </Link>
          </div>
        }
      />

      {/* Identity & Active Role Banner */}
      <div className="p-5 rounded-xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white shadow-lg flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border border-slate-800">
        <div className="space-y-1">
          <div className="text-[11px] font-mono text-indigo-400 uppercase font-semibold">
            Active Tenant Context
          </div>
          <div className="text-lg font-bold">
            {identity.effectiveUser.full_name || "Resident"} &middot;{" "}
            <span className="text-indigo-300 font-mono">{identity.currentRole}</span>
          </div>
          <p className="text-slate-400 text-xs">
            {identity.permissions.length} granular permissions granted in this society tenant.
          </p>
        </div>

        <div className="text-xs font-mono bg-slate-950/80 px-3 py-1.5 rounded-lg border border-slate-800 text-slate-300">
          Tenant ID: {society.id.substring(0, 8)}...
        </div>
      </div>

      {/* Quick Action Shortcuts Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Link href={`/society/${societyId}/buildings`}>
          <div className="p-3.5 rounded-xl bg-white border border-slate-200 hover:border-indigo-400 hover:bg-indigo-50/30 transition-all cursor-pointer shadow-2xs group flex items-center gap-3">
            <div className="p-2 bg-indigo-50 text-indigo-700 group-hover:bg-indigo-600 group-hover:text-white rounded-lg transition-colors">
              <Building2 className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-bold text-slate-900 group-hover:text-indigo-700">Add Building</div>
              <div className="text-[10px] text-slate-400">Towers & Wings</div>
            </div>
          </div>
        </Link>

        <Link href={`/society/${societyId}/buildings`}>
          <div className="p-3.5 rounded-xl bg-white border border-slate-200 hover:border-indigo-400 hover:bg-indigo-50/30 transition-all cursor-pointer shadow-2xs group flex items-center gap-3">
            <div className="p-2 bg-cyan-50 text-cyan-700 group-hover:bg-cyan-600 group-hover:text-white rounded-lg transition-colors">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-bold text-slate-900 group-hover:text-cyan-700">Generate Units</div>
              <div className="text-[10px] text-slate-400">Bulk Creation</div>
            </div>
          </div>
        </Link>

        <Link href={`/society/${societyId}/people`}>
          <div className="p-3.5 rounded-xl bg-white border border-slate-200 hover:border-emerald-400 hover:bg-emerald-50/30 transition-all cursor-pointer shadow-2xs group flex items-center gap-3">
            <div className="p-2 bg-emerald-50 text-emerald-700 group-hover:bg-emerald-600 group-hover:text-white rounded-lg transition-colors">
              <UserPlus className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-bold text-slate-900 group-hover:text-emerald-700">Add Person</div>
              <div className="text-[10px] text-slate-400">Resident / Staff</div>
            </div>
          </div>
        </Link>

        <Link href={`/society/${societyId}/people`}>
          <div className="p-3.5 rounded-xl bg-white border border-slate-200 hover:border-amber-400 hover:bg-amber-50/30 transition-all cursor-pointer shadow-2xs group flex items-center gap-3">
            <div className="p-2 bg-amber-50 text-amber-700 group-hover:bg-amber-600 group-hover:text-white rounded-lg transition-colors">
              <Send className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-bold text-slate-900 group-hover:text-amber-700">Invite Resident</div>
              <div className="text-[10px] text-slate-400">Token Invitation</div>
            </div>
          </div>
        </Link>
      </div>

      {/* Real Structural Metrics Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-slate-500 uppercase">
              Buildings & Towers
            </CardTitle>
            <Building2 className="w-4 h-4 text-indigo-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-slate-900">{metrics.totalBuildings}</div>
            <p className="text-xs text-slate-500 mt-1">{metrics.totalWings} Wings &middot; {metrics.totalFloors} Floors</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-slate-500 uppercase">
              Total Units
            </CardTitle>
            <Layers className="w-4 h-4 text-cyan-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-slate-900">{metrics.totalUnits}</div>
            <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-1">
              <span className="text-emerald-600 font-semibold">{metrics.occupiedUnits} Occupied</span>
              <span>•</span>
              <span className="text-slate-500 font-semibold">{metrics.vacantUnits} Vacant</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-slate-500 uppercase">
              Active Members
            </CardTitle>
            <Users className="w-4 h-4 text-emerald-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-slate-900">{metrics.totalMembers}</div>
            <p className="text-xs text-slate-500 mt-1">Residents, owners & staff</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-slate-500 uppercase">
              Tenant Boundary
            </CardTitle>
            <DoorOpen className="w-4 h-4 text-amber-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold font-mono text-slate-900">{society.code}</div>
            <p className="text-xs text-slate-500 mt-1">PostgreSQL RLS Protected</p>
          </CardContent>
        </Card>
      </div>

      {/* Planned Future Phase 2+ Modules */}
      <div className="space-y-3">
        <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
          Upcoming Society Modules (Phase 2+)
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="border-dashed border-2 border-slate-200 bg-slate-50/50">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <MessageSquare className="w-4 h-4 text-indigo-500" />
                <Badge variant="secondary" className="font-mono text-[9px] uppercase">
                  Phase 2
                </Badge>
              </div>
              <CardTitle className="text-sm font-semibold text-slate-800">
                Helpdesk & Complaints
              </CardTitle>
              <CardDescription className="text-xs text-slate-500">
                Ticket assignment, SLA escalations, vendor work orders, and resolution tracking.
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="border-dashed border-2 border-slate-200 bg-slate-50/50">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <Receipt className="w-4 h-4 text-emerald-500" />
                <Badge variant="secondary" className="font-mono text-[9px] uppercase">
                  Phase 2
                </Badge>
              </div>
              <CardTitle className="text-sm font-semibold text-slate-800">
                Maintenance & Billing
              </CardTitle>
              <CardDescription className="text-xs text-slate-500">
                Automated monthly bills, payment reconciliation, accounting vouchers, and audit ledgers.
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="border-dashed border-2 border-slate-200 bg-slate-50/50">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <ShieldAlert className="w-4 h-4 text-amber-500" />
                <Badge variant="secondary" className="font-mono text-[9px] uppercase">
                  Phase 2
                </Badge>
              </div>
              <CardTitle className="text-sm font-semibold text-slate-800">
                Visitor & Gate Security
              </CardTitle>
              <CardDescription className="text-xs text-slate-500">
                Gatekeeper checkpoint app, guest approvals, delivery entry, and vehicle logging.
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </div>
    </div>
  );
}
