"use client";

import React from "react";
import Link from "next/link";
import { Profile, Society, RoleId } from "@/lib/types/database";
import {
  Receipt,
  Building2,
  Users,
  DoorOpen,
  CreditCard,
  FileSpreadsheet,
  Banknote,
  ArrowRight,
  Sparkles,
  PieChart,
  DollarSign,
  TrendingUp,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export function FinanceDashboardClient({
  profile,
  society,
  role,
  totalUnits,
}: {
  profile: Profile;
  society: Society | null;
  role: RoleId;
  totalUnits: number;
}) {
  const sid = society?.id || "default";

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      {/* Top Banner */}
      <div className="p-5 sm:p-6 rounded-2xl bg-gradient-to-r from-slate-900 via-emerald-950 to-slate-900 text-white shadow-lg border border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Badge variant="success" className="font-mono text-[10px] px-2 py-0.5">
              TREASURY & FINANCE
            </Badge>
            <span className="text-xs text-slate-400 font-medium">{society?.name || "Society"}</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight">
            Financial Dashboard — {profile.full_name || "Treasurer"}
          </h1>
          <p className="text-xs text-slate-300">
            Maintenance billings, collections, vendor expenses, vouchers, and audit books.
          </p>
        </div>

        <Link href={`/society/${sid}/units`}>
          <Button variant="secondary" size="sm" className="text-xs font-semibold gap-1.5 shadow-sm">
            <DoorOpen className="w-3.5 h-3.5 text-emerald-600" />
            <span>Unit Register</span>
          </Button>
        </Link>
      </div>

      {/* Financial Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-slate-200 shadow-sm bg-white">
          <CardContent className="p-4 flex items-center gap-3 text-xs">
            <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-600">
              <DoorOpen className="w-5 h-5" />
            </div>
            <div>
              <div className="text-slate-400 text-[11px]">Billing Units Target</div>
              <div className="text-xl font-bold text-slate-900">{totalUnits} Flats</div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-sm bg-white">
          <CardContent className="p-4 flex items-center gap-3 text-xs">
            <div className="p-2.5 rounded-xl bg-indigo-50 text-indigo-600">
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <div className="text-slate-400 text-[11px]">Designated Society Account</div>
              <div className="text-sm font-bold text-slate-900 font-mono">
                {society?.name || "Pending Bank Setup"}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-sm bg-white">
          <CardContent className="p-4 flex items-center gap-3 text-xs">
            <div className="p-2.5 rounded-xl bg-amber-50 text-amber-600">
              <Receipt className="w-5 h-5" />
            </div>
            <div>
              <div className="text-slate-400 text-[11px]">Financial Status</div>
              <div className="text-sm font-bold text-slate-600 font-mono">Pending Setup</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Grid: Management + Financial State */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        {/* Left Column: Management Shortcuts */}
        <div className="md:col-span-6 space-y-4">
          <div className="text-xs font-bold text-slate-700 uppercase tracking-wide">
            Treasury Quick Access
          </div>

          <div className="grid grid-cols-1 gap-3">
            <Link href={`/society/${sid}/units`}>
              <Card className="border-slate-200 hover:border-emerald-500 transition-all p-4 bg-white shadow-2xs group cursor-pointer">
                <div className="flex items-center justify-between mb-2">
                  <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                    <DoorOpen className="w-4 h-4" />
                  </div>
                  <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-emerald-600" />
                </div>
                <div className="font-bold text-xs text-slate-900">Unit Register & Carpet Area</div>
                <div className="text-[11px] text-slate-500 mt-0.5">Inspect square footage for maintenance calculation</div>
              </Card>
            </Link>

            <Link href={`/society/${sid}/people`}>
              <Card className="border-slate-200 hover:border-emerald-500 transition-all p-4 bg-white shadow-2xs group cursor-pointer">
                <div className="flex items-center justify-between mb-2">
                  <div className="p-2 rounded-lg bg-indigo-50 text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                    <Users className="w-4 h-4" />
                  </div>
                  <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-emerald-600" />
                </div>
                <div className="font-bold text-xs text-slate-900">Owners & Payees Directory</div>
                <div className="text-[11px] text-slate-500 mt-0.5">Roster of primary unit equity owners</div>
              </Card>
            </Link>
          </div>
        </div>

        {/* Right Column: Financial Modules Honest Empty State */}
        <div className="md:col-span-6 space-y-4">
          <div className="text-xs font-bold text-slate-700 uppercase tracking-wide">
            Financial Ledger & Operations
          </div>

          <Card className="border-slate-200 shadow-sm bg-white">
            <CardHeader className="pb-2 border-b border-slate-100">
              <CardTitle className="text-xs font-bold flex items-center gap-2 text-slate-900">
                <Banknote className="w-4 h-4 text-emerald-600" /> Treasury Operations
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6 pb-8 text-center text-xs space-y-2">
              <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-2">
                <FileSpreadsheet className="w-5 h-5" />
              </div>
              <div className="font-bold text-slate-800">No financial data available yet.</div>
              <p className="text-[11px] text-slate-400 max-w-xs mx-auto">
                Maintenance billings, collections, and expense vouchers will appear here when configured.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
