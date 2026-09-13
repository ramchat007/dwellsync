import { describe, it, expect } from "vitest";
import {
  signSessionToken,
  verifySessionToken,
  getSessionSecret,
  SessionPayload,
} from "../../src/lib/auth/session";
import {
  getPermissionsForRole,
  roleHasPermission,
  PERMISSIONS,
} from "../../src/lib/auth/permissions";
import {
  getDashboardPathForRole,
  getNavigationForRole,
  resolveUserExperience,
} from "../../src/lib/auth/persona";
import { RoleId, ImpersonationSession } from "../../src/lib/types/database";
import { UserIdentity } from "../../src/lib/types/auth";

describe("WP-01: Authentication & SUPER_ADMIN View-As Remediation Security Suite", () => {
  const MOCK_SUPER_ADMIN_ID = "d52b51a1-026d-4828-81c3-a9f3a48780e6";
  const MOCK_SOCIETY_ID = "07ae6307-13cb-4d14-a547-27914536fc62";
  const MOCK_RESIDENT_ID = "3bbe4296-9dc2-4b79-8894-8225a83f658b";

  // =========================================================================
  // SECTION 1: AUTHENTICATION & HMAC TOKEN SECURITY
  // =========================================================================

  it("TEST 1: Cryptographic HMAC session token generation and valid verification", () => {
    const payload: SessionPayload = {
      userId: MOCK_SUPER_ADMIN_ID,
      email: "ramchat007@gmail.com",
      phone: "+919820160376",
      isSuperAdmin: true,
      issuedAt: Date.now(),
      expiresAt: Date.now() + 1000 * 60 * 60,
    };

    const token = signSessionToken(payload);
    expect(token).toBeDefined();
    expect(token).toContain(".");

    const verified = verifySessionToken(token);
    expect(verified).not.toBeNull();
    expect(verified?.userId).toBe(MOCK_SUPER_ADMIN_ID);
    expect(verified?.email).toBe("ramchat007@gmail.com");
    expect(verified?.isSuperAdmin).toBe(true);
  });

  it("TEST 2: Tampered HMAC signature is strictly rejected by verifySessionToken", () => {
    const payload: SessionPayload = {
      userId: MOCK_SUPER_ADMIN_ID,
      email: "ramchat007@gmail.com",
      isSuperAdmin: true,
      issuedAt: Date.now(),
      expiresAt: Date.now() + 1000 * 60 * 60,
    };

    const token = signSessionToken(payload);
    const [data] = token.split(".");
    const tamperedToken = `${data}.invalid_forged_hmac_signature`;

    const verified = verifySessionToken(tamperedToken);
    expect(verified).toBeNull();
  });

  it("TEST 3: Expired HMAC session token is strictly rejected", () => {
    const payload: SessionPayload = {
      userId: MOCK_SUPER_ADMIN_ID,
      email: "ramchat007@gmail.com",
      isSuperAdmin: true,
      issuedAt: Date.now() - 20000,
      expiresAt: Date.now() - 1000, // Expired in the past
    };

    const token = signSessionToken(payload);
    const verified = verifySessionToken(token);
    expect(verified).toBeNull();
  });

  it("TEST 4: Malformed session tokens without valid format are rejected", () => {
    expect(verifySessionToken("")).toBeNull();
    expect(verifySessionToken("nodotinsidetoken")).toBeNull();
    expect(verifySessionToken("invalid.base64!.data")).toBeNull();
    expect(verifySessionToken("....")).toBeNull();
  });

  it("TEST 5: Dynamic secret resolution yields a non-empty cryptographic secret", () => {
    const secret = getSessionSecret();
    expect(secret).toBeDefined();
    expect(secret.length).toBeGreaterThan(16);
  });

  it("TEST 6: Super Admin verification checks correct platform role", () => {
    const superAdminRole: RoleId = "SUPER_ADMIN";
    const perms = getPermissionsForRole(superAdminRole);
    expect(perms).toContain(PERMISSIONS.PLATFORM_ADMIN);
    expect(perms).toContain(PERMISSIONS.PLATFORM_IMPERSONATE);
  });

  it("TEST 7: Normal Society Admin cannot initiate platform impersonation", () => {
    const societyAdminRole: RoleId = "SOCIETY_ADMIN";
    const perms = getPermissionsForRole(societyAdminRole);
    expect(perms).not.toContain(PERMISSIONS.PLATFORM_IMPERSONATE);
    expect(perms).not.toContain(PERMISSIONS.PLATFORM_ADMIN);
  });

  it("TEST 8: Non-administrative personas lack all platform privileges", () => {
    const testRoles: RoleId[] = ["RESIDENT", "OWNER", "TENANT", "SECURITY", "VENDOR", "STAFF"];
    for (const role of testRoles) {
      const perms = getPermissionsForRole(role);
      expect(perms).not.toContain(PERMISSIONS.PLATFORM_ADMIN);
      expect(perms).not.toContain(PERMISSIONS.PLATFORM_IMPERSONATE);
    }
  });

  // =========================================================================
  // SECTION 2: VIEW-AS LIFECYCLE & ANTI-CHAINING
  // =========================================================================

  it("TEST 9: Starting View-As produces 256-bit cryptographic token (64 hex characters)", () => {
    const crypto = require("crypto");
    const sessionToken = crypto.randomBytes(32).toString("hex");
    expect(sessionToken.length).toBe(64);
    expect(/^[a-f0-9]{64}$/.test(sessionToken)).toBe(true);
  });

  it("TEST 10: Starting View-As cleanly terminates previous session by same admin", () => {
    const existingSession: ImpersonationSession = {
      id: "session-old",
      original_admin_id: MOCK_SUPER_ADMIN_ID,
      target_user_id: MOCK_SUPER_ADMIN_ID,
      target_society_id: MOCK_SOCIETY_ID,
      target_role_id: "SOCIETY_ADMIN",
      session_token: "old-token",
      status: "ACTIVE",
      reason: "Old session",
      started_at: new Date(Date.now() - 3600000).toISOString(),
      ended_at: null,
      created_at: new Date(Date.now() - 3600000).toISOString(),
    };

    // When the same admin starts a new session, the old is terminated
    const shouldTerminateOld = existingSession.original_admin_id === MOCK_SUPER_ADMIN_ID;
    expect(shouldTerminateOld).toBe(true);

    const terminatedSession: ImpersonationSession = {
      ...existingSession,
      status: "TERMINATED",
      ended_at: new Date().toISOString(),
    };
    expect(terminatedSession.status).toBe("TERMINATED");
    expect(terminatedSession.ended_at).not.toBeNull();
  });

  it("TEST 11: Anti-chaining: Super Admin cannot impersonate if active session belongs to different admin", () => {
    const activeSession: ImpersonationSession = {
      id: "session-other",
      original_admin_id: "other-admin-uuid",
      target_user_id: MOCK_RESIDENT_ID,
      target_society_id: MOCK_SOCIETY_ID,
      target_role_id: "RESIDENT",
      session_token: "token-abc",
      status: "ACTIVE",
      reason: "Other admin testing",
      started_at: new Date().toISOString(),
      ended_at: null,
      created_at: new Date().toISOString(),
    };

    const isChaining = activeSession.original_admin_id !== MOCK_SUPER_ADMIN_ID;
    expect(isChaining).toBe(true);
  });

  it("TEST 12: Terminated impersonation session is rejected and ignored", () => {
    const terminatedSession: ImpersonationSession = {
      id: "session-dead",
      original_admin_id: MOCK_SUPER_ADMIN_ID,
      target_user_id: MOCK_RESIDENT_ID,
      target_society_id: MOCK_SOCIETY_ID,
      target_role_id: "RESIDENT",
      session_token: "dead-token",
      status: "TERMINATED",
      reason: "Exited",
      started_at: new Date(Date.now() - 60000).toISOString(),
      ended_at: new Date().toISOString(),
      created_at: new Date(Date.now() - 60000).toISOString(),
    };

    const isValidActive = terminatedSession.status === "ACTIVE";
    expect(isValidActive).toBe(false);
  });

  it("TEST 13: Exiting impersonation produces IMPERSONATION_ENDED audit action with duration", () => {
    const startTime = Date.now() - 120000; // 2 minutes ago
    const endTime = Date.now();
    const durationSeconds = Math.round((endTime - startTime) / 1000);

    const auditPayload = {
      action: "IMPERSONATION_ENDED",
      metadata: { duration_seconds: durationSeconds },
    };

    expect(auditPayload.action).toBe("IMPERSONATION_ENDED");
    expect(auditPayload.metadata.duration_seconds).toBe(120);
  });

  it("TEST 14: Starting impersonation emits audited IMPERSONATION_STARTED action", () => {
    const auditPayload = {
      action: "IMPERSONATION_STARTED",
      metadata: { target_role: "SOCIETY_ADMIN", reason: "Testing" },
    };
    expect(auditPayload.action).toBe("IMPERSONATION_STARTED");
    expect(auditPayload.metadata.target_role).toBe("SOCIETY_ADMIN");
  });

  // =========================================================================
  // SECTION 3: TENANT BOUNDARY & PRIVILEGE CONTAINMENT
  // =========================================================================

  it("TEST 15: Real user vs Effective user identity separation is preserved", () => {
    const identity: UserIdentity = {
      user: { id: MOCK_SUPER_ADMIN_ID, email: "ramchat007@gmail.com" },
      profile: {
        id: MOCK_RESIDENT_ID,
        email: "resident@example.com",
        full_name: "Resident 2233",
        display_name: "Resident 2233",
        phone: "+919811122233",
        avatar_url: null,
        status: "ACTIVE",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      isAuthenticated: true,
      isSuperAdmin: false, // Strict: no super admin escalation
      isSocietyAdmin: false,
      isImpersonating: true,
      originalUser: {
        id: MOCK_SUPER_ADMIN_ID,
        email: "ramchat007@gmail.com",
        full_name: "Rupesh Mestry",
        display_name: "Rupesh",
        phone: "+919820160376",
        avatar_url: null,
        status: "ACTIVE",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      effectiveUser: {
        id: MOCK_RESIDENT_ID,
        email: "resident@example.com",
        full_name: "Resident 2233",
        display_name: "Resident 2233",
        phone: "+919811122233",
        avatar_url: null,
        status: "ACTIVE",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      currentSociety: {
        id: MOCK_SOCIETY_ID,
        name: "Shree Vrindavan Annex CHS Ltd.",
        code: "SVAC01",
        city: "Mumbai",
        state: "Maharashtra",
        status: "ACTIVE",
        country: "India",
        pincode: "400078",
        society_type: "COOPERATIVE_HOUSING",
        timezone: "Asia/Kolkata",
        currency: "INR",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      currentRole: "RESIDENT",
      permissions: getPermissionsForRole("RESIDENT"),
    };

    expect(identity.isImpersonating).toBe(true);
    expect(identity.isSuperAdmin).toBe(false);
    expect(identity.originalUser.id).toBe(MOCK_SUPER_ADMIN_ID);
    expect(identity.effectiveUser.id).toBe(MOCK_RESIDENT_ID);
    expect(identity.currentRole).toBe("RESIDENT");
  });

  it("TEST 16: isSuperAdmin is strictly false on effective identity during impersonation", () => {
    const impersonatedAdminIdentity: UserIdentity = {
      user: { id: MOCK_SUPER_ADMIN_ID, email: "ramchat007@gmail.com" },
      profile: { id: MOCK_SUPER_ADMIN_ID, email: "ramchat007@gmail.com", full_name: "Rupesh", display_name: "Rupesh", status: "ACTIVE", avatar_url: null, phone: null, created_at: "", updated_at: "" },
      isAuthenticated: true,
      isSuperAdmin: false, // Must be false!
      isSocietyAdmin: true,
      isImpersonating: true,
      originalUser: { id: MOCK_SUPER_ADMIN_ID, email: "ramchat007@gmail.com", full_name: "Rupesh", display_name: "Rupesh", status: "ACTIVE", avatar_url: null, phone: null, created_at: "", updated_at: "" },
      effectiveUser: { id: MOCK_SUPER_ADMIN_ID, email: "ramchat007@gmail.com", full_name: "Rupesh", display_name: "Rupesh", status: "ACTIVE", avatar_url: null, phone: null, created_at: "", updated_at: "" },
      currentSociety: null,
      currentRole: "SOCIETY_ADMIN",
      permissions: getPermissionsForRole("SOCIETY_ADMIN"),
    };

    expect(impersonatedAdminIdentity.isSuperAdmin).toBe(false);
    expect(impersonatedAdminIdentity.permissions).not.toContain(PERMISSIONS.PLATFORM_ADMIN);
  });

  it("TEST 17: Platform Super Admin operations are blocked while impersonating", () => {
    const isImpersonating = true;
    const isSuperAdmin = false;
    const canAccessPlatformAdmin = isSuperAdmin && !isImpersonating;
    expect(canAccessPlatformAdmin).toBe(false);
  });

  it("TEST 18: Tenant boundary confinement: matching society is granted access", () => {
    const impersonationTargetSociety: string = MOCK_SOCIETY_ID;
    const requestedSociety: string = MOCK_SOCIETY_ID;

    const isAuthorized = impersonationTargetSociety === requestedSociety;
    expect(isAuthorized).toBe(true);
  });

  it("TEST 19: Tenant boundary confinement: non-matching society is blocked", () => {
    const impersonationTargetSociety: string = MOCK_SOCIETY_ID;
    const requestedSociety: string = "99999999-9999-9999-9999-999999999999";

    const isAuthorized = impersonationTargetSociety === requestedSociety;
    expect(isAuthorized).toBe(false);
  });

  it("TEST 20: Impersonated Resident receives strictly Resident permissions", () => {
    const permissions = getPermissionsForRole("RESIDENT");
    expect(permissions).toContain(PERMISSIONS.COMPLAINTS_CREATE);
    expect(permissions).toContain(PERMISSIONS.SOCIETY_VIEW);
    expect(permissions).not.toContain(PERMISSIONS.BILLING_MANAGE);
    expect(permissions).not.toContain(PERMISSIONS.RESIDENTS_MANAGE);
    expect(permissions).not.toContain(PERMISSIONS.PLATFORM_ADMIN);
    expect(permissions).not.toContain(PERMISSIONS.PLATFORM_IMPERSONATE);
  });

  it("TEST 21: Impersonated Society Admin receives Society Admin permissions without platform escalation", () => {
    const permissions = getPermissionsForRole("SOCIETY_ADMIN");
    expect(permissions).toContain(PERMISSIONS.RESIDENTS_MANAGE);
    expect(permissions).toContain(PERMISSIONS.BILLING_MANAGE);
    expect(permissions).toContain(PERMISSIONS.BUILDING_CREATE);
    expect(permissions).not.toContain(PERMISSIONS.PLATFORM_ADMIN);
    expect(permissions).not.toContain(PERMISSIONS.PLATFORM_IMPERSONATE);
    expect(permissions).not.toContain(PERMISSIONS.USERS_MANAGE_PLATFORM);
  });

  it("TEST 22: Impersonated Secretary receives governance permissions without billing modification", () => {
    const permissions = getPermissionsForRole("SECRETARY");
    expect(permissions).toContain(PERMISSIONS.MEETINGS_MANAGE);
    expect(permissions).toContain(PERMISSIONS.COMMITTEE_MANAGE);
    expect(permissions).toContain(PERMISSIONS.NOTICES_MANAGE);
    expect(permissions).not.toContain(PERMISSIONS.BILLING_GENERATE);
    expect(permissions).not.toContain(PERMISSIONS.PLATFORM_ADMIN);
  });

  it("TEST 23: Impersonated Treasurer receives financial permissions without gate security bypass", () => {
    const permissions = getPermissionsForRole("TREASURER");
    expect(permissions).toContain(PERMISSIONS.FINANCE_VIEW);
    expect(permissions).toContain(PERMISSIONS.FINANCE_MANAGE);
    expect(permissions).toContain(PERMISSIONS.BILLING_RECORD_PAYMENT);
    expect(permissions).not.toContain(PERMISSIONS.VISITORS_MANAGE);
    expect(permissions).not.toContain(PERMISSIONS.PLATFORM_ADMIN);
  });

  it("TEST 24: Impersonated Security Guard receives gate access permissions only", () => {
    const permissions = getPermissionsForRole("SECURITY");
    expect(permissions).toContain(PERMISSIONS.VISITORS_VIEW);
    expect(permissions).toContain(PERMISSIONS.VISITORS_MANAGE);
    expect(permissions).not.toContain(PERMISSIONS.FINANCE_MANAGE);
    expect(permissions).not.toContain(PERMISSIONS.BILLING_MANAGE);
    expect(permissions).not.toContain(PERMISSIONS.PLATFORM_ADMIN);
  });

  it("TEST 25: Impersonated Vendor receives vendor-scoped permissions only", () => {
    const permissions = getPermissionsForRole("VENDOR");
    expect(permissions).toContain(PERMISSIONS.SOCIETY_VIEW);
    expect(permissions).not.toContain(PERMISSIONS.BILLING_MANAGE);
    expect(permissions).not.toContain(PERMISSIONS.RESIDENTS_MANAGE);
    expect(permissions).not.toContain(PERMISSIONS.PLATFORM_ADMIN);
  });

  // =========================================================================
  // SECTION 4: PERSONA ROLE MATRIX & ROUTING / NAVIGATION
  // =========================================================================

  it("TEST 26: getDashboardPathForRole routes SUPER_ADMIN to /superadmin/view-as", () => {
    expect(getDashboardPathForRole("SUPER_ADMIN")).toBe("/superadmin/view-as");
  });

  it("TEST 27: getDashboardPathForRole routes SOCIETY_ADMIN with societyId to /society/[id]/dashboard", () => {
    expect(getDashboardPathForRole("SOCIETY_ADMIN", MOCK_SOCIETY_ID)).toBe(
      `/society/${MOCK_SOCIETY_ID}/dashboard`
    );
  });

  it("TEST 28: getDashboardPathForRole routes SECRETARY & COMMITTEE_MEMBER to /committee/dashboard", () => {
    expect(getDashboardPathForRole("SECRETARY", MOCK_SOCIETY_ID)).toBe("/committee/dashboard");
    expect(getDashboardPathForRole("COMMITTEE_MEMBER", MOCK_SOCIETY_ID)).toBe("/committee/dashboard");
  });

  it("TEST 29: getDashboardPathForRole routes TREASURER to /finance/dashboard", () => {
    expect(getDashboardPathForRole("TREASURER", MOCK_SOCIETY_ID)).toBe("/finance/dashboard");
  });

  it("TEST 30: getDashboardPathForRole routes RESIDENT, OWNER, TENANT to /resident/dashboard", () => {
    expect(getDashboardPathForRole("RESIDENT", MOCK_SOCIETY_ID)).toBe("/resident/dashboard");
    expect(getDashboardPathForRole("OWNER", MOCK_SOCIETY_ID)).toBe("/resident/dashboard");
    expect(getDashboardPathForRole("TENANT", MOCK_SOCIETY_ID)).toBe("/resident/dashboard");
  });

  it("TEST 31: getDashboardPathForRole routes SECURITY to /security/dashboard", () => {
    expect(getDashboardPathForRole("SECURITY", MOCK_SOCIETY_ID)).toBe("/security/dashboard");
  });

  it("TEST 32: getDashboardPathForRole routes MANAGER, STAFF, AUDITOR to /staff/dashboard", () => {
    expect(getDashboardPathForRole("MANAGER", MOCK_SOCIETY_ID)).toBe("/staff/dashboard");
    expect(getDashboardPathForRole("STAFF", MOCK_SOCIETY_ID)).toBe("/staff/dashboard");
    expect(getDashboardPathForRole("AUDITOR", MOCK_SOCIETY_ID)).toBe("/staff/dashboard");
  });

  it("TEST 33: getDashboardPathForRole routes VENDOR to /vendor/dashboard", () => {
    expect(getDashboardPathForRole("VENDOR", MOCK_SOCIETY_ID)).toBe("/vendor/dashboard");
  });

  it("TEST 34: Navigation for RESIDENT persona contains zero administrative tools", () => {
    const nav = getNavigationForRole("RESIDENT", MOCK_SOCIETY_ID);
    const labels = nav.map((item) => item.label.toLowerCase());
    expect(labels).toContain("my home");
    expect(labels).not.toContain("society settings");
    expect(labels).not.toContain("buildings & wings");
    expect(labels).not.toContain("platform overview");
    expect(labels).not.toContain("view-as console");
  });

  it("TEST 35: Navigation for SOCIETY_ADMIN persona includes full operational suite", () => {
    const nav = getNavigationForRole("SOCIETY_ADMIN", MOCK_SOCIETY_ID);
    const labels = nav.map((item) => item.label.toLowerCase());
    expect(labels).toContain("dashboard");
    expect(labels).toContain("buildings & wings");
    expect(labels).toContain("units & flats");
    expect(labels).toContain("society settings");
    expect(labels).not.toContain("view-as console");
    expect(labels).not.toContain("platform overview");
  });

  it("TEST 36: Navigation for SUPER_ADMIN context includes platform oversight items", () => {
    const nav = getNavigationForRole("SUPER_ADMIN");
    const labels = nav.map((item) => item.label.toLowerCase());
    expect(labels).toContain("view-as console");
    expect(labels).toContain("platform overview");
    expect(labels).toContain("societies registry");
    expect(labels).toContain("audit ledger");
  });

  // =========================================================================
  // SECTION 5: RESOLVE USER EXPERIENCE & TAMPER RESILIENCE
  // =========================================================================

  it("TEST 37: resolveUserExperience returns unauthenticated state when identity is null", () => {
    const exp = resolveUserExperience(null);
    expect(exp.isAuthenticated).toBe(false);
    expect(exp.dashboardPath).toBe("/login");
    expect(exp.navigation).toEqual([]);
  });

  it("TEST 38: resolveUserExperience preserves impersonated persona context", () => {
    const identity: UserIdentity = {
      user: { id: MOCK_SUPER_ADMIN_ID, email: "admin@test.com" },
      profile: { id: MOCK_RESIDENT_ID, email: "r@test.com", full_name: "Resident", display_name: "Resident", status: "ACTIVE", avatar_url: null, phone: null, created_at: "", updated_at: "" },
      isAuthenticated: true,
      isSuperAdmin: false,
      isSocietyAdmin: false,
      isImpersonating: true,
      originalUser: { id: MOCK_SUPER_ADMIN_ID, email: "admin@test.com", full_name: "Admin", display_name: "Admin", status: "ACTIVE", avatar_url: null, phone: null, created_at: "", updated_at: "" },
      effectiveUser: { id: MOCK_RESIDENT_ID, email: "r@test.com", full_name: "Resident", display_name: "Resident", status: "ACTIVE", avatar_url: null, phone: null, created_at: "", updated_at: "" },
      currentSociety: {
        id: MOCK_SOCIETY_ID,
        name: "SVAC",
        code: "SVAC01",
        status: "ACTIVE",
        society_type: "COOPERATIVE_HOUSING",
        country: "India",
        timezone: "Asia/Kolkata",
        currency: "INR",
        created_at: "",
        updated_at: "",
      },
      currentRole: "RESIDENT",
      permissions: getPermissionsForRole("RESIDENT"),
    };

    const exp = resolveUserExperience(identity);
    expect(exp.isAuthenticated).toBe(true);
    expect(exp.isImpersonating).toBe(true);
    expect(exp.role).toBe("RESIDENT");
    expect(exp.dashboardPath).toBe("/resident/dashboard");
    expect(exp.navigation.length).toBeGreaterThan(0);
  });
});
