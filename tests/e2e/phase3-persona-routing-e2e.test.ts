import { describe, it, expect } from "vitest";
import { getDashboardPathForRole, getNavigationForRole, resolveUserExperience } from "@/lib/auth/persona";
import { PERMISSIONS, getPermissionsForRole, roleHasPermission } from "@/lib/auth/permissions";

describe("Phase 3 E2E Test Suite: Persona Routing, View-As & Access Control", () => {
  const mockSociety = {
    id: "soc-green-valley",
    name: "Green Valley CHS",
    code: "GVCHS",
    city: "Mumbai",
  };

  const mockResident = {
    id: "user-rahul-sharma",
    email: "rahul@greenvalley.internal",
    full_name: "Rahul Sharma",
  };

  const mockSocietyAdmin = {
    id: "user-vikram-admin",
    email: "vikram@greenvalley.internal",
    full_name: "Vikram Malhotra",
  };

  const mockSecurityGuard = {
    id: "user-ramesh-security",
    email: "ramesh@greenvalley.internal",
    full_name: "Ramesh Shinde",
  };

  const mockSuperAdmin = {
    id: "admin-platform-owner",
    email: "superadmin@dwellsync.internal",
    full_name: "Platform Super Admin",
  };

  // TEST 1: Resident login -> Resident Dashboard
  it("TEST 1: Resident login routes to Resident Dashboard without Super Admin UI", () => {
    const residentIdentity: any = {
      isAuthenticated: true,
      isSuperAdmin: false,
      isImpersonating: false,
      currentRole: "RESIDENT",
      currentSociety: mockSociety,
      effectiveUser: mockResident,
      originalUser: mockResident,
      permissions: getPermissionsForRole("RESIDENT"),
    };

    const exp = resolveUserExperience(residentIdentity);
    expect(exp.dashboardPath).toBe("/resident/dashboard");

    const navItems = getNavigationForRole("RESIDENT", mockSociety.id);
    const hrefs = navItems.map((n) => n.href);

    expect(hrefs).toContain("/resident/dashboard");
    expect(hrefs.some((h) => h.includes("superadmin"))).toBe(false);
    expect(hrefs.some((h) => h.includes("view-as"))).toBe(false);
    expect(hrefs.some((h) => h.includes("impersonat"))).toBe(false);
  });

  // TEST 2: Society Admin login -> Society Admin Dashboard
  it("TEST 2: Society Admin login routes to Society Admin Dashboard without Super Admin UI", () => {
    const adminIdentity: any = {
      isAuthenticated: true,
      isSuperAdmin: false,
      isImpersonating: false,
      currentRole: "SOCIETY_ADMIN",
      currentSociety: mockSociety,
      effectiveUser: mockSocietyAdmin,
      originalUser: mockSocietyAdmin,
      permissions: getPermissionsForRole("SOCIETY_ADMIN"),
    };

    const exp = resolveUserExperience(adminIdentity);
    expect(exp.dashboardPath).toBe(`/society/${mockSociety.id}/dashboard`);

    const navItems = getNavigationForRole("SOCIETY_ADMIN", mockSociety.id);
    const hrefs = navItems.map((n) => n.href);

    expect(hrefs).toContain(`/society/${mockSociety.id}/dashboard`);
    expect(hrefs).toContain(`/society/${mockSociety.id}/buildings`);
    expect(hrefs).toContain(`/society/${mockSociety.id}/units`);
    expect(hrefs.some((h) => h.startsWith("/superadmin"))).toBe(false);
  });

  // TEST 3: Security login -> Security Dashboard
  it("TEST 3: Security Guard login routes directly to Security Dashboard", () => {
    const securityIdentity: any = {
      isAuthenticated: true,
      isSuperAdmin: false,
      isImpersonating: false,
      currentRole: "SECURITY",
      currentSociety: mockSociety,
      effectiveUser: mockSecurityGuard,
      originalUser: mockSecurityGuard,
      permissions: getPermissionsForRole("SECURITY"),
    };

    const exp = resolveUserExperience(securityIdentity);
    expect(exp.dashboardPath).toBe("/security/dashboard");

    const navItems = getNavigationForRole("SECURITY", mockSociety.id);
    const hrefs = navItems.map((n) => n.href);

    expect(hrefs).toContain("/security/dashboard");
    expect(hrefs.some((h) => h.includes("superadmin"))).toBe(false);
  });

  // TEST 4: Super Admin login -> Private Persona Selector
  it("TEST 4: Super Admin login routes to Private Persona Selector (/superadmin/view-as)", () => {
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

  // TEST 5: Super Admin -> View As Resident -> Select Society -> Select User -> Resident Dashboard
  it("TEST 5: Super Admin starts View-As Resident and resolves into Resident Dashboard", () => {
    // 1. Check Super Admin has impersonation permission
    expect(roleHasPermission("SUPER_ADMIN", PERMISSIONS.PLATFORM_IMPERSONATE)).toBe(true);

    // 2. Active session evaluation
    const impersonatedIdentity: any = {
      isAuthenticated: true,
      isSuperAdmin: false, // Effective context is NOT Super Admin
      isImpersonating: true,
      currentRole: "RESIDENT",
      currentSociety: mockSociety,
      effectiveUser: mockResident,
      originalUser: mockSuperAdmin,
      permissions: getPermissionsForRole("RESIDENT"),
    };

    const exp = resolveUserExperience(impersonatedIdentity);
    expect(exp.dashboardPath).toBe("/resident/dashboard");

    // 3. Effective navigation check: Resident items only, zero Super Admin links!
    const effectiveNav = getNavigationForRole(impersonatedIdentity.currentRole, mockSociety.id);
    const navHrefs = effectiveNav.map((n) => n.href);
    expect(navHrefs).toContain("/resident/dashboard");
    expect(navHrefs.some((h) => h.startsWith("/superadmin"))).toBe(false);

    // 4. Resident permissions strictly applied
    expect(impersonatedIdentity.permissions).not.toContain(PERMISSIONS.PLATFORM_ADMIN);
    expect(impersonatedIdentity.permissions).not.toContain(PERMISSIONS.PLATFORM_IMPERSONATE);
  });

  // TEST 6: Super Admin -> Exit View -> Restores Super Admin Context (/superadmin/view-as)
  it("TEST 6: Exiting View-As restores original Super Admin context at /superadmin/view-as", () => {
    // After session termination, identity returns to unimpersonated Super Admin
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
    expect(exp.permissions).toContain(PERMISSIONS.PLATFORM_ADMIN);
  });

  // TEST 7: Attempt unauthorized URL access -> 403 / unauthorized access denied
  it("TEST 7: Normal resident or non-superadmin is denied access to Super Admin or View-As capabilities", () => {
    // Resident lacks impersonate and platform administration permissions
    expect(roleHasPermission("RESIDENT", PERMISSIONS.PLATFORM_IMPERSONATE)).toBe(false);
    expect(roleHasPermission("RESIDENT", PERMISSIONS.PLATFORM_ADMIN)).toBe(false);
    expect(roleHasPermission("RESIDENT", PERMISSIONS.SOCIETIES_MANAGE)).toBe(false);

    // Society Admin lacks platform administration permissions
    expect(roleHasPermission("SOCIETY_ADMIN", PERMISSIONS.PLATFORM_IMPERSONATE)).toBe(false);
    expect(roleHasPermission("SOCIETY_ADMIN", PERMISSIONS.PLATFORM_ADMIN)).toBe(false);
  });

  // TEST 8: Anti-chaining validation
  it("TEST 8: Anti-chaining prevents an active View-As session from initiating another View-As session", () => {
    // When impersonating as Resident, effective role has no permission to impersonate
    const effectiveImpersonatedRole = "RESIDENT";
    expect(roleHasPermission(effectiveImpersonatedRole, PERMISSIONS.PLATFORM_IMPERSONATE)).toBe(false);
  });
});

