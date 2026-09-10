import { z } from "zod";

// ==========================================
// 1. UNIT CHARGE OVERRIDES
// ==========================================

export const UnitChargeOverrideTypeEnum = z.enum([
  "FIXED_OVERRIDE",
  "ADDITIONAL_SURCHARGE",
  "DISCOUNT_FIXED",
  "DISCOUNT_PERCENTAGE",
  "EXEMPTION",
]);

export const CreateUnitChargeOverrideSchema = z.object({
  unit_id: z.string().uuid("Valid unit ID required"),
  charge_config_id: z.string().uuid("Valid charge config ID").optional().nullable(),
  override_type: UnitChargeOverrideTypeEnum,
  amount: z.coerce.number().min(0, "Amount must be non-negative"),
  reason: z.string().min(3, "Reason must be at least 3 characters").max(500),
  effective_from: z.string().min(1, "Effective date is required"),
  effective_to: z.string().optional().nullable(),
  is_active: z.boolean().default(true),
});

export const UpdateUnitChargeOverrideSchema = CreateUnitChargeOverrideSchema.partial();

// ==========================================
// 2. CHART OF ACCOUNTS
// ==========================================

export const AccountTypeEnum = z.enum([
  "ASSET",
  "LIABILITY",
  "EQUITY",
  "INCOME",
  "EXPENSE",
]);

export const AccountCategoryEnum = z.enum([
  "CURRENT_ASSET",
  "FIXED_ASSET",
  "BANK",
  "CASH",
  "CURRENT_LIABILITY",
  "LONG_TERM_LIABILITY",
  "RESERVE_FUND",
  "OPERATING_INCOME",
  "OTHER_INCOME",
  "OPERATING_EXPENSE",
  "ADMINISTRATIVE_EXPENSE",
  "TAX_EXPENSE",
]);

export const CreateAccountSchema = z.object({
  account_code: z.string().min(2, "Account code must be at least 2 characters").max(20),
  account_name: z.string().min(3, "Account name must be at least 3 characters").max(100),
  account_type: AccountTypeEnum,
  category: AccountCategoryEnum,
  parent_account_id: z.string().uuid().optional().nullable(),
  description: z.string().max(500).optional().nullable(),
});

export const UpdateAccountSchema = CreateAccountSchema.partial().extend({
  is_active: z.boolean().optional(),
});

// ==========================================
// 3. FINANCIAL YEARS & PERIODS
// ==========================================

export const CreateFinancialYearSchema = z.object({
  name: z.string().min(3, "Financial year name required (e.g. FY 2025-26)").max(50),
  start_date: z.string().min(1, "Start date is required"),
  end_date: z.string().min(1, "End date is required"),
  is_current: z.boolean().default(true),
});

export const LockFinancialPeriodSchema = z.object({
  lock_reason: z.string().min(3, "A mandatory justification is required to lock a period").max(500),
});

// ==========================================
// 4. BANK ACCOUNTS & PETTY CASH
// ==========================================

export const BankAccountTypeEnum = z.enum([
  "SAVINGS",
  "CURRENT",
  "FIXED_DEPOSIT",
  "CASH_CREDIT",
  "PETTY_CASH",
]);

export const CreateBankAccountSchema = z.object({
  account_id: z.string().uuid("Associated Chart of Accounts ledger ID required"),
  bank_name: z.string().min(2, "Bank name required").max(100),
  account_number: z.string().min(3, "Account number required").max(50),
  account_type: BankAccountTypeEnum,
  branch_name: z.string().max(100).optional().nullable(),
  ifsc_code: z.string().max(20).optional().nullable(),
  opening_balance: z.coerce.number().default(0),
  is_primary: z.boolean().default(false),
});

export const UpdateBankAccountSchema = CreateBankAccountSchema.partial().extend({
  is_active: z.boolean().optional(),
});

// ==========================================
// 5. DOUBLE-ENTRY JOURNAL & ADJUSTMENT
// ==========================================

export const JournalEntryTypeEnum = z.enum([
  "STANDARD",
  "INVOICE_BILLING",
  "PAYMENT_RECEIPT",
  "VENDOR_EXPENSE",
  "BANK_TRANSFER",
  "ADJUSTMENT",
  "REVERSAL",
  "OPENING_BALANCE",
]);

