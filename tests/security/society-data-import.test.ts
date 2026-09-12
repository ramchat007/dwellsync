import { describe, it, expect, vi, beforeEach } from "vitest";
import * as XLSX from "xlsx";
import {
  escapeCsvFormula,
  isFormulaInjection,
  normalizeEmail,
  normalizePhone,
  normalizeUnitNumber,
  sanitizeRecordForExport,
} from "@/lib/services/import/sanitizer";
import {
  parseSpreadsheetBuffer,
  MAX_IMPORT_FILE_SIZE_BYTES,
} from "@/lib/services/import/fileParser";
import {
  detectColumnMappings,
  IMPORT_SCHEMAS,
} from "@/lib/services/import/columnDetector";
import {
  generateTemplateCsv,
  generateTemplateXlsx,
} from "@/lib/services/import/templateGenerator";
import { validateImportData } from "@/lib/services/import/validationEngine";

// Mock Supabase admin client and entitlementService
vi.mock("@/lib/supabase/admin", () => {
  return {
    createAdminClient: vi.fn(() => ({
      from: vi.fn((table: string) => {
        if (table === "units") {
          return {
            select: vi.fn(() => ({
              eq: vi.fn().mockResolvedValue({
                data: [{ unit_number: "A-101" }, { unit_number: "A-102" }],
                error: null,
              }),
            })),
          };
        }
        if (table === "society_memberships") {
          return {
            select: vi.fn(() => ({
              eq: vi.fn().mockResolvedValue({
                data: [
                  { user: { email: "existing.member@example.com" } },
                ],
                error: null,
              }),
            })),
          };
        }
        return {
          select: vi.fn(() => ({
            eq: vi.fn().mockResolvedValue({ data: [], error: null }),
          })),
        };
      }),
      auth: {
        admin: {
          listUsers: vi.fn().mockResolvedValue({ users: [] }),
          createUser: vi.fn().mockResolvedValue({
            user: { id: "mock-new-user-id" },
            error: null,
          }),
        },
      },
    })),
  };
});

vi.mock("@/lib/services/entitlementService", () => {
  return {
    getFeatureLimit: vi.fn(async (societyId: string, feature: string) => {
      if (feature === "units") return 30; // Free tier 30 units
      if (feature === "residents") return 60;
      return null;
    }),
    getUsage: vi.fn(async (societyId: string, feature: string) => {
      if (feature === "units") return 28; // Currently 28 units used
      if (feature === "residents") return 10;
      return 0;
    }),
  };
});

