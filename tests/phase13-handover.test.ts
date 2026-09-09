import { describe, it, expect } from "vitest";
import {
  CreateHandoverProjectSchema,
  UpdateHandoverProjectSchema,
  CreateChecklistItemSchema,
  UpdateChecklistItemSchema,
  CreateDefectSchema,
  UpdateDefectSchema,
  CreateCommitmentSchema,
  UpdateCommitmentSchema,
  CreateStatutoryRecordSchema,
  CreateAssetSchema,
  CreateAmcWarrantySchema,
  CreateMeterSchema,
  CreateDocumentLinkSchema,
  CreateMeetingLinkSchema,
  HandoverAcceptanceSchema,
  HandoverProjectStatusEnum,
  HandoverDefectSeverityEnum,
} from "../src/lib/validations/handover";

// ============================================================
// CreateHandoverProjectSchema
// ============================================================
describe("CreateHandoverProjectSchema", () => {
  it("accepts valid input", () => {
    const result = CreateHandoverProjectSchema.safeParse({
      title: "Phase 1 Handover",
      builder_name: "Prestige Builders",
      target_handover_date: "2026-12-31",
    });
    expect(result.success).toBe(true);
  });

  it("rejects title shorter than 3 chars", () => {
    const result = CreateHandoverProjectSchema.safeParse({
      title: "AB",
      builder_name: "Builder",
    });
    expect(result.success).toBe(false);
    expect(result.error?.flatten().fieldErrors.title).toBeDefined();
  });

  it("rejects empty builder_name", () => {
    const result = CreateHandoverProjectSchema.safeParse({
      title: "Valid Title",
      builder_name: "",
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid date format", () => {
    const result = CreateHandoverProjectSchema.safeParse({
      title: "Valid Title",
      builder_name: "Builder",
      target_handover_date: "31-12-2026",
    });
    expect(result.success).toBe(false);
  });

  it("accepts optional email as empty string", () => {
    const result = CreateHandoverProjectSchema.safeParse({
      title: "Valid Title",
      builder_name: "Builder",
      builder_contact_email: "",
    });
    expect(result.success).toBe(true);
  });
});

// ============================================================
// UpdateHandoverProjectSchema
// ============================================================
describe("UpdateHandoverProjectSchema", () => {
  it("accepts partial update", () => {
    const result = UpdateHandoverProjectSchema.safeParse({
      status: "IN_PROGRESS",
    });
    expect(result.success).toBe(true);
  });

  it("rejects invalid status value", () => {
    const result = UpdateHandoverProjectSchema.safeParse({
      status: "INVALID_STATUS",
    });
    expect(result.success).toBe(false);
  });

  it("rejects progress out of range", () => {
    const result = UpdateHandoverProjectSchema.safeParse({
      overall_progress: 110,
    });
    expect(result.success).toBe(false);
  });

  it("accepts progress at boundary 100", () => {
    const result = UpdateHandoverProjectSchema.safeParse({
      overall_progress: 100,
    });
    expect(result.success).toBe(true);
  });
});

// ============================================================
// HandoverProjectStatusEnum
// ============================================================
describe("HandoverProjectStatusEnum", () => {
  it("accepts READY_FOR_HANDOVER", () => {
    const r = HandoverProjectStatusEnum.safeParse("READY_FOR_HANDOVER");
    expect(r.success).toBe(true);
  });
  it("rejects PENDING (not a valid project status)", () => {
    const r = HandoverProjectStatusEnum.safeParse("PENDING");
    expect(r.success).toBe(false);
  });
});

// ============================================================
// CreateChecklistItemSchema
// ============================================================
describe("CreateChecklistItemSchema", () => {
  it("accepts valid item", () => {
    const r = CreateChecklistItemSchema.safeParse({
      category: "LEGAL",
      title: "Occupancy Certificate",
      priority: "HIGH",
    });
    expect(r.success).toBe(true);
  });

  it("defaults priority to MEDIUM", () => {
    const r = CreateChecklistItemSchema.safeParse({
      category: "BUILDING",
      title: "Check lift inspection",
    });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.priority).toBe("MEDIUM");
  });

  it("rejects invalid category", () => {
    const r = CreateChecklistItemSchema.safeParse({
      category: "INVALID",
      title: "Something",
    });
    expect(r.success).toBe(false);
  });
});

// ============================================================
// UpdateChecklistItemSchema
// ============================================================
describe("UpdateChecklistItemSchema", () => {
  it("accepts status update", () => {
    const r = UpdateChecklistItemSchema.safeParse({ status: "COMPLETED" });
    expect(r.success).toBe(true);
  });
  it("rejects invalid status", () => {
    const r = UpdateChecklistItemSchema.safeParse({ status: "DONE" });
    expect(r.success).toBe(false);
  });
});

// ============================================================
// CreateDefectSchema
// ============================================================
describe("CreateDefectSchema", () => {
  it("accepts valid defect", () => {
    const r = CreateDefectSchema.safeParse({
      category: "STRUCTURAL",
      title: "Crack in column B2",
      description: "5mm hairline crack visible in column B2 at ground floor.",
      severity: "HIGH",
    });
    expect(r.success).toBe(true);
  });

  it("rejects missing description", () => {
    const r = CreateDefectSchema.safeParse({
      category: "STRUCTURAL",
      title: "Crack in column B2",
      description: "",
    });
    expect(r.success).toBe(false);
  });

  it("rejects invalid UUID for building_id", () => {
    const r = CreateDefectSchema.safeParse({
      category: "OTHER",
      title: "Test defect",
      description: "Some description here",
      building_id: "not-a-uuid",
    });
    expect(r.success).toBe(false);
  });

  it("defaults builder_responsibility to true", () => {
    const r = CreateDefectSchema.safeParse({
      category: "PLUMBING",
      title: "Leaking pipe joint",
      description: "Water seeping through joint in terrace.",
    });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.builder_responsibility).toBe(true);
  });
});

