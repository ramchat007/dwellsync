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

  // Assignment Modal
  const [assigningTicket, setAssigningTicket] = useState<any | null>(null);
  const [selectedStaffId, setSelectedStaffId] = useState("");
  const [assigning, setAssigning] = useState(false);

  // Status & Resolution Modal
  const [resolvingTicket, setResolvingTicket] = useState<any | null>(null);
  const [newStatus, setNewStatus] = useState("RESOLVED");
  const [resolutionNotes, setResolutionNotes] = useState("");
  const [updating, setUpdating] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const filteredComplaints = complaints.filter((c) => {
    const matchStatus = statusFilter === "ALL" || c.status === statusFilter;
    const matchPriority = priorityFilter === "ALL" || c.priority === priorityFilter;
    const matchCategory = categoryFilter === "ALL" || c.category === categoryFilter;
    return matchStatus && matchPriority && matchCategory;
  });

  const totalCount = complaints.length;
  const openCount = complaints.filter((c) => c.status === "SUBMITTED" || c.status === "ASSIGNED" || c.status === "IN_PROGRESS").length;
  const resolvedCount = complaints.filter((c) => c.status === "RESOLVED" || c.status === "CLOSED").length;
  const emergencyCount = complaints.filter((c) => c.priority === "EMERGENCY" && c.status !== "RESOLVED" && c.status !== "CLOSED").length;

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
      const res = await fetch(`/api/society/${societyId}/complaints`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: resolvingTicket.id,
          status: newStatus,
          resolution_notes: resolutionNotes,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update status.");

      setComplaints(complaints.map((c) => (c.id === data.complaint.id ? data.complaint : c)));
      setResolvingTicket(null);
      setResolutionNotes("");
    } catch (err: any) {
      setErrorMsg(err.message || "Error updating status.");
    } finally {
      setUpdating(false);
    }
  };

  const getPriorityBadgeClass = (priority: string) => {
    switch (priority) {
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
      case "ASSIGNED":
        return "bg-purple-100 text-purple-800 border-purple-200";
      default:
        return "bg-amber-100 text-amber-800 border-amber-200";
    }
  };

  return (
    <div className="space-y-6">
      {/* Title */}
      <div>
        <h1 className="text-xl font-bold text-slate-900 tracking-tight">Helpdesk & Ticket Dispatch</h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Dispatch maintenance tasks, track service-level agreements, and assign facility staff.
        </p>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-1">
          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Tickets</div>
          <div className="text-2xl font-black text-slate-900">{totalCount}</div>
        </div>
        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-1">
          <div className="text-[11px] font-bold text-amber-600 uppercase tracking-wider">Active / Open</div>
          <div className="text-2xl font-black text-amber-600">{openCount}</div>
        </div>
        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-1">
          <div className="text-[11px] font-bold text-emerald-600 uppercase tracking-wider">Resolved</div>
          <div className="text-2xl font-black text-emerald-600">{resolvedCount}</div>
        </div>
        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-1">
          <div className="text-[11px] font-bold text-rose-600 uppercase tracking-wider">Emergency SLA</div>
          <div className="text-2xl font-black text-rose-600">{emergencyCount}</div>
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
          <option value="SUBMITTED">Submitted</option>
          <option value="ASSIGNED">Assigned</option>
          <option value="IN_PROGRESS">In Progress</option>
          <option value="RESOLVED">Resolved</option>
          <option value="CLOSED">Closed</option>
        </select>

        <select
          value={priorityFilter}
          onChange={(e) => setPriorityFilter(e.target.value)}
          className="text-xs bg-white border border-slate-200 rounded-xl px-3 py-2 text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
        >
          <option value="ALL">All Priorities</option>
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
                  <th className="py-3 px-4">Assigned Staff</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredComplaints.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50/70 transition">
                    <td className="py-3.5 px-4 max-w-xs">
                      <div className="font-bold text-slate-900 line-clamp-1">{c.title}</div>
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

                    <td className="py-3.5 px-4">
                      <span
                        className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full border ${getStatusBadgeClass(
                          c.status
                        )}`}
                      >
                        {c.status.replace("_", " ")}
                      </span>
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
                          setResolutionNotes(c.resolution_notes || "");
                        }}
                        className="px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 font-medium transition"
                      >
                        Update Status
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
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-slate-900"
                >
                  <option value="SUBMITTED">Submitted</option>
                  <option value="ASSIGNED">Assigned</option>
                  <option value="IN_PROGRESS">In Progress</option>
                  <option value="RESOLVED">Resolved</option>
                  <option value="CLOSED">Closed</option>
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
    </div>
  );
}
