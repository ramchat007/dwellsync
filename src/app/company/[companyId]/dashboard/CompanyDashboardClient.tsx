"use client";

import React from "react";
import Link from "next/link";
import {
  ManagementCompany,
  CompanyDashboardMetrics,
  ManagementCompanySociety,
  CompanyRole,
} from "@/lib/types/company";
import {
  Building2,
  Users,
  Layers,
  AlertCircle,
  Calendar,
  UserCheck,
  Briefcase,
  ArrowRight,
  ShieldCheck,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export function CompanyDashboardClient({
  company,
  metrics,
  accessibleSocieties,
  role,
}: {
  company: ManagementCompany;
  metrics: CompanyDashboardMetrics;
  accessibleSocieties: ManagementCompanySociety[];
  role: CompanyRole | "SUPER_ADMIN";
}) {
  const statCards = [
    {
      title: "Managed Societies",
      value: `${metrics.activeSocietiesCount} / ${metrics.managedSocietiesCount}`,
      subtitle: `${metrics.accessibleSocietiesCount} accessible to you`,
      icon: Building2,
      color: "text-indigo-600 bg-indigo-50",
    },
    {
      title: "Portfolio Units",
      value: metrics.totalUnitsCount.toLocaleString(),
      subtitle: `Across ${metrics.totalBuildingsCount} buildings`,
      icon: Layers,
      color: "text-blue-600 bg-blue-50",
    },
    {
      title: "Active Residents",
      value: metrics.totalActiveMembersCount.toLocaleString(),
      subtitle: "Verified residents & owners",
      icon: Users,
      color: "text-emerald-600 bg-emerald-50",
    },
    {
      title: "Open Complaints",
      value: metrics.openComplaintsCount.toString(),
      subtitle: "Pending operational resolution",
      icon: AlertCircle,
      color: metrics.openComplaintsCount > 0 ? "text-amber-600 bg-amber-50" : "text-slate-600 bg-slate-50",
    },
    {
      title: "Pending Member Requests",
      value: metrics.pendingAccessRequestsCount.toString(),
      subtitle: "Awaiting society approval",
      icon: UserCheck,
      color: "text-violet-600 bg-violet-50",
    },
    {
      title: "Scheduled Meetings",
      value: metrics.upcomingMeetingsCount.toString(),
      subtitle: "Governance & committee sessions",
      icon: Calendar,
      color: "text-teal-600 bg-teal-50",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Briefcase className="w-6 h-6 text-indigo-600" />
            {company.name}
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Operational dashboard for multi-society property management.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs bg-white border-slate-300">
            Code: <span className="font-mono font-bold ml-1 text-slate-800">{company.code}</span>
          </Badge>
          <Badge className="text-xs bg-indigo-600 text-white font-medium">
            Role: {role}
          </Badge>
        </div>
      </div>

      {/* Aggregated KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {statCards.map((stat, i) => {
          const Icon = stat.icon;
          return (
            <Card key={i} className="p-4 bg-white border-slate-200 shadow-sm">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-medium text-slate-500">{stat.title}</p>
                  <p className="text-2xl font-bold text-slate-900 mt-1">{stat.value}</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">{stat.subtitle}</p>
                </div>
                <div className={`p-2 rounded-lg ${stat.color}`}>
                  <Icon className="w-5 h-5" />
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Accessible Societies Directory */}
      <Card className="p-5 bg-white border-slate-200 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-sm font-bold text-slate-900">Your Accessible Societies</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Select any society to enter its administrative and operational workspace.
            </p>
          </div>
          <Link href={`/company/${company.id}/societies`}>
            <Button variant="outline" size="sm" className="text-xs">
              Manage All ({metrics.managedSocietiesCount})
            </Button>
          </Link>
        </div>

        {accessibleSocieties.length === 0 ? (
          <div className="text-center py-8 border border-dashed border-slate-200 rounded-lg">
            <Building2 className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <p className="text-xs font-medium text-slate-600">No active society access assigned</p>
            <p className="text-[11px] text-slate-400 mt-1 max-w-sm mx-auto">
              You belong to this management company, but an administrator has not yet granted explicit access to any societies.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {accessibleSocieties.map((item) => {
              const s = item.society;
              if (!s) return null;
              return (
                <div
                  key={item.id}
                  className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/50 px-2 rounded-lg transition-colors"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center font-bold text-indigo-600 text-xs shrink-0 mt-0.5">
                      <Building2 className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-900">{s.name}</span>
                        <span className="text-[10px] font-mono bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">
                          {s.code}
                        </span>
                        <Badge variant="outline" className="text-[9px] text-emerald-700 bg-emerald-50 border-emerald-200">
                          {s.status}
                        </Badge>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        {s.city ? `${s.city}, ${s.state || ""}` : "Registered Housing Society"}
                      </p>
                    </div>
                  </div>

                  <Link href={`/society/${s.id}/dashboard`}>
                    <Button size="sm" variant="default" className="text-xs bg-indigo-600 hover:bg-indigo-700">
                      Enter Society
                      <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
                    </Button>
                  </Link>
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}

