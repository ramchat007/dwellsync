"use client";

import React from "react";
import Link from "next/link";
import { Profile, Society, RoleId } from "@/lib/types/database";
import {
  ShieldAlert,
  ShieldCheck,
  Users,
  Car,
  Package,
  Clock,
  ArrowRight,
  Sparkles,
  PhoneCall,
  Search,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export function SecurityDashboardClient({
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
      {/* Mobile-First Gate Status Banner */}
      <div className="p-5 sm:p-6 rounded-2xl bg-gradient-to-r from-slate-900 via-amber-950/80 to-slate-900 text-white shadow-lg border border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Badge variant="warning" className="font-mono text-[10px] px-2 py-0.5 font-bold">
              GATE SECURITY DESK
            </Badge>
            <span className="text-xs text-slate-400 font-medium">{society?.name || "Society"}</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight">
            Main Gate — Officer {profile.full_name || "Guard"}
          </h1>
          <p className="text-xs text-slate-300">
            Visitor verification, delivery drop-offs, vehicle movements, and gate emergency logs.
          </p>
        </div>

        <Link href={`/society/${sid}/people`}>
          <Button variant="secondary" size="sm" className="text-xs font-semibold gap-1.5 shadow-sm">
            <Users className="w-3.5 h-3.5 text-amber-600" />
            <span>Resident Directory</span>
          </Button>
        </Link>
      </div>

      {/* Gate Quick Action Buttons (Mobile-optimized grid) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-4 rounded-xl border border-slate-200 bg-white text-center shadow-2xs space-y-2">
          <div className="w-10 h-10 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div className="font-bold text-xs text-slate-900">Visitor Check-In</div>
          <Badge variant="purple" className="font-mono text-[9px]">
            COMING SOON
          </Badge>
        </div>

        <div className="p-4 rounded-xl border border-slate-200 bg-white text-center shadow-2xs space-y-2">
          <div className="w-10 h-10 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center mx-auto">
            <Package className="w-5 h-5" />
          </div>
          <div className="font-bold text-xs text-slate-900">Delivery Pass</div>
          <Badge variant="purple" className="font-mono text-[9px]">
            COMING SOON
          </Badge>
        </div>

        <div className="p-4 rounded-xl border border-slate-200 bg-white text-center shadow-2xs space-y-2">
          <div className="w-10 h-10 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto">
            <Car className="w-5 h-5" />
          </div>
          <div className="font-bold text-xs text-slate-900">Vehicle Entry</div>
          <Badge variant="purple" className="font-mono text-[9px]">
            COMING SOON
          </Badge>
        </div>

        <div className="p-4 rounded-xl border border-slate-200 bg-white text-center shadow-2xs space-y-2">
          <div className="w-10 h-10 rounded-full bg-red-50 text-red-600 flex items-center justify-center mx-auto">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div className="font-bold text-xs text-slate-900">Gate Alert</div>
          <Badge variant="purple" className="font-mono text-[9px]">
            COMING SOON
          </Badge>
        </div>
      </div>

      {/* Main Grid: Gate Roster & Gate Security Information */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        {/* Left Column: Directory Lookup */}
        <div className="md:col-span-7 space-y-4">
          <Card className="border-slate-200 shadow-sm bg-white">
            <CardHeader className="pb-3 border-b border-slate-100">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <Users className="w-4 h-4 text-indigo-600" /> Society Resident Verification
              </CardTitle>
              <CardDescription className="text-xs">
                Quickly locate flat numbers and resident identities for gate clearance.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-4 space-y-3 text-xs">
              <p className="text-slate-600 leading-relaxed">
                Use the verified resident directory to confirm visitor invitations, flat owner approvals, or resident vehicle stickers.
              </p>
              <Link href={`/society/${sid}/people`}>
                <Button className="w-full bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold gap-2 h-9">
                  <Search className="w-3.5 h-3.5" />
                  <span>Search Resident Directory</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Gate Instructions */}
        <div className="md:col-span-5 space-y-4">
          <Card className="border-slate-200 shadow-sm bg-slate-50">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-bold flex items-center gap-2 text-slate-900">
                <ShieldAlert className="w-4 h-4 text-amber-600" /> Standard Gate Protocols
              </CardTitle>
            </CardHeader>
            <CardContent className="text-xs text-slate-600 space-y-2">
              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                <span>Verify all courier/delivery drivers before granting barrier gate access.</span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                <span>Commercial vendor trucks must log in-and-out timings at the security post.</span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                <span>In case of medical or fire emergencies, contact society manager immediately.</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