export const CreateJournalLineSchema = z.object({
  account_id: z.string().uuid("Valid account ID required"),
  debit_amount: z.coerce.number().min(0).default(0),
  credit_amount: z.coerce.number().min(0).default(0),
  description: z.string().max(255).optional().nullable(),
  unit_id: z.string().uuid().optional().nullable(),
}).refine(
  (line) =>
    (line.debit_amount > 0 && line.credit_amount === 0) ||
    (line.credit_amount > 0 && line.debit_amount === 0),
  { message: "A journal line must have either a positive debit OR a positive credit, not both." }
);

export const CreateJournalEntrySchema = z.object({
  entry_date: z.string().min(1, "Entry date required"),
  entry_type: JournalEntryTypeEnum.default("STANDARD"),
  narration: z.string().min(3, "Narration required").max(500),
  is_backdated: z.boolean().default(false),
  backdated_reason: z.string().max(500).optional().nullable(),
  source_reference_type: z.string().optional().nullable(),
  source_reference_id: z.string().uuid().optional().nullable(),
  lines: z.array(CreateJournalLineSchema).min(2, "A double-entry voucher must contain at least 2 lines"),
}).refine(
  (entry) => {
    const totalDebit = entry.lines.reduce((sum, l) => sum + Number(l.debit_amount || 0), 0);
    const totalCredit = entry.lines.reduce((sum, l) => sum + Number(l.credit_amount || 0), 0);
    // Allow slight floating point tolerance within 0.01
    return Math.abs(totalDebit - totalCredit) < 0.01;
  },
  { message: "Double-entry violation: Total Debits must equal Total Credits." }
).refine(
  (entry) => {
    if (entry.is_backdated && (!entry.backdated_reason || entry.backdated_reason.trim().length < 3)) {
      return false;
    }
    return true;
  },
  { message: "A mandatory justification reason is required for back-dated journal entries." }
);

export const ReverseJournalEntrySchema = z.object({
  reason: z.string().min(3, "A mandatory reversal reason is required").max(500),
});

// ==========================================
// 6. EXPENSE VOUCHERS
// ==========================================

export const ExpensePaymentStatusEnum = z.enum(["UNPAID", "PAID", "CANCELLED"]);
export const ExpensePaymentModeEnum = z.enum(["CHEQUE", "BANK_TRANSFER", "UPI", "CASH", "CREDIT"]);

export const CreateExpenseVoucherSchema = z.object({
  voucher_date: z.string().min(1, "Voucher date is required"),
  vendor_name: z.string().min(2, "Vendor name required").max(100),
  vendor_id: z.string().uuid().optional().nullable(),
  expense_account_id: z.string().uuid("Expense account required"),
  paid_from_account_id: z.string().uuid().optional().nullable(),
  amount: z.coerce.number().positive("Expense amount must be greater than zero"),
  payment_status: ExpensePaymentStatusEnum.default("PAID"),
  payment_mode: ExpensePaymentModeEnum.default("BANK_TRANSFER"),
  reference_number: z.string().max(100).optional().nullable(),
  description: z.string().min(3, "Description required").max(500),
});

// ==========================================
// 7. BANK RECONCILIATION
// ==========================================

export const ExecuteBankReconciliationSchema = z.object({
  bank_account_id: z.string().uuid("Bank account ID required"),
  financial_period_id: z.string().uuid().optional().nullable(),
  statement_date: z.string().min(1, "Statement date is required"),
  statement_closing_balance: z.coerce.number(),
  matched_transaction_ids: z.array(z.string().uuid()).default([]),
  notes: z.string().max(500).optional().nullable(),
});

// ==========================================
// 8. FINANCIAL STATEMENTS & PUBLICATION
// ==========================================

export const FinancialReportTypeEnum = z.enum([
  "BALANCE_SHEET",
  "INCOME_EXPENDITURE",
  "TRIAL_BALANCE",
  "GENERAL_LEDGER",
  "RECEIVABLES_SUMMARY",
  "ANNUAL_AUDIT_REPORT",
]);

export const GenerateFinancialReportSchema = z.object({
  report_type: FinancialReportTypeEnum,
  financial_year_id: z.string().uuid().optional().nullable(),
  financial_period_id: z.string().uuid().optional().nullable(),
  as_of_date: z.string().optional(),
});

export const PublishFinancialReportSchema = z.object({
  notes: z.string().max(1000).optional(),
});