// ============================================================
// HandoverDefectSeverityEnum
// ============================================================
describe("HandoverDefectSeverityEnum", () => {
  it("accepts CRITICAL", () => {
    const r = HandoverDefectSeverityEnum.safeParse("CRITICAL");
    expect(r.success).toBe(true);
  });
  it("rejects BLOCKER", () => {
    const r = HandoverDefectSeverityEnum.safeParse("BLOCKER");
    expect(r.success).toBe(false);
  });
});

// ============================================================
// CreateCommitmentSchema
// ============================================================
describe("CreateCommitmentSchema", () => {
  it("accepts valid commitment", () => {
    const r = CreateCommitmentSchema.safeParse({
      title: "Install remaining gate motors",
      category: "CIVIL",
      priority: "HIGH",
    });
    expect(r.success).toBe(true);
  });

  it("rejects short title", () => {
    const r = CreateCommitmentSchema.safeParse({ title: "AB" });
    expect(r.success).toBe(false);
  });
});

// ============================================================
// CreateStatutoryRecordSchema
// ============================================================
describe("CreateStatutoryRecordSchema", () => {
  it("accepts valid statutory record", () => {
    const r = CreateStatutoryRecordSchema.safeParse({
      document_type: "Occupancy Certificate",
      status: "RECEIVED",
    });
    expect(r.success).toBe(true);
  });

  it("rejects document_type shorter than 2 chars", () => {
    const r = CreateStatutoryRecordSchema.safeParse({ document_type: "X" });
    expect(r.success).toBe(false);
  });
});

// ============================================================
// CreateAssetSchema
// ============================================================
describe("CreateAssetSchema", () => {
  it("accepts valid asset", () => {
    const r = CreateAssetSchema.safeParse({
      asset_name: "Primary Submersible Pump",
      category: "PUMP",
    });
    expect(r.success).toBe(true);
  });

  it("defaults current_condition to GOOD", () => {
    const r = CreateAssetSchema.safeParse({
      asset_name: "Main Switchboard",
      category: "ELECTRICAL_INFRA",
    });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.current_condition).toBe("GOOD");
  });
});

