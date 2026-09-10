"use client";

import React, { useState } from "react";
import {
  CheckSquare,
  Plus,
  Clock,
  Users,
  Shield,
  AlertCircle,
  Loader2,
  CheckCircle2,
  Trash2,
  Lock,
  Eye,
  BarChart3,
  Calendar,
  X,
  AlertTriangle,
  Send,
} from "lucide-react";

interface PollOption {
  id?: string;
  option_text: string;
  display_order: number;
  vote_count?: number;
  percentage?: number;
}

interface Poll {
  id: string;
  society_id: string;
  title: string;
  description?: string | null;
  question: string;
  poll_type: "SINGLE_CHOICE" | "MULTIPLE_CHOICE";
  target_audience: "ALL_RESIDENTS" | "OWNERS_ONLY" | "COMMITTEE_ONLY";
  is_anonymous: boolean;
  results_visibility: "ALWAYS" | "AFTER_VOTING" | "AFTER_CLOSE" | "ADMIN_ONLY";
  starts_at: string;
  ends_at: string;
  status: "DRAFT" | "PUBLISHED" | "CLOSED" | "CANCELLED";
  created_at: string;
  creator?: {
    id: string;
    full_name: string;
    display_name?: string;
  };
  options?: PollOption[];
  total_votes?: number;
  unique_voters_count?: number;
}

interface PollsAdminClientProps {
  initialPolls: any[];
  societyId: string;
  totalMembersCount: number;
}

