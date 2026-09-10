import { NextResponse } from "next/server";
import { requireSocietyAccess } from "@/lib/auth/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { recordAuditLog } from "@/lib/auth/audit";
import { roleHasPermission } from "@/lib/auth/permissions";
import { sendDomainNotification } from "@/lib/services/notificationService";

export const dynamic = "force-dynamic";

export async function POST(
  req: Request,
  context: { params: Promise<{ societyId: string }> }
) {
  try {
    const { societyId } = await context.params;
    const { identity } = await requireSocietyAccess(societyId);

    if (!roleHasPermission(identity.currentRole, "reminders.manage")) {
      return NextResponse.json({ error: "Forbidden: requires reminders.manage permission" }, { status: 403 });
    }

    const adminClient = createAdminClient();
    const nowIso = new Date().toISOString();

    // Query pending reminders scheduled on or before now
    const { data: dueReminders, error: remErr } = await adminClient
      .from("activity_reminders")
      .select("*")
      .eq("society_id", societyId)
      .eq("status", "PENDING")
      .lte("scheduled_at", nowIso);

    if (remErr) {
      console.error("[API/reminders/dispatch] Error fetching due reminders:", remErr);
      return NextResponse.json({ error: "Failed to fetch reminders" }, { status: 500 });
    }

    if (!dueReminders || dueReminders.length === 0) {
      return NextResponse.json({
        success: true,
        dispatched_count: 0,
        message: "No pending reminders are currently due",
      });
    }

    let totalDispatched = 0;

    for (const reminder of dueReminders) {
      try {
        let recipientIds: string[] = [];

        if (reminder.target_type === "EVENT") {
          // Fetch event
          const { data: event } = await adminClient
            .from("society_events")
            .select("id, title, location, event_date, start_time, status, target_audience")
            .eq("id", reminder.target_id)
            .single();

          if (!event || ["CANCELLED", "COMPLETED"].includes(event.status)) {
            // Cancel reminder if event is cancelled or completed
            await adminClient
              .from("activity_reminders")
              .update({ status: "CANCELLED", updated_at: nowIso })
              .eq("id", reminder.id);
            continue;
          }

          if (reminder.audience === "RSVP_GOING") {
            const { data: rsvps } = await adminClient
              .from("event_rsvps")
              .select("user_id")
              .eq("event_id", reminder.target_id)
              .eq("response", "GOING");

            recipientIds = (rsvps || []).map((r) => r.user_id);
          } else {
            // ALL_ELIGIBLE
            let memberQuery = adminClient
              .from("society_memberships")
              .select("user_id")
              .eq("society_id", societyId)
              .eq("status", "ACTIVE");

            if (event.target_audience === "OWNERS_ONLY") {
              memberQuery = memberQuery.eq("role_id", "OWNER");
            } else if (event.target_audience === "COMMITTEE_ONLY") {
              memberQuery = memberQuery.in("role_id", ["SECRETARY", "COMMITTEE_MEMBER", "TREASURER"]);
            }

            const { data: members } = await memberQuery;
            recipientIds = (members || []).map((m) => m.user_id);
          }

          if (recipientIds.length > 0) {
            await sendDomainNotification({
              societyId,
              recipientIds,
              type: "EVENT_REMINDER",
              category: "EVENTS",
              actorId: identity.effectiveUser.id,
              data: {
                eventTitle: event.title,
                eventId: event.id,
                location: event.location,
                timeRemaining: reminder.trigger_offset_hours ? `in ${reminder.trigger_offset_hours} hours` : "shortly",
                societyId,
              },
            });
          }
        } else if (reminder.target_type === "POLL") {
          // Fetch poll
          const { data: poll } = await adminClient
            .from("society_polls")
            .select("id, title, status, target_audience, ends_at")
            .eq("id", reminder.target_id)
            .single();

          if (!poll || poll.status !== "PUBLISHED") {
            await adminClient
              .from("activity_reminders")
              .update({ status: "CANCELLED", updated_at: nowIso })
              .eq("id", reminder.id);
            continue;
          }

          // Eligible members
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

          const { data: members } = await memberQuery;
          const eligibleUserIds = (members || []).map((m) => m.user_id);

          if (reminder.audience === "NON_VOTERS") {
            // Find who already voted
            const { data: votedUsers } = await adminClient
              .from("poll_votes")
              .select("user_id")
              .eq("poll_id", reminder.target_id);

            const votedSet = new Set((votedUsers || []).map((v) => v.user_id));
            recipientIds = eligibleUserIds.filter((uid) => !votedSet.has(uid));
          } else {
            recipientIds = eligibleUserIds;
          }

          if (recipientIds.length > 0) {
            await sendDomainNotification({
              societyId,
              recipientIds,
              type: "POLL_REMINDER_CLOSING",
              category: "GENERAL",
              actorId: identity.effectiveUser.id,
              data: {
                pollTitle: poll.title,
                pollId: poll.id,
                timeRemaining: reminder.trigger_offset_hours ? `in ${reminder.trigger_offset_hours} hours` : "soon",
                societyId,
              },
            });
          }
        }

        // Mark reminder as SENT
        await adminClient
          .from("activity_reminders")
          .update({
            status: "SENT",
            sent_at: nowIso,
            recipients_count: recipientIds.length,
            updated_at: nowIso,
          })
          .eq("id", reminder.id);

        totalDispatched++;
      } catch (err: any) {
        console.error(`[API/reminders/dispatch] Error processing reminder ${reminder.id}:`, err);
        await adminClient
          .from("activity_reminders")
          .update({ status: "FAILED", updated_at: nowIso })
          .eq("id", reminder.id);
      }
    }

    await recordAuditLog({
      actorUserId: identity.originalUser.id,
      effectiveUserId: identity.effectiveUser.id,
      societyId,
      action: "ACTIVITY_REMINDERS_DISPATCHED",
      resourceType: "activity_reminder",
      resourceId: societyId,
      metadata: { total_dispatched: totalDispatched },
    });

    return NextResponse.json({
      success: true,
      dispatched_count: totalDispatched,
      message: `Dispatched ${totalDispatched} activity reminders successfully`,
    });
  } catch (err: any) {
    console.error("[API/reminders/dispatch POST]", err);
    return NextResponse.json({ error: err?.message || "Internal Server Error" }, { status: 500 });
  }
}
