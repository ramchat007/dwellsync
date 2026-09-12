"use client";

import React, { useState } from "react";
import {
  ManagementCompany,
  ManagementCompanyStaffAssignment,
  ManagementCompanySociety,
  ManagementCompanyMember,
  CompanyRole,
  CompanyStaffAssignmentType,
} from "@/lib/types/company";
import {
  Users2,
  Plus,
  Building2,
  Calendar,
  Search,
  CheckCircle2,
  XCircle,
  Clock,
  Shield,
  Loader2,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";

export function CompanyStaffClient({
  company,
  assignments: initialAssignments,
  societies,
  members,
  role,
}: {
  company: ManagementCompany;
  assignments: ManagementCompanyStaffAssignment[];
  societies: ManagementCompanySociety[];
  members: ManagementCompanyMember[];
  role: CompanyRole | "SUPER_ADMIN";
}) {
  const [assignments, setAssignments] = useState<ManagementCompanyStaffAssignment[]>(initialAssignments);
  const [selectedSocietyFilter, setSelectedSocietyFilter] = useState<string>("ALL");
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [targetUserId, setTargetUserId] = useState("");
  const [targetSocietyId, setTargetSocietyId] = useState("");
  const [assignmentType, setAssignmentType] = useState<CompanyStaffAssignmentType>("OPERATIONS");
  const [startDate, setStartDate] = useState(new Date().toISOString().split("T")[0]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const canManageStaff = role === "COMPANY_ADMIN" || role === "COMPANY_MANAGER" || role === "SUPER_ADMIN";

  const filteredAssignments = assignments.filter((a) => {
    if (selectedSocietyFilter !== "ALL" && a.society_id !== selectedSocietyFilter) {
      return false;
    }
    return true;
  });

  const handleCreateAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetUserId || !targetSocietyId) return;

    try {
      setIsSubmitting(true);
      setErrorMsg("");
      const res = await fetch(`/api/company/${company.id}/staff`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: targetUserId,
          society_id: targetSocietyId,
          assignment_type: assignmentType,
          start_date: startDate,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create staff assignment");

      setAssignments([data.assignment, ...assignments]);
      setIsAssignModalOpen(false);
      setTargetUserId("");
      setTargetSocietyId("");
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleTerminateAssignment = async (assignmentId: string) => {
    if (!confirm("Are you sure you want to terminate this operational assignment?")) return;
    try {
      const res = await fetch(`/api/company/${company.id}/staff/${assignmentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "TERMINATED",
          end_date: new Date().toISOString().split("T")[0],
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update staff assignment");

      setAssignments(assignments.map((a) => (a.id === assignmentId ? data.assignment : a)));
    } catch (err: any) {
      alert(err.message);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Users2 className="w-6 h-6 text-indigo-600" />
            Operational Staff Assignments
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Allocate property managers, supervisors, and operations staff across managed societies.
          </p>
        </div>

        {canManageStaff && (
          <Button
            size="sm"
            onClick={() => setIsAssignModalOpen(true)}
            className="bg-indigo-600 hover:bg-indigo-700 text-xs"
          >
            <Plus className="w-4 h-4 mr-1.5" />
            Assign Staff Member
          </Button>
        )}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3">
        <select
          value={selectedSocietyFilter}
          onChange={(e) => setSelectedSocietyFilter(e.target.value)}
          className="text-xs border rounded-md px-2.5 py-1.5 bg-white border-slate-300 max-w-xs"
        >
          <option value="ALL">All Managed Societies</option>
          {societies.map((s) => (
            <option key={s.society_id} value={s.society_id}>
              {s.society?.name} ({s.society?.code})
            </option>
          ))}
        </select>
        <span className="text-xs text-slate-500">
          Showing: <span className="font-bold text-slate-800">{filteredAssignments.length}</span> assignments
        </span>
      </div>

      {/* Assignments Table/List */}
      <Card className="p-0 bg-white border-slate-200 overflow-hidden shadow-sm">
        {filteredAssignments.length === 0 ? (
          <div className="text-center py-12 px-4">
            <Users2 className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <p className="text-xs font-semibold text-slate-700">No operational staff assignments found</p>
            <p className="text-[11px] text-slate-400 mt-1">
              Use &apos;Assign Staff Member&apos; to deploy managers or operational personnel to a society.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filteredAssignments.map((a) => {
              const isActive = a.status === "ACTIVE";
              return (
                <div
                  key={a.id}
                  className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50/50 transition-colors"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center font-bold text-indigo-600 text-xs shrink-0 mt-0.5">
                      <Users2 className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-bold text-slate-900">
                          {a.profile?.full_name || a.user_id}
                        </span>
                        <Badge variant="outline" className="text-[10px] bg-slate-100 border-slate-300">
                          {a.assignment_type.replace("_", " ")}
                        </Badge>
                        <Badge
                          variant="outline"
                          className={`text-[9px] ${
                            isActive
                              ? "text-emerald-700 bg-emerald-50 border-emerald-200"
                              : "text-slate-500 bg-slate-100 border-slate-200"
                          }`}
                        >
                          {a.status}
                        </Badge>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Society: <span className="font-semibold text-slate-800">{a.society?.name || a.society_id}</span> •
                        Started: {a.start_date} {a.end_date ? `• Ended: ${a.end_date}` : ""}
                      </p>
                    </div>
                  </div>

                  {canManageStaff && isActive && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleTerminateAssignment(a.id)}
                      className="text-xs text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      Terminate Assignment
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {/* Assign Staff Modal */}
      <Dialog open={isAssignModalOpen} onOpenChange={setIsAssignModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold flex items-center gap-2">
              <Users2 className="w-4 h-4 text-indigo-600" />
              Assign Operational Staff to Society
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleCreateAssignment} className="space-y-4 pt-2">
            <div>
              <label className="text-xs font-semibold text-slate-700">Company Member</label>
              <select
                value={targetUserId}
                onChange={(e) => setTargetUserId(e.target.value)}
                required
                className="w-full mt-1 text-xs border rounded-md px-2.5 py-1.5 bg-white border-slate-300"
              >
                <option value="">Select Company Member...</option>
                {members
                  .filter((m) => m.status === "ACTIVE")
                  .map((m) => (
                    <option key={m.user_id} value={m.user_id}>
                      {m.profile?.full_name || m.user_id} ({m.role})
                    </option>
                  ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700">Target Society</label>
              <select
                value={targetSocietyId}
                onChange={(e) => setTargetSocietyId(e.target.value)}
                required
                className="w-full mt-1 text-xs border rounded-md px-2.5 py-1.5 bg-white border-slate-300"
              >
                <option value="">Select Managed Society...</option>
                {societies
                  .filter((s) => s.status === "ACTIVE")
                  .map((s) => (
                    <option key={s.society_id} value={s.society_id}>
                      {s.society?.name} ({s.society?.code})
                    </option>
                  ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-slate-700">Assignment Type</label>
                <select
                  value={assignmentType}
                  onChange={(e) => setAssignmentType(e.target.value as CompanyStaffAssignmentType)}
                  className="w-full mt-1 text-xs border rounded-md px-2.5 py-1.5 bg-white border-slate-300"
                >
                  <option value="PROPERTY_MANAGER">Property Manager</option>
                  <option value="OPERATIONS">Operations</option>
                  <option value="FACILITY_STAFF">Facility Staff</option>
                  <option value="ACCOUNTANT">Accountant</option>
                  <option value="SUPERVISOR">Supervisor</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700">Start Date</label>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  required
                  className="mt-1 text-xs h-8"
                />
              </div>
            </div>

            {errorMsg && (
              <div className="p-2.5 rounded bg-red-50 text-red-700 text-xs flex items-center gap-2">
                <XCircle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <DialogFooter className="gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsAssignModalOpen(false)}
                className="text-xs"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting || !targetUserId || !targetSocietyId}
                size="sm"
                className="bg-indigo-600 hover:bg-indigo-700 text-xs"
              >
                {isSubmitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Confirm Assignment"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

