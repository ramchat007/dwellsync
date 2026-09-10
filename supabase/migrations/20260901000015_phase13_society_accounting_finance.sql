-- DwellSync Phase 13 Migration: Society Accounting & Finance Foundation
-- Introduces Chart of Accounts, Double-Entry General Ledger, Financial Years & Periods,
-- Bank Accounts, Petty Cash, Reconciliations, Expense Vouchers, Financial Reports,
-- Unit Charge Overrides, and enhanced Maintenance Configuration components with strict RLS.

-- ============================================================================
-- 1. ENHANCE MAINTENANCE CONFIGURATIONS TABLE
-- ============================================================================

-- Expand charge_type CHECK constraint to support new area, slot, occupant, and multi-component rules
DO $$
BEGIN
  ALTER TABLE public.maintenance_configurations
    DROP CONSTRAINT IF EXISTS maintenance_configurations_charge_type_check;

  ALTER TABLE public.maintenance_configurations
    ADD CONSTRAINT maintenance_configurations_charge_type_check
    CHECK (charge_type IN (
      'FLAT_RATE',
      'CARPET_AREA',
      'BUILT_UP_AREA',
      'PER_UNIT',
      'PER_PARKING_SLOT',
      'PER_OCCUPANT',
      'PERCENTAGE',
      'USAGE_BASED',
      'CUSTOM',
      'AREA_BASED',
      'UNIT_TYPE_BASED'
    ));
END $$;

ALTER TABLE public.maintenance_configurations
  ADD COLUMN IF NOT EXISTS rate_components JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS late_fee_type TEXT DEFAULT 'NONE' CHECK (late_fee_type IN ('NONE', 'FLAT', 'PERCENTAGE')),
  ADD COLUMN IF NOT EXISTS late_fee_amount NUMERIC(12, 2) DEFAULT 0.00 CHECK (late_fee_amount >= 0),
  ADD COLUMN IF NOT EXISTS grace_period_days INTEGER DEFAULT 15 CHECK (grace_period_days >= 0),
  ADD COLUMN IF NOT EXISTS version INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS parent_config_id UUID REFERENCES public.maintenance_configurations(id) ON DELETE SET NULL;

-- ============================================================================
-- 2. UNIT CHARGE OVERRIDES TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.unit_charge_overrides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  society_id UUID NOT NULL REFERENCES public.societies(id) ON DELETE CASCADE,
  unit_id UUID NOT NULL REFERENCES public.units(id) ON DELETE CASCADE,
  charge_config_id UUID REFERENCES public.maintenance_configurations(id) ON DELETE CASCADE,
  override_type TEXT NOT NULL CHECK (
    override_type IN ('FIXED_OVERRIDE', 'ADDITIONAL_SURCHARGE', 'DISCOUNT_FIXED', 'DISCOUNT_PERCENTAGE', 'EXEMPTION')
  ),
  amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00 CHECK (amount >= 0),
  reason TEXT NOT NULL,
  effective_from DATE NOT NULL DEFAULT CURRENT_DATE,
  effective_to DATE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_unit_overrides_society ON public.unit_charge_overrides(society_id);
CREATE INDEX IF NOT EXISTS idx_unit_overrides_unit ON public.unit_charge_overrides(unit_id);
CREATE INDEX IF NOT EXISTS idx_unit_overrides_active ON public.unit_charge_overrides(society_id, is_active);

-- ============================================================================
-- 3. FINANCIAL YEARS & PERIODS
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.financial_years (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  society_id UUID NOT NULL REFERENCES public.societies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  is_current BOOLEAN NOT NULL DEFAULT false,
  is_closed BOOLEAN NOT NULL DEFAULT false,
  closed_at TIMESTAMPTZ,
  closed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_financial_year_dates UNIQUE (society_id, start_date, end_date),
  CONSTRAINT chk_fy_dates CHECK (end_date > start_date)
);

CREATE INDEX IF NOT EXISTS idx_financial_years_society ON public.financial_years(society_id);
CREATE INDEX IF NOT EXISTS idx_financial_years_current ON public.financial_years(society_id, is_current);

