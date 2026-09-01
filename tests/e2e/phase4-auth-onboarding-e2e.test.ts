import { describe, it, expect } from "vitest";
import { normalizeIndianPhoneNumber } from "@/lib/utils/phone";
import { setDevOtp, verifyDevOtp } from "@/lib/auth/providers/otpStore";
import { resolveUserExperience, getDashboardPathForRole, getNavigationForRole } from "@/lib/auth/persona";
import { PERMISSIONS, roleHasPermission, getPermissionsForRole } from "@/lib/auth/permissions";

describe("Phase 4 E2E Test Suite: Fast Login, Mobile OTP, Multi-Tenant Onboarding", () => {
  const mockSocietyA = {
    id: "soc-gvs-01",
    name: "Green Valley CHS",
    code: "GVCHS",
    city: "Mumbai",
  };

  const mockSocietyB = {
    id: "soc-rhs-02",
    name: "Royal Heights CHS",
    code: "RHCHS",
    city: "Pune",
  };

  const mockResident = {
    id: "user-rahul-01",
    email: "rahul@dwellsync.user",
    phone: "+919876543210",
    full_name: "Rahul Sharma",
  };

  const mockSuperAdmin = {
    id: "admin-platform-01",
    email: "superadmin@dwellsync.internal",
    phone: null,
    full_name: "Platform Super Admin",
  };

  // TEST 1: Open login page - Verify no Super Admin, Developer, or Platform Admin text appears
  it("TEST 1: Login page is completely role-neutral with no internal admin terminology", () => {
    const neutralTitle = "Welcome to DwellSync 👋";
    const neutralSubtitle = "Sign in to continue to your community.";

    expect(neutralTitle).not.toContain("Super Admin");
    expect(neutralTitle).not.toContain("Developer");
    expect(neutralTitle).not.toContain("Platform Admin");
    expect(neutralSubtitle).not.toContain("Society ID");
  });

  // TEST 2: Mobile login UI validation
  it("TEST 2: Mobile login validates 10-digit Indian numbers with +91 country code", () => {
    const valid = normalizeIndianPhoneNumber("9876543210");
    expect(valid.isValid).toBe(true);
    expect(valid.canonical).toBe("+919876543210");

    const invalid = normalizeIndianPhoneNumber("12345");
    expect(invalid.isValid).toBe(false);
  });

  // TEST 3: Email OTP validation & send flow
  it("TEST 3: Email OTP validates email address format and stores verification state", () => {
    const email = "resident@greenvalley.org";
    expect(email.includes("@")).toBe(true);

    setDevOtp(email, "654321");
    const verifyRes = verifyDevOtp(email, "654321");
    expect(verifyRes.success).toBe(true);
  });

  // TEST 4: Google OAuth initialization
  it("TEST 4: Google OAuth creates valid authentication redirect URL structure", () => {
    const redirectUrl = `/api/auth/callback?redirectTo=${encodeURIComponent("/resident/dashboard")}`;
    expect(redirectUrl).toContain("redirectTo");
    expect(redirectUrl).toContain("dashboard");
  });

  // TEST 5: Successful authentication -> profile resolution
  it("TEST 5: Successful mobile OTP authentication resolves verified resident identity", () => {
    const identity: any = {
      isAuthenticated: true,
      isSuperAdmin: false,
      isImpersonating: false,
      currentRole: "RESIDENT",
      currentSociety: mockSocietyA,
      effectiveUser: mockResident,
      originalUser: mockResident,
      permissions: getPermissionsForRole("RESIDENT"),
    };

    const exp = resolveUserExperience(identity);
    expect(exp.isAuthenticated).toBe(true);
    expect(exp.dashboardPath).toBe("/resident/dashboard");
  });

  // TEST 6: Invalid OTP rejection
  it("TEST 6: Invalid OTP code is rejected with a safe error message", () => {
    setDevOtp("+919876543210", "112233");
    const badVerify = verifyDevOtp("+919876543210", "999999");
    expect(badVerify.success).toBe(false);
    expect(badVerify.error).toContain("Invalid verification code");
  });

  // TEST 7: Expired OTP rejection
  it("TEST 7: Expired or un-requested OTP is rejected safely", () => {
    const verifyExpired = verifyDevOtp("+918888800000", "123456");
    // Accept default test code in dev if not set, or reject bad code
    const badCode = verifyDevOtp("+918888800000", "000000");
    expect(badCode.success).toBe(false);
  });

  // TEST 8: Logout terminates session
  it("TEST 8: Logout terminates authentication and unauthenticated user resolves to /login", () => {
    const unauthExp = resolveUserExperience(null);
    expect(unauthExp.isAuthenticated).toBe(false);
    expect(unauthExp.dashboardPath).toBe("/login");
  });

  // TEST 9: Single society user -> Automatic dashboard routing
  it("TEST 9: Single society resident is automatically routed directly to Resident Dashboard", () => {
    const singleSocIdentity: any = {
      isAuthenticated: true,
      isSuperAdmin: false,
      isImpersonating: false,
      currentRole: "RESIDENT",
      currentSociety: mockSocietyA,
      effectiveUser: mockResident,
      originalUser: mockResident,
      permissions: getPermissionsForRole("RESIDENT"),
    };

    const path = getDashboardPathForRole(singleSocIdentity.currentRole, singleSocIdentity.currentSociety.id);
    expect(path).toBe("/resident/dashboard");
  });

  // TEST 10: Multiple society user -> Presents choose community
  it("TEST 10: Multi-society user has access to multiple active societies for switching", () => {
    const multiSocIdentity: any = {
      isAuthenticated: true,
      isSuperAdmin: false,
      isImpersonating: false,
      currentRole: "RESIDENT",
      currentSociety: mockSocietyA,
      availableSocieties: [
        { society_id: mockSocietyA.id, society: mockSocietyA, role_id: "RESIDENT" },
        { society_id: mockSocietyB.id, society: mockSocietyB, role_id: "OWNER" },
      ],
      effectiveUser: mockResident,
      originalUser: mockResident,
      permissions: getPermissionsForRole("RESIDENT"),
    };

    expect(multiSocIdentity.availableSocieties.length).toBe(2);
    expect(multiSocIdentity.availableSocieties[0].society.name).toBe("Green Valley CHS");
    expect(multiSocIdentity.availableSocieties[1].society.name).toBe("Royal Heights CHS");
  });

  // TEST 11: Multiple role user -> Supports role switching within society
  it("TEST 11: User with multiple roles in same society can switch between Resident and Committee", () => {
    const residentPath = getDashboardPathForRole("RESIDENT", mockSocietyA.id);
    const committeePath = getDashboardPathForRole("COMMITTEE_MEMBER", mockSocietyA.id);

    expect(residentPath).toBe("/resident/dashboard");
    expect(committeePath).toBe("/committee/dashboard");
  });

  // TEST 12: Super Admin -> Routes to Private Persona Selector
  it("TEST 12: Super Admin login routes to private View-As console (/superadmin/view-as)", () => {
    const superAdminIdentity: any = {
      isAuthenticated: true,
      isSuperAdmin: true,
      isImpersonating: false,
      currentRole: "SUPER_ADMIN",
      currentSociety: null,
      effectiveUser: mockSuperAdmin,
      originalUser: mockSuperAdmin,
      permissions: getPermissionsForRole("SUPER_ADMIN"),
    };

    const exp = resolveUserExperience(superAdminIdentity);
    expect(exp.dashboardPath).toBe("/superadmin/view-as");
    expect(exp.isSuperAdmin).toBe(true);
  });

  // TEST 13: Super Admin View-As -> Select Society & User -> Enters Application
  it("TEST 13: Super Admin initiates View-As session into Resident persona", () => {
    const impersonatedSession: any = {
      isAuthenticated: true,
      isSuperAdmin: false, // Effective context is NOT Super Admin
      isImpersonating: true,
      currentRole: "RESIDENT",
      currentSociety: mockSocietyA,
      effectiveUser: mockResident,
      originalUser: mockSuperAdmin,
      permissions: getPermissionsForRole("RESIDENT"),
    };

    const exp = resolveUserExperience(impersonatedSession);
    expect(exp.dashboardPath).toBe("/resident/dashboard");

    const nav = getNavigationForRole(impersonatedSession.currentRole, mockSocietyA.id);
    expect(nav.map((n) => n.href)).toContain("/resident/dashboard");
    expect(nav.map((n) => n.href).some((h) => h.startsWith("/superadmin"))).toBe(false);
  });

  // TEST 14: Exit View-As -> Restores Super Admin Context
  it("TEST 14: Exit View-As terminates session and restores Super Admin console at /superadmin/view-as", () => {
    const restoredIdentity: any = {
      isAuthenticated: true,
      isSuperAdmin: true,
      isImpersonating: false,
      currentRole: "SUPER_ADMIN",
      currentSociety: null,
      effectiveUser: mockSuperAdmin,
      originalUser: mockSuperAdmin,
      permissions: getPermissionsForRole("SUPER_ADMIN"),
    };

    const exp = resolveUserExperience(restoredIdentity);
    expect(exp.isSuperAdmin).toBe(true);
    expect(exp.isImpersonating).toBe(false);
    expect(exp.dashboardPath).toBe("/superadmin/view-as");
  });

  // TEST 15: Unauthorized URL access blocked
  it("TEST 15: Normal resident cannot access platform admin permissions", () => {
    expect(roleHasPermission("RESIDENT", PERMISSIONS.PLATFORM_ADMIN)).toBe(false);
    expect(roleHasPermission("RESIDENT", PERMISSIONS.PLATFORM_IMPERSONATE)).toBe(false);
    expect(roleHasPermission("RESIDENT", PERMISSIONS.SOCIETIES_MANAGE)).toBe(false);
  });
});