export function PollsAdminClient({
  initialPolls,
  societyId,
  totalMembersCount,
}: PollsAdminClientProps) {
  const [polls, setPolls] = useState<Poll[]>(initialPolls);
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // Create Poll Form State
  const [formData, setFormData] = useState({
    title: "",
    question: "",
    description: "",
    poll_type: "SINGLE_CHOICE" as "SINGLE_CHOICE" | "MULTIPLE_CHOICE",
    target_audience: "ALL_RESIDENTS" as "ALL_RESIDENTS" | "OWNERS_ONLY" | "COMMITTEE_ONLY",
    is_anonymous: false,
    results_visibility: "ALWAYS" as "ALWAYS" | "AFTER_VOTING" | "AFTER_CLOSE" | "ADMIN_ONLY",
    ends_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 16),
    options: ["Yes, approve proposal", "No, reject proposal"],
    remind_24h: true,
    remind_6h: true,
  });

  // KPI Calculations
  const activePollsCount = polls.filter((p) => p.status === "PUBLISHED").length;
  const totalVotesCast = polls.reduce((sum, p) => sum + (p.total_votes || 0), 0);
  const anonymousPollsCount = polls.filter((p) => p.is_anonymous).length;
  const avgParticipationRate = totalMembersCount > 0 && polls.length > 0
    ? Math.min(100, Math.round((totalVotesCast / (totalMembersCount * polls.length)) * 100))
    : 0;

  // Filtered Polls
  const filteredPolls = polls.filter((p) => {
    if (statusFilter === "ALL") return true;
    return p.status === statusFilter;
  });

  const handleAddOption = () => {
    if (formData.options.length >= 10) return;
    setFormData({
      ...formData,
      options: [...formData.options, ""],
    });
  };

  const handleRemoveOption = (index: number) => {
    if (formData.options.length <= 2) return;
    setFormData({
      ...formData,
      options: formData.options.filter((_, i) => i !== index),
    });
  };

  const handleOptionChange = (index: number, value: string) => {
    const updated = [...formData.options];
    updated[index] = value;
    setFormData({ ...formData, options: updated });
  };

  const handleCreatePoll = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setErrorMsg("");
    setSuccessMsg("");

    try {
      const validOptions = formData.options.map((o) => o.trim()).filter(Boolean);
      if (validOptions.length < 2) {
        throw new Error("A poll requires at least 2 distinct options.");
      }

      const reminder_offsets: number[] = [];
      if (formData.remind_24h) reminder_offsets.push(24);
      if (formData.remind_6h) reminder_offsets.push(6);

      const payload = {
        title: formData.title,
        question: formData.question,
        description: formData.description || undefined,
        poll_type: formData.poll_type,
        target_audience: formData.target_audience,
        is_anonymous: formData.is_anonymous,
        results_visibility: formData.results_visibility,
        ends_at: new Date(formData.ends_at).toISOString(),
        options: validOptions,
        reminder_offset_hours: reminder_offsets.length > 0 ? reminder_offsets : undefined,
        status: "PUBLISHED",
      };

      const res = await fetch(`/api/society/${societyId}/polls`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create poll.");

      const newPoll = {
        ...data.poll,
        total_votes: 0,
        unique_voters_count: 0,
        options: (data.poll.options || []).map((o: any) => ({
          ...o,
          vote_count: 0,
          percentage: 0,
        })),
      };

      setPolls([newPoll, ...polls]);
      setIsModalOpen(false);
      setSuccessMsg("Poll published and sent to eligible members!");
      setTimeout(() => setSuccessMsg(""), 4000);

      // Reset Form
      setFormData({
        title: "",
        question: "",
        description: "",
        poll_type: "SINGLE_CHOICE",
        target_audience: "ALL_RESIDENTS",
        is_anonymous: false,
        results_visibility: "ALWAYS",
        ends_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 16),
        options: ["Yes, approve proposal", "No, reject proposal"],
        remind_24h: true,
        remind_6h: true,
      });
    } catch (err: any) {
      setErrorMsg(err.message || "An error occurred.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleClosePoll = async (pollId: string) => {
    if (!confirm("Are you sure you want to close this poll? Members will no longer be able to cast votes.")) return;
    try {
      const res = await fetch(`/api/society/${societyId}/polls/${pollId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "CLOSED" }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to close poll");
      }

      setPolls(
        polls.map((p) => (p.id === pollId ? { ...p, status: "CLOSED" } : p))
      );
      setSuccessMsg("Poll closed successfully.");
      setTimeout(() => setSuccessMsg(""), 4000);
    } catch (err: any) {
      alert(err.message || "Failed to close poll");
    }
  };

  const handleDeletePoll = async (pollId: string) => {
    if (!confirm("Are you sure you want to delete/cancel this poll?")) return;
    try {
      const res = await fetch(`/api/society/${societyId}/polls/${pollId}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to remove poll");
      }

      setPolls(polls.filter((p) => p.id !== pollId));
      setSuccessMsg("Poll removed.");
      setTimeout(() => setSuccessMsg(""), 4000);
    } catch (err: any) {
      alert(err.message || "Failed to remove poll");
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-900 dark:text-white">Society Polls & Surveys</h1>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300 font-semibold font-mono">
              {polls.length} Total
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Conduct democratic opinion polls, committee ballots, and secret votes with tamper-resistant audit trails.
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-sm transition"
        >
          <Plus className="w-4 h-4" />
          <span>Create Poll</span>
        </button>
      </div>

      {successMsg && (
        <div className="p-3 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-xl text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs">
            <span>Active Polls</span>
            <CheckSquare className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white mt-1">
            {activePollsCount}
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">Currently accepting votes</div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs">
            <span>Total Votes Cast</span>
            <Users className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white mt-1">
            {totalVotesCast}
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">Across all registered polls</div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs">
            <span>Anonymous Polls</span>
            <Lock className="w-4 h-4 text-purple-600" />
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white mt-1">
            {anonymousPollsCount}
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">Secret ballot enabled</div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs">
            <span>Participation Rate</span>
            <BarChart3 className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white mt-1">
            {avgParticipationRate}%
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">Based on {totalMembersCount} members</div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2 text-xs">
        {["ALL", "PUBLISHED", "CLOSED", "DRAFT"].map((st) => (
          <button
            key={st}
            onClick={() => setStatusFilter(st)}
            className={`px-3 py-1.5 rounded-lg font-semibold transition ${
              statusFilter === st
                ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900"
                : "text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
            }`}
          >
            {st === "ALL" ? "All Polls" : st === "PUBLISHED" ? "Active" : st.charAt(0) + st.slice(1).toLowerCase()}
          </button>
        ))}
      </div>

      {/* Poll Cards List */}
      {filteredPolls.length === 0 ? (
        <div className="p-12 text-center rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2">
          <CheckSquare className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto" />
          <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300">No Polls Found</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            {statusFilter === "ALL"
              ? "Create your first society poll to gather feedback from residents and owners."
              : `No polls with status ${statusFilter}.`}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredPolls.map((poll) => {
            const isClosed = poll.status === "CLOSED" || new Date() > new Date(poll.ends_at);

            return (
              <div
                key={poll.id}
                className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4 flex flex-col justify-between"
              >
                <div className="space-y-2.5">
                  {/* Top Badges */}
                  <div className="flex flex-wrap items-center justify-between gap-2 text-[10px]">
                    <div className="flex items-center gap-1.5">
                      <span
                        className={`font-bold uppercase px-2 py-0.5 rounded-full border ${
                          poll.status === "PUBLISHED"
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300"
                            : poll.status === "CLOSED"
                            ? "bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400"
                            : "bg-amber-50 text-amber-700 border-amber-200"
                        }`}
                      >
                        {poll.status}
                      </span>
                      <span className="font-semibold px-2 py-0.5 rounded bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                        {poll.target_audience === "OWNERS_ONLY"
                          ? "Owners Only"
                          : poll.target_audience === "COMMITTEE_ONLY"
                          ? "Committee Only"
                          : "All Residents"}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 font-medium">
                      {poll.is_anonymous ? (
                        <span className="flex items-center gap-1 text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-950 px-1.5 py-0.5 rounded border border-purple-200 dark:border-purple-800">
                          <Lock className="w-3 h-3" />
                          <span>Secret Ballot</span>
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 bg-slate-50 dark:bg-slate-800 px-1.5 py-0.5 rounded">
                          <Eye className="w-3 h-3" />
                          <span>Public Record</span>
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Poll Title & Question */}
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                      {poll.title}
                    </h3>
                    <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 font-medium">
                      {poll.question}
                    </p>
                    {poll.description && (
                      <p className="text-[11px] text-slate-400 mt-1 line-clamp-2">
                        {poll.description}
                      </p>
                    )}
                  </div>

                  {/* Options Results Breakdown */}
                  <div className="space-y-2 pt-2">
                    {(poll.options || []).map((opt) => (
                      <div key={opt.id || opt.option_text} className="space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-medium text-slate-700 dark:text-slate-300">
                            {opt.option_text}
                          </span>
                          <span className="font-bold text-slate-900 dark:text-white">
                            {opt.percentage || 0}% ({opt.vote_count || 0})
                          </span>
                        </div>
                        <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                          <div
                            className="bg-blue-600 h-full rounded-full transition-all duration-500"
                            style={{ width: `${opt.percentage || 0}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Footer and Actions */}
                <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-1 text-[11px]">
                      <Users className="w-3 h-3" />
                      <span>{poll.total_votes || 0} Votes Cast</span>
                    </div>
                    <div className="flex items-center gap-1 text-[10px] text-slate-400">
                      <Clock className="w-3 h-3" />
                      <span>Closes: {new Date(poll.ends_at).toLocaleDateString()}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {poll.status === "PUBLISHED" && !isClosed && (
                      <button
                        onClick={() => handleClosePoll(poll.id)}
                        className="px-2.5 py-1 bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 rounded-lg text-[11px] font-semibold hover:bg-amber-100"
                      >
                        Close Voting
                      </button>
                    )}
                    <button
                      onClick={() => handleDeletePoll(poll.id)}
                      className="text-slate-400 hover:text-rose-600 p-1"
                      title="Delete or cancel poll"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create Poll Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-xl bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Create Society Poll / Survey</h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="w-7 h-7 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-900 text-xs"
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

            <form onSubmit={handleCreatePoll} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Poll Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Electric Vehicle Charging Station Installation"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Question for Members *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Do you support allocating visitor parking slot #4 for common EV chargers?"
                  value={formData.question}
                  onChange={(e) => setFormData({ ...formData, question: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Context & Details (Optional)</label>
                <textarea
                  rows={2}
                  placeholder="Estimated project cost, vendor quotes, and timeline..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Target Audience *</label>
                  <select
                    value={formData.target_audience}
                    onChange={(e: any) => setFormData({ ...formData, target_audience: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-white"
                  >
                    <option value="ALL_RESIDENTS">All Residents (Society Wide)</option>
                    <option value="OWNERS_ONLY">Owners Only (Capital Items)</option>
                    <option value="COMMITTEE_ONLY">Managing Committee Only</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Voting Mode *</label>
                  <select
                    value={formData.poll_type}
                    onChange={(e: any) => setFormData({ ...formData, poll_type: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-white"
                  >
                    <option value="SINGLE_CHOICE">Single Choice (Radio Button)</option>
                    <option value="MULTIPLE_CHOICE">Multiple Choice (Checkboxes)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Closing Date & Time *</label>
                  <input
                    type="datetime-local"
                    required
                    value={formData.ends_at}
                    onChange={(e) => setFormData({ ...formData, ends_at: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Results Visibility</label>
                  <select
                    value={formData.results_visibility}
                    onChange={(e: any) => setFormData({ ...formData, results_visibility: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-white"
                  >
                    <option value="ALWAYS">Always Visible</option>
                    <option value="AFTER_VOTING">Visible Only After Voting</option>
                    <option value="AFTER_CLOSE">Visible After Poll Closes</option>
                    <option value="ADMIN_ONLY">Committee / Admin Only</option>
                  </select>
                </div>
              </div>

              {/* Anonymity switch */}
              <div className="p-3 bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 rounded-xl flex items-center justify-between">
                <div>
                  <div className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5 text-purple-600" />
                    <span>Anonymous Voting (Secret Ballot)</span>
                  </div>
                  <div className="text-[11px] text-slate-500">
                    Voters&apos; identity will not be linked to their selected options in reports.
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={formData.is_anonymous}
                  onChange={(e) => setFormData({ ...formData, is_anonymous: e.target.checked })}
                  className="rounded text-purple-600 w-4 h-4"
                />
              </div>

              {/* Poll Options */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block font-bold text-slate-700 dark:text-slate-300">
                    Options ({formData.options.length})
                  </label>
                  {formData.options.length < 10 && (
                    <button
                      type="button"
                      onClick={handleAddOption}
                      className="text-blue-600 font-semibold flex items-center gap-1 hover:underline"
                    >
                      <Plus className="w-3 h-3" />
                      <span>Add Option</span>
                    </button>
                  )}
                </div>

                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {formData.options.map((opt, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <span className="w-5 text-center font-bold text-slate-400">{idx + 1}.</span>
                      <input
                        type="text"
                        required
                        placeholder={`Option ${idx + 1}`}
                        value={opt}
                        onChange={(e) => handleOptionChange(idx, e.target.value)}
                        className="flex-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-1.5 text-slate-900 dark:text-white"
                      />
                      {formData.options.length > 2 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveOption(idx)}
                          className="text-slate-400 hover:text-rose-600 p-1"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Reminders */}
              <div className="p-3 bg-blue-50/50 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900 rounded-xl space-y-2">
                <div className="flex items-center gap-1.5 font-bold text-blue-900 dark:text-blue-300">
                  <Clock className="w-3.5 h-3.5 text-blue-600" />
                  <span>Closing Reminders</span>
                </div>
                <div className="flex items-center gap-4 text-slate-700 dark:text-slate-300">
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.remind_24h}
                      onChange={(e) => setFormData({ ...formData, remind_24h: e.target.checked })}
                      className="rounded border-slate-300 text-blue-600"
                    />
                    <span>24 hours before closing</span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.remind_6h}
                      onChange={(e) => setFormData({ ...formData, remind_6h: e.target.checked })}
                      className="rounded border-slate-300 text-blue-600"
                    />
                    <span>6 hours before closing</span>
                  </label>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-slate-600 dark:text-slate-400 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold flex items-center gap-1.5"
                >
                  {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Publish Poll</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
