"use client";

import React, { useState } from "react";
import {
  CheckSquare,
  Lock,
  Clock,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Users,
  Eye,
  ShieldCheck,
} from "lucide-react";
import { Society } from "@/lib/types/database";

interface PollOption {
  id: string;
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
  options?: PollOption[];
  total_votes?: number;
  unique_voters_count?: number;
  has_voted?: boolean;
  user_voted_option_ids?: string[];
  show_results?: boolean;
}

interface ResidentPollsClientProps {
  initialPolls: Poll[];
  society: Society;
}

export function ResidentPollsClient({
  initialPolls,
  society,
}: ResidentPollsClientProps) {
  const [polls, setPolls] = useState<Poll[]>(initialPolls);
  const [activeTab, setActiveTab] = useState<"ACTIVE" | "CLOSED">("ACTIVE");

  // Voting state: selected options per poll { [pollId]: [optionId, ...] }
  const [selectedOptions, setSelectedOptions] = useState<Record<string, string[]>>({});
  const [votingPollId, setVotingPollId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ pollId: string; msg: string; isError?: boolean } | null>(null);

  const activePolls = polls.filter((p) => {
    const isPast = new Date() > new Date(p.ends_at);
    return p.status === "PUBLISHED" && !isPast;
  });

  const closedPolls = polls.filter((p) => {
    const isPast = new Date() > new Date(p.ends_at);
    return p.status === "CLOSED" || isPast;
  });

  const handleSelectOption = (pollId: string, optionId: string, pollType: string) => {
    if (pollType === "SINGLE_CHOICE") {
      setSelectedOptions({
        ...selectedOptions,
        [pollId]: [optionId],
      });
    } else {
      const current = selectedOptions[pollId] || [];
      const updated = current.includes(optionId)
        ? current.filter((id) => id !== optionId)
        : [...current, optionId];
      setSelectedOptions({
        ...selectedOptions,
        [pollId]: updated,
      });
    }
  };

  const handleCastVote = async (poll: Poll) => {
    const chosen = selectedOptions[poll.id] || [];
    if (chosen.length === 0) {
      setFeedback({ pollId: poll.id, msg: "Please select an option before submitting.", isError: true });
      return;
    }

    setVotingPollId(poll.id);
    setFeedback(null);

    try {
      const res = await fetch(`/api/resident/polls/${poll.id}/vote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ option_ids: chosen }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to submit vote");
      }

      // Update poll state locally
      setPolls((prev) =>
        prev.map((p) => {
          if (p.id !== poll.id) return p;

          const updatedOptions = (p.options || []).map((opt) => {
            const isChosen = chosen.includes(opt.id);
            const currentCount = opt.vote_count || 0;
            const newCount = isChosen ? currentCount + 1 : currentCount;
            return {
              ...opt,
              vote_count: newCount,
            };
          });

          const newTotal = (p.total_votes || 0) + chosen.length;
          const optionsWithPercentages = updatedOptions.map((opt) => ({
            ...opt,
            percentage: newTotal > 0 ? Math.round(((opt.vote_count || 0) / newTotal) * 100) : 0,
          }));

          const willShowResults =
            p.results_visibility === "ALWAYS" ||
            p.results_visibility === "AFTER_VOTING" ||
            (p.results_visibility === "AFTER_CLOSE" && p.status === "CLOSED");

          return {
            ...p,
            has_voted: true,
            user_voted_option_ids: chosen,
            total_votes: newTotal,
            unique_voters_count: (p.unique_voters_count || 0) + 1,
            show_results: willShowResults,
            options: optionsWithPercentages,
          };
        })
      );

      setFeedback({
        pollId: poll.id,
        msg: "Your vote has been cast successfully!",
      });
      setTimeout(() => setFeedback(null), 5000);
    } catch (err: any) {
      setFeedback({ pollId: poll.id, msg: err.message || "Failed to record vote", isError: true });
    } finally {
      setVotingPollId(null);
    }
  };

  const currentList = activeTab === "ACTIVE" ? activePolls : closedPolls;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-900 dark:text-white">Community Polls & Surveys</h1>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300 font-semibold font-mono">
              {activePolls.length} Active
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Cast your vote on society improvement proposals, amenity decisions, and resolutions.
          </p>
        </div>

        {/* Tab switch */}
        <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-xl text-xs">
          <button
            onClick={() => setActiveTab("ACTIVE")}
            className={`px-3.5 py-1.5 rounded-lg font-semibold transition ${
              activeTab === "ACTIVE"
                ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm"
                : "text-slate-500 hover:text-slate-900 dark:text-slate-400"
            }`}
          >
            Active ({activePolls.length})
          </button>
          <button
            onClick={() => setActiveTab("CLOSED")}
            className={`px-3.5 py-1.5 rounded-lg font-semibold transition ${
              activeTab === "CLOSED"
                ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm"
                : "text-slate-500 hover:text-slate-900 dark:text-slate-400"
            }`}
          >
            Closed / Results ({closedPolls.length})
          </button>
        </div>
      </div>

      {/* List */}
      {currentList.length === 0 ? (
        <div className="p-12 text-center rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3">
          <CheckSquare className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto" />
          <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300">
            {activeTab === "ACTIVE" ? "No Active Polls" : "No Past Polls"}
          </h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            {activeTab === "ACTIVE"
              ? "There are currently no open polls requiring your vote. Check back soon!"
              : "No historical polls are available."}
          </p>
        </div>
      ) : (
        <div className="space-y-5">
          {currentList.map((poll) => {
            const hasVoted = poll.has_voted;
            const chosenOptionIds = selectedOptions[poll.id] || [];
            const userVotedIds = poll.user_voted_option_ids || [];
            const isClosed = activeTab === "CLOSED";

            return (
              <div
                key={poll.id}
                className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4 hover:border-blue-200 dark:hover:border-blue-800 transition"
              >
                {/* Header row */}
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                      {poll.poll_type === "SINGLE_CHOICE" ? "Single Choice" : "Multiple Choice"}
                    </span>
                    {poll.target_audience !== "ALL_RESIDENTS" && (
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-purple-50 text-purple-700 dark:bg-purple-950 dark:text-purple-300 border border-purple-200">
                        {poll.target_audience === "OWNERS_ONLY" ? "Owners Only" : "Committee"}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2 text-[11px] text-slate-400">
                    <Clock className="w-3.5 h-3.5" />
                    <span>
                      {isClosed
                        ? `Closed on ${new Date(poll.ends_at).toLocaleDateString()}`
                        : `Closes: ${new Date(poll.ends_at).toLocaleString("en-IN", {
                            dateStyle: "medium",
                            timeStyle: "short",
                          })}`}
                    </span>
                  </div>
                </div>

                {/* Question & context */}
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    {poll.title}
                  </h3>
                  <p className="text-sm font-semibold text-slate-700 dark:text-slate-300 mt-1">
                    {poll.question}
                  </p>
                  {poll.description && (
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                      {poll.description}
                    </p>
                  )}
                </div>

                {/* Anonymous reassurance banner */}
                {poll.is_anonymous && (
                  <div className="p-2.5 bg-purple-50/60 dark:bg-purple-950/30 border border-purple-100 dark:border-purple-900 rounded-xl flex items-center gap-2 text-xs text-purple-900 dark:text-purple-300">
                    <Lock className="w-4 h-4 text-purple-600 shrink-0" />
                    <span>
                      <strong>Secret Ballot:</strong> Your vote is strictly anonymous. Your name and apartment details will not be linked to your vote.
                    </span>
                  </div>
                )}

                {/* Feedback message */}
                {feedback && feedback.pollId === poll.id && (
                  <div
                    className={`p-2.5 rounded-xl text-xs flex items-center gap-2 ${
                      feedback.isError
                        ? "bg-rose-50 text-rose-700 border border-rose-200"
                        : "bg-emerald-50 text-emerald-800 border border-emerald-200"
                    }`}
                  >
                    {feedback.isError ? (
                      <AlertCircle className="w-4 h-4 shrink-0" />
                    ) : (
                      <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                    )}
                    <span>{feedback.msg}</span>
                  </div>
                )}

                {/* Options List */}
                <div className="space-y-2 pt-1">
                  {(poll.options || []).map((opt) => {
                    const isSelected = chosenOptionIds.includes(opt.id);
                    const isUserVotedThis = userVotedIds.includes(opt.id);

                    if (!hasVoted && !isClosed) {
                      // Voting Option Card
                      return (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => handleSelectOption(poll.id, opt.id, poll.poll_type)}
                          className={`w-full text-left p-3 rounded-xl border text-xs font-semibold flex items-center justify-between transition ${
                            isSelected
                              ? "border-blue-600 bg-blue-50/50 text-blue-900 dark:bg-blue-950/40 dark:text-blue-200 dark:border-blue-500 shadow-sm"
                              : "border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/40 text-slate-700 dark:text-slate-300 hover:border-slate-300"
                          }`}
                        >
                          <span>{opt.option_text}</span>
                          <span
                            className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                              isSelected
                                ? "border-blue-600 bg-blue-600 text-white"
                                : "border-slate-300 dark:border-slate-600"
                            }`}
                          >
                            {isSelected && <span className="w-1.5 h-1.5 bg-white rounded-full" />}
                          </span>
                        </button>
                      );
                    } else {
                      // Result or Voted View
                      return (
                        <div
                          key={opt.id}
                          className={`p-3 rounded-xl border text-xs space-y-1.5 ${
                            isUserVotedThis
                              ? "border-blue-300 dark:border-blue-700 bg-blue-50/30 dark:bg-blue-950/20"
                              : "border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30"
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-slate-800 dark:text-slate-200">
                                {opt.option_text}
                              </span>
                              {isUserVotedThis && (
                                <span className="text-[10px] px-1.5 py-0.2 rounded bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 font-bold">
                                  Your Choice
                                </span>
                              )}
                            </div>
                            {poll.show_results && (
                              <span className="font-bold text-slate-900 dark:text-white">
                                {opt.percentage || 0}% ({opt.vote_count || 0})
                              </span>
                            )}
                          </div>

                          {poll.show_results && (
                            <div className="w-full bg-slate-200 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all duration-500 ${
                                  isUserVotedThis ? "bg-blue-600" : "bg-slate-400 dark:bg-slate-500"
                                }`}
                                style={{ width: `${opt.percentage || 0}%` }}
                              />
                            </div>
                          )}
                        </div>
                      );
                    }
                  })}
                </div>

                {/* Footer Action */}
                {!hasVoted && !isClosed ? (
                  <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800">
                    <span className="text-[11px] text-slate-400">
                      {poll.poll_type === "SINGLE_CHOICE"
                        ? "Select 1 option"
                        : "Select one or more options"}
                    </span>

                    <button
                      type="button"
                      disabled={votingPollId === poll.id || (selectedOptions[poll.id] || []).length === 0}
                      onClick={() => handleCastVote(poll)}
                      className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-bold shadow-sm transition flex items-center gap-1.5"
                    >
                      {votingPollId === poll.id && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                      <span>Submit Vote</span>
                    </button>
                  </div>
                ) : (
                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-500">
                    {hasVoted ? (
                      <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-semibold">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>You cast your vote in this poll</span>
                      </div>
                    ) : (
                      <span className="text-slate-400">Voting is concluded</span>
                    )}

                    {!poll.show_results && (
                      <span className="text-slate-400 italic">
                        Results will be published after poll concludes
                      </span>
                    )}

                    {poll.show_results && (
                      <div className="flex items-center gap-1 text-slate-500">
                        <Users className="w-3.5 h-3.5" />
                        <span>{poll.total_votes || 0} Total Votes</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