// ============================================================
// CreateAmcWarrantySchema
// ============================================================
describe("CreateAmcWarrantySchema", () => {
  it("accepts valid AMC", () => {
    const r = CreateAmcWarrantySchema.safeParse({
      title: "Otis Lift AMC",
      contract_type: "AMC",
      vendor_name: "Otis India",
      end_date: "2027-06-30",
    });
    expect(r.success).toBe(true);
  });

  it("rejects invalid end_date format", () => {
    const r = CreateAmcWarrantySchema.safeParse({
      title: "AMC",
      end_date: "30-06-2027",
    });
    expect(r.success).toBe(false);
  });
});

// ============================================================
// CreateMeterSchema
// ============================================================
describe("CreateMeterSchema", () => {
  it("accepts valid meter", () => {
    const r = CreateMeterSchema.safeParse({
      meter_type: "ELECTRICITY_MAIN",
      meter_number: "DL-MSEB-001234",
      handover_reading: 12345.678,
      reading_date: "2026-09-01",
      unit_of_measurement: "kWh",
    });
    expect(r.success).toBe(true);
  });

  it("rejects invalid meter type", () => {
    const r = CreateMeterSchema.safeParse({ meter_type: "INVALID" });
    expect(r.success).toBe(false);
  });
});

// ============================================================
// CreateDocumentLinkSchema
// ============================================================
describe("CreateDocumentLinkSchema", () => {
  it("accepts valid document link", () => {
    const r = CreateDocumentLinkSchema.safeParse({
      document_id: "550e8400-e29b-41d4-a716-446655440000",
      entity_type: "PROJECT",
    });
    expect(r.success).toBe(true);
  });

  it("rejects non-UUID document_id", () => {
    const r = CreateDocumentLinkSchema.safeParse({
      document_id: "not-a-uuid",
    });
    expect(r.success).toBe(false);
  });
});

// ============================================================
// CreateMeetingLinkSchema
// ============================================================
describe("CreateMeetingLinkSchema", () => {
  it("accepts valid meeting link", () => {
    const r = CreateMeetingLinkSchema.safeParse({
      meeting_id: "550e8400-e29b-41d4-a716-446655440001",
    });
    expect(r.success).toBe(true);
  });

  it("rejects invalid UUID", () => {
    const r = CreateMeetingLinkSchema.safeParse({ meeting_id: "bad" });
    expect(r.success).toBe(false);
  });
});

// ============================================================
// HandoverAcceptanceSchema
// ============================================================
describe("HandoverAcceptanceSchema", () => {
  it("accepts valid acceptance", () => {
    const r = HandoverAcceptanceSchema.safeParse({
      actual_handover_date: "2026-12-15",
      acknowledge_outstanding: true,
    });
    expect(r.success).toBe(true);
  });

  it("rejects when acknowledge_outstanding is false", () => {
    const r = HandoverAcceptanceSchema.safeParse({
      actual_handover_date: "2026-12-15",
      acknowledge_outstanding: false,
    });
    expect(r.success).toBe(false);
  });

  it("rejects missing actual_handover_date", () => {
    const r = HandoverAcceptanceSchema.safeParse({
      acknowledge_outstanding: true,
    });
    expect(r.success).toBe(false);
  });

  it("rejects invalid date format", () => {
    const r = HandoverAcceptanceSchema.safeParse({
      actual_handover_date: "15/12/2026",
      acknowledge_outstanding: true,
    });
    expect(r.success).toBe(false);
  });
});

// ============================================================
// UpdateDefectSchema – status transitions logic note
// (Business logic is enforced at API layer, not schema layer)
// ============================================================
describe("UpdateDefectSchema", () => {
  it("accepts any valid status", () => {
    const r = UpdateDefectSchema.safeParse({ status: "VERIFIED" });
    expect(r.success).toBe(true);
  });
  it("accepts empty update (all optional)", () => {
    const r = UpdateDefectSchema.safeParse({});
    expect(r.success).toBe(true);
  });
});
