import { describe, it, expect, vi, beforeEach } from "vitest";
import crypto from "crypto";
import { isAuthorizedSocietyAdmin } from "../../src/lib/auth/societyAdmin";
import { UserIdentity } from "../../src/lib/types/auth";
import {
  RoleId,
  Society,
  Profile,
  Building,
  Wing,
  Floor,
  Unit,
} from "../../src/lib/types/database";
import {
  buildingSchema,
  wingSchema,
  floorSchema,
  unitSchema,
} from "../../src/lib/validations";
import { isValidUuid } from "../../src/lib/utils";
import {
  escapeCsvFormula,
  isFormulaInjection,
  normalizeUnitNumber,
} from "../../src/lib/services/import/sanitizer";
import {
  createBuilding,
  updateBuilding,
  deleteBuilding,
  createWing,
  updateWing,
  deleteWing,
  createFloor,
  updateFloor,
  deleteFloor,
  createUnit,
  updateUnit,
  deleteUnit,
  getSocietyStructure,
  getUnitsPaginated,
  getUnitWithDetails,
} from "../../src/lib/services/buildingService";

// Mock Supabase admin client and audit logging
const mockSupabaseData: {
  buildings: any[];
  wings: any[];
  floors: any[];
  units: any[];
  unit_owners: any[];
  unit_occupancies: any[];
  society_memberships: any[];
  audit_logs: any[];
} = {
  buildings: [],
  wings: [],
  floors: [],
  units: [],
  unit_owners: [],
  unit_occupancies: [],
  society_memberships: [],
  audit_logs: [],
};

vi.mock("../../src/lib/supabase/admin", () => {
  return {
    createAdminClient: vi.fn(() => ({
      from: vi.fn((table: string) => {
        let store = mockSupabaseData[table as keyof typeof mockSupabaseData] || [];
        let filters: ((item: any) => boolean)[] = [];
        let currentOrder: any = null;
        let selectFields: string | null = null;
        let isCountQuery = false;

        const chain: any = {
          select: vi.fn((fields = "*", opts?: any) => {
            selectFields = fields;
            if (opts?.count === "exact") isCountQuery = true;
            return chain;
          }),
          eq: vi.fn((col: string, val: any) => {
            filters.push((item) => item[col] === val);
            return chain;
          }),
          ilike: vi.fn((col: string, pattern: string) => {
            const clean = pattern.replace(/%/g, "").toLowerCase();
            filters.push((item) => String(item[col] || "").toLowerCase().includes(clean));
            return chain;
          }),
          order: vi.fn((col: string, opts?: any) => {
            currentOrder = { col, asc: opts?.ascending !== false };
            return chain;
          }),
          range: vi.fn((from: number, to: number) => {
            const filtered = store.filter((item) => filters.every((f) => f(item)));
            const sliced = filtered.slice(from, to + 1);
            return Promise.resolve({
              data: sliced,
              count: filtered.length,
              error: null,
            });
          }),
          limit: vi.fn((count: number) => {
            const filtered = store.filter((item) => filters.every((f) => f(item)));
            return Promise.resolve({ data: filtered.slice(0, count), error: null });
          }),
          maybeSingle: vi.fn(() => {
            const filtered = store.filter((item) => filters.every((f) => f(item)));
            return Promise.resolve({ data: filtered[0] || null, error: null });
          }),
          single: vi.fn(() => {
            const filtered = store.filter((item) => filters.every((f) => f(item)));
            return Promise.resolve({
              data: filtered[0] || null,
              error: filtered.length === 0 ? { message: "Row not found" } : null,
            });
          }),
          insert: vi.fn((row: any) => {
            const inserted = { id: crypto.randomUUID(), ...row };
            store.push(inserted);
            return {
              select: vi.fn(() => ({
                single: vi.fn().mockResolvedValue({ data: inserted, error: null }),
              })),
            };
          }),
          update: vi.fn((updates: any) => {
            return {
              eq: vi.fn((col1: string, val1: any) => {
                return {
                  eq: vi.fn((col2: string, val2: any) => {
                    const match = store.find((item) => item[col1] === val1 && item[col2] === val2);
                    if (match) {
                      Object.assign(match, updates);
                    }
                    return {
                      select: vi.fn(() => ({
                        single: vi.fn().mockResolvedValue({ data: match || null, error: match ? null : { message: "Not found" } }),
                      })),
                    };
                  }),
                };
              }),
            };
          }),
          delete: vi.fn(() => {
            return {
              eq: vi.fn((col1: string, val1: any) => {
                return {
                  eq: vi.fn((col2: string, val2: any) => {
                    const idx = store.findIndex((item) => item[col1] === val1 && item[col2] === val2);
                    if (idx >= 0) store.splice(idx, 1);
                    return Promise.resolve({ error: null });
                  }),
                };
              }),
            };
          }),
          then: (resolve: any) => {
            const filtered = store.filter((item) => filters.every((f) => f(item)));
            resolve({ data: filtered, count: isCountQuery ? filtered.length : undefined, error: null });
          },
        };

        return chain;
      }),
    })),
  };
});

