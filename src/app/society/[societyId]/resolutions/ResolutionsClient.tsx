"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import {
  GovernanceResolution,
  ResolutionStatus,
  ResolutionType,
  SocietyMeeting,
} from "@/lib/types/database";
import {
  FileCheck2,
  Search,
  Plus,
  Filter,
  CheckCircle2,
  XCircle,
  Clock,
  AlertCircle,
  Calendar,
  Vote,
  FileText,
  Loader2,
  Lock,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface ResolutionsClientProps {
  societyId: string;
  initialResolutions: GovernanceResolution[];
  meetings: SocietyMeeting[];
  canManage: boolean;
  userRole: string;
}

export function ResolutionsClient({
  societyId,
  initialResolutions,
  meetings,
  canManage,
  userRole,
}: ResolutionsClientProps) {
  const router = useRouter();
  const [resolutions, setResolutions] = useState<GovernanceResolution[]>(initialResolutions);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [typeFilter, setTypeFilter] = useState<string>("ALL");

  // Modal State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Form State
  const [form, setForm] = useState({
    title: "",
    description: "",
    resolution_type: "ORDINARY" as ResolutionType,
    status: "PASSED" as ResolutionStatus,
    meeting_id: "",
    votes_for: 0,
    votes_against: 0,
    votes_abstained: 0,
    passed_date: new Date().toISOString().split("T")[0],
    effective_date: new Date().toISOString().split("T")[0],
    notes: "",
  });

  const filtered = resolutions.filter((r) => {
    const matchesSearch =
      r.title.toLowerCase().includes(search.toLowerCase()) ||
      r.resolution_number.toLowerCase().includes(search.toLowerCase()) ||
      r.description.toLowerCase().includes(search.toLowerCase());

    const matchesStatus = statusFilter === "ALL" || r.status === statusFilter;
    const matchesType = typeFilter === "ALL" || r.resolution_type === typeFilter;

    return matchesSearch && matchesStatus && matchesType;
  });

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      setErrorMsg(null);

      const payload = {
        ...form,
        meeting_id: form.meeting_id ? form.meeting_id : undefined,
      };

      const res = await fetch(`/api/society/${societyId}/resolutions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setResolutions([data.resolution, ...resolutions]);
        setShowCreateModal(false);
        setForm({
          title: "",
          description: "",
          resolution_type: "ORDINARY",
          status: "PASSED",
          meeting_id: "",
          votes_for: 0,
          votes_against: 0,
          votes_abstained: 0,
          passed_date: new Date().toISOString().split("T")[0],
          effective_date: new Date().toISOString().split("T")[0],
          notes: "",
        });
        router.refresh();
      } else {
        setErrorMsg(data.error || "Failed to create resolution");
      }
    } catch (err: any) {
      console.error(err);
      setErrorMsg("Network error creating resolution");
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusBadge = (status: ResolutionStatus) => {
    switch (status) {
      case "PASSED":
        return <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100 text-[10px]">Passed</Badge>;
      case "PROPOSED":
        return <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100 text-[10px]">Proposed</Badge>;
      case "REJECTED":
        return <Badge className="bg-rose-100 text-rose-800 hover:bg-rose-100 text-[10px]">Rejected</Badge>;
      case "DEFERRED":
        return <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100 text-[10px]">Deferred</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <FileCheck2 className="w-5 h-5 text-indigo-600" />
            Governance Decisions & Resolutions Register
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Authoritative registry of official General Body, AGM, EGM, and Managing Committee resolutions.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {canManage ? (
            <Button
              onClick={() => setShowCreateModal(true)}
              className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" /> Propose Resolution
            </Button>
          ) : (
            <Badge variant="secondary" className="text-xs flex items-center gap-1">
              <Lock className="w-3 h-3" /> Transparency View
            </Badge>
          )}
        </div>
      </div>

      {/* Filters Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 bg-white dark:bg-slate-900 p-3 rounded-lg border border-slate-200 dark:border-slate-800 text-xs">
        <div className="relative flex-1">
          <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
          <Input
            placeholder="Search by title, number, or description..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 text-xs h-8"
          />
        </div>

        <div className="flex items-center gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:bg-slate-800 dark:border-slate-700"
          >
            <option value="ALL">All Statuses</option>
            <option value="PASSED">Passed</option>
            <option value="PROPOSED">Proposed</option>
            <option value="REJECTED">Rejected</option>
            <option value="DEFERRED">Deferred</option>
          </select>

          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:bg-slate-800 dark:border-slate-700"
          >
            <option value="ALL">All Types</option>
            <option value="ORDINARY">Ordinary</option>
            <option value="SPECIAL">Special</option>
            <option value="CIRCULAR">Circular</option>
            <option value="EMERGENCY">Emergency</option>
          </select>
        </div>
      </div>

      {/* Resolutions List */}
      {filtered.length === 0 ? (
        <Card className="text-center py-12">
          <CardContent className="space-y-2">
            <FileText className="w-8 h-8 text-slate-300 mx-auto" />
            <div className="text-sm font-semibold text-slate-700 dark:text-slate-300">No Resolutions Found</div>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              {search || statusFilter !== "ALL" || typeFilter !== "ALL"
                ? "No resolutions match the selected filters."
                : "No official resolutions recorded yet for this society."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((res) => (
            <Card key={res.id} className="hover:border-slate-300 dark:hover:border-slate-700 transition">
              <CardHeader className="pb-2">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-indigo-600 dark:text-indigo-400">
                      {res.resolution_number}
                    </span>
                    <span className="text-slate-300 dark:text-slate-700">•</span>
                    {getStatusBadge(res.status)}
                    <Badge variant="outline" className="text-[10px] font-normal">
                      {res.resolution_type}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-3 text-[11px] text-slate-500">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3 text-slate-400" />
                      Passed: {res.passed_date}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3 text-slate-400" />
                      Effective: {res.effective_date}
                    </span>
                  </div>
                </div>
                <CardTitle className="text-sm font-semibold text-slate-900 dark:text-white pt-1">
                  {res.title}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-xs">
                <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                  {res.description}
                </p>

                <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-500">
                  <div className="flex items-center gap-4">
                    <span className="flex items-center gap-1">
                      <Vote className="w-3 h-3 text-indigo-500" />
                      Voting:
                    </span>
                    <span className="font-semibold text-emerald-600">For: {res.votes_for}</span>
                    <span className="font-semibold text-rose-600">Against: {res.votes_against}</span>
                    <span className="text-slate-500">Abstained: {res.votes_abstained}</span>
                  </div>

                  {res.meeting && (
                    <div className="text-slate-500">
                      Meeting: <span className="font-medium text-slate-700 dark:text-slate-300">{res.meeting.title}</span> ({res.meeting.meeting_type})
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Propose Resolution Modal */}
      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent className="sm:max-w-[550px]">
          <form onSubmit={handleCreate}>
            <DialogHeader>
              <DialogTitle className="text-sm font-bold flex items-center gap-2">
                <FileCheck2 className="w-4 h-4 text-indigo-600" />
                Record Governance Resolution
              </DialogTitle>
              <DialogDescription className="text-xs">
                Log an official decision or resolution passed during a General Body meeting or Managing Committee session.
              </DialogDescription>
            </DialogHeader>

            {errorMsg && (
              <div className="mt-3 p-2.5 rounded text-xs bg-red-50 text-red-700 border border-red-200">
                {errorMsg}
              </div>
            )}

            <div className="space-y-3 py-3 text-xs">
              <div className="space-y-1">
                <label className="font-medium text-slate-700 dark:text-slate-300">Resolution Title</label>
                <Input
                  required
                  placeholder="e.g. Approval of Annual Maintenance Budget for FY 2026-27"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  className="text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="font-medium text-slate-700 dark:text-slate-300">Resolution Type</label>
                  <select
                    value={form.resolution_type}
                    onChange={(e) => setForm({ ...form, resolution_type: e.target.value as ResolutionType })}
                    className="w-full rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:bg-slate-800 dark:border-slate-700"
                  >
                    <option value="ORDINARY">Ordinary Resolution</option>
                    <option value="SPECIAL">Special Resolution</option>
                    <option value="CIRCULAR">Circular Resolution</option>
                    <option value="EMERGENCY">Emergency Resolution</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="font-medium text-slate-700 dark:text-slate-300">Status</label>
                  <select
                    value={form.status}
                    onChange={(e) => setForm({ ...form, status: e.target.value as ResolutionStatus })}
                    className="w-full rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:bg-slate-800 dark:border-slate-700"
                  >
                    <option value="PASSED">Passed</option>
                    <option value="PROPOSED">Proposed</option>
                    <option value="REJECTED">Rejected</option>
                    <option value="DEFERRED">Deferred</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-medium text-slate-700 dark:text-slate-300">Associated Meeting (Optional)</label>
                <select
                  value={form.meeting_id}
                  onChange={(e) => setForm({ ...form, meeting_id: e.target.value })}
                  className="w-full rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:bg-slate-800 dark:border-slate-700"
                >
                  <option value="">None (Circular or Standalone Resolution)</option>
                  {meetings.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.title} ({m.meeting_type} - {new Date(m.scheduled_at).toLocaleDateString()})
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="font-medium text-slate-700 dark:text-slate-300">Full Resolution Text</label>
                <textarea
                  required
                  rows={4}
                  placeholder="Resolved that the society hereby approves..."
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="w-full rounded-md border border-slate-300 bg-white p-2.5 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:bg-slate-800 dark:border-slate-700 font-mono leading-relaxed"
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div className="space-y-1">
                  <label className="font-medium text-slate-700 dark:text-slate-300 text-[11px]">Votes For</label>
                  <Input
                    type="number"
                    min="0"
                    value={form.votes_for}
                    onChange={(e) => setForm({ ...form, votes_for: parseInt(e.target.value) || 0 })}
                    className="text-xs h-8"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-medium text-slate-700 dark:text-slate-300 text-[11px]">Votes Against</label>
                  <Input
                    type="number"
                    min="0"
                    value={form.votes_against}
                    onChange={(e) => setForm({ ...form, votes_against: parseInt(e.target.value) || 0 })}
                    className="text-xs h-8"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-medium text-slate-700 dark:text-slate-300 text-[11px]">Abstained</label>
                  <Input
                    type="number"
                    min="0"
                    value={form.votes_abstained}
                    onChange={(e) => setForm({ ...form, votes_abstained: parseInt(e.target.value) || 0 })}
                    className="text-xs h-8"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="font-medium text-slate-700 dark:text-slate-300">Passed Date</label>
                  <Input
                    type="date"
                    value={form.passed_date}
                    onChange={(e) => setForm({ ...form, passed_date: e.target.value })}
                    className="text-xs h-8"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-medium text-slate-700 dark:text-slate-300">Effective Date</label>
                  <Input
                    type="date"
                    value={form.effective_date}
                    onChange={(e) => setForm({ ...form, effective_date: e.target.value })}
                    className="text-xs h-8"
                  />
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowCreateModal(false)}
                className="text-xs"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={submitting}
                size="sm"
                className="text-xs bg-indigo-600 hover:bg-indigo-700 text-white"
              >
                {submitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Record Resolution"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

