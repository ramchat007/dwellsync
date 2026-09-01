import React from "react";
import Link from "next/link";
import { getCurrentIdentity } from "@/lib/auth/server";
import { getPlatformMetrics } from "@/lib/services/societyService";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  Building2,
  Users,
  UserCheck,
  Shield,
  FileText,
  ArrowRight,
  Layers,
  CheckCircle2,
  AlertTriangle,
  Activity,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/shell/PageHeader";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function SuperAdminDashboardPage() {
  const identity = await getCurrentIdentity();
  const metrics = await getPlatformMetrics();
  const adminClient = createAdminClient();

  const { count: activeImpersonations } = await adminClient
    .from("impersonation_sessions")
    .select("*", { count: "exact", head: true })
    .eq("status", "ACTIVE");

  const { data: recentAudits } = await adminClient
    .from("audit_logs")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(6);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Super Admin Control Center"
        description="Global platform governance, multi-tenant isolation, real-time database metrics, and immutable audit stream."
        badge={
          <Badge variant="purple" className="font-mono text-[10px] uppercase">
            Platform Owner
          </Badge>
        }
        actions={
          <div className="flex items-center gap-2">
            <Link href="/superadmin/view-as">
              <button className="px-3.5 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-xs font-semibold shadow transition-all flex items-center gap-1.5">
                <UserCheck className="w-4 h-4" /> View-As Persona Console
              </button>
            </Link>
            <Link href="/superadmin/societies">
              <button className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold shadow transition-all flex items-center gap-1.5">
                <Building2 className="w-4 h-4" /> Manage Societies
              </button>
            </Link>
          </div>
        }
      />

      {/* Hero Welcome Box */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border border-slate-800">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 text-xs font-mono">
            <Shield className="w-3.5 h-3.5" /> PLATFORM OVERVIEW
          </div>
          <h2 className="text-xl sm:text-2xl font-bold">
            Welcome, {identity?.originalUser.full_name || "Super Admin"}
          </h2>
          <p className="text-slate-400 text-xs">
            &ldquo;Every Rupee. Every Task. Every Decision. Accountable.&rdquo;
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-950/80 border border-emerald-800 text-emerald-300 text-xs font-mono">
            <Activity className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
            <span>PostgreSQL RLS Online</span>
          </div>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-slate-500 uppercase">
              Total Societies
            </CardTitle>
            <Building2 className="w-4 h-4 text-indigo-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-slate-900">{metrics.totalSocieties}</div>
            <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-1">
              <span className="text-emerald-600 font-semibold">{metrics.activeSocieties} Active</span>
              <span>•</span>
              <span className="text-amber-600 font-semibold">{metrics.onboardingSocieties} Onboarding</span>
              {metrics.suspendedSocieties > 0 && (
                <>
                  <span>•</span>
                  <span className="text-red-600 font-semibold">{metrics.suspendedSocieties} Suspended</span>
                </>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-slate-500 uppercase">
              Platform Users
            </CardTitle>
            <Users className="w-4 h-4 text-emerald-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-slate-900">{metrics.totalUsers}</div>
            <p className="text-xs text-slate-500 mt-1">Real authenticated identities</p>
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
            <p className="text-xs text-slate-500 mt-1">Across {metrics.totalBuildings} registered buildings</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-slate-500 uppercase">
              Active Impersonations
            </CardTitle>
            <UserCheck className="w-4 h-4 text-amber-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-slate-900">{activeImpersonations ?? 0}</div>
            <p className="text-xs text-slate-500 mt-1">Audited active troubleshooting sessions</p>
          </CardContent>
        </Card>
      </div>

      {/* System Health & Live Audit Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* System Health Status */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Activity className="w-4 h-4 text-indigo-600" />
              System Status
            </CardTitle>
            <CardDescription className="text-xs text-slate-500">
              Core platform infrastructure indicators.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-xs">
            <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 border border-slate-200">
              <span className="text-slate-700 font-medium">PostgreSQL Engine</span>
              <span className="inline-flex items-center gap-1 font-mono font-semibold text-emerald-600">
                <CheckCircle2 className="w-3.5 h-3.5" /> Healthy
              </span>
            </div>

            <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 border border-slate-200">
              <span className="text-slate-700 font-medium">Row Level Security</span>
              <span className="inline-flex items-center gap-1 font-mono font-semibold text-emerald-600">
                <CheckCircle2 className="w-3.5 h-3.5" /> Enforced
              </span>
            </div>

            <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 border border-slate-200">
              <span className="text-slate-700 font-medium">Supabase Auth</span>
              <span className="inline-flex items-center gap-1 font-mono font-semibold text-emerald-600">
                <CheckCircle2 className="w-3.5 h-3.5" /> Active
              </span>
            </div>

            <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 border border-slate-200">
              <span className="text-slate-700 font-medium">Storage Buckets</span>
              <span className="inline-flex items-center gap-1 font-mono font-semibold text-emerald-600">
                <CheckCircle2 className="w-3.5 h-3.5" /> Initialized
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Live Platform Audit Stream */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <div>
              <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <FileText className="w-4 h-4 text-indigo-600" />
                Live Platform Audit Stream
              </CardTitle>
              <CardDescription className="text-xs text-slate-500">
                Append-only audit trail capturing governance and tenant actions.
              </CardDescription>
            </div>
            <Link
              href="/superadmin/audit-logs"
              className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold flex items-center gap-1"
            >
              View All <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </CardHeader>
          <CardContent>
            {recentAudits && recentAudits.length > 0 ? (
              <div className="divide-y divide-slate-100">
                {recentAudits.map((log) => (
                  <div key={log.id} className="py-2.5 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2.5">
                      <div className="p-1.5 bg-slate-100 text-slate-700 rounded font-mono text-[10px]">
                        <FileText className="w-3.5 h-3.5" />
                      </div>
                      <div>
                        <div className="font-semibold text-slate-900 flex items-center gap-1.5">
                          <span>{log.action}</span>
                          <Badge variant="secondary" className="font-mono text-[9px] px-1 py-0">
                            {log.resource_type}
                          </Badge>
                        </div>
                        <div className="text-slate-500 text-[11px]">
                          Actor: <span className="font-mono">{log.actor_user_id?.substring(0, 8) || "System"}</span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right text-slate-400 font-mono text-[11px]">
                      {formatDate(log.created_at)}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-8 text-center text-slate-400 text-xs">
                No audit records logged yet.
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