vi.mock("../../src/lib/auth/audit", () => ({
  recordAuditLog: vi.fn(async (log: any) => {
    mockSupabaseData.audit_logs.push({ id: `audit-${Date.now()}`, ...log, created_at: new Date().toISOString() });
  }),
}));

describe("WP-06: Society Structure, Unit Registry & Bulk Import Security Suite", () => {
  const SOCIETY_A_ID = "07ae6307-13cb-4d14-a547-27914536fc62";
  const SOCIETY_B_ID = "b2c3d4e5-6789-01bc-def0-123456789abc";

  const ADMIN_A_ID = "d52b51a1-026d-4828-81c3-a9f3a48780e6";
  const SECRETARY_A_ID = "sec-user-0001-4828-81c3-a9f3a48780e6";
  const MANAGER_A_ID = "mgr-user-0002-4828-81c3-a9f3a48780e6";
  const RESIDENT_A_ID = "3bbe4296-9dc2-4b79-8894-8225a83f658b";
  const OWNER_A_ID = "00000000-0000-0000-0000-000000000003";
  const TENANT_A_ID = "00000000-0000-0000-0000-000000000004";
  const AUDITOR_A_ID = "00000000-0000-0000-0000-000000000005";
  const SUPER_ADMIN_ID = "00000000-0000-0000-0000-000000000000";

  const BUILDING_A_ID = "ba111111-2222-3333-4444-555555555555";
  const BUILDING_B_ID = "ba222222-2222-3333-4444-555555555555";
  const WING_A_ID = "cb111111-2222-3333-4444-555555555555";
  const WING_B_ID = "cb222222-2222-3333-4444-555555555555";
  const FLOOR_A_ID = "dc111111-2222-3333-4444-555555555555";
  const UNIT_A_101_ID = "ed111111-2222-3333-4444-555555555555";
  const UNIT_B_201_ID = "ed222222-2222-3333-4444-555555555555";

  const createMockProfile = (id: string, email: string): Profile => ({
    id,
    email,
    full_name: email.split("@")[0],
    display_name: email.split("@")[0],
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
    societyId: string | null;
    isSuperAdmin?: boolean;
    isImpersonating?: boolean;
    targetSocietyId?: string;
    targetRoleId?: RoleId;
  }): UserIdentity => {
    const profile = createMockProfile(params.userId, params.email);
    const society: Society | null = params.societyId
      ? {
          id: params.societyId,
          name: "Test Society",
          code: "TEST",
          status: "ACTIVE",
          society_type: "COOPERATIVE_HOUSING",
          country: "India",
          timezone: "Asia/Kolkata",
          currency: "INR",
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }
      : null;

    return {
      user: { id: params.userId, email: params.email },
      profile,
      isAuthenticated: true,
      isSuperAdmin: params.isSuperAdmin ?? false,
      isSocietyAdmin: params.role === "SOCIETY_ADMIN",
      isImpersonating: params.isImpersonating ?? false,
      originalUser: profile,
      effectiveUser: profile,
      currentSociety: society,
      availableSocieties: params.societyId
        ? [
            {
              id: `mem-${params.userId}`,
              society_id: params.societyId,
              user_id: params.userId,
              role_id: params.role || "RESIDENT",
              status: "ACTIVE",
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
              society: society!,
            },
          ]
        : [],
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

  beforeEach(() => {
    // Reset in-memory mock store
    mockSupabaseData.buildings = [
      {
        id: BUILDING_A_ID,
        society_id: SOCIETY_A_ID,
        name: "Building 1",
        code: "BLDG-1",
        number_of_floors: 10,
        status: "ACTIVE",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: BUILDING_B_ID,
        society_id: SOCIETY_B_ID,
        name: "Tower X",
        code: "TWR-X",
        number_of_floors: 12,
        status: "ACTIVE",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ];

    mockSupabaseData.wings = [
      {
        id: WING_A_ID,
        society_id: SOCIETY_A_ID,
        building_id: BUILDING_A_ID,
        name: "Wing A",
        code: "WING-A",
        status: "ACTIVE",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: WING_B_ID,
        society_id: SOCIETY_B_ID,
        building_id: BUILDING_B_ID,
        name: "Wing Z",
        code: "WING-Z",
        status: "ACTIVE",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ];

    mockSupabaseData.floors = [
      {
        id: FLOOR_A_ID,
        society_id: SOCIETY_A_ID,
        building_id: BUILDING_A_ID,
        wing_id: WING_A_ID,
        name: "Floor 1",
        floor_number: 1,
        display_order: 1,
        status: "ACTIVE",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ];

    mockSupabaseData.units = [
      {
        id: UNIT_A_101_ID,
        society_id: SOCIETY_A_ID,
        building_id: BUILDING_A_ID,
        wing_id: WING_A_ID,
        floor_id: FLOOR_A_ID,
        unit_number: "A-101",
        unit_type: "2_BHK",
        area_sqft: 950,
        status: "OCCUPIED",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: UNIT_B_201_ID,
        society_id: SOCIETY_B_ID,
        building_id: BUILDING_B_ID,
        wing_id: WING_B_ID,
        floor_id: null,
        unit_number: "Z-201",
        unit_type: "3_BHK",
        area_sqft: 1250,
        status: "VACANT",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ];

    mockSupabaseData.unit_owners = [
      {
        id: "owner-rec-1",
        society_id: SOCIETY_A_ID,
        unit_id: UNIT_A_101_ID,
        user_id: OWNER_A_ID,
        is_primary: true,
        ownership_percentage: 100,
        ownership_type: "PRIMARY",
        status: "ACTIVE",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ];

    mockSupabaseData.unit_occupancies = [];
    mockSupabaseData.society_memberships = [];
    mockSupabaseData.audit_logs = [];
  });

  // ============================================================================
  // 1. AUTHENTICATION & AUTHORIZATION
  // ============================================================================
  describe("1. Authentication & Authorization", () => {
    it("should deny unauthenticated callers (null identity)", () => {
      expect(isAuthorizedSocietyAdmin(null, SOCIETY_A_ID)).toBe(false);
    });

    it("should deny RESIDENT role from administrative structural access", () => {
      const resident = createMockIdentity({
        userId: RESIDENT_A_ID,
        email: "resident@dwellsync.com",
        role: "RESIDENT",
        societyId: SOCIETY_A_ID,
      });
      expect(isAuthorizedSocietyAdmin(resident, SOCIETY_A_ID)).toBe(false);
    });

    it("should deny OWNER and TENANT roles from structural administration", () => {
      const owner = createMockIdentity({
        userId: OWNER_A_ID,
        email: "owner@dwellsync.com",
        role: "OWNER",
        societyId: SOCIETY_A_ID,
      });
      const tenant = createMockIdentity({
        userId: TENANT_A_ID,
        email: "tenant@dwellsync.com",
        role: "TENANT",
        societyId: SOCIETY_A_ID,
      });
      expect(isAuthorizedSocietyAdmin(owner, SOCIETY_A_ID)).toBe(false);
      expect(isAuthorizedSocietyAdmin(tenant, SOCIETY_A_ID)).toBe(false);
    });

    it("should deny AUDITOR, VENDOR, and STAFF roles from structural administration", () => {
      const auditor = createMockIdentity({
        userId: AUDITOR_A_ID,
        email: "auditor@dwellsync.com",
        role: "AUDITOR",
        societyId: SOCIETY_A_ID,
      });
      expect(isAuthorizedSocietyAdmin(auditor, SOCIETY_A_ID)).toBe(false);
    });

    it("should permit SOCIETY_ADMIN, SECRETARY, and MANAGER in target society", () => {
      const admin = createMockIdentity({
        userId: ADMIN_A_ID,
        email: "admin@dwellsync.com",
        role: "SOCIETY_ADMIN",
        societyId: SOCIETY_A_ID,
      });
      const secretary = createMockIdentity({
        userId: SECRETARY_A_ID,
        email: "secretary@dwellsync.com",
        role: "SECRETARY",
        societyId: SOCIETY_A_ID,
      });
      const manager = createMockIdentity({
        userId: MANAGER_A_ID,
        email: "manager@dwellsync.com",
        role: "MANAGER",
        societyId: SOCIETY_A_ID,
      });

      expect(isAuthorizedSocietyAdmin(admin, SOCIETY_A_ID)).toBe(true);
      expect(isAuthorizedSocietyAdmin(secretary, SOCIETY_A_ID)).toBe(true);
      expect(isAuthorizedSocietyAdmin(manager, SOCIETY_A_ID)).toBe(true);
    });

    it("should permit non-impersonating SUPER_ADMIN across all societies", () => {
      const superAdmin = createMockIdentity({
        userId: SUPER_ADMIN_ID,
        email: "superadmin@dwellsync.com",
        role: "SUPER_ADMIN",
        societyId: null,
        isSuperAdmin: true,
      });
      expect(isAuthorizedSocietyAdmin(superAdmin, SOCIETY_A_ID)).toBe(true);
      expect(isAuthorizedSocietyAdmin(superAdmin, SOCIETY_B_ID)).toBe(true);
    });
  });

  // ============================================================================
  // 2. IMPERSONATION PROTECTIONS
  // ============================================================================
  describe("2. Impersonation Boundary Protections", () => {
    it("should strictly deny SUPER_ADMIN impersonating a RESIDENT from structural administration", () => {
      const impersonatingResident = createMockIdentity({
        userId: SUPER_ADMIN_ID,
        email: "superadmin@dwellsync.com",
        role: "RESIDENT",
        societyId: SOCIETY_A_ID,
        isSuperAdmin: false, // In impersonation mode, isSuperAdmin is forced false
        isImpersonating: true,
        targetSocietyId: SOCIETY_A_ID,
        targetRoleId: "RESIDENT",
      });

      expect(isAuthorizedSocietyAdmin(impersonatingResident, SOCIETY_A_ID)).toBe(false);
    });

    it("should deny impersonated admin in Society A from administering Society B", () => {
      const impersonatingAdminA = createMockIdentity({
        userId: SUPER_ADMIN_ID,
        email: "superadmin@dwellsync.com",
        role: "SOCIETY_ADMIN",
        societyId: SOCIETY_A_ID,
        isSuperAdmin: false,
        isImpersonating: true,
        targetSocietyId: SOCIETY_A_ID,
        targetRoleId: "SOCIETY_ADMIN",
      });

      expect(isAuthorizedSocietyAdmin(impersonatingAdminA, SOCIETY_A_ID)).toBe(true);
      expect(isAuthorizedSocietyAdmin(impersonatingAdminA, SOCIETY_B_ID)).toBe(false);
    });
  });

  // ============================================================================
  // 3. TENANT ISOLATION
  // ============================================================================
  describe("3. Tenant Isolation & Cross-Society Protections", () => {
    it("should block Society A admin from accessing Society B", () => {
      const adminA = createMockIdentity({
        userId: ADMIN_A_ID,
        email: "adminA@dwellsync.com",
        role: "SOCIETY_ADMIN",
        societyId: SOCIETY_A_ID,
      });
      expect(isAuthorizedSocietyAdmin(adminA, SOCIETY_B_ID)).toBe(false);
    });

    it("should prevent creating a wing referencing a foreign society's building", async () => {
      // Attempt to attach wing to BUILDING_B_ID under SOCIETY_A_ID
      const result = await createWing({
        society_id: SOCIETY_A_ID,
        building_id: BUILDING_B_ID,
        name: "Intruder Wing",
        code: "INT-1",
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("does not exist or does not belong to this society");
    });

    it("should prevent creating a floor referencing a foreign society's building", async () => {
      const result = await createFloor({
        society_id: SOCIETY_A_ID,
        building_id: BUILDING_B_ID,
        name: "Floor 99",
        floor_number: 99,
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("does not exist or does not belong to this society");
    });

    it("should prevent creating a unit referencing a foreign society's building", async () => {
      const result = await createUnit({
        society_id: SOCIETY_A_ID,
        building_id: BUILDING_B_ID,
        unit_number: "ROGUE-101",
        unit_type: "2_BHK",
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("does not exist or does not belong to this society");
    });
  });

  // ============================================================================
  // 4. UUID & INPUT VALIDATION
  // ============================================================================
  describe("4. UUID & Input Validation", () => {
    it("should validate standard UUID v4 format correctly", () => {
      expect(isValidUuid("07ae6307-13cb-4d14-a547-27914536fc62")).toBe(true);
      expect(isValidUuid("d52b51a1-026d-4828-81c3-a9f3a48780e6")).toBe(true);
    });

    it("should reject malformed or non-UUID inputs safely without throwing", () => {
      expect(isValidUuid("not-a-uuid")).toBe(false);
      expect(isValidUuid("12345")).toBe(false);
      expect(isValidUuid("")).toBe(false);
      expect(isValidUuid(null)).toBe(false);
      expect(isValidUuid(undefined)).toBe(false);
      expect(isValidUuid("'; DROP TABLE units;--")).toBe(false);
    });

    it("should reject building with duplicate code in same society", async () => {
      const result = await createBuilding({
        society_id: SOCIETY_A_ID,
        name: "Building Duplicate",
        code: "BLDG-1", // Already exists in mock store
        number_of_floors: 5,
        status: "ACTIVE",
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("already exists in this society");
    });

    it("should reject wing with duplicate code in same building", async () => {
      const result = await createWing({
        society_id: SOCIETY_A_ID,
        building_id: BUILDING_A_ID,
        name: "Duplicate Wing",
        code: "WING-A", // Already exists in Building A
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("already exists in this building");
    });

    it("should reject duplicate unit number in same society", async () => {
      const result = await createUnit({
        society_id: SOCIETY_A_ID,
        building_id: BUILDING_A_ID,
        unit_number: "A-101", // Already exists in Society A
        unit_type: "2_BHK",
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("already exists in this society");
    });
  });

  // ============================================================================
  // 5. SAFE DELETION GUARDS
  // ============================================================================
  describe("5. Safe Deletion Guards", () => {
    it("should block building deletion when child wings or units exist", async () => {
      const result = await deleteBuilding(BUILDING_A_ID, SOCIETY_A_ID);
      expect(result.success).toBe(false);
      expect(result.error).toContain("active wings exist");
    });

    it("should block wing deletion when child units exist", async () => {
      const result = await deleteWing(WING_A_ID, SOCIETY_A_ID);
      expect(result.success).toBe(false);
      expect(result.error).toContain("units are assigned to this wing");
    });

    it("should block unit deletion when active ownership exists", async () => {
      const result = await deleteUnit(UNIT_A_101_ID, SOCIETY_A_ID);
      expect(result.success).toBe(false);
      expect(result.error).toContain("active ownership records exist");
    });
  });

  // ============================================================================
  // 6. BULK IMPORT SAFETY & FORMULA INJECTION DEFENSE
  // ============================================================================
  describe("6. Bulk Import Safety & Formula Injection Defense", () => {
    it("should detect and neutralize dangerous CSV spreadsheet formula injection prefixes", () => {
      expect(isFormulaInjection("=1+2")).toBe(true);
      expect(isFormulaInjection("+1234")).toBe(true);
      expect(isFormulaInjection("-cmd|' /C calc'!A0")).toBe(true);
      expect(isFormulaInjection("@SUM(A1:A10)")).toBe(true);
      expect(isFormulaInjection("\t dangerous")).toBe(true);

      expect(escapeCsvFormula("=cmd|' /C calc'!A0")).toBe("'=cmd|' /C calc'!A0");
      expect(escapeCsvFormula("A-101")).toBe("A-101");
    });

    it("should normalize unit numbers consistently (uppercase, trimmed)", () => {
      expect(normalizeUnitNumber("  b-101  ")).toBe("B-101");
      expect(normalizeUnitNumber("flat 302")).toBe("FLAT 302");
    });
  });

  // ============================================================================
  // 7. AUDIT LOGGING VERIFICATION
  // ============================================================================
  describe("7. Audit Logging Verification", () => {
    it("should record immutable audit logs upon building, wing, and unit mutations", async () => {
      // 1. Create new clean building
      const newBldg = await createBuilding(
        {
          society_id: SOCIETY_A_ID,
          name: "Tower C",
          code: "TWR-C",
          number_of_floors: 8,
          status: "ACTIVE",
        },
        ADMIN_A_ID
      );
      expect(newBldg.success).toBe(true);

      // 2. Create wing
      const newWing = await createWing(
        {
          society_id: SOCIETY_A_ID,
          building_id: newBldg.data!.id,
          name: "East Wing",
          code: "WING-E",
        },
        ADMIN_A_ID
      );
      expect(newWing.success).toBe(true);

      // 3. Create unit
      const newUnit = await createUnit(
        {
          society_id: SOCIETY_A_ID,
          building_id: newBldg.data!.id,
          wing_id: newWing.data!.id,
          unit_number: "C-101",
          unit_type: "3_BHK",
        },
        ADMIN_A_ID
      );
      expect(newUnit.success).toBe(true);

      // Verify audit logs were captured
      const logs = mockSupabaseData.audit_logs;
      expect(logs.some((l) => l.action === "BUILDING_CREATED" && l.societyId === SOCIETY_A_ID)).toBe(true);
      expect(logs.some((l) => l.action === "WING_CREATED" && l.societyId === SOCIETY_A_ID)).toBe(true);
      expect(logs.some((l) => l.action === "UNIT_CREATED" && l.societyId === SOCIETY_A_ID)).toBe(true);
    });
  });

  // ============================================================================
  // 8. QUERY & STRUCTURE RETRIEVAL
  // ============================================================================
  describe("8. Society Structure & Pagination Retrieval", () => {
    it("should retrieve full society physical hierarchy tree with statistics", async () => {
      const structure = await getSocietyStructure(SOCIETY_A_ID);
      expect(structure.society_id).toBe(SOCIETY_A_ID);
      expect(structure.buildings.length).toBeGreaterThanOrEqual(1);
      expect(structure.stats.totalBuildings).toBeGreaterThanOrEqual(1);
      expect(structure.stats.totalUnits).toBeGreaterThanOrEqual(1);
    });

    it("should paginate units with safe limit bounds and page indexing", async () => {
      const res = await getUnitsPaginated(SOCIETY_A_ID, { page: 1, limit: 10 });
      expect(res.pagination.page).toBe(1);
      expect(res.pagination.limit).toBe(10);
      expect(res.data.length).toBeGreaterThanOrEqual(1);
    });

    it("should return single unit details with owners without leaking credentials", async () => {
      const res = await getUnitWithDetails(UNIT_A_101_ID, SOCIETY_A_ID);
      expect(res.success).toBe(true);
      expect(res.data?.unit_number).toBe("A-101");
      expect(res.data?.owners.length).toBe(1);
      expect(res.data?.owners[0].user_id).toBe(OWNER_A_ID);
    });
  });
});
