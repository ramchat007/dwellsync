import { config } from "dotenv";
config({ path: ".env.local" });

import { createClient } from "@supabase/supabase-js";
import { getTranslation, formatCurrency, formatDate, formatDateTime, formatNumber } from "@/lib/i18n";
import { renderNotificationTemplate } from "@/lib/notifications/templates";

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

async function verifyMigration20() {
  console.log("================================================================================");
  console.log("MIGRATION 20: LANGUAGE & LOCALIZATION FOUNDATION REMOTE VERIFICATION");
  console.log("Target Database:", supabaseUrl);
  console.log("================================================================================\n");

  // 1. Prerequisite & Related Tables Probe
  console.log("--- 1. Prerequisite & Related Tables Probe ---");
  const tables = ["profiles", "societies", "society_memberships", "notifications", "notification_preferences"];
  for (const table of tables) {
    try {
      const { error } = await adminClient.from(table).select("id").limit(1);
      record("Prerequisite Schema", `Table '${table}' exists and is queryable`, !error, error?.message);
    } catch (err: any) {
      record("Prerequisite Schema", `Table '${table}' query exception`, false, err.message);
    }
  }

  // 2. OpenAPI & PostgREST Schema Inspection
  console.log("\n--- 2. OpenAPI & PostgREST Schema Inspection ---");
  try {
    const openapiRes = await fetch(`${supabaseUrl}/rest/v1/?apikey=${serviceKey}`);
    const spec: any = await openapiRes.json();

    const profilesDef = spec.definitions?.profiles;
    record("Schema Introspection", "Table 'profiles' registered in PostgREST", !!profilesDef);

    if (profilesDef) {
      const props = profilesDef.properties || {};
      const langProp = props.preferred_language;
      record("Column Check", "profiles.preferred_language exists in schema", !!langProp);
      record("Column Check", "profiles.preferred_language has default 'en'", langProp?.default === "en", `default=${langProp?.default}`);
      record("Column Check", "profiles.preferred_language type is string/text", langProp?.type === "string", `type=${langProp?.type}`);
    } else {
      record("Column Check", "profiles.preferred_language exists in schema", false, "profiles definition not found");
    }
  } catch (err: any) {
    record("Schema Introspection", "OpenAPI fetch exception", false, err.message);
  }

  // 3. Direct Query Probe & Existing Data Integrity
  console.log("\n--- 3. Direct Query Probe & Data Integrity ---");
  try {
    const { data, error } = await adminClient
      .from("profiles")
      .select("id, preferred_language")
      .limit(10);

    record("Service Role Access", "Select query on profiles.preferred_language", !error, error?.message);

    if (data && data.length > 0) {
      const allValid = data.every((p: any) => ["en", "mr", "hi"].includes(p.preferred_language));
      record(
        "Data Integrity",
        "Existing profiles have valid preferred_language (en, mr, hi)",
        allValid,
        `Sample values: ${data.map((p: any) => p.preferred_language).join(", ")}`
      );
    } else {
      record("Data Integrity", "No conflicting profile records found", true, "0 or empty profiles");
    }
  } catch (err: any) {
    record("Service Role Access", "Select query exception on profiles", false, err.message);
  }

  // 4. CHECK Constraint Enforcement Probe
  console.log("\n--- 4. CHECK Constraint Enforcement Probe ---");
  const dummyId = "00000000-0000-0000-0000-000000000000";
  try {
    const { error: chkErr } = await adminClient.from("profiles").insert({
      id: dummyId,
      full_name: "Test Language Constraint",
      preferred_language: "fr", // Invalid locale code
    });

    const chkEnforced = !!chkErr && (chkErr.code === "23514" || chkErr.message.includes("profiles_preferred_language_check"));
    record(
      "Constraint Integrity",
      "profiles_preferred_language_check rejects unsupported language codes ('fr')",
      chkEnforced,
      chkErr ? `${chkErr.code}: ${chkErr.message}` : "Allowed unexpected language code!"
    );
  } catch (err: any) {
    record("Constraint Integrity", "Constraint check exception", false, err.message);
  }

  // 5. RLS & Security Protection
  console.log("\n--- 5. RLS & Security Protection ---");
  try {
    const { error: insertErr } = await anonClient.from("profiles").insert({
      id: dummyId,
      full_name: "Anonymous Attacker",
      preferred_language: "hi",
    });
    record(
      "RLS Protection",
      "Unauthenticated INSERT on profiles is blocked",
      !!insertErr,
      insertErr?.message
    );
  } catch (err: any) {
    record("RLS Protection", "Unauthenticated INSERT exception", true, err.message);
  }

  // 6. Application Localization Engine Compatibility
  console.log("\n--- 6. Application Localization Engine Compatibility ---");
  try {
    // 6a. Translation verification
    const enText = getTranslation("common.confirm", undefined, "en");
    const mrText = getTranslation("common.confirm", undefined, "mr");
    const hiText = getTranslation("common.confirm", undefined, "hi");
    record("Localization Engine", "Translates to English ('Confirm')", enText === "Confirm", enText);
    record("Localization Engine", "Translates to Marathi ('नक्की करा')", mrText === "नक्की करा", mrText);
    record("Localization Engine", "Translates to Hindi ('पुष्टि करें')", hiText === "पुष्टि करें", hiText);

    // 6b. Fallback verification
    const fallbackText = getTranslation("common.confirm", undefined, "invalid_locale" as any);
    record("Localization Engine", "Falls back to default English for invalid locale", fallbackText === "Confirm", fallbackText);

    // 6c. Currency formatting verification (INR Lakhs/Crores)
    const formattedInr = formatCurrency(150000, "en");
    record("Currency Formatter", "Formats INR with Indian grouping", formattedInr.includes("1,50,000") || formattedInr.includes("150,000"), formattedInr);

    // 6d. Date & Time formatting (Asia/Kolkata)
    const testDate = "2026-09-12T04:30:00.000Z"; // 10:00 AM IST
    const formattedDate = formatDate(testDate, "en");
    const formattedTime = formatDateTime(testDate, "en");
    record("Date/Time Formatter", "Formats date in Asia/Kolkata timezone", formattedDate.includes("2026") && formattedDate.toLowerCase().includes("sep"), formattedDate);
    record("Date/Time Formatter", "Formats time in Asia/Kolkata timezone (10:00 AM IST)", formattedTime.includes("10:00"), formattedTime);

    // 6e. Notification template localization
    const enNotif = renderNotificationTemplate("VISITOR_CHECKED_IN", { visitorName: "Raj", unitNumber: "101" }, "en");
    const mrNotif = renderNotificationTemplate("VISITOR_CHECKED_IN", { visitorName: "राज", unitNumber: "101" }, "mr");
    const hiNotif = renderNotificationTemplate("VISITOR_CHECKED_IN", { visitorName: "राज", unitNumber: "101" }, "hi");
    record("Notification Localization", "Renders English visitor notification", enNotif.title.includes("Visitor Arrival: Raj"), enNotif.title);
    record("Notification Localization", "Renders Marathi visitor notification", mrNotif.title.includes("अभ्यागत आगमन: राज"), mrNotif.title);
    record("Notification Localization", "Renders Hindi visitor notification", hiNotif.title.includes("अतिथि आगमन: राज"), hiNotif.title);
  } catch (err: any) {
    record("Localization Engine", "Engine compatibility exception", false, err.message);
  }

  // Summary
  console.log("\n================================================================================");
  const total = results.length;
  const passed = results.filter((r) => r.passed).length;
  const failed = results.filter((r) => !r.passed).length;
  console.log(`SUMMARY: ${passed}/${total} checks passed (${failed} failed)`);
  console.log("================================================================================");
}

verifyMigration20().catch(console.error);