CREATE TABLE IF NOT EXISTS public.financial_periods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  society_id UUID NOT NULL REFERENCES public.societies(id) ON DELETE CASCADE,
  financial_year_id UUID NOT NULL REFERENCES public.financial_years(id) ON DELETE CASCADE,
  period_number INTEGER NOT NULL CHECK (period_number BETWEEN 1 AND 12),
  name TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'LOCKED', 'CLOSED')),
  locked_at TIMESTAMPTZ,
  locked_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  lock_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_financial_period UNIQUE (society_id, financial_year_id, period_number),
  CONSTRAINT chk_period_dates CHECK (end_date >= start_date)
);

CREATE INDEX IF NOT EXISTS idx_financial_periods_society ON public.financial_periods(society_id);
CREATE INDEX IF NOT EXISTS idx_financial_periods_year ON public.financial_periods(financial_year_id);
CREATE INDEX IF NOT EXISTS idx_financial_periods_status ON public.financial_periods(society_id, status);

-- ============================================================================
-- 4. CHART OF ACCOUNTS (COA)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.chart_of_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  society_id UUID NOT NULL REFERENCES public.societies(id) ON DELETE CASCADE,
  account_code TEXT NOT NULL,
  account_name TEXT NOT NULL,
  account_type TEXT NOT NULL CHECK (account_type IN ('ASSET', 'LIABILITY', 'EQUITY', 'INCOME', 'EXPENSE')),
  category TEXT NOT NULL CHECK (
    category IN (
      'CURRENT_ASSET',
      'FIXED_ASSET',
      'BANK',
      'CASH',
      'CURRENT_LIABILITY',
      'LONG_TERM_LIABILITY',
      'RESERVE_FUND',
      'OPERATING_INCOME',
      'OTHER_INCOME',
      'OPERATING_EXPENSE',
      'ADMINISTRATIVE_EXPENSE',
      'TAX_EXPENSE'
    )
  ),
  parent_account_id UUID REFERENCES public.chart_of_accounts(id) ON DELETE RESTRICT,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_system BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_chart_of_accounts_code UNIQUE (society_id, account_code)
);

CREATE INDEX IF NOT EXISTS idx_coa_society ON public.chart_of_accounts(society_id);
CREATE INDEX IF NOT EXISTS idx_coa_society_type ON public.chart_of_accounts(society_id, account_type);
CREATE INDEX IF NOT EXISTS idx_coa_category ON public.chart_of_accounts(society_id, category);

-- ============================================================================
-- 5. SOCIETY BANK ACCOUNTS & PETTY CASH
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.society_bank_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  society_id UUID NOT NULL REFERENCES public.societies(id) ON DELETE CASCADE,
  account_id UUID NOT NULL REFERENCES public.chart_of_accounts(id) ON DELETE RESTRICT,
  bank_name TEXT NOT NULL,
  account_number TEXT NOT NULL,
  account_type TEXT NOT NULL CHECK (account_type IN ('SAVINGS', 'CURRENT', 'FIXED_DEPOSIT', 'CASH_CREDIT', 'PETTY_CASH')),
  branch_name TEXT,
  ifsc_code TEXT,
  opening_balance NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
  current_balance NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
  is_primary BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_bank_account_number UNIQUE (society_id, account_number)
);

CREATE INDEX IF NOT EXISTS idx_bank_accounts_society ON public.society_bank_accounts(society_id);
CREATE INDEX IF NOT EXISTS idx_bank_accounts_active ON public.society_bank_accounts(society_id, is_active);

-- Opening balances per financial year
CREATE TABLE IF NOT EXISTS public.account_opening_balances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  society_id UUID NOT NULL REFERENCES public.societies(id) ON DELETE CASCADE,
  financial_year_id UUID NOT NULL REFERENCES public.financial_years(id) ON DELETE CASCADE,
  account_id UUID NOT NULL REFERENCES public.chart_of_accounts(id) ON DELETE RESTRICT,
  debit_balance NUMERIC(14, 2) NOT NULL DEFAULT 0.00 CHECK (debit_balance >= 0),
  credit_balance NUMERIC(14, 2) NOT NULL DEFAULT 0.00 CHECK (credit_balance >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_account_opening_balance UNIQUE (society_id, financial_year_id, account_id)
);

CREATE INDEX IF NOT EXISTS idx_opening_balances_society_fy ON public.account_opening_balances(society_id, financial_year_id);

