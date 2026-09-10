import { NextResponse } from "next/server";
import { requireSocietyAccess } from "@/lib/auth/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { recordAuditLog } from "@/lib/auth/audit";
import { roleHasPermission } from "@/lib/auth/permissions";
import { UpdatePollSchema } from "@/lib/validations/polls";
import { sendDomainNotification } from "@/lib/services/notificationService";
import { z } from "zod";

export const dynamic = "force-dynamic";

export async function GET(
  req: Request,
  context: { params: Promise<{ societyId: string; pollId: string }> }
) {
  try {
    const { societyId, pollId } = await context.params;
    const { identity } = await requireSocietyAccess(societyId);

    if (!roleHasPermission(identity.currentRole, "polls.view")) {
      return NextResponse.json({ error: "Forbidden: requires polls.view permission" }, { status: 403 });
    }

    if (!z.string().uuid().safeParse(pollId).success) {
      return NextResponse.json({ error: "Invalid poll ID" }, { status: 400 });
    }

    const adminClient = createAdminClient();
    const canManage = roleHasPermission(identity.currentRole, "polls.manage");

    // Fetch poll
    const { data: poll, error: pollErr } = await adminClient
      .from("society_polls")
      .select(`
        *,
        creator:profiles!society_polls_created_by_fkey (
          id,
          full_name,
          display_name
        )
      `)
      .eq("id", pollId)
      .eq("society_id", societyId)
      .single();

    if (pollErr || !poll) {
      return NextResponse.json({ error: "Poll not found" }, { status: 404 });
    }

    // Audience access validation for non-managers
    if (!canManage) {
      if (poll.status === "DRAFT") {
        return NextResponse.json({ error: "Poll is still in draft" }, { status: 403 });
      }

      if (poll.target_audience === "OWNERS_ONLY" && identity.currentRole !== "OWNER") {
        return NextResponse.json({ error: "Poll is exclusively for property owners" }, { status: 403 });
      }

      if (
        poll.target_audience === "COMMITTEE_ONLY" &&
        (!identity.currentRole || !["COMMITTEE_MEMBER", "SECRETARY", "TREASURER"].includes(identity.currentRole as string))
      ) {
        return NextResponse.json({ error: "Poll is exclusively for committee members" }, { status: 403 });
      }
    }

    // Fetch options
    const { data: options } = await adminClient
      .from("poll_options")
      .select("*")
      .eq("poll_id", pollId)
      .order("display_order", { ascending: true });

    // Fetch votes
    const { data: votes } = await adminClient
      .from("poll_votes")
      .select(`
        *,
        user:profiles!poll_votes_user_id_fkey (
          id,
          full_name,
          display_name
        )
      `)
      .eq("poll_id", pollId);

    const voteCounts: Record<string, number> = {};
    const uniqueVoters = new Set<string>();
    let userHasVoted = false;
    const userVotedOptionIds: string[] = [];

    (votes || []).forEach((v) => {
      voteCounts[v.option_id] = (voteCounts[v.option_id] || 0) + 1;
      uniqueVoters.add(v.user_id);
      if (v.user_id === identity.effectiveUser.id) {
        userHasVoted = true;
        userVotedOptionIds.push(v.option_id);
      }
    });

    const totalVotes = (votes || []).length;

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

    const optionsWithCounts = (options || []).map((opt) => ({
      ...opt,
      vote_count: showResults ? (voteCounts[opt.id] || 0) : undefined,
      percentage: showResults && totalVotes > 0 ? Math.round(((voteCounts[opt.id] || 0) / totalVotes) * 100) : 0,
    }));

    // Mask voter identities if anonymous, unless super admin or non-anonymous
    let voterLedger = undefined;
    if (canManage && !poll.is_anonymous) {
      voterLedger = votes;
    }

    return NextResponse.json({
      poll: {
        ...poll,
        options: optionsWithCounts,
        total_votes: showResults ? totalVotes : undefined,
        unique_voters_count: showResults ? uniqueVoters.size : undefined,
        has_voted: userHasVoted,
        user_voted_option_ids: userVotedOptionIds,
        show_results: showResults,
        voters: voterLedger,
      },
    });
  } catch (err: any) {
    console.error("[API/society/polls/[pollId] GET]", err);
    return NextResponse.json({ error: err?.message || "Internal Server Error" }, { status: 500 });
  }
}

