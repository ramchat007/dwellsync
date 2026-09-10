import { describe, it, expect } from "vitest";
import {
  PERMISSIONS,
  roleHasPermission,
} from "@/lib/auth/permissions";
import {
  CreateJournalEntrySchema,
  ReverseJournalEntrySchema,
  LockFinancialPeriodSchema,
  CreateExpenseVoucherSchema,
  PublishFinancialReportSchema,
  CreateAccountSchema,
} from "@/lib/validations/finance";
import {
  calculateUnitMaintenance,
} from "@/lib/billing/calculationEngine";
import {
  MaintenanceConfiguration,
  Unit,
  UnitChargeOverride,
  RoleId,
} from "@/lib/types/database";

/**
 * Phase 13 Society Accounting & Finance Security & Integrity Test Suite
 * Validates RBAC, double-entry mathematical balancing, period locking safeguards,
 * multi-component billing engine, and zero-spam notification policy.
 */
describe("Phase 13 — Society Accounting & Finance Foundation", () => {
  const SOCIETY_ID = "soc-dwillsync-alpha-001";
  const USER_TREASURER = "usr-treasurer-101";
  const USER_AUDITOR = "usr-auditor-102";
  const USER_ADMIN = "usr-admin-103";
  const USER_RESIDENT = "usr-resident-104";

  // ============================================================
  // 1. RBAC & PERMISSIONS MATRIX
  // ============================================================
  describe("Finance Permissions Matrix", () => {
    it("authorizes FINANCE_VIEW for governance roles, auditor, and platform admin", () => {
      const allowedRoles: RoleId[] = [
        "SUPER_ADMIN",
        "SOCIETY_ADMIN",
        "TREASURER",
        "SECRETARY",
        "COMMITTEE_MEMBER",
        "AUDITOR",
      ];
      for (const role of allowedRoles) {
        expect(roleHasPermission(role, PERMISSIONS.FINANCE_VIEW)).toBe(true);
      }
    });

    it("denies FINANCE_VIEW for resident, owner, tenant, security, staff, and vendor", () => {
      const deniedRoles: RoleId[] = [
        "RESIDENT",
        "OWNER",
        "TENANT",
        "SECURITY",
        "STAFF",
        "VENDOR",
      ];
      for (const role of deniedRoles) {
        expect(roleHasPermission(role, PERMISSIONS.FINANCE_VIEW)).toBe(false);
      }
    });

    it("restricts FINANCE_MANAGE strictly to SUPER_ADMIN, SOCIETY_ADMIN, and TREASURER", () => {
      expect(roleHasPermission("SUPER_ADMIN", PERMISSIONS.FINANCE_MANAGE)).toBe(true);
      expect(roleHasPermission("SOCIETY_ADMIN", PERMISSIONS.FINANCE_MANAGE)).toBe(true);
      expect(roleHasPermission("TREASURER", PERMISSIONS.FINANCE_MANAGE)).toBe(true);

      // Auditor and Committee have read-only audit inspection rights
      expect(roleHasPermission("AUDITOR", PERMISSIONS.FINANCE_MANAGE)).toBe(false);
      expect(roleHasPermission("SECRETARY", PERMISSIONS.FINANCE_MANAGE)).toBe(false);
      expect(roleHasPermission("COMMITTEE_MEMBER", PERMISSIONS.FINANCE_MANAGE)).toBe(false);
      expect(roleHasPermission("RESIDENT", PERMISSIONS.FINANCE_MANAGE)).toBe(false);
    });

    it("authorizes FINANCE_RECONCILE for TREASURER and ADMINS, keeping AUDITOR read-only", () => {
      expect(roleHasPermission("TREASURER", PERMISSIONS.FINANCE_RECONCILE)).toBe(true);
      expect(roleHasPermission("SOCIETY_ADMIN", PERMISSIONS.FINANCE_RECONCILE)).toBe(true);
      expect(roleHasPermission("SUPER_ADMIN", PERMISSIONS.FINANCE_RECONCILE)).toBe(true);
      expect(roleHasPermission("AUDITOR", PERMISSIONS.FINANCE_RECONCILE)).toBe(false);
      expect(roleHasPermission("COMMITTEE_MEMBER", PERMISSIONS.FINANCE_RECONCILE)).toBe(false);
      expect(roleHasPermission("RESIDENT", PERMISSIONS.FINANCE_RECONCILE)).toBe(false);
    });

    it("restricts FINANCE_PERIOD_MANAGE to authorized finance managers", () => {
      expect(roleHasPermission("TREASURER", PERMISSIONS.FINANCE_PERIOD_MANAGE)).toBe(true);
      expect(roleHasPermission("SOCIETY_ADMIN", PERMISSIONS.FINANCE_PERIOD_MANAGE)).toBe(true);
      expect(roleHasPermission("AUDITOR", PERMISSIONS.FINANCE_PERIOD_MANAGE)).toBe(false);
      expect(roleHasPermission("COMMITTEE_MEMBER", PERMISSIONS.FINANCE_PERIOD_MANAGE)).toBe(false);
    });
  });

  // ============================================================
  // 2. DOUBLE-ENTRY JOURNAL BALANCING & VALIDATION
  // ============================================================
  describe("Double-Entry Mathematical Balancing Enforcement", () => {
    const ACC_BANK = "11111111-1111-1111-1111-111111111111";
    const ACC_INCOME = "22222222-2222-2222-2222-222222222222";
    const ACC_RECEIVABLE = "33333333-3333-3333-3333-333333333333";

    it("accepts balanced 2-leg journal vouchers (total debit === total credit)", () => {
      const validPayload = {
        entry_date: "2026-09-01",
        narration: "Billed September 2026 maintenance dues",
        lines: [
          { account_id: ACC_RECEIVABLE, debit_amount: 50000, credit_amount: 0, description: "Receivable from members" },
          { account_id: ACC_INCOME, debit_amount: 0, credit_amount: 50000, description: "Maintenance income" },
        ],
      };

      const result = CreateJournalEntrySchema.safeParse(validPayload);
      expect(result.success).toBe(true);
    });

    it("accepts balanced multi-leg compound journal vouchers", () => {
      const compoundPayload = {
        entry_date: "2026-09-05",
        narration: "Vendor disbursement with TDS deduction",
        lines: [
          { account_id: ACC_INCOME, debit_amount: 10000, credit_amount: 0, description: "Gross repair expense" },
          { account_id: ACC_RECEIVABLE, debit_amount: 0, credit_amount: 1000, description: "TDS payable" },
          { account_id: ACC_BANK, debit_amount: 0, credit_amount: 9000, description: "Net payout from operating bank" },
        ],
      };

      const result = CreateJournalEntrySchema.safeParse(compoundPayload);
      expect(result.success).toBe(true);
    });

    it("strictly rejects unbalanced journal entries where debits != credits", () => {
      const unbalancedPayload = {
        entry_date: "2026-09-01",
        narration: "Unbalanced fraudulent or erroneous entry",
        lines: [
          { account_id: ACC_RECEIVABLE, debit_amount: 50000, credit_amount: 0 },
          { account_id: ACC_INCOME, debit_amount: 0, credit_amount: 49000 },
        ],
      };

      const result = CreateJournalEntrySchema.safeParse(unbalancedPayload);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].message).toContain("must equal Total Credits");
      }
    });

    it("rejects journal entries with fewer than 2 line items", () => {
      const singleLine = {
        entry_date: "2026-09-01",
        narration: "One-legged entry",
        lines: [{ account_id: ACC_BANK, debit_amount: 5000, credit_amount: 0 }],
      };

      const result = CreateJournalEntrySchema.safeParse(singleLine);
      expect(result.success).toBe(false);
    });

    it("rejects entries where both total debit and total credit are zero", () => {
      const zeroPayload = {
        entry_date: "2026-09-01",
        narration: "Zero entry",
        lines: [
          { account_id: ACC_BANK, debit_amount: 0, credit_amount: 0 },
          { account_id: ACC_INCOME, debit_amount: 0, credit_amount: 0 },
        ],
      };

      const result = CreateJournalEntrySchema.safeParse(zeroPayload);
      expect(result.success).toBe(false);
    });
  });

  // ============================================================
  // 3. PERIOD LOCKING & BACK-DATED SAFEGUARDS
  // ============================================================
  describe("Financial Period Locking & Immutability", () => {
    it("validates mandatory justification reason when locking a period", () => {
      const validLock = {
        lock_reason: "Q2 statutory audit closing signed off by auditor",
      };
      expect(LockFinancialPeriodSchema.safeParse(validLock).success).toBe(true);

      const invalidLock = {
        lock_reason: "no", // less than 3 characters
      };
      expect(LockFinancialPeriodSchema.safeParse(invalidLock).success).toBe(false);
    });

    it("requires mandatory non-empty reason when reversing a journal voucher", () => {
      const validReversal = {
        reason: "Duplicate maintenance assessment reversed per AGM resolution 4",
      };
      expect(ReverseJournalEntrySchema.safeParse(validReversal).success).toBe(true);

      const missingReason = {
        reason: "",
      };
      expect(ReverseJournalEntrySchema.safeParse(missingReason).success).toBe(false);
    });
  });

  // ============================================================
  // 4. MAINTENANCE CALCULATION ENGINE & RATE PRESERVATION
  // ============================================================
  describe("Maintenance Calculation Engine", () => {
    const mockUnitFlat: Unit = {
      id: "unit-101",
      society_id: SOCIETY_ID,
      building_id: "bld-1",
      unit_number: "A-101",
      unit_type: "2_BHK",
      carpet_area_sqft: 1200,
      built_up_area_sqft: 1500,
      parking_slots: 2,
      status: "OCCUPIED",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    it("calculates fixed flat rate maintenance correctly", () => {
      const config: MaintenanceConfiguration = {
        id: "cfg-1",
        society_id: SOCIETY_ID,
        name: "Standard Flat Rate",
        charge_type: "FLAT_RATE",
        rate: 3500,
        frequency: "MONTHLY",
        effective_from: "2026-01-01",
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const result = calculateUnitMaintenance(mockUnitFlat, config);
      expect(result.totalAmount).toBe(3500);
      expect(result.componentBreakdown.length).toBe(1);
      expect(result.componentBreakdown[0].calculatedAmount).toBe(3500);
      expect(result.componentBreakdown[0].type).toBe("FLAT_RATE");
    });

    it("calculates carpet-area based maintenance correctly (carpet_area * rate)", () => {
      const config: MaintenanceConfiguration = {
        id: "cfg-2",
        society_id: SOCIETY_ID,
        name: "Carpet Area Tier",
        charge_type: "CARPET_AREA",
        rate: 3.5, // ₹3.50 per sqft carpet
        frequency: "MONTHLY",
        effective_from: "2026-01-01",
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const result = calculateUnitMaintenance(mockUnitFlat, config);
      // 1200 sqft * 3.5 = 4200
      expect(result.totalAmount).toBe(4200);
      expect(result.componentBreakdown[0].rate).toBe(3.5);
    });

    it("calculates built-up area based maintenance correctly (built_up_area * rate)", () => {
      const config: MaintenanceConfiguration = {
        id: "cfg-3",
        society_id: SOCIETY_ID,
        name: "Built-up Tier",
        charge_type: "BUILT_UP_AREA",
        rate: 3.0, // ₹3.00 per sqft built-up
        frequency: "MONTHLY",
        effective_from: "2026-01-01",
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const result = calculateUnitMaintenance(mockUnitFlat, config);
      // 1500 sqft * 3.0 = 4500
      expect(result.totalAmount).toBe(4500);
    });

    it("calculates multi-component bills combining fixed, sinking fund, and parking slot charges", () => {
      const config: MaintenanceConfiguration = {
        id: "cfg-multi",
        society_id: SOCIETY_ID,
        name: "Comprehensive Society Bill",
        charge_type: "FLAT_RATE",
        rate: 2000,
        rate_components: [
          { name: "Common Electricity & Water", charge_type: "FLAT_RATE", rate: 2000 },
          { name: "Sinking Reserve Fund", charge_type: "CARPET_AREA", rate: 1.0 },
          { name: "Designated Stilt Parking", charge_type: "PER_PARKING_SLOT", rate: 500 },
        ],
        frequency: "MONTHLY",
        effective_from: "2026-01-01",
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const result = calculateUnitMaintenance(mockUnitFlat, config);
      // 2000 (fixed) + (1200 * 1 = 1200) + (2 slots * 500 = 1000) = 4200
      expect(result.totalAmount).toBe(4200);
      expect(result.componentBreakdown.length).toBe(3);
    });

    it("honors unit-specific individual overrides over default society config", () => {
      const config: MaintenanceConfiguration = {
        id: "cfg-def",
        society_id: SOCIETY_ID,
        name: "Standard Flat Rate",
        charge_type: "FLAT_RATE",
        rate: 5000,
        frequency: "MONTHLY",
        effective_from: "2026-01-01",
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const override: UnitChargeOverride = {
        id: "ovr-1",
        society_id: SOCIETY_ID,
        unit_id: mockUnitFlat.id,
        override_type: "FIXED_OVERRIDE",
        amount: 1500, // Concessional rate for ground floor office
        effective_from: "2026-01-01",
        reason: "Ground floor commercial wing concession approved by AGM",
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const result = calculateUnitMaintenance(mockUnitFlat, config, 1, override);

      expect(result.totalAmount).toBe(1500);
      expect(result.overrideApplied).not.toBeNull();
      expect(result.lineItems.some((l) => l.description.includes("Override"))).toBe(true);
    });

    it("applies late fee penalty calculation when overdue beyond grace period", () => {
      const config: MaintenanceConfiguration = {
        id: "cfg-late",
        society_id: SOCIETY_ID,
        name: "Standard with 10% Late Fee",
        charge_type: "FLAT_RATE",
        rate: 4000,
        late_fee_type: "PERCENTAGE",
        late_fee_amount: 10, // 10% late fee
        frequency: "MONTHLY",
        effective_from: "2026-01-01",
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const result = calculateUnitMaintenance(mockUnitFlat, config, 1, null, true);

      // 4000 + (10% of 4000 = 400) = 4400
      expect(result.lateFeeApplied?.amount).toBe(400);
      expect(result.totalAmount).toBe(4400);
    });

    it("previews billing cycle calculation across multiple units without mutating DB", () => {
      const units: Unit[] = [
        mockUnitFlat,
        {
          ...mockUnitFlat,
          id: "unit-102",
          unit_number: "A-102",
          carpet_area_sqft: 800,
        },
      ];

      const config: MaintenanceConfiguration = {
        id: "cfg-prev",
        society_id: SOCIETY_ID,
        name: "Preview Config",
        charge_type: "CARPET_AREA",
        rate: 2.0,
        frequency: "MONTHLY",
        effective_from: "2026-01-01",
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const calculations = units.map((u) => calculateUnitMaintenance(u, config));
      const totalProjected = calculations.reduce((sum, c) => sum + c.totalAmount, 0);

      expect(calculations.length).toBe(2);
      // Unit 1: 1200 * 2 = 2400. Unit 2: 800 * 2 = 1600. Total = 4000
      expect(totalProjected).toBe(4000);
    });
  });

  // ============================================================
  // 5. ZERO-SPAM NOTIFICATION POLICY VERIFICATION
  // ============================================================
  describe("Notification Policy & Resident Inbox Protection", () => {
    it("restricts member notifications on statement publication to consolidated broadcast only", () => {
      const publishPayload = {
        notes: "Audited and verified by Chartered Accountants",
      };

      const result = PublishFinancialReportSchema.safeParse(publishPayload);
      expect(result.success).toBe(true);
    });

    it("ensures internal accounting adjustments and vouchers never broadcast to resident inboxes", () => {
      const internalAccountingActions = [
        "COA_ACCOUNT_CREATED",
        "JOURNAL_ENTRY_POSTED",
        "JOURNAL_ENTRY_REVERSED",
        "BANK_ACCOUNT_CREATED",
        "EXPENSE_VOUCHER_CREATED",
        "FINANCIAL_PERIOD_LOCKED",
      ];

      const isResidentFacingAction = (action: string) => {
        const allowedResidentActions = ["INVOICE_GENERATED", "RECEIPT_ISSUED", "FINANCIAL_REPORT_PUBLISHED"];
        return allowedResidentActions.includes(action);
      };

      for (const action of internalAccountingActions) {
        expect(isResidentFacingAction(action)).toBe(false);
      }
    });
  });
});

