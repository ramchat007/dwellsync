import React from "react";
import { requireSocietyAccess } from "@/lib/auth/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { PollsAdminClient } from "./PollsAdminClient";

export const dynamic = "force-dynamic";

export default async function SocietyPollsPage({
  params,
}: {
  params: Promise<{ societyId: string }>;
}) {
  const { societyId } = await params;
  const { identity } = await requireSocietyAccess(societyId);

  const adminClient = createAdminClient();

  // Fetch polls
  const { data: polls } = await adminClient
    .from("society_polls")
    .select(`
      *,
      creator:profiles!society_polls_created_by_fkey (
        id,
        full_name,
        display_name
      )
    `)
    .eq("society_id", societyId)
    .order("created_at", { ascending: false });

  let enrichedPolls = polls || [];
  if (polls && polls.length > 0) {
    const pollIds = polls.map((p) => p.id);

    const { data: options } = await adminClient
      .from("poll_options")
      .select("*")
      .in("poll_id", pollIds)
      .order("display_order", { ascending: true });

    const { data: votes } = await adminClient
      .from("poll_votes")
      .select("id, poll_id, option_id, user_id")
      .in("poll_id", pollIds);

    const optionsByPoll: Record<string, any[]> = {};
    (options || []).forEach((opt) => {
      if (!optionsByPoll[opt.poll_id]) optionsByPoll[opt.poll_id] = [];
      optionsByPoll[opt.poll_id].push(opt);
    });

    const votesByPoll: Record<string, any[]> = {};
    (votes || []).forEach((v) => {
      if (!votesByPoll[v.poll_id]) votesByPoll[v.poll_id] = [];
      votesByPoll[v.poll_id].push(v);
    });

    enrichedPolls = polls.map((poll) => {
      const pollOpts = optionsByPoll[poll.id] || [];
      const pollVotes = votesByPoll[poll.id] || [];

      const voteCounts: Record<string, number> = {};
      const uniqueVoters = new Set<string>();

      pollVotes.forEach((v) => {
        voteCounts[v.option_id] = (voteCounts[v.option_id] || 0) + 1;
        uniqueVoters.add(v.user_id);
      });

      const totalVotes = pollVotes.length;

      const optsWithCounts = pollOpts.map((opt) => ({
        ...opt,
        vote_count: voteCounts[opt.id] || 0,
        percentage: totalVotes > 0 ? Math.round(((voteCounts[opt.id] || 0) / totalVotes) * 100) : 0,
      }));

      return {
        ...poll,
        options: optsWithCounts,
        total_votes: totalVotes,
        unique_voters_count: uniqueVoters.size,
      };
    });
  }

  // Count active members in society for participation rate
  const { count: totalMembersCount } = await adminClient
    .from("society_memberships")
    .select("*", { count: "exact", head: true })
    .eq("society_id", societyId)
    .eq("status", "ACTIVE");

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <PollsAdminClient
        initialPolls={enrichedPolls}
        societyId={societyId}
        totalMembersCount={totalMembersCount || 1}
      />
    </div>
  );
}
