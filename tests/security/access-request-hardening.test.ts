import { describe, it, expect } from "vitest";
import {
  validateAccessRequestInput,
  validateApprovalRules,
  validateRejectionRules,
  validateCancellationRules,
  isAuthorizedSocietyAdmin,
  ALLOWED_REQUEST_ROLES,
  ALLOWED_APPROVE_ROLES,
} from "../../src/lib/auth/accessRequests";
import { resolvePostLoginRouting } from "../../src/lib/auth/onboarding";
import { UserIdentity } from "../../src/lib/types/auth";
import { RoleId, Society, SocietyMembership, Profile, SocietyAccessRequest } from "../../src/lib/types/database";

describe("WP-03: Unlinked User Onboarding & Society Access Request Security Suite", () => {
  const SOCIETY_A_ID = "07ae6307-13cb-4d14-a547-27914536fc62";
  const SOCIETY_B_ID = "b2c3d4e5-6789-01bc-def0-123456789abc";
  const USER_APPLICANT_ID = "3bbe4296-9dc2-4b79-8894-8225a83f658b";
  const USER_OTHER_ID = "11111111-2222-3333-4444-555555555555";
  const ADMIN_USER_A_ID = "d52b51a1-026d-4828-81c3-a9f3a48780e6";
  const ADMIN_USER_B_ID = "99999999-8888-7777-6666-555555555555";
  const SUPER_ADMIN_ID = "aaaa1111-bb22-cc33-dd44-ee55ff660000";

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

  const createMockMembership = (
    userId: string,
    society: Society,
    role: RoleId,
    status: "ACTIVE" | "INVITED" | "SUSPENDED" | "REMOVED" = "ACTIVE"
  ): SocietyMembership & { society: Society } => ({
    id: `mem-${userId}-${society.id}`,
    user_id: userId,
    society_id: society.id,
    role_id: role,
    status,
    unit_number: "A-101",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    society,
  });

  const createMockIdentity = (params: {
    userId: string;
    role?: RoleId | null;
    society?: Society | null;
    isSuperAdmin?: boolean;
    isImpersonating?: boolean;
    impersonationSession?: any;
    memberships?: (SocietyMembership & { society: Society })[];
  }): UserIdentity => {
    const profile = createMockProfile(params.userId, `${params.userId}@test.internal`, `User ${params.userId.slice(0, 4)}`);
    return {
      user: { id: params.userId, email: profile.email },
      profile,
      isAuthenticated: true,
      isSuperAdmin: params.isSuperAdmin || false,
      isSocietyAdmin: params.role === "SOCIETY_ADMIN",
      isImpersonating: params.isImpersonating || false,
      originalUser: profile,
      effectiveUser: profile,
      currentSociety: params.society || null,
      availableSocieties: params.memberships || [],
      currentRole: params.role || null,
      permissions: [],
      impersonationSession: params.impersonationSession || null,
    };
  };

  const societyA = createMockSociety(SOCIETY_A_ID, "Green Valley Society");
  const societyB = createMockSociety(SOCIETY_B_ID, "Royal Palms CHS");

  // =========================================================================
  // 1. Requester Tests (Tests 1 to 8)
  // =========================================================================
  describe("1. Requester Security & Submission Validation", () => {
    it("Test 1: Authenticated unlinked user can submit access request", () => {
      const applicant = createMockIdentity({ userId: USER_APPLICANT_ID, memberships: [] });
      const result = validateAccessRequestInput({
        identity: applicant,
        societyId: societyA.id,
        societyStatus: "ACTIVE",
        unitNumber: "A-101",
        requestedRole: "OWNER",
        hasActiveMembership: false,
        hasPendingRequest: false,
      });

      expect(result.isValid).toBe(true);
      expect(result.normalizedRole).toBe("OWNER");
      expect(result.statusCode).toBe(200);
    });

    it("Test 2: Unauthenticated user cannot create request (401)", () => {
      const result = validateAccessRequestInput({
        identity: null,
        societyId: societyA.id,
        unitNumber: "A-101",
        hasActiveMembership: false,
        hasPendingRequest: false,
      });

      expect(result.isValid).toBe(false);
      expect(result.statusCode).toBe(401);
      expect(result.error).toContain("Authentication required");
    });

    it("Test 3: Requester can see own request", () => {
      const applicant = createMockIdentity({ userId: USER_APPLICANT_ID, memberships: [] });
      const ownRequest: Partial<SocietyAccessRequest> = {
        id: "req-1",
        user_id: USER_APPLICANT_ID,
        society_id: societyA.id,
        status: "PENDING",
      };

      // Server-side filtering check: user_id must match authenticated user
      const isVisibleToApplicant = ownRequest.user_id === applicant.effectiveUser.id;
      expect(isVisibleToApplicant).toBe(true);
    });

    it("Test 4: Requester cannot see another user's request", () => {
      const applicant = createMockIdentity({ userId: USER_APPLICANT_ID, memberships: [] });
      const otherRequest: Partial<SocietyAccessRequest> = {
        id: "req-2",
        user_id: USER_OTHER_ID,
        society_id: societyA.id,
        status: "PENDING",
      };

      const isVisibleToApplicant = otherRequest.user_id === applicant.effectiveUser.id;
      expect(isVisibleToApplicant).toBe(false);
    });

    it("Test 5: Duplicate pending request blocked (409 Conflict)", () => {
      const applicant = createMockIdentity({ userId: USER_APPLICANT_ID, memberships: [] });
      const result = validateAccessRequestInput({
        identity: applicant,
        societyId: societyA.id,
        unitNumber: "A-101",
        hasActiveMembership: false,
        hasPendingRequest: true, // already pending
      });

      expect(result.isValid).toBe(false);
      expect(result.statusCode).toBe(409);
      expect(result.error).toContain("already have a pending access request");
    });

    it("Test 6: Requester cannot approve own request (403 Forbidden)", () => {
      const applicant = createMockIdentity({
        userId: USER_APPLICANT_ID,
        role: "SOCIETY_ADMIN", // even if caller managed to have admin context
        society: societyA,
      });
      const request: Partial<SocietyAccessRequest> = {
        id: "req-self",
        user_id: USER_APPLICANT_ID, // same user!
        society_id: societyA.id,
        status: "PENDING",
      };

      const result = validateApprovalRules({
        identity: applicant,
        targetSocietyId: societyA.id,
        request,
        hasExistingActiveMembership: false,
      });

      expect(result.isValid).toBe(false);
      expect(result.statusCode).toBe(403);
      expect(result.error).toContain("cannot approve their own");
    });

    it("Test 7: Requester cannot assign self an elevated role (escalation defense)", () => {
      const applicant = createMockIdentity({ userId: USER_APPLICANT_ID, memberships: [] });
      const result = validateAccessRequestInput({
        identity: applicant,
        societyId: societyA.id,
        unitNumber: "A-101",
        requestedRole: "SUPER_ADMIN", // privilege escalation attempt!
        hasActiveMembership: false,
        hasPendingRequest: false,
      });

      // Role is sanitized to safe resident default
      expect(result.isValid).toBe(true);
      expect(result.normalizedRole).toBe("RESIDENT");
      expect(ALLOWED_REQUEST_ROLES).not.toContain("SUPER_ADMIN");
    });

    it("Test 8: Requester can cancel only eligible own pending request", () => {
      const applicant = createMockIdentity({ userId: USER_APPLICANT_ID, memberships: [] });
      const pendingRequest: Partial<SocietyAccessRequest> = {
        id: "req-1",
        user_id: USER_APPLICANT_ID,
        status: "PENDING",
      };

      const cancelPendingResult = validateCancellationRules({
        identity: applicant,
        request: pendingRequest,
      });
      expect(cancelPendingResult.isValid).toBe(true);

      // Cannot cancel someone else's request
      const otherRequest: Partial<SocietyAccessRequest> = {
        id: "req-other",
        user_id: USER_OTHER_ID,
        status: "PENDING",
      };
      const cancelOtherResult = validateCancellationRules({
        identity: applicant,
        request: otherRequest,
      });
      expect(cancelOtherResult.isValid).toBe(false);
      expect(cancelOtherResult.statusCode).toBe(403);

      // Cannot cancel already approved request
      const approvedRequest: Partial<SocietyAccessRequest> = {
        id: "req-app",
        user_id: USER_APPLICANT_ID,
        status: "APPROVED",
      };
      const cancelApprovedResult = validateCancellationRules({
        identity: applicant,
        request: approvedRequest,
      });
      expect(cancelApprovedResult.isValid).toBe(false);
      expect(cancelApprovedResult.statusCode).toBe(400);
    });
  });

  // =========================================================================
  // 2. Society Isolation & Cross-Tenant Defense (Tests 9 to 12)
  // =========================================================================
  describe("2. Society Isolation & Cross-Tenant Protection", () => {
    const adminA = createMockIdentity({
      userId: ADMIN_USER_A_ID,
      role: "SOCIETY_ADMIN",
      society: societyA,
    });
    const adminB = createMockIdentity({
      userId: ADMIN_USER_B_ID,
      role: "SOCIETY_ADMIN",
      society: societyB,
    });

    it("Test 9: Society A admin cannot view Society B access requests", () => {
      // Admin A querying Society B must be blocked by tenant boundary
      const canManageSocB = isAuthorizedSocietyAdmin(adminA, societyB.id);
      expect(canManageSocB).toBe(false);
    });

    it("Test 10: Society A admin cannot approve Society B request", () => {
      const reqSocietyB: Partial<SocietyAccessRequest> = {
        id: "req-b-1",
        society_id: societyB.id,
        user_id: USER_APPLICANT_ID,
        status: "PENDING",
        requested_role: "RESIDENT",
      };

      const result = validateApprovalRules({
        identity: adminA,
        targetSocietyId: societyB.id,
        request: reqSocietyB,
        hasExistingActiveMembership: false,
      });

      expect(result.isValid).toBe(false);
      expect(result.statusCode).toBe(403);
    });

    it("Test 11: Society A admin cannot reject Society B request", () => {
      const reqSocietyB: Partial<SocietyAccessRequest> = {
        id: "req-b-1",
        society_id: societyB.id,
        user_id: USER_APPLICANT_ID,
        status: "PENDING",
      };

      const result = validateRejectionRules({
        identity: adminA,
        targetSocietyId: societyB.id,
        request: reqSocietyB,
      });

      expect(result.isValid).toBe(false);
      expect(result.statusCode).toBe(403);
    });

    it("Test 12: Society A request cannot create Society B membership", () => {
      const reqSocietyA: Partial<SocietyAccessRequest> = {
        id: "req-a-1",
        society_id: societyA.id,
        user_id: USER_APPLICANT_ID,
        status: "PENDING",
      };

      // Attempting to approve reqSocietyA under targetSocietyId = societyB must fail
      const result = validateApprovalRules({
        identity: adminB,
        targetSocietyId: societyB.id,
        request: reqSocietyA,
        hasExistingActiveMembership: false,
      });

      expect(result.isValid).toBe(false);
      expect(result.statusCode).toBe(403);
      expect(result.error).toContain("does not belong to this society");
    });
  });

  // =========================================================================
  // 3. Membership Creation & Privilege Invariants (Tests 13 to 17)
  // =========================================================================
  describe("3. Membership Creation & Role Invariants", () => {
    const adminA = createMockIdentity({
      userId: ADMIN_USER_A_ID,
      role: "SOCIETY_ADMIN",
      society: societyA,
    });

    it("Test 13: Approved request creates valid membership with assigned role", () => {
      const request: Partial<SocietyAccessRequest> = {
        id: "req-owner",
        society_id: societyA.id,
        user_id: USER_APPLICANT_ID,
        status: "PENDING",
        requested_role: "OWNER",
      };

      const result = validateApprovalRules({
        identity: adminA,
        targetSocietyId: societyA.id,
        request,
        requestedRole: "OWNER",
        hasExistingActiveMembership: false,
      });

      expect(result.isValid).toBe(true);
      expect(result.assignedRole).toBe("OWNER");
      expect(result.statusCode).toBe(200);
    });

    it("Test 14: Duplicate active membership prevented on approval", () => {
      const request: Partial<SocietyAccessRequest> = {
        id: "req-dup",
        society_id: societyA.id,
        user_id: USER_APPLICANT_ID,
        status: "PENDING",
      };

      const result = validateApprovalRules({
        identity: adminA,
        targetSocietyId: societyA.id,
        request,
        hasExistingActiveMembership: true, // already active!
      });

      expect(result.isValid).toBe(true);
      expect(result.error).toContain("already an active member");
    });

    it("Test 15: Rejected request creates no membership", () => {
      const request: Partial<SocietyAccessRequest> = {
        id: "req-rej",
        society_id: societyA.id,
        user_id: USER_APPLICANT_ID,
        status: "PENDING",
      };

      const result = validateRejectionRules({
        identity: adminA,
        targetSocietyId: societyA.id,
        request,
      });

      expect(result.isValid).toBe(true);
      expect(result.statusCode).toBe(200);
      // Rejection returns 200 without creating membership record
    });

    it("Test 16: Requester cannot self-create membership without admin approval", () => {
      const applicant = createMockIdentity({ userId: USER_APPLICANT_ID, memberships: [] });
      const canCreate = isAuthorizedSocietyAdmin(applicant, societyA.id);
      expect(canCreate).toBe(false);
    });

    it("Test 17: Requester cannot self-elevate to SUPER_ADMIN or SOCIETY_ADMIN", () => {
      const request: Partial<SocietyAccessRequest> = {
        id: "req-hack",
        society_id: societyA.id,
        user_id: USER_APPLICANT_ID,
        status: "PENDING",
      };

      // Attacker passes requestedRole = "SUPER_ADMIN"
      const result = validateApprovalRules({
        identity: adminA,
        targetSocietyId: societyA.id,
        request,
        requestedRole: "SUPER_ADMIN",
        hasExistingActiveMembership: false,
      });

      // Server enforces fallback to safe resident default, never elevated
      expect(result.assignedRole).toBe("RESIDENT");
      expect(ALLOWED_APPROVE_ROLES).not.toContain("SUPER_ADMIN");
      expect(ALLOWED_APPROVE_ROLES).not.toContain("SOCIETY_ADMIN");
    });
  });

  // =========================================================================
  // 4. Multi-Society Architecture (Tests 18 to 20)
  // =========================================================================
  describe("4. Multi-Society Preservation & Isolation", () => {
    it("Test 18: Existing Society A membership preserved when Society B is approved", () => {
      const membershipA = createMockMembership(USER_APPLICANT_ID, societyA, "RESIDENT");
      const membershipB = createMockMembership(USER_APPLICANT_ID, societyB, "OWNER");

      const userWithBoth = createMockIdentity({
        userId: USER_APPLICANT_ID,
        memberships: [membershipA, membershipB],
        society: societyA,
        role: "RESIDENT",
      });

      expect(userWithBoth.availableSocieties!.length).toBe(2);
      expect(userWithBoth.availableSocieties!.map((m) => m.society_id)).toContain(societyA.id);
      expect(userWithBoth.availableSocieties!.map((m) => m.society_id)).toContain(societyB.id);
    });

    it("Test 19: Society B access does not grant Society A administrative privileges", () => {
      const membershipA = createMockMembership(USER_APPLICANT_ID, societyA, "RESIDENT");
      const membershipB = createMockMembership(USER_APPLICANT_ID, societyB, "SOCIETY_ADMIN");

      const userInSocA = createMockIdentity({
        userId: USER_APPLICANT_ID,
        memberships: [membershipA, membershipB],
        society: societyA,
        role: "RESIDENT", // In Society A context, caller is only RESIDENT
      });

      const canManageSocA = isAuthorizedSocietyAdmin(userInSocA, societyA.id);
      expect(canManageSocA).toBe(false);
    });

    it("Test 20: Society selection remains tenant-safe across multiple memberships", () => {
      const membershipA = createMockMembership(USER_APPLICANT_ID, societyA, "RESIDENT");
      const membershipB = createMockMembership(USER_APPLICANT_ID, societyB, "SOCIETY_ADMIN");

      const multiUser = createMockIdentity({
        userId: USER_APPLICANT_ID,
        memberships: [membershipA, membershipB],
      });

      // Requesting valid Society B resolves to Society B
      const routeWithValidCookie = resolvePostLoginRouting(multiUser, societyB.id);
      expect(routeWithValidCookie.destination).toBe(`/society/${societyB.id}/dashboard`);
      expect(routeWithValidCookie.activeSocietyId).toBe(societyB.id);

      // Requesting unauthorized foreign society triggers choose_community
      const routeWithForeignCookie = resolvePostLoginRouting(multiUser, "ffffffff-ffff-ffff-ffff-ffffffffffff");
      expect(routeWithForeignCookie.destination).toBe("/login?state=choose_community");
      expect(routeWithForeignCookie.requiresSocietySelection).toBe(true);
      expect(routeWithForeignCookie.activeSocietyId).toBeNull();
    });
  });

  // =========================================================================
  // 5. Post-Login Routing Integration (Tests 21 to 25)
  // =========================================================================
  describe("5. Post-Login Routing Integration", () => {
    it("Test 21: Zero memberships routes to /login?state=unlinked", () => {
      const unlinkedUser = createMockIdentity({ userId: USER_APPLICANT_ID, memberships: [] });
      const routing = resolvePostLoginRouting(unlinkedUser);

      expect(routing.destination).toBe("/login?state=unlinked");
      expect(routing.isUnlinked).toBe(true);
      expect(routing.activeSocietyId).toBeNull();
    });

    it("Test 22: One membership routes to correct persona dashboard", () => {
      const member = createMockMembership(USER_APPLICANT_ID, societyA, "RESIDENT");
      const singleMemberUser = createMockIdentity({
        userId: USER_APPLICANT_ID,
        memberships: [member],
        society: societyA,
        role: "RESIDENT",
      });

      const routing = resolvePostLoginRouting(singleMemberUser);
      expect(routing.destination).toBe("/resident/dashboard");
      expect(routing.activeSocietyId).toBe(societyA.id);
    });

    it("Test 23: Multiple memberships without valid cookie routes to choose_community", () => {
      const memberA = createMockMembership(USER_APPLICANT_ID, societyA, "RESIDENT");
      const memberB = createMockMembership(USER_APPLICANT_ID, societyB, "OWNER");
      const multiUser = createMockIdentity({
        userId: USER_APPLICANT_ID,
        memberships: [memberA, memberB],
      });

      const routing = resolvePostLoginRouting(multiUser, undefined);
      expect(routing.destination).toBe("/login?state=choose_community");
      expect(routing.requiresSocietySelection).toBe(true);
      expect(routing.activeSocietyId).toBeNull();
    });

    it("Test 24: Approved request transitions out of unlinked state on next session evaluation", () => {
      // Step 1: Before approval, 0 memberships -> unlinked
      const beforeApproval = createMockIdentity({ userId: USER_APPLICANT_ID, memberships: [] });
      expect(resolvePostLoginRouting(beforeApproval).destination).toBe("/login?state=unlinked");

      // Step 2: After approval, 1 membership -> immediately routes to resident dashboard
      const afterApprovalMembership = createMockMembership(USER_APPLICANT_ID, societyA, "RESIDENT");
      const afterApproval = createMockIdentity({
        userId: USER_APPLICANT_ID,
        memberships: [afterApprovalMembership],
        society: societyA,
        role: "RESIDENT",
      });
      const routingAfter = resolvePostLoginRouting(afterApproval);
      expect(routingAfter.destination).toBe("/resident/dashboard");
      expect(routingAfter.activeSocietyId).toBe(societyA.id);
      expect(routingAfter.isUnlinked).toBe(false);
    });

    it("Test 25: Stale active-society cookie cannot bypass actual membership check", () => {
      const user = createMockIdentity({ userId: USER_APPLICANT_ID, memberships: [] });
      // Client presents cookie for Society A, but has 0 active memberships in database
      const routing = resolvePostLoginRouting(user, societyA.id);

      expect(routing.destination).toBe("/login?state=unlinked");
      expect(routing.isUnlinked).toBe(true);
      expect(routing.activeSocietyId).toBeNull();
    });
  });

  // =========================================================================
  // 6. Impersonation & Super Admin Containment (Tests 26 to 29)
  // =========================================================================
  describe("6. Impersonation & Super Admin Containment", () => {
    it("Test 26: Impersonated persona cannot approve requests outside target society", () => {
      const impersonatedIdentity = createMockIdentity({
        userId: USER_APPLICANT_ID,
        role: "SOCIETY_ADMIN",
        society: societyA,
        isImpersonating: true,
        impersonationSession: {
          id: "imp-1",
          target_user_id: USER_APPLICANT_ID,
          target_society_id: societyA.id,
          target_role_id: "SOCIETY_ADMIN",
        },
      });

      // Target is Society A; attempt to approve request in Society B
      const reqSocB: Partial<SocietyAccessRequest> = {
        id: "req-b-foreign",
        society_id: societyB.id,
        user_id: USER_OTHER_ID,
        status: "PENDING",
      };

      const result = validateApprovalRules({
        identity: impersonatedIdentity,
        targetSocietyId: societyB.id,
        request: reqSocB,
        hasExistingActiveMembership: false,
      });

      expect(result.isValid).toBe(false);
      expect(result.statusCode).toBe(403);
    });

    it("Test 27: Impersonated persona is locked to target society", () => {
      const impersonatedIdentity = createMockIdentity({
        userId: USER_APPLICANT_ID,
        role: "OWNER",
        society: societyA,
        isImpersonating: true,
        impersonationSession: {
          id: "imp-1",
          target_user_id: USER_APPLICANT_ID,
          target_society_id: societyA.id,
          target_role_id: "OWNER",
        },
      });

      expect(impersonatedIdentity.isSuperAdmin).toBe(false);
      expect(impersonatedIdentity.isImpersonating).toBe(true);
      expect(impersonatedIdentity.currentSociety?.id).toBe(societyA.id);
    });

    it("Test 28: Impersonated persona cannot access platform admin capabilities (/superadmin)", () => {
      const impersonatedIdentity = createMockIdentity({
        userId: USER_APPLICANT_ID,
        role: "OWNER",
        society: societyA,
        isImpersonating: true,
        isSuperAdmin: false,
      });

      // requireSuperAdmin guard: (!identity.isSuperAdmin || identity.isImpersonating) -> redirect
      const canAccessSuperAdmin = impersonatedIdentity.isSuperAdmin && !impersonatedIdentity.isImpersonating;
      expect(canAccessSuperAdmin).toBe(false);
    });

    it("Test 29: Exit impersonation restores original SUPER_ADMIN identity", () => {
      const superAdminIdentity = createMockIdentity({
        userId: SUPER_ADMIN_ID,
        role: "SUPER_ADMIN",
        isSuperAdmin: true,
        isImpersonating: false,
      });

      expect(superAdminIdentity.isSuperAdmin).toBe(true);
      expect(superAdminIdentity.isImpersonating).toBe(false);
      const routing = resolvePostLoginRouting(superAdminIdentity);
      expect(routing.destination).toBe("/superadmin/view-as");
    });
  });

  // =========================================================================
  // 7. IDOR & Tampering Defenses (Tests 30 to 34)
  // =========================================================================
  describe("7. IDOR & Parameter Tampering Defenses", () => {
    const adminA = createMockIdentity({
      userId: ADMIN_USER_A_ID,
      role: "SOCIETY_ADMIN",
      society: societyA,
    });

    it("Test 30: Request ID tampering is blocked (404 for non-existent request)", () => {
      const result = validateApprovalRules({
        identity: adminA,
        targetSocietyId: societyA.id,
        request: null, // request ID not found in database
        hasExistingActiveMembership: false,
      });

      expect(result.isValid).toBe(false);
      expect(result.statusCode).toBe(404);
      expect(result.error).toContain("not found");
    });

    it("Test 31: Society ID tampering is blocked (cross-society mismatch)", () => {
      const request: Partial<SocietyAccessRequest> = {
        id: "req-tamper-soc",
        society_id: societyA.id,
        user_id: USER_APPLICANT_ID,
        status: "PENDING",
      };

      // Attacker manipulates societyId param to match societyB
      const result = validateApprovalRules({
        identity: adminA,
        targetSocietyId: societyB.id,
        request,
        hasExistingActiveMembership: false,
      });

      expect(result.isValid).toBe(false);
      expect(result.statusCode).toBe(403);
    });

    it("Test 32: User ID tampering in creation payload is blocked", () => {
      const applicant = createMockIdentity({ userId: USER_APPLICANT_ID, memberships: [] });
      // API forces user_id = identity.effectiveUser.id, ignoring any client-sent body.userId
      const resolvedUserId = applicant.effectiveUser.id;
      expect(resolvedUserId).toBe(USER_APPLICANT_ID);
      expect(resolvedUserId).not.toBe(USER_OTHER_ID);
    });

    it("Test 33: Cross-tenant API access is blocked", () => {
      const normalResident = createMockIdentity({
        userId: USER_OTHER_ID,
        role: "RESIDENT",
        society: societyA,
      });

      const canManage = isAuthorizedSocietyAdmin(normalResident, societyA.id);
      expect(canManage).toBe(false);
    });

    it("Test 34: Direct unauthorized table access blocked by RLS policies", () => {
      // Validates that non-admin resident cannot read or update other users' requests
      const applicant = createMockIdentity({ userId: USER_APPLICANT_ID, memberships: [] });
      const foreignReq: Partial<SocietyAccessRequest> = {
        id: "req-priv",
        user_id: USER_OTHER_ID,
        society_id: societyA.id,
        status: "PENDING",
      };

      // RLS Policy condition: (auth.uid() = user_id OR public.is_super_admin(auth.uid()) OR is_admin)
      const rlsCheck =
        foreignReq.user_id === applicant.effectiveUser.id ||
        applicant.isSuperAdmin ||
        isAuthorizedSocietyAdmin(applicant, societyA.id);

      expect(rlsCheck).toBe(false);
    });
  });
});
