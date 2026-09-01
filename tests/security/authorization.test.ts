import { describe, it, expect } from "vitest";
import { PERMISSIONS, getPermissionsForRole, roleHasPermission } from "../../src/lib/auth/permissions";

describe("Phase 0 Authorization & Role Permission System", () => {
  describe("Super Admin Permissions", () => {
    it("should possess all platform and society permissions", () => {
      const perms = getPermissionsForRole("SUPER_ADMIN");
      expect(perms).toContain(PERMISSIONS.PLATFORM_ADMIN);
      expect(perms).toContain(PERMISSIONS.PLATFORM_IMPERSONATE);
      expect(perms).toContain(PERMISSIONS.SOCIETIES_CREATE);
      expect(perms).toContain(PERMISSIONS.BUILDING_CREATE);
      expect(perms).toContain(PERMISSIONS.UNIT_CREATE);
    });
  });

  describe("Society Admin Permissions", () => {
    it("should have society and structural management permissions", () => {
      const perms = getPermissionsForRole("SOCIETY_ADMIN");
      expect(perms).toContain(PERMISSIONS.SOCIETY_VIEW);
      expect(perms).toContain(PERMISSIONS.BUILDING_CREATE);
      expect(perms).toContain(PERMISSIONS.WING_CREATE);
      expect(perms).toContain(PERMISSIONS.FLOOR_CREATE);
      expect(perms).toContain(PERMISSIONS.UNIT_CREATE);
      expect(perms).toContain(PERMISSIONS.RESIDENTS_MANAGE);
    });

    it("should NOT possess platform-level permissions", () => {
      const perms = getPermissionsForRole("SOCIETY_ADMIN");
      expect(perms).not.toContain(PERMISSIONS.PLATFORM_ADMIN);
      expect(perms).not.toContain(PERMISSIONS.PLATFORM_IMPERSONATE);
      expect(perms).not.toContain(PERMISSIONS.USERS_MANAGE_PLATFORM);
    });
  });

  describe("Manager & Staff Permissions", () => {
    it("manager should have building and unit update permissions", () => {
      expect(roleHasPermission("MANAGER", PERMISSIONS.BUILDING_UPDATE)).toBe(true);
      expect(roleHasPermission("MANAGER", PERMISSIONS.UNIT_UPDATE)).toBe(true);
      expect(roleHasPermission("MANAGER", PERMISSIONS.BUILDING_CREATE)).toBe(false);
    });

    it("staff should only have view and task handling permissions", () => {
      expect(roleHasPermission("STAFF", PERMISSIONS.BUILDING_VIEW)).toBe(true);
      expect(roleHasPermission("STAFF", PERMISSIONS.BUILDING_CREATE)).toBe(false);
    });
  });

  describe("Resident Permissions", () => {
    it("should have basic read permissions and ticket creation", () => {
      const perms = getPermissionsForRole("RESIDENT");
      expect(perms).toContain(PERMISSIONS.SOCIETY_VIEW);
      expect(perms).toContain(PERMISSIONS.BUILDING_VIEW);
      expect(perms).toContain(PERMISSIONS.UNIT_VIEW);
      expect(perms).not.toContain(PERMISSIONS.BUILDING_CREATE);
      expect(perms).not.toContain(PERMISSIONS.UNIT_CREATE);
    });
  });

  describe("Auditor Permissions", () => {
    it("should have read-only access to society, billing and audit", () => {
      expect(roleHasPermission("AUDITOR", PERMISSIONS.SOCIETY_VIEW)).toBe(true);
      expect(roleHasPermission("AUDITOR", PERMISSIONS.BILLING_VIEW)).toBe(true);
      expect(roleHasPermission("AUDITOR", PERMISSIONS.AUDIT_VIEW)).toBe(true);
      expect(roleHasPermission("AUDITOR", PERMISSIONS.BILLING_MANAGE)).toBe(false);
    });
  });
});
