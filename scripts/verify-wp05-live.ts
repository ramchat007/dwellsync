import * as fs from "fs";
import * as path from "path";
import crypto from "crypto";
import { createClient } from "@supabase/supabase-js";

// Load .env.local
const envPath = path.resolve(process.cwd(), ".env.local");
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, "utf8");
  for (const line of envContent.split("\n")) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith("#") && trimmed.includes("=")) {
      const idx = trimmed.indexOf("=");
      const key = trimmed.slice(0, idx).trim();
      const val = trimmed.slice(idx + 1).trim();
      process.env[key] = val;
    }
  }
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const baseUrl = "http://localhost:3000";

const adminClient = createClient(supabaseUrl, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

function signSessionToken(payload: {
  userId: string;
  email?: string;
  phone?: string;
  isSuperAdmin: boolean;
  issuedAt: number;
  expiresAt: number;
}): string {
  const secret = serviceKey || "DwellSyncHub-secure-session-secret-key-2026";
  const data = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = crypto.createHmac("sha256", secret).update(data).digest("base64url");
  return `${data}.${signature}`;
}

interface CheckResult {
  step: number;
  name: string;
  passed: boolean;
  details?: string;
}

const results: CheckResult[] = [];

function record(step: number, name: string, passed: boolean, details?: string) {
  results.push({ step, name, passed, details });
  const mark = passed ? "PASS" : "FAIL";
  console.log(`[${mark}] Step ${step}: ${name}${details ? ` -> ${details}` : ""}`);
}

async function runLiveVerification() {
  console.log("===============================================================================");
  console.log("LIVE VERIFICATION: WP-05 SOCIETY MEMBER LIFECYCLE & RESIDENT ADMINISTRATION");
  console.log("Target Base URL:", baseUrl);
  console.log("Target Database:", supabaseUrl);
  console.log("===============================================================================\n");

  const societyId = "07ae6307-13cb-4d14-a547-27914536fc62";
  const foreignSocietyId = "b2c3d4e5-6789-01bc-def0-123456789abc";

  const adminUserId = "d52b51a1-026d-4828-81c3-a9f3a48780e6"; // Real Super Admin & Society Admin
  const residentUserId = "3bbe4296-9dc2-4b79-8894-8225a83f658b"; // Real Resident in society

  const now = Date.now();
  const adminToken = signSessionToken({
    userId: adminUserId,
    email: "superadmin@dwellsync.com",
    isSuperAdmin: true,
    issuedAt: now,
    expiresAt: now + 3600000,
  });
  const adminCookies = `DwellSyncHub_auth_session=${adminToken}; DwellSyncHub_active_society=${societyId}`;

  const residentToken = signSessionToken({
    userId: residentUserId,
    email: "resident@dwellsync.com",
    isSuperAdmin: false,
    issuedAt: now,
    expiresAt: now + 3600000,
  });
  const residentCookies = `DwellSyncHub_auth_session=${residentToken}; DwellSyncHub_active_society=${societyId}`;

  // Find target member in society for lifecycle tests
  const { data: members, error: memErr } = await adminClient
    .from("society_memberships")
    .select("id, user_id, society_id, role_id, unit_number, status")
    .eq("society_id", societyId);

  if (memErr || !members || members.length === 0) {
    throw new Error(`Failed to find society members for ${societyId}`);
  }

  const residentMember = members.find((m) => m.user_id === residentUserId) || members[0];
  const adminMember = members.find((m) => m.user_id === adminUserId);

  if (!residentMember || !adminMember) {
    throw new Error("Could not find both resident and admin members in target society.");
  }

  // Find a valid unit in society
  const { data: units } = await adminClient
    .from("units")
    .select("id, unit_number, society_id")
    .eq("society_id", societyId)
    .limit(2);

  const testUnit = units?.[0];

  try {
    // 1. Anonymous member lifecycle API denied
    const anonRes = await fetch(`${baseUrl}/api/society/${societyId}/members/${residentMember.id}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "SUSPENDED" }),
      redirect: "manual",
    });
    const isAnonDenied = anonRes.status === 401 || anonRes.status === 403 || anonRes.status === 307 || anonRes.status === 302;
    record(1, "Anonymous member lifecycle API denied", isAnonDenied, `HTTP ${anonRes.status}`);

    // 2. Non-admin resident denied lifecycle status change (403)
    const resStatusRes = await fetch(`${baseUrl}/api/society/${societyId}/members/${residentMember.id}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Cookie: residentCookies },
      body: JSON.stringify({ status: "SUSPENDED" }),
    });
    record(2, "Non-admin resident denied lifecycle status change", resStatusRes.status === 403, `HTTP ${resStatusRes.status}`);

    // 3. Non-admin resident denied unit reassignment (403)
    const resUnitRes = await fetch(`${baseUrl}/api/society/${societyId}/members/${residentMember.id}/unit`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Cookie: residentCookies },
      body: JSON.stringify({ unit_number: "Z-999" }),
    });
    record(3, "Non-admin resident denied unit reassignment", resUnitRes.status === 403, `HTTP ${resUnitRes.status}`);

    // 4. Non-admin resident denied foreign member relationships query (403)
    const resRelForeignRes = await fetch(`${baseUrl}/api/society/${societyId}/members/${adminMember.id}/relationships`, {
      headers: { Cookie: residentCookies },
    });
    record(4, "Non-admin resident denied foreign member relationships query", resRelForeignRes.status === 403, `HTTP ${resRelForeignRes.status}`);

    // 5. Resident permitted to query own relationships (200)
    const resRelSelfRes = await fetch(`${baseUrl}/api/society/${societyId}/members/${residentMember.id}/relationships`, {
      headers: { Cookie: residentCookies },
    });
    const resRelSelfData = await resRelSelfRes.json();
    const isRelSelfOk = resRelSelfRes.status === 200 && resRelSelfData.success === true;
    record(5, "Resident permitted to query own relationships", isRelSelfOk, `HTTP ${resRelSelfRes.status}`);

    // 6. Admin reads member relationships (200)
    const adminRelRes = await fetch(`${baseUrl}/api/society/${societyId}/members/${residentMember.id}/relationships`, {
      headers: { Cookie: adminCookies },
    });
    const adminRelData = await adminRelRes.json();
    const isAdminRelOk = adminRelRes.status === 200 && adminRelData.success === true;
    record(6, "Admin reads member relationships", isAdminRelOk, `HTTP ${adminRelRes.status}, ownerships=${adminRelData.ownerships?.length}, occupancies=${adminRelData.occupancies?.length}`);

    // 7. Admin suspends member (ACTIVE -> SUSPENDED)
    const initialStatus = residentMember.status;
    const suspendRes = await fetch(`${baseUrl}/api/society/${societyId}/members/${residentMember.id}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Cookie: adminCookies },
      body: JSON.stringify({ status: "SUSPENDED" }),
    });
    const suspendData = await suspendRes.json();
    const isSuspendOk = suspendRes.status === 200 && suspendData.success === true && suspendData.member?.status === "SUSPENDED";
    record(7, "Admin suspends member (ACTIVE -> SUSPENDED)", isSuspendOk, `HTTP ${suspendRes.status}, status=${suspendData.member?.status}`);

    // 8. Admin reactivates member (SUSPENDED -> ACTIVE)
    const reactivateRes = await fetch(`${baseUrl}/api/society/${societyId}/members/${residentMember.id}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Cookie: adminCookies },
      body: JSON.stringify({ status: initialStatus || "ACTIVE" }),
    });
    const reactivateData = await reactivateRes.json();
    const isReactivateOk = reactivateRes.status === 200 && reactivateData.success === true && reactivateData.member?.status === (initialStatus || "ACTIVE");
    record(8, "Admin reactivates member (SUSPENDED -> ACTIVE)", isReactivateOk, `HTTP ${reactivateRes.status}, status=${reactivateData.member?.status}`);

    // 9. Self-suspension blocked for admin account (403)
    const selfSuspendRes = await fetch(`${baseUrl}/api/society/${societyId}/members/${adminMember.id}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Cookie: adminCookies },
      body: JSON.stringify({ status: "SUSPENDED" }),
    });
    const selfSuspendData = await selfSuspendRes.json();
    const isSelfSuspendBlocked = selfSuspendRes.status === 403;
    record(9, "Self-suspension blocked for admin account", isSelfSuspendBlocked, `HTTP ${selfSuspendRes.status}, error="${selfSuspendData.error}"`);

    // 10. Self-removal blocked for admin account (400)
    const selfRemoveRes = await fetch(`${baseUrl}/api/society/${societyId}/members/${adminMember.id}`, {
      method: "DELETE",
      headers: { Cookie: adminCookies },
    });
    const selfRemoveData = await selfRemoveRes.json();
    const isSelfRemoveBlocked = selfRemoveRes.status === 400 || selfRemoveRes.status === 403;
    record(10, "Self-removal blocked for admin account", isSelfRemoveBlocked, `HTTP ${selfRemoveRes.status}, error="${selfRemoveData.error}"`);

    // 11. Self-escalation blocked for admin account (403)
    const selfEscalateRes = await fetch(`${baseUrl}/api/society/${societyId}/members/${adminMember.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Cookie: adminCookies },
      body: JSON.stringify({ role_id: "SECRETARY" }),
    });
    const selfEscalateData = await selfEscalateRes.json();
    const isSelfEscalateBlocked = selfEscalateRes.status === 403;
    record(11, "Self-escalation blocked for admin account", isSelfEscalateBlocked, `HTTP ${selfEscalateRes.status}, error="${selfEscalateData.error}"`);

    // 12. Platform SUPER_ADMIN role assignment blocked (403)
    const superAssignRes = await fetch(`${baseUrl}/api/society/${societyId}/members/${residentMember.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Cookie: adminCookies },
      body: JSON.stringify({ role_id: "SUPER_ADMIN" }),
    });
    const superAssignData = await superAssignRes.json();
    const isSuperAssignBlocked = superAssignRes.status === 403;
    record(12, "Platform SUPER_ADMIN role assignment blocked", isSuperAssignBlocked, `HTTP ${superAssignRes.status}, error="${superAssignData.error}"`);

    // 13. Cross-tenant member modification blocked (403/404)
    const fakeMemberId = crypto.randomUUID();
    const crossTenantRes = await fetch(`${baseUrl}/api/society/${foreignSocietyId}/members/${fakeMemberId}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Cookie: residentCookies },
      body: JSON.stringify({ status: "SUSPENDED" }),
    });
    const isCrossTenantBlocked = crossTenantRes.status === 403 || crossTenantRes.status === 404;
    record(13, "Cross-tenant member modification blocked", isCrossTenantBlocked, `HTTP ${crossTenantRes.status}`);

    // 14. Cross-tenant unit association blocked (403/404)
    const crossUnitRes = await fetch(`${baseUrl}/api/society/${societyId}/members/${residentMember.id}/unit`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Cookie: adminCookies },
      body: JSON.stringify({ unit_id: crypto.randomUUID() }), // Non-existent or foreign unit
    });
    const isCrossUnitBlocked = crossUnitRes.status === 404 || crossUnitRes.status === 403;
    record(14, "Cross-tenant / invalid unit association blocked", isCrossUnitBlocked, `HTTP ${crossUnitRes.status}`);

    // 15. Unit reassignment verified on member
    const prevUnitNumber = residentMember.unit_number;
    const newUnitVal = testUnit ? testUnit.unit_number : "T-999";
    const reassignRes = await fetch(`${baseUrl}/api/society/${societyId}/members/${residentMember.id}/unit`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Cookie: adminCookies },
      body: JSON.stringify({
        unit_id: testUnit ? testUnit.id : null,
        unit_number: newUnitVal,
      }),
    });
    const reassignData = await reassignRes.json();
    const isReassignOk = reassignRes.status === 200 && reassignData.success === true;
    record(15, "Unit reassignment verified on member", isReassignOk, `HTTP ${reassignRes.status}, assigned=${reassignData.member?.unit_number}`);

    // Restore unit number
    if (prevUnitNumber !== undefined) {
      await fetch(`${baseUrl}/api/society/${societyId}/members/${residentMember.id}/unit`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Cookie: adminCookies },
        body: JSON.stringify({ unit_number: prevUnitNumber }),
      });
    }

    // 16. Audit log records verified in Supabase
    const { data: auditLogs } = await adminClient
      .from("audit_logs")
      .select("id, action, resource_type, created_at")
      .eq("society_id", societyId)
      .in("action", ["MEMBER_STATUS_CHANGED", "MEMBER_UNIT_REASSIGNED", "MEMBER_ROLE_CHANGED", "MEMBERSHIP_REMOVED"])
      .order("created_at", { ascending: false })
      .limit(5);

    const hasAudits = !!(auditLogs && auditLogs.length > 0);
    record(16, "Audit log records verified in remote database", hasAudits, `Found ${auditLogs?.length || 0} lifecycle audit entries: ${auditLogs?.map((a) => a.action).join(", ")}`);

  } catch (error: any) {
    console.error("Live Verification Error:", error);
    process.exit(1);
  }

  console.log("\n===============================================================================");
  const passedCount = results.filter((r) => r.passed).length;
  const totalCount = results.length;
  console.log(`LIVE VERIFICATION SUMMARY: ${passedCount} / ${totalCount} passed`);
  console.log("===============================================================================\n");

  if (passedCount < totalCount) {
    process.exit(1);
  }
}

runLiveVerification().catch((err) => {
  console.error("Live Verification Unhandled Exception:", err);
  process.exit(1);
});
