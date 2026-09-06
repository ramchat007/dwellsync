"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Profile, Society, RoleId, Visitor, VisitorPurpose } from "@/lib/types/database";
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
  QrCode,
  LogIn,
  LogOut,
  Plus,
  Wrench,
  Heart,
  Loader2,
  XCircle,
  Building,
} from "lucide-react";

interface SecurityDashboardClientProps {
  profile: Profile;
  society: Society | null;
  role: RoleId;
  units: any[];
  initialVisitors: Visitor[];
}

const PURPOSE_CONFIG: Record<
  VisitorPurpose,
  { label: string; icon: React.ComponentType<{ className?: string }>; color: string }
> = {
  GUEST: { label: "Guest", icon: Users, color: "text-blue-600 bg-blue-50 dark:bg-blue-950/50" },
  DELIVERY: { label: "Delivery", icon: Package, color: "text-amber-600 bg-amber-50 dark:bg-amber-950/50" },
  CAB: { label: "Cab / Taxi", icon: Car, color: "text-indigo-600 bg-indigo-50 dark:bg-indigo-950/50" },
  SERVICE: { label: "Service", icon: Wrench, color: "text-emerald-600 bg-emerald-50 dark:bg-emerald-950/50" },
  FAMILY: { label: "Family", icon: Heart, color: "text-rose-600 bg-rose-50 dark:bg-rose-950/50" },
  OTHER: { label: "Visitor", icon: Users, color: "text-slate-600 bg-slate-50 dark:bg-slate-800" },
};

