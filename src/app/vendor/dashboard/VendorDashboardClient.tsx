"use client";

import React from "react";
import Link from "next/link";
import { Profile, Society, RoleId } from "@/lib/types/database";
import {
  Truck,
  Building2,
  Receipt,
  FileText,
  Clock,
  Sparkles,
  ArrowRight,
  Shield,
  HelpCircle,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export function VendorDashboardClient({
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
      <div className="p-5 sm:p-6 rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white shadow-lg border border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Badge variant="purple" className="font-mono text-[10px] px-2 py-0.5">
              SERVICE VENDOR PORTAL
            </Badge>
            <span className="text-xs text-slate-400 font-medium">{society?.name || "Society"}</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight">
            Vendor Workspace — {profile.full_name || "Contractor"}
          </h1>
          <p className="text-xs text-slate-300">
            Society contracts, service delivery milestones, and invoice tracking.
          </p>
        </div>

        <Link href={`/society/${sid}/society`}>
          <Button variant="secondary" size="sm" className="text-xs font-semibold gap-1.5 shadow-sm">
            <Building2 className="w-3.5 h-3.5" />
            <span>Society Profile</span>
          </Button>
        </Link>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        <div className="md:col-span-7 space-y-4">
          <Card className="border-slate-200 shadow-sm bg-white">
            <CardHeader className="pb-3 border-b border-slate-100">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <Truck className="w-4 h-4 text-indigo-600" /> Vendor Service Orders
              </CardTitle>
              <CardDescription className="text-xs">
                Contracts for lift maintenance, security, gardening, and housekeeping.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6 pb-8 text-xs text-slate-500 text-center space-y-2">
              <FileText className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <div className="font-bold text-slate-800">No vendor activity yet.</div>
              <p className="text-[11px] text-slate-400 mt-1 max-w-xs mx-auto">
                Vendor contract and service order features will appear here when configured.
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="md:col-span-5 space-y-4">
          <Card className="border-slate-200 shadow-sm bg-slate-50">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-bold flex items-center gap-2 text-slate-900">
                <HelpCircle className="w-4 h-4 text-slate-500" /> Society Billing Contacts
              </CardTitle>
            </CardHeader>
            <CardContent className="text-xs text-slate-600 space-y-2">
              <div>Society: <strong className="text-slate-900">{society?.name || "DwellSyncHub Society"}</strong></div>
              <div>Treasurer / Office: <span className="font-mono">Clubhouse 1st Floor</span></div>
              <div className="pt-2 text-[11px] text-slate-400">
                Submit GST invoices directly to the Hon. Treasurer during office hours.
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

