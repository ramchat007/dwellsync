import { describe, it, expect } from "vitest";
import { buildingSchema, wingSchema, floorSchema, unitSchema } from "../../src/lib/validations";

describe("Phase 0 Physical Structural Hierarchy Validation", () => {
  const mockSocietyId = "11111111-1111-1111-1111-111111111111";
  const mockBuildingId = "22222222-2222-2222-2222-222222222222";
  const mockWingId = "33333333-3333-3333-3333-333333333333";
  const mockFloorId = "44444444-4444-4444-4444-444444444444";

  describe("Building Schema Validation", () => {
    it("should accept valid building payload", () => {
      const validBuilding = {
        society_id: mockSocietyId,
        name: "Tower A",
        code: "TWR-A",
        number_of_floors: 10,
        status: "ACTIVE",
      };
      const result = buildingSchema.safeParse(validBuilding);
      expect(result.success).toBe(true);
    });

    it("should reject building without society_id or code", () => {
      const invalidBuilding = {
        name: "Tower A",
        number_of_floors: 10,
      };
      const result = buildingSchema.safeParse(invalidBuilding);
      expect(result.success).toBe(false);
    });
  });

  describe("Wing Schema Validation", () => {
    it("should accept valid wing payload", () => {
      const validWing = {
        society_id: mockSocietyId,
        building_id: mockBuildingId,
        name: "Wing A",
        code: "W-A",
        status: "ACTIVE",
      };
      const result = wingSchema.safeParse(validWing);
      expect(result.success).toBe(true);
    });

    it("should reject wing with invalid characters in code", () => {
      const invalidWing = {
        society_id: mockSocietyId,
        building_id: mockBuildingId,
        name: "Wing A",
        code: "Wing @ A#",
      };
      const result = wingSchema.safeParse(invalidWing);
      expect(result.success).toBe(false);
    });
  });

  describe("Floor Schema Validation", () => {
    it("should support ground and basement floors", () => {
      const groundFloor = {
        society_id: mockSocietyId,
        building_id: mockBuildingId,
        name: "Ground Floor",
        floor_number: 0,
        display_order: 0,
      };
      const basementFloor = {
        society_id: mockSocietyId,
        building_id: mockBuildingId,
        name: "Basement Level 1",
        floor_number: -1,
        display_order: -1,
      };

      expect(floorSchema.safeParse(groundFloor).success).toBe(true);
      expect(floorSchema.safeParse(basementFloor).success).toBe(true);
    });
  });

  describe("Unit Schema Validation", () => {
    it("should validate unit types and areas", () => {
      const validUnit = {
        society_id: mockSocietyId,
        building_id: mockBuildingId,
        wing_id: mockWingId,
        floor_id: mockFloorId,
        unit_number: "A-502",
        unit_type: "3_BHK",
        area_sqft: 1450,
        status: "OCCUPIED",
      };
      const result = unitSchema.safeParse(validUnit);
      expect(result.success).toBe(true);
    });

    it("should allow unit without optional wing_id and floor_id", () => {
      const standaloneUnit = {
        society_id: mockSocietyId,
        building_id: mockBuildingId,
        unit_number: "SHOP-01",
        unit_type: "SHOP",
        status: "ACTIVE",
      };
      const result = unitSchema.safeParse(standaloneUnit);
      expect(result.success).toBe(true);
    });
  });
});

