import { describe, it, expect } from "vitest";
import { onboardingSchema } from "../../src/lib/validations/onboarding";
import { generateUnitDefinitions } from "../../src/lib/services/unitBatchService";

describe("Phase 1 Society Onboarding & Bulk Generation Tests", () => {
  describe("Onboarding Wizard Schema Validation", () => {
    it("should accept valid 7-step onboarding payload", () => {
      const payload = {
        name: "Green Valley CHS",
        code: "GVS001",
        registration_number: "MUM/123/2012",
        society_type: "COOPERATIVE_HOUSING" as const,
        address_line_1: "104 Palm Grove Road",
        city: "Mumbai",
        state: "Maharashtra",
        pincode: "400062",
        country: "India",
        admin_full_name: "Vikram Malhotra",
        admin_email: "admin@greenvalley.internal",
        admin_password: "TestPassword@123",
      };

      const result = onboardingSchema.safeParse(payload);
      expect(result.success).toBe(true);
    });

    it("should reject payload with invalid code format", () => {
      const payload = {
        name: "Green Valley CHS",
        code: "invalid code with spaces!!",
        address_line_1: "104 Palm Grove Road",
        city: "Mumbai",
        state: "Maharashtra",
        pincode: "400062",
        admin_full_name: "Vikram Malhotra",
        admin_email: "admin@greenvalley.internal",
      };

      const result = onboardingSchema.safeParse(payload);
      expect(result.success).toBe(false);
    });
  });

  describe("Bulk Unit Generation Engine", () => {
    it("should generate 20 units across 5 floors correctly", () => {
      const units = generateUnitDefinitions({
        society_id: "soc-1",
        building_id: "bld-1",
        start_floor: 1,
        end_floor: 5,
        units_per_floor: 4,
        prefix: "TWR-A",
        unit_type: "2_BHK",
        area_sqft: 950,
        pattern: "{prefix}{floor}{unit}",
      });

      expect(units.length).toBe(20);
      expect(units[0].unit_number).toBe("TWR-A-101");
      expect(units[3].unit_number).toBe("TWR-A-104");
      expect(units[19].unit_number).toBe("TWR-A-504");
      expect(units[0].status).toBe("VACANT");
    });
  });
});

