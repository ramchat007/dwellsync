"use client";

import React, { useState } from "react";
import {
  MessageSquare,
  Plus,
  AlertCircle,
  Clock,
  CheckCircle2,
  Wrench,
  ChevronRight,
  Filter,
  User,
  Building,
  Tag,
  Loader2,
  Check,
} from "lucide-react";
import { Complaint, Society } from "@/lib/types/database";

interface ComplaintsClientProps {
  initialComplaints: any[];
  residentUnits: any[];
  society: Society;
}

const CATEGORIES = [
  { id: "ALL", label: "All Categories" },
  { id: "ELECTRICAL", label: "Electrical" },
  { id: "PLUMBING", label: "Plumbing" },
  { id: "ELEVATOR", label: "Elevator" },
  { id: "COMMON_AREA", label: "Common Area" },
  { id: "SECURITY", label: "Security" },
  { id: "NOISE", label: "Noise Disturbance" },
  { id: "CARPENTRY", label: "Carpentry" },
  { id: "CLEANLINESS", label: "Cleanliness" },
  { id: "OTHER", label: "Other" },
];

const STATUS_STEPS = ["SUBMITTED", "ASSIGNED", "IN_PROGRESS", "RESOLVED", "CLOSED"];

export function ComplaintsClient({
  initialComplaints,
  residentUnits,
  society,
}: ComplaintsClientProps) {
  const [complaints, setComplaints] = useState<any[]>(initialComplaints);
  const [selectedCategory, setSelectedCategory] = useState("ALL");
  const [selectedStatus, setSelectedStatus] = useState("ALL");
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<any | null>(null);

  // New Ticket Form State
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    category: "PLUMBING",
    priority: "MEDIUM",
    unit_id: residentUnits[0]?.id || "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const filteredComplaints = complaints.filter((c) => {
    const matchCat = selectedCategory === "ALL" || c.category === selectedCategory;
    const matchStat = selectedStatus === "ALL" || c.status === selectedStatus;
    return matchCat && matchStat;
  });

  const handleCreateComplaint = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setErrorMsg("");

    try {
      const res = await fetch("/api/resident/complaints", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to submit complaint.");
      }

      setComplaints([data.complaint, ...complaints]);
      setIsNewModalOpen(false);
      setFormData({
        title: "",
        description: "",
        category: "PLUMBING",
        priority: "MEDIUM",
        unit_id: residentUnits[0]?.id || "",
      });
    } catch (err: any) {
      setErrorMsg(err.message || "An unexpected error occurred.");
    } finally {
      setSubmitting(false);
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case "EMERGENCY":
        return "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border-rose-200";
      case "HIGH":
        return "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border-amber-200";
      case "MEDIUM":
        return "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 border-blue-200";
      default:
        return "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-200";
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "RESOLVED":
      case "CLOSED":
        return "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-200";
      case "IN_PROGRESS":
        return "bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300 border-indigo-200";
      case "ASSIGNED":
        return "bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300 border-purple-200";
      default:
        return "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border-amber-200";
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-900 dark:text-white">Helpdesk & Maintenance</h1>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300 font-semibold font-mono">
              {complaints.length} Tickets
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Raise maintenance tickets, service requests, and track real-time resolution by society staff.
          </p>
        </div>

        <button
          onClick={() => setIsNewModalOpen(true)}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs transition shadow-sm"
        >
          <Plus className="w-4 h-4" />
          <span>Raise Ticket</span>
        </button>
      </div>

      {/* Filters Bar */}
      <div className="flex flex-wrap items-center gap-2">
        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          className="text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {CATEGORIES.map((c) => (
            <option key={c.id} value={c.id}>
              {c.label}
            </option>
          ))}
        </select>

        <select
          value={selectedStatus}
          onChange={(e) => setSelectedStatus(e.target.value)}
          className="text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="ALL">All Statuses</option>
          <option value="SUBMITTED">Submitted</option>
          <option value="ASSIGNED">Assigned</option>
          <option value="IN_PROGRESS">In Progress</option>
          <option value="RESOLVED">Resolved</option>
          <option value="CLOSED">Closed</option>
        </select>
      </div>

      {/* Tickets List */}
      {filteredComplaints.length === 0 ? (
        <div className="p-12 text-center rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3">
          <div className="w-12 h-12 rounded-full bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">No Complaints Found</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            No service tickets match your selected filters. Click &quot;Raise Ticket&quot; if you need facility assistance.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredComplaints.map((c) => (
            <div
              key={c.id}
              onClick={() => setSelectedTicket(c)}
              className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-blue-300 dark:hover:border-blue-700 transition cursor-pointer shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4 group"
            >
              <div className="space-y-2 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full border ${getStatusBadge(
                      c.status
                    )}`}
                  >
                    {c.status.replace("_", " ")}
                  </span>
                  <span
                    className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border ${getPriorityBadge(
                      c.priority
                    )}`}
                  >
                    {c.priority} Priority
                  </span>
                  <span className="text-[10px] font-semibold text-slate-500 flex items-center gap-1">
                    <Tag className="w-3 h-3" />
                    {c.category}
                  </span>
                </div>

                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-blue-600 transition">
                    {c.title}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-1 mt-0.5">
                    {c.description}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-4 text-[11px] text-slate-400">
                  {c.unit && (
                    <span className="flex items-center gap-1 font-mono">
                      <Building className="w-3 h-3 text-slate-400" />
                      Flat {c.unit.unit_number} ({c.unit.building?.name || "Wing"})
                    </span>
                  )}
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {new Date(c.created_at).toLocaleDateString("en-IN", {
                      day: "numeric",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                  {c.assignee && (
                    <span className="flex items-center gap-1 text-purple-600 dark:text-purple-400 font-medium">
                      <User className="w-3 h-3" />
                      Assigned: {c.assignee.display_name || c.assignee.full_name}
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
                <span className="text-xs font-semibold text-blue-600 dark:text-blue-400 group-hover:underline">
                  View Timeline
                </span>
                <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-blue-600 transition" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Ticket Detail & Status Timeline Drawer/Modal */}
      {selectedTicket && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-xs">
                  <MessageSquare className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">Ticket Timeline</h3>
                  <span className="text-[10px] text-slate-400 font-mono">ID: {selectedTicket.id.slice(0, 8)}</span>
                </div>
              </div>
              <button
                onClick={() => setSelectedTicket(null)}
                className="w-7 h-7 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 hover:text-slate-900 text-xs"
              >
                ✕
              </button>
            </div>

            {/* Lifecycle Progression Stepper */}
            <div className="space-y-1.5">
              <span className="text-[10px] uppercase tracking-wider font-bold text-slate-400">
                Resolution Workflow
              </span>
              <div className="flex items-center justify-between relative py-2">
                <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-slate-200 dark:bg-slate-800 -translate-y-1/2 z-0" />
                {STATUS_STEPS.map((step, idx) => {
                  const currentIdx = STATUS_STEPS.indexOf(selectedTicket.status);
                  const isPassed = idx <= currentIdx;
                  const isCurrent = idx === currentIdx;

                  return (
                    <div key={step} className="flex flex-col items-center relative z-10">
                      <div
                        className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${
                          isPassed
                            ? "bg-blue-600 text-white shadow"
                            : "bg-slate-200 dark:bg-slate-800 text-slate-500"
                        } ${isCurrent ? "ring-4 ring-blue-100 dark:ring-blue-900" : ""}`}
                      >
                        {isPassed ? <Check className="w-3 h-3" /> : idx + 1}
                      </div>
                      <span
                        className={`text-[9px] font-semibold mt-1 ${
                          isCurrent ? "text-blue-600 dark:text-blue-400 font-bold" : "text-slate-400"
                        }`}
                      >
                        {step === "IN_PROGRESS" ? "In Progress" : step.charAt(0) + step.slice(1).toLowerCase()}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Ticket Details */}
            <div className="space-y-3 bg-slate-50 dark:bg-slate-800/40 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 text-xs">
              <div>
                <h4 className="font-bold text-slate-900 dark:text-white text-sm">{selectedTicket.title}</h4>
                <p className="text-slate-600 dark:text-slate-400 mt-1 whitespace-pre-wrap">
                  {selectedTicket.description}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-200/60 dark:border-slate-700/60 text-[11px]">
                <div>
                  <span className="text-slate-400">Category:</span>{" "}
                  <span className="font-semibold text-slate-700 dark:text-slate-300">{selectedTicket.category}</span>
                </div>
                <div>
                  <span className="text-slate-400">Priority:</span>{" "}
                  <span className="font-semibold text-slate-700 dark:text-slate-300">{selectedTicket.priority}</span>
                </div>
                <div>
                  <span className="text-slate-400">Created:</span>{" "}
                  <span className="font-medium text-slate-700 dark:text-slate-300">
                    {new Date(selectedTicket.created_at).toLocaleDateString()}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400">Assignee:</span>{" "}
                  <span className="font-medium text-purple-600 dark:text-purple-400">
                    {selectedTicket.assignee?.display_name || selectedTicket.assignee?.full_name || "Unassigned"}
                  </span>
                </div>
              </div>

              {selectedTicket.resolution_notes && (
                <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-900 text-emerald-900 dark:text-emerald-200">
                  <div className="font-bold text-[11px] mb-1">Staff Resolution Notes:</div>
                  <div className="text-[11px] whitespace-pre-wrap">{selectedTicket.resolution_notes}</div>
                </div>
              )}
            </div>

            <button
              onClick={() => setSelectedTicket(null)}
              className="w-full py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold hover:bg-slate-200 transition"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* New Ticket Modal */}
      {isNewModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-xs">
                  <Plus className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">Raise Maintenance Ticket</h3>
              </div>
              <button
                onClick={() => setIsNewModalOpen(false)}
                className="w-7 h-7 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 hover:text-slate-900 text-xs"
              >
                ✕
              </button>
            </div>

            {errorMsg && (
              <div className="p-3 rounded-xl bg-rose-50 text-rose-700 border border-rose-200 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleCreateComplaint} className="space-y-4 text-xs">
              {/* Target Unit Selector */}
              {residentUnits.length > 1 ? (
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Select Residence Unit
                  </label>
                  <select
                    value={formData.unit_id}
                    onChange={(e) => setFormData({ ...formData, unit_id: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2.5 text-slate-900 dark:text-white"
                  >
                    {residentUnits.map((u) => (
                      <option key={u.id} value={u.id}>
                        Flat {u.unit_number} — {u.building?.name || "Wing"}
                      </option>
                    ))}
                  </select>
                </div>
              ) : residentUnits[0] ? (
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px]">
                  <span className="text-slate-500">Unit:</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200 font-mono">
                    Flat {residentUnits[0].unit_number} ({residentUnits[0].building?.name})
                  </span>
                </div>
              ) : null}

              {/* Title */}
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Issue Summary / Subject *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Master bathroom tap leaking continuously"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2.5 text-slate-900 dark:text-white"
                />
              </div>

              {/* Category & Priority Grid */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Category *</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2.5 text-slate-900 dark:text-white"
                  >
                    {CATEGORIES.filter((c) => c.id !== "ALL").map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Priority</label>
                  <select
                    value={formData.priority}
                    onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2.5 text-slate-900 dark:text-white"
                  >
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                    <option value="EMERGENCY">Emergency (Immediate)</option>
                  </select>
                </div>
              </div>

              {/* Detailed Description */}
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Detailed Description *
                </label>
                <textarea
                  required
                  rows={4}
                  placeholder="Describe what is broken, when it started, and any access instructions for society staff..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2.5 text-slate-900 dark:text-white"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsNewModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-slate-500 hover:text-slate-800 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold transition flex items-center gap-2"
                >
                  {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Submit Ticket</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
