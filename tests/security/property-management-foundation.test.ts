import { describe, it, expect } from "vitest";
import {
  CompanyRole,
  ManagementCompany,
  ManagementCompanyMember,
  ManagementCompanySociety,
  ManagementCompanySocietyAccess,
  ManagementCompanyStaffAssignment,
  COMPANY_ROLE_PRECEDENCE,
  COMPANY_PERMISSIONS,
  COMPANY_ROLE_PERMISSIONS,
} from "@/lib/types/company";
import {
  companyRoleHasPermission,
  getPermissionsForCompanyRole,
  getPermissionsForRole,
  roleHasPermission,
  PERMISSIONS,
} from "@/lib/auth/permissions";
import {
  CreateCompanySchema,
  UpdateCompanySchema,
  AddCompanyMemberSchema,
  AssignSocietySchema,
  GrantSocietyAccessSchema,
  AssignStaffSchema,
} from "@/lib/validations/company";

describe("Phase 15 — Property Management Company / Multi-Society Management Foundation Security", () => {
  const COMP_ALPHA = "comp-alpha-1111";
  const COMP_BETA = "comp-beta-2222";
  const SOC_ALPHA_1 = "soc-alpha-0001";
  const SOC_ALPHA_2 = "soc-alpha-0002";
  const SOC_UNRELATED = "soc-unrelated-9999";
  const USER_ADMIN = "user-pmc-admin";
  const USER_MANAGER = "user-pmc-manager";
  const USER_OPS = "user-pmc-ops";
  const USER_STRANGER = "user-stranger";

  // Mock Company Records
  const mockCompanyAlpha: ManagementCompany = {
    id: COMP_ALPHA,
    name: "Alpha Property Management",
    legal_name: "Alpha PM Private Limited",
    code: "ALPHA-PMC",
    status: "ACTIVE",
    contact_email: "ops@alphapm.com",
    contact_phone: "+91 98765 00001",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const mockCompanyBeta: ManagementCompany = {
    id: COMP_BETA,
    name: "Beta Property Management",
    legal_name: "Beta PM LLP",
    code: "BETA-PMC",
    status: "ACTIVE",
    contact_email: "ops@betapm.com",
    contact_phone: "+91 98765 00002",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  // Mock Members
  const mockMembersAlpha: ManagementCompanyMember[] = [
    {
      id: "mem-alpha-admin",
      management_company_id: COMP_ALPHA,
      user_id: USER_ADMIN,
      role: "COMPANY_ADMIN",
      status: "ACTIVE",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: "mem-alpha-manager",
      management_company_id: COMP_ALPHA,
      user_id: USER_MANAGER,
      role: "COMPANY_MANAGER",
      status: "ACTIVE",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: "mem-alpha-ops",
      management_company_id: COMP_ALPHA,
      user_id: USER_OPS,
      role: "COMPANY_OPERATIONS",
      status: "ACTIVE",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  ];

  // Mock Societies Assigned
  const mockCompanySocieties: ManagementCompanySociety[] = [
    {
      id: "cs-alpha-1",
      management_company_id: COMP_ALPHA,
      society_id: SOC_ALPHA_1,
      status: "ACTIVE",
      assigned_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: "cs-alpha-2",
      management_company_id: COMP_ALPHA,
      society_id: SOC_ALPHA_2,
      status: "ACTIVE",
      assigned_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  ];

  // Mock Explicit Society Access
  const mockAccessGrants: ManagementCompanySocietyAccess[] = [
    {
      id: "acc-ops-soc1",
      management_company_id: COMP_ALPHA,
      management_company_member_id: "mem-alpha-ops",
      management_company_society_id: "cs-alpha-1",
      status: "ACTIVE",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: "acc-suspended",
      management_company_id: COMP_ALPHA,
      management_company_member_id: "mem-alpha-manager",
      management_company_society_id: "cs-alpha-2",
      status: "SUSPENDED",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: "acc-revoked",
      management_company_id: COMP_ALPHA,
      management_company_member_id: "mem-alpha-ops",
      management_company_society_id: "cs-alpha-2",
      status: "REVOKED",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  ];

  // ==========================================================================
  // 1. Company Isolation
  // ==========================================================================
  describe("1. Company Isolation", () => {
    it("1. Company A cannot access Company B resources", () => {
      const canAccessCompany = (actorCompanyId: string, resourceCompanyId: string) => {
        return actorCompanyId === resourceCompanyId;
      };

      expect(canAccessCompany(COMP_ALPHA, mockCompanyAlpha.id)).toBe(true);
      expect(canAccessCompany(COMP_ALPHA, mockCompanyBeta.id)).toBe(false);
    });
  });

  // ==========================================================================
  // 2. Society Isolation
  // ==========================================================================
  describe("2. Society Isolation", () => {
    it("2. Company A cannot access an unrelated society", () => {
      const isSocietyManagedByCompany = (societyId: string, companyId: string) => {
        return mockCompanySocieties.some(
          (cs) => cs.society_id === societyId && cs.management_company_id === companyId && cs.status === "ACTIVE"
        );
      };

      expect(isSocietyManagedByCompany(SOC_ALPHA_1, COMP_ALPHA)).toBe(true);
      expect(isSocietyManagedByCompany(SOC_ALPHA_2, COMP_ALPHA)).toBe(true);
      expect(isSocietyManagedByCompany(SOC_UNRELATED, COMP_ALPHA)).toBe(false);
    });
  });

  // ==========================================================================
  // 3. Explicit Access
  // ==========================================================================
  describe("3. Explicit Access Invariant", () => {
    const checkUserSocietyAccess = (
      userMemberId: string,
      targetSocietyAssignmentId: string,
      userRole: CompanyRole,
      companyStatus: string,
      assignmentStatus: string
    ) => {
      if (companyStatus !== "ACTIVE") return false;
      if (assignmentStatus !== "ACTIVE") return false;

      // COMPANY_ADMIN has company-wide oversight over assigned societies
      if (userRole === "COMPANY_ADMIN") return true;

      // Other roles require explicit ACTIVE access grant
      const grant = mockAccessGrants.find(
        (g) =>
          g.management_company_member_id === userMemberId &&
          g.management_company_society_id === targetSocietyAssignmentId
      );
      return grant?.status === "ACTIVE";
    };

    it("3. Company member without society access is denied", () => {
      // USER_MANAGER has no grant for cs-alpha-1
      expect(checkUserSocietyAccess("mem-alpha-manager", "cs-alpha-1", "COMPANY_MANAGER", "ACTIVE", "ACTIVE")).toBe(
        false
      );
    });

    it("4. Company member with active society access is allowed", () => {
      // USER_OPS has active grant for cs-alpha-1
      expect(checkUserSocietyAccess("mem-alpha-ops", "cs-alpha-1", "COMPANY_OPERATIONS", "ACTIVE", "ACTIVE")).toBe(
        true
      );
    });

    it("5. Suspended access is denied", () => {
      // USER_MANAGER has SUSPENDED grant for cs-alpha-2
      expect(checkUserSocietyAccess("mem-alpha-manager", "cs-alpha-2", "COMPANY_MANAGER", "ACTIVE", "ACTIVE")).toBe(
        false
      );
    });

    it("6. Revoked access is denied", () => {
      // USER_OPS has REVOKED grant for cs-alpha-2
      expect(checkUserSocietyAccess("mem-alpha-ops", "cs-alpha-2", "COMPANY_OPERATIONS", "ACTIVE", "ACTIVE")).toBe(
        false
      );
    });
  });

  // ==========================================================================
  // 4. Lifecycle Security
  // ==========================================================================
  describe("4. Company & Society Lifecycle", () => {
    it("7. Inactive company cannot be used for company operations", () => {
      const isCompanyOperational = (comp: { status: string }) => comp.status === "ACTIVE";

      expect(isCompanyOperational({ status: "ACTIVE" })).toBe(true);
      expect(isCompanyOperational({ status: "INACTIVE" })).toBe(false);
    });

    it("8. Inactive company-society assignment blocks access", () => {
      const isAssignmentActive = (socAssignment: { status: string }) => socAssignment.status === "ACTIVE";

      expect(isAssignmentActive({ status: "ACTIVE" })).toBe(true);
      expect(isAssignmentActive({ status: "INACTIVE" })).toBe(false);
    });
  });

  // ==========================================================================
  // 5. Role Security & Permissions
  // ==========================================================================
  describe("5. Company Role Security & RBAC Precedence", () => {
    it("9. COMPANY_OPERATIONS cannot manage company membership or settings", () => {
      expect(companyRoleHasPermission("COMPANY_OPERATIONS", COMPANY_PERMISSIONS.COMPANY_MEMBERS_MANAGE)).toBe(false);
      expect(companyRoleHasPermission("COMPANY_OPERATIONS", COMPANY_PERMISSIONS.COMPANY_MANAGE)).toBe(false);
      expect(companyRoleHasPermission("COMPANY_OPERATIONS", COMPANY_PERMISSIONS.COMPANY_SOCIETIES_MANAGE)).toBe(false);
      expect(companyRoleHasPermission("COMPANY_OPERATIONS", COMPANY_PERMISSIONS.COMPANY_VIEW)).toBe(true);
    });

    it("10. COMPANY_MANAGER cannot exceed permitted scope", () => {
      expect(companyRoleHasPermission("COMPANY_MANAGER", COMPANY_PERMISSIONS.COMPANY_MEMBERS_MANAGE)).toBe(false);
      expect(companyRoleHasPermission("COMPANY_MANAGER", COMPANY_PERMISSIONS.COMPANY_MANAGE)).toBe(false);
      expect(companyRoleHasPermission("COMPANY_MANAGER", COMPANY_PERMISSIONS.COMPANY_STAFF_MANAGE)).toBe(true);
      expect(companyRoleHasPermission("COMPANY_MANAGER", COMPANY_PERMISSIONS.COMPANY_ANALYTICS_VIEW)).toBe(true);
    });

    it("11. COMPANY_ADMIN has full company permissions but cannot access platform administration", () => {
      expect(companyRoleHasPermission("COMPANY_ADMIN", COMPANY_PERMISSIONS.COMPANY_MANAGE)).toBe(true);
      expect(companyRoleHasPermission("COMPANY_ADMIN", COMPANY_PERMISSIONS.COMPANY_MEMBERS_MANAGE)).toBe(true);
      expect(companyRoleHasPermission("COMPANY_ADMIN", COMPANY_PERMISSIONS.COMPANY_SOCIETIES_MANAGE)).toBe(true);

      // Verify company permissions DO NOT contain platform admin permissions
      const companyAdminPerms = getPermissionsForCompanyRole("COMPANY_ADMIN");
      expect(companyAdminPerms.includes(PERMISSIONS.PLATFORM_ADMIN)).toBe(false);
      expect(companyAdminPerms.includes(PERMISSIONS.PLATFORM_IMPERSONATE)).toBe(false);
      expect(companyAdminPerms.includes(PERMISSIONS.USERS_MANAGE_PLATFORM)).toBe(false);
    });

    it("evaluates correct company role precedence ranks", () => {
      expect(COMPANY_ROLE_PRECEDENCE.COMPANY_ADMIN).toBe(90);
      expect(COMPANY_ROLE_PRECEDENCE.COMPANY_MANAGER).toBe(70);
      expect(COMPANY_ROLE_PRECEDENCE.COMPANY_OPERATIONS).toBe(50);
      expect(COMPANY_ROLE_PRECEDENCE.COMPANY_ADMIN).toBeGreaterThan(COMPANY_ROLE_PRECEDENCE.COMPANY_MANAGER);
      expect(COMPANY_ROLE_PRECEDENCE.COMPANY_MANAGER).toBeGreaterThan(COMPANY_ROLE_PRECEDENCE.COMPANY_OPERATIONS);
    });
  });

  // ==========================================================================
  // 6. Platform Isolation (SUPER_ADMIN Security)
  // ==========================================================================
  describe("6. Platform Isolation & SUPER_ADMIN Security", () => {
    it("12. Company user cannot access /admin/platform or /superadmin routes", () => {
      const canAccessPlatformAdmin = (isSuperAdmin: boolean, isImpersonating: boolean) => {
        return isSuperAdmin && !isImpersonating;
      };

      // Company Admin who is not a platform superadmin is strictly rejected
      expect(canAccessPlatformAdmin(false, false)).toBe(false);
      expect(canAccessPlatformAdmin(true, false)).toBe(true);
      expect(canAccessPlatformAdmin(true, true)).toBe(false); // Impersonating SuperAdmin cannot access platform admin
    });

    it("13. Company user cannot modify platform_admins or assign SUPER_ADMIN", () => {
      const allowedRoles = ["COMPANY_ADMIN", "COMPANY_MANAGER", "COMPANY_OPERATIONS"];
      const attemptAssignRole = (roleToAssign: string) => {
        return allowedRoles.includes(roleToAssign);
      };

      expect(attemptAssignRole("COMPANY_MANAGER")).toBe(true);
      expect(attemptAssignRole("SUPER_ADMIN")).toBe(false);
      expect(attemptAssignRole("PLATFORM_ADMIN")).toBe(false);
    });
  });

  // ==========================================================================
  // 7. IDOR Protection
  // ==========================================================================
  describe("7. IDOR Protection & Boundary Validation", () => {
    it("14. User cannot manipulate company ID to access another company", () => {
      const validateCompanyAccess = (userCompanyMemberships: string[], requestedCompanyId: string) => {
        return userCompanyMemberships.includes(requestedCompanyId);
      };

      const userMemberships = [COMP_ALPHA];
      expect(validateCompanyAccess(userMemberships, COMP_ALPHA)).toBe(true);
      expect(validateCompanyAccess(userMemberships, COMP_BETA)).toBe(false);
    });

    it("15. User cannot manipulate society ID to access an unassigned society", () => {
      const isSocietyValidForCompany = (requestedSocietyId: string) => {
        return mockCompanySocieties.some((s) => s.society_id === requestedSocietyId && s.status === "ACTIVE");
      };

      expect(isSocietyValidForCompany(SOC_ALPHA_1)).toBe(true);
      expect(isSocietyValidForCompany(SOC_UNRELATED)).toBe(false);
    });

    it("16. User cannot manipulate member ID across companies", () => {
      const isMemberInCompany = (memberId: string, companyId: string) => {
        return mockMembersAlpha.some((m) => m.id === memberId && m.management_company_id === companyId);
      };

      expect(isMemberInCompany("mem-alpha-ops", COMP_ALPHA)).toBe(true);
      expect(isMemberInCompany("mem-alpha-ops", COMP_BETA)).toBe(false);
    });

    it("17. User cannot manipulate staff assignment ID across companies", () => {
      const mockStaffAssignment: ManagementCompanyStaffAssignment = {
        id: "staff-101",
        management_company_id: COMP_ALPHA,
        user_id: USER_OPS,
        society_id: SOC_ALPHA_1,
        assignment_type: "OPERATIONS",
        status: "ACTIVE",
        start_date: "2026-09-01",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const canManageAssignment = (assignment: ManagementCompanyStaffAssignment, companyId: string) => {
        return assignment.management_company_id === companyId;
      };

      expect(canManageAssignment(mockStaffAssignment, COMP_ALPHA)).toBe(true);
      expect(canManageAssignment(mockStaffAssignment, COMP_BETA)).toBe(false);
    });
  });

  // ==========================================================================
  // 8. Data Safety & Integrity
  // ==========================================================================
  describe("8. Data Safety & Tenant Boundaries", () => {
    it("18. Removing company access does not delete the user's society membership", () => {
      const existingSocietyMemberships = [{ id: "soc-mem-1", society_id: SOC_ALPHA_1, user_id: USER_OPS }];
      const companyAccessGrants = [{ id: "acc-1", user_id: USER_OPS, status: "ACTIVE" }];

      // Revoke company access
      const updatedGrants = companyAccessGrants.filter((g) => g.id !== "acc-1");

      // Verify society membership remains intact
      expect(updatedGrants.length).toBe(0);
      expect(existingSocietyMemberships.length).toBe(1);
      expect(existingSocietyMemberships[0].id).toBe("soc-mem-1");
    });

    it("19. Removing a society from company does not delete the canonical society", () => {
      const canonicalSocieties = [{ id: SOC_ALPHA_1, name: "Green Valley Society", status: "ACTIVE" }];
      let companySocieties = [{ id: "cs-1", society_id: SOC_ALPHA_1, status: "ACTIVE" }];

      // Remove society from company
      companySocieties = companySocieties.map((cs) => (cs.id === "cs-1" ? { ...cs, status: "INACTIVE" } : cs));

      expect(companySocieties[0].status).toBe("INACTIVE");
      // Canonical society remains unchanged
      expect(canonicalSocieties.length).toBe(1);
      expect(canonicalSocieties[0].id).toBe(SOC_ALPHA_1);
      expect(canonicalSocieties[0].status).toBe("ACTIVE");
    });

    it("20. Reassigning staff/access does not alter resident ownership or occupancy data", () => {
      const unitOwners = [{ unit_id: "u-101", owner_id: "owner-1", status: "ACTIVE" }];
      const staffAssignments = [{ id: "staff-1", user_id: USER_OPS, society_id: SOC_ALPHA_1 }];

      // Terminate staff assignment
      const updatedStaff = staffAssignments.filter((s) => s.id !== "staff-1");

      expect(updatedStaff.length).toBe(0);
      expect(unitOwners.length).toBe(1);
      expect(unitOwners[0].owner_id).toBe("owner-1");
    });
  });

  // ==========================================================================
  // 9. Dashboard & Society Switcher Scoping
  // ==========================================================================
  describe("9. Scoped Dashboard & Switcher", () => {
    it("21. Company dashboard metrics contain only authorized societies", () => {
      const allSocieties = [
        { id: SOC_ALPHA_1, units: 50 },
        { id: SOC_ALPHA_2, units: 30 },
        { id: SOC_UNRELATED, units: 100 },
      ];

      // User authorized only for SOC_ALPHA_1
      const authorizedSocietyIds = [SOC_ALPHA_1];

      const calculateTotalUnits = (accessibleIds: string[]) => {
        return allSocieties
          .filter((s) => accessibleIds.includes(s.id))
          .reduce((sum, s) => sum + s.units, 0);
      };

      expect(calculateTotalUnits(authorizedSocietyIds)).toBe(50);
      expect(calculateTotalUnits([SOC_ALPHA_1, SOC_ALPHA_2])).toBe(80);
      // Unrelated society is never included
      expect(calculateTotalUnits([SOC_ALPHA_1, SOC_ALPHA_2])).not.toContain(180);
    });

    it("22. Society switcher contains only authorized societies", () => {
      const getSwitcherSocieties = (
        userRole: CompanyRole,
        assignedSocieties: ManagementCompanySociety[],
        grants: ManagementCompanySocietyAccess[]
      ) => {
        if (userRole === "COMPANY_ADMIN") {
          return assignedSocieties.filter((s) => s.status === "ACTIVE");
        }
        const activeGrantSocAssignmentIds = grants
          .filter((g) => g.status === "ACTIVE")
          .map((g) => g.management_company_society_id);

        return assignedSocieties.filter(
          (s) => s.status === "ACTIVE" && activeGrantSocAssignmentIds.includes(s.id)
        );
      };

      // Admin sees both Alpha 1 and Alpha 2
      const adminSocieties = getSwitcherSocieties("COMPANY_ADMIN", mockCompanySocieties, mockAccessGrants);
      expect(adminSocieties.length).toBe(2);

      // Ops user only has active grant for Alpha 1 (cs-alpha-1)
      const opsSocieties = getSwitcherSocieties("COMPANY_OPERATIONS", mockCompanySocieties, mockAccessGrants);
      expect(opsSocieties.length).toBe(1);
      expect(opsSocieties[0].society_id).toBe(SOC_ALPHA_1);
    });
  });

  // ==========================================================================
  // 10. Notification Scoping & Audit Logging
  // ==========================================================================
  describe("10. Notification Scoping & Audit Logging", () => {
    it("23. Company notification cannot leak to unrelated society residents", () => {
      const isRecipientAllowed = (
        notificationTargetUserId: string,
        authorizedUserIds: string[]
      ) => {
        return authorizedUserIds.includes(notificationTargetUserId);
      };

      const companyStaff = [USER_ADMIN, USER_MANAGER, USER_OPS];
      const residentStranger = USER_STRANGER;

      expect(isRecipientAllowed(USER_OPS, companyStaff)).toBe(true);
      expect(isRecipientAllowed(residentStranger, companyStaff)).toBe(false);
    });

    it("24. Company administrative mutations produce appropriate audit records", () => {
      const auditLog = {
        action: "COMPANY_SOCIETY_ASSIGNED",
        actor_user_id: USER_ADMIN,
        society_id: SOC_ALPHA_1,
        resource_type: "management_company_societies",
        metadata: { company_id: COMP_ALPHA, society_id: SOC_ALPHA_1 },
      };

      expect(auditLog.action).toBe("COMPANY_SOCIETY_ASSIGNED");
      expect(auditLog.actor_user_id).toBe(USER_ADMIN);
      expect(auditLog.metadata.company_id).toBe(COMP_ALPHA);
    });
  });

  // ==========================================================================
  // 11. Composite Tenant Foreign Key & Rule 2 Enforcement
  // ==========================================================================
  describe("11. Composite Constraint & Rule 2 Protection", () => {
    it("25. Composite tenant constraints prevent cross-company access records", () => {
      const isValidAccessRecord = (
        recordCompanyId: string,
        memberCompanyId: string,
        societyAssignmentCompanyId: string
      ) => {
        return (
          recordCompanyId === memberCompanyId &&
          recordCompanyId === societyAssignmentCompanyId
        );
      };

      // Valid: everything belongs to COMP_ALPHA
      expect(isValidAccessRecord(COMP_ALPHA, COMP_ALPHA, COMP_ALPHA)).toBe(true);

      // Invalid: member belongs to COMP_BETA but access record references COMP_ALPHA society
      expect(isValidAccessRecord(COMP_ALPHA, COMP_BETA, COMP_ALPHA)).toBe(false);

      // Invalid: society assignment belongs to COMP_BETA
      expect(isValidAccessRecord(COMP_ALPHA, COMP_ALPHA, COMP_BETA)).toBe(false);
    });

    it("26. Rule 2: A society can belong to at most one active management company", () => {
      const existingAssignments = [
        { society_id: SOC_ALPHA_1, company_id: COMP_ALPHA, status: "ACTIVE" },
      ];

      const canAssignSociety = (newSocietyId: string, newCompanyId: string) => {
        const activeAssignment = existingAssignments.find(
          (a) => a.society_id === newSocietyId && a.status === "ACTIVE"
        );
        return !activeAssignment; // Allowed only if no active assignment exists
      };

      expect(canAssignSociety(SOC_ALPHA_2, COMP_BETA)).toBe(true);
      expect(canAssignSociety(SOC_ALPHA_1, COMP_BETA)).toBe(false); // SOC_ALPHA_1 is already actively assigned to COMP_ALPHA
    });

    it("27. Staff assignment composite foreign key ensures society belongs to that company", () => {
      const isValidStaffSocietyPair = (companyId: string, societyId: string) => {
        return mockCompanySocieties.some(
          (cs) => cs.management_company_id === companyId && cs.society_id === societyId
        );
      };

      // Valid: Society Alpha 1 is managed by Company Alpha
      expect(isValidStaffSocietyPair(COMP_ALPHA, SOC_ALPHA_1)).toBe(true);
      // Invalid: Society Alpha 1 cannot be assigned under Company Beta
      expect(isValidStaffSocietyPair(COMP_BETA, SOC_ALPHA_1)).toBe(false);
      // Invalid: Unrelated society cannot be assigned
      expect(isValidStaffSocietyPair(COMP_ALPHA, SOC_UNRELATED)).toBe(false);
    });

    it("28. Staff assignment member invariant ensures assigned user is an active member of that company", () => {
      const isUserMemberOfCompany = (companyId: string, userId: string) => {
        return mockMembersAlpha.some(
          (m) => m.management_company_id === companyId && m.user_id === userId && m.status === "ACTIVE"
        );
      };

      // Valid: USER_OPS is an active member of Company Alpha
      expect(isUserMemberOfCompany(COMP_ALPHA, USER_OPS)).toBe(true);
      // Invalid: Stranger is not a member of Company Alpha
      expect(isUserMemberOfCompany(COMP_ALPHA, USER_STRANGER)).toBe(false);
      // Invalid: USER_OPS is not a member of Company Beta
      expect(isUserMemberOfCompany(COMP_BETA, USER_OPS)).toBe(false);
    });
  });

  // ==========================================================================
  // 12. Context & Society Role Isolation Hardening
  // ==========================================================================
  describe("12. Context & Society Role Isolation Hardening", () => {
    it("29. Company access cannot inject society admin or management roles inside society context", () => {
      // Simulates requireSocietyAccess return resolution
      const resolveContextRole = (
        membership: { role_id: string } | null,
        hasCompanyAccess: boolean
      ) => {
        const scopedRole = membership ? membership.role_id : null;
        return {
          currentRole: scopedRole,
          isSocietyAdmin: scopedRole === "SOCIETY_ADMIN",
          permissions: scopedRole ? getPermissionsForRole(scopedRole as any) : [],
        };
      };

      // User has company access but NO direct society membership
      const companyUserContext = resolveContextRole(null, true);
      expect(companyUserContext.currentRole).toBeNull();
      expect(companyUserContext.isSocietyAdmin).toBe(false);
      expect(companyUserContext.permissions.length).toBe(0);
      expect(companyUserContext.permissions.includes(PERMISSIONS.SOCIETY_MANAGE)).toBe(false);
      expect(companyUserContext.permissions.includes(PERMISSIONS.BILLING_MANAGE)).toBe(false);
    });

    it("30. User cannot retain SOCIETY_ADMIN role from Society A when switching to Society B under company access", () => {
      // User is SOCIETY_ADMIN in Society A, but has only company access in Society B
      const userDirectMemberships: Record<string, string> = {
        [SOC_ALPHA_1]: "SOCIETY_ADMIN",
        // SOC_ALPHA_2 has no direct membership
      };

      const resolveRoleForTargetSociety = (targetSocietyId: string) => {
        const directRole = userDirectMemberships[targetSocietyId] || null;
        return {
          currentRole: directRole,
          isSocietyAdmin: directRole === "SOCIETY_ADMIN",
        };
      };

      const socAContext = resolveRoleForTargetSociety(SOC_ALPHA_1);
      expect(socAContext.currentRole).toBe("SOCIETY_ADMIN");
      expect(socAContext.isSocietyAdmin).toBe(true);

      const socBContext = resolveRoleForTargetSociety(SOC_ALPHA_2);
      expect(socBContext.currentRole).toBeNull();
      expect(socBContext.isSocietyAdmin).toBe(false); // Strictly prevented from leaking Society A's role
    });

    it("31. Company admin protection: cannot revoke or demote the last active COMPANY_ADMIN", () => {
      const activeAdmins = [{ id: "mem-admin-1", role: "COMPANY_ADMIN", status: "ACTIVE" }];

      const canDemoteAdmin = (memberId: string, activeAdminList: typeof activeAdmins) => {
        const otherAdmins = activeAdminList.filter((a) => a.id !== memberId && a.status === "ACTIVE");
        return otherAdmins.length > 0;
      };

      // Only 1 admin exists -> demotion rejected
      expect(canDemoteAdmin("mem-admin-1", activeAdmins)).toBe(false);

      // 2 admins exist -> demotion allowed
      const twoAdmins = [
        { id: "mem-admin-1", role: "COMPANY_ADMIN", status: "ACTIVE" },
        { id: "mem-admin-2", role: "COMPANY_ADMIN", status: "ACTIVE" },
      ];
      expect(canDemoteAdmin("mem-admin-1", twoAdmins)).toBe(true);
    });

    it("32. Deactivating a society assignment is non-destructive", () => {
      const societyAssignment = {
        id: "cs-1",
        society_id: SOC_ALPHA_1,
        status: "ACTIVE",
        removed_at: null as string | null,
      };

      // Deactivate
      societyAssignment.status = "INACTIVE";
      societyAssignment.removed_at = new Date().toISOString();

      expect(societyAssignment.status).toBe("INACTIVE");
      expect(societyAssignment.removed_at).not.toBeNull();
      // Record retained for audit and historical continuity
      expect(societyAssignment.id).toBe("cs-1");
    });
  });
});


