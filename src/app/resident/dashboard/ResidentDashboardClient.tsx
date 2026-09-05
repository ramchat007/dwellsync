"use client";

import React from "react";
import Link from "next/link";
import { Profile, Society, RoleId, Unit } from "@/lib/types/database";
import {
  Home,
  Building2,
  Users,
  ShieldCheck,
  Receipt,
  Bell,
  Wrench,
  Key,
  DoorOpen,
  ArrowRight,
  Sparkles,
  CheckCircle2,
  Clock,
  FileText,
  HelpCircle,
  PhoneCall,
  UserPlus,
  Zap,
  Shield,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export function ResidentDashboardClient({
  profile,
  society,
  role,
  units,
  notices = [],
}: {
  profile: Profile;
  society: Society | null;
  role: RoleId;
  units: Unit[];
  notices?: any[];
}) {
  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      {/* Mobile-Friendly Welcome Card */}
      <div className="p-5 sm:p-6 rounded-3xl bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 text-white shadow-xl border border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider rounded-full bg-blue-500/20 text-blue-300 border border-blue-400/30">
              {role === "OWNER" ? "PROPERTY OWNER" : role === "TENANT" ? "TENANT RESIDENT" : "RESIDENT"}
            </span>
            <span className="text-xs text-slate-300 font-semibold">{society?.name || "Housing Society"}</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black tracking-tight">
            Welcome back, {profile.display_name || profile.full_name || "Resident"} 👋
          </h1>
          <p className="text-xs text-slate-300 max-w-xl">
            Manage your flat details, household family members, official circulars, and society records.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/resident/society"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-xl bg-white/10 hover:bg-white/20 text-white transition backdrop-blur"
          >
            <Building2 className="w-3.5 h-3.5 text-blue-400" />
            <span>Society Info</span>
          </Link>
        </div>
      </div>

      {!society && (
        <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-xs text-amber-800 dark:text-amber-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
          <span>You do not have an active society membership yet. If you received an invitation link, please visit the link to join your housing society.</span>
          <Link href="/resident/profile" className="font-bold underline shrink-0">View Account Profile</Link>
        </div>
      )}

      {/* Grid: My Flat + Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        {/* Left Column: My Units / Flat Status */}
        <div className="md:col-span-7 space-y-5">
          {/* Flat Header & Shortcut */}
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
              My Household Flat
            </span>
            <Link
              href="/resident/home"
              className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
            >
              <span>View Full Specs</span>
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          {units.length > 0 ? (
            <div className="space-y-3">
              {units.map((unit) => (
                <div
                  key={unit.id}
                  className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm space-y-4"
                >
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold text-sm shadow-md shadow-blue-500/20">
                        {unit.unit_number}
                      </div>
                      <div>
                        <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                          Unit {unit.unit_number}
                        </h2>
                        <p className="text-[11px] text-slate-500">
                          {unit.unit_type?.replace("_", " ") || "2 BHK"} • {unit.carpet_area_sqft || unit.area_sqft || "Standard layout"} sq.ft.
                        </p>
                      </div>
                    </div>
                    <span className="px-2.5 py-0.5 text-[10px] font-bold rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                      ACTIVE
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                      <span className="text-[10px] text-slate-500 uppercase tracking-wider block font-semibold">
                        Monthly Maintenance
                      </span>
                      <span className="font-bold text-slate-700 dark:text-slate-300">No dues recorded</span>
                    </div>
                    <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                      <span className="text-[10px] text-slate-500 uppercase tracking-wider block font-semibold">
                        Intercom Line
                      </span>
                      <span className="font-bold text-slate-900 dark:text-white">
                        {unit.intercom_number || `Ext ${unit.unit_number.replace(/\D/g, "")}`}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <Link
                      href="/resident/family"
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      <UserPlus className="w-3.5 h-3.5" />
                      Manage Family Members
                    </Link>
                    <Link
                      href="/resident/home"
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                    >
                      <Zap className="w-3.5 h-3.5" />
                      Utility Meters
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 text-center space-y-2">
              <DoorOpen className="w-8 h-8 text-slate-400 mx-auto" />
              <div className="font-bold text-slate-900 dark:text-white text-sm">No Unit Linked Yet</div>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Your account is pending unit assignment by your society administrator.
              </p>
            </div>
          )}

          {/* Notices Feed Quick Access */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Bell className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                  Latest Society Notices
                </h3>
              </div>
              <Link
                href="/resident/notices"
                className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
              >
                <span>View All</span>
                <ArrowRight className="w-3 h-3" />
              </Link>
            </div>

            {notices.length > 0 ? (
              <div className="space-y-2.5">
                {notices.map((n: any) => (
                  <div
                    key={n.id}
                    className="p-3 rounded-xl bg-blue-50/60 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900/50"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-blue-950 dark:text-blue-200">
                        {n.title}
                      </span>
                      <span className="text-[10px] text-blue-600 dark:text-blue-400 font-mono">
                        {new Date(n.published_at).toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "short",
                        })}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-1 line-clamp-2">
                      {n.description}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 text-center py-6">
                <Bell className="w-6 h-6 text-slate-300 dark:text-slate-600 mx-auto mb-1.5" />
                <div className="font-bold text-xs text-slate-800 dark:text-slate-200">
                  No notices published yet
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                  Announcements from your society administration will appear here.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Quick Services & Links */}
        <div className="md:col-span-5 space-y-4">
          <div className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wide">
            Resident Services
          </div>

          <div className="grid grid-cols-1 gap-2.5">
            {/* My Home & Family */}
            <Link
              href="/resident/family"
              className="p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-blue-300 dark:hover:border-blue-700 transition flex items-center justify-between shadow-sm group"
            >
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400">
                  <Users className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-bold text-xs text-slate-900 dark:text-white group-hover:text-blue-600 transition">
                    Family & Household
                  </div>
                  <div className="text-[11px] text-slate-500">Add members & gate access</div>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-blue-600 transition" />
            </Link>

            {/* Documents */}
            <Link
              href="/resident/documents"
              className="p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-blue-300 dark:hover:border-blue-700 transition flex items-center justify-between shadow-sm group"
            >
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-purple-50 dark:bg-purple-950 text-purple-600 dark:text-purple-400">
                  <FileText className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-bold text-xs text-slate-900 dark:text-white group-hover:text-purple-600 transition">
                    Society Documents
                  </div>
                  <div className="text-[11px] text-slate-500">Bylaws, minutes & NOC forms</div>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-purple-600 transition" />
            </Link>

            {/* Community Directory */}
            <Link
              href="/resident/community"
              className="p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-blue-300 dark:hover:border-blue-700 transition flex items-center justify-between shadow-sm group"
            >
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400">
                  <Building2 className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-bold text-xs text-slate-900 dark:text-white group-hover:text-emerald-600 transition">
                    Community Directory
                  </div>
                  <div className="text-[11px] text-slate-500">Verified neighbors & directory</div>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-emerald-600 transition" />
            </Link>

            {/* Additional Services Notice */}
            <div className="p-3.5 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/60 text-center py-4 space-y-1">
              <div className="font-semibold text-xs text-slate-700 dark:text-slate-300">
                Helpdesk & Gate Services
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 max-w-xs mx-auto">
                Complaint ticketing, visitor gate passes, and maintenance payments will appear here when configured by your society.
              </p>
            </div>
          </div>

          {/* Emergency Quick Dial */}
          <div className="p-4 rounded-2xl bg-rose-50/70 dark:bg-rose-950/30 border border-rose-100 dark:border-rose-900/50 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-rose-900 dark:text-rose-200 flex items-center gap-1.5">
                <PhoneCall className="w-3.5 h-3.5 text-rose-600" />
                Emergency Security Gate
              </span>
              <a
                href="tel:100"
                className="px-2.5 py-1 text-[11px] font-bold bg-rose-600 hover:bg-rose-700 text-white rounded-lg transition"
              >
                Call Gate
              </a>
            </div>
            <p className="text-[11px] text-rose-700/80 dark:text-rose-300/80">
              Direct connection to the main entrance security checkpoint for urgent assistance.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
