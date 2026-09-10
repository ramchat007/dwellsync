import { NextResponse } from "next/server";
import { requireSocietyAccess } from "@/lib/auth/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { recordAuditLog } from "@/lib/auth/audit";
import { roleHasPermission } from "@/lib/auth/permissions";
import { CreatePollSchema } from "@/lib/validations/polls";
import { sendDomainNotification } from "@/lib/services/notificationService";

export const dynamic = "force-dynamic";

export async function GET(
  req: Request,
  context: { params: Promise<{ societyId: string }> }
) {
  try {
    const { societyId } = await context.params;
    const { identity } = await requireSocietyAccess(societyId);

    if (!roleHasPermission(identity.currentRole, "polls.view")) {
      return NextResponse.json({ error: "Forbidden: requires polls.view permission" }, { status: 403 });
    }

    const adminClient = createAdminClient();
    const canManage = roleHasPermission(identity.currentRole, "polls.manage");

    // Fetch polls based on role and audience
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
      .eq("society_id", societyId)
      .order("created_at", { ascending: false });

    if (!canManage) {
      query = query.in("status", ["PUBLISHED", "CLOSED"]);

      // Filter by audience
      if (identity.currentRole === "OWNER") {
        query = query.in("target_audience", ["ALL_RESIDENTS", "OWNERS_ONLY"]);
      } else if (identity.currentRole && ["COMMITTEE_MEMBER", "SECRETARY", "TREASURER"].includes(identity.currentRole as string)) {
        // Committee can see ALL_RESIDENTS and COMMITTEE_ONLY
        query = query.in("target_audience", ["ALL_RESIDENTS", "COMMITTEE_ONLY"]);
      } else {
        // General resident/tenant
        query = query.eq("target_audience", "ALL_RESIDENTS");
      }
    }

    const { data: polls, error } = await query;

    if (error) {
      console.error("[API/society/polls GET]", error);
      return NextResponse.json({ error: "Failed to fetch polls" }, { status: 500 });
    }

    if (!polls || polls.length === 0) {
      return NextResponse.json({ polls: [] });
    }

    const pollIds = polls.map((p) => p.id);

    // Fetch options for all polls
    const { data: allOptions } = await adminClient
      .from("poll_options")
      .select("*")
      .in("poll_id", pollIds)
      .order("display_order", { ascending: true });

    // Fetch votes for all polls
    const { data: allVotes } = await adminClient
      .from("poll_votes")
      .select("id, poll_id, option_id, user_id")
      .in("poll_id", pollIds);

    // Group options and votes by poll
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

    const enrichedPolls = polls.map((poll) => {
      const options = optionsByPoll[poll.id] || [];
      const votes = votesByPoll[poll.id] || [];

      // Calculate vote counts per option
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

      // Determine if results are visible to this user
      let showResults = false;
      if (canManage) {
        showResults = true;
      } else if (poll.results_visibility === "ALWAYS") {
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

    return NextResponse.json({ polls: enrichedPolls });
  } catch (err: any) {
    console.error("[API/society/polls GET]", err);
    return NextResponse.json({ error: err?.message || "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(
  req: Request,
  context: { params: Promise<{ societyId: string }> }
) {
  try {
    const { societyId } = await context.params;
    const { identity } = await requireSocietyAccess(societyId);

    if (!roleHasPermission(identity.currentRole, "polls.manage")) {
      return NextResponse.json({ error: "Forbidden: requires polls.manage permission" }, { status: 403 });
    }

    const body = await req.json();
    const parsed = CreatePollSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 400 });
    }

    const adminClient = createAdminClient();
    const { options, reminder_offset_hours, ...pollData } = parsed.data;

    // 1. Insert poll record
    const { data: poll, error: pollErr } = await adminClient
      .from("society_polls")
      .insert({
        society_id: societyId,
        title: pollData.title,
        description: pollData.description || null,
        question: pollData.question,
        poll_type: pollData.poll_type,
        target_audience: pollData.target_audience,
        is_anonymous: pollData.is_anonymous,
        results_visibility: pollData.results_visibility,
        starts_at: pollData.starts_at || new Date().toISOString(),
        ends_at: pollData.ends_at,
        status: pollData.status || "PUBLISHED",
        created_by: identity.effectiveUser.id,
      })
      .select()
      .single();

    if (pollErr || !poll) {
      console.error("[API/society/polls POST] Error inserting poll:", pollErr);
      return NextResponse.json({ error: "Failed to create poll" }, { status: 500 });
    }

    // 2. Insert options
    const optionRows = options.map((optText, idx) => ({
      society_id: societyId,
      poll_id: poll.id,
      option_text: optText,
      display_order: idx + 1,
    }));

    const { data: createdOptions, error: optErr } = await adminClient
      .from("poll_options")
      .insert(optionRows)
      .select();

    if (optErr) {
      console.error("[API/society/polls POST] Error inserting options:", optErr);
      return NextResponse.json({ error: "Failed to create poll options" }, { status: 500 });
    }

    // 3. Schedule auto-reminders before closing if specified
    if (reminder_offset_hours && reminder_offset_hours.length > 0 && poll) {
      const closingDate = new Date(poll.ends_at);
      const reminderRows = reminder_offset_hours.map((offset) => {
        const scheduledTime = new Date(closingDate.getTime() - offset * 60 * 60 * 1000);
        return {
          society_id: societyId,
          target_type: "POLL",
          target_id: poll.id,
          reminder_type: "HOURS_BEFORE_END",
          trigger_offset_hours: offset,
          scheduled_at: scheduledTime.toISOString(),
          audience: "ALL_ELIGIBLE",
          status: "PENDING",
          created_by: identity.effectiveUser.id,
        };
      });

      await adminClient.from("activity_reminders").insert(reminderRows);
    }

    // 4. If poll is published, notify eligible society members
    if (poll.status === "PUBLISHED") {
      let memberQuery = adminClient
        .from("society_memberships")
        .select("user_id")
        .eq("society_id", societyId)
        .eq("status", "ACTIVE");

      if (poll.target_audience === "OWNERS_ONLY") {
        memberQuery = memberQuery.eq("role_id", "OWNER");
      } else if (poll.target_audience === "COMMITTEE_ONLY") {
        memberQuery = memberQuery.in("role_id", ["SECRETARY", "COMMITTEE_MEMBER", "TREASURER"]);
      }

      const { data: eligibleMembers } = await memberQuery;
      if (eligibleMembers && eligibleMembers.length > 0) {
        const recipientIds = eligibleMembers.map((m) => m.user_id);
        const formattedClose = new Date(poll.ends_at).toLocaleString("en-IN", {
          dateStyle: "medium",
          timeStyle: "short",
        });

        await sendDomainNotification({
          societyId,
          recipientIds,
          type: "POLL_PUBLISHED",
          category: "GENERAL",
          actorId: identity.effectiveUser.id,
          data: {
            pollTitle: poll.title,
            pollId: poll.id,
            closesAt: formattedClose,
            societyId,
          },
        });
      }
    }

    await recordAuditLog({
      actorUserId: identity.originalUser.id,
      effectiveUserId: identity.effectiveUser.id,
      societyId,
      action: "POLL_CREATED",
      resourceType: "society_poll",
      resourceId: poll.id,
      metadata: {
        title: poll.title,
        poll_type: poll.poll_type,
        target_audience: poll.target_audience,
        is_anonymous: poll.is_anonymous,
        options_count: options.length,
      },
    });

    return NextResponse.json({
      success: true,
      poll: {
        ...poll,
        options: createdOptions || [],
      },
    }, { status: 201 });
  } catch (err: any) {
    console.error("[API/society/polls POST]", err);
    return NextResponse.json({ error: err?.message || "Internal Server Error" }, { status: 500 });
  }
}
