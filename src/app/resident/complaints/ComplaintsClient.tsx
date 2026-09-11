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
  RotateCcw,
  PauseCircle,
  History,
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

const STATUS_STEPS = ["SUBMITTED", "ACKNOWLEDGED", "ASSIGNED", "IN_PROGRESS", "RESOLVED", "CLOSED"];

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

  // Reopen Modal
  const [isReopenModalOpen, setIsReopenModalOpen] = useState(false);
  const [reopenReason, setReopenReason] = useState("");
  const [reopening, setReopening] = useState(false);

  // Closing State
  const [closing, setClosing] = useState(false);

  // Timeline State
  const [timelineEvents, setTimelineEvents] = useState<any[]>([]);
  const [loadingTimeline, setLoadingTimeline] = useState(false);

  // New Ticket Form State
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    category: "PLUMBING",
    subcategory: "",
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
        subcategory: "",
        priority: "MEDIUM",
        unit_id: residentUnits[0]?.id || "",
      });
    } catch (err: any) {
      setErrorMsg(err.message || "An unexpected error occurred.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenTicketDetails = async (ticket: any) => {
    setSelectedTicket(ticket);
    setLoadingTimeline(true);
    try {
      const res = await fetch(`/api/society/${society.id}/complaints/${ticket.id}/timeline`);
      const data = await res.json();
      if (res.ok) {
        setTimelineEvents(data.timeline || []);
      }
    } catch (err) {
      console.error("Error loading timeline:", err);
    } finally {
      setLoadingTimeline(false);
    }
  };

  const handleConfirmClose = async () => {
    if (!selectedTicket) return;
    setClosing(true);
    try {
      const res = await fetch(`/api/resident/complaints/${selectedTicket.id}/close`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ closure_reason: "Confirmed resolved by resident" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to close ticket.");

      setComplaints(complaints.map((c) => (c.id === data.complaint.id ? data.complaint : c)));
      setSelectedTicket(data.complaint);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setClosing(false);
    }
  };

  const handleReopenSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTicket || !reopenReason) return;
    setReopening(true);
    try {
      const res = await fetch(`/api/resident/complaints/${selectedTicket.id}/reopen`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: reopenReason }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to reopen ticket.");

      setComplaints(complaints.map((c) => (c.id === data.complaint.id ? data.complaint : c)));
      setSelectedTicket(data.complaint);
      setIsReopenModalOpen(false);
      setReopenReason("");
    } catch (err: any) {
      alert(err.message);
    } finally {
      setReopening(false);
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case "CRITICAL":
      case "EMERGENCY":
        return "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border-rose-200";
        return "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border-rose-200 font-bold";
      case "HIGH":
        return "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border-amber-200";
        return "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border-amber-200 font-bold";
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
      case "ON_HOLD":
        return "bg-amber-100 text-amber-800 border-amber-300";
      case "ASSIGNED":
      case "ACKNOWLEDGED":
        return "bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300 border-purple-200";
      case "REOPENED":
        return "bg-rose-100 text-rose-800 border-rose-200";
      default:
        return "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border-amber-200";
        return "bg-slate-100 text-slate-800 border-slate-200";
    }
  };

  const getSlaBadge = (slaStatus?: string) => {
    switch (slaStatus) {
      case "BREACHED":
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200">
            <Clock className="w-2.5 h-2.5" />
            SLA Delayed
          </span>
        );
      case "DUE_SOON":
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
            <Clock className="w-2.5 h-2.5" />
            Resolving Soon
          </span>
        );
      case "PAUSED":
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-sky-50 text-sky-700 border border-sky-200">
            <PauseCircle className="w-2.5 h-2.5" />
            On Hold
          </span>
        );
      case "COMPLETED":
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
            <Check className="w-2.5 h-2.5" />
            Completed
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-slate-50 text-slate-700 border border-slate-200">
            <Clock className="w-2.5 h-2.5" />
            On Track
          </span>
        );
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
            Raise maintenance tickets, track real-time SLA resolution, and communicate with society facility staff.
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
          <option value="ACKNOWLEDGED">Acknowledged</option>
          <option value="ASSIGNED">Assigned</option>
          <option value="IN_PROGRESS">In Progress</option>
          <option value="ON_HOLD">On Hold</option>
          <option value="RESOLVED">Resolved</option>
          <option value="CLOSED">Closed</option>
          <option value="REOPENED">Reopened</option>
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
              onClick={() => handleOpenTicketDetails(c)}
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
                    {c.priority}
                  </span>
                  <div>{getSlaBadge(c.sla_status)}</div>
                  <span className="text-[10px] font-semibold text-slate-500 flex items-center gap-1">
                    <Tag className="w-3 h-3" />
                    {c.category}
                    {c.subcategory && ` · ${c.subcategory}`}
                  </span>
                  {c.sla_cycle_number > 1 && (
                    <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-rose-50 text-rose-700 border border-rose-200">
                      Cycle #{c.sla_cycle_number}
                    </span>
                  )}
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
                  View Timeline & Status
                </span>
                <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-blue-600 transition" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Ticket Detail & Status Timeline Modal */}
      {selectedTicket && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 space-y-5 shadow-2xl max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 shrink-0">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-xs">
                  <MessageSquare className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">Ticket Details & Progress</h3>
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

            <div className="overflow-y-auto flex-1 space-y-4 pr-1">
              {/* Lifecycle Progression Stepper */}
              <div className="space-y-1.5">
                <span className="text-[10px] uppercase tracking-wider font-bold text-slate-400">
                  Lifecycle Progression
                </span>
                <div className="flex items-center justify-between relative py-2">
                  <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-slate-200 dark:bg-slate-800 -translate-y-1/2 z-0" />
                  {STATUS_STEPS.map((step, idx) => {
                    let currentIdx = STATUS_STEPS.indexOf(selectedTicket.status);
                    if (selectedTicket.status === "ON_HOLD") currentIdx = 3; // equivalent to in progress stage
                    if (selectedTicket.status === "REOPENED") currentIdx = 1;
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

              {/* On-Hold Notice if ticket is paused */}
              {selectedTicket.status === "ON_HOLD" && (
                <div className="p-3 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-start gap-2">
                  <PauseCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold block">SLA Clock Temporarily Paused</span>
                    <span className="text-[11px] text-amber-800">
                      Reason: {selectedTicket.on_hold_reason?.replace(/_/g, " ") || "Waiting for parts / vendor access"}.
                    </span>
                  </div>
                </div>
              )}

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
                  <span className="text-slate-400">SLA Status:</span>{" "}
                  <span>{getSlaBadge(selectedTicket.sla_status)}</span>
                </div>
                <div>
                  <span className="text-slate-400">Assignee:</span>{" "}
                  <span className="font-medium text-purple-600 dark:text-purple-400">
                    {selectedTicket.assignee?.display_name || selectedTicket.assignee?.full_name || "Unassigned"}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400">Created:</span>{" "}
                  <span className="font-medium text-slate-700 dark:text-slate-300">
                    {new Date(selectedTicket.created_at).toLocaleDateString()}
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
              {/* Historical Timeline Log */}
              <div className="space-y-2">
                <span className="text-[10px] uppercase tracking-wider font-bold text-slate-400 flex items-center gap-1.5">
                  <History className="w-3 h-3" />
                  <span>Activity History</span>
                </span>

                {loadingTimeline ? (
                  <div className="p-4 text-center text-slate-400 text-xs">Loading activity history...</div>
                ) : timelineEvents.length === 0 ? (
                  <div className="p-4 text-center text-slate-400 text-xs">No activity events recorded.</div>
                ) : (
                  <div className="space-y-1.5">
                    {timelineEvents.map((evt, idx) => (
                      <div key={evt.id || idx} className="p-2.5 rounded-xl bg-white border border-slate-200 text-xs flex items-start justify-between gap-2">
                        <div>
                          <span className="font-bold text-slate-700 uppercase text-[10px] block">{evt.event_type.replace("_", " ")}</span>
                          {evt.notes && <span className="text-slate-600 text-[11px] block mt-0.5">{evt.notes}</span>}
                        </div>
                        <span className="text-[9px] text-slate-400 font-mono shrink-0">
                          {new Date(evt.created_at).toLocaleDateString("en-IN", {
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Modal Actions */}
            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2 shrink-0">
              <div className="flex items-center gap-2">
                {selectedTicket.status === "RESOLVED" && (
                  <button
                    onClick={handleConfirmClose}
                    disabled={closing}
                    className="px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs transition flex items-center gap-1.5"
                  >
                    {closing && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    <span>Confirm & Close</span>
                  </button>
                )}

                {["RESOLVED", "CLOSED"].includes(selectedTicket.status) && (
                  <button
                    onClick={() => setIsReopenModalOpen(true)}
                    className="px-3 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-semibold text-xs transition flex items-center gap-1.5"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Reopen Ticket</span>
                  </button>
                )}
              </div>

              <button
                onClick={() => setSelectedTicket(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 font-semibold text-xs"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reopen Ticket Prompt Modal */}
      {isReopenModalOpen && selectedTicket && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md bg-white rounded-3xl border border-slate-200 p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900">Reopen Ticket</h3>
              <button
                onClick={() => setIsReopenModalOpen(false)}
                className="w-7 h-7 rounded-full bg-slate-100 text-slate-500 hover:text-slate-900 text-xs"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-600">
              Reopening will start a new SLA resolution cycle. Please state why the ticket is being reopened:
            </p>

            <form onSubmit={handleReopenSubmit} className="space-y-4 text-xs">
              <textarea
                required
                rows={3}
                placeholder="e.g. The leak has re-appeared after the technician left..."
                value={reopenReason}
                onChange={(e) => setReopenReason(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900"
              />

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsReopenModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-slate-500 hover:text-slate-800 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={reopening}
                  className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-semibold transition flex items-center gap-2"
                >
                  {reopening && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Submit & Reopen</span>
                </button>
              </div>
            </form>
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
                    <option value="CRITICAL">Critical</option>
                    <option value="EMERGENCY">Emergency (Immediate)</option>
                  </select>
                </div>
              </div>

              {/* Subcategory */}
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Subcategory / Location (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Master Bedroom, Kitchen Balcony, Main Door"
                  value={formData.subcategory}
                  onChange={(e) => setFormData({ ...formData, subcategory: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2.5 text-slate-900 dark:text-white"
                />
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
