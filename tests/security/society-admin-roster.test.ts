import { describe, it, expect } from "vitest";
import {
  isAuthorizedSocietyAdmin,
  canManageRoles,
  validateRoleChange,
  validateMemberRemoval,
  validateMemberQuery,
  ALLOWED_ASSIGNABLE_ROLES,
  SOCIETY_ADMIN_ROLES,
  ROLE_MANAGEMENT_ROLES,
  VALID_MEMBERSHIP_STATUSES,
} from "../../src/lib/auth/societyAdmin";
import { UserIdentity } from "../../src/lib/types/auth";
import { RoleId, Society, SocietyMembership, Profile, MembershipStatus } from "../../src/lib/types/database";

describe("WP-04: Society Administrator Dashboard + Member & Roster Management Security Suite", () => {
  const SOCIETY_A_ID = "07ae6307-13cb-4d14-a547-27914536fc62";
  const SOCIETY_B_ID = "b2c3d4e5-6789-01bc-def0-123456789abc";

  const ADMIN_A_USER_ID = "d52b51a1-026d-4828-81c3-a9f3a48780e6";
  const SECRETARY_A_USER_ID = "sec-user-0001-4828-81c3-a9f3a48780e6";
  const MANAGER_A_USER_ID = "mgr-user-0002-4828-81c3-a9f3a48780e6";
  const RESIDENT_A_USER_ID = "3bbe4296-9dc2-4b79-8894-8225a83f658b";
  const TENANT_A_USER_ID = "tenant-user-0004-4828-81c3-a9f3a48780e6";
  const SECURITY_GUARD_USER_ID = "guard-user-0005-4828-81c3-a9f3a48780e6";

  const ADMIN_B_USER_ID = "99999999-8888-7777-6666-555555555555";
  const RESIDENT_B_USER_ID = "resident-b-8888-7777-6666-555555555555";

  const SUPER_ADMIN_USER_ID = "aaaa1111-bb22-cc33-dd44-ee55ff660000";

  const createMockSociety = (id: string, name: string): Society => ({
    id,
    name,
    code: name.slice(0, 4).toUpperCase(),
    status: "ACTIVE",
    society_type: "COOPERATIVE_HOUSING",
    country: "India",
    timezone: "Asia/Kolkata",
    currency: "INR",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  });

  const societyA = createMockSociety(SOCIETY_A_ID, "Palm Heights Society");
  const societyB = createMockSociety(SOCIETY_B_ID, "Green Valley Residency");

  const createMockProfile = (id: string, email: string, name: string): Profile => ({
    id,
    email,
    full_name: name,
    display_name: name,
    avatar_url: null,
    phone: "+919800000000",
    status: "ACTIVE",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  });

  const createMockIdentity = (params: {
    userId: string;
    email: string;
    role: RoleId | null;
    society: Society | null;
    isSuperAdmin?: boolean;
    isImpersonating?: boolean;
    targetSocietyId?: string;
    targetRoleId?: RoleId;
    availableMemberships?: (SocietyMembership & { society: Society })[];
  }): UserIdentity => {
    const profile = createMockProfile(params.userId, params.email, params.email.split("@")[0]);
    return {
      user: { id: params.userId, email: params.email },
      profile,
      isAuthenticated: true,
      isSuperAdmin: params.isSuperAdmin ?? false,
      isSocietyAdmin: params.role === "SOCIETY_ADMIN",
      isImpersonating: params.isImpersonating ?? false,
      originalUser: profile,
      effectiveUser: profile,
      currentSociety: params.society,
      availableSocieties: params.availableMemberships || [],
      currentRole: params.role,
      permissions: [],
      impersonationSession: params.isImpersonating
        ? ({
            session_id: "mock-sess-1",
            original_admin_id: params.userId,
            target_user_id: params.userId,
            target_society_id: params.targetSocietyId,
            target_role_id: params.targetRoleId,
            status: "ACTIVE",
            created_at: new Date().toISOString(),
            expires_at: new Date(Date.now() + 3600000).toISOString(),
          } as any)
        : null,
    };
  };

  // Test identities
  const superAdminIdentity = createMockIdentity({
    userId: SUPER_ADMIN_USER_ID,
    email: "superadmin@dwellsync.com",
    role: "SUPER_ADMIN",
    society: null,
    isSuperAdmin: true,
  });

  const adminAIdentity = createMockIdentity({
    userId: ADMIN_A_USER_ID,
    email: "admin-a@dwellsync.com",
    role: "SOCIETY_ADMIN",
    society: societyA,
  });

  const secretaryAIdentity = createMockIdentity({
    userId: SECRETARY_A_USER_ID,
    email: "secretary-a@dwellsync.com",
    role: "SECRETARY",
    society: societyA,
  });

  const managerAIdentity = createMockIdentity({
    userId: MANAGER_A_USER_ID,
    email: "manager-a@dwellsync.com",
    role: "MANAGER",
    society: societyA,
  });

  const residentAIdentity = createMockIdentity({
    userId: RESIDENT_A_USER_ID,
    email: "resident-a@dwellsync.com",
    role: "RESIDENT",
    society: societyA,
  });

  const tenantAIdentity = createMockIdentity({
    userId: TENANT_A_USER_ID,
    email: "tenant-a@dwellsync.com",
    role: "TENANT",
    society: societyA,
  });

  const securityGuardIdentity = createMockIdentity({
    userId: SECURITY_GUARD_USER_ID,
    email: "guard-a@dwellsync.com",
    role: "SECURITY",
    society: societyA,
  });

  const adminBIdentity = createMockIdentity({
    userId: ADMIN_B_USER_ID,
    email: "admin-b@dwellsync.com",
    role: "SOCIETY_ADMIN",
    society: societyB,
  });

  // Mock members
  const memberAdminA = {
    id: "mem-admin-a",
    user_id: ADMIN_A_USER_ID,
    society_id: SOCIETY_A_ID,
    role_id: "SOCIETY_ADMIN" as RoleId,
    status: "ACTIVE" as MembershipStatus,
  };

  const memberResidentA = {
    id: "mem-resident-a",
    user_id: RESIDENT_A_USER_ID,
    society_id: SOCIETY_A_ID,
    role_id: "RESIDENT" as RoleId,
    status: "ACTIVE" as MembershipStatus,
  };

  const memberResidentB = {
    id: "mem-resident-b",
    user_id: RESIDENT_B_USER_ID,
    society_id: SOCIETY_B_ID,
    role_id: "RESIDENT" as RoleId,
    status: "ACTIVE" as MembershipStatus,
  };

  /* ====================================================================== */
  /* GROUP 1: Society Administrator Authorization (isAuthorizedSocietyAdmin) */
  /* ====================================================================== */

  describe("Group 1: Society Administrator Authorization Checks", () => {
    it("1. Authorized society admin can access society admin helper", () => {
      expect(isAuthorizedSocietyAdmin(adminAIdentity, SOCIETY_A_ID)).toBe(true);
    });

    it("2. Super Admin without impersonation has platform admin access across societies", () => {
      expect(isAuthorizedSocietyAdmin(superAdminIdentity, SOCIETY_A_ID)).toBe(true);
      expect(isAuthorizedSocietyAdmin(superAdminIdentity, SOCIETY_B_ID)).toBe(true);
    });

    it("3. Super Admin impersonating Society A admin is authorized for Society A", () => {
      const impAdminA = createMockIdentity({
        userId: SUPER_ADMIN_USER_ID,
        email: "superadmin@dwellsync.com",
        role: "SOCIETY_ADMIN",
        society: societyA,
        isSuperAdmin: true,
        isImpersonating: true,
        targetSocietyId: SOCIETY_A_ID,
        targetRoleId: "SOCIETY_ADMIN",
      });
      expect(isAuthorizedSocietyAdmin(impAdminA, SOCIETY_A_ID)).toBe(true);
    });

    it("4. Super Admin impersonating Society A admin is DENIED access to Society B (tenant boundary)", () => {
      const impAdminA = createMockIdentity({
        userId: SUPER_ADMIN_USER_ID,
        email: "superadmin@dwellsync.com",
        role: "SOCIETY_ADMIN",
        society: societyA,
        isSuperAdmin: true,
        isImpersonating: true,
        targetSocietyId: SOCIETY_A_ID,
        targetRoleId: "SOCIETY_ADMIN",
      });
      expect(isAuthorizedSocietyAdmin(impAdminA, SOCIETY_B_ID)).toBe(false);
    });

    it("5. Super Admin impersonating Society A resident is DENIED admin access to Society A (least privilege)", () => {
      const impResidentA = createMockIdentity({
        userId: SUPER_ADMIN_USER_ID,
        email: "superadmin@dwellsync.com",
        role: "RESIDENT",
        society: societyA,
        isSuperAdmin: true,
        isImpersonating: true,
        targetSocietyId: SOCIETY_A_ID,
        targetRoleId: "RESIDENT",
      });
      expect(isAuthorizedSocietyAdmin(impResidentA, SOCIETY_A_ID)).toBe(false);
    });

    it("6. Regular Society A admin is DENIED access to Society B (cross-society IDOR prevention)", () => {
      expect(isAuthorizedSocietyAdmin(adminAIdentity, SOCIETY_B_ID)).toBe(false);
    });

    it("7. Regular Society A secretary is AUTHORIZED for Society A", () => {
      expect(isAuthorizedSocietyAdmin(secretaryAIdentity, SOCIETY_A_ID)).toBe(true);
    });

    it("8. Regular Society A manager is AUTHORIZED for Society A", () => {
      expect(isAuthorizedSocietyAdmin(managerAIdentity, SOCIETY_A_ID)).toBe(true);
    });

    it("9. Regular Society A resident is DENIED society admin access", () => {
      expect(isAuthorizedSocietyAdmin(residentAIdentity, SOCIETY_A_ID)).toBe(false);
    });

    it("10. Regular Society A tenant is DENIED society admin access", () => {
      expect(isAuthorizedSocietyAdmin(tenantAIdentity, SOCIETY_A_ID)).toBe(false);
    });

    it("11. Regular Society A security guard is DENIED society admin access", () => {
      expect(isAuthorizedSocietyAdmin(securityGuardIdentity, SOCIETY_A_ID)).toBe(false);
    });

    it("12. Unauthenticated user is DENIED society admin access", () => {
      expect(isAuthorizedSocietyAdmin(null, SOCIETY_A_ID)).toBe(false);
      const unauthIdentity = { ...residentAIdentity, isAuthenticated: false };
      expect(isAuthorizedSocietyAdmin(unauthIdentity, SOCIETY_A_ID)).toBe(false);
    });
  });

  /* ====================================================================== */
  /* GROUP 2: Role Management Authority (canManageRoles)                     */
  /* ====================================================================== */

  describe("Group 2: Role Management Authority (canManageRoles)", () => {
    it("13. canManageRoles allows SUPER_ADMIN (non-impersonating)", () => {
      expect(canManageRoles(superAdminIdentity, SOCIETY_A_ID)).toBe(true);
      expect(canManageRoles(superAdminIdentity, SOCIETY_B_ID)).toBe(true);
    });

    it("14. canManageRoles allows SOCIETY_ADMIN in own society", () => {
      expect(canManageRoles(adminAIdentity, SOCIETY_A_ID)).toBe(true);
    });

    it("15. canManageRoles allows SECRETARY in own society", () => {
      expect(canManageRoles(secretaryAIdentity, SOCIETY_A_ID)).toBe(true);
    });

    it("16. canManageRoles DENIES MANAGER from modifying roles (operational staff, not governance)", () => {
      expect(canManageRoles(managerAIdentity, SOCIETY_A_ID)).toBe(false);
    });

    it("17. canManageRoles DENIES RESIDENT from modifying roles", () => {
      expect(canManageRoles(residentAIdentity, SOCIETY_A_ID)).toBe(false);
    });

    it("18. canManageRoles DENIES TENANT from modifying roles", () => {
      expect(canManageRoles(tenantAIdentity, SOCIETY_A_ID)).toBe(false);
    });

    it("19. canManageRoles DENIES SECURITY guard from modifying roles", () => {
      expect(canManageRoles(securityGuardIdentity, SOCIETY_A_ID)).toBe(false);
    });

    it("20. canManageRoles DENIES Society A admin in Society B (cross-tenant defense)", () => {
      expect(canManageRoles(adminAIdentity, SOCIETY_B_ID)).toBe(false);
    });
  });

  /* ====================================================================== */
  /* GROUP 3: Role & Status Modification Rules (validateRoleChange)          */
  /* ====================================================================== */

  describe("Group 3: Role & Status Modification Defense (validateRoleChange)", () => {
    it("21. Role change allows valid assignable roles (RESIDENT, OWNER, TENANT, etc.)", () => {
      const res = validateRoleChange({
        identity: adminAIdentity,
        targetSocietyId: SOCIETY_A_ID,
        targetMember: memberResidentA,
        newRole: "OWNER",
      });
      expect(res.isValid).toBe(true);
      expect(res.statusCode).toBe(200);
    });

    it("22. Role change allows promoting resident to SECRETARY or TREASURER", () => {
      const res1 = validateRoleChange({
        identity: adminAIdentity,
        targetSocietyId: SOCIETY_A_ID,
        targetMember: memberResidentA,
        newRole: "SECRETARY",
      });
      expect(res1.isValid).toBe(true);

      const res2 = validateRoleChange({
        identity: adminAIdentity,
        targetSocietyId: SOCIETY_A_ID,
        targetMember: memberResidentA,
        newRole: "TREASURER",
      });
      expect(res2.isValid).toBe(true);
    });

    it("23. Role change BLOCKS assigning SUPER_ADMIN (platform privilege escalation defense)", () => {
      const res = validateRoleChange({
        identity: adminAIdentity,
        targetSocietyId: SOCIETY_A_ID,
        targetMember: memberResidentA,
        newRole: "SUPER_ADMIN",
      });
      expect(res.isValid).toBe(false);
      expect(res.statusCode).toBe(403);
      expect(res.error).toContain("SUPER_ADMIN is a platform role");
    });

    it("24. Role change BLOCKS assigning arbitrary/unwhitelisted role strings", () => {
      const res = validateRoleChange({
        identity: adminAIdentity,
        targetSocietyId: SOCIETY_A_ID,
        targetMember: memberResidentA,
        newRole: "ROOT_ADMIN",
      });
      expect(res.isValid).toBe(false);
      expect(res.statusCode).toBe(400);
      expect(res.error).toContain("Invalid role");
    });

    it("25. Role change BLOCKS self-modification of role (self-escalation defense)", () => {
      const res = validateRoleChange({
        identity: adminAIdentity,
        targetSocietyId: SOCIETY_A_ID,
        targetMember: memberAdminA,
        newRole: "RESIDENT",
      });
      expect(res.isValid).toBe(false);
      expect(res.statusCode).toBe(403);
      expect(res.error).toContain("Privilege Escalation Prevention");
    });

    it("26. Role change BLOCKS self-modification of status (self-lockout defense)", () => {
      const res = validateRoleChange({
        identity: adminAIdentity,
        targetSocietyId: SOCIETY_A_ID,
        targetMember: memberAdminA,
        newStatus: "SUSPENDED",
      });
      expect(res.isValid).toBe(false);
      expect(res.statusCode).toBe(403);
      expect(res.error).toContain("Self-Modification Prevention");
    });

    it("27. Role change BLOCKS cross-society member modification (tenant boundary check)", () => {
      const res = validateRoleChange({
        identity: adminAIdentity,
        targetSocietyId: SOCIETY_A_ID,
        targetMember: memberResidentB, // belongs to SOCIETY_B
        newRole: "OWNER",
      });
      expect(res.isValid).toBe(false);
      expect(res.statusCode).toBe(403);
      expect(res.error).toContain("Tenant boundary violation");
    });

    it("28. Role change validates status is one of ACTIVE, SUSPENDED, REMOVED, INVITED", () => {
      for (const validStatus of VALID_MEMBERSHIP_STATUSES) {
        const res = validateRoleChange({
          identity: adminAIdentity,
          targetSocietyId: SOCIETY_A_ID,
          targetMember: memberResidentA,
          newStatus: validStatus,
        });
        expect(res.isValid).toBe(true);
      }
    });

    it("29. Role change rejects invalid statuses like DELETED or TERMINATED", () => {
      const res1 = validateRoleChange({
        identity: adminAIdentity,
        targetSocietyId: SOCIETY_A_ID,
        targetMember: memberResidentA,
        newStatus: "DELETED",
      });
      expect(res1.isValid).toBe(false);
      expect(res1.statusCode).toBe(400);

      const res2 = validateRoleChange({
        identity: adminAIdentity,
        targetSocietyId: SOCIETY_A_ID,
        targetMember: memberResidentA,
        newStatus: "TERMINATED",
      });
      expect(res2.isValid).toBe(false);
      expect(res2.statusCode).toBe(400);
    });

    it("30. Role change returns 404 for non-existent target member", () => {
      const res = validateRoleChange({
        identity: adminAIdentity,
        targetSocietyId: SOCIETY_A_ID,
        targetMember: null,
        newRole: "OWNER",
      });
      expect(res.isValid).toBe(false);
      expect(res.statusCode).toBe(404);
    });

    it("31. Role change returns 403 when resident attempts to modify another member's role", () => {
      const res = validateRoleChange({
        identity: residentAIdentity,
        targetSocietyId: SOCIETY_A_ID,
        targetMember: memberResidentA,
        newRole: "SOCIETY_ADMIN",
      });
      expect(res.isValid).toBe(false);
      expect(res.statusCode).toBe(403);
    });
  });

  /* ====================================================================== */
  /* GROUP 4: Member Removal & Deactivation Rules (validateMemberRemoval)   */
  /* ====================================================================== */

  describe("Group 4: Member Removal & Deactivation Rules (validateMemberRemoval)", () => {
    it("32. Member removal BLOCKS self-removal by admin (prevent orphan tenant / self-destruction)", () => {
      const res = validateMemberRemoval({
        identity: adminAIdentity,
        targetSocietyId: SOCIETY_A_ID,
        targetMember: memberAdminA,
      });
      expect(res.isValid).toBe(false);
      expect(res.statusCode).toBe(400);
      expect(res.error).toContain("Administrators cannot remove their own society membership");
    });

    it("33. Member removal BLOCKS cross-society member removal (IDOR defense)", () => {
      const res = validateMemberRemoval({
        identity: adminAIdentity,
        targetSocietyId: SOCIETY_A_ID,
        targetMember: memberResidentB,
      });
      expect(res.isValid).toBe(false);
      expect(res.statusCode).toBe(403);
      expect(res.error).toContain("Tenant boundary violation");
    });

    it("34. Member removal allows authorized admin to remove valid resident", () => {
      const res = validateMemberRemoval({
        identity: adminAIdentity,
        targetSocietyId: SOCIETY_A_ID,
        targetMember: memberResidentA,
      });
      expect(res.isValid).toBe(true);
      expect(res.statusCode).toBe(200);
    });

    it("35. Member removal rejects non-existent member with 404", () => {
      const res = validateMemberRemoval({
        identity: adminAIdentity,
        targetSocietyId: SOCIETY_A_ID,
        targetMember: null,
      });
      expect(res.isValid).toBe(false);
      expect(res.statusCode).toBe(404);
    });

    it("36. Member removal requires role manager privileges (denies resident)", () => {
      const res = validateMemberRemoval({
        identity: residentAIdentity,
        targetSocietyId: SOCIETY_A_ID,
        targetMember: memberResidentA,
      });
      expect(res.isValid).toBe(false);
      expect(res.statusCode).toBe(403);
    });

    it("37. Member removal requires role manager privileges (denies manager)", () => {
      const res = validateMemberRemoval({
        identity: managerAIdentity,
        targetSocietyId: SOCIETY_A_ID,
        targetMember: memberResidentA,
      });
      expect(res.isValid).toBe(false);
      expect(res.statusCode).toBe(403);
    });
  });

  /* ====================================================================== */
  /* GROUP 5: Query Pagination & Filter Sanitization (validateMemberQuery)   */
  /* ====================================================================== */

  describe("Group 5: Query Pagination & Filter Sanitization (validateMemberQuery)", () => {
    it("38. Member query requires admin authorization (denies resident)", () => {
      const res = validateMemberQuery({
        identity: residentAIdentity,
        targetSocietyId: SOCIETY_A_ID,
      });
      expect(res.isValid).toBe(false);
      expect(res.statusCode).toBe(403);
    });

    it("39. Member query denies unauthenticated caller (401)", () => {
      const res = validateMemberQuery({
        identity: null,
        targetSocietyId: SOCIETY_A_ID,
      });
      expect(res.isValid).toBe(false);
      expect(res.statusCode).toBe(401);
    });

    it("40. Member query enforces default page = 1", () => {
      const res = validateMemberQuery({
        identity: adminAIdentity,
        targetSocietyId: SOCIETY_A_ID,
      });
      expect(res.isValid).toBe(true);
      expect(res.query?.page).toBe(1);
    });

    it("41. Member query enforces default pageSize = 25", () => {
      const res = validateMemberQuery({
        identity: adminAIdentity,
        targetSocietyId: SOCIETY_A_ID,
      });
      expect(res.isValid).toBe(true);
      expect(res.query?.pageSize).toBe(25);
    });

    it("42. Member query caps pageSize at 100 when larger value requested (pageSize=999)", () => {
      const res = validateMemberQuery({
        identity: adminAIdentity,
        targetSocietyId: SOCIETY_A_ID,
        pageSize: 999,
      });
      expect(res.isValid).toBe(true);
      expect(res.query?.pageSize).toBe(100);
    });

    it("43. Member query normalizes invalid page numbers (< 1) to default 1", () => {
      const res = validateMemberQuery({
        identity: adminAIdentity,
        targetSocietyId: SOCIETY_A_ID,
        page: -5,
      });
      expect(res.isValid).toBe(true);
      expect(res.query?.page).toBe(1);
    });

    it("44. Member query normalizes invalid pageSize (0 or negative) to default 25", () => {
      const res = validateMemberQuery({
        identity: adminAIdentity,
        targetSocietyId: SOCIETY_A_ID,
        pageSize: 0,
      });
      expect(res.isValid).toBe(true);
      expect(res.query?.pageSize).toBe(25);
    });

    it("45. Member query trims and sanitizes search query", () => {
      const res = validateMemberQuery({
        identity: adminAIdentity,
        targetSocietyId: SOCIETY_A_ID,
        search: "   John Doe   ",
      });
      expect(res.isValid).toBe(true);
      expect(res.query?.search).toBe("John Doe");
    });

    it("46. Member query supports valid role filter and sanitizes unwhitelisted role", () => {
      const resValid = validateMemberQuery({
        identity: adminAIdentity,
        targetSocietyId: SOCIETY_A_ID,
        role: "OWNER",
      });
      expect(resValid.isValid).toBe(true);
      expect(resValid.query?.role).toBe("OWNER");

      const resInvalid = validateMemberQuery({
        identity: adminAIdentity,
        targetSocietyId: SOCIETY_A_ID,
        role: "HACKER_ROLE",
      });
      expect(resInvalid.isValid).toBe(true);
      expect(resInvalid.query?.role).toBeUndefined();
    });

    it("47. Member query supports valid status filter and sanitizes unwhitelisted status", () => {
      const resValid = validateMemberQuery({
        identity: adminAIdentity,
        targetSocietyId: SOCIETY_A_ID,
        status: "ACTIVE",
      });
      expect(resValid.isValid).toBe(true);
      expect(resValid.query?.status).toBe("ACTIVE");

      const resInvalid = validateMemberQuery({
        identity: adminAIdentity,
        targetSocietyId: SOCIETY_A_ID,
        status: "INVALID_STATUS",
      });
      expect(resInvalid.isValid).toBe(true);
      expect(resInvalid.query?.status).toBeUndefined();
    });

    it("48. Member query trims unitNumber filter", () => {
      const res = validateMemberQuery({
        identity: adminAIdentity,
        targetSocietyId: SOCIETY_A_ID,
        unitNumber: "  A-101  ",
      });
      expect(res.isValid).toBe(true);
      expect(res.query?.unitNumber).toBe("A-101");
    });

    it("49. Member query rejects search query exceeding 100 characters with 400", () => {
      const longSearch = "a".repeat(101);
      const res = validateMemberQuery({
        identity: adminAIdentity,
        targetSocietyId: SOCIETY_A_ID,
        search: longSearch,
      });
      expect(res.isValid).toBe(false);
      expect(res.statusCode).toBe(400);
      expect(res.error).toContain("exceeds maximum allowed length");
    });

    it("50. Member query accepts search query up to 100 characters", () => {
      const validSearch = "a".repeat(100);
      const res = validateMemberQuery({
        identity: adminAIdentity,
        targetSocietyId: SOCIETY_A_ID,
        search: validSearch,
      });
      expect(res.isValid).toBe(true);
      expect(res.query?.search).toBe(validSearch);
    });

    it("51. Member query validates buildingId as UUID and accepts valid UUID", () => {
      const validBuildingId = "11111111-2222-4333-8444-555555555555";
      const res = validateMemberQuery({
        identity: adminAIdentity,
        targetSocietyId: SOCIETY_A_ID,
        buildingId: validBuildingId,
      });
      expect(res.isValid).toBe(true);
      expect(res.query?.buildingId).toBe(validBuildingId);
    });

    it("52. Member query rejects malformed buildingId with 400", () => {
      const res = validateMemberQuery({
        identity: adminAIdentity,
        targetSocietyId: SOCIETY_A_ID,
        buildingId: "not-a-uuid-string",
      });
      expect(res.isValid).toBe(false);
      expect(res.statusCode).toBe(400);
      expect(res.error).toContain("Invalid buildingId");
    });

    it("53. Member query validates wingId as UUID and accepts valid UUID", () => {
      const validWingId = "22222222-3333-4444-8555-666666666666";
      const res = validateMemberQuery({
        identity: adminAIdentity,
        targetSocietyId: SOCIETY_A_ID,
        wingId: validWingId,
      });
      expect(res.isValid).toBe(true);
      expect(res.query?.wingId).toBe(validWingId);
    });

    it("54. Member query rejects malformed wingId with 400", () => {
      const res = validateMemberQuery({
        identity: adminAIdentity,
        targetSocietyId: SOCIETY_A_ID,
        wingId: "12345",
      });
      expect(res.isValid).toBe(false);
      expect(res.statusCode).toBe(400);
      expect(res.error).toContain("Invalid wingId");
    });

    it("55. Member query validates unitId as UUID and accepts valid UUID", () => {
      const validUnitId = "33333333-4444-4555-8666-777777777777";
      const res = validateMemberQuery({
        identity: adminAIdentity,
        targetSocietyId: SOCIETY_A_ID,
        unitId: validUnitId,
      });
      expect(res.isValid).toBe(true);
      expect(res.query?.unitId).toBe(validUnitId);
    });

    it("56. Member query rejects malformed unitId with 400", () => {
      const res = validateMemberQuery({
        identity: adminAIdentity,
        targetSocietyId: SOCIETY_A_ID,
        unitId: "unit-id-injection--drop-table",
      });
      expect(res.isValid).toBe(false);
      expect(res.statusCode).toBe(400);
      expect(res.error).toContain("Invalid unitId");
    });

    it("57. Impersonated resident in View-As is denied access-request administration checks", () => {
      const impResidentA = createMockIdentity({
        userId: SUPER_ADMIN_USER_ID,
        email: "superadmin@dwellsync.com",
        role: "RESIDENT",
        society: societyA,
        isSuperAdmin: true,
        isImpersonating: true,
        targetSocietyId: SOCIETY_A_ID,
        targetRoleId: "RESIDENT",
      });
      expect(isAuthorizedSocietyAdmin(impResidentA, SOCIETY_A_ID)).toBe(false);
    });

    it("58. Impersonated owner in View-As is denied role management capabilities", () => {
      const impOwnerA = createMockIdentity({
        userId: SUPER_ADMIN_USER_ID,
        email: "superadmin@dwellsync.com",
        role: "OWNER",
        society: societyA,
        isSuperAdmin: true,
        isImpersonating: true,
        targetSocietyId: SOCIETY_A_ID,
        targetRoleId: "OWNER",
      });
      expect(canManageRoles(impOwnerA, SOCIETY_A_ID)).toBe(false);
    });
  });
});