export async function PATCH(
  req: Request,
  context: { params: Promise<{ societyId: string; pollId: string }> }
) {
  try {
    const { societyId, pollId } = await context.params;
    const { identity } = await requireSocietyAccess(societyId);

    if (!roleHasPermission(identity.currentRole, "polls.manage")) {
      return NextResponse.json({ error: "Forbidden: requires polls.manage permission" }, { status: 403 });
    }

    if (!z.string().uuid().safeParse(pollId).success) {
      return NextResponse.json({ error: "Invalid poll ID" }, { status: 400 });
    }

    const body = await req.json();
    const parsed = UpdatePollSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 400 });
    }

    const adminClient = createAdminClient();

    const { data: existing, error: existingErr } = await adminClient
      .from("society_polls")
      .select("*")
      .eq("id", pollId)
      .eq("society_id", societyId)
      .single();

    if (existingErr || !existing) {
      return NextResponse.json({ error: "Poll not found" }, { status: 404 });
    }

    const { data: updated, error: updateErr } = await adminClient
      .from("society_polls")
      .update({
        ...parsed.data,
        updated_by: identity.effectiveUser.id,
        updated_at: new Date().toISOString(),
      })
      .eq("id", pollId)
      .select()
      .single();

    if (updateErr) {
      console.error("[API/society/polls/[pollId] PATCH]", updateErr);
      return NextResponse.json({ error: "Failed to update poll" }, { status: 500 });
    }

    // If status changed to CLOSED, notify members if results are public
    if (parsed.data.status === "CLOSED" && existing.status !== "CLOSED") {
      if (existing.results_visibility !== "ADMIN_ONLY") {
        const { data: members } = await adminClient
          .from("society_memberships")
          .select("user_id")
          .eq("society_id", societyId)
          .eq("status", "ACTIVE");

        if (members && members.length > 0) {
          await sendDomainNotification({
            societyId,
            recipientIds: members.map((m) => m.user_id),
            type: "POLL_CLOSED_RESULTS",
            category: "GENERAL",
            actorId: identity.effectiveUser.id,
            data: {
              pollTitle: updated.title,
              pollId: updated.id,
              societyId,
            },
          });
        }
      }
    }

    await recordAuditLog({
      actorUserId: identity.originalUser.id,
      effectiveUserId: identity.effectiveUser.id,
      societyId,
      action: parsed.data.status === "CLOSED" ? "POLL_CLOSED" : "POLL_UPDATED",
      resourceType: "society_poll",
      resourceId: pollId,
      metadata: {
        previous_status: existing.status,
        new_status: updated.status,
        changes: Object.keys(parsed.data),
      },
    });

    return NextResponse.json({ success: true, poll: updated });
  } catch (err: any) {
    console.error("[API/society/polls/[pollId] PATCH]", err);
    return NextResponse.json({ error: err?.message || "Internal Server Error" }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  context: { params: Promise<{ societyId: string; pollId: string }> }
) {
  try {
    const { societyId, pollId } = await context.params;
    const { identity } = await requireSocietyAccess(societyId);

    if (!roleHasPermission(identity.currentRole, "polls.manage")) {
      return NextResponse.json({ error: "Forbidden: requires polls.manage permission" }, { status: 403 });
    }

    if (!z.string().uuid().safeParse(pollId).success) {
      return NextResponse.json({ error: "Invalid poll ID" }, { status: 400 });
    }

    const adminClient = createAdminClient();

    // Check if votes exist
    const { count: votesCount } = await adminClient
      .from("poll_votes")
      .select("*", { count: "exact", head: true })
      .eq("poll_id", pollId);

    if (votesCount && votesCount > 0) {
      // Instead of hard delete, cancel poll to preserve audit trail
      await adminClient
        .from("society_polls")
        .update({ status: "CANCELLED", updated_at: new Date().toISOString() })
        .eq("id", pollId);

      return NextResponse.json({ success: true, message: "Poll has votes and was marked as CANCELLED" });
    }

    // Safe to delete if no votes cast
    const { error: delErr } = await adminClient
      .from("society_polls")
      .delete()
      .eq("id", pollId)
      .eq("society_id", societyId);

    if (delErr) {
      return NextResponse.json({ error: "Failed to delete poll" }, { status: 500 });
    }

    await recordAuditLog({
      actorUserId: identity.originalUser.id,
      effectiveUserId: identity.effectiveUser.id,
      societyId,
      action: "POLL_DELETED",
      resourceType: "society_poll",
      resourceId: pollId,
      metadata: {},
    });

    return NextResponse.json({ success: true, message: "Poll deleted successfully" });
  } catch (err: any) {
    console.error("[API/society/polls/[pollId] DELETE]", err);
    return NextResponse.json({ error: err?.message || "Internal Server Error" }, { status: 500 });
  }
}
