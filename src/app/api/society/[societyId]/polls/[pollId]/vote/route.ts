import { NextResponse } from "next/server";
import { requireSocietyAccess } from "@/lib/auth/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { recordAuditLog } from "@/lib/auth/audit";
import { roleHasPermission } from "@/lib/auth/permissions";
import { CastVoteSchema } from "@/lib/validations/polls";
import { z } from "zod";

export const dynamic = "force-dynamic";

export async function POST(
  req: Request,
  context: { params: Promise<{ societyId: string; pollId: string }> }
) {
  try {
    const { societyId, pollId } = await context.params;
    const { identity } = await requireSocietyAccess(societyId);

    if (!roleHasPermission(identity.currentRole, "polls.vote")) {
      return NextResponse.json({ error: "Forbidden: requires polls.vote permission" }, { status: 403 });
    }

    if (!z.string().uuid().safeParse(pollId).success) {
      return NextResponse.json({ error: "Invalid poll ID" }, { status: 400 });
    }

    const body = await req.json();
    const parsed = CastVoteSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 400 });
    }

    const adminClient = createAdminClient();

    // 1. Fetch poll
    const { data: poll, error: pollErr } = await adminClient
      .from("society_polls")
      .select("id, title, poll_type, target_audience, is_anonymous, starts_at, ends_at, status")
      .eq("id", pollId)
      .eq("society_id", societyId)
      .single();

    if (pollErr || !poll) {
      return NextResponse.json({ error: "Poll not found" }, { status: 404 });
    }

    // 2. Lifecycle & timing verification
    if (poll.status !== "PUBLISHED") {
      return NextResponse.json({ error: `Voting is not open. Poll status is ${poll.status}` }, { status: 400 });
    }

    const now = new Date();
    if (poll.starts_at && now < new Date(poll.starts_at)) {
      return NextResponse.json({ error: "Voting has not started yet" }, { status: 400 });
    }

    if (now > new Date(poll.ends_at)) {
      return NextResponse.json({ error: "Voting for this poll has concluded" }, { status: 400 });
    }

    // 3. Audience eligibility check
    if (poll.target_audience === "OWNERS_ONLY" && identity.currentRole !== "OWNER") {
      return NextResponse.json({ error: "Only property owners are eligible to vote in this poll" }, { status: 403 });
    }

    if (
      poll.target_audience === "COMMITTEE_ONLY" &&
      (!identity.currentRole || !["COMMITTEE_MEMBER", "SECRETARY", "TREASURER"].includes(identity.currentRole as string))
    ) {
      return NextResponse.json({ error: "Only committee members are eligible to vote in this poll" }, { status: 403 });
    }

    // 4. Check if user has already voted
    const { data: priorVotes } = await adminClient
      .from("poll_votes")
      .select("id")
      .eq("poll_id", pollId)
      .eq("user_id", identity.effectiveUser.id);

    if (priorVotes && priorVotes.length > 0) {
      return NextResponse.json({ error: "You have already cast your vote in this poll" }, { status: 400 });
    }

    // 5. Choice cardinality check
    if (poll.poll_type === "SINGLE_CHOICE" && parsed.data.option_ids.length > 1) {
      return NextResponse.json({ error: "Single-choice polls allow only 1 option to be selected" }, { status: 400 });
    }

    // 6. Validate that all selected options belong to this poll
    const { data: validOptions } = await adminClient
      .from("poll_options")
      .select("id")
      .eq("poll_id", pollId)
      .in("id", parsed.data.option_ids);

    if (!validOptions || validOptions.length !== parsed.data.option_ids.length) {
      return NextResponse.json({ error: "One or more selected options are invalid for this poll" }, { status: 400 });
    }

    // 7. Insert vote records
    const voteRows = parsed.data.option_ids.map((optId) => ({
      society_id: societyId,
      poll_id: pollId,
      option_id: optId,
      user_id: identity.effectiveUser.id,
    }));

    const { error: insertVoteErr } = await adminClient
      .from("poll_votes")
      .insert(voteRows);

    if (insertVoteErr) {
      console.error("[API/society/polls/[pollId]/vote POST]", insertVoteErr);
      return NextResponse.json({ error: "Failed to record your vote" }, { status: 500 });
    }

    // 8. Audit log (anonymized metadata if is_anonymous is true)
    await recordAuditLog({
      actorUserId: identity.originalUser.id,
      effectiveUserId: identity.effectiveUser.id,
      societyId,
      action: "POLL_VOTE_CAST",
      resourceType: "society_poll",
      resourceId: pollId,
      metadata: {
        poll_id: pollId,
        poll_title: poll.title,
        options_count: parsed.data.option_ids.length,
        is_anonymous: poll.is_anonymous,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Your vote has been recorded successfully",
      voted_option_ids: parsed.data.option_ids,
    });
  } catch (err: any) {
    console.error("[API/society/polls/[pollId]/vote POST]", err);
    return NextResponse.json({ error: err?.message || "Internal Server Error" }, { status: 500 });
  }
}
