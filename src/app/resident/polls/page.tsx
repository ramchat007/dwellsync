import React from "react";
import { redirect } from "next/navigation";
import { getCurrentIdentity } from "@/lib/auth/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { ResidentPollsClient } from "./ResidentPollsClient";

export const dynamic = "force-dynamic";

export default async function ResidentPollsPage() {
  const identity = await getCurrentIdentity();
  if (!identity || !identity.isAuthenticated) {
    redirect("/login");
  }

  const society = identity.currentSociety;
  if (!society) {
    return (
      <div className="p-8 max-w-4xl mx-auto text-center space-y-4">
        <h2 className="text-xl font-bold text-slate-800 dark:text-slate-200">
          No Society Context Found
        </h2>
      </div>
    );
  }

  const adminClient = createAdminClient();

  // Query polls eligible for this resident
  let query = adminClient
    .from("society_polls")
    .select(`
      *,
      creator:profiles!society_polls_created_by_fkey (
        id,
        full_name,
        display_name
      )
    `)
    .eq("society_id", society.id)
    .in("status", ["PUBLISHED", "CLOSED"])
    .order("created_at", { ascending: false });

  if (identity.currentRole === "OWNER") {
    query = query.in("target_audience", ["ALL_RESIDENTS", "OWNERS_ONLY"]);
  } else if (identity.currentRole && ["COMMITTEE_MEMBER", "SECRETARY", "TREASURER"].includes(identity.currentRole as string)) {
    query = query.in("target_audience", ["ALL_RESIDENTS", "COMMITTEE_ONLY"]);
  } else {
    query = query.eq("target_audience", "ALL_RESIDENTS");
  }

  const { data: polls } = await query;

  let enrichedPolls = polls || [];
  if (polls && polls.length > 0) {
    const pollIds = polls.map((p) => p.id);

    const { data: allOptions } = await adminClient
      .from("poll_options")
      .select("*")
      .in("poll_id", pollIds)
      .order("display_order", { ascending: true });

    const { data: allVotes } = await adminClient
      .from("poll_votes")
      .select("id, poll_id, option_id, user_id")
      .in("poll_id", pollIds);

    const optionsByPoll: Record<string, any[]> = {};
    (allOptions || []).forEach((opt) => {
      if (!optionsByPoll[opt.poll_id]) optionsByPoll[opt.poll_id] = [];
      optionsByPoll[opt.poll_id].push(opt);
    });

    const votesByPoll: Record<string, any[]> = {};
    (allVotes || []).forEach((vote) => {
      if (!votesByPoll[vote.poll_id]) votesByPoll[vote.poll_id] = [];
      votesByPoll[vote.poll_id].push(vote);
    });

    enrichedPolls = polls.map((poll) => {
      const options = optionsByPoll[poll.id] || [];
      const votes = votesByPoll[poll.id] || [];

      const voteCounts: Record<string, number> = {};
      const uniqueVoters = new Set<string>();
      let userHasVoted = false;
      const userVotedOptionIds: string[] = [];

      votes.forEach((v) => {
        voteCounts[v.option_id] = (voteCounts[v.option_id] || 0) + 1;
        uniqueVoters.add(v.user_id);
        if (v.user_id === identity.effectiveUser.id) {
          userHasVoted = true;
          userVotedOptionIds.push(v.option_id);
        }
      });

      const totalVotes = votes.length;

      let showResults = false;
      if (poll.results_visibility === "ALWAYS") {
        showResults = true;
      } else if (poll.results_visibility === "AFTER_VOTING" && userHasVoted) {
        showResults = true;
      } else if (poll.results_visibility === "AFTER_CLOSE" && poll.status === "CLOSED") {
        showResults = true;
      }

      const optionsWithCounts = options.map((opt) => ({
        ...opt,
        vote_count: showResults ? (voteCounts[opt.id] || 0) : undefined,
        percentage: showResults && totalVotes > 0 ? Math.round(((voteCounts[opt.id] || 0) / totalVotes) * 100) : 0,
      }));

      return {
        ...poll,
        options: optionsWithCounts,
        total_votes: showResults ? totalVotes : undefined,
        unique_voters_count: showResults ? uniqueVoters.size : undefined,
        has_voted: userHasVoted,
        user_voted_option_ids: userVotedOptionIds,
        show_results: showResults,
      };
    });
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      <ResidentPollsClient initialPolls={enrichedPolls} society={society} />
    </div>
  );
}
