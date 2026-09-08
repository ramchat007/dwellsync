"use client";

import React, { useState } from "react";
import { SocietyAnalyticsData } from "@/lib/services/analyticsService";
import { AnalyticsTimeframe } from "@/lib/validations/analytics";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/shell/PageHeader";
import { formatDate } from "@/lib/utils";
import {
  Building2,
  Users,
  DoorOpen,
  Receipt,
  MessageSquare,
  ShieldAlert,
  Sparkles,
  Calendar,
  CheckCircle2,
  Clock,
  AlertTriangle,
  FileText,
  Activity,
  ArrowUpRight,
  TrendingUp,
  Shield,
  Layers,
  CheckSquare,
  Bell,
  RefreshCw,
} from "lucide-react";

interface AnalyticsDashboardClientProps {
  initialData: SocietyAnalyticsData;
  societyId: string;
}

export function AnalyticsDashboardClient({
  initialData,
  societyId,
}: AnalyticsDashboardClientProps) {
  const [data, setData] = useState<SocietyAnalyticsData>(initialData);
  const [timeframe, setTimeframe] = useState<AnalyticsTimeframe>(initialData.timeframe);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"overview" | "occupancy" | "financials" | "helpdesk" | "operations" | "governance">("overview");

  const handleTimeframeChange = async (newTimeframe: AnalyticsTimeframe) => {
    setTimeframe(newTimeframe);
    setLoading(true);
    try {
      const res = await fetch(`/api/society/${societyId}/analytics?timeframe=${newTimeframe}`);
      const json = await res.json();
      if (json.success && json.data) {
        setData(json.data);
      }
    } catch (err) {
      console.error("Failed to update analytics timeframe:", err);
    } finally {
      setLoading(false);
    }
  };

  const timeframes: { label: string; value: AnalyticsTimeframe }[] = [
    { label: "7 Days", value: "7d" },
    { label: "30 Days", value: "30d" },
    { label: "90 Days", value: "90d" },
    { label: "1 Year", value: "year" },
    { label: "All Time", value: "all" },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title={`${data.societyName} — Analytics & Intelligence`}
        description={`Comprehensive operational metrics, financial health, and governance analytics for ${data.societyName} (${data.societyCode}).`}
        badge={
          <Badge variant="purple" className="font-mono text-[10px] uppercase">
            TENANT ANALYTICS
          </Badge>
        }
        actions={
          <div className="flex items-center gap-2">
            {timeframes.map((tf) => (
              <Button
                key={tf.value}
                size="sm"
                variant={timeframe === tf.value ? "default" : "outline"}
                onClick={() => handleTimeframeChange(tf.value)}
                disabled={loading}
                className="text-xs h-8 px-2.5"
              >
                {tf.label}
              </Button>
            ))}
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleTimeframeChange(timeframe)}
              disabled={loading}
              className="h-8 px-2 text-xs"
              title="Refresh Analytics"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            </Button>
          </div>
        }
      />

      {/* Timestamp context banner */}
      <div className="flex items-center justify-between px-4 py-2 bg-slate-100 rounded-lg text-xs text-slate-500 font-mono border border-slate-200">
        <span className="flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5 text-slate-400" />
          Report Generated: {new Date(data.generatedAt).toLocaleString()}
        </span>
        <span className="capitalize">Reporting Window: {data.timeframe.toUpperCase()}</span>
      </div>

      {/* KPI Overview Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Occupancy Card */}
        <Card className="border-indigo-100 shadow-2xs">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Occupancy Rate
            </CardTitle>
            <DoorOpen className="w-4 h-4 text-indigo-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">{data.units.occupancyRate}%</div>
            <p className="text-xs text-slate-500 mt-1">
              <span className="font-semibold text-slate-700">{data.units.occupiedUnits}</span> of{" "}
              <span className="font-semibold text-slate-700">{data.units.totalUnits}</span> units occupied
            </p>
            <div className="w-full bg-slate-100 rounded-full h-1.5 mt-3 overflow-hidden">
              <div
                className="bg-indigo-600 h-1.5 rounded-full transition-all"
                style={{ width: `${data.units.occupancyRate}%` }}
              />
            </div>
          </CardContent>
        </Card>

        {/* Financial Collection Efficiency */}
        <Card className="border-emerald-100 shadow-2xs">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Collection Rate
            </CardTitle>
            <Receipt className="w-4 h-4 text-emerald-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">{data.billing.collectionRate}%</div>
            <p className="text-xs text-slate-500 mt-1">
              ₹{data.billing.totalCollectedAmount.toLocaleString()} of ₹{data.billing.totalInvoicedAmount.toLocaleString()} collected
            </p>
            <div className="w-full bg-slate-100 rounded-full h-1.5 mt-3 overflow-hidden">
              <div
                className="bg-emerald-600 h-1.5 rounded-full transition-all"
                style={{ width: `${data.billing.collectionRate}%` }}
              />
            </div>
          </CardContent>
        </Card>

        {/* Complaints Resolution Rate */}
        <Card className="border-amber-100 shadow-2xs">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Complaint Resolution
            </CardTitle>
            <MessageSquare className="w-4 h-4 text-amber-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">{data.complaints.resolutionRate}%</div>
            <p className="text-xs text-slate-500 mt-1">
              <span className="font-semibold text-slate-700">
                {data.complaints.resolved + data.complaints.closed}
              </span>{" "}
              of <span className="font-semibold text-slate-700">{data.complaints.totalComplaints}</span> issues resolved
            </p>
            <div className="w-full bg-slate-100 rounded-full h-1.5 mt-3 overflow-hidden">
              <div
                className="bg-amber-500 h-1.5 rounded-full transition-all"
                style={{ width: `${data.complaints.resolutionRate}%` }}
              />
            </div>
          </CardContent>
        </Card>

        {/* Governance Health */}
        <Card className="border-purple-100 shadow-2xs">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Action Items Solved
            </CardTitle>
            <Shield className="w-4 h-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">{data.governance.actionItemCompletionRate}%</div>
            <p className="text-xs text-slate-500 mt-1">
              <span className="font-semibold text-slate-700">{data.governance.completedActionItems}</span> of{" "}
              <span className="font-semibold text-slate-700">{data.governance.totalActionItems}</span> tasks completed
            </p>
            <div className="w-full bg-slate-100 rounded-full h-1.5 mt-3 overflow-hidden">
              <div
                className="bg-purple-600 h-1.5 rounded-full transition-all"
                style={{ width: `${data.governance.actionItemCompletionRate}%` }}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tab Navigation */}
      <div className="flex border-b border-slate-200 overflow-x-auto gap-2 text-sm font-medium">
        {[
          { id: "overview", label: "Executive Summary" },
          { id: "occupancy", label: "Units & Occupancy" },
          { id: "financials", label: "Financials & Billing" },
          { id: "helpdesk", label: "Complaints & Helpdesk" },
          { id: "operations", label: "Visitors & Amenities" },
          { id: "governance", label: "Governance & Meetings" },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`py-2.5 px-3 border-b-2 transition-colors whitespace-nowrap cursor-pointer ${
              activeTab === tab.id
                ? "border-indigo-600 text-indigo-700 font-semibold"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* TAB CONTENT */}

      {/* 1. Executive Summary Tab */}
      {activeTab === "overview" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Physical & Human Scale */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Building2 className="w-4 h-4 text-indigo-600" /> Community Demographics
              </CardTitle>
              <CardDescription className="text-xs">Physical structure and member distribution</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                  <div className="text-xl font-bold text-slate-900">{data.units.totalBuildings}</div>
                  <div className="text-[11px] text-slate-500">Buildings</div>
                </div>
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                  <div className="text-xl font-bold text-slate-900">{data.units.totalWings}</div>
                  <div className="text-[11px] text-slate-500">Wings</div>
                </div>
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                  <div className="text-xl font-bold text-slate-900">{data.members.totalActiveMembers}</div>
                  <div className="text-[11px] text-slate-500">Active Members</div>
                </div>
              </div>

              <div className="space-y-2 pt-2 border-t border-slate-100">
                <div className="text-xs font-semibold text-slate-700">Members by Role</div>
                {Object.keys(data.members.byRole).length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {Object.entries(data.members.byRole).map(([role, count]) => (
                      <Badge key={role} variant="secondary" className="text-xs">
                        {role}: <span className="font-semibold ml-1">{count}</span>
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 italic">No active memberships registered.</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Operational Pulse */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Activity className="w-4 h-4 text-emerald-600" /> Operational Pulse
              </CardTitle>
              <CardDescription className="text-xs">Activity volume within reporting period</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between p-2.5 bg-slate-50 rounded-lg text-xs">
                <span className="flex items-center gap-2 text-slate-600">
                  <ShieldAlert className="w-4 h-4 text-indigo-500" /> Visitor Entries Processed
                </span>
                <span className="font-bold text-slate-900">{data.visitors.totalVisitors}</span>
              </div>
              <div className="flex items-center justify-between p-2.5 bg-slate-50 rounded-lg text-xs">
                <span className="flex items-center gap-2 text-slate-600">
                  <MessageSquare className="w-4 h-4 text-amber-500" /> Complaints Logged
                </span>
                <span className="font-bold text-slate-900">{data.complaints.totalComplaints}</span>
              </div>
              <div className="flex items-center justify-between p-2.5 bg-slate-50 rounded-lg text-xs">
                <span className="flex items-center gap-2 text-slate-600">
                  <Sparkles className="w-4 h-4 text-purple-500" /> Facility Bookings
                </span>
                <span className="font-bold text-slate-900">{data.amenities.totalBookings}</span>
              </div>
              <div className="flex items-center justify-between p-2.5 bg-slate-50 rounded-lg text-xs">
                <span className="flex items-center gap-2 text-slate-600">
                  <Calendar className="w-4 h-4 text-rose-500" /> Governance Meetings
                </span>
                <span className="font-bold text-slate-900">{data.governance.totalMeetings}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* 2. Units & Occupancy Tab */}
      {activeTab === "occupancy" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-bold text-slate-900">Unit Occupancy Breakdown</CardTitle>
              <CardDescription className="text-xs">Physical status of society units</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-lg">
                  <div className="text-xl font-bold text-emerald-700">{data.units.occupiedUnits}</div>
                  <div className="text-[11px] text-emerald-800">Occupied</div>
                </div>
                <div className="p-3 bg-amber-50 border border-amber-100 rounded-lg">
                  <div className="text-xl font-bold text-amber-700">{data.units.vacantUnits}</div>
                  <div className="text-[11px] text-amber-800">Vacant</div>
                </div>
                <div className="p-3 bg-slate-50 border border-slate-100 rounded-lg">
                  <div className="text-xl font-bold text-slate-700">{data.units.maintenanceUnits}</div>
                  <div className="text-[11px] text-slate-600">Maintenance</div>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100 space-y-2 text-xs">
                <div className="flex justify-between text-slate-600">
                  <span>Owner Assigned Units:</span>
                  <span className="font-semibold text-slate-900">{data.units.ownersCount}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Active Tenant Tenures:</span>
                  <span className="font-semibold text-slate-900">{data.units.tenantsCount}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-bold text-slate-900">Structural Hierarchy Summary</CardTitle>
              <CardDescription className="text-xs">Inventory layout of society assets</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between items-center p-2.5 bg-slate-50 rounded-lg text-xs">
                <span className="text-slate-600">Towers & Buildings:</span>
                <span className="font-mono font-bold text-slate-900">{data.units.totalBuildings}</span>
              </div>
              <div className="flex justify-between items-center p-2.5 bg-slate-50 rounded-lg text-xs">
                <span className="text-slate-600">Wings & Blocks:</span>
                <span className="font-mono font-bold text-slate-900">{data.units.totalWings}</span>
              </div>
              <div className="flex justify-between items-center p-2.5 bg-slate-50 rounded-lg text-xs">
                <span className="text-slate-600">Floors Configured:</span>
                <span className="font-mono font-bold text-slate-900">{data.units.totalFloors}</span>
              </div>
              <div className="flex justify-between items-center p-2.5 bg-slate-50 rounded-lg text-xs">
                <span className="text-slate-600">Total Residential / Commercial Units:</span>
                <span className="font-mono font-bold text-slate-900">{data.units.totalUnits}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* 3. Financials & Billing Tab */}
      {activeTab === "financials" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-bold text-slate-900">Collections Summary</CardTitle>
              <CardDescription className="text-xs">Financial flow and dues recovery</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="p-3 bg-slate-50 border border-slate-100 rounded-lg">
                  <div className="text-lg font-bold text-slate-900">₹{data.billing.totalInvoicedAmount.toLocaleString()}</div>
                  <div className="text-[11px] text-slate-500">Invoiced</div>
                </div>
                <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-lg">
                  <div className="text-lg font-bold text-emerald-700">₹{data.billing.totalCollectedAmount.toLocaleString()}</div>
                  <div className="text-[11px] text-emerald-800">Collected</div>
                </div>
                <div className="p-3 bg-rose-50 border border-rose-100 rounded-lg">
                  <div className="text-lg font-bold text-rose-700">₹{data.billing.outstandingBalance.toLocaleString()}</div>
                  <div className="text-[11px] text-rose-800">Outstanding</div>
                </div>
              </div>

              <div className="p-3 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-between text-xs">
                <span className="text-slate-600">Total Payments Recorded:</span>
                <span className="font-bold text-slate-900">{data.billing.paymentsCount} transactions</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-bold text-slate-900">Invoice Distribution</CardTitle>
              <CardDescription className="text-xs">Aging and invoice status distribution</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between items-center p-2.5 bg-emerald-50/50 rounded-lg text-xs">
                <span className="text-emerald-900 font-medium">Fully Paid Invoices:</span>
                <span className="font-bold text-emerald-700">{data.billing.paidInvoicesCount}</span>
              </div>
              <div className="flex justify-between items-center p-2.5 bg-amber-50/50 rounded-lg text-xs">
                <span className="text-amber-900 font-medium">Pending / Issued Invoices:</span>
                <span className="font-bold text-amber-700">{data.billing.pendingInvoicesCount}</span>
              </div>
              <div className="flex justify-between items-center p-2.5 bg-rose-50/50 rounded-lg text-xs">
                <span className="text-rose-900 font-medium">Overdue Invoices:</span>
                <span className="font-bold text-rose-700">{data.billing.overdueInvoicesCount}</span>
              </div>
              <div className="flex justify-between items-center p-2.5 bg-slate-50 rounded-lg text-xs">
                <span className="text-slate-600">Total Invoices Generated:</span>
                <span className="font-bold text-slate-900">{data.billing.invoicesCount}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* 4. Helpdesk & Complaints Tab */}
      {activeTab === "helpdesk" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-bold text-slate-900">Complaints Status Lifecycle</CardTitle>
              <CardDescription className="text-xs">Tickets progression from submission to resolution</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-4 gap-2 text-center text-xs">
                <div className="p-2 bg-blue-50 border border-blue-100 rounded-lg">
                  <div className="font-bold text-blue-700">{data.complaints.submitted}</div>
                  <div className="text-[10px] text-blue-600">Submitted</div>
                </div>
                <div className="p-2 bg-amber-50 border border-amber-100 rounded-lg">
                  <div className="font-bold text-amber-700">{data.complaints.inProgress}</div>
                  <div className="text-[10px] text-amber-600">In Progress</div>
                </div>
                <div className="p-2 bg-emerald-50 border border-emerald-100 rounded-lg">
                  <div className="font-bold text-emerald-700">{data.complaints.resolved}</div>
                  <div className="text-[10px] text-emerald-600">Resolved</div>
                </div>
                <div className="p-2 bg-slate-50 border border-slate-100 rounded-lg">
                  <div className="font-bold text-slate-700">{data.complaints.closed}</div>
                  <div className="text-[10px] text-slate-600">Closed</div>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 space-y-2">
                <div className="text-xs font-semibold text-slate-700">By Priority</div>
                <div className="grid grid-cols-4 gap-2 text-center text-xs">
                  <div className="p-1.5 bg-rose-50 text-rose-700 rounded border border-rose-100 font-mono">
                    {data.complaints.byPriority.emergency} Emergency
                  </div>
                  <div className="p-1.5 bg-orange-50 text-orange-700 rounded border border-orange-100 font-mono">
                    {data.complaints.byPriority.high} High
                  </div>
                  <div className="p-1.5 bg-yellow-50 text-yellow-700 rounded border border-yellow-100 font-mono">
                    {data.complaints.byPriority.medium} Medium
                  </div>
                  <div className="p-1.5 bg-slate-50 text-slate-700 rounded border border-slate-100 font-mono">
                    {data.complaints.byPriority.low} Low
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-bold text-slate-900">Complaints by Category</CardTitle>
              <CardDescription className="text-xs">Root cause distribution across facility domains</CardDescription>
            </CardHeader>
            <CardContent>
              {Object.keys(data.complaints.byCategory).length > 0 ? (
                <div className="space-y-2">
                  {Object.entries(data.complaints.byCategory).map(([category, count]) => (
                    <div key={category} className="flex justify-between items-center text-xs p-2 bg-slate-50 rounded">
                      <span className="text-slate-700 font-medium capitalize">{category.replace("_", " ")}</span>
                      <Badge variant="secondary" className="font-mono text-xs">{count}</Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-8 text-center text-slate-400 text-xs">
                  No categorized complaints in this timeframe.
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* 5. Visitors & Amenities Tab */}
      {activeTab === "operations" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-bold text-slate-900">Gate & Visitor Security</CardTitle>
              <CardDescription className="text-xs">Security checkpoint activity</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-3 gap-2 text-center text-xs">
                <div className="p-2.5 bg-indigo-50 border border-indigo-100 rounded-lg">
                  <div className="font-bold text-indigo-700 text-base">{data.visitors.checkedIn}</div>
                  <div className="text-[10px] text-indigo-600">On-Premise</div>
                </div>
                <div className="p-2.5 bg-emerald-50 border border-emerald-100 rounded-lg">
                  <div className="font-bold text-emerald-700 text-base">{data.visitors.checkedOut}</div>
                  <div className="text-[10px] text-emerald-600">Checked Out</div>
                </div>
                <div className="p-2.5 bg-amber-50 border border-amber-100 rounded-lg">
                  <div className="font-bold text-amber-700 text-base">{data.visitors.expected}</div>
                  <div className="text-[10px] text-amber-600">Pre-Invited</div>
                </div>
              </div>
              <div className="flex justify-between items-center p-2.5 bg-slate-50 rounded-lg text-xs">
                <span className="text-slate-600">Today&apos;s Visitor Gate Entries:</span>
                <span className="font-bold text-slate-900">{data.visitors.todayVisitorsCount}</span>
              </div>
              <div className="flex justify-between items-center p-2.5 bg-slate-50 rounded-lg text-xs">
                <span className="text-slate-600">Cancelled / Rejected Entries:</span>
                <span className="font-bold text-slate-900">{data.visitors.cancelled}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-bold text-slate-900">Amenities & Facility Bookings</CardTitle>
              <CardDescription className="text-xs">Recreational usage and bookings</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-3 gap-2 text-center text-xs">
                <div className="p-2.5 bg-slate-50 border border-slate-100 rounded-lg">
                  <div className="font-bold text-slate-900 text-base">{data.amenities.totalAmenities}</div>
                  <div className="text-[10px] text-slate-500">Configured</div>
                </div>
                <div className="p-2.5 bg-emerald-50 border border-emerald-100 rounded-lg">
                  <div className="font-bold text-emerald-700 text-base">{data.amenities.availableAmenities}</div>
                  <div className="text-[10px] text-emerald-600">Available</div>
                </div>
                <div className="p-2.5 bg-purple-50 border border-purple-100 rounded-lg">
                  <div className="font-bold text-purple-700 text-base">{data.amenities.totalBookings}</div>
                  <div className="text-[10px] text-purple-600">Bookings</div>
                </div>
              </div>

              <div className="flex justify-between items-center p-2.5 bg-slate-50 rounded-lg text-xs">
                <span className="text-slate-600">Confirmed Bookings:</span>
                <span className="font-bold text-slate-900">{data.amenities.confirmedBookings}</span>
              </div>
              <div className="flex justify-between items-center p-2.5 bg-slate-50 rounded-lg text-xs">
                <span className="text-slate-600">Completed Sessions:</span>
                <span className="font-bold text-slate-900">{data.amenities.completedBookings}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* 6. Governance & Meetings Tab */}
      {activeTab === "governance" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-bold text-slate-900">Committees & Appointments</CardTitle>
              <CardDescription className="text-xs">Governance structure and officer tenures</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between items-center p-2.5 bg-slate-50 rounded-lg text-xs">
                <span className="text-slate-600">Active Committees:</span>
                <span className="font-bold text-slate-900">{data.governance.activeCommitteesCount}</span>
              </div>
              <div className="flex justify-between items-center p-2.5 bg-slate-50 rounded-lg text-xs">
                <span className="text-slate-600">Active Committee Officers Appointed:</span>
                <span className="font-bold text-slate-900">{data.governance.committeeMembersCount}</span>
              </div>
              <div className="flex justify-between items-center p-2.5 bg-slate-50 rounded-lg text-xs">
                <span className="text-slate-600">Total Meetings Held:</span>
                <span className="font-bold text-slate-900">{data.governance.totalMeetings}</span>
              </div>
              <div className="flex justify-between items-center p-2.5 bg-slate-50 rounded-lg text-xs">
                <span className="text-slate-600">Completed with Minutes:</span>
                <span className="font-bold text-slate-900">{data.governance.completedMeetings}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-bold text-slate-900">Meeting Action Items</CardTitle>
              <CardDescription className="text-xs">Post-meeting task completion progress</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-3 gap-2 text-center text-xs">
                <div className="p-2.5 bg-slate-50 border border-slate-100 rounded-lg">
                  <div className="font-bold text-slate-900 text-base">{data.governance.totalActionItems}</div>
                  <div className="text-[10px] text-slate-500">Total Tasks</div>
                </div>
                <div className="p-2.5 bg-amber-50 border border-amber-100 rounded-lg">
                  <div className="font-bold text-amber-700 text-base">{data.governance.openActionItems}</div>
                  <div className="text-[10px] text-amber-600">In Progress</div>
                </div>
                <div className="p-2.5 bg-emerald-50 border border-emerald-100 rounded-lg">
                  <div className="font-bold text-emerald-700 text-base">{data.governance.completedActionItems}</div>
                  <div className="text-[10px] text-emerald-600">Completed</div>
                </div>
              </div>

              <div className="flex justify-between items-center p-2.5 bg-purple-50/50 rounded-lg text-xs">
                <span className="text-purple-900 font-medium">Task Completion Efficiency:</span>
                <span className="font-bold text-purple-700">{data.governance.actionItemCompletionRate}%</span>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