-- ============================================================================
-- 6. DOUBLE-ENTRY JOURNAL & GENERAL LEDGER
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.journal_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  society_id UUID NOT NULL REFERENCES public.societies(id) ON DELETE CASCADE,
  financial_year_id UUID REFERENCES public.financial_years(id) ON DELETE SET NULL,
  financial_period_id UUID REFERENCES public.financial_periods(id) ON DELETE SET NULL,
  entry_number TEXT NOT NULL,
  entry_date DATE NOT NULL DEFAULT CURRENT_DATE,
  entry_type TEXT NOT NULL CHECK (
    entry_type IN (
      'STANDARD',
      'INVOICE_BILLING',
      'PAYMENT_RECEIPT',
      'VENDOR_EXPENSE',
      'BANK_TRANSFER',
      'ADJUSTMENT',
      'REVERSAL',
      'OPENING_BALANCE'
    )
  ),
  narration TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'POSTED' CHECK (status IN ('DRAFT', 'POSTED', 'REVERSED', 'VOID')),
  is_backdated BOOLEAN NOT NULL DEFAULT false,
  backdated_reason TEXT,
  reversal_of_id UUID REFERENCES public.journal_entries(id) ON DELETE SET NULL,
  source_reference_type TEXT,
  source_reference_id UUID,
  total_debit NUMERIC(14, 2) NOT NULL CHECK (total_debit >= 0),
  total_credit NUMERIC(14, 2) NOT NULL CHECK (total_credit >= 0),
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  approved_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_journal_entry_number UNIQUE (society_id, entry_number),
  CONSTRAINT chk_journal_balanced CHECK (total_debit = total_credit)
);

CREATE INDEX IF NOT EXISTS idx_journal_entries_society ON public.journal_entries(society_id);
CREATE INDEX IF NOT EXISTS idx_journal_entries_date ON public.journal_entries(society_id, entry_date DESC);
CREATE INDEX IF NOT EXISTS idx_journal_entries_period ON public.journal_entries(financial_period_id);
CREATE INDEX IF NOT EXISTS idx_journal_entries_source ON public.journal_entries(source_reference_type, source_reference_id);

CREATE TABLE IF NOT EXISTS public.journal_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  society_id UUID NOT NULL REFERENCES public.societies(id) ON DELETE CASCADE,
  journal_entry_id UUID NOT NULL REFERENCES public.journal_entries(id) ON DELETE CASCADE,
  account_id UUID NOT NULL REFERENCES public.chart_of_accounts(id) ON DELETE RESTRICT,
  line_number INTEGER NOT NULL DEFAULT 1,
  debit_amount NUMERIC(14, 2) NOT NULL DEFAULT 0.00 CHECK (debit_amount >= 0),
  credit_amount NUMERIC(14, 2) NOT NULL DEFAULT 0.00 CHECK (credit_amount >= 0),
  description TEXT,
  unit_id UUID REFERENCES public.units(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_debit_or_credit CHECK (
    (debit_amount > 0 AND credit_amount = 0) OR
    (credit_amount > 0 AND debit_amount = 0)
  )
);

CREATE INDEX IF NOT EXISTS idx_journal_lines_entry ON public.journal_lines(journal_entry_id);
CREATE INDEX IF NOT EXISTS idx_journal_lines_account ON public.journal_lines(account_id);
CREATE INDEX IF NOT EXISTS idx_journal_lines_society_account ON public.journal_lines(society_id, account_id);
CREATE INDEX IF NOT EXISTS idx_journal_lines_unit ON public.journal_lines(unit_id);

-- ============================================================================
-- 7. EXPENSE VOUCHERS & VENDOR PAYABLES
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.expense_vouchers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  society_id UUID NOT NULL REFERENCES public.societies(id) ON DELETE CASCADE,
  voucher_number TEXT NOT NULL,
  voucher_date DATE NOT NULL DEFAULT CURRENT_DATE,
  vendor_name TEXT NOT NULL,
  vendor_id UUID,
  expense_account_id UUID NOT NULL REFERENCES public.chart_of_accounts(id) ON DELETE RESTRICT,
  paid_from_account_id UUID REFERENCES public.chart_of_accounts(id) ON DELETE RESTRICT,
  amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
  payment_status TEXT NOT NULL DEFAULT 'PAID' CHECK (payment_status IN ('UNPAID', 'PAID', 'CANCELLED')),
  payment_mode TEXT CHECK (payment_mode IN ('CHEQUE', 'BANK_TRANSFER', 'UPI', 'CASH', 'CREDIT')),
  reference_number TEXT,
  description TEXT NOT NULL,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  approved_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_expense_voucher_num UNIQUE (society_id, voucher_number)
);

