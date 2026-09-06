import React from "react";
import { requireSocietyAccess } from "@/lib/auth/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  ShieldCheck,
  Users,
  Clock,
  Car,
  Package,
  DoorOpen,
  ArrowRight,
  CheckCircle2,
} from "lucide-react";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function SocietyVisitorsPage({
  params,
}: {
  params: Promise<{ societyId: string }>;
}) {
  const { societyId } = await params;
  const { society } = await requireSocietyAccess(societyId);

  const adminClient = createAdminClient();
  const { data: visitorRecords } = await adminClient
    .from("visitors")
    .select(`
      *,
      unit:units (
        id,
        unit_number,
        building:buildings (name, code),
        wing:wings (name, code)
      ),
      creator:profiles!visitors_created_by_fkey (
        id,
        full_name,
        display_name
      )
    `)
    .eq("society_id", societyId)
    .order("created_at", { ascending: false })
    .limit(50);

  const visitors = visitorRecords || [];
  const insideCampus = visitors.filter((v) => v.status === "CHECKED_IN");
  const expectedToday = visitors.filter((v) => v.status === "EXPECTED");
  const completedVisits = visitors.filter((v) => v.status === "CHECKED_OUT");

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-indigo-600" />
            Visitor & Gate Security
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Real-time gate traffic, campus occupancy, and checkpoint history for {society.name}.
          </p>
        </div>

        <Link
          href="/security/dashboard"
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 font-semibold text-xs hover:bg-indigo-100 transition shrink-0"
        >
          <span>Open Security Checkpoint</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-1">
          <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider block">
            Inside Campus Now
          </span>
          <div className="text-3xl font-black font-mono text-slate-900 dark:text-white">
            {insideCampus.length}
          </div>
          <p className="text-[11px] text-slate-400">Active checked-in visitors and service vehicles</p>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-1">
          <span className="text-[11px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider block">
            Pre-Approved Expected
          </span>
          <div className="text-3xl font-black font-mono text-slate-900 dark:text-white">
            {expectedToday.length}
          </div>
          <p className="text-[11px] text-slate-400">Visitor passes issued by residents awaiting arrival</p>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-1">
          <span className="text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider block">
            Completed Exits
          </span>
          <div className="text-3xl font-black font-mono text-slate-900 dark:text-white">
            {completedVisits.length}
          </div>
          <p className="text-[11px] text-slate-400">Total verified departures recorded at the gate</p>
        </div>
      </div>

      {/* Society Gate Log */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
            Recent Gate Checkpoint Entries
          </h2>
          <span className="text-[11px] text-slate-400 font-mono">
            {visitors.length} total entries
          </span>
        </div>

        {visitors.length === 0 ? (
          <div className="p-12 text-center text-xs text-slate-400 space-y-1">
            <DoorOpen className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <p className="font-semibold text-slate-600 dark:text-slate-300">No Visitor Activity Recorded</p>
            <p>Gate operations logs and pre-approved passes will appear here.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {visitors.map((v) => (
              <div
                key={v.id}
                className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900 dark:text-white">
                      {v.visitor_name}
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-semibold">
                      {v.purpose}
                    </span>
                    <span className="text-slate-500">
                      Destination: Flat {v.unit?.unit_number || "—"}
                      {v.unit?.building?.name && ` (${v.unit.building.name})`}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-500 font-mono">
                    <span>Pass: {v.pass_code}</span>
                    {v.vehicle_number && <span>Vehicle: {v.vehicle_number}</span>}
                    {v.check_in_at && (
                      <span>
                        In: {new Date(v.check_in_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    )}
                    {v.check_out_at && (
                      <span>
                        Out: {new Date(v.check_out_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    )}
                  </div>
                </div>

                <div>
                  <span
                    className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${
                      v.status === "CHECKED_IN"
                        ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
                        : v.status === "EXPECTED"
                        ? "bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300"
                        : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
                    }`}
                  >
                    {v.status.replace("_", " ")}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
