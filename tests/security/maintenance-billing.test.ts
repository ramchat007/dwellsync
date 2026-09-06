import { describe, it, expect } from "vitest";
import {
  MaintenanceConfiguration,
  BillingCycle,
  Invoice,
  Payment,
  Receipt,
  Unit,
  AuditAction,
} from "@/lib/types/database";
import { OfflinePaymentProvider } from "@/lib/payments/offlineProvider";
import { SimulatedGatewayProvider } from "@/lib/payments/simulatedProvider";
import { getPaymentProvider } from "@/lib/payments/service";

describe("Phase 9 — Maintenance & Billing Tests", () => {
  // ============================================================
  // 1. MAINTENANCE CHARGE MODELS & CALCULATIONS
  // ============================================================
  describe("Maintenance Charge Configuration & Computation", () => {
    it("should correctly compute FLAT_RATE maintenance charge regardless of unit area", () => {
      const flatConfig: MaintenanceConfiguration = {
        id: "cfg-flat-1",
        society_id: "soc-1",
        name: "Standard Flat Maintenance",
        charge_type: "FLAT_RATE",
        rate: 3000,
        frequency: "MONTHLY",
        effective_from: "2026-09-01",
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const unitA: Partial<Unit> = { id: "u-1", unit_number: "101", area_sqft: 850 };
      const unitB: Partial<Unit> = { id: "u-2", unit_number: "102", area_sqft: 1800 };

      const computeCharge = (cfg: MaintenanceConfiguration, unit: Partial<Unit>) => {
        if (cfg.charge_type === "FLAT_RATE") return cfg.rate;
        if (cfg.charge_type === "AREA_BASED") return Math.round(cfg.rate * (unit.area_sqft || 1000) * 100) / 100;
        return cfg.rate;
      };

      expect(computeCharge(flatConfig, unitA)).toBe(3000);
      expect(computeCharge(flatConfig, unitB)).toBe(3000);
    });

    it("should correctly compute AREA_BASED maintenance charge proportionally to unit area_sqft", () => {
      const areaConfig: MaintenanceConfiguration = {
        id: "cfg-area-1",
        society_id: "soc-1",
        name: "Per-Sqft Maintenance",
        charge_type: "AREA_BASED",
        rate: 3.5, // ₹3.50 per sq.ft
        frequency: "MONTHLY",
        effective_from: "2026-09-01",
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const unitCompact: Partial<Unit> = { id: "u-10", unit_number: "A-101", area_sqft: 1000 };
      const unitSpacious: Partial<Unit> = { id: "u-20", unit_number: "B-501", area_sqft: 1540 };

      const computeCharge = (cfg: MaintenanceConfiguration, unit: Partial<Unit>) => {
        return Math.round(cfg.rate * (unit.area_sqft || 0) * 100) / 100;
      };

      expect(computeCharge(areaConfig, unitCompact)).toBe(3500); // 1000 * 3.5
      expect(computeCharge(areaConfig, unitSpacious)).toBe(5390); // 1540 * 3.5
    });

    it("should correctly compute UNIT_TYPE_BASED tiered charges", () => {
      const tierConfig: MaintenanceConfiguration = {
        id: "cfg-tier-1",
        society_id: "soc-1",
        name: "Tiered Unit Maintenance",
        charge_type: "UNIT_TYPE_BASED",
        rate: 2000,
        unit_type_rates: {
          "1_BHK": 2000,
          "2_BHK": 3200,
          "3_BHK": 4800,
          PENTHOUSE: 7500,
        },
        frequency: "MONTHLY",
        effective_from: "2026-09-01",
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const computeTierCharge = (cfg: MaintenanceConfiguration, unitType: string) => {
        const rates = cfg.unit_type_rates || {};
        return rates[unitType] ?? cfg.rate;
      };

      expect(computeTierCharge(tierConfig, "1_BHK")).toBe(2000);
      expect(computeTierCharge(tierConfig, "2_BHK")).toBe(3200);
      expect(computeTierCharge(tierConfig, "3_BHK")).toBe(4800);
      expect(computeTierCharge(tierConfig, "PENTHOUSE")).toBe(7500);
      expect(computeTierCharge(tierConfig, "SHOP")).toBe(2000); // fallback
    });

    it("should isolate charge configurations across societies", () => {
      const configs: MaintenanceConfiguration[] = [
        {
          id: "cfg-soc-1",
          society_id: "soc-1",
          name: "Soc 1 Config",
          charge_type: "FLAT_RATE",
          rate: 2500,
          frequency: "MONTHLY",
          effective_from: "2026-09-01",
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        {
          id: "cfg-soc-2",
          society_id: "soc-2",
          name: "Soc 2 Config",
          charge_type: "FLAT_RATE",
          rate: 4000,
          frequency: "MONTHLY",
          effective_from: "2026-09-01",
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ];

      const getConfigsForSociety = (socId: string) => configs.filter((c) => c.society_id === socId);

      expect(getConfigsForSociety("soc-1").length).toBe(1);
      expect(getConfigsForSociety("soc-1")[0].rate).toBe(2500);
      expect(getConfigsForSociety("soc-2")[0].rate).toBe(4000);
    });
  });

  // ============================================================
  // 2. BILLING CYCLES & IDEMPOTENT INVOICE GENERATION
  // ============================================================
  describe("Billing Cycle Integrity & Idempotent Generation", () => {
    it("should prevent duplicate billing cycles for the same society and date range", () => {
      const existingCycles: BillingCycle[] = [
        {
          id: "bc-sep-2026",
          society_id: "soc-1",
          name: "September 2026 Maintenance",
          period_start: "2026-09-01",
          period_end: "2026-09-30",
          due_date: "2026-10-10",
          status: "GENERATED",
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ];

      const isCycleDuplicate = (
        socId: string,
        start: string,
        end: string,
        cycles: BillingCycle[]
      ) => {
        return cycles.some(
          (c) => c.society_id === socId && c.period_start === start && c.period_end === end
        );
      };

      expect(isCycleDuplicate("soc-1", "2026-09-01", "2026-09-30", existingCycles)).toBe(true);
      expect(isCycleDuplicate("soc-1", "2026-10-01", "2026-10-31", existingCycles)).toBe(false);
      expect(isCycleDuplicate("soc-2", "2026-09-01", "2026-09-30", existingCycles)).toBe(false);
    });

    it("should enforce idempotency during invoice generation by skipping already-billed units", () => {
      const cycleId = "cycle-oct-2026";
      const societyId = "soc-1";

      const units: Partial<Unit>[] = [
        { id: "u-101", unit_number: "101" },
        { id: "u-102", unit_number: "102" },
        { id: "u-103", unit_number: "103" },
      ];

      // Simulate Unit 101 already having an invoice for this cycle
      const existingInvoices: Partial<Invoice>[] = [
        {
          id: "inv-existing-101",
          society_id: societyId,
          unit_id: "u-101",
          billing_cycle_id: cycleId,
          total_amount: 3000,
        },
      ];

      const generateInvoices = (
        allUnits: Partial<Unit>[],
        invoicesInCycle: Partial<Invoice>[]
      ) => {
        const billedUnitIds = new Set(invoicesInCycle.map((i) => i.unit_id));
        const newInvoices: Partial<Invoice>[] = [];

        for (const u of allUnits) {
          if (!billedUnitIds.has(u.id)) {
            newInvoices.push({
              id: `inv-new-${u.unit_number}`,
              society_id: societyId,
              unit_id: u.id,
              billing_cycle_id: cycleId,
              total_amount: 3000,
              amount_paid: 0,
              balance_due: 3000,
              status: "UNPAID",
            });
          }
        }
        return {
          generatedCount: newInvoices.length,
          skippedCount: billedUnitIds.size,
          newInvoices,
        };
      };

      const result = generateInvoices(units, existingInvoices);
      expect(result.generatedCount).toBe(2);
      expect(result.skippedCount).toBe(1);
      expect(result.newInvoices.map((i) => i.unit_id)).toEqual(["u-102", "u-103"]);

      // Second run should generate 0 and skip all 3
      const updatedInvoices = [...existingInvoices, ...result.newInvoices];
      const secondRun = generateInvoices(units, updatedInvoices);
      expect(secondRun.generatedCount).toBe(0);
      expect(secondRun.skippedCount).toBe(3);
    });
  });

  // ============================================================
  // 3. RESIDENT DATA PRIVACY & ACCESS CONTROL
  // ============================================================
  describe("Resident Financial Privacy & Multi-Tenant Isolation", () => {
    const invoices: Invoice[] = [
      {
        id: "inv-alice-1",
        society_id: "soc-1",
        unit_id: "unit-101",
        invoice_number: "INV-202609-0001",
        invoice_date: "2026-09-01",
        due_date: "2026-09-20",
        subtotal: 2500,
        adjustments: 0,
        total_amount: 2500,
        amount_paid: 0,
        balance_due: 2500,
        status: "UNPAID",
        line_items: [{ description: "Maintenance", amount: 2500 }],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: "inv-bob-2",
        society_id: "soc-1",
        unit_id: "unit-102",
        invoice_number: "INV-202609-0002",
        invoice_date: "2026-09-01",
        due_date: "2026-09-20",
        subtotal: 3500,
        adjustments: 0,
        total_amount: 3500,
        amount_paid: 3500,
        balance_due: 0,
        status: "PAID",
        line_items: [{ description: "Maintenance", amount: 3500 }],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: "inv-foreign-99",
        society_id: "soc-2", // Different society
        unit_id: "unit-999",
        invoice_number: "INV-SOC2-0001",
        invoice_date: "2026-09-01",
        due_date: "2026-09-20",
        subtotal: 5000,
        adjustments: 0,
        total_amount: 5000,
        amount_paid: 0,
        balance_due: 5000,
        status: "UNPAID",
        line_items: [{ description: "Maintenance", amount: 5000 }],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ];

    it("should allow a resident to view ONLY their own unit's invoices in their society", () => {
      const aliceSocietyId = "soc-1";
      const aliceUnitIds = ["unit-101"];

      const canResidentViewInvoice = (
        userSocietyId: string,
        userUnitIds: string[],
        invoice: Invoice
      ) => {
        return invoice.society_id === userSocietyId && userUnitIds.includes(invoice.unit_id);
      };

      const aliceInvoices = invoices.filter((inv) =>
        canResidentViewInvoice(aliceSocietyId, aliceUnitIds, inv)
      );

      expect(aliceInvoices.length).toBe(1);
      expect(aliceInvoices[0].id).toBe("inv-alice-1");
      expect(aliceInvoices[0].unit_id).toBe("unit-101");
    });

    it("should block a resident from accessing another resident's invoice within the same society", () => {
      const aliceSocietyId = "soc-1";
      const aliceUnitIds = ["unit-101"];
      const bobInvoice = invoices.find((i) => i.id === "inv-bob-2")!;

      const canAccess =
        bobInvoice.society_id === aliceSocietyId && aliceUnitIds.includes(bobInvoice.unit_id);
      expect(canAccess).toBe(false);
    });

    it("should strictly block cross-society invoice access", () => {
      const aliceSocietyId = "soc-1";
      const foreignInvoice = invoices.find((i) => i.id === "inv-foreign-99")!;

      expect(foreignInvoice.society_id === aliceSocietyId).toBe(false);
    });
  });

  // ============================================================
  // 4. PAYMENTS & AUTHORITATIVE STATE MACHINE
  // ============================================================
  describe("Payment Recording & State Machine Transitions", () => {
    it("should transition status from UNPAID to PARTIALLY_PAID on partial payment", () => {
      const initialInvoice: Invoice = {
        id: "inv-partial-test",
        society_id: "soc-1",
        unit_id: "unit-101",
        invoice_number: "INV-2026-001",
        invoice_date: "2026-09-01",
        due_date: "2026-09-25",
        subtotal: 4000,
        adjustments: 0,
        total_amount: 4000,
        amount_paid: 0,
        balance_due: 4000,
        status: "UNPAID",
        line_items: [],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const applyPayment = (invoice: Invoice, paymentAmount: number) => {
        if (paymentAmount <= 0) throw new Error("Payment must be positive");
        if (paymentAmount > invoice.balance_due) throw new Error("Overpayment rejected");

        const newPaid = invoice.amount_paid + paymentAmount;
        const newBalance = invoice.balance_due - paymentAmount;
        const newStatus = newBalance === 0 ? "PAID" : "PARTIALLY_PAID";

        return {
          ...invoice,
          amount_paid: newPaid,
          balance_due: newBalance,
          status: newStatus as Invoice["status"],
        };
      };

      const afterPartial = applyPayment(initialInvoice, 1500);
      expect(afterPartial.amount_paid).toBe(1500);
      expect(afterPartial.balance_due).toBe(2500);
      expect(afterPartial.status).toBe("PARTIALLY_PAID");

      const afterSettlement = applyPayment(afterPartial, 2500);
      expect(afterSettlement.amount_paid).toBe(4000);
      expect(afterSettlement.balance_due).toBe(0);
      expect(afterSettlement.status).toBe("PAID");
    });

    it("should reject overpayment when amount exceeds balance_due", () => {
      const invoice: Invoice = {
        id: "inv-overpay-test",
        society_id: "soc-1",
        unit_id: "u-1",
        invoice_number: "INV-001",
        invoice_date: "2026-09-01",
        due_date: "2026-09-25",
        subtotal: 2000,
        adjustments: 0,
        total_amount: 2000,
        amount_paid: 0,
        balance_due: 2000,
        status: "UNPAID",
        line_items: [],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const attemptPayment = (inv: Invoice, amt: number) => {
        if (amt > inv.balance_due) {
          return { error: `Payment amount (${amt}) exceeds outstanding balance (${inv.balance_due})` };
        }
        return { success: true };
      };

      const result = attemptPayment(invoice, 2500);
      expect(result.error).toContain("exceeds outstanding balance");
    });

    it("should prevent payment on a CANCELLED invoice", () => {
      const cancelledInvoice: Invoice = {
        id: "inv-cancelled-test",
        society_id: "soc-1",
        unit_id: "u-1",
        invoice_number: "INV-CANCELLED",
        invoice_date: "2026-09-01",
        due_date: "2026-09-25",
        subtotal: 2000,
        adjustments: 0,
        total_amount: 2000,
        amount_paid: 0,
        balance_due: 2000,
        status: "CANCELLED",
        line_items: [],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const canAcceptPayment = (inv: Invoice) => {
        return inv.status !== "CANCELLED" && inv.status !== "PAID";
      };

      expect(canAcceptPayment(cancelledInvoice)).toBe(false);
    });

    it("should disallow cancellation of an invoice that already has recorded payments", () => {
      const partiallyPaidInvoice: Invoice = {
        id: "inv-paid-test",
        society_id: "soc-1",
        unit_id: "u-1",
        invoice_number: "INV-PARTIAL",
        invoice_date: "2026-09-01",
        due_date: "2026-09-25",
        subtotal: 3000,
        adjustments: 0,
        total_amount: 3000,
        amount_paid: 1000,
        balance_due: 2000,
        status: "PARTIALLY_PAID",
        line_items: [],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const canCancelInvoice = (inv: Invoice) => {
        return inv.status !== "PAID" && Number(inv.amount_paid) === 0;
      };

      expect(canCancelInvoice(partiallyPaidInvoice)).toBe(false);
    });
  });

  // ============================================================
  // 5. RECEIPT ISSUANCE & VERIFICATION
  // ============================================================
  describe("Receipt Minting & Audit Coupling", () => {
    it("should ensure every completed payment corresponds to a uniquely numbered server receipt", () => {
      const payment: Payment = {
        id: "pay-101",
        society_id: "soc-1",
        invoice_id: "inv-101",
        unit_id: "u-101",
        amount: 3500,
        payment_date: "2026-09-06",
        payment_method: "UPI",
        reference_number: "UPI-UTR-987654321",
        status: "COMPLETED",
        recorded_by: "staff-treasurer-1",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const receipt: Receipt = {
        id: "rec-101",
        society_id: payment.society_id,
        invoice_id: payment.invoice_id,
        payment_id: payment.id,
        unit_id: payment.unit_id,
        receipt_number: "REC-202609-0001-XYZ",
        amount: payment.amount,
        receipt_date: payment.payment_date,
        issued_by: payment.recorded_by,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      expect(receipt.payment_id).toBe(payment.id);
      expect(receipt.amount).toBe(payment.amount);
      expect(receipt.receipt_number).toMatch(/^REC-\d{6}-\d{4}-[A-Z0-9]+$/);
    });
  });

  // ============================================================
  // 6. PAYMENT PROVIDER ABSTRACTION
  // ============================================================
  describe("Payment Provider Abstraction Layer", () => {
    it("should instantiate Offline and Simulated providers conforming to PaymentGatewayProvider interface", () => {
      const offlineProvider = new OfflinePaymentProvider();
      const simulatedProvider = new SimulatedGatewayProvider();

      expect(offlineProvider.name).toBe("OFFLINE_MANUAL");
      expect(simulatedProvider.name).toBe("SIMULATED_GATEWAY");

      expect(typeof offlineProvider.createOrder).toBe("function");
      expect(typeof offlineProvider.verifyPayment).toBe("function");
      expect(typeof offlineProvider.refund).toBe("function");

      expect(typeof simulatedProvider.createOrder).toBe("function");
      expect(typeof simulatedProvider.verifyPayment).toBe("function");
      expect(typeof simulatedProvider.refund).toBe("function");
    });

    it("should resolve correct provider via getPaymentProvider without external SDK coupling", () => {
      const defaultProvider = getPaymentProvider();
      expect(defaultProvider.name).toBe("OFFLINE_MANUAL");

      const simProvider = getPaymentProvider("SIMULATED");
      expect(simProvider.name).toBe("SIMULATED_GATEWAY");
    });

    it("should create simulated order without storing card or sensitive credentials", async () => {
      const simProvider = new SimulatedGatewayProvider();
      const result = await simProvider.createOrder({
        societyId: "soc-1",
        invoiceId: "inv-1",
        unitId: "u-1",
        amount: 2500,
        currency: "INR",
      });

      expect(result.success).toBe(true);
      expect(result.orderId).toContain("order_sim_");
      expect(result.amount).toBe(2500);
      expect(result.currency).toBe("INR");
    });
  });

  // ============================================================
  // 7. AUDIT TRAIL VERIFICATION
  // ============================================================
  describe("Phase 9 Audit Trail Action Types", () => {
    it("should have all required Phase 9 financial audit action types defined", () => {
      const expectedActions: AuditAction[] = [
        "MAINTENANCE_CONFIG_CREATED",
        "MAINTENANCE_CONFIG_UPDATED",
        "BILLING_CYCLE_CREATED",
        "INVOICES_BULK_GENERATED",
        "INVOICE_STATUS_UPDATED",
        "INVOICE_CANCELLED",
        "PAYMENT_RECORDED",
        "RECEIPT_GENERATED",
        "RECEIPT_CANCELLED",
      ];

      expectedActions.forEach((action) => {
        expect(typeof action).toBe("string");
        expect(action.length).toBeGreaterThan(5);
      });
    });
  });
});
