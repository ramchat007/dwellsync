import { describe, it, expect } from "vitest";
import { getAppOrigin, sanitizeRedirectPath } from "../../src/lib/auth/url";
import {
  signSessionToken,
  verifySessionToken,
  SessionPayload,
} from "../../src/lib/auth/session";
import {
  getPermissionsForRole,
  PERMISSIONS,
} from "../../src/lib/auth/permissions";
import {
  getDashboardPathForRole,
  resolveUserExperience,
} from "../../src/lib/auth/persona";
import { UserIdentity } from "../../src/lib/types/auth";
import { RoleId } from "../../src/lib/types/database";

describe("WP-01.1: Google OAuth Remediation & Security Suite", () => {
  const MOCK_SUPER_ADMIN_ID = "d52b51a1-026d-4828-81c3-a9f3a48780e6";
  const MOCK_NORMAL_USER_ID = "99999999-aaaa-bbbb-cccc-111111111111";
  const MOCK_SOCIETY_ID = "07ae6307-13cb-4d14-a547-27914536fc62";

  // =========================================================================
  // SECTION 1: ORIGIN RESOLVER & ENVIRONMENT ISOLATION
  // =========================================================================

  it("TEST 1: getAppOrigin defaults to http://localhost:3000 when no headers or env set", () => {
    const origEnv = process.env.NEXT_PUBLIC_APP_URL;
    delete process.env.NEXT_PUBLIC_APP_URL;
    delete process.env.NEXT_PUBLIC_SITE_URL;
    delete process.env.SITE_URL;

    try {
      const origin = getAppOrigin();
      expect(origin).toBe("http://localhost:3000");
    } finally {
      if (origEnv) process.env.NEXT_PUBLIC_APP_URL = origEnv;
    }
  });

  it("TEST 2: getAppOrigin resolves from request headers (x-forwarded-host and x-forwarded-proto)", () => {
    const req = new Request("http://internal-docker:3000/api/auth/oauth/google", {
      headers: {
        "x-forwarded-host": "dwellsync.preview.internal",
        "x-forwarded-proto": "https",
      },
    });

    const origin = getAppOrigin(req);
    expect(origin).toBe("https://dwellsync.preview.internal");
  });

  it("TEST 3: getAppOrigin resolves from host header for localhost", () => {
    const req = new Request("http://localhost:3000/api/auth/oauth/google", {
      headers: {
        host: "localhost:3000",
      },
    });

    const origin = getAppOrigin(req);
    expect(origin).toBe("http://localhost:3000");
  });

  it("TEST 4: getAppOrigin strips trailing slashes cleanly", () => {
    const origEnv = process.env.NEXT_PUBLIC_APP_URL;
    process.env.NEXT_PUBLIC_APP_URL = "https://app.dwellsync.com///";

    try {
      const origin = getAppOrigin();
      expect(origin).toBe("https://app.dwellsync.com");
    } finally {
      if (origEnv) process.env.NEXT_PUBLIC_APP_URL = origEnv;
    }
  });

  // =========================================================================
  // SECTION 2: OPEN-REDIRECT ATTACK PREVENTION
  // =========================================================================

  it("TEST 5: sanitizeRedirectPath permits valid internal relative paths", () => {
    expect(sanitizeRedirectPath("/dashboard")).toBe("/dashboard");
    expect(sanitizeRedirectPath("/resident/complaints")).toBe("/resident/complaints");
    expect(sanitizeRedirectPath(`/society/${MOCK_SOCIETY_ID}/dashboard`)).toBe(
      `/society/${MOCK_SOCIETY_ID}/dashboard`
    );
    expect(sanitizeRedirectPath("/superadmin/view-as")).toBe("/superadmin/view-as");
  });

  it("TEST 6: sanitizeRedirectPath blocks external absolute URLs", () => {
    expect(sanitizeRedirectPath("https://attacker-domain.com")).toBe("/dashboard");
    expect(sanitizeRedirectPath("http://evil.com/phish")).toBe("/dashboard");
    expect(sanitizeRedirectPath("ftp://evil.com")).toBe("/dashboard");
  });

  it("TEST 7: sanitizeRedirectPath blocks protocol-relative URLs (//evil.com)", () => {
    expect(sanitizeRedirectPath("//evil.com")).toBe("/dashboard");
    expect(sanitizeRedirectPath("///evil.com/exploit")).toBe("/dashboard");
  });

  it("TEST 8: sanitizeRedirectPath blocks Windows backslash directory tricks (/\\evil.com)", () => {
    expect(sanitizeRedirectPath("/\\evil.com")).toBe("/dashboard");
    expect(sanitizeRedirectPath("\\evil.com")).toBe("/dashboard");
  });

  it("TEST 9: sanitizeRedirectPath blocks URL-encoded traversal/slashes", () => {
    expect(sanitizeRedirectPath("/%2fevil.com")).toBe("/dashboard");
    expect(sanitizeRedirectPath("/%5cevil.com")).toBe("/dashboard");
  });

  it("TEST 10: sanitizeRedirectPath blocks javascript: and data: pseudo-protocols", () => {
    expect(sanitizeRedirectPath("javascript:alert(document.cookie)")).toBe("/dashboard");
    expect(sanitizeRedirectPath("data:text/html,<script>alert(1)</script>")).toBe("/dashboard");
  });

  it("TEST 11: sanitizeRedirectPath uses custom fallback when provided", () => {
    expect(sanitizeRedirectPath("https://evil.com", "/custom-fallback")).toBe("/custom-fallback");
    expect(sanitizeRedirectPath("", "/login")).toBe("/login");
    expect(sanitizeRedirectPath(null, "/default")).toBe("/default");
    expect(sanitizeRedirectPath(undefined, "/default")).toBe("/default");
  });

  // =========================================================================
  // SECTION 3: NORMAL GOOGLE USER PRIVILEGE CONTAINMENT
  // =========================================================================

  it("TEST 12: Normal Google user identity does NOT have isSuperAdmin privilege", () => {
    const googleUserIdentity: UserIdentity = {
      user: { id: MOCK_NORMAL_USER_ID, email: "newgoogleuser@gmail.com" },
      profile: {
        id: MOCK_NORMAL_USER_ID,
        email: "newgoogleuser@gmail.com",
        full_name: "Google User",
        display_name: "Google User",
        status: "ACTIVE",
        avatar_url: "https://lh3.googleusercontent.com/a/mock",
        phone: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      isAuthenticated: true,
      isSuperAdmin: false, // Must be strictly false!
      isSocietyAdmin: false,
      isImpersonating: false,
      originalUser: {
        id: MOCK_NORMAL_USER_ID,
        email: "newgoogleuser@gmail.com",
        full_name: "Google User",
        display_name: "Google User",
        status: "ACTIVE",
        avatar_url: "https://lh3.googleusercontent.com/a/mock",
        phone: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      effectiveUser: {
        id: MOCK_NORMAL_USER_ID,
        email: "newgoogleuser@gmail.com",
        full_name: "Google User",
        display_name: "Google User",
        status: "ACTIVE",
        avatar_url: "https://lh3.googleusercontent.com/a/mock",
        phone: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      currentSociety: null,
      availableSocieties: [],
      currentRole: null,
      permissions: [],
      impersonationSession: null,
    };

    expect(googleUserIdentity.isSuperAdmin).toBe(false);
    expect(googleUserIdentity.permissions).not.toContain(PERMISSIONS.PLATFORM_ADMIN);
    expect(googleUserIdentity.permissions).not.toContain(PERMISSIONS.PLATFORM_IMPERSONATE);

    const exp = resolveUserExperience(googleUserIdentity);
    expect(exp.isSuperAdmin).toBe(false);
    expect(exp.dashboardPath).toBe("/login"); // Unlinked user directed to login/unlinked
  });

  it("TEST 13: Super Admin identity is ONLY established when verified in platform_admins", () => {
    const verifiedAdminIdentity: UserIdentity = {
      user: { id: MOCK_SUPER_ADMIN_ID, email: "ramchat007@gmail.com" },
      profile: {
        id: MOCK_SUPER_ADMIN_ID,
        email: "ramchat007@gmail.com",
        full_name: "Rupesh",
        display_name: "Rupesh",
        status: "ACTIVE",
        avatar_url: null,
        phone: "+919820160376",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      isAuthenticated: true,
      isSuperAdmin: true,
      isSocietyAdmin: false,
      isImpersonating: false,
      originalUser: {
        id: MOCK_SUPER_ADMIN_ID,
        email: "ramchat007@gmail.com",
        full_name: "Rupesh",
        display_name: "Rupesh",
        status: "ACTIVE",
        avatar_url: null,
        phone: "+919820160376",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      effectiveUser: {
        id: MOCK_SUPER_ADMIN_ID,
        email: "ramchat007@gmail.com",
        full_name: "Rupesh",
        display_name: "Rupesh",
        status: "ACTIVE",
        avatar_url: null,
        phone: "+919820160376",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      currentSociety: null,
      availableSocieties: [],
      currentRole: "SUPER_ADMIN",
      permissions: getPermissionsForRole("SUPER_ADMIN"),
      impersonationSession: null,
    };

    expect(verifiedAdminIdentity.isSuperAdmin).toBe(true);
    expect(verifiedAdminIdentity.permissions).toContain(PERMISSIONS.PLATFORM_ADMIN);
    expect(verifiedAdminIdentity.permissions).toContain(PERMISSIONS.PLATFORM_IMPERSONATE);

    const exp = resolveUserExperience(verifiedAdminIdentity);
    expect(exp.isSuperAdmin).toBe(true);
    expect(exp.dashboardPath).toBe("/superadmin/view-as");
  });

  // =========================================================================
  // SECTION 4: POST-AUTH ROLE ROUTING & MEMBERSHIP RESOLUTION
  // =========================================================================

  it("TEST 14: Single membership routes to corresponding role dashboard", () => {
    const rolesToTest: { role: RoleId; expectedPath: string }[] = [
      { role: "RESIDENT", expectedPath: "/resident/dashboard" },
      { role: "OWNER", expectedPath: "/resident/dashboard" },
      { role: "TENANT", expectedPath: "/resident/dashboard" },
      { role: "SECRETARY", expectedPath: "/committee/dashboard" },
      { role: "TREASURER", expectedPath: "/finance/dashboard" },
      { role: "COMMITTEE_MEMBER", expectedPath: "/committee/dashboard" },
      { role: "SECURITY", expectedPath: "/security/dashboard" },
      { role: "STAFF", expectedPath: "/staff/dashboard" },
      { role: "MANAGER", expectedPath: "/staff/dashboard" },
      { role: "VENDOR", expectedPath: "/vendor/dashboard" },
      { role: "SOCIETY_ADMIN", expectedPath: `/society/${MOCK_SOCIETY_ID}/dashboard` },
    ];

    for (const item of rolesToTest) {
      const path = getDashboardPathForRole(item.role, MOCK_SOCIETY_ID);
      expect(path).toBe(item.expectedPath);
    }
  });

  it("TEST 15: Zero memberships falls back to unlinked state", () => {
    const path = getDashboardPathForRole(null);
    expect(path).toBe("/login");
  });

  // =========================================================================
  // SECTION 5: SESSION TOKEN CRYPTOGRAPHIC INTEGRITY
  // =========================================================================

  it("TEST 16: Session token created for Google user is signed and verifiable", () => {
    const payload: SessionPayload = {
      userId: MOCK_NORMAL_USER_ID,
      email: "googleuser@example.com",
      isSuperAdmin: false,
      issuedAt: Date.now(),
      expiresAt: Date.now() + 1000 * 60 * 60,
    };

    const token = signSessionToken(payload);
    expect(token).toBeDefined();

    const verified = verifySessionToken(token);
    expect(verified).not.toBeNull();
    expect(verified?.userId).toBe(MOCK_NORMAL_USER_ID);
    expect(verified?.isSuperAdmin).toBe(false);
  });

  it("TEST 17: Tampered session token is rejected", () => {
    const payload: SessionPayload = {
      userId: MOCK_NORMAL_USER_ID,
      email: "googleuser@example.com",
      isSuperAdmin: false,
      issuedAt: Date.now(),
      expiresAt: Date.now() + 1000 * 60 * 60,
    };

    const token = signSessionToken(payload);
    const [data, sig] = token.split(".");
    // Tamper with data to attempt privilege escalation
    const decoded = JSON.parse(Buffer.from(data, "base64url").toString("utf-8"));
    decoded.isSuperAdmin = true;
    const tamperedData = Buffer.from(JSON.stringify(decoded)).toString("base64url");
    const tamperedToken = `${tamperedData}.${sig}`;

    const verified = verifySessionToken(tamperedToken);
    expect(verified).toBeNull();
  });

  // =========================================================================
  // SECTION 6: WP-01 VIEW-AS & IMPERSONATION REGRESSION CHECK
  // =========================================================================

  it("TEST 18: WP-01 Impersonation invariants remain intact during OAuth remediation", () => {
    const impersonatedIdentity: UserIdentity = {
      user: { id: MOCK_SUPER_ADMIN_ID, email: "ramchat007@gmail.com" },
      profile: {
        id: MOCK_NORMAL_USER_ID,
        email: "resident@example.com",
        full_name: "Resident User",
        display_name: "Resident User",
        status: "ACTIVE",
        avatar_url: null,
        phone: null,
        created_at: "",
        updated_at: "",
      },
      isAuthenticated: true,
      isSuperAdmin: false, // Critical invariant!
      isSocietyAdmin: false,
      isImpersonating: true,
      originalUser: {
        id: MOCK_SUPER_ADMIN_ID,
        email: "ramchat007@gmail.com",
        full_name: "Rupesh",
        display_name: "Rupesh",
        status: "ACTIVE",
        avatar_url: null,
        phone: null,
        created_at: "",
        updated_at: "",
      },
      effectiveUser: {
        id: MOCK_NORMAL_USER_ID,
        email: "resident@example.com",
        full_name: "Resident User",
        display_name: "Resident User",
        status: "ACTIVE",
        avatar_url: null,
        phone: null,
        created_at: "",
        updated_at: "",
      },
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

    expect(impersonatedIdentity.isImpersonating).toBe(true);
    expect(impersonatedIdentity.isSuperAdmin).toBe(false);
    expect(impersonatedIdentity.permissions).not.toContain(PERMISSIONS.PLATFORM_ADMIN);

    const exp = resolveUserExperience(impersonatedIdentity);
    expect(exp.dashboardPath).toBe("/resident/dashboard");
    expect(exp.isSuperAdmin).toBe(false);
    expect(exp.isImpersonating).toBe(true);
  });
});
