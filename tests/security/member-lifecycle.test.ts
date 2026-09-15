import { describe, it, expect } from "vitest";
import {
  isAuthorizedSocietyAdmin,
  canManageRoles,
  validateRoleChange,
  validateMemberRemoval,
  validateMemberStatusChange,
  validateUnitAssociation,
  validateRelationshipAccess,
  ALLOWED_ASSIGNABLE_ROLES,
  VALID_MEMBERSHIP_STATUSES,
} from "../../src/lib/auth/societyAdmin";
import { UserIdentity } from "../../src/lib/types/auth";
import { RoleId, Society, SocietyMembership, Profile, MembershipStatus } from "../../src/lib/types/database";

describe("WP-05: Society Member Lifecycle, Unit Association & Resident Administration Security Suite", () => {
  const SOCIETY_A_ID = "07ae6307-13cb-4d14-a547-27914536fc62";
  const SOCIETY_B_ID = "b2c3d4e5-6789-01bc-def0-123456789abc";

  const ADMIN_A_USER_ID = "d52b51a1-026d-4828-81c3-a9f3a48780e6";
  const SECRETARY_A_USER_ID = "sec-user-0001-4828-81c3-a9f3a48780e6";
  const MANAGER_A_USER_ID = "mgr-user-0002-4828-81c3-a9f3a48780e6";
  const RESIDENT_A_USER_ID = "3bbe4296-9dc2-4b79-8894-8225a83f658b";
  const RESIDENT_A2_USER_ID = "3bbe4296-9dc2-4b79-8894-8225a83f9999";
  const TENANT_A_USER_ID = "tenant-user-0004-4828-81c3-a9f3a48780e6";

  const ADMIN_B_USER_ID = "99999999-8888-7777-6666-555555555555";
  const RESIDENT_B_USER_ID = "resident-b-8888-7777-6666-555555555555";

  const SUPER_ADMIN_USER_ID = "aaaa1111-bb22-cc33-dd44-ee55ff660000";

  const UNIT_A_101_ID = "11111111-2222-3333-4444-555555555555";
  const UNIT_B_202_ID = "99999999-0000-1111-2222-333333333333";

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

  // Identities
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

  const residentA2Identity = createMockIdentity({
    userId: RESIDENT_A2_USER_ID,
    email: "resident-a2@dwellsync.com",
    role: "RESIDENT",
    society: societyA,
  });

  const adminBIdentity = createMockIdentity({
    userId: ADMIN_B_USER_ID,
    email: "admin-b@dwellsync.com",
    role: "SOCIETY_ADMIN",
    society: societyB,
  });

  // Target member records
  const targetResidentA = {
    user_id: RESIDENT_A_USER_ID,
    society_id: SOCIETY_A_ID,
    role_id: "RESIDENT" as RoleId,
    status: "ACTIVE" as MembershipStatus,
  };

  const targetSuspendedA = {
    user_id: TENANT_A_USER_ID,
    society_id: SOCIETY_A_ID,
    role_id: "TENANT" as RoleId,
    status: "SUSPENDED" as MembershipStatus,
  };

  const targetResidentB = {
    user_id: RESIDENT_B_USER_ID,
    society_id: SOCIETY_B_ID,
    role_id: "RESIDENT" as RoleId,
    status: "ACTIVE" as MembershipStatus,
  };

  const targetAdminA = {
    user_id: ADMIN_A_USER_ID,
    society_id: SOCIETY_A_ID,
    role_id: "SOCIETY_ADMIN" as RoleId,
    status: "ACTIVE" as MembershipStatus,
  };

  // Units
  const unitA101 = {
    id: UNIT_A_101_ID,
    society_id: SOCIETY_A_ID,
    unit_number: "A-101",
  };

  const unitB202 = {
    id: UNIT_B_202_ID,
    society_id: SOCIETY_B_ID,
    unit_number: "B-202",
  };

  // ==========================================================================
  // 1. Member Lifecycle Status Transitions
  // ==========================================================================
  describe("1. Member Lifecycle Status Transitions", () => {
    it("1.1 should reject unauthenticated caller (401)", () => {
      const res = validateMemberStatusChange({
        identity: null,
        targetSocietyId: SOCIETY_A_ID,
        targetMember: targetResidentA,
        newStatus: "SUSPENDED",
      });
      expect(res.isValid).toBe(false);
      expect(res.statusCode).toBe(401);
    });

    it("1.2 should reject non-admin resident attempting to change member status (403)", () => {
      const res = validateMemberStatusChange({
        identity: residentAIdentity,
        targetSocietyId: SOCIETY_A_ID,
        targetMember: targetSuspendedA,
        newStatus: "ACTIVE",
      });
      expect(res.isValid).toBe(false);
      expect(res.statusCode).toBe(403);
    });

    it("1.3 should allow Society Admin to suspend an active member (200)", () => {
      const res = validateMemberStatusChange({
        identity: adminAIdentity,
        targetSocietyId: SOCIETY_A_ID,
        targetMember: targetResidentA,
        newStatus: "SUSPENDED",
      });
      expect(res.isValid).toBe(true);
      expect(res.statusCode).toBe(200);
    });

    it("1.4 should allow Secretary to reactivate a suspended member (200)", () => {
      const res = validateMemberStatusChange({
        identity: secretaryAIdentity,
        targetSocietyId: SOCIETY_A_ID,
        targetMember: targetSuspendedA,
        newStatus: "ACTIVE",
      });
      expect(res.isValid).toBe(true);
      expect(res.statusCode).toBe(200);
    });

    it("1.5 should allow Society Admin to transition member status to REMOVED (200)", () => {
      const res = validateMemberStatusChange({
        identity: adminAIdentity,
        targetSocietyId: SOCIETY_A_ID,
        targetMember: targetResidentA,
        newStatus: "REMOVED",
      });
      expect(res.isValid).toBe(true);
      expect(res.statusCode).toBe(200);
    });

    it("1.6 should reject transition to invalid status string (400)", () => {
      const res = validateMemberStatusChange({
        identity: adminAIdentity,
        targetSocietyId: SOCIETY_A_ID,
        targetMember: targetResidentA,
        newStatus: "DELETED_FOR_REAL",
      });
      expect(res.isValid).toBe(false);
      expect(res.statusCode).toBe(400);
      expect(res.error).toContain("Invalid status");
    });

    it("1.7 should reject transitioning an existing member to INVITED status (400)", () => {
      const res = validateMemberStatusChange({
        identity: adminAIdentity,
        targetSocietyId: SOCIETY_A_ID,
        targetMember: targetResidentA,
        newStatus: "INVITED",
      });
      expect(res.isValid).toBe(false);
      expect(res.statusCode).toBe(400);
      expect(res.error).toContain("INVITED");
    });

    it("1.8 should return 404 when target member does not exist", () => {
      const res = validateMemberStatusChange({
        identity: adminAIdentity,
        targetSocietyId: SOCIETY_A_ID,
        targetMember: null,
        newStatus: "SUSPENDED",
      });
      expect(res.isValid).toBe(false);
      expect(res.statusCode).toBe(404);
    });

    it("1.9 should allow Super Admin to change status across societies (200)", () => {
      const res = validateMemberStatusChange({
        identity: superAdminIdentity,
        targetSocietyId: SOCIETY_A_ID,
        targetMember: targetResidentA,
        newStatus: "SUSPENDED",
      });
      expect(res.isValid).toBe(true);
      expect(res.statusCode).toBe(200);
    });
  });

  // ==========================================================================
  // 2. Self-Action & Escalation Defenses
  // ==========================================================================
  describe("2. Self-Action & Escalation Defenses", () => {
    it("2.1 should block Administrator from suspending themselves (403)", () => {
      const res = validateMemberStatusChange({
        identity: adminAIdentity,
        targetSocietyId: SOCIETY_A_ID,
        targetMember: targetAdminA,
        newStatus: "SUSPENDED",
      });
      expect(res.isValid).toBe(false);
      expect(res.statusCode).toBe(403);
      expect(res.error).toContain("Self-Modification Prevention");
    });

    it("2.2 should block Administrator from removing themselves (400)", () => {
      const res = validateMemberRemoval({
        identity: adminAIdentity,
        targetSocietyId: SOCIETY_A_ID,
        targetMember: targetAdminA,
      });
      expect(res.isValid).toBe(false);
      expect(res.statusCode).toBe(400);
      expect(res.error).toContain("Administrators cannot remove their own");
    });

    it("2.3 should block Administrator from escalating their own role (403)", () => {
      const res = validateRoleChange({
        identity: adminAIdentity,
        targetSocietyId: SOCIETY_A_ID,
        targetMember: targetAdminA,
        newRole: "SECRETARY",
      });
      expect(res.isValid).toBe(false);
      expect(res.statusCode).toBe(403);
      expect(res.error).toContain("Privilege Escalation Prevention");
    });

    it("2.4 should block assigning platform role SUPER_ADMIN at society level (403)", () => {
      const res = validateRoleChange({
        identity: adminAIdentity,
        targetSocietyId: SOCIETY_A_ID,
        targetMember: targetResidentA,
        newRole: "SUPER_ADMIN",
      });
      expect(res.isValid).toBe(false);
      expect(res.statusCode).toBe(403);
      expect(res.error).toContain("SUPER_ADMIN is a platform role");
    });
  });

  // ==========================================================================
  // 3. Multi-Tenant Isolation
  // ==========================================================================
  describe("3. Multi-Tenant Isolation", () => {
    it("3.1 should reject Admin A modifying member in Society B (403)", () => {
      const res = validateMemberStatusChange({
        identity: adminAIdentity,
        targetSocietyId: SOCIETY_A_ID,
        targetMember: targetResidentB, // Member belongs to Society B
        newStatus: "SUSPENDED",
      });
      expect(res.isValid).toBe(false);
      expect(res.statusCode).toBe(403);
      expect(res.error).toContain("Tenant boundary violation");
    });

    it("3.2 should reject Admin B modifying member in Society A (403)", () => {
      const res = validateMemberStatusChange({
        identity: adminBIdentity,
        targetSocietyId: SOCIETY_B_ID,
        targetMember: targetResidentA,
        newStatus: "SUSPENDED",
      });
      expect(res.isValid).toBe(false);
      expect(res.statusCode).toBe(403);
      expect(res.error).toContain("Tenant boundary violation");
    });

    it("3.3 should reject removal across tenant boundaries (403)", () => {
      const res = validateMemberRemoval({
        identity: adminAIdentity,
        targetSocietyId: SOCIETY_A_ID,
        targetMember: targetResidentB,
      });
      expect(res.isValid).toBe(false);
      expect(res.statusCode).toBe(403);
      expect(res.error).toContain("Tenant boundary violation");
    });
  });

  // ==========================================================================
  // 4. Unit Association & Reassociation Validation
  // ==========================================================================
  describe("4. Unit Association & Reassociation Validation", () => {
    it("4.1 should reject unauthenticated caller for unit association (401)", () => {
      const res = validateUnitAssociation({
        identity: null,
        targetSocietyId: SOCIETY_A_ID,
        targetMember: targetResidentA,
        unitNumber: "A-101",
      });
      expect(res.isValid).toBe(false);
      expect(res.statusCode).toBe(401);
    });

    it("4.2 should reject non-admin resident attempting unit association (403)", () => {
      const res = validateUnitAssociation({
        identity: residentAIdentity,
        targetSocietyId: SOCIETY_A_ID,
        targetMember: targetResidentA,
        unitNumber: "A-101",
      });
      expect(res.isValid).toBe(false);
      expect(res.statusCode).toBe(403);
    });

    it("4.3 should allow Society Admin to associate a unit in the same society (200)", () => {
      const res = validateUnitAssociation({
        identity: adminAIdentity,
        targetSocietyId: SOCIETY_A_ID,
        targetMember: targetResidentA,
        targetUnit: unitA101,
        unitId: UNIT_A_101_ID,
        unitNumber: "A-101",
      });
      expect(res.isValid).toBe(true);
      expect(res.statusCode).toBe(200);
    });

    it("4.4 should reject associating a unit from another society (Cross-Tenant Unit Defense) (403)", () => {
      const res = validateUnitAssociation({
        identity: adminAIdentity,
        targetSocietyId: SOCIETY_A_ID,
        targetMember: targetResidentA,
        targetUnit: unitB202, // Belongs to Society B!
        unitId: UNIT_B_202_ID,
        unitNumber: "B-202",
      });
      expect(res.isValid).toBe(false);
      expect(res.statusCode).toBe(403);
      expect(res.error).toContain("Target unit belongs to a different society");
    });

    it("4.5 should reject invalid UUID format for unitId (400)", () => {
      const res = validateUnitAssociation({
        identity: adminAIdentity,
        targetSocietyId: SOCIETY_A_ID,
        targetMember: targetResidentA,
        unitId: "not-a-valid-uuid-format",
      });
      expect(res.isValid).toBe(false);
      expect(res.statusCode).toBe(400);
      expect(res.error).toContain("must be a valid UUID");
    });

    it("4.6 should allow unassigning a unit (null/empty unit number) (200)", () => {
      const res = validateUnitAssociation({
        identity: adminAIdentity,
        targetSocietyId: SOCIETY_A_ID,
        targetMember: targetResidentA,
        unitId: null,
        unitNumber: null,
      });
      expect(res.isValid).toBe(true);
      expect(res.statusCode).toBe(200);
    });

    it("4.7 should reject unit association for member from another society (403)", () => {
      const res = validateUnitAssociation({
        identity: adminAIdentity,
        targetSocietyId: SOCIETY_A_ID,
        targetMember: targetResidentB,
        unitId: UNIT_A_101_ID,
        unitNumber: "A-101",
      });
      expect(res.isValid).toBe(false);
      expect(res.statusCode).toBe(403);
      expect(res.error).toContain("Member does not belong to this society");
    });
  });

  // ==========================================================================
  // 5. Relationship Visibility & Privacy Controls
  // ==========================================================================
  describe("5. Relationship Visibility & Privacy Controls", () => {
    it("5.1 should reject unauthenticated caller querying relationships (401)", () => {
      const res = validateRelationshipAccess({
        identity: null,
        targetSocietyId: SOCIETY_A_ID,
        targetMember: targetResidentA,
      });
      expect(res.isValid).toBe(false);
      expect(res.statusCode).toBe(401);
    });

    it("5.2 should allow Society Admin to inspect relationships of any member in their society (200)", () => {
      const res = validateRelationshipAccess({
        identity: adminAIdentity,
        targetSocietyId: SOCIETY_A_ID,
        targetMember: targetResidentA,
      });
      expect(res.isValid).toBe(true);
      expect(res.statusCode).toBe(200);
    });

    it("5.3 should allow resident to inspect their OWN relationships (200)", () => {
      const res = validateRelationshipAccess({
        identity: residentAIdentity, // Caller is RESIDENT_A_USER_ID
        targetSocietyId: SOCIETY_A_ID,
        targetMember: targetResidentA, // Member is RESIDENT_A_USER_ID
      });
      expect(res.isValid).toBe(true);
      expect(res.statusCode).toBe(200);
    });

    it("5.4 should reject resident inspecting ANOTHER member's relationships (Privacy Boundary) (403)", () => {
      const res = validateRelationshipAccess({
        identity: residentA2Identity, // Caller is Resident A2
        targetSocietyId: SOCIETY_A_ID,
        targetMember: targetResidentA, // Member is Resident A
      });
      expect(res.isValid).toBe(false);
      expect(res.statusCode).toBe(403);
      expect(res.error).toContain("not authorized to view this member's relationships");
    });

    it("5.5 should reject cross-tenant relationship query (403)", () => {
      const res = validateRelationshipAccess({
        identity: adminAIdentity,
        targetSocietyId: SOCIETY_A_ID,
        targetMember: targetResidentB, // Member belongs to Society B
      });
      expect(res.isValid).toBe(false);
      expect(res.statusCode).toBe(403);
      expect(res.error).toContain("Tenant boundary violation");
    });

    it("5.6 should allow Super Admin platform-level access to relationships (200)", () => {
      const res = validateRelationshipAccess({
        identity: superAdminIdentity,
        targetSocietyId: SOCIETY_A_ID,
        targetMember: targetResidentA,
      });
      expect(res.isValid).toBe(true);
      expect(res.statusCode).toBe(200);
    });
  });

  // ==========================================================================
  // 6. Impersonation Session Security Locks
  // ==========================================================================
  describe("6. Impersonation Session Security Locks", () => {
    it("6.1 should allow impersonating admin targeting Society A to manage members in Society A (200)", () => {
      const impAdminIdentity = createMockIdentity({
        userId: SUPER_ADMIN_USER_ID,
        email: "superadmin@dwellsync.com",
        role: "SOCIETY_ADMIN",
        society: societyA,
        isSuperAdmin: true,
        isImpersonating: true,
        targetSocietyId: SOCIETY_A_ID,
        targetRoleId: "SOCIETY_ADMIN",
      });

      const res = validateMemberStatusChange({
        identity: impAdminIdentity,
        targetSocietyId: SOCIETY_A_ID,
        targetMember: targetResidentA,
        newStatus: "SUSPENDED",
      });
      expect(res.isValid).toBe(true);
      expect(res.statusCode).toBe(200);
    });

    it("6.2 should reject impersonating admin locked to Society A when attempting action on Society B (403)", () => {
      const impAdminIdentity = createMockIdentity({
        userId: SUPER_ADMIN_USER_ID,
        email: "superadmin@dwellsync.com",
        role: "SOCIETY_ADMIN",
        society: societyA,
        isSuperAdmin: true,
        isImpersonating: true,
        targetSocietyId: SOCIETY_A_ID,
        targetRoleId: "SOCIETY_ADMIN",
      });

      const res = validateMemberStatusChange({
        identity: impAdminIdentity,
        targetSocietyId: SOCIETY_B_ID,
        targetMember: targetResidentB,
        newStatus: "SUSPENDED",
      });
      expect(res.isValid).toBe(false);
      expect(res.statusCode).toBe(403);
    });

    it("6.3 should reject impersonation session with RESIDENT role attempting admin lifecycle operations (403)", () => {
      const impResidentIdentity = createMockIdentity({
        userId: SUPER_ADMIN_USER_ID,
        email: "superadmin@dwellsync.com",
        role: "RESIDENT",
        society: societyA,
        isSuperAdmin: true,
        isImpersonating: true,
        targetSocietyId: SOCIETY_A_ID,
        targetRoleId: "RESIDENT",
      });

      const res = validateMemberStatusChange({
        identity: impResidentIdentity,
        targetSocietyId: SOCIETY_A_ID,
        targetMember: targetResidentA,
        newStatus: "SUSPENDED",
      });
      expect(res.isValid).toBe(false);
      expect(res.statusCode).toBe(403);
    });
  });

  // ==========================================================================
  // 7. Whitelist & Frozen Constraints
  // ==========================================================================
  describe("7. Whitelist & Frozen Constraints", () => {
    it("7.1 VALID_MEMBERSHIP_STATUSES should strictly contain exactly 4 statuses", () => {
      expect(VALID_MEMBERSHIP_STATUSES).toEqual(["ACTIVE", "SUSPENDED", "REMOVED", "INVITED"]);
    });

    it("7.2 ALLOWED_ASSIGNABLE_ROLES should contain 12 allowed society roles", () => {
      expect(ALLOWED_ASSIGNABLE_ROLES.length).toBe(12);
      expect(ALLOWED_ASSIGNABLE_ROLES).not.toContain("SUPER_ADMIN");
    });
  });
});

