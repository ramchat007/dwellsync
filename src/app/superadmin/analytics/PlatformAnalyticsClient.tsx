"use client";

import React, { useState } from "react";
import { PlatformAnalyticsData } from "@/lib/services/analyticsService";
import { AnalyticsTimeframe } from "@/lib/validations/analytics";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/shell/PageHeader";
import { formatDate } from "@/lib/utils";
import {
  Building2,
  Users,
  Layers,
  Shield,
  Activity,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Receipt,
  DoorOpen,
  Bell,
  Calendar,
  RefreshCw,
  TrendingUp,
  UserCheck,
  BarChart3,
  CheckSquare,
} from "lucide-react";

interface PlatformAnalyticsClientProps {
  initialData: PlatformAnalyticsData;
}

export function PlatformAnalyticsClient({ initialData }: PlatformAnalyticsClientProps) {
  const [data, setData] = useState<PlatformAnalyticsData>(initialData);
  const [timeframe, setTimeframe] = useState<AnalyticsTimeframe>(initialData.timeframe);
  const [loading, setLoading] = useState(false);

  const handleTimeframeChange = async (newTimeframe: AnalyticsTimeframe) => {
    setTimeframe(newTimeframe);
    setLoading(true);
    try {
      const res = await fetch(`/api/superadmin/analytics?timeframe=${newTimeframe}`);
      if (res.ok) {
        const json = await res.json();
        setData(json.data);
      }
    } catch (err) {
      console.error("Failed to load platform analytics", err);
    } finally {
      setLoading(false);
    }
  };

  const timeframeLabels: Record<AnalyticsTimeframe, string> = {
    "7d": "Last 7 Days",
    "30d": "Last 30 Days",
    "90d": "Last 90 Days",
    year: "Past Year",
    all: "All Time",
  };

  const totalActivityCount =
    data.activity.totalInvoicesGenerated +
    data.activity.totalVisitorCheckins +
    data.activity.totalComplaintsLogged +
    data.activity.totalGovernanceMeetings +
    data.activity.totalNotificationsDispatched +
    data.activity.totalAuditLogs;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Platform Analytics & Scale"
        description="Global system telemetry, multi-tenant operational volume, security posture, and infrastructure metrics."
        badge={
          <Badge variant="purple" className="font-mono text-[10px] uppercase">
            SUPER_ADMIN AUDIT
          </Badge>
        }
        actions={
          <div className="flex items-center gap-2">
            {/* Timeframe selector */}
            <div className="inline-flex rounded-lg border border-slate-200 bg-white p-0.5 shadow-sm text-xs">
              {(["7d", "30d", "90d", "year", "all"] as AnalyticsTimeframe[]).map((tf) => (
                <button
                  key={tf}
                  onClick={() => handleTimeframeChange(tf)}
                  disabled={loading}
                  className={`px-2.5 py-1 rounded-md font-medium transition-all ${
                    timeframe === tf
                      ? "bg-indigo-600 text-white shadow-xs"
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                  }`}
                >
                  {timeframeLabels[tf]}
                </button>
              ))}
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => handleTimeframeChange(timeframe)}
              disabled={loading}
              className="text-xs gap-1.5"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>
        }
      />

      {/* Global Timestamp & Security Banner */}
      <div className="p-5 rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border border-slate-800">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 text-xs font-mono">
            <Shield className="w-3.5 h-3.5" /> PLATFORM-WIDE TELEMETRY
          </div>
          <h2 className="text-xl sm:text-2xl font-bold">Cross-Tenant Operational Aggregates</h2>
          <p className="text-slate-400 text-xs">
            Aggregated across all registered societies and tenants. Real-time database telemetry.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-950/80 border border-emerald-800 text-emerald-300 text-xs font-mono">
            <Activity className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
            <span>Telemetry Generated: {formatDate(data.generatedAt)}</span>
          </div>
        </div>
      </div>

      {/* Top Level Scale KPI Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Total Societies
            </CardTitle>
            <Building2 className="w-4 h-4 text-indigo-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-slate-900">{data.societies.totalSocieties}</div>
            <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-1">
              <span className="text-emerald-600 font-semibold">{data.societies.activeSocieties} Active</span>
              <span>•</span>
              <span className="text-amber-600 font-semibold">{data.societies.onboardingSocieties} Onboarding</span>
              {data.societies.suspendedSocieties > 0 && (
                <>
                  <span>•</span>
                  <span className="text-red-600 font-semibold">{data.societies.suspendedSocieties} Suspended</span>
                </>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Platform Identities
            </CardTitle>
            <Users className="w-4 h-4 text-emerald-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-slate-900">{data.users.totalUsers}</div>
            <p className="text-xs text-slate-500 mt-1">
              <span className="font-semibold text-slate-700">{data.users.activeMemberships}</span> active tenant memberships
            </p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Infrastructure Scale
            </CardTitle>
            <Layers className="w-4 h-4 text-cyan-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-slate-900">{data.infrastructure.totalUnits}</div>
            <p className="text-xs text-slate-500 mt-1">
              Units across <span className="font-semibold text-slate-700">{data.infrastructure.totalBuildings}</span> buildings
            </p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Cross-Tenant Events
            </CardTitle>
            <TrendingUp className="w-4 h-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-slate-900">{totalActivityCount.toLocaleString()}</div>
            <p className="text-xs text-slate-500 mt-1">
              Operations in <span className="font-semibold text-slate-700">{timeframeLabels[timeframe]}</span>
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main 2-Column Section: Operational Activity & Health / Roles */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Operational Volume Across Platform */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-indigo-600" />
                Cross-Tenant Operational Activity
              </CardTitle>
              <CardDescription className="text-xs text-slate-500">
                Volume of business actions executed across all tenant societies during {timeframeLabels[timeframe].toLowerCase()}.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                  <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
                    <span>Maintenance Invoices</span>
                    <Receipt className="w-4 h-4 text-emerald-600" />
                  </div>
                  <div className="text-2xl font-bold text-slate-900 mt-2">
                    {data.activity.totalInvoicesGenerated.toLocaleString()}
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">Generated by billing engine</p>
                </div>

                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                  <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
                    <span>Visitor Entries</span>
                    <DoorOpen className="w-4 h-4 text-indigo-600" />
                  </div>
                  <div className="text-2xl font-bold text-slate-900 mt-2">
                    {data.activity.totalVisitorCheckins.toLocaleString()}
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">Gate check-ins recorded</p>
                </div>

                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                  <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
                    <span>Helpdesk Complaints</span>
                    <AlertTriangle className="w-4 h-4 text-amber-600" />
                  </div>
                  <div className="text-2xl font-bold text-slate-900 mt-2">
                    {data.activity.totalComplaintsLogged.toLocaleString()}
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">Submitted by residents</p>
                </div>

                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                  <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
                    <span>Governance Meetings</span>
                    <Calendar className="w-4 h-4 text-blue-600" />
                  </div>
                  <div className="text-2xl font-bold text-slate-900 mt-2">
                    {data.activity.totalGovernanceMeetings.toLocaleString()}
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">Committee & General meetings</p>
                </div>

                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                  <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
                    <span>Notifications Dispatched</span>
                    <Bell className="w-4 h-4 text-purple-600" />
                  </div>
                  <div className="text-2xl font-bold text-slate-900 mt-2">
                    {data.activity.totalNotificationsDispatched.toLocaleString()}
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">In-app & broadcast alerts</p>
                </div>

                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                  <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
                    <span>Audit Trail Entries</span>
                    <FileText className="w-4 h-4 text-slate-600" />
                  </div>
                  <div className="text-2xl font-bold text-slate-900 mt-2">
                    {data.activity.totalAuditLogs.toLocaleString()}
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">Immutable security entries</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Role Distribution Across Platform */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Users className="w-5 h-5 text-emerald-600" />
                Platform Role Distribution
              </CardTitle>
              <CardDescription className="text-xs text-slate-500">
                Breakdown of active tenant memberships by functional governance role.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {Object.keys(data.users.byRole).length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {Object.entries(data.users.byRole).map(([role, count]) => (
                    <div key={role} className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                      <div className="text-[11px] font-mono font-semibold text-slate-600 truncate">
                        {role}
                      </div>
                      <div className="text-xl font-bold text-slate-900 mt-1">{count}</div>
                      <div className="text-[10px] text-slate-400 mt-0.5">
                        {data.users.activeMemberships > 0
                          ? `${Math.round((count / data.users.activeMemberships) * 100)}% of memberships`
                          : "0%"}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-8 text-center text-slate-400 text-xs">
                  No active role memberships found.
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Col: Platform Infrastructure, Health & Hardening Posture */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Shield className="w-5 h-5 text-indigo-600" />
                Hardening & Security Posture
              </CardTitle>
              <CardDescription className="text-xs text-slate-500">
                Core infrastructure security parameters and compliance gates.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-xs">
              <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50 border border-slate-200">
                <div className="space-y-0.5">
                  <div className="font-semibold text-slate-800">Database Engine</div>
                  <div className="text-[11px] text-slate-500">PostgreSQL Cloud Instance</div>
                </div>
                <Badge variant={data.health.databaseStatus === "HEALTHY" ? "success" : "destructive"}>
                  <CheckCircle2 className="w-3 h-3 mr-1" />
                  {data.health.databaseStatus}
                </Badge>
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50 border border-slate-200">
                <div className="space-y-0.5">
                  <div className="font-semibold text-slate-800">Row Level Security</div>
                  <div className="text-[11px] text-slate-500">Multi-tenant boundary enforcement</div>
                </div>
                <Badge variant="success">
                  <CheckCircle2 className="w-3 h-3 mr-1" />
                  {data.health.rlsStatus}
                </Badge>
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50 border border-slate-200">
                <div className="space-y-0.5">
                  <div className="font-semibold text-slate-800">Active Impersonations</div>
                  <div className="text-[11px] text-slate-500">Live troubleshooting sessions</div>
                </div>
                <span className="font-mono font-bold text-slate-800">
                  {data.health.activeImpersonations}
                </span>
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50 border border-slate-200">
                <div className="space-y-0.5">
                  <div className="font-semibold text-slate-800">Security Audit Logs (24h)</div>
                  <div className="text-[11px] text-slate-500">Immutable security events logged</div>
                </div>
                <span className="font-mono font-bold text-indigo-600">
                  {data.health.recentAuditCount}
                </span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Building2 className="w-5 h-5 text-indigo-600" />
                Tenant Society Health
              </CardTitle>
              <CardDescription className="text-xs text-slate-500">
                Societies onboarded onto DwellSync multi-tenant platform.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-xs">
              <div className="p-3 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-between">
                <div>
                  <div className="font-semibold text-indigo-950">Active Tenant Ratio</div>
                  <div className="text-[11px] text-indigo-700">Fully configured & operational</div>
                </div>
                <div className="text-lg font-bold text-indigo-900">
                  {data.societies.totalSocieties > 0
                    ? `${Math.round((data.societies.activeSocieties / data.societies.totalSocieties) * 100)}%`
                    : "0%"}
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 text-center pt-1">
                <div className="p-2 rounded-lg bg-slate-50 border border-slate-200">
                  <div className="text-[10px] text-slate-500 uppercase font-semibold">Active</div>
                  <div className="text-base font-bold text-emerald-600 mt-0.5">
                    {data.societies.activeSocieties}
                  </div>
                </div>
                <div className="p-2 rounded-lg bg-slate-50 border border-slate-200">
                  <div className="text-[10px] text-slate-500 uppercase font-semibold">Onboarding</div>
                  <div className="text-base font-bold text-amber-600 mt-0.5">
                    {data.societies.onboardingSocieties}
                  </div>
                </div>
                <div className="p-2 rounded-lg bg-slate-50 border border-slate-200">
                  <div className="text-[10px] text-slate-500 uppercase font-semibold">Suspended</div>
                  <div className="text-base font-bold text-red-600 mt-0.5">
                    {data.societies.suspendedSocieties}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

