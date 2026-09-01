import { describe, it, expect } from "vitest";
import { unitOwnerSchema, unitOccupancySchema, familyMemberSchema } from "../../src/lib/validations/ownership";

describe("Phase 1 Ownership & Occupancy Security Validations", () => {
  const mockSocietyId = "11111111-1111-1111-1111-111111111111";
  const mockUnitId = "22222222-2222-2222-2222-222222222222";
  const mockUserId1 = "33333333-3333-3333-3333-333333333333";
  const mockUserId2 = "44444444-4444-4444-4444-444444444444";

  describe("Unit Ownership Model", () => {
    it("should accept valid 100% primary ownership", () => {
      const primaryOwner = {
        society_id: mockSocietyId,
        unit_id: mockUnitId,
        user_id: mockUserId1,
        is_primary: true,
        ownership_percentage: 100,
        ownership_type: "PRIMARY",
      };
      expect(unitOwnerSchema.safeParse(primaryOwner).success).toBe(true);
    });

    it("should support joint ownership with valid percentage split", () => {
      const jointOwner1 = {
        society_id: mockSocietyId,
        unit_id: mockUnitId,
        user_id: mockUserId1,
        is_primary: true,
        ownership_percentage: 60,
        ownership_type: "PRIMARY",
      };
      const jointOwner2 = {
        society_id: mockSocietyId,
        unit_id: mockUnitId,
        user_id: mockUserId2,
        is_primary: false,
        ownership_percentage: 40,
        ownership_type: "JOINT",
      };

      expect(unitOwnerSchema.safeParse(jointOwner1).success).toBe(true);
      expect(unitOwnerSchema.safeParse(jointOwner2).success).toBe(true);
      expect(jointOwner1.ownership_percentage + jointOwner2.ownership_percentage).toBe(100);
    });

    it("should reject ownership percentage greater than 100%", () => {
      const invalidOwner = {
        society_id: mockSocietyId,
        unit_id: mockUnitId,
        user_id: mockUserId1,
        is_primary: true,
        ownership_percentage: 105,
      };
      const result = unitOwnerSchema.safeParse(invalidOwner);
      expect(result.success).toBe(false);
    });

    it("should reject negative ownership percentage", () => {
      const invalidOwner = {
        society_id: mockSocietyId,
        unit_id: mockUnitId,
        user_id: mockUserId1,
        is_primary: true,
        ownership_percentage: -10,
      };
      const result = unitOwnerSchema.safeParse(invalidOwner);
      expect(result.success).toBe(false);
    });
  });

  describe("Unit Occupancy Model", () => {
    it("should validate tenant occupancy with lease terms", () => {
      const tenant = {
        society_id: mockSocietyId,
        unit_id: mockUnitId,
        user_id: mockUserId1,
        occupancy_type: "TENANT_OCCUPIED",
        lease_start: "2026-01-01",
        lease_end: "2026-12-31",
        is_primary_tenant: true,
        status: "ACTIVE",
      };
      expect(unitOccupancySchema.safeParse(tenant).success).toBe(true);
    });

    it("should validate owner-occupied unit format", () => {
      const ownerOccupant = {
        society_id: mockSocietyId,
        unit_id: mockUnitId,
        user_id: mockUserId1,
        occupancy_type: "OWNER_OCCUPIED",
        is_primary_tenant: true,
        status: "ACTIVE",
      };
      expect(unitOccupancySchema.safeParse(ownerOccupant).success).toBe(true);
    });
  });

  describe("Family & Household Model", () => {
    it("should accept valid family member profile with emergency contact flag", () => {
      const family = {
        society_id: mockSocietyId,
        unit_id: mockUnitId,
        primary_member_id: mockUserId1,
        full_name: "Chirayu Sharma",
        relationship: "CHILD",
        phone: "+91 98200 12345",
        is_emergency_contact: true,
      };
      expect(familyMemberSchema.safeParse(family).success).toBe(true);
    });
  });
});