CREATE INDEX IF NOT EXISTS idx_expense_vouchers_society ON public.expense_vouchers(society_id);
CREATE INDEX IF NOT EXISTS idx_expense_vouchers_date ON public.expense_vouchers(society_id, voucher_date DESC);
CREATE INDEX IF NOT EXISTS idx_expense_vouchers_status ON public.expense_vouchers(society_id, payment_status);

-- ============================================================================
-- 8. BANK RECONCILIATION FOUNDATION
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.bank_reconciliations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  society_id UUID NOT NULL REFERENCES public.societies(id) ON DELETE CASCADE,
  bank_account_id UUID NOT NULL REFERENCES public.society_bank_accounts(id) ON DELETE CASCADE,
  financial_period_id UUID REFERENCES public.financial_periods(id) ON DELETE SET NULL,
  statement_date DATE NOT NULL,
  statement_closing_balance NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
  ledger_closing_balance NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
  difference NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
  status TEXT NOT NULL DEFAULT 'IN_PROGRESS' CHECK (status IN ('IN_PROGRESS', 'RECONCILED', 'LOCKED')),
  reconciled_at TIMESTAMPTZ,
  reconciled_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_bank_recon_society ON public.bank_reconciliations(society_id);
CREATE INDEX IF NOT EXISTS idx_bank_recon_bank_period ON public.bank_reconciliations(bank_account_id, financial_period_id);

CREATE TABLE IF NOT EXISTS public.bank_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  society_id UUID NOT NULL REFERENCES public.societies(id) ON DELETE CASCADE,
  bank_account_id UUID NOT NULL REFERENCES public.society_bank_accounts(id) ON DELETE CASCADE,
  reconciliation_id UUID REFERENCES public.bank_reconciliations(id) ON DELETE SET NULL,
  transaction_date DATE NOT NULL,
  description TEXT NOT NULL,
  reference_number TEXT,
  withdrawal NUMERIC(14, 2) NOT NULL DEFAULT 0.00 CHECK (withdrawal >= 0),
  deposit NUMERIC(14, 2) NOT NULL DEFAULT 0.00 CHECK (deposit >= 0),
  balance NUMERIC(14, 2),
  is_reconciled BOOLEAN NOT NULL DEFAULT false,
  matched_journal_line_id UUID REFERENCES public.journal_lines(id) ON DELETE SET NULL,
  reconciled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_bank_tx_bank ON public.bank_transactions(bank_account_id);
CREATE INDEX IF NOT EXISTS idx_bank_tx_recon ON public.bank_transactions(reconciliation_id);

-- ============================================================================
-- 9. FINANCIAL STATEMENTS & AUDITED REPORTS
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.financial_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  society_id UUID NOT NULL REFERENCES public.societies(id) ON DELETE CASCADE,
  financial_year_id UUID REFERENCES public.financial_years(id) ON DELETE SET NULL,
  financial_period_id UUID REFERENCES public.financial_periods(id) ON DELETE SET NULL,
  report_type TEXT NOT NULL CHECK (
    report_type IN (
      'BALANCE_SHEET',
      'INCOME_EXPENDITURE',
      'TRIAL_BALANCE',
      'GENERAL_LEDGER',
      'RECEIVABLES_SUMMARY',
      'ANNUAL_AUDIT_REPORT'
    )
  ),
  title TEXT NOT NULL,
  report_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'AUDITED', 'APPROVED', 'PUBLISHED')),
  generated_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  approved_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  approved_at TIMESTAMPTZ,
  published_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  published_at TIMESTAMPTZ,
  published_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_financial_reports_society ON public.financial_reports(society_id);
CREATE INDEX IF NOT EXISTS idx_financial_reports_status ON public.financial_reports(society_id, status);

-- ============================================================================
-- 10. ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

ALTER TABLE public.unit_charge_overrides ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financial_years ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financial_periods ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chart_of_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.society_bank_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.account_opening_balances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.journal_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.journal_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expense_vouchers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bank_reconciliations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bank_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financial_reports ENABLE ROW LEVEL SECURITY;

-- Helper check macro for active society member
-- Super Admins pass through automatically