export function SecurityDashboardClient({
  profile,
  society,
  role,
  units,
  initialVisitors,
}: SecurityDashboardClientProps) {
  const [visitors, setVisitors] = useState<Visitor[]>(initialVisitors);
  const [activeTab, setActiveTab] = useState<"inside" | "expected" | "history">("inside");
  const [searchQuery, setSearchQuery] = useState("");

  // Fast Passcode Verifier State
  const [verifyCode, setVerifyCode] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [verifyMessage, setVerifyMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Walk-In Entry Modal State
  const [isWalkInOpen, setIsWalkInOpen] = useState(false);
  const [walkInUnitId, setWalkInUnitId] = useState(units[0]?.id || "");
  const [walkInName, setWalkInName] = useState("");
  const [walkInPhone, setWalkInPhone] = useState("");
  const [walkInPurpose, setWalkInPurpose] = useState<VisitorPurpose>("DELIVERY");
  const [walkInVehicle, setWalkInVehicle] = useState("");
  const [walkInGate, setWalkInGate] = useState("Main Gate");
  const [walkInNotes, setWalkInNotes] = useState("");
  const [isSubmittingWalkIn, setIsSubmittingWalkIn] = useState(false);
  const [walkInError, setWalkInError] = useState<string | null>(null);

  // Action loading state
  const [loadingActionId, setLoadingActionId] = useState<string | null>(null);

  // Segment visitors
  const insideCampus = visitors.filter((v) => v.status === "CHECKED_IN");
  const expectedVisitors = visitors.filter((v) => v.status === "EXPECTED");
  const historyVisitors = visitors.filter(
    (v) => v.status === "CHECKED_OUT" || v.status === "CANCELLED" || v.status === "DENIED"
  );

  // Search filter
  const filterList = (list: Visitor[]) => {
    if (!searchQuery.trim()) return list;
    const q = searchQuery.toLowerCase().trim();
    return list.filter(
      (v) =>
        v.visitor_name.toLowerCase().includes(q) ||
        v.pass_code.toLowerCase().includes(q) ||
        v.unit?.unit_number?.toLowerCase().includes(q) ||
        v.vehicle_number?.toLowerCase().includes(q)
    );
  };

  // Quick Passcode Verification & Instant Check-In
  const handleVerifyPassCode = async (e: React.FormEvent) => {
    e.preventDefault();
    const code = verifyCode.trim();
    if (code.length !== 6) {
      setVerifyMessage({ type: "error", text: "Please enter a valid 6-digit pass code." });
      return;
    }

    try {
      setIsVerifying(true);
      setVerifyMessage(null);

      const res = await fetch("/api/security/visitors/verify-pass/check-in", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pass_code: code,
          gate_number: "Main Gate",
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setVerifyMessage({ type: "error", text: data.error || "Pass verification failed." });
        return;
      }

      setVisitors((prev) => {
        const exists = prev.some((v) => v.id === data.visitor.id);
        if (exists) {
          return prev.map((v) => (v.id === data.visitor.id ? data.visitor : v));
        }
        return [data.visitor, ...prev];
      });

      setVerifyMessage({
        type: "success",
        text: `Checked in ${data.visitor.visitor_name} for Flat ${data.visitor.unit?.unit_number || "—"}.`,
      });
      setVerifyCode("");
      setActiveTab("inside");
    } catch (err) {
      console.error(err);
      setVerifyMessage({ type: "error", text: "Network connection error during verification." });
    } finally {
      setIsVerifying(false);
    }
  };

  // Direct Check-In for an Expected Visitor
  const handleCheckIn = async (visitorId: string) => {
    try {
      setLoadingActionId(visitorId);
      const res = await fetch(`/api/security/visitors/${visitorId}/check-in`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ gate_number: "Main Gate" }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setVisitors((prev) =>
          prev.map((v) => (v.id === visitorId ? data.visitor : v))
        );
      } else {
        alert(data.error || "Check-in failed.");
      }
    } catch (err) {
      console.error(err);
      alert("Network error.");
    } finally {
      setLoadingActionId(null);
    }
  };

  // Direct Check-Out for an Active Visitor
  const handleCheckOut = async (visitorId: string) => {
    try {
      setLoadingActionId(visitorId);
      const res = await fetch(`/api/security/visitors/${visitorId}/check-out`, {
        method: "POST",
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setVisitors((prev) =>
          prev.map((v) => (v.id === visitorId ? data.visitor : v))
        );
      } else {
        alert(data.error || "Check-out failed.");
      }
    } catch (err) {
      console.error(err);
      alert("Network error.");
    } finally {
      setLoadingActionId(null);
    }
  };

  // Direct Walk-In Registration
  const handleWalkInSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!walkInUnitId) {
      setWalkInError("Please select a target unit.");
      return;
    }
    if (!walkInName.trim()) {
      setWalkInError("Please enter the visitor's name.");
      return;
    }

    try {
      setIsSubmittingWalkIn(true);
      setWalkInError(null);

      const res = await fetch("/api/security/visitors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          unit_id: walkInUnitId,
          visitor_name: walkInName.trim(),
          visitor_phone: walkInPhone.trim() || undefined,
          purpose: walkInPurpose,
          vehicle_number: walkInVehicle.trim() || undefined,
          gate_number: walkInGate || "Main Gate",
          notes: walkInNotes.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setWalkInError(data.error || "Failed to log walk-in visitor.");
        return;
      }

      setVisitors([data.visitor, ...visitors]);
      setIsWalkInOpen(false);

      // Reset form
      setWalkInName("");
      setWalkInPhone("");
      setWalkInPurpose("DELIVERY");
      setWalkInVehicle("");
      setWalkInNotes("");
      setActiveTab("inside");
    } catch (err) {
      console.error(err);
      setWalkInError("Network error occurred.");
    } finally {
      setIsSubmittingWalkIn(false);
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Mobile-First Gate Operations Banner */}
      <div className="p-6 rounded-3xl bg-slate-900 text-white shadow-xl border border-slate-800 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 uppercase tracking-wide">
                Security Checkpoint
              </span>
              <span className="text-xs text-slate-400 font-medium">
                {society?.name || "Society"}
              </span>
            </div>
            <h1 className="text-2xl font-black tracking-tight">
              Main Gate Operations
            </h1>
            <p className="text-xs text-slate-400">
              Officer On Duty: <strong className="text-white">{profile.full_name || "Security Officer"}</strong>
            </p>
          </div>

          {/* Action: New Walk-In Entry */}
          <button
            onClick={() => {
              setWalkInError(null);
              setIsWalkInOpen(true);
            }}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs transition shadow-lg shadow-amber-500/20 shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Quick Walk-In Entry</span>
          </button>
        </div>

        {/* Real-Time Gate Traffic Counters */}
        <div className="grid grid-cols-3 gap-3 pt-2 border-t border-slate-800 text-center">
          <div className="p-3 rounded-2xl bg-slate-800/50">
            <span className="text-[10px] uppercase font-bold text-emerald-400 tracking-wider block">
              Inside Campus
            </span>
            <span className="text-2xl font-black font-mono text-white mt-0.5 block">
              {insideCampus.length}
            </span>
          </div>
          <div className="p-3 rounded-2xl bg-slate-800/50">
            <span className="text-[10px] uppercase font-bold text-amber-400 tracking-wider block">
              Expected Today
            </span>
            <span className="text-2xl font-black font-mono text-white mt-0.5 block">
              {expectedVisitors.length}
            </span>
          </div>
          <div className="p-3 rounded-2xl bg-slate-800/50">
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">
              Completed Visits
            </span>
            <span className="text-2xl font-black font-mono text-white mt-0.5 block">
              {historyVisitors.length}
            </span>
          </div>
        </div>
      </div>

      {/* Fast Passcode Verifier Card */}
      <div className="p-5 sm:p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950 text-blue-600 flex items-center justify-center">
              <QrCode className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                Quick Passcode Verifier
              </h2>
              <p className="text-[11px] text-slate-500">
                Enter 6-digit resident gate code for instant verification & check-in.
              </p>
            </div>
          </div>
        </div>

        <form onSubmit={handleVerifyPassCode} className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <input
              type="text"
              maxLength={6}
              placeholder="Enter 6-digit code (e.g. 481902)"
              value={verifyCode}
              onChange={(e) => setVerifyCode(e.target.value.replace(/\D/g, ""))}
              className="w-full pl-4 pr-10 py-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white text-base font-mono font-bold tracking-widest focus:bg-white dark:focus:bg-slate-900 transition"
            />
            {verifyCode && (
              <button
                type="button"
                onClick={() => setVerifyCode("")}
                className="absolute right-3 top-3.5 text-xs text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            )}
          </div>

          <button
            type="submit"
            disabled={isVerifying || verifyCode.length !== 6}
            className="px-6 py-3 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs transition shadow-sm disabled:opacity-40 shrink-0 inline-flex items-center justify-center gap-2"
          >
            {isVerifying ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Verifying...</span>
              </>
            ) : (
              <>
                <LogIn className="w-4 h-4" />
                <span>Verify & Check In</span>
              </>
            )}
          </button>
        </form>

        {verifyMessage && (
          <div
            className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
              verifyMessage.type === "success"
                ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"
                : "bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300 border border-rose-200 dark:border-rose-800"
            }`}
          >
            {verifyMessage.type === "success" ? (
              <CheckCircle2 className="w-4 h-4 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 shrink-0" />
            )}
            <span>{verifyMessage.text}</span>
          </div>
        )}
      </div>

      {/* Filter & Queue Tabs */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Tabs */}
          <div className="flex items-center space-x-2 border-b border-slate-200 dark:border-slate-800 pb-2">
            <button
              onClick={() => setActiveTab("inside")}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
                activeTab === "inside"
                  ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
                  : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-300"
              }`}
            >
              <span>Inside Campus</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] bg-emerald-100 dark:bg-emerald-900 text-emerald-800 dark:text-emerald-200 font-mono">
                {insideCampus.length}
              </span>
            </button>
            <button
              onClick={() => setActiveTab("expected")}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
                activeTab === "expected"
                  ? "bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300"
                  : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-300"
              }`}
            >
              <span>Expected Arrivals</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] bg-amber-100 dark:bg-amber-900 text-amber-800 dark:text-amber-200 font-mono">
                {expectedVisitors.length}
              </span>
            </button>
            <button
              onClick={() => setActiveTab("history")}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
                activeTab === "history"
                  ? "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200"
                  : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-300"
              }`}
            >
              <span>Gate Log History</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-mono">
                {historyVisitors.length}
              </span>
            </button>
          </div>

          {/* Quick Search */}
          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
            <input
              type="text"
              placeholder="Search flat, name, vehicle..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-xs"
            />
          </div>
        </div>

        {/* Tab 1: Inside Campus */}
        {activeTab === "inside" && (
          <div className="space-y-3">
            {filterList(insideCampus).length === 0 ? (
              <div className="p-12 text-center bg-white dark:bg-slate-900 rounded-3xl border border-dashed border-slate-200 dark:border-slate-800 space-y-2">
                <ShieldCheck className="w-10 h-10 text-emerald-500 mx-auto" />
                <p className="text-sm font-bold text-slate-800 dark:text-slate-200">
                  No Visitors Currently on Campus
                </p>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  All checked-in guests and delivery vehicles have exited the society gates.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filterList(insideCampus).map((visitor) => {
                  const config = PURPOSE_CONFIG[visitor.purpose] || PURPOSE_CONFIG.OTHER;
                  const Icon = config.icon;

                  return (
                    <div
                      key={visitor.id}
                      className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4 hover:border-emerald-300 dark:hover:border-emerald-700 transition"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center space-x-3">
                          <div className={`w-10 h-10 rounded-xl ${config.color} flex items-center justify-center shrink-0`}>
                            <Icon className="w-5 h-5" />
                          </div>
                          <div>
                            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                              {visitor.visitor_name}
                            </h3>
                            <p className="text-[11px] text-slate-500 mt-0.5">
                              Destination: <strong className="text-slate-800 dark:text-slate-200">Flat {visitor.unit?.unit_number || "—"}</strong>
                              {visitor.unit?.building?.name && ` (${visitor.unit.building.name})`}
                            </p>
                          </div>
                        </div>

                        <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 uppercase tracking-wide">
                          Active
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-xs bg-slate-50 dark:bg-slate-950/60 p-3 rounded-xl">
                        <div>
                          <span className="text-[10px] uppercase font-bold text-slate-400 block">
                            Entry Time
                          </span>
                          <span className="font-semibold text-slate-800 dark:text-slate-200">
                            {visitor.check_in_at
                              ? new Date(visitor.check_in_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                              : "—"}
                          </span>
                        </div>
                        <div>
                          <span className="text-[10px] uppercase font-bold text-slate-400 block">
                            Vehicle / Gate
                          </span>
                          <span className="font-semibold font-mono text-slate-800 dark:text-slate-200">
                            {visitor.vehicle_number || visitor.gate_number || "Main Gate"}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-1">
                        <span className="text-[11px] text-slate-400 font-mono">
                          Code: {visitor.pass_code}
                        </span>

                        <button
                          onClick={() => handleCheckOut(visitor.id)}
                          disabled={loadingActionId === visitor.id}
                          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:bg-slate-800 text-xs font-bold transition shadow-sm disabled:opacity-50"
                        >
                          {loadingActionId === visitor.id ? (
                            "Updating..."
                          ) : (
                            <>
                              <LogOut className="w-3.5 h-3.5" />
                              <span>Check Out</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Expected Arrivals */}
        {activeTab === "expected" && (
          <div className="space-y-3">
            {filterList(expectedVisitors).length === 0 ? (
              <div className="p-12 text-center bg-white dark:bg-slate-900 rounded-3xl border border-dashed border-slate-200 dark:border-slate-800 space-y-2">
                <Clock className="w-10 h-10 text-amber-500 mx-auto" />
                <p className="text-sm font-bold text-slate-800 dark:text-slate-200">
                  No Expected Visitors Awaiting Arrival
                </p>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  Residents have not pre-registered any upcoming visitors for today.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filterList(expectedVisitors).map((visitor) => {
                  const config = PURPOSE_CONFIG[visitor.purpose] || PURPOSE_CONFIG.OTHER;
                  const Icon = config.icon;

                  return (
                    <div
                      key={visitor.id}
                      className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4 hover:border-amber-300 dark:hover:border-amber-700 transition"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center space-x-3">
                          <div className={`w-10 h-10 rounded-xl ${config.color} flex items-center justify-center shrink-0`}>
                            <Icon className="w-5 h-5" />
                          </div>
                          <div>
                            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                              {visitor.visitor_name}
                            </h3>
                            <p className="text-[11px] text-slate-500 mt-0.5">
                              Destination: <strong className="text-slate-800 dark:text-slate-200">Flat {visitor.unit?.unit_number || "—"}</strong>
                            </p>
                          </div>
                        </div>

                        <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300 uppercase tracking-wide">
                          Pre-Approved
                        </span>
                      </div>

                      <div className="flex items-center justify-between bg-slate-50 dark:bg-slate-950/60 p-3 rounded-xl">
                        <div>
                          <span className="text-[10px] uppercase font-bold text-slate-400 block">
                            Pass Code
                          </span>
                          <span className="text-lg font-black font-mono tracking-widest text-slate-900 dark:text-white">
                            {visitor.pass_code}
                          </span>
                        </div>
                        {visitor.vehicle_number && (
                          <span className="text-xs font-mono text-slate-500">
                            🚗 {visitor.vehicle_number}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center justify-between pt-1">
                        <span className="text-[11px] text-slate-400">
                          {visitor.expected_arrival
                            ? `Expected: ${new Date(visitor.expected_arrival).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`
                            : "Expected Today"}
                        </span>

                        <button
                          onClick={() => handleCheckIn(visitor.id)}
                          disabled={loadingActionId === visitor.id}
                          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition shadow-sm disabled:opacity-50"
                        >
                          {loadingActionId === visitor.id ? (
                            "Processing..."
                          ) : (
                            <>
                              <LogIn className="w-3.5 h-3.5" />
                              <span>Check In</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Tab 3: History */}
        {activeTab === "history" && (
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
            {filterList(historyVisitors).length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400">
                No past visitor records found matching your search.
              </div>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {filterList(historyVisitors).map((v) => (
                  <div
                    key={v.id}
                    className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 dark:text-white">
                          {v.visitor_name}
                        </span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-semibold">
                          {v.purpose}
                        </span>
                        <span className="text-slate-500">Destination: Flat {v.unit?.unit_number || "—"}</span>
                      </div>
                      <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-500 font-mono">
                        <span>Code: {v.pass_code}</span>
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
                          v.status === "CHECKED_OUT"
                            ? "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
                            : "bg-rose-50 text-rose-700 dark:bg-rose-950 dark:text-rose-300"
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
        )}
      </div>

      {/* Walk-In Entry Modal */}
      {isWalkInOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 sm:p-8 max-w-md w-full shadow-2xl space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
              <div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                  Gate Walk-In Entry
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Direct check-in for deliveries, cabs, service staff, or unscheduled guests.
                </p>
              </div>
              <button
                onClick={() => setIsWalkInOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                ✕
              </button>
            </div>

            {walkInError && (
              <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 text-rose-600 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{walkInError}</span>
              </div>
            )}

            <form onSubmit={handleWalkInSubmit} className="space-y-4 text-xs">
              {/* Target Flat */}
              <div className="space-y-1.5">
                <label className="font-semibold text-slate-700 dark:text-slate-300">
                  Target Flat / Unit <span className="text-rose-500">*</span>
                </label>
                <select
                  value={walkInUnitId}
                  onChange={(e) => setWalkInUnitId(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-white"
                  required
                >
                  {units.map((u) => (
                    <option key={u.id} value={u.id}>
                      Flat {u.unit_number} {u.building?.name ? `(${u.building.name})` : ""}
                    </option>
                  ))}
                </select>
              </div>

              {/* Visitor Name & Mobile */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="font-semibold text-slate-700 dark:text-slate-300">
                    Visitor Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Swiggy Delivery"
                    value={walkInName}
                    onChange={(e) => setWalkInName(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-white"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="font-semibold text-slate-700 dark:text-slate-300">
                    Mobile Number
                  </label>
                  <input
                    type="tel"
                    placeholder="e.g. 98201 54321"
                    value={walkInPhone}
                    onChange={(e) => setWalkInPhone(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              {/* Purpose Selector */}
              <div className="space-y-1.5">
                <label className="font-semibold text-slate-700 dark:text-slate-300">
                  Entry Purpose
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(Object.keys(PURPOSE_CONFIG) as VisitorPurpose[]).map((p) => {
                    const cfg = PURPOSE_CONFIG[p];
                    const isSelected = walkInPurpose === p;
                    return (
                      <button
                        type="button"
                        key={p}
                        onClick={() => setWalkInPurpose(p)}
                        className={`p-2 rounded-xl text-[11px] font-semibold flex items-center justify-center gap-1.5 border transition ${
                          isSelected
                            ? "border-amber-500 bg-amber-50 text-amber-800 dark:bg-amber-950 dark:text-amber-200"
                            : "border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800"
                        }`}
                      >
                        {cfg.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Vehicle Number & Gate */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="font-semibold text-slate-700 dark:text-slate-300">
                    Vehicle Number
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. MH01-CA-9999"
                    value={walkInVehicle}
                    onChange={(e) => setWalkInVehicle(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-white font-mono uppercase"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="font-semibold text-slate-700 dark:text-slate-300">
                    Entry Gate
                  </label>
                  <input
                    type="text"
                    value={walkInGate}
                    onChange={(e) => setWalkInGate(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsWalkInOpen(false)}
                  className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingWalkIn}
                  className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold transition shadow-sm disabled:opacity-50"
                >
                  {isSubmittingWalkIn ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Logging...</span>
                    </>
                  ) : (
                    <>
                      <LogIn className="w-4 h-4" />
                      <span>Confirm Entry</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
