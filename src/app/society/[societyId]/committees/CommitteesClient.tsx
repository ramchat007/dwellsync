"use client";

import React, { useState } from "react";
import {
  Shield,
  Users,
  Plus,
  Calendar,
  UserCheck,
  UserX,
  RefreshCw,
  Edit,
  History,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Committee,
  CommitteeMember,
  CommitteeType,
  CommitteeMemberDesignation,
  RoleId,
} from "@/lib/types/database";

export function CommitteesClient({
  societyId,
  initialCommittees,
  eligibleMembers,
  userRole,
}: {
  societyId: string;
  initialCommittees: Committee[];
  eligibleMembers: any[];
  userRole: RoleId;
}) {
  const [committees, setCommittees] = useState<Committee[]>(initialCommittees);
  const [selectedCommitteeId, setSelectedCommitteeId] = useState<string | null>(
    initialCommittees[0]?.id || null
  );
  const [activeCommitteeDetail, setActiveCommitteeDetail] = useState<Committee | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showAppointModal, setShowAppointModal] = useState(false);
  const [showResignModal, setShowResignModal] = useState(false);
  const [showReplaceModal, setShowReplaceModal] = useState(false);
  const [selectedMember, setSelectedMember] = useState<CommitteeMember | null>(null);

  // Form states
  const [createForm, setCreateForm] = useState({
    name: "",
    committee_type: "MANAGING_COMMITTEE" as CommitteeType,
    term_start_date: new Date().toISOString().split("T")[0],
    term_end_date: "",
    description: "",
  });

  const [appointForm, setAppointForm] = useState({
    user_id: "",
    designation: "EXECUTIVE_MEMBER" as CommitteeMemberDesignation,
    appointed_at: new Date().toISOString().split("T")[0],
    voting_rights: true,
    notes: "",
  });

  const [resignForm, setResignForm] = useState({
    resigned_at: new Date().toISOString().split("T")[0],
    reason: "",
  });

  const [replaceForm, setReplaceForm] = useState({
    incoming_user_id: "",
    designation: "" as CommitteeMemberDesignation | "",
    replacement_date: new Date().toISOString().split("T")[0],
    notes: "",
  });

  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const canManage = ["SUPER_ADMIN", "SOCIETY_ADMIN", "SECRETARY"].includes(userRole);

  // Load committee detail with history
  const loadCommitteeDetail = async (id: string) => {
    setLoadingDetail(true);
    setSelectedCommitteeId(id);
    try {
      const res = await fetch(`/api/society/${societyId}/committees/${id}?includeHistory=true`);
      const data = await res.json();
      if (data.success) {
        setActiveCommitteeDetail(data.committee);
      }
    } catch (err) {
      console.error("Error loading committee detail:", err);
    } finally {
      setLoadingDetail(false);
    }
  };

  React.useEffect(() => {
    if (selectedCommitteeId) {
      loadCommitteeDetail(selectedCommitteeId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCommitteeId]);

  // Handle Create Committee
  const handleCreateCommittee = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setErrorMsg(null);
    try {
      const res = await fetch(`/api/society/${societyId}/committees`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(createForm),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to create committee");
      }
      setCommittees([data.committee, ...committees]);
      setSelectedCommitteeId(data.committee.id);
      setShowCreateModal(false);
      setSuccessMsg(`Committee "${data.committee.name}" created successfully!`);
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // Handle Appoint Member
  const handleAppointMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCommitteeId) return;
    setSubmitting(true);
    setErrorMsg(null);
    try {
      const res = await fetch(`/api/society/${societyId}/committees/${selectedCommitteeId}/members`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(appointForm),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to appoint member");
      }
      await loadCommitteeDetail(selectedCommitteeId);
      setShowAppointModal(false);
      setSuccessMsg(`Member appointed as ${data.member.designation} successfully!`);
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // Handle Resign Member
  const handleResignMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCommitteeId || !selectedMember) return;
    setSubmitting(true);
    setErrorMsg(null);
    try {
      const res = await fetch(
        `/api/society/${societyId}/committees/${selectedCommitteeId}/members/${selectedMember.id}/resign`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(resignForm),
        }
      );
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to record resignation");
      }
      await loadCommitteeDetail(selectedCommitteeId);
      setShowResignModal(false);
      setSelectedMember(null);
      setSuccessMsg("Resignation recorded and historical record preserved.");
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // Handle Replace Member
  const handleReplaceMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCommitteeId || !selectedMember) return;
    setSubmitting(true);
    setErrorMsg(null);
    try {
      const res = await fetch(
        `/api/society/${societyId}/committees/${selectedCommitteeId}/members/${selectedMember.id}/replace`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(replaceForm),
        }
      );
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to replace member");
      }
      await loadCommitteeDetail(selectedCommitteeId);
      setShowReplaceModal(false);
      setSelectedMember(null);
      setSuccessMsg("Succession recorded: outgoing member marked and incoming successor appointed.");
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const activeMembers = activeCommitteeDetail?.members?.filter((m) => m.status === "ACTIVE") || [];
  const historicalMembers = activeCommitteeDetail?.members?.filter((m) => m.status !== "ACTIVE") || [];

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-4 sm:p-6 pb-16">
      {/* Top Banner */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white shadow-lg border border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Badge variant="purple" className="font-mono text-[10px] px-2 py-0.5">
              GOVERNANCE & COMMITTEES
            </Badge>
            <span className="text-xs text-slate-400 font-medium">Managing & Sub-Committees</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Society Governance Administration</h1>
          <p className="text-xs text-slate-300 mt-1">
            Managing committee tenure, portfolio designations, succession history, and officer roster.
          </p>
        </div>

        {canManage && (
          <Button
            onClick={() => setShowCreateModal(true)}
            className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs gap-1.5 shadow-sm"
          >
            <Plus className="w-4 h-4" /> Form New Committee
          </Button>
        )}
      </div>

      {/* Status Alerts */}
      {errorMsg && (
        <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}
      {successMsg && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-lg text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Main Content Grid: Committee List Sidebar + Committee Detail */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        {/* Left Column: Committees Selection */}
        <div className="md:col-span-4 space-y-4">
          <div className="text-xs font-bold text-slate-700 uppercase tracking-wide flex items-center justify-between">
            <span>Committees ({committees.length})</span>
          </div>

          <div className="space-y-2">
            {committees.map((c) => {
              const isSelected = c.id === selectedCommitteeId;
              const isActive = c.status === "ACTIVE";
              return (
                <div
                  key={c.id}
                  onClick={() => loadCommitteeDetail(c.id)}
                  className={`p-4 rounded-xl border transition-all cursor-pointer ${
                    isSelected
                      ? "border-indigo-600 bg-indigo-50/50 shadow-sm"
                      : "border-slate-200 bg-white hover:border-slate-300"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-xs text-slate-900">{c.name}</span>
                    <Badge variant={isActive ? "success" : "secondary"} className="text-[10px]">
                      {c.status}
                    </Badge>
                  </div>
                  <div className="text-[11px] text-slate-500 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    <span>
                      {c.term_start_date} to {c.term_end_date}
                    </span>
                  </div>
                  <div className="text-[10px] text-slate-400 mt-2 font-mono">
                    {c.committee_type.replace(/_/g, " ")}
                  </div>
                </div>
              );
            })}
            {committees.length === 0 && (
              <div className="p-6 text-center text-xs text-slate-500 bg-white rounded-xl border border-slate-200">
                No committees established yet.
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Selected Committee Detail */}
        <div className="md:col-span-8 space-y-6">
          {activeCommitteeDetail ? (
            <>
              {/* Committee Info Header */}
              <Card className="border-slate-200 shadow-sm bg-white">
                <CardHeader className="pb-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="purple" className="text-[10px]">
                          {activeCommitteeDetail.committee_type.replace(/_/g, " ")}
                        </Badge>
                        <Badge
                          variant={activeCommitteeDetail.status === "ACTIVE" ? "success" : "secondary"}
                          className="text-[10px]"
                        >
                          {activeCommitteeDetail.status}
                        </Badge>
                      </div>
                      <CardTitle className="text-lg font-bold text-slate-900">
                        {activeCommitteeDetail.name}
                      </CardTitle>
                      <CardDescription className="text-xs text-slate-500">
                        Term: {activeCommitteeDetail.term_start_date} to {activeCommitteeDetail.term_end_date}
                      </CardDescription>
                    </div>

                    {canManage && activeCommitteeDetail.status === "ACTIVE" && (
                      <Button
                        size="sm"
                        onClick={() => setShowAppointModal(true)}
                        className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs gap-1"
                      >
                        <UserCheck className="w-3.5 h-3.5" /> Appoint Member
                      </Button>
                    )}
                  </div>
                  {activeCommitteeDetail.description && (
                    <p className="text-xs text-slate-600 mt-2 pt-2 border-t border-slate-100">
                      {activeCommitteeDetail.description}
                    </p>
                  )}
                </CardHeader>
              </Card>

              {/* Active Members Roster */}
              <Card className="border-slate-200 shadow-sm bg-white">
                <CardHeader className="pb-3 border-b border-slate-100 flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
                      <Users className="w-4 h-4 text-indigo-600" /> Active Officers & Members (
                      {activeMembers.length})
                    </CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="divide-y divide-slate-100">
                    {activeMembers.map((m) => (
                      <div
                        key={m.id}
                        className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-indigo-50 text-indigo-700 flex items-center justify-center font-bold text-xs">
                            {(m.profile?.full_name || "M").charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="font-bold text-slate-900 flex items-center gap-2">
                              <span>{m.profile?.full_name || m.profile?.display_name || "Member"}</span>
                              <Badge variant="purple" className="text-[10px] py-0 font-mono">
                                {m.designation.replace(/_/g, " ")}
                              </Badge>
                            </div>
                            <div className="text-[11px] text-slate-400">
                              Appointed: {m.appointed_at} • {m.voting_rights ? "Voting Member" : "Non-voting"}
                            </div>
                          </div>
                        </div>

                        {canManage && activeCommitteeDetail.status === "ACTIVE" && (
                          <div className="flex items-center gap-1.5 self-end sm:self-center">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setSelectedMember(m);
                                setShowReplaceModal(true);
                              }}
                              className="text-[11px] h-7 px-2 text-indigo-600 gap-1"
                            >
                              <RefreshCw className="w-3 h-3" /> Replace
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setSelectedMember(m);
                                setShowResignModal(true);
                              }}
                              className="text-[11px] h-7 px-2 text-amber-600 gap-1"
                            >
                              <UserX className="w-3 h-3" /> Resign
                            </Button>
                          </div>
                        )}
                      </div>
                    ))}
                    {activeMembers.length === 0 && (
                      <div className="p-6 text-center text-xs text-slate-500">
                        No active members appointed to this committee yet.
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Historical Appointments & Succession */}
              {historicalMembers.length > 0 && (
                <Card className="border-slate-200 shadow-sm bg-slate-50/50">
                  <CardHeader className="pb-3 border-b border-slate-100">
                    <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2">
                      <History className="w-4 h-4 text-slate-400" /> Appointment History & Succession (
                      {historicalMembers.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="divide-y divide-slate-100">
                      {historicalMembers.map((m) => (
                        <div key={m.id} className="p-4 flex items-center justify-between text-xs opacity-75">
                          <div>
                            <div className="font-semibold text-slate-700 flex items-center gap-2">
                              <span>{m.profile?.full_name || "Past Member"}</span>
                              <Badge variant="secondary" className="text-[10px]">
                                {m.designation.replace(/_/g, " ")} ({m.status})
                              </Badge>
                            </div>
                            <div className="text-[11px] text-slate-400 mt-0.5">
                              Tenure: {m.appointed_at} to {m.resigned_at || "Term End"}
                              {m.replaced_by?.profile && (
                                <span className="ml-2 text-indigo-600 font-medium">
                                  → Succeeded by {m.replaced_by.profile.full_name}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          ) : (
            <div className="p-12 text-center text-xs text-slate-400 bg-white rounded-2xl border border-slate-200">
              Select a committee from the left to view roster and governance history.
            </div>
          )}
        </div>
      </div>

      {/* Modal: Form New Committee */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200 space-y-4">
            <h3 className="text-sm font-bold text-slate-900">Form New Society Committee</h3>
            <form onSubmit={handleCreateCommittee} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 mb-1 block">Committee Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g., Managing Committee 2026–2029"
                  value={createForm.name}
                  onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                  className="w-full p-2 border border-slate-300 rounded-lg text-xs"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 mb-1 block">Committee Type</label>
                <select
                  value={createForm.committee_type}
                  onChange={(e) => setCreateForm({ ...createForm, committee_type: e.target.value as any })}
                  className="w-full p-2 border border-slate-300 rounded-lg text-xs"
                >
                  <option value="MANAGING_COMMITTEE">Managing Committee</option>
                  <option value="SUB_COMMITTEE">Sub-Committee</option>
                  <option value="GRIEVANCE_COMMITTEE">Grievance Redressal Committee</option>
                  <option value="ELECTION_COMMITTEE">Election Committee</option>
                  <option value="OTHER">Other Committee</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-bold text-slate-700 mb-1 block">Term Start Date</label>
                  <input
                    type="date"
                    required
                    value={createForm.term_start_date}
                    onChange={(e) => setCreateForm({ ...createForm, term_start_date: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded-lg text-xs"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 mb-1 block">Term End Date</label>
                  <input
                    type="date"
                    required
                    value={createForm.term_end_date}
                    onChange={(e) => setCreateForm({ ...createForm, term_end_date: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded-lg text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 mb-1 block">Charter / Description</label>
                <textarea
                  placeholder="Charter mandate and responsibilities..."
                  value={createForm.description}
                  onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
                  className="w-full p-2 border border-slate-300 rounded-lg text-xs"
                  rows={2}
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <Button variant="ghost" size="sm" type="button" onClick={() => setShowCreateModal(false)}>
                  Cancel
                </Button>
                <Button
                  size="sm"
                  type="submit"
                  disabled={submitting}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white"
                >
                  {submitting ? "Creating..." : "Establish Committee"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Appoint Committee Member */}
      {showAppointModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200 space-y-4">
            <h3 className="text-sm font-bold text-slate-900">Appoint Committee Member</h3>
            <form onSubmit={handleAppointMember} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 mb-1 block">Select Society Member</label>
                <select
                  required
                  value={appointForm.user_id}
                  onChange={(e) => setAppointForm({ ...appointForm, user_id: e.target.value })}
                  className="w-full p-2 border border-slate-300 rounded-lg text-xs"
                >
                  <option value="">-- Select Member --</option>
                  {eligibleMembers.map((m: any) => (
                    <option key={m.user_id} value={m.user_id}>
                      {m.profile?.full_name || m.profile?.email || m.user_id} ({m.role_id})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-700 mb-1 block">Designation Portfolio</label>
                <select
                  value={appointForm.designation}
                  onChange={(e) => setAppointForm({ ...appointForm, designation: e.target.value as any })}
                  className="w-full p-2 border border-slate-300 rounded-lg text-xs"
                >
                  <option value="PRESIDENT">President</option>
                  <option value="VICE_PRESIDENT">Vice President</option>
                  <option value="CHAIRMAN">Chairman</option>
                  <option value="SECRETARY">Secretary</option>
                  <option value="JOINT_SECRETARY">Joint Secretary</option>
                  <option value="TREASURER">Treasurer</option>
                  <option value="JOINT_TREASURER">Joint Treasurer</option>
                  <option value="EXECUTIVE_MEMBER">Executive Member</option>
                  <option value="INVITEE">Invitee</option>
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-700 mb-1 block">Appointment Date</label>
                <input
                  type="date"
                  required
                  value={appointForm.appointed_at}
                  onChange={(e) => setAppointForm({ ...appointForm, appointed_at: e.target.value })}
                  className="w-full p-2 border border-slate-300 rounded-lg text-xs"
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="voting_rights"
                  checked={appointForm.voting_rights}
                  onChange={(e) => setAppointForm({ ...appointForm, voting_rights: e.target.checked })}
                  className="rounded text-indigo-600"
                />
                <label htmlFor="voting_rights" className="text-slate-700 font-medium">
                  Grant voting rights in committee motions
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <Button variant="ghost" size="sm" type="button" onClick={() => setShowAppointModal(false)}>
                  Cancel
                </Button>
                <Button
                  size="sm"
                  type="submit"
                  disabled={submitting || !appointForm.user_id}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white"
                >
                  {submitting ? "Appointing..." : "Confirm Appointment"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Resign Member */}
      {showResignModal && selectedMember && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200 space-y-4">
            <h3 className="text-sm font-bold text-slate-900">Record Member Resignation</h3>
            <p className="text-xs text-slate-500">
              Recording resignation for {selectedMember.profile?.full_name} ({selectedMember.designation}). The
              historical appointment record will be preserved.
            </p>
            <form onSubmit={handleResignMember} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 mb-1 block">Effective Resignation Date</label>
                <input
                  type="date"
                  required
                  value={resignForm.resigned_at}
                  onChange={(e) => setResignForm({ ...resignForm, resigned_at: e.target.value })}
                  className="w-full p-2 border border-slate-300 rounded-lg text-xs"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 mb-1 block">Reason / Minute Reference</label>
                <input
                  type="text"
                  placeholder="e.g. Relocated to another city"
                  value={resignForm.reason}
                  onChange={(e) => setResignForm({ ...resignForm, reason: e.target.value })}
                  className="w-full p-2 border border-slate-300 rounded-lg text-xs"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <Button variant="ghost" size="sm" type="button" onClick={() => setShowResignModal(false)}>
                  Cancel
                </Button>
                <Button
                  size="sm"
                  type="submit"
                  disabled={submitting}
                  className="bg-amber-600 hover:bg-amber-500 text-white"
                >
                  {submitting ? "Recording..." : "Record Resignation"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Replace Member (Succession) */}
      {showReplaceModal && selectedMember && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200 space-y-4">
            <h3 className="text-sm font-bold text-slate-900">Appoint Successor & Replace Member</h3>
            <p className="text-xs text-slate-500">
              Replacing {selectedMember.profile?.full_name} ({selectedMember.designation}). The outgoing record
              will link to the new successor.
            </p>
            <form onSubmit={handleReplaceMember} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 mb-1 block">Select Incoming Successor</label>
                <select
                  required
                  value={replaceForm.incoming_user_id}
                  onChange={(e) => setReplaceForm({ ...replaceForm, incoming_user_id: e.target.value })}
                  className="w-full p-2 border border-slate-300 rounded-lg text-xs"
                >
                  <option value="">-- Select Member --</option>
                  {eligibleMembers
                    .filter((m: any) => m.user_id !== selectedMember.user_id)
                    .map((m: any) => (
                      <option key={m.user_id} value={m.user_id}>
                        {m.profile?.full_name || m.profile?.email || m.user_id} ({m.role_id})
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-700 mb-1 block">Handover Date</label>
                <input
                  type="date"
                  required
                  value={replaceForm.replacement_date}
                  onChange={(e) => setReplaceForm({ ...replaceForm, replacement_date: e.target.value })}
                  className="w-full p-2 border border-slate-300 rounded-lg text-xs"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 mb-1 block">Succession Notes</label>
                <input
                  type="text"
                  placeholder="e.g. Mid-term committee vacancy handover"
                  value={replaceForm.notes}
                  onChange={(e) => setReplaceForm({ ...replaceForm, notes: e.target.value })}
                  className="w-full p-2 border border-slate-300 rounded-lg text-xs"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <Button variant="ghost" size="sm" type="button" onClick={() => setShowReplaceModal(false)}>
                  Cancel
                </Button>
                <Button
                  size="sm"
                  type="submit"
                  disabled={submitting || !replaceForm.incoming_user_id}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white"
                >
                  {submitting ? "Processing..." : "Complete Succession"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