-- 10.1 Unit Charge Overrides: Members can view, Admins/Treasurers can manage
CREATE POLICY "Members view overrides" ON public.unit_charge_overrides
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.society_memberships sm
      WHERE sm.society_id = unit_charge_overrides.society_id
        AND sm.user_id = auth.uid()
        AND sm.status = 'ACTIVE'
    )
  );

CREATE POLICY "Treasurers and Admins manage overrides" ON public.unit_charge_overrides
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.society_memberships sm
      WHERE sm.society_id = unit_charge_overrides.society_id
        AND sm.user_id = auth.uid()
        AND sm.status = 'ACTIVE'
        AND sm.role_id IN ('SOCIETY_ADMIN', 'TREASURER')
    )
  );

-- 10.2 Financial Years & Periods
CREATE POLICY "Members view financial years" ON public.financial_years
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.society_memberships sm
      WHERE sm.society_id = financial_years.society_id
        AND sm.user_id = auth.uid()
        AND sm.status = 'ACTIVE'
    )
  );

CREATE POLICY "Admins and Treasurers manage financial years" ON public.financial_years
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.society_memberships sm
      WHERE sm.society_id = financial_years.society_id
        AND sm.user_id = auth.uid()
        AND sm.status = 'ACTIVE'
        AND sm.role_id IN ('SOCIETY_ADMIN', 'TREASURER', 'SECRETARY')
    )
  );

CREATE POLICY "Members view financial periods" ON public.financial_periods
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.society_memberships sm
      WHERE sm.society_id = financial_periods.society_id
        AND sm.user_id = auth.uid()
        AND sm.status = 'ACTIVE'
    )
  );

CREATE POLICY "Admins and Treasurers manage financial periods" ON public.financial_periods
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.society_memberships sm
      WHERE sm.society_id = financial_periods.society_id
        AND sm.user_id = auth.uid()
        AND sm.status = 'ACTIVE'
        AND sm.role_id IN ('SOCIETY_ADMIN', 'TREASURER', 'SECRETARY')
    )
  );

-- 10.3 Chart of Accounts
CREATE POLICY "Members view chart of accounts" ON public.chart_of_accounts
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.society_memberships sm
      WHERE sm.society_id = chart_of_accounts.society_id
        AND sm.user_id = auth.uid()
        AND sm.status = 'ACTIVE'
    )
  );

CREATE POLICY "Admins and Treasurers manage chart of accounts" ON public.chart_of_accounts
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.society_memberships sm
      WHERE sm.society_id = chart_of_accounts.society_id
        AND sm.user_id = auth.uid()
        AND sm.status = 'ACTIVE'
        AND sm.role_id IN ('SOCIETY_ADMIN', 'TREASURER')
    )
  );

-- 10.4 Society Bank Accounts
CREATE POLICY "Authorized roles view bank accounts" ON public.society_bank_accounts
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.society_memberships sm
      WHERE sm.society_id = society_bank_accounts.society_id
        AND sm.user_id = auth.uid()
        AND sm.status = 'ACTIVE'
        AND sm.role_id IN ('SOCIETY_ADMIN', 'TREASURER', 'SECRETARY', 'COMMITTEE_MEMBER', 'AUDITOR')
    )
  );

CREATE POLICY "Treasurers and Admins manage bank accounts" ON public.society_bank_accounts
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.society_memberships sm
      WHERE sm.society_id = society_bank_accounts.society_id
        AND sm.user_id = auth.uid()
        AND sm.status = 'ACTIVE'
        AND sm.role_id IN ('SOCIETY_ADMIN', 'TREASURER')
    )
  );

-- 10.5 Journal Entries & Lines
CREATE POLICY "Authorized roles view journal entries" ON public.journal_entries
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.society_memberships sm
      WHERE sm.society_id = journal_entries.society_id
        AND sm.user_id = auth.uid()
        AND sm.status = 'ACTIVE'
        AND sm.role_id IN ('SOCIETY_ADMIN', 'TREASURER', 'SECRETARY', 'COMMITTEE_MEMBER', 'AUDITOR')
    )
  );

CREATE POLICY "Treasurers and Admins manage journal entries" ON public.journal_entries
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.society_memberships sm
      WHERE sm.society_id = journal_entries.society_id
        AND sm.user_id = auth.uid()
        AND sm.status = 'ACTIVE'
        AND sm.role_id IN ('SOCIETY_ADMIN', 'TREASURER')
    )
  );

