import { describe, it, expect } from "vitest";
import {
  CreateCompleteDocumentSchema,
  UpdateCompleteDocumentSchema,
  CreateDocumentFolderSchema,
  UpdateDocumentFolderSchema,
  UploadDocumentVersionSchema,
  DocumentLifecycleSchema,
  CreateDocumentEntityLinkSchema,
  DocumentCategoryEnum,
  DocumentVisibilityEnum,
  DocumentStatusEnum,
  DocumentEntityTypeEnum,
} from "../src/lib/validations/documents";
import { checkUserDocumentAccess } from "../src/lib/services/documentService";

describe("Complete Document Management Validation & Access Rules", () => {
  // ============================================================
  // 1. CreateCompleteDocumentSchema
  // ============================================================
  describe("CreateCompleteDocumentSchema", () => {
    it("accepts valid official document input", () => {
      const result = CreateCompleteDocumentSchema.safeParse({
        title: "Annual Audited Balance Sheet FY 2025-26",
        category: "FINANCIAL_REPORT",
        subcategory: "Audited Balance Sheet",
        visibility: "OWNERS_ONLY",
        document_date: "2026-03-31",
        effective_date: "2026-04-01",
        file_url: "https://storage.dwellsync.com/docs/balance_sheet_2026.pdf",
        tags: ["audit", "balance_sheet", "fy2026"],
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.status).toBe("PUBLISHED");
        expect(result.data.tags).toHaveLength(3);
      }
    });

    it("rejects title shorter than 3 characters", () => {
      const result = CreateCompleteDocumentSchema.safeParse({
        title: "AB",
        category: "GENERAL",
        file_url: "https://example.com/doc.pdf",
      });
      expect(result.success).toBe(false);
      expect(result.error?.flatten().fieldErrors.title).toBeDefined();
    });

    it("rejects invalid document category", () => {
      const result = CreateCompleteDocumentSchema.safeParse({
        title: "Valid Document Title",
        category: "NON_EXISTENT_CATEGORY",
        file_url: "https://example.com/doc.pdf",
      });
      expect(result.success).toBe(false);
    });

    it("accepts all 12 supported society categories", () => {
      const categories = [
        "SOCIETY_BYLAWS",
        "AGM_MINUTES",
        "FINANCIAL_REPORT",
        "FORMS_TEMPLATES",
        "RULES_REGULATIONS",
        "STATUTORY_COMPLIANCE",
        "ENGINEERING_MAINTENANCE",
        "LEGAL_CONTRACTS",
        "BUILDER_HANDOVER",
        "NOTICES_CIRCULARS",
        "RESIDENT_UNIT_DOCUMENTS",
        "GENERAL",
      ];
      categories.forEach((cat) => {
        const parsed = DocumentCategoryEnum.safeParse(cat);
        expect(parsed.success).toBe(true);
      });
    });

    it("accepts all 5 supported visibility options", () => {
      const visibilities = [
        "ALL_RESIDENTS",
        "OWNERS_ONLY",
        "COMMITTEE_ONLY",
        "ADMIN_ONLY",
        "ROLE_RESTRICTED",
      ];
      visibilities.forEach((vis) => {
        const parsed = DocumentVisibilityEnum.safeParse(vis);
        expect(parsed.success).toBe(true);
      });
    });

    it("rejects malformed date format", () => {
      const result = CreateCompleteDocumentSchema.safeParse({
        title: "Building Occupancy Certificate",
        category: "STATUTORY_COMPLIANCE",
        file_url: "https://example.com/oc.pdf",
        expiry_date: "31-12-2026", // Invalid: must be YYYY-MM-DD
      });
      expect(result.success).toBe(false);
      expect(result.error?.flatten().fieldErrors.expiry_date).toBeDefined();
    });

    it("validates unit_id and resident_id as valid UUIDs if provided", () => {
      const validUUID = "550e8400-e29b-41d4-a716-446655440000";
      const validResult = CreateCompleteDocumentSchema.safeParse({
        title: "Flat 402 NOC Application",
        category: "FORMS_TEMPLATES",
        file_url: "https://example.com/noc.pdf",
        unit_id: validUUID,
      });
      expect(validResult.success).toBe(true);

      const invalidResult = CreateCompleteDocumentSchema.safeParse({
        title: "Flat 402 NOC Application",
        category: "FORMS_TEMPLATES",
        file_url: "https://example.com/noc.pdf",
        unit_id: "not-a-uuid",
      });
      expect(invalidResult.success).toBe(false);
    });
  });

  // ============================================================
  // 2. CreateDocumentFolderSchema
  // ============================================================
  describe("CreateDocumentFolderSchema", () => {
    it("accepts valid folder input", () => {
      const result = CreateDocumentFolderSchema.safeParse({
        name: "Financial Audits",
        description: "Annual CA audit reports and tax records",
        color: "#10B981",
        icon: "FolderCheck",
      });
      expect(result.success).toBe(true);
    });

    it("rejects empty folder name", () => {
      const result = CreateDocumentFolderSchema.safeParse({
        name: "   ",
      });
      expect(result.success).toBe(false);
    });

    it("validates optional parent_id as UUID", () => {
      const parentUUID = "6ba7b810-9dad-11d1-80b4-00c04fd430c8";
      const valid = CreateDocumentFolderSchema.safeParse({
        name: "FY 2025",
        parent_id: parentUUID,
      });
      expect(valid.success).toBe(true);

      const invalid = CreateDocumentFolderSchema.safeParse({
        name: "FY 2025",
        parent_id: "bad-id",
      });
      expect(invalid.success).toBe(false);
    });
  });

  // ============================================================
  // 3. UploadDocumentVersionSchema
  // ============================================================
  describe("UploadDocumentVersionSchema", () => {
    it("accepts valid version payload", () => {
      const result = UploadDocumentVersionSchema.safeParse({
        file_url: "/api/society/soc-1/documents/storage/v2_bylaws.pdf",
        file_name: "Society Bylaws 2026 v2.pdf",
        file_type: "PDF",
        file_size_kb: 1024,
        change_summary: "Updated pet policy rules per AGM voting resolution",
      });
      expect(result.success).toBe(true);
    });

    it("rejects missing file_url", () => {
      const result = UploadDocumentVersionSchema.safeParse({
        change_summary: "No file provided",
      });
      expect(result.success).toBe(false);
    });

    it("rejects negative file_size_kb", () => {
      const result = UploadDocumentVersionSchema.safeParse({
        file_url: "https://example.com/doc.pdf",
        file_size_kb: -5,
      });
      expect(result.success).toBe(false);
    });
  });

  // ============================================================
  // 4. DocumentLifecycleSchema
  // ============================================================
  describe("DocumentLifecycleSchema", () => {
    it("accepts all valid lifecycle actions", () => {
      const actions = ["SUBMIT_REVIEW", "APPROVE", "PUBLISH", "ARCHIVE", "RESTORE"] as const;
      actions.forEach((act) => {
        const result = DocumentLifecycleSchema.safeParse({ action: act });
        expect(result.success).toBe(true);
      });
    });

    it("rejects invalid lifecycle action", () => {
      const result = DocumentLifecycleSchema.safeParse({ action: "DELETE_FOREVER" });
      expect(result.success).toBe(false);
    });

    it("accepts publication_notes and broadcast_notification flag", () => {
      const result = DocumentLifecycleSchema.safeParse({
        action: "PUBLISH",
        publication_notes: "Approved in AGM meeting #14",
        broadcast_notification: true,
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.broadcast_notification).toBe(true);
      }
    });
  });

  // ============================================================
  // 5. CreateDocumentEntityLinkSchema (Cross-Module Integrations)
  // ============================================================
  describe("CreateDocumentEntityLinkSchema", () => {
    it("accepts valid links to Finance, Meetings, and Handover", () => {
      const sampleUUID = "7b235478-f938-4e32-a5e2-2a7e7bc10e99";
      const validTypes = [
        "FINANCIAL_REPORT",
        "EXPENSE_VOUCHER",
        "INVOICE",
        "RECEIPT",
        "BANK_RECONCILIATION",
        "NOTICE",
        "MEETING",
        "HANDOVER_PROJECT",
        "COMPLAINT",
        "UNIT",
      ] as const;

      validTypes.forEach((entityType) => {
        const result = CreateDocumentEntityLinkSchema.safeParse({
          entity_type: entityType,
          entity_id: sampleUUID,
          relationship_type: "SUPPORTING_EVIDENCE",
          notes: "Auditor certified voucher attachment",
        });
        expect(result.success).toBe(true);
      });
    });

    it("rejects invalid entity UUID", () => {
      const result = CreateDocumentEntityLinkSchema.safeParse({
        entity_type: "INVOICE",
        entity_id: "invalid-uuid",
      });
      expect(result.success).toBe(false);
    });
  });

  // ============================================================
  // 6. Access Visibility Logic (checkUserDocumentAccess)
  // ============================================================
  describe("checkUserDocumentAccess", () => {
    const societyId = "soc-uuid-1234";

    it("grants access to SOCIETY_ADMIN and SECRETARY regardless of status", async () => {
      const adminIdentity = {
        isAuthenticated: true,
        currentRole: "SOCIETY_ADMIN",
        currentSociety: { id: societyId },
        effectiveUser: { id: "user-admin" },
      };

      const draftDoc = {
        society_id: societyId,
        status: "DRAFT",
        visibility: "ADMIN_ONLY",
        is_archived: false,
      };

      const access = await checkUserDocumentAccess(adminIdentity, draftDoc, societyId);
      expect(access).toBe(true);
    });

    it("denies access when cross-tenant society ID does not match", async () => {
      const adminIdentity = {
        isAuthenticated: true,
        currentRole: "SOCIETY_ADMIN",
        currentSociety: { id: societyId },
        effectiveUser: { id: "user-admin" },
      };

      const foreignDoc = {
        society_id: "other-society-9999",
        status: "PUBLISHED",
        visibility: "ALL_RESIDENTS",
        is_archived: false,
      };

      const access = await checkUserDocumentAccess(adminIdentity, foreignDoc, societyId);
      expect(access).toBe(false);
    });

    it("denies resident access to unapproved DRAFT or UNDER_REVIEW documents", async () => {
      const residentIdentity = {
        isAuthenticated: true,
        currentRole: "RESIDENT",
        currentSociety: { id: societyId },
        effectiveUser: { id: "user-res" },
      };

      const draftDoc = {
        society_id: societyId,
        status: "UNDER_REVIEW",
        visibility: "ALL_RESIDENTS",
        is_archived: false,
      };

      const access = await checkUserDocumentAccess(residentIdentity, draftDoc, societyId);
      expect(access).toBe(false);
    });

    it("grants resident access to PUBLISHED ALL_RESIDENTS documents", async () => {
      const residentIdentity = {
        isAuthenticated: true,
        currentRole: "RESIDENT",
        currentSociety: { id: societyId },
        effectiveUser: { id: "user-res" },
      };

      const publishedDoc = {
        society_id: societyId,
        status: "PUBLISHED",
        visibility: "ALL_RESIDENTS",
        is_archived: false,
      };

      const access = await checkUserDocumentAccess(residentIdentity, publishedDoc, societyId);
      expect(access).toBe(true);
    });

    it("denies regular tenant access to OWNERS_ONLY documents", async () => {
      const tenantIdentity = {
        isAuthenticated: true,
        currentRole: "TENANT",
        currentSociety: { id: societyId },
        effectiveUser: { id: "user-tenant" },
      };

      const ownerDoc = {
        society_id: societyId,
        status: "PUBLISHED",
        visibility: "OWNERS_ONLY",
        is_archived: false,
      };

      const access = await checkUserDocumentAccess(tenantIdentity, ownerDoc, societyId);
      expect(access).toBe(false);
    });

    it("grants OWNER access to OWNERS_ONLY documents", async () => {
      const ownerIdentity = {
        isAuthenticated: true,
        currentRole: "OWNER",
        currentSociety: { id: societyId },
        effectiveUser: { id: "user-owner" },
      };

      const ownerDoc = {
        society_id: societyId,
        status: "PUBLISHED",
        visibility: "OWNERS_ONLY",
        is_archived: false,
      };

      const access = await checkUserDocumentAccess(ownerIdentity, ownerDoc, societyId);
      expect(access).toBe(true);
    });

    it("grants resident access if explicitly assigned to their resident_id", async () => {
      const residentIdentity = {
        isAuthenticated: true,
        currentRole: "RESIDENT",
        currentSociety: { id: societyId },
        effectiveUser: { id: "target-resident-id" },
      };

      const personalDoc = {
        society_id: societyId,
        status: "PUBLISHED",
        visibility: "ADMIN_ONLY", // even if admin only, user is the target resident
        resident_id: "target-resident-id",
        is_archived: false,
      };

      const access = await checkUserDocumentAccess(residentIdentity, personalDoc, societyId);
      expect(access).toBe(true);
    });
  });
});
