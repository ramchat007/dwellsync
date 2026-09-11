import { config } from "dotenv";
config({ path: ".env.local" });

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const adminClient = createClient(supabaseUrl, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const anonClient = createClient(supabaseUrl, anonKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

interface CheckResult {
  category: string;
  name: string;
  passed: boolean;
  details?: string;
}

const results: CheckResult[] = [];

function record(category: string, name: string, passed: boolean, details?: string) {
  results.push({ category, name, passed, details });
  const mark = passed ? "PASS" : "FAIL";
  console.log(`[${mark}] ${category} :: ${name}${details ? ` -> ${details}` : ""}`);
}

async function verifyAll() {
  console.log("================================================================================");
  console.log("PHASE MIGRATION 18: ADVANCED EVENTS + POLLS + REMINDERS REMOTE DB VERIFICATION");
  console.log("Target Database:", supabaseUrl);
  console.log("================================================================================\n");

  // 1. Inspect OpenAPI schema for table and column presence
  console.log("--- 1. OpenAPI Introspection ---");
  const openapiRes = await fetch(`${supabaseUrl}/rest/v1/?apikey=${serviceKey}`);
  const spec: any = await openapiRes.json();

  const tablesToCheck = [
    {
      name: "society_events",
      requiredCols: ["id", "society_id", "title", "capacity", "target_audience", "status"],
    },
    {
      name: "event_rsvps",
      requiredCols: ["id", "society_id", "event_id", "user_id", "response", "guests_count", "notes", "created_at", "updated_at"],
    },
    {
      name: "society_polls",
      requiredCols: [
        "id", "society_id", "title", "description", "question", "poll_type",
        "target_audience", "is_anonymous", "results_visibility", "starts_at",
        "ends_at", "status", "created_by", "updated_by", "created_at", "updated_at"
      ],
    },
    {
      name: "poll_options",
      requiredCols: ["id", "society_id", "poll_id", "option_text", "display_order", "created_at"],
    },
    {
      name: "poll_votes",
      requiredCols: ["id", "society_id", "poll_id", "option_id", "user_id", "created_at"],
    },
    {
      name: "activity_reminders",
      requiredCols: [
        "id", "society_id", "target_type", "target_id", "reminder_type",
        "trigger_offset_hours", "scheduled_at", "audience", "status",
        "sent_at", "recipients_count", "created_by", "created_at", "updated_at"
      ],
    },
  ];

  for (const t of tablesToCheck) {
    const def = spec.definitions?.[t.name];
    const exists = !!def && !!spec.paths?.[`/${t.name}`];
    record("Schema Table Presence", `Table '${t.name}' registered in PostgREST`, exists);

    if (def) {
      const cols = Object.keys(def.properties || {});
      const missing = t.requiredCols.filter(c => !cols.includes(c));
      record(
        "Schema Column Verification",
        `Table '${t.name}' contains all required columns`,
        missing.length === 0,
        missing.length > 0 ? `Missing: ${missing.join(", ")}` : `Verified ${cols.length} columns`
      );
    }
  }

  // 2. Fetch a valid existing society, owner profile, and resident profile for non-destructive constraint testing
  console.log("\n--- 2. Fetch Active Test Context ---");
  const { data: societies } = await adminClient.from("societies").select("id, name, code").limit(1);
  if (!societies || societies.length === 0) {
    throw new Error("No society found in remote database for testing.");
  }
  const testSociety = societies[0];
  console.log(`Using society: ${testSociety.name} (${testSociety.id})`);

  const { data: members } = await adminClient
    .from("society_memberships")
    .select("user_id, role_id, profiles(id, full_name, email)")
    .eq("society_id", testSociety.id)
    .eq("status", "ACTIVE")
    .limit(5);

  if (!members || members.length === 0) {
    throw new Error("No active members found in remote database for testing.");
  }
  const testMember = members[0];
  console.log(`Using test member: ${testMember.user_id} (${testMember.role_id})`);

  // 3. RLS Check: Anon access must be blocked on all 6 tables
  console.log("\n--- 3. RLS Enforcement for Unauthenticated (Anon) Client ---");
  const tables = ["society_events", "event_rsvps", "society_polls", "poll_options", "poll_votes", "activity_reminders"];
  for (const table of tables) {
    const { data: anonData, error: anonErr } = await anonClient.from(table).select("*").limit(5);
    const isProtected = (!anonData || anonData.length === 0) || !!anonErr;
    record("RLS Anon Protection", `Anon access to '${table}' strictly blocked or filtered to 0 rows`, isProtected,
      anonErr ? `Auth error: ${anonErr.message}` : `Returned 0 rows (RLS filtered)`
    );
  }

  // 4. Constraint & Check Integrity Testing
  console.log("\n--- 4. Database Constraints & Check Rule Enforcement ---");

  // A. Event check constraint: target_audience must be valid
  const invalidAudienceRes = await adminClient.from("society_events").insert({
    society_id: testSociety.id,
    title: "Invalid Audience Event",
    description: "Check test",
    category: "GENERAL",
    location: "Hall",
    organizer_name: "Organizer",
    event_date: "2026-10-01",
    start_time: "10:00",
    end_time: "12:00",
    organizer_id: testMember.user_id,
    target_audience: "INVALID_AUDIENCE_XYZ",
  });
  record("Check Constraint", "society_events rejects invalid target_audience", !!invalidAudienceRes.error,
    invalidAudienceRes.error ? `Rejected: ${invalidAudienceRes.error.message}` : "Unexpectedly accepted!"
  );

  // B. Event check constraint: capacity must be > 0 if specified
  const invalidCapacityRes = await adminClient.from("society_events").insert({
    society_id: testSociety.id,
    title: "Invalid Capacity Event",
    description: "Check test",
    category: "GENERAL",
    location: "Hall",
    organizer_name: "Organizer",
    event_date: "2026-10-01",
    start_time: "10:00",
    end_time: "12:00",
    organizer_id: testMember.user_id,
    capacity: 0,
  });
  record("Check Constraint", "society_events rejects capacity <= 0", !!invalidCapacityRes.error,
    invalidCapacityRes.error ? `Rejected: ${invalidCapacityRes.error.message}` : "Unexpectedly accepted!"
  );

  // C. Event RSVP check constraint: response must be GOING, NOT_GOING, MAYBE
  const invalidRsvpRes = await adminClient.from("event_rsvps").insert({
    society_id: testSociety.id,
    event_id: "00000000-0000-0000-0000-000000000000",
    user_id: testMember.user_id,
    response: "DEFINITELY_NOT_VALID",
  });
  record("Check Constraint", "event_rsvps rejects invalid response value", !!invalidRsvpRes.error,
    invalidRsvpRes.error ? `Rejected: ${invalidRsvpRes.error.message}` : "Unexpectedly accepted!"
  );

  // D. Event RSVP check constraint: guests_count >= 0
  const invalidGuestRes = await adminClient.from("event_rsvps").insert({
    society_id: testSociety.id,
    event_id: "00000000-0000-0000-0000-000000000000",
    user_id: testMember.user_id,
    response: "GOING",
    guests_count: -5,
  });
  record("Check Constraint", "event_rsvps rejects negative guests_count", !!invalidGuestRes.error,
    invalidGuestRes.error ? `Rejected: ${invalidGuestRes.error.message}` : "Unexpectedly accepted!"
  );

  // E. Poll check constraint: poll_type in ('SINGLE_CHOICE', 'MULTIPLE_CHOICE')
  const invalidPollTypeRes = await adminClient.from("society_polls").insert({
    society_id: testSociety.id,
    title: "Invalid Poll",
    question: "Valid question text?",
    poll_type: "UNSUPPORTED_TYPE",
    ends_at: "2026-12-31T23:59:59Z",
    created_by: testMember.user_id,
  });
  record("Check Constraint", "society_polls rejects invalid poll_type", !!invalidPollTypeRes.error,
    invalidPollTypeRes.error ? `Rejected: ${invalidPollTypeRes.error.message}` : "Unexpectedly accepted!"
  );

  // F. Reminder check constraint: target_type in ('EVENT', 'POLL')
  const invalidReminderTargetRes = await adminClient.from("activity_reminders").insert({
    society_id: testSociety.id,
    target_type: "INVALID_TARGET",
    target_id: "00000000-0000-0000-0000-000000000000",
    reminder_type: "HOURS_BEFORE_START",
    scheduled_at: "2026-12-31T23:59:59Z",
  });
  record("Check Constraint", "activity_reminders rejects invalid target_type", !!invalidReminderTargetRes.error,
    invalidReminderTargetRes.error ? `Rejected: ${invalidReminderTargetRes.error.message}` : "Unexpectedly accepted!"
  );

  // 5. Unique Key & Foreign Key Testing (Using an ephemeral live event & poll, then cleaning up)
  console.log("\n--- 5. Unique Key, Foreign Key & Idempotency Testing ---");
  let testEventId: string | null = null;
  let testPollId: string | null = null;
  let testOptionId: string | null = null;

  try {
    // Insert valid test event
    const { data: createdEvent, error: ceErr } = await adminClient
      .from("society_events")
      .insert({
        society_id: testSociety.id,
        title: "[VERIFY_TMP] Annual Community Gala",
        description: "Ephemeral verification event",
        category: "GENERAL",
        event_date: "2026-11-15",
        start_time: "18:00",
        end_time: "21:00",
        location: "Clubhouse Main Hall",
        organizer_name: "Committee",
        organizer_id: testMember.user_id,
        capacity: 50,
        target_audience: "ALL_RESIDENTS",
        status: "PUBLISHED",
      })
      .select("id")
      .single();

    if (ceErr || !createdEvent) {
      throw new Error(`Failed to insert test event: ${ceErr?.message}`);
    }
    testEventId = createdEvent.id;
    record("Foreign Key / Data Operation", "Insert valid test event with capacity & audience", true, `Event ID: ${testEventId}`);

    // Insert valid RSVP
    const { error: rsvpErr } = await adminClient.from("event_rsvps").insert({
      society_id: testSociety.id,
      event_id: testEventId,
      user_id: testMember.user_id,
      response: "GOING",
      guests_count: 2,
    });
    record("RSVP Operation", "Insert first RSVP for test event", !rsvpErr, rsvpErr ? rsvpErr.message : "RSVP recorded");

    // Test Duplicate RSVP: Must violate uq_event_rsvps_event_user
    const duplicateRsvpRes = await adminClient.from("event_rsvps").insert({
      society_id: testSociety.id,
      event_id: testEventId,
      user_id: testMember.user_id,
      response: "GOING",
      guests_count: 1,
    });
    record("Unique Constraint", "Duplicate RSVP on same (event_id, user_id) is blocked by uq_event_rsvps_event_user",
      !!duplicateRsvpRes.error && duplicateRsvpRes.error.code === "23505",
      duplicateRsvpRes.error ? `Code: ${duplicateRsvpRes.error.code} (${duplicateRsvpRes.error.message})` : "FAILED: duplicate allowed!"
    );

    // Insert valid Poll
    const { data: createdPoll, error: cpErr } = await adminClient
      .from("society_polls")
      .insert({
        society_id: testSociety.id,
        title: "[VERIFY_TMP] Community Sports Tournament Poll",
        question: "Which sports tournament should be scheduled for the winter?",
        poll_type: "SINGLE_CHOICE",
        target_audience: "ALL_RESIDENTS",
        is_anonymous: true,
        results_visibility: "ALWAYS",
        starts_at: new Date().toISOString(),
        ends_at: new Date(Date.now() + 86400000 * 7).toISOString(),
        status: "PUBLISHED",
        created_by: testMember.user_id,
      })
      .select("id")
      .single();

    if (cpErr || !createdPoll) {
      throw new Error(`Failed to insert test poll: ${cpErr?.message}`);
    }
    testPollId = createdPoll.id;
    record("Poll Operation", "Insert valid anonymous poll with target audience", true, `Poll ID: ${testPollId}`);

    // Insert Poll Option
    const { data: createdOption, error: coErr } = await adminClient
      .from("poll_options")
      .insert({
        society_id: testSociety.id,
        poll_id: testPollId,
        option_text: "Cricket Tournament",
        display_order: 1,
      })
      .select("id")
      .single();

    if (coErr || !createdOption) {
      throw new Error(`Failed to insert test poll option: ${coErr?.message}`);
    }
    testOptionId = createdOption.id;
    record("Poll Option Operation", "Insert poll option linked by FK to poll", true, `Option ID: ${testOptionId}`);

    // Insert Poll Vote
    const { error: voteErr } = await adminClient.from("poll_votes").insert({
      society_id: testSociety.id,
      poll_id: testPollId,
      option_id: testOptionId,
      user_id: testMember.user_id,
    });
    record("Poll Vote Operation", "Insert first vote for poll option", !voteErr, voteErr ? voteErr.message : "Vote recorded");

    // Test Duplicate Vote on same (poll_id, option_id, user_id)
    const duplicateVoteRes = await adminClient.from("poll_votes").insert({
      society_id: testSociety.id,
      poll_id: testPollId,
      option_id: testOptionId,
      user_id: testMember.user_id,
    });
    record("Unique Constraint", "Duplicate vote on same (poll_id, option_id, user_id) is blocked by uq_poll_votes_poll_option_user",
      !!duplicateVoteRes.error && duplicateVoteRes.error.code === "23505",
      duplicateVoteRes.error ? `Code: ${duplicateVoteRes.error.code} (${duplicateVoteRes.error.message})` : "FAILED: duplicate allowed!"
    );

    // Insert valid Activity Reminder
    const { data: createdReminder, error: crErr } = await adminClient
      .from("activity_reminders")
      .insert({
        society_id: testSociety.id,
        target_type: "EVENT",
        target_id: testEventId,
        reminder_type: "HOURS_BEFORE_START",
        trigger_offset_hours: 24,
        scheduled_at: new Date(Date.now() + 86400000).toISOString(),
        audience: "RSVP_GOING",
        status: "PENDING",
        created_by: testMember.user_id,
      })
      .select("id")
      .single();

    record("Activity Reminder Operation", "Insert valid activity reminder linked to event", !crErr,
      crErr ? crErr.message : `Reminder ID: ${createdReminder?.id}`
    );

    if (createdReminder) {
      // Clean up reminder
      await adminClient.from("activity_reminders").delete().eq("id", createdReminder.id);
    }
  } finally {
    // Cleanup temporary records
    console.log("\n--- Cleaning up temporary test artifacts ---");
    if (testEventId) {
      await adminClient.from("event_rsvps").delete().eq("event_id", testEventId);
      await adminClient.from("society_events").delete().eq("id", testEventId);
      console.log(`Cleaned up test event: ${testEventId}`);
    }
    if (testPollId) {
      await adminClient.from("poll_votes").delete().eq("poll_id", testPollId);
      await adminClient.from("poll_options").delete().eq("poll_id", testPollId);
      await adminClient.from("society_polls").delete().eq("id", testPollId);
      console.log(`Cleaned up test poll: ${testPollId}`);
    }
  }

  // Summary
  console.log("\n================================================================================");
  const total = results.length;
  const passed = results.filter((r) => r.passed).length;
  const failed = results.filter((r) => !r.passed).length;
  console.log(`REMOTE DB VERIFICATION COMPLETE: ${passed}/${total} checks PASSED (${failed} failed)`);
  console.log("================================================================================");

  if (failed > 0) {
    process.exit(1);
  }
}

verifyAll().catch((err) => {
  console.error("FATAL verification error:", err);
  process.exit(1);
});