CREATE POLICY "Authorized roles view journal lines" ON public.journal_lines
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.society_memberships sm
      WHERE sm.society_id = journal_lines.society_id
        AND sm.user_id = auth.uid()
        AND sm.status = 'ACTIVE'
        AND sm.role_id IN ('SOCIETY_ADMIN', 'TREASURER', 'SECRETARY', 'COMMITTEE_MEMBER', 'AUDITOR')
    )
  );

CREATE POLICY "Treasurers and Admins manage journal lines" ON public.journal_lines
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.society_memberships sm
      WHERE sm.society_id = journal_lines.society_id
        AND sm.user_id = auth.uid()
        AND sm.status = 'ACTIVE'
        AND sm.role_id IN ('SOCIETY_ADMIN', 'TREASURER')
    )
  );

-- 10.6 Expense Vouchers
CREATE POLICY "Authorized roles view expense vouchers" ON public.expense_vouchers
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.society_memberships sm
      WHERE sm.society_id = expense_vouchers.society_id
        AND sm.user_id = auth.uid()
        AND sm.status = 'ACTIVE'
        AND sm.role_id IN ('SOCIETY_ADMIN', 'TREASURER', 'SECRETARY', 'COMMITTEE_MEMBER', 'AUDITOR')
    )
  );

CREATE POLICY "Treasurers and Admins manage expense vouchers" ON public.expense_vouchers
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.society_memberships sm
      WHERE sm.society_id = expense_vouchers.society_id
        AND sm.user_id = auth.uid()
        AND sm.status = 'ACTIVE'
        AND sm.role_id IN ('SOCIETY_ADMIN', 'TREASURER')
    )
  );

-- 10.7 Bank Reconciliations
CREATE POLICY "Authorized roles view reconciliations" ON public.bank_reconciliations
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.society_memberships sm
      WHERE sm.society_id = bank_reconciliations.society_id
        AND sm.user_id = auth.uid()
        AND sm.status = 'ACTIVE'
        AND sm.role_id IN ('SOCIETY_ADMIN', 'TREASURER', 'AUDITOR')
    )
  );

CREATE POLICY "Treasurers and Admins manage reconciliations" ON public.bank_reconciliations
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.society_memberships sm
      WHERE sm.society_id = bank_reconciliations.society_id
        AND sm.user_id = auth.uid()
        AND sm.status = 'ACTIVE'
        AND sm.role_id IN ('SOCIETY_ADMIN', 'TREASURER')
    )
  );

CREATE POLICY "Authorized roles view bank transactions" ON public.bank_transactions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.society_memberships sm
      WHERE sm.society_id = bank_transactions.society_id
        AND sm.user_id = auth.uid()
        AND sm.status = 'ACTIVE'
        AND sm.role_id IN ('SOCIETY_ADMIN', 'TREASURER', 'AUDITOR')
    )
  );

CREATE POLICY "Treasurers and Admins manage bank transactions" ON public.bank_transactions
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.society_memberships sm
      WHERE sm.society_id = bank_transactions.society_id
        AND sm.user_id = auth.uid()
        AND sm.status = 'ACTIVE'
        AND sm.role_id IN ('SOCIETY_ADMIN', 'TREASURER')
    )
  );

-- 10.8 Financial Reports:
-- Draft/Audited/Approved reports viewable by Treasury, Admin, Secretary, Committee, Auditor.
-- PUBLISHED reports viewable by ALL active society members (including residents).
CREATE POLICY "Members view financial reports" ON public.financial_reports
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.society_memberships sm
      WHERE sm.society_id = financial_reports.society_id
        AND sm.user_id = auth.uid()
        AND sm.status = 'ACTIVE'
        AND (
          financial_reports.status = 'PUBLISHED'
          OR sm.role_id IN ('SOCIETY_ADMIN', 'TREASURER', 'SECRETARY', 'COMMITTEE_MEMBER', 'AUDITOR')
        )
    )
  );

CREATE POLICY "Treasurers and Admins manage financial reports" ON public.financial_reports
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.society_memberships sm
      WHERE sm.society_id = financial_reports.society_id
        AND sm.user_id = auth.uid()
        AND sm.status = 'ACTIVE'
        AND sm.role_id IN ('SOCIETY_ADMIN', 'TREASURER', 'SECRETARY')
    )
  );

