import { describe, it, expect } from "vitest";
import {
  getDashboardPathForRole,
  getNavigationForRole,
  resolveUserExperience,
  PERSONA_DEFINITIONS,
} from "@/lib/auth/persona";
import { RoleId } from "@/lib/types/database";

describe("Phase 3: Centralized Persona Resolution & Smart Routing", () => {
  describe("Role-to-Dashboard Path Mapping", () => {
    it("routes Super Admin directly to the private View-As console", () => {
      expect(getDashboardPathForRole("SUPER_ADMIN")).toBe("/superadmin/view-as");
    });

    it("routes Society Admin directly to the society dashboard", () => {
      expect(getDashboardPathForRole("SOCIETY_ADMIN", "soc-123")).toBe("/society/soc-123/dashboard");
      expect(getDashboardPathForRole("SOCIETY_ADMIN", null)).toBe("/society/dashboard");
    });

    it("routes Resident, Property Owner, and Tenant to the Resident Dashboard", () => {
      expect(getDashboardPathForRole("RESIDENT", "soc-123")).toBe("/resident/dashboard");
      expect(getDashboardPathForRole("OWNER", "soc-123")).toBe("/resident/dashboard");
      expect(getDashboardPathForRole("TENANT", "soc-123")).toBe("/resident/dashboard");
    });

    it("routes Committee Member and Secretary to the Committee Governance Hub", () => {
      expect(getDashboardPathForRole("COMMITTEE_MEMBER", "soc-123")).toBe("/committee/dashboard");
      expect(getDashboardPathForRole("SECRETARY", "soc-123")).toBe("/committee/dashboard");
    });

    it("routes Treasurer to the Finance Treasury Hub", () => {
      expect(getDashboardPathForRole("TREASURER", "soc-123")).toBe("/finance/dashboard");
    });

    it("routes Security to the Gate Checkpoint Dashboard", () => {
      expect(getDashboardPathForRole("SECURITY", "soc-123")).toBe("/security/dashboard");
    });

    it("routes Staff, Facility Manager, and Auditor to the Operations Hub", () => {
      expect(getDashboardPathForRole("STAFF", "soc-123")).toBe("/staff/dashboard");
      expect(getDashboardPathForRole("MANAGER", "soc-123")).toBe("/staff/dashboard");
      expect(getDashboardPathForRole("AUDITOR", "soc-123")).toBe("/staff/dashboard");
    });

    it("routes Vendor to the Vendor Portal", () => {
      expect(getDashboardPathForRole("VENDOR", "soc-123")).toBe("/vendor/dashboard");
    });
  });

  describe("Persona Navigation Generation & Role Neutrality", () => {
    it("generates Super Admin links strictly when operating in Super Admin context", () => {
      const nav = getNavigationForRole("SUPER_ADMIN");
      expect(nav.map((n) => n.href)).toContain("/superadmin/view-as");
      expect(nav.map((n) => n.href)).toContain("/superadmin");
      expect(nav.map((n) => n.href)).toContain("/superadmin/societies");
    });

    it("never includes Super Admin links for Resident, Owner, or Tenant navigation", () => {
      const residentNav = getNavigationForRole("RESIDENT", "soc-123");
      const ownerNav = getNavigationForRole("OWNER", "soc-123");
      const tenantNav = getNavigationForRole("TENANT", "soc-123");

      [residentNav, ownerNav, tenantNav].forEach((nav) => {
        const hrefs = nav.map((n) => n.href);
        expect(hrefs.some((h) => h.startsWith("/superadmin"))).toBe(false);
        expect(hrefs).toContain("/resident/dashboard");
      });
    });

    it("never includes Super Admin links for Security Gate or Staff navigation", () => {
      const securityNav = getNavigationForRole("SECURITY", "soc-123");
      const staffNav = getNavigationForRole("STAFF", "soc-123");

      expect(securityNav.map((n) => n.href).some((h) => h.startsWith("/superadmin"))).toBe(false);
      expect(staffNav.map((n) => n.href).some((h) => h.startsWith("/superadmin"))).toBe(false);
    });
  });

  describe("Centralized Experience Resolver", () => {
    it("resolves unauthenticated identity to /login", () => {
      const exp = resolveUserExperience(null);
      expect(exp.isAuthenticated).toBe(false);
      expect(exp.dashboardPath).toBe("/login");
      expect(exp.navigation).toEqual([]);
    });

    it("resolves normal Resident identity to resident dashboard and clean nav", () => {
      const mockIdentity: any = {
        isAuthenticated: true,
        isSuperAdmin: false,
        isImpersonating: false,
        currentRole: "RESIDENT",
        currentSociety: { id: "soc-100", name: "Green Valley CHS" },
        effectiveUser: { id: "user-1", email: "rahul@greenvalley.internal" },
        permissions: [],
      };

      const exp = resolveUserExperience(mockIdentity);
      expect(exp.isAuthenticated).toBe(true);
      expect(exp.role).toBe("RESIDENT");
      expect(exp.dashboardPath).toBe("/resident/dashboard");
      expect(exp.navigation.some((n) => n.href.startsWith("/superadmin"))).toBe(false);
    });

    it("resolves Super Admin identity to private View-As console", () => {
      const mockAdmin: any = {
        isAuthenticated: true,
        isSuperAdmin: true,
        isImpersonating: false,
        currentRole: "SUPER_ADMIN",
        currentSociety: null,
        effectiveUser: { id: "admin-1", email: "superadmin@dwellsync.internal" },
        permissions: [],
      };

      const exp = resolveUserExperience(mockAdmin);
      expect(exp.isAuthenticated).toBe(true);
      expect(exp.isSuperAdmin).toBe(true);
      expect(exp.dashboardPath).toBe("/superadmin/view-as");
    });
  });
});

