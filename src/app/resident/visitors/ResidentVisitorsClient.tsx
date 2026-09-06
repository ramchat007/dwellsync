"use client";

import React, { useState } from "react";
import { Society, Visitor, VisitorPurpose } from "@/lib/types/database";
import {
  ShieldCheck,
  Plus,
  QrCode,
  Copy,
  Check,
  Clock,
  Car,
  Package,
  Users,
  Wrench,
  Heart,
  XCircle,
  AlertCircle,
  Loader2,
  Calendar,
  Building,
  CheckCircle2,
  Share2,
} from "lucide-react";

interface ResidentVisitorsClientProps {
  society: Society | null;
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
  SERVICE: { label: "Home Service", icon: Wrench, color: "text-emerald-600 bg-emerald-50 dark:bg-emerald-950/50" },
  FAMILY: { label: "Family", icon: Heart, color: "text-rose-600 bg-rose-50 dark:bg-rose-950/50" },
  OTHER: { label: "Visitor", icon: Users, color: "text-slate-600 bg-slate-50 dark:bg-slate-800" },
};

export function ResidentVisitorsClient({
  society,
  units,
  initialVisitors,
}: ResidentVisitorsClientProps) {
  const [visitors, setVisitors] = useState<Visitor[]>(initialVisitors);
  const [activeTab, setActiveTab] = useState<"active" | "history">("active");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [createdPass, setCreatedPass] = useState<Visitor | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);

  // Form State
  const [unitId, setUnitId] = useState(units[0]?.id || "");
  const [visitorName, setVisitorName] = useState("");
  const [visitorPhone, setVisitorPhone] = useState("");
  const [purpose, setPurpose] = useState<VisitorPurpose>("GUEST");
  const [vehicleNumber, setVehicleNumber] = useState("");
  const [expectedArrival, setExpectedArrival] = useState("");
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  // Filter visitors
  const activeVisitors = visitors.filter(
    (v) => v.status === "EXPECTED" || v.status === "CHECKED_IN"
  );
  const historyVisitors = visitors.filter(
    (v) => v.status === "CHECKED_OUT" || v.status === "CANCELLED" || v.status === "DENIED"
  );

  const handleCreateInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!unitId) {
      setFormError("Please select a unit.");
      return;
    }
    if (!visitorName.trim()) {
      setFormError("Please enter the visitor's name.");
      return;
    }

    try {
      setIsSubmitting(true);
      setFormError(null);

      const res = await fetch("/api/resident/visitors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          unit_id: unitId,
          visitor_name: visitorName.trim(),
          visitor_phone: visitorPhone.trim() || undefined,
          purpose,
          vehicle_number: vehicleNumber.trim() || undefined,
          expected_arrival: expectedArrival || undefined,
          notes: notes.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setFormError(data.error || "Failed to create visitor pass.");
        return;
      }

      setVisitors([data.visitor, ...visitors]);
      setCreatedPass(data.visitor);
      setIsModalOpen(false);

      // Reset form fields
      setVisitorName("");
      setVisitorPhone("");
      setPurpose("GUEST");
      setVehicleNumber("");
      setExpectedArrival("");
      setNotes("");
    } catch (err) {
      console.error(err);
      setFormError("Network error occurred.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancelInvite = async (id: string) => {
    if (!confirm("Are you sure you want to cancel this visitor pass?")) return;
    try {
      setActionLoadingId(id);
      const res = await fetch(`/api/resident/visitors/${id}/cancel`, {
        method: "POST",
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setVisitors((prev) =>
          prev.map((v) => (v.id === id ? { ...v, status: "CANCELLED" } : v))
        );
      } else {
        alert(data.error || "Failed to cancel visitor pass.");
      }
    } catch (err) {
      console.error(err);
      alert("Network error.");
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleCopyPassDetails = (pass: Visitor) => {
    const unitText = pass.unit?.unit_number ? `Flat ${pass.unit.unit_number}` : "My Flat";
    const text = `🚪 DwellSync Gate Pass\nSociety: ${society?.name || "Society"}\nUnit: ${unitText}\nVisitor: ${pass.visitor_name}\nPass Code: ${pass.pass_code}\nPlease show this 6-digit code at the security gate for quick clearance.`;
    navigator.clipboard.writeText(text);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2500);
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header & Quick Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            <ShieldCheck className="w-7 h-7 text-blue-600 dark:text-blue-400" />
            Gate Passes & Visitor Access
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Pre-approve guests, cabs, deliveries, and home services for seamless security gate entry.
          </p>
        </div>

        <button
          onClick={() => {
            setCreatedPass(null);
            setFormError(null);
            setIsModalOpen(true);
          }}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition shadow-sm shadow-blue-500/20 shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Pre-Approve Visitor</span>
        </button>
      </div>

      {/* Newly Created Pass Showcase */}
      {createdPass && (
        <div className="p-6 rounded-3xl bg-gradient-to-br from-blue-600 to-indigo-700 text-white shadow-lg space-y-4 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="px-3 py-1 rounded-full bg-white/20 text-white text-[11px] font-bold tracking-wide">
              Gate Pass Ready
            </span>
            <button
              onClick={() => setCreatedPass(null)}
              className="text-white/80 hover:text-white text-xs"
            >
              Dismiss
            </button>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <p className="text-xs text-blue-100 font-medium">6-Digit Security Gate Code</p>
              <div className="text-4xl font-black font-mono tracking-widest mt-1">
                {createdPass.pass_code}
              </div>
              <p className="text-xs text-blue-200 mt-1">
                Guest: <strong className="text-white">{createdPass.visitor_name}</strong> • Unit:{" "}
                <strong className="text-white">{createdPass.unit?.unit_number || "Your Unit"}</strong>
              </p>
            </div>

            <button
              onClick={() => handleCopyPassDetails(createdPass)}
              className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-white text-blue-700 hover:bg-blue-50 font-bold text-xs transition shadow"
            >
              {copiedCode ? (
                <>
                  <Check className="w-4 h-4 text-emerald-600" />
                  <span>Pass Details Copied!</span>
                </>
              ) : (
                <>
                  <Share2 className="w-4 h-4 text-blue-600" />
                  <span>Share Pass with Visitor</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex items-center space-x-2 border-b border-slate-200 dark:border-slate-800 pb-2">
        <button
          onClick={() => setActiveTab("active")}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
            activeTab === "active"
              ? "bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300"
              : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-300"
          }`}
        >
          <span>Expected & Active</span>
          <span className="px-2 py-0.5 rounded-full text-[10px] bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 font-mono">
            {activeVisitors.length}
          </span>
        </button>
        <button
          onClick={() => setActiveTab("history")}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
            activeTab === "history"
              ? "bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300"
              : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-300"
          }`}
        >
          <span>Gate Pass History</span>
          <span className="px-2 py-0.5 rounded-full text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-mono">
            {historyVisitors.length}
          </span>
        </button>
      </div>

      {/* Tab 1: Expected & Active Visitors */}
      {activeTab === "active" && (
        <div className="space-y-3">
          {activeVisitors.length === 0 ? (
            <div className="p-12 text-center bg-white dark:bg-slate-900 rounded-3xl border border-dashed border-slate-200 dark:border-slate-800 space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-950 text-blue-600 flex items-center justify-center mx-auto">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <p className="text-sm font-bold text-slate-800 dark:text-slate-200">
                No Active or Upcoming Visitors
              </p>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                Pre-approve visitors to issue digital gate passes, or expect your deliveries to appear here once logged by gate security.
              </p>
              <button
                onClick={() => setIsModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 transition mt-2"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Create First Pass</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {activeVisitors.map((pass) => {
                const config = PURPOSE_CONFIG[pass.purpose] || PURPOSE_CONFIG.OTHER;
                const Icon = config.icon;
                const isInside = pass.status === "CHECKED_IN";

                return (
                  <div
                    key={pass.id}
                    className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4 hover:border-blue-300 dark:hover:border-blue-700 transition"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center space-x-3">
                        <div className={`w-10 h-10 rounded-xl ${config.color} flex items-center justify-center shrink-0`}>
                          <Icon className="w-5 h-5" />
                        </div>
                        <div>
                          <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                            {pass.visitor_name}
                          </h3>
                          <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-0.5">
                            <span className="font-semibold text-slate-700 dark:text-slate-300">
                              {config.label}
                            </span>
                            <span>•</span>
                            <span>Unit {pass.unit?.unit_number || "—"}</span>
                          </div>
                        </div>
                      </div>

                      <span
                        className={`px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wide uppercase ${
                          isInside
                            ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
                            : "bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300"
                        }`}
                      >
                        {isInside ? "Inside Campus" : "Pre-Approved"}
                      </span>
                    </div>

                    {/* Passcode display */}
                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950/70 border border-slate-100 dark:border-slate-800 flex items-center justify-between">
                      <div>
                        <span className="text-[10px] uppercase font-bold text-slate-400 block">
                          Gate Passcode
                        </span>
                        <span className="text-lg font-black font-mono tracking-widest text-slate-900 dark:text-white">
                          {pass.pass_code}
                        </span>
                      </div>
                      <button
                        onClick={() => handleCopyPassDetails(pass)}
                        className="p-2 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-slate-200 dark:hover:bg-slate-800 transition"
                        title="Copy pass details"
                      >
                        <Copy className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Metadata & Actions */}
                    <div className="flex items-center justify-between text-xs text-slate-500 pt-1">
                      <div>
                        {isInside && pass.check_in_at && (
                          <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium">
                            <Clock className="w-3.5 h-3.5" />
                            Entered: {new Date(pass.check_in_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          </span>
                        )}
                        {!isInside && pass.expected_arrival && (
                          <span className="flex items-center gap-1 text-slate-500">
                            <Calendar className="w-3.5 h-3.5" />
                            Expected: {new Date(pass.expected_arrival).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          </span>
                        )}
                        {pass.vehicle_number && (
                          <span className="block text-[11px] font-mono text-slate-400">
                            🚗 {pass.vehicle_number}
                          </span>
                        )}
                      </div>

                      {pass.status === "EXPECTED" && (
                        <button
                          onClick={() => handleCancelInvite(pass.id)}
                          disabled={actionLoadingId === pass.id}
                          className="px-3 py-1.5 rounded-lg text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 text-[11px] font-semibold transition"
                        >
                          {actionLoadingId === pass.id ? "Cancelling..." : "Cancel Invite"}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Tab 2: History */}
      {activeTab === "history" && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
          {historyVisitors.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-400">
              No completed visitor entries in past logs.
            </div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {historyVisitors.map((pass) => (
                <div
                  key={pass.id}
                  className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900 dark:text-white">
                        {pass.visitor_name}
                      </span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-semibold">
                        {pass.purpose}
                      </span>
                      <span className="text-slate-400">• Unit {pass.unit?.unit_number || "—"}</span>
                    </div>
                    <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-500 font-mono">
                      <span>Pass: {pass.pass_code}</span>
                      {pass.vehicle_number && <span>Vehicle: {pass.vehicle_number}</span>}
                      {pass.check_in_at && (
                        <span>
                          In: {new Date(pass.check_in_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </span>
                      )}
                      {pass.check_out_at && (
                        <span>
                          Out: {new Date(pass.check_out_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </span>
                      )}
                    </div>
                  </div>

                  <div>
                    <span
                      className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${
                        pass.status === "CHECKED_OUT"
                          ? "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
                          : "bg-rose-50 text-rose-700 dark:bg-rose-950 dark:text-rose-300"
                      }`}
                    >
                      {pass.status.replace("_", " ")}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Pre-Approve Visitor Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 sm:p-8 max-w-md w-full shadow-2xl space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
              <div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                  Pre-Approve Visitor Pass
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Generate a verified 6-digit gate code for fast clearance.
                </p>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                ✕
              </button>
            </div>

            {formError && (
              <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 text-rose-600 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleCreateInvite} className="space-y-4 text-xs">
              {/* Target Unit */}
              <div className="space-y-1.5">
                <label className="font-semibold text-slate-700 dark:text-slate-300">
                  Target Unit <span className="text-rose-500">*</span>
                </label>
                <select
                  value={unitId}
                  onChange={(e) => setUnitId(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-white"
                  required
                >
                  {units.map((u) => (
                    <option key={u.id} value={u.id}>
                      Unit {u.unit_number} {u.building?.name ? `(${u.building.name})` : ""}
                    </option>
                  ))}
                </select>
              </div>

              {/* Visitor Name & Phone */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="font-semibold text-slate-700 dark:text-slate-300">
                    Visitor Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Anand Sharma"
                    value={visitorName}
                    onChange={(e) => setVisitorName(e.target.value)}
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
                    placeholder="e.g. 98201 12345"
                    value={visitorPhone}
                    onChange={(e) => setVisitorPhone(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              {/* Purpose Selector */}
              <div className="space-y-1.5">
                <label className="font-semibold text-slate-700 dark:text-slate-300">
                  Visit Purpose
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(Object.keys(PURPOSE_CONFIG) as VisitorPurpose[]).map((p) => {
                    const cfg = PURPOSE_CONFIG[p];
                    const isSelected = purpose === p;
                    return (
                      <button
                        type="button"
                        key={p}
                        onClick={() => setPurpose(p)}
                        className={`p-2 rounded-xl text-[11px] font-semibold flex items-center justify-center gap-1.5 border transition ${
                          isSelected
                            ? "border-blue-600 bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300"
                            : "border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800"
                        }`}
                      >
                        {cfg.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Vehicle Number & Expected Time */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="font-semibold text-slate-700 dark:text-slate-300">
                    Vehicle Number
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. MH02-AB-1234"
                    value={vehicleNumber}
                    onChange={(e) => setVehicleNumber(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-white font-mono uppercase"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="font-semibold text-slate-700 dark:text-slate-300">
                    Expected Arrival
                  </label>
                  <input
                    type="datetime-local"
                    value={expectedArrival}
                    onChange={(e) => setExpectedArrival(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold transition shadow-sm disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Creating...</span>
                    </>
                  ) : (
                    <>
                      <QrCode className="w-4 h-4" />
                      <span>Issue Pass</span>
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
