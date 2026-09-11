"use client";

import React, { useState } from "react";
import {
  MessageSquare,
  Filter,
  CheckCircle2,
  Clock,
  UserCheck,
  AlertTriangle,
  Building,
  User,
  ShieldAlert,
  Loader2,
  Check,
  ExternalLink,
  History,
  PauseCircle,
  PlayCircle,
  Zap,
  RotateCcw,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface StaffMember {
  id: string;
  full_name: string;
  display_name: string;
  email: string;
  role_id: string;
}

interface ComplaintsAdminClientProps {
  initialComplaints: any[];
  staffMembers: StaffMember[];
  societyId: string;
  currentUserId: string;
}

export function ComplaintsAdminClient({
  initialComplaints,
  staffMembers,
  societyId,
}: ComplaintsAdminClientProps) {
  const [complaints, setComplaints] = useState<any[]>(initialComplaints);
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [priorityFilter, setPriorityFilter] = useState("ALL");
  const [categoryFilter, setCategoryFilter] = useState("ALL");
  const [slaStatusFilter, setSlaStatusFilter] = useState("ALL");

  // Assignment Modal
  const [assigningTicket, setAssigningTicket] = useState<any | null>(null);
  const [selectedStaffId, setSelectedStaffId] = useState("");
  const [assigning, setAssigning] = useState(false);

  // Status & Resolution Modal
  const [resolvingTicket, setResolvingTicket] = useState<any | null>(null);
  const [newStatus, setNewStatus] = useState("RESOLVED");
  const [resolutionNotes, setResolutionNotes] = useState("");
  const [onHoldReason, setOnHoldReason] = useState("WAITING_FOR_PARTS");
  const [closureReason, setClosureReason] = useState("");
  const [updating, setUpdating] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // Timeline Modal
  const [timelineTicket, setTimelineTicket] = useState<any | null>(null);
  const [timelineEvents, setTimelineEvents] = useState<any[]>([]);
  const [loadingTimeline, setLoadingTimeline] = useState(false);

  // Escalation Trigger State
  const [escalating, setEscalating] = useState(false);
  const [escalateMessage, setEscalateMessage] = useState<string | null>(null);

  const filteredComplaints = complaints.filter((c) => {
    const matchStatus = statusFilter === "ALL" || c.status === statusFilter;
    const matchPriority = priorityFilter === "ALL" || c.priority === priorityFilter;
    const matchCategory = categoryFilter === "ALL" || c.category === categoryFilter;
    const matchSla = slaStatusFilter === "ALL" || c.sla_status === slaStatusFilter;
    return matchStatus && matchPriority && matchCategory && matchSla;
  });

  const totalCount = complaints.length;
  const emergencyCount = complaints.filter((c) => c.priority === "EMERGENCY" && c.status !== "RESOLVED" && c.status !== "CLOSED").length;
  const openCount = complaints.filter(
    (c) => !["RESOLVED", "CLOSED"].includes(c.status)
  ).length;
  const dueSoonCount = complaints.filter(
    (c) => c.sla_status === "DUE_SOON" && !["RESOLVED", "CLOSED"].includes(c.status)
  ).length;
  const breachedCount = complaints.filter(
    (c) => c.sla_status === "BREACHED" && !["RESOLVED", "CLOSED"].includes(c.status)
  ).length;
  const resolvedCount = complaints.filter(
    (c) => ["RESOLVED", "CLOSED"].includes(c.status)
  ).length;

  const handleAssignStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assigningTicket || !selectedStaffId) return;
    setAssigning(true);
    setErrorMsg("");

    try {
      const res = await fetch(`/api/society/${societyId}/complaints`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: assigningTicket.id,
          assigned_to: selectedStaffId,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to assign staff.");

      setComplaints(complaints.map((c) => (c.id === data.complaint.id ? data.complaint : c)));
      setAssigningTicket(null);
      setSelectedStaffId("");
    } catch (err: any) {
      setErrorMsg(err.message || "Error assigning staff.");
    } finally {
      setAssigning(false);
    }
  };

  const handleUpdateStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resolvingTicket) return;
    setUpdating(true);
    setErrorMsg("");

    try {
      const payload: any = {
        id: resolvingTicket.id,
        status: newStatus,
      };

      if (newStatus === "RESOLVED") {
        payload.resolution_notes = resolutionNotes;
      } else if (newStatus === "ON_HOLD") {
        payload.on_hold_reason = onHoldReason;
      } else if (newStatus === "CLOSED") {
        payload.closure_reason = closureReason;
      }

      const res = await fetch(`/api/society/${societyId}/complaints`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update status.");

      setComplaints(complaints.map((c) => (c.id === data.complaint.id ? data.complaint : c)));
      setResolvingTicket(null);
      setResolutionNotes("");
      setClosureReason("");
    } catch (err: any) {
      setErrorMsg(err.message || "Error updating status.");
    } finally {
      setUpdating(false);
    }
  };

  const handleViewTimeline = async (complaint: any) => {
    setTimelineTicket(complaint);
    setLoadingTimeline(true);
    try {
      const res = await fetch(`/api/society/${societyId}/complaints/${complaint.id}/timeline`);
      const data = await res.json();
      if (res.ok) {
        setTimelineEvents(data.timeline || []);
      }
    } catch (err) {
      console.error("Failed to load timeline:", err);
    } finally {
      setLoadingTimeline(false);
    }
  };

  const handleTriggerEscalation = async () => {
    setEscalating(true);
    setEscalateMessage(null);
    try {
      const res = await fetch(`/api/society/${societyId}/complaints/escalate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (res.ok) {
        setEscalateMessage(data.message || "Escalation evaluation completed.");
        // Refresh complaints list
        const refreshedRes = await fetch(`/api/society/${societyId}/complaints`);
        const refreshedData = await refreshedRes.json();
        if (refreshedRes.ok && refreshedData.complaints) {
          setComplaints(refreshedData.complaints);
        }
      } else {
        setEscalateMessage(`Error: ${data.error}`);
      }
    } catch (err: any) {
      setEscalateMessage(`Failed: ${err.message}`);
    } finally {
      setEscalating(false);
    }
  };

  const getPriorityBadgeClass = (priority: string) => {
    switch (priority) {
      case "CRITICAL":
      case "EMERGENCY":
        return "bg-rose-100 text-rose-800 border-rose-200 font-black animate-pulse";
      case "HIGH":
        return "bg-amber-100 text-amber-800 border-amber-200 font-bold";
      case "MEDIUM":
        return "bg-blue-50 text-blue-700 border-blue-200 font-semibold";
      default:
        return "bg-slate-100 text-slate-700 border-slate-200";
    }
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case "RESOLVED":
      case "CLOSED":
        return "bg-emerald-100 text-emerald-800 border-emerald-200";
      case "IN_PROGRESS":
        return "bg-indigo-100 text-indigo-800 border-indigo-200";
      case "ON_HOLD":
        return "bg-amber-100 text-amber-800 border-amber-300 font-medium";
      case "ASSIGNED":
      case "ACKNOWLEDGED":
        return "bg-purple-100 text-purple-800 border-purple-200";
      case "REOPENED":
        return "bg-rose-100 text-rose-800 border-rose-200 font-bold";
      default:
        return "bg-amber-100 text-amber-800 border-amber-200";
        return "bg-slate-100 text-slate-800 border-slate-200";
    }
  };

  const getSlaBadge = (slaStatus?: string) => {
    switch (slaStatus) {
      case "BREACHED":
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200">
            <AlertTriangle className="w-2.5 h-2.5" />
            Breached
          </span>
        );
      case "DUE_SOON":
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
            <Clock className="w-2.5 h-2.5" />
            Due Soon (&lt; 2h)
          </span>
        );
      case "PAUSED":
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-sky-50 text-sky-700 border border-sky-200">
            <PauseCircle className="w-2.5 h-2.5" />
            Paused (On Hold)
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
      {/* Title & Top Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">
            Helpdesk, SLA & Ticket Dispatch
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage complaint lifecycle, monitor real-time SLA deadlines, and run tiered escalations.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleTriggerEscalation}
            disabled={escalating}
            className="px-3 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-semibold transition flex items-center gap-1.5 shadow-sm"
          >
            {escalating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5 text-rose-600" />}
            <span>Evaluate & Escalate</span>
          </button>
        </div>
      </div>

      {escalateMessage && (
        <div className="p-3 rounded-xl bg-blue-50 border border-blue-200 text-xs text-blue-800 flex items-center justify-between">
          <span>{escalateMessage}</span>
          <button onClick={() => setEscalateMessage(null)} className="font-bold text-blue-900 text-xs">✕</button>
        </div>
      )}

      {/* Metrics Row */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-1">
          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Tickets</div>
          <div className="text-2xl font-black text-slate-900">{totalCount}</div>
        </div>
        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-1">
          <div className="text-[11px] font-bold text-blue-600 uppercase tracking-wider">Active Open</div>
          <div className="text-2xl font-black text-blue-600">{openCount}</div>
        </div>
        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-1">
          <div className="text-[11px] font-bold text-amber-600 uppercase tracking-wider">SLA Due Soon</div>
          <div className="text-2xl font-black text-amber-600">{dueSoonCount}</div>
        </div>
        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-1">
          <div className="text-[11px] font-bold text-rose-600 uppercase tracking-wider">SLA Breached</div>
          <div className="text-2xl font-black text-rose-600">{breachedCount}</div>
        </div>
        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-1 col-span-2 md:col-span-1">
          <div className="text-[11px] font-bold text-emerald-600 uppercase tracking-wider">Resolved / Closed</div>
          <div className="text-2xl font-black text-emerald-600">{resolvedCount}</div>
        </div>
      </div>

      {/* Filter Row */}
      <div className="flex flex-wrap items-center gap-2">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="text-xs bg-white border border-slate-200 rounded-xl px-3 py-2 text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
        >
          <option value="ALL">All Statuses</option>
          <option value="SUBMITTED">Submitted / New</option>
          <option value="ACKNOWLEDGED">Acknowledged</option>
          <option value="ASSIGNED">Assigned</option>
          <option value="IN_PROGRESS">In Progress</option>
          <option value="ON_HOLD">On Hold</option>
          <option value="RESOLVED">Resolved</option>
          <option value="CLOSED">Closed</option>
          <option value="REOPENED">Reopened</option>
        </select>

        <select
          value={slaStatusFilter}
          onChange={(e) => setSlaStatusFilter(e.target.value)}
          className="text-xs bg-white border border-slate-200 rounded-xl px-3 py-2 text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
        >
          <option value="ALL">All SLA States</option>
          <option value="ON_TRACK">On Track</option>
          <option value="DUE_SOON">Due Soon (&lt; 2h)</option>
          <option value="BREACHED">Breached</option>
          <option value="PAUSED">Paused (On Hold)</option>
          <option value="COMPLETED">Completed</option>
        </select>

        <select
          value={priorityFilter}
          onChange={(e) => setPriorityFilter(e.target.value)}
          className="text-xs bg-white border border-slate-200 rounded-xl px-3 py-2 text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
        >
          <option value="ALL">All Priorities</option>
          <option value="CRITICAL">Critical</option>
          <option value="EMERGENCY">Emergency</option>
          <option value="HIGH">High</option>
          <option value="MEDIUM">Medium</option>
          <option value="LOW">Low</option>
        </select>

        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="text-xs bg-white border border-slate-200 rounded-xl px-3 py-2 text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
        >
          <option value="ALL">All Categories</option>
          <option value="ELECTRICAL">Electrical</option>
          <option value="PLUMBING">Plumbing</option>
          <option value="ELEVATOR">Elevator</option>
          <option value="COMMON_AREA">Common Area</option>
          <option value="SECURITY">Security</option>
          <option value="NOISE">Noise</option>
          <option value="CARPENTRY">Carpentry</option>
          <option value="CLEANLINESS">Cleanliness</option>
          <option value="OTHER">Other</option>
        </select>
      </div>

      {/* Complaints Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {filteredComplaints.length === 0 ? (
          <div className="p-12 text-center text-xs text-slate-500">
            No complaints found matching selected filters.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 text-[11px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Ticket</th>
                  <th className="py-3 px-4">Residence</th>
                  <th className="py-3 px-4">Category / Priority</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">SLA Target</th>
                  <th className="py-3 px-4">Assigned Staff</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredComplaints.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50/70 transition">
                    <td className="py-3.5 px-4 max-w-xs">
                      <div className="font-bold text-slate-900 line-clamp-1">{c.title}</div>
                      <div className="flex items-center gap-1.5 font-bold text-slate-900 line-clamp-1">
                        <span>{c.title}</span>
                        {c.sla_cycle_number > 1 && (
                          <span className="text-[9px] px-1.5 py-0.5 rounded bg-rose-50 text-rose-700 border border-rose-200 font-mono">
                            Cycle #{c.sla_cycle_number}
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-400 line-clamp-1 mt-0.5">{c.description}</div>
                      <div className="text-[10px] text-slate-400 mt-1 flex items-center gap-1 font-mono">
                        <Clock className="w-3 h-3" />
                        {new Date(c.created_at).toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      {c.unit ? (
                        <div>
                          <div className="font-bold text-slate-800 font-mono">
                            Flat {c.unit.unit_number}
                          </div>
                          <div className="text-[10px] text-slate-400">
                            {c.unit.building?.name || "Wing"}
                          </div>
                        </div>
                      ) : (
                        <span className="text-slate-400 italic">Common Area</span>
                      )}
                      <div className="text-[10px] text-slate-500 mt-0.5">
                        {c.creator?.display_name || c.creator?.full_name}
                      </div>
                    </td>

                    <td className="py-3.5 px-4 space-y-1">
                      <div>
                        <span className="font-semibold text-slate-700">{c.category}</span>
                        {c.subcategory && (
                          <span className="text-[10px] text-slate-400 block">{c.subcategory}</span>
                        )}
                      </div>
                      <div>
                        <span
                          className={`text-[9px] uppercase px-2 py-0.5 rounded-full border ${getPriorityBadgeClass(
                            c.priority
                          )}`}
                        >
                          {c.priority}
                        </span>
                      </div>
                    </td>

                    <td className="py-3.5 px-4 space-y-1">
                      <div>
                        <span
                          className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full border ${getStatusBadgeClass(
                            c.status
                          )}`}
                        >
                          {c.status.replace("_", " ")}
                        </span>
                      </div>
                      {c.escalation_level > 0 && (
                        <div>
                          <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200">
                            Escalated L{c.escalation_level}
                          </span>
                        </div>
                      )}
                    </td>

                    <td className="py-3.5 px-4 space-y-1">
                      <div>{getSlaBadge(c.sla_status)}</div>
                      {c.resolution_due_at && (
                        <div className="text-[10px] text-slate-500 font-mono">
                          Due: {new Date(c.resolution_due_at).toLocaleDateString("en-IN", {
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </div>
                      )}
                    </td>

                    <td className="py-3.5 px-4">
                      {c.assignee ? (
                        <div className="flex items-center gap-1.5 font-medium text-purple-700">
                          <User className="w-3.5 h-3.5 shrink-0" />
                          <span className="truncate max-w-[120px]">
                            {c.assignee.display_name || c.assignee.full_name}
                          </span>
                        </div>
                      ) : (
                        <span className="text-slate-400 italic text-[11px]">Unassigned</span>
                      )}
                    </td>

                    <td className="py-3.5 px-4 text-right space-x-1.5 whitespace-nowrap">
                      <button
                        onClick={() => handleViewTimeline(c)}
                        title="View Timeline & SLA History"
                        className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-600 transition inline-flex items-center"
                      >
                        <History className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => {
                          setAssigningTicket(c);
                          setSelectedStaffId(c.assigned_to || "");
                        }}
                        className="px-2.5 py-1 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-700 font-medium transition"
                      >
                        Assign
                      </button>
                      <button
                        onClick={() => {
                          setResolvingTicket(c);
                          setNewStatus(c.status === "RESOLVED" ? "CLOSED" : "RESOLVED");
                          setNewStatus(c.status === "RESOLVED" ? "CLOSED" : "IN_PROGRESS");
                          setResolutionNotes(c.resolution_notes || "");
                          setOnHoldReason(c.on_hold_reason || "WAITING_FOR_PARTS");
                          setClosureReason(c.closure_reason || "");
                        }}
                        className="px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 font-medium transition"
                      >
                        Update Status
                        Status
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Assign Staff Modal */}
      {assigningTicket && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md bg-white rounded-3xl border border-slate-200 p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900">Assign Staff to Ticket</h3>
              <button
                onClick={() => setAssigningTicket(null)}
                className="w-7 h-7 rounded-full bg-slate-100 text-slate-500 hover:text-slate-900 text-xs"
              >
                ✕
              </button>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 text-xs">
              <span className="text-slate-400 font-bold block mb-0.5">Ticket:</span>
              <span className="font-bold text-slate-800">{assigningTicket.title}</span>
            </div>

            <form onSubmit={handleAssignStaff} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Select Facility Staff *</label>
                <select
                  required
                  value={selectedStaffId}
                  onChange={(e) => setSelectedStaffId(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-slate-900"
                >
                  <option value="">-- Choose Team Member --</option>
                  {staffMembers.map((sm) => (
                    <option key={sm.id} value={sm.id}>
                      {sm.display_name || sm.full_name} ({sm.role_id})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setAssigningTicket(null)}
                  className="px-4 py-2 rounded-xl text-slate-500 hover:text-slate-800 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={assigning}
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold transition flex items-center gap-2"
                >
                  {assigning && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Save Assignment</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Update Status & Resolution Modal */}
      {resolvingTicket && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md bg-white rounded-3xl border border-slate-200 p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900">Update Ticket Status</h3>
              <h3 className="text-sm font-bold text-slate-900">Update Ticket Lifecycle</h3>
              <button
                onClick={() => setResolvingTicket(null)}
                className="w-7 h-7 rounded-full bg-slate-100 text-slate-500 hover:text-slate-900 text-xs"
              >
                ✕
              </button>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 text-xs">
              <span className="text-slate-400 font-bold block mb-0.5">Ticket:</span>
              <span className="font-bold text-slate-800">{resolvingTicket.title}</span>
            </div>

            <form onSubmit={handleUpdateStatus} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Lifecycle Status *</label>
                <label className="block font-bold text-slate-700 mb-1">Target Status *</label>
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-slate-900"
                >
                  <option value="SUBMITTED">Submitted</option>
                  <option value="ACKNOWLEDGED">Acknowledged</option>
                  <option value="ASSIGNED">Assigned</option>
                  <option value="IN_PROGRESS">In Progress</option>
                  <option value="RESOLVED">Resolved</option>
                  <option value="CLOSED">Closed</option>
                  <option value="IN_PROGRESS">In Progress (Active Work)</option>
                  <option value="ON_HOLD">On Hold (Pause SLA)</option>
                  <option value="RESOLVED">Resolved (Ready for resident sign-off)</option>
                  <option value="CLOSED">Closed (Completed)</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Resolution Notes & Findings
                </label>
                <textarea
                  rows={3}
                  placeholder="Record work done, parts replaced, or resident feedback..."
                  value={resolutionNotes}
                  onChange={(e) => setResolutionNotes(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-slate-900"
                />
              </div>
              {newStatus === "ON_HOLD" && (
                <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 space-y-2">
                  <label className="block font-bold text-amber-900">
                    On-Hold Reason (SLA will be paused) *
                  </label>
                  <select
                    value={onHoldReason}
                    onChange={(e) => setOnHoldReason(e.target.value)}
                    className="w-full bg-white border border-amber-300 rounded-xl px-3 py-2 text-slate-900"
                  >
                    <option value="WAITING_FOR_PARTS">Waiting for Parts / Materials</option>
                    <option value="WAITING_FOR_RESIDENT_INPUT">Waiting for Resident Input / Access</option>
                    <option value="THIRD_PARTY_VENDOR">Pending External Vendor / Municipal Utility</option>
                    <option value="RESIDENT_UNAVAILABLE">Resident Requested Reschedule</option>
                    <option value="OTHER">Other Justified Cause</option>
                  </select>
                </div>
              )}

              {newStatus === "RESOLVED" && (
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Resolution Notes & Findings *
                  </label>
                  <textarea
                    required
                    rows={3}
                    placeholder="Record work done, root cause, parts replaced, technician sign-off..."
                    value={resolutionNotes}
                    onChange={(e) => setResolutionNotes(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-slate-900"
                  />
                </div>
              )}

              {newStatus === "CLOSED" && (
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Closure Reason</label>
                  <input
                    type="text"
                    placeholder="e.g. Work confirmed satisfactory"
                    value={closureReason}
                    onChange={(e) => setClosureReason(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-slate-900"
                  />
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setResolvingTicket(null)}
                  className="px-4 py-2 rounded-xl text-slate-500 hover:text-slate-800 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updating}
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold transition flex items-center gap-2"
                >
                  {updating && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Save Status</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Ticket Timeline Modal */}
      {timelineTicket && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-lg bg-white rounded-3xl border border-slate-200 p-6 space-y-4 shadow-2xl max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 shrink-0">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <History className="w-4 h-4 text-blue-600" />
                  <span>Ticket Timeline & SLA History</span>
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5">#{timelineTicket.id.substring(0, 8)} — {timelineTicket.title}</p>
              </div>
              <button
                onClick={() => setTimelineTicket(null)}
                className="w-7 h-7 rounded-full bg-slate-100 text-slate-500 hover:text-slate-900 text-xs"
              >
                ✕
              </button>
            </div>

            <div className="overflow-y-auto flex-1 pr-1 space-y-3 text-xs">
              {loadingTimeline ? (
                <div className="p-8 text-center text-slate-400 flex items-center justify-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Loading timeline...</span>
                </div>
              ) : timelineEvents.length === 0 ? (
                <div className="p-8 text-center text-slate-400">No timeline events recorded yet.</div>
              ) : (
                timelineEvents.map((evt, idx) => (
                  <div key={evt.id || idx} className="p-3 rounded-xl bg-slate-50 border border-slate-100 space-y-1">
                    <div className="flex items-center justify-between font-mono text-[10px] text-slate-400">
                      <span className="font-bold text-slate-700 uppercase">{evt.event_type.replace("_", " ")}</span>
                      <span>
                        {new Date(evt.created_at).toLocaleDateString("en-IN", {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                    {evt.notes && <p className="text-slate-800 text-[11px]">{evt.notes}</p>}
                    {evt.actor && (
                      <div className="text-[10px] text-slate-500">By: {evt.actor.display_name || evt.actor.full_name}</div>
                    )}
                  </div>
                ))
              )}
            </div>

            <div className="pt-3 border-t border-slate-100 shrink-0 text-right">
              <button
                onClick={() => setTimelineTicket(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 font-semibold text-xs"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
