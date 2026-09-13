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
  ClipboardList,
  Clock,
  CheckCircle2,
  AlertTriangle,
  UserCog,
  History,
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
      title: "Active Staff",
      value: (metrics.activeStaffCount || 0).toString(),
      subtitle: `${metrics.activePropertyManagersCount || 0} Property Managers`,
      icon: UserCog,
      color: "text-cyan-600 bg-cyan-50",
    },
    {
      title: "Pending Work Items",
      value: (metrics.pendingTasksCount || 0).toString(),
      subtitle: "Open & in-progress operational tasks",
      icon: ClipboardList,
      color: "text-blue-600 bg-blue-50",
    },
    {
      title: "Overdue Work Items",
      value: (metrics.overdueTasksCount || 0).toString(),
      subtitle: "Tasks past due date",
      icon: AlertTriangle,
      color: (metrics.overdueTasksCount || 0) > 0 ? "text-rose-600 bg-rose-50" : "text-slate-600 bg-slate-50",
    },
    {
      title: "Open Complaints",
      value: metrics.openComplaintsCount.toString(),
      subtitle: "Pending operational resolution",
      icon: AlertCircle,
      color: metrics.openComplaintsCount > 0 ? "text-amber-600 bg-amber-50" : "text-slate-600 bg-slate-50",
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
      {/* Header & Quick Action */}
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
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="outline" className="text-xs bg-white border-slate-300">
            Code: <span className="font-mono font-bold ml-1 text-slate-800">{company.code}</span>
          </Badge>
          <Badge className="text-xs bg-indigo-600 text-white font-medium">
            Role: {role}
          </Badge>
          <Link href={`/company/${company.id}/operations`}>
            <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-xs">
              <ClipboardList className="w-3.5 h-3.5 mr-1.5" />
              Operations Workspace
            </Button>
          </Link>
        </div>
      </div>

      {/* Operational KPI Cards */}
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

      {/* Society-wise Operational Summary */}
      {metrics.societySummaries && metrics.societySummaries.length > 0 && (
        <Card className="p-5 bg-white border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Portfolio Operational Breakdown</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Overview of tasks and operational load across managed societies.
              </p>
            </div>
            <Link href={`/company/${company.id}/operations`}>
              <Button variant="ghost" size="sm" className="text-xs text-indigo-600 hover:text-indigo-700">
                View All Tasks
                <ArrowRight className="w-3.5 h-3.5 ml-1" />
              </Button>
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 text-slate-500 border-b border-slate-200 uppercase font-semibold text-[10px]">
                <tr>
                  <th className="py-2.5 px-3">Society</th>
                  <th className="py-2.5 px-3 text-center">Total Tasks</th>
                  <th className="py-2.5 px-3 text-center">Open</th>
                  <th className="py-2.5 px-3 text-center">In Progress</th>
                  <th className="py-2.5 px-3 text-center">Overdue</th>
                  <th className="py-2.5 px-3 text-center">Completed</th>
                  <th className="py-2.5 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {metrics.societySummaries.map((summary) => (
                  <tr key={summary.societyId} className="hover:bg-slate-50/50 transition-colors">
                    <td className="py-2.5 px-3">
                      <div className="font-semibold text-slate-800">{summary.societyName}</div>
                      <div className="text-[10px] font-mono text-slate-400">{summary.societyCode}</div>
                    </td>
                    <td className="py-2.5 px-3 text-center font-mono font-medium text-slate-700">
                      {summary.totalTasksCount}
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <span className="inline-block px-2 py-0.5 rounded bg-blue-50 text-blue-700 font-medium font-mono text-[11px]">
                        {summary.openTasksCount}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <span className="inline-block px-2 py-0.5 rounded bg-amber-50 text-amber-700 font-medium font-mono text-[11px]">
                        {summary.inProgressTasksCount}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <span
                        className={`inline-block px-2 py-0.5 rounded font-medium font-mono text-[11px] ${
                          summary.overdueTasksCount > 0
                            ? "bg-rose-50 text-rose-700"
                            : "bg-slate-100 text-slate-500"
                        }`}
                      >
                        {summary.overdueTasksCount}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-center font-mono text-emerald-600 font-medium">
                      {summary.completedTasksCount}
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <Link href={`/company/${company.id}/operations?society_id=${summary.societyId}`}>
                        <Button variant="outline" size="sm" className="text-[11px] h-7 px-2">
                          Tasks
                        </Button>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

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

                  <div className="flex items-center gap-2">
                    <Link href={`/company/${company.id}/operations?society_id=${s.id}`}>
                      <Button size="sm" variant="outline" className="text-xs">
                        <ClipboardList className="w-3.5 h-3.5 mr-1" />
                        Tasks
                      </Button>
                    </Link>
                    <Link href={`/society/${s.id}/dashboard`}>
                      <Button size="sm" variant="default" className="text-xs bg-indigo-600 hover:bg-indigo-700">
                        Enter Society
                        <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
                      </Button>
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {/* Recent Operational Activity Timeline */}
      {metrics.recentActivity && metrics.recentActivity.length > 0 && (
        <Card className="p-5 bg-white border-slate-200 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <History className="w-4 h-4 text-indigo-600" />
            <h2 className="text-sm font-bold text-slate-900">Recent Operational Activity</h2>
          </div>
          <div className="space-y-3">
            {metrics.recentActivity.map((activity) => (
              <div key={activity.id} className="flex items-start gap-3 text-xs border-b border-slate-100 pb-2.5 last:border-0 last:pb-0">
                <div className="w-2 h-2 rounded-full bg-indigo-500 mt-1.5 shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold text-slate-800">
                      {activity.action.replace("COMPANY_OPERATION_TASK_", "").replace(/_/g, " ")}
                    </span>
                    <span className="text-[10px] text-slate-400 shrink-0">
                      {new Date(activity.created_at).toLocaleString()}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5 truncate">
                    {activity.actor?.full_name ? `By ${activity.actor.full_name}` : "System"}:{" "}
                    {typeof activity.metadata?.title === "string" ? activity.metadata.title : ""}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
