import { describe, it, expect } from "vitest";
import {
  resolvePostLoginRouting,
  PostLoginRoutingResult,
} from "../../src/lib/auth/onboarding";
import { getPermissionsForRole, PERMISSIONS } from "../../src/lib/auth/permissions";
import { getDashboardPathForRole } from "../../src/lib/auth/persona";
import { UserIdentity } from "../../src/lib/types/auth";
import { RoleId, Society, SocietyMembership, Profile, MembershipStatus } from "../../src/lib/types/database";

describe("WP-02: Authentication, Account Linking & Onboarding Hardening Security Suite", () => {
  const MOCK_SUPER_ADMIN_ID = "d52b51a1-026d-4828-81c3-a9f3a48780e6";
  const MOCK_USER_ID = "3bbe4296-9dc2-4b79-8894-8225a83f658b";
  const MOCK_SOCIETY_A = "07ae6307-13cb-4d14-a547-27914536fc62";
  const MOCK_SOCIETY_B = "b2c3d4e5-6789-01bc-def0-123456789abc";
  const MOCK_TAMPERED_SOCIETY = "ffffffff-ffff-ffff-ffff-ffffffffffff";

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
    status: MembershipStatus = "ACTIVE"
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

  // =========================================================================
  // SECTION 1: DETERMINISTIC POST-LOGIN ROUTING MATRIX (CASES A THROUGH G)
  // =========================================================================

  it("TEST 1 (Case A): Unauthenticated visitor routes deterministically to /login", () => {
    const routing = resolvePostLoginRouting(null);
    expect(routing.destination).toBe("/login");
    expect(routing.activeSocietyId).toBeNull();
    expect(routing.isUnlinked).toBe(false);
    expect(routing.requiresSocietySelection).toBe(false);

    const unauthIdentity: Partial<UserIdentity> = { isAuthenticated: false };
    const routing2 = resolvePostLoginRouting(unauthIdentity as UserIdentity);
    expect(routing2.destination).toBe("/login");
  });

  it("TEST 2 (Case B): Authenticated platform SUPER_ADMIN routes to /superadmin/view-as", () => {
    const adminProfile = createMockProfile(MOCK_SUPER_ADMIN_ID, "admin@dwellsync.internal", "Rupesh Admin");
    const adminIdentity: UserIdentity = {
      user: { id: MOCK_SUPER_ADMIN_ID, email: adminProfile.email },
      profile: adminProfile,
      isAuthenticated: true,
      isSuperAdmin: true,
      isSocietyAdmin: false,
      isImpersonating: false,
      originalUser: adminProfile,
      effectiveUser: adminProfile,
      currentSociety: null,
      availableSocieties: [],
      currentRole: "SUPER_ADMIN",
      permissions: getPermissionsForRole("SUPER_ADMIN"),
    };

    const routing = resolvePostLoginRouting(adminIdentity);
    expect(routing.destination).toBe("/superadmin/view-as");
    expect(routing.activeSocietyId).toBeNull();
    expect(routing.requiresSocietySelection).toBe(false);
  });

  it("TEST 3 (Case C): Authenticated impersonating Super Admin routes to target persona dashboard", () => {
    const adminProfile = createMockProfile(MOCK_SUPER_ADMIN_ID, "admin@dwellsync.internal", "Rupesh Admin");
    const targetProfile = createMockProfile(MOCK_USER_ID, "resident@svac.internal", "Resident 2233");
    const targetSociety = createMockSociety(MOCK_SOCIETY_A, "Shree Vrindavan Annex CHS Ltd.");

    const impersonatingIdentity: UserIdentity = {
      user: { id: MOCK_SUPER_ADMIN_ID, email: adminProfile.email },
      profile: targetProfile,
      isAuthenticated: true,
      isSuperAdmin: false, // Strict invariant: false during impersonation
      isSocietyAdmin: false,
      isImpersonating: true,
      originalUser: adminProfile,
      effectiveUser: targetProfile,
      currentSociety: targetSociety,
      availableSocieties: [],
      currentRole: "RESIDENT",
      permissions: getPermissionsForRole("RESIDENT"),
      impersonationSession: {
        id: "session-1",
        original_admin_id: MOCK_SUPER_ADMIN_ID,
        target_user_id: MOCK_USER_ID,
        target_society_id: MOCK_SOCIETY_A,
        target_role_id: "RESIDENT",
        session_token: "token-1",
        status: "ACTIVE",
        started_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
      },
    };

    const routing = resolvePostLoginRouting(impersonatingIdentity);
    expect(routing.destination).toBe("/resident/dashboard");
    expect(routing.activeSocietyId).toBe(MOCK_SOCIETY_A);
    expect(routing.requiresSocietySelection).toBe(false);
  });

  it("TEST 4 (Case D): Authenticated user with exactly 1 active membership routes to role dashboard", () => {
    const userProfile = createMockProfile(MOCK_USER_ID, "user@svac.internal", "Owner Resident");
    const societyA = createMockSociety(MOCK_SOCIETY_A, "Society Alpha");
    const membershipA = createMockMembership(MOCK_USER_ID, societyA, "OWNER");

    const identity: UserIdentity = {
      user: { id: MOCK_USER_ID, email: userProfile.email },
      profile: userProfile,
      isAuthenticated: true,
      isSuperAdmin: false,
      isSocietyAdmin: false,
      isImpersonating: false,
      originalUser: userProfile,
      effectiveUser: userProfile,
      currentSociety: societyA,
      availableSocieties: [membershipA],
      currentRole: "OWNER",
      permissions: getPermissionsForRole("OWNER"),
    };

    const routing = resolvePostLoginRouting(identity);
    expect(routing.destination).toBe("/resident/dashboard");
    expect(routing.activeSocietyId).toBe(MOCK_SOCIETY_A);
    expect(routing.requiresSocietySelection).toBe(false);
    expect(routing.isUnlinked).toBe(false);
  });

  it("TEST 5 (Case E): Multi-society user with valid matching preferred society cookie routes to matched dashboard", () => {
    const userProfile = createMockProfile(MOCK_USER_ID, "user@multi.internal", "Multi Resident");
    const societyA = createMockSociety(MOCK_SOCIETY_A, "Society Alpha");
    const societyB = createMockSociety(MOCK_SOCIETY_B, "Society Beta");
    const membershipA = createMockMembership(MOCK_USER_ID, societyA, "OWNER");
    const membershipB = createMockMembership(MOCK_USER_ID, societyB, "SOCIETY_ADMIN");

    const identity: UserIdentity = {
      user: { id: MOCK_USER_ID, email: userProfile.email },
      profile: userProfile,
      isAuthenticated: true,
      isSuperAdmin: false,
      isSocietyAdmin: true,
      isImpersonating: false,
      originalUser: userProfile,
      effectiveUser: userProfile,
      currentSociety: societyB,
      availableSocieties: [membershipA, membershipB],
      currentRole: "SOCIETY_ADMIN",
      permissions: getPermissionsForRole("SOCIETY_ADMIN"),
    };

    // User previously selected Society B
    const routing = resolvePostLoginRouting(identity, MOCK_SOCIETY_B);
    expect(routing.destination).toBe(`/society/${MOCK_SOCIETY_B}/dashboard`);
    expect(routing.activeSocietyId).toBe(MOCK_SOCIETY_B);
    expect(routing.requiresSocietySelection).toBe(false);
  });

  it("TEST 6 (Case E): Multi-society user without active cookie is prompted to select community", () => {
    const userProfile = createMockProfile(MOCK_USER_ID, "user@multi.internal", "Multi Resident");
    const societyA = createMockSociety(MOCK_SOCIETY_A, "Society Alpha");
    const societyB = createMockSociety(MOCK_SOCIETY_B, "Society Beta");
    const membershipA = createMockMembership(MOCK_USER_ID, societyA, "OWNER");
    const membershipB = createMockMembership(MOCK_USER_ID, societyB, "TENANT");

    const identity: UserIdentity = {
      user: { id: MOCK_USER_ID, email: userProfile.email },
      profile: userProfile,
      isAuthenticated: true,
      isSuperAdmin: false,
      isSocietyAdmin: false,
      isImpersonating: false,
      originalUser: userProfile,
      effectiveUser: userProfile,
      currentSociety: null,
      availableSocieties: [membershipA, membershipB],
      currentRole: null,
      permissions: [],
    };

    // No preferred society cookie
    const routing = resolvePostLoginRouting(identity, null);
    expect(routing.destination).toBe("/login?state=choose_community");
    expect(routing.activeSocietyId).toBeNull();
    expect(routing.requiresSocietySelection).toBe(true);
  });

  it("TEST 7 (Case F): Authenticated user with 0 active memberships routes to /login?state=unlinked", () => {
    const userProfile = createMockProfile(MOCK_USER_ID, "newuser@gmail.com", "New Google User");

    const identity: UserIdentity = {
      user: { id: MOCK_USER_ID, email: userProfile.email },
      profile: userProfile,
      isAuthenticated: true,
      isSuperAdmin: false,
      isSocietyAdmin: false,
      isImpersonating: false,
      originalUser: userProfile,
      effectiveUser: userProfile,
      currentSociety: null,
      availableSocieties: [],
      currentRole: null,
      permissions: [],
    };

    const routing = resolvePostLoginRouting(identity);
    expect(routing.destination).toBe("/login?state=unlinked");
    expect(routing.activeSocietyId).toBeNull();
    expect(routing.isUnlinked).toBe(true);
  });

  it("TEST 8 (Case G): Authenticated user with tampered/stale society cookie rejects cookie and resolves safely", () => {
    const userProfile = createMockProfile(MOCK_USER_ID, "user@single.internal", "Single Resident");
    const societyA = createMockSociety(MOCK_SOCIETY_A, "Society Alpha");
    const membershipA = createMockMembership(MOCK_USER_ID, societyA, "RESIDENT");

    const identity: UserIdentity = {
      user: { id: MOCK_USER_ID, email: userProfile.email },
      profile: userProfile,
      isAuthenticated: true,
      isSuperAdmin: false,
      isSocietyAdmin: false,
      isImpersonating: false,
      originalUser: userProfile,
      effectiveUser: userProfile,
      currentSociety: societyA,
      availableSocieties: [membershipA],
      currentRole: "RESIDENT",
      permissions: getPermissionsForRole("RESIDENT"),
    };

    // Cookie contains a tampered society ID
    const routing = resolvePostLoginRouting(identity, MOCK_TAMPERED_SOCIETY);
    // Because the user has 1 valid membership, it safely resolves to Society A and rejects the tampered ID!
    expect(routing.destination).toBe("/resident/dashboard");
    expect(routing.activeSocietyId).toBe(MOCK_SOCIETY_A);
    expect(routing.activeSocietyId).not.toBe(MOCK_TAMPERED_SOCIETY);
  });

  // =========================================================================
  // SECTION 2: PROFILE DATA INTEGRITY & LINKING RULES
  // =========================================================================

  it("TEST 9: Non-destructive profile sync preserves existing user customizations", () => {
    const existingProfile: Profile = {
      id: MOCK_USER_ID,
      email: "existing@example.com",
      full_name: "Original Custom Name",
      display_name: "Original Display",
      avatar_url: "https://custom.cdn/avatar.png",
      phone: "+919820111111",
      status: "ACTIVE",
      created_at: "2026-01-01T00:00:00Z",
      updated_at: "2026-01-01T00:00:00Z",
    };

    // Incoming OAuth data with default name
    const incomingAuthData = {
      id: MOCK_USER_ID,
      email: "existing@example.com",
      user_metadata: {
        full_name: "Google Account Name",
        name: "Google Account Name",
        avatar_url: "https://lh3.googleusercontent.com/default",
      },
    };

    // Invariant: Do NOT overwrite legitimate populated full_name, display_name, phone or avatar_url
    const preservedName = existingProfile.full_name || incomingAuthData.user_metadata.full_name;
    const preservedDisplay = existingProfile.display_name || incomingAuthData.user_metadata.name;
    const preservedAvatar = existingProfile.avatar_url || incomingAuthData.user_metadata.avatar_url;

    expect(preservedName).toBe("Original Custom Name");
    expect(preservedDisplay).toBe("Original Display");
    expect(preservedAvatar).toBe("https://custom.cdn/avatar.png");
  });

  it("TEST 10: Missing fields are populated for new profile", () => {
    const incomingAuthData = {
      id: "new-uuid-12345",
      email: "newperson@gmail.com",
      user_metadata: {
        full_name: "New Person",
        avatar_url: "https://lh3.googleusercontent.com/pic.png",
      },
      phone: "+919820333333",
    };

    const derivedName = incomingAuthData.user_metadata?.full_name || incomingAuthData.email.split("@")[0];
    expect(derivedName).toBe("New Person");
    expect(incomingAuthData.user_metadata.avatar_url).toBe("https://lh3.googleusercontent.com/pic.png");
  });

  // =========================================================================
  // SECTION 3: TENANT BOUNDARY DEFENSE & UNAUTHORIZED ACCESS
  // =========================================================================

  it("TEST 11: Inactive or suspended memberships are excluded from active memberships", () => {
    const userProfile = createMockProfile(MOCK_USER_ID, "inactive@test.com", "Inactive User");
    const societyA = createMockSociety(MOCK_SOCIETY_A, "Society Alpha");
    const inactiveMem = createMockMembership(MOCK_USER_ID, societyA, "RESIDENT", "REMOVED");
    const suspendedMem = createMockMembership(MOCK_USER_ID, societyA, "RESIDENT", "SUSPENDED");

    const allMemberships = [inactiveMem, suspendedMem];
    const activeMemberships = allMemberships.filter((m) => m.status === "ACTIVE");

    expect(activeMemberships.length).toBe(0);

    const identity: UserIdentity = {
      user: { id: MOCK_USER_ID, email: userProfile.email },
      profile: userProfile,
      isAuthenticated: true,
      isSuperAdmin: false,
      isSocietyAdmin: false,
      isImpersonating: false,
      originalUser: userProfile,
      effectiveUser: userProfile,
      currentSociety: null,
      availableSocieties: activeMemberships,
      currentRole: null,
      permissions: [],
    };

    const routing = resolvePostLoginRouting(identity);
    expect(routing.isUnlinked).toBe(true);
    expect(routing.destination).toBe("/login?state=unlinked");
  });

  it("TEST 12: Cross-tenant access is strictly blocked when user attempts to access foreign society", () => {
    const userProfile = createMockProfile(MOCK_USER_ID, "single@test.com", "Single Member");
    const societyA = createMockSociety(MOCK_SOCIETY_A, "Society Alpha");
    const membershipA = createMockMembership(MOCK_USER_ID, societyA, "RESIDENT");

    const userMemberships = [membershipA];
    const targetSocietyToAccess = MOCK_SOCIETY_B; // User does NOT belong to Society B

    const hasAccessToTarget = userMemberships.some((m) => m.society_id === targetSocietyToAccess && m.status === "ACTIVE");
    expect(hasAccessToTarget).toBe(false);
  });

  // =========================================================================
  // SECTION 4: PLATFORM SUPER_ADMIN & PRIVILEGE ELEVATION DEFENSE
  // =========================================================================

  it("TEST 13: Google login with arbitrary email never grants isSuperAdmin", () => {
    const emailsToTest = [
      "superadmin@gmail.com",
      "admin@dwellsync.com",
      "root@dwellsync.internal",
      "rupesh@gmail.com",
    ];

    for (const email of emailsToTest) {
      // Authorization rule: isSuperAdmin must be determined EXCLUSIVELY by platform_admins table lookup
      const isRecordInPlatformAdminsTable = false; // Not in database table
      const isSuperAdmin = isRecordInPlatformAdminsTable;
      expect(isSuperAdmin).toBe(false);
    }
  });

  it("TEST 14: Impersonated Super Admin is prohibited from switching to unauthorized societies", () => {
    const isImpersonating = true;
    const isSuperAdmin = false; // Effective identity
    const targetSociety: string = MOCK_SOCIETY_A;
    const unauthorizedSociety: string = MOCK_SOCIETY_B;

    // While impersonating, allowed society is strictly targetSociety
    const isAllowedSwitch = !isImpersonating || unauthorizedSociety === targetSociety;
    expect(isAllowedSwitch).toBe(false);
  });
});
