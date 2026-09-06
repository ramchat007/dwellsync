"use client";

import React from "react";
import Link from "next/link";
import { Profile, Society, RoleId, Unit, FamilyMember } from "@/lib/types/database";
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
  Star,
  MessageSquare,
  Calendar,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export function ResidentDashboardClient({
  profile,
  society,
  role,
  units,
  householdMembers = [],
  notices = [],
}: {
  profile: Profile;
  society: Society | null;
  role: RoleId;
  units: (Unit & {
    building?: { id: string; name: string; code: string };
    wing?: { id: string; name: string; code: string };
    floor?: { id: string; name: string; floor_number: number };
    ownership?: {
      ownership_percentage?: number;
      ownership_type?: string;
      start_date?: string;
      is_primary?: boolean;
    };
    occupancy?: {
      occupancy_type?: string;
      lease_start?: string;
      lease_end?: string;
      is_primary_tenant?: boolean;
    };
  })[];
  householdMembers?: FamilyMember[];
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
                          {unit.building?.name || "Main Building"}
                          {unit.wing?.name ? ` • Wing ${unit.wing.name}` : ""}
                          {" • "}
                          {unit.floor?.name || (unit.floor?.floor_number != null ? `Floor ${unit.floor.floor_number}` : "Floor 1")}
                          {unit.unit_type ? ` • ${unit.unit_type.replace("_", " ")}` : ""}
                        </p>
                      </div>
                    </div>
                    {unit.ownership ? (
                      <span className="px-2.5 py-0.5 text-[10px] font-bold rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                        Owner ({unit.ownership.ownership_percentage ?? 100}%{unit.ownership.ownership_type === "JOINT" ? " Joint" : ""})
                      </span>
                    ) : unit.occupancy ? (
                      <span className="px-2.5 py-0.5 text-[10px] font-bold rounded-full bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                        Tenant ({unit.occupancy.occupancy_type?.replace("_", " ") || "Occupant"})
                      </span>
                    ) : (
                      <span className="px-2.5 py-0.5 text-[10px] font-bold rounded-full bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                        Verified Flat
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                      <span className="text-[10px] text-slate-500 uppercase tracking-wider block font-semibold">
                        Carpet Area
                      </span>
                      <span className="font-bold text-slate-800 dark:text-slate-200">
                        {unit.carpet_area_sqft || unit.area_sqft || "—"} sq.ft
                      </span>
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

          {/* Household Summary Card */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                  Household Summary ({householdMembers.length})
                </h3>
              </div>
              <Link
                href="/resident/family"
                className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
              >
                <span>Manage</span>
                <ArrowRight className="w-3 h-3" />
              </Link>
            </div>

            {householdMembers.length > 0 ? (
              <div className="space-y-2">
                {householdMembers.slice(0, 3).map((member) => (
                  <div
                    key={member.id}
                    className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 text-xs"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 font-bold flex items-center justify-center text-[10px]">
                        {member.full_name.charAt(0)}
                      </div>
                      <div>
                        <span className="font-semibold text-slate-900 dark:text-white">{member.full_name}</span>
                        <span className="text-[10px] text-slate-500 ml-1.5 font-mono">({member.relationship})</span>
                      </div>
                    </div>
                    {member.is_emergency_contact && (
                      <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-rose-50 text-rose-700 dark:bg-rose-950 dark:text-rose-300">
                        Emergency
                      </span>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 text-center py-4">
                <Users className="w-5 h-5 text-slate-300 dark:text-slate-600 mx-auto mb-1" />
                <div className="font-bold text-xs text-slate-700 dark:text-slate-300">
                  No household members added
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                  Add family members to associate their profiles with your residence.
                </p>
              </div>
            )}
          </div>

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
            {/* Maintenance Dues & Bills */}
            <Link
              href="/resident/dues"
              className="p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-emerald-300 dark:hover:border-emerald-700 transition flex items-center justify-between shadow-sm group"
            >
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400">
                  <Receipt className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-bold text-xs text-slate-900 dark:text-white group-hover:text-emerald-600 transition">
                    Maintenance Dues & Bills
                  </div>
                  <div className="text-[11px] text-slate-500">View invoices & verified receipts</div>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-emerald-600 transition" />
            </Link>

            {/* Helpdesk & Complaints */}
            <Link
              href="/resident/complaints"
              className="p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-blue-300 dark:hover:border-blue-700 transition flex items-center justify-between shadow-sm group"
            >
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950 text-amber-600 dark:text-amber-400">
                  <MessageSquare className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-bold text-xs text-slate-900 dark:text-white group-hover:text-amber-600 transition">
                    Helpdesk & Complaints
                  </div>
                  <div className="text-[11px] text-slate-500">Service tickets & maintenance</div>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-amber-600 transition" />
            </Link>

            {/* Amenities & Sports */}
            <Link
              href="/resident/amenities"
              className="p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-blue-300 dark:hover:border-blue-700 transition flex items-center justify-between shadow-sm group"
            >
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-bold text-xs text-slate-900 dark:text-white group-hover:text-blue-600 transition">
                    Book Amenities
                  </div>
                  <div className="text-[11px] text-slate-500">Clubhouse, pool & courts</div>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-blue-600 transition" />
            </Link>

            {/* Events & Calendar */}
            <Link
              href="/resident/events"
              className="p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-blue-300 dark:hover:border-blue-700 transition flex items-center justify-between shadow-sm group"
            >
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400">
                  <Calendar className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-bold text-xs text-slate-900 dark:text-white group-hover:text-indigo-600 transition">
                    Community Events & AGMs
                  </div>
                  <div className="text-[11px] text-slate-500">Festivals, meetings & schedules</div>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-indigo-600 transition" />
            </Link>

            {/* My Home & Family */}
            <Link
              href="/resident/family"
              className="p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-blue-300 dark:hover:border-blue-700 transition flex items-center justify-between shadow-sm group"
            >
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400">
                  <Users className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-bold text-xs text-slate-900 dark:text-white group-hover:text-emerald-600 transition">
                    Family & Household
                  </div>
                  <div className="text-[11px] text-slate-500">Add members & gate access</div>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-emerald-600 transition" />
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
                <div className="p-2.5 rounded-xl bg-teal-50 dark:bg-teal-950 text-teal-600 dark:text-teal-400">
                  <Building2 className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-bold text-xs text-slate-900 dark:text-white group-hover:text-teal-600 transition">
                    Community Directory
                  </div>
                  <div className="text-[11px] text-slate-500">Verified neighbors & directory</div>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-teal-600 transition" />
            </Link>

            {/* Society Overview Quick Card */}
            {society && (
              <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm space-y-2.5">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                  <span className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5 text-blue-600" />
                    Society Overview
                  </span>
                  <Link
                    href="/resident/society"
                    className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-0.5"
                  >
                    <span>Details</span>
                    <ArrowRight className="w-3 h-3" />
                  </Link>
                </div>
                <div className="text-xs space-y-1.5 text-slate-600 dark:text-slate-400">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500">Society Code</span>
                    <span className="font-mono font-bold text-slate-800 dark:text-slate-200">{society.code}</span>
                  </div>
                  {society.registration_number && (
                    <div className="flex justify-between items-center">
                      <span className="text-slate-500">Registration</span>
                      <span className="font-medium text-slate-800 dark:text-slate-200">{society.registration_number}</span>
                    </div>
                  )}
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500">Location</span>
                    <span className="font-medium text-slate-800 dark:text-slate-200">
                      {society.city ? `${society.city}, ${society.state}` : "Registered Community"}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Emergency Quick Dial */}
          <div className="p-4 rounded-2xl bg-rose-50/70 dark:bg-rose-950/30 border border-rose-100 dark:border-rose-900/50 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-rose-900 dark:text-rose-200 flex items-center gap-1.5">
                <PhoneCall className="w-3.5 h-3.5 text-rose-600" />
                Emergency Services
              </span>
              <a
                href={society?.contact_phone ? `tel:${society.contact_phone}` : "tel:100"}
                className="px-2.5 py-1 text-[11px] font-bold bg-rose-600 hover:bg-rose-700 text-white rounded-lg transition"
              >
                {society?.contact_phone ? "Call Office" : "Call 100"}
              </a>
            </div>
            <p className="text-[11px] text-rose-700/80 dark:text-rose-300/80">
              {society?.contact_phone
                ? `Society Helpdesk line: ${society.contact_phone} or emergency response.`
                : "Direct emergency response line for urgent community assistance."}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
