import { describe, it, expect } from "vitest";
import { normalizeApplicantInput } from "../../src/lib/services/onboardingVerificationService";

describe("Resident Self-Onboarding & Vehicle Verification Unit Suite", () => {
  describe("1. Applicant Input Normalization", () => {
    it("normalizes owner contact information and assigns INDEX_II default document", () => {
      const result = normalizeApplicantInput({
        applicant_email: "  Priya.Sharma@Example.COM  ",
        applicant_phone: "+91 98765-43210",
        applicant_name: "  Priya Sharma ",
        unit_number: "a-402",
        requested_role: "OWNER",
      });

      expect(result.email).toBe("priya.sharma@example.com");
      expect(result.phone).toBe("+919876543210");
      expect(result.name).toBe("Priya Sharma");
      expect(result.unitNumber).toBe("A-402");
      expect(result.defaultDocumentType).toBe("INDEX_II");
    });

    it("assigns RENT_AGREEMENT default document for tenant applicants", () => {
      const result = normalizeApplicantInput({
        applicant_email: "amit.kumar@example.com",
        applicant_phone: "9123456780",
        applicant_name: "Amit Kumar",
        unit_number: "B-201",
        requested_role: "TENANT",
      });

      expect(result.defaultDocumentType).toBe("RENT_AGREEMENT");
    });
  });

  describe("2. Vehicle Normalization & EV Tagging", () => {
    it("uppercases vehicle registration plates and enforces ELECTRIC fuel type for EVs", () => {
      const result = normalizeApplicantInput({
        applicant_email: "rahul@example.com",
        applicant_phone: "9800011122",
        applicant_name: "Rahul Sharma",
        unit_number: "C-101",
        requested_role: "OWNER",
        vehicles: [
          {
            vehicle_type: "FOUR_WHEELER",
            plate_number: "mh 12 ab 1234",
            make_model: "Tata Nexon EV",
            is_ev: true,
            fuel_type: "PETROL", // Should be overridden to ELECTRIC
          },
          {
            vehicle_type: "TWO_WHEELER",
            plate_number: "mh 14 xy 9876",
            make_model: "Honda Activa",
            is_ev: false,
            fuel_type: "PETROL",
          },
        ],
      });

      expect(result.vehicles).toHaveLength(2);
      expect(result.vehicles[0].plate_number).toBe("MH 12 AB 1234");
      expect(result.vehicles[0].fuel_type).toBe("ELECTRIC");
      expect(result.vehicles[0].is_ev).toBe(true);

      expect(result.vehicles[1].plate_number).toBe("MH 14 XY 9876");
      expect(result.vehicles[1].fuel_type).toBe("PETROL");
      expect(result.vehicles[1].is_ev).toBe(false);
    });
  });
});