describe("DwellSync Free Migration & Society Data Import", () => {
  describe("1. Security: Formula Injection Defense (CWE-1236)", () => {
    it("should detect formulas starting with =, +, -, @, \\t, \\r, |, %", () => {
      expect(isFormulaInjection("=cmd|' /C calc'!A0")).toBe(true);
      expect(isFormulaInjection("+123456")).toBe(true);
      expect(isFormulaInjection("-20+30")).toBe(true);
      expect(isFormulaInjection("@SUM(A1:A10)")).toBe(true);
      expect(isFormulaInjection("\t dangerous_tab")).toBe(true);
      expect(isFormulaInjection("A-101")).toBe(false);
      expect(isFormulaInjection("John Doe")).toBe(false);
      expect(isFormulaInjection("user@example.com")).toBe(false);
    });

    it("should neutralize dangerous formula injection values by prefixing with a single quote", () => {
      expect(escapeCsvFormula("=SUM(A1:B10)")).toBe("'=SUM(A1:B10)");
      expect(escapeCsvFormula("+cmd|' /C calc'")).toBe("'+cmd|' /C calc'");
      expect(escapeCsvFormula("@DDE('cmd';'calc')")).toBe("'@DDE('cmd';'calc')");
      expect(escapeCsvFormula("|calc")).toBe("'|calc");
      expect(escapeCsvFormula("%COMSPEC%")).toBe("'%COMSPEC%");
    });

    it("should leave benign text, numbers, and emails intact", () => {
      expect(escapeCsvFormula("Tower A")).toBe("Tower A");
      expect(escapeCsvFormula("user@dwellsync.in")).toBe("user@dwellsync.in");
      expect(escapeCsvFormula("9876543210")).toBe("9876543210");
      expect(escapeCsvFormula(123)).toBe("123");
      expect(escapeCsvFormula(null)).toBe("");
    });

    it("should recursively sanitize records and arrays for export", () => {
      const dirty = {
        name: "=malicious()",
        email: "safe@example.com",
        nested: {
          code: "+49123",
          items: ["@cmd", "safe_item"],
        },
      };

      const clean = sanitizeRecordForExport(dirty);
      expect(clean.name).toBe("'=malicious()");
      expect(clean.email).toBe("safe@example.com");
      expect(clean.nested.code).toBe("'+49123");
      expect(clean.nested.items[0]).toBe("'@cmd");
      expect(clean.nested.items[1]).toBe("safe_item");
    });
  });

  describe("2. Normalization: Emails, Phones, and Units", () => {
    it("should normalize email addresses to lowercase and trim spaces", () => {
      expect(normalizeEmail("  USER@Example.COM  ")).toBe("user@example.com");
      expect(normalizeEmail("invalid-email")).toBeNull();
      expect(normalizeEmail("")).toBeNull();
      expect(normalizeEmail(null)).toBeNull();
    });

    it("should normalize Indian phone numbers to 10 digits", () => {
      expect(normalizePhone("+91 98765 43210")).toBe("9876543210");
      expect(normalizePhone("09876543210")).toBe("9876543210");
      expect(normalizePhone("9876543210")).toBe("9876543210");
      expect(normalizePhone("abc-123")).toBeNull();
    });

    it("should normalize unit numbers to uppercase and trimmed", () => {
      expect(normalizeUnitNumber("  a-402  ")).toBe("A-402");
      expect(normalizeUnitNumber("b-201")).toBe("B-201");
      expect(normalizeUnitNumber("")).toBe("");
    });
  });

  describe("3. Local File Parser (CSV & XLSX)", () => {
    it("should reject empty file buffer", () => {
      expect(() =>
        parseSpreadsheetBuffer({ fileName: "test.csv", buffer: Buffer.from("") })
      ).toThrow("Uploaded file is empty");
    });

    it("should reject files exceeding 10MB limit", () => {
      const hugeBuffer = Buffer.alloc(MAX_IMPORT_FILE_SIZE_BYTES + 1024);
      expect(() =>
        parseSpreadsheetBuffer({ fileName: "huge.xlsx", buffer: hugeBuffer })
      ).toThrow("exceeds maximum permitted limit");
    });

    it("should reject unsupported file extensions", () => {
      const buffer = Buffer.from("dummy data");
      expect(() =>
        parseSpreadsheetBuffer({ fileName: "malicious.exe", buffer })
      ).toThrow("Unsupported file type: .exe");
    });

    it("should accurately parse valid CSV buffer into headers and rows", () => {
      const csvData = "Building,Wing,Flat No,Type,Area\nTower A,Wing 1,A-101,2_BHK,1050\nTower A,Wing 1,A-102,3_BHK,1400\n";
      const buffer = Buffer.from(csvData, "utf-8");

      const result = parseSpreadsheetBuffer({ fileName: "units.csv", buffer });
      expect(result.fileFormat).toBe("csv");
      expect(result.headers).toEqual(["Building", "Wing", "Flat No", "Type", "Area"]);
      expect(result.totalRows).toBe(2);
      expect(result.rows[0]["Flat No"]).toBe("A-101");
      expect(result.rows[1]["Type"]).toBe("3_BHK");
    });

    it("should accurately parse valid XLSX buffer into headers and rows", () => {
      const wsData = [
        ["Full Name", "Email", "Phone", "Role"],
        ["John Doe", "john@example.com", "9876543210", "RESIDENT"],
        ["Jane Smith", "jane@example.com", "9823456789", "OWNER"],
      ];
      const ws = XLSX.utils.aoa_to_sheet(wsData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
      const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer;

      const result = parseSpreadsheetBuffer({ fileName: "members.xlsx", buffer });
      expect(result.fileFormat).toBe("xlsx");
      expect(result.headers).toEqual(["Full Name", "Email", "Phone", "Role"]);
      expect(result.totalRows).toBe(2);
      expect(result.rows[0]["Full Name"]).toBe("John Doe");
      expect(result.rows[1]["Email"]).toBe("jane@example.com");
    });
  });

  describe("4. Fuzzy Column Detection", () => {
    it("should match common flat/unit aliases to canonical unit_number", () => {
      const headers = ["Bldg Name", "Wing", "Flat No", "Config", "Area Sqft"];
      const mappings = detectColumnMappings("UNITS_STRUCTURE", headers);

      const unitMapping = mappings.find((m) => m.canonicalField === "unit_number");
      expect(unitMapping).toBeDefined();
      expect(unitMapping?.spreadsheetColumn).toBe("Flat No");
      expect(unitMapping?.confidence).toBeGreaterThanOrEqual(0.7);

      const bldgMapping = mappings.find((m) => m.canonicalField === "building_name");
      expect(bldgMapping?.spreadsheetColumn).toBe("Bldg Name");
    });

    it("should match resident headers (Name, Mobile, Mail) to canonical fields", () => {
      const headers = ["Resident Name", "Contact Email", "Mobile Number", "Flat"];
      const mappings = detectColumnMappings("RESIDENTS_MEMBERS", headers);

      const nameMapping = mappings.find((m) => m.canonicalField === "full_name");
      expect(nameMapping?.spreadsheetColumn).toBe("Resident Name");

      const emailMapping = mappings.find((m) => m.canonicalField === "email");
      expect(emailMapping?.spreadsheetColumn).toBe("Contact Email");

      const phoneMapping = mappings.find((m) => m.canonicalField === "phone");
      expect(phoneMapping?.spreadsheetColumn).toBe("Mobile Number");
    });

    it("should leave unmatched columns as null with confidence 0", () => {
      const headers = ["RandomColA", "RandomColB"];
      const mappings = detectColumnMappings("UNITS_STRUCTURE", headers);

      const unitMapping = mappings.find((m) => m.canonicalField === "unit_number");
      expect(unitMapping?.spreadsheetColumn).toBeNull();
      expect(unitMapping?.confidence).toBe(0);
    });
  });

  describe("5. Validation Engine & Quota Enforcement", () => {
    const mockSocietyId = "soc-uuid-1234";

    it("should validate valid rows and identify creates vs database updates", async () => {
      const rows = [
        { "Bldg": "Tower A", "Flat": "A-101", "Type": "2_BHK" }, // Already exists in DB mock
        { "Bldg": "Tower A", "Flat": "A-103", "Type": "3_BHK" }, // New
      ];

      const columnMapping = {
        building_name: "Bldg",
        unit_number: "Flat",
        unit_type: "Type",
      };

      const result = await validateImportData({
        societyId: mockSocietyId,
        importType: "UNITS_STRUCTURE",
        rows,
        columnMapping,
      });

      expect(result.total_rows).toBe(2);
      expect(result.valid_rows).toBe(2);
      expect(result.invalid_rows).toBe(0);
      expect(result.updates_count).toBe(1); // A-101 is an existing unit in mock DB
      expect(result.creates_count).toBe(1); // A-103 is new
      expect(result.exceeds_quota).toBe(false);
    });

    it("should flag missing required fields with clear error messages", async () => {
      const rows = [
        { "Bldg": "", "Flat": "A-105" }, // Missing building_name
        { "Bldg": "Tower B", "Flat": "" }, // Missing unit_number
      ];

      const columnMapping = {
        building_name: "Bldg",
        unit_number: "Flat",
      };

      const result = await validateImportData({
        societyId: mockSocietyId,
        importType: "UNITS_STRUCTURE",
        rows,
        columnMapping,
      });

      expect(result.invalid_rows).toBe(2);
      expect(result.errors.length).toBeGreaterThanOrEqual(2);
      expect(result.errors.some((e) => e.error_code === "REQUIRED_FIELD_MISSING")).toBe(true);
    });

    it("should detect intra-file duplicate unit numbers", async () => {
      const rows = [
        { "Bldg": "Tower A", "Flat": "A-105" },
        { "Bldg": "Tower A", "Flat": "A-105" }, // Intra-file duplicate
      ];

      const columnMapping = {
        building_name: "Bldg",
        unit_number: "Flat",
      };

      const result = await validateImportData({
        societyId: mockSocietyId,
        importType: "UNITS_STRUCTURE",
        rows,
        columnMapping,
      });

      expect(result.errors.some((e) => e.error_code === "FILE_DUPLICATE_UNIT")).toBe(true);
      expect(result.invalid_rows).toBe(1);
    });

    it("should enforce subscription quota limits and flag exceeds_quota", async () => {
      // Mock usage is 28, limit is 30.
      // Importing 4 new units will project usage to 32 (> 30).
      const rows = [
        { "Bldg": "Tower A", "Flat": "A-201" },
        { "Bldg": "Tower A", "Flat": "A-202" },
        { "Bldg": "Tower A", "Flat": "A-203" },
        { "Bldg": "Tower A", "Flat": "A-204" },
      ];

      const columnMapping = {
        building_name: "Bldg",
        unit_number: "Flat",
      };

      const result = await validateImportData({
        societyId: mockSocietyId,
        importType: "UNITS_STRUCTURE",
        rows,
        columnMapping,
      });

      expect(result.creates_count).toBe(4);
      expect(result.current_usage).toBe(28);
      expect(result.projected_usage).toBe(32);
      expect(result.quota_limit).toBe(30);
      expect(result.exceeds_quota).toBe(true);
      expect(result.errors.some((e) => e.error_code === "SUBSCRIPTION_QUOTA_EXCEEDED")).toBe(true);
    });
  });

  describe("6. Template Generation", () => {
    it("should generate valid CSV templates for all 4 import types", () => {
      const types = ["UNITS_STRUCTURE", "RESIDENTS_MEMBERS", "OWNERSHIP_OCCUPANCY", "MASTER_SOCIETY_DATA"] as const;
      for (const t of types) {
        const csv = generateTemplateCsv(t);
        expect(csv).toBeDefined();
        expect(typeof csv).toBe("string");
        expect(csv.length).toBeGreaterThan(20);
        // Header verification
        const firstLine = csv.split("\n")[0];
        const schema = IMPORT_SCHEMAS[t];
        expect(firstLine).toContain(schema.fields[0].name);
      }
    });

    it("should generate valid XLSX binary templates for all 4 import types", () => {
      const types = ["UNITS_STRUCTURE", "RESIDENTS_MEMBERS", "OWNERSHIP_OCCUPANCY", "MASTER_SOCIETY_DATA"] as const;
      for (const t of types) {
        const xlsxBuf = generateTemplateXlsx(t);
        expect(xlsxBuf).toBeDefined();
        expect(Buffer.isBuffer(xlsxBuf)).toBe(true);
        expect(xlsxBuf.length).toBeGreaterThan(100);

        // Verify workbook can be parsed back
        const wb = XLSX.read(xlsxBuf, { type: "buffer" });
        expect(wb.SheetNames).toContain("Import Template");
      }
    });
  });
});

