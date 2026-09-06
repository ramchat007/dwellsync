-- DwellSyncHub Phase 9 Database Schema Migration
-- Establishes Maintenance Configurations, Billing Cycles, Invoices, Payments, Receipts, and Financial RLS Policies

-- ============================================================
-- 1. MAINTENANCE CONFIGURATIONS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.maintenance_configurations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  society_id UUID NOT NULL REFERENCES public.societies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  charge_type TEXT NOT NULL CHECK (
    charge_type IN ('FLAT_RATE', 'AREA_BASED', 'UNIT_TYPE_BASED')
  ),
  rate NUMERIC(12, 2) NOT NULL DEFAULT 0.00 CHECK (rate >= 0),
  unit_type_rates JSONB DEFAULT '{}'::jsonb,
  frequency TEXT NOT NULL DEFAULT 'MONTHLY' CHECK (
    frequency IN ('MONTHLY', 'QUARTERLY', 'BIANNUAL', 'ANNUAL', 'ONE_TIME')
  ),
  effective_from DATE NOT NULL DEFAULT CURRENT_DATE,
  effective_to DATE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 2. BILLING CYCLES TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.billing_cycles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  society_id UUID NOT NULL REFERENCES public.societies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  due_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'GENERATED' CHECK (
    status IN ('DRAFT', 'GENERATED', 'CLOSED', 'CANCELLED')
  ),
  notes TEXT,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_billing_cycle_period UNIQUE (society_id, period_start, period_end)
);

-- ============================================================
-- 3. INVOICES TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  society_id UUID NOT NULL REFERENCES public.societies(id) ON DELETE CASCADE,
  unit_id UUID NOT NULL REFERENCES public.units(id) ON DELETE CASCADE,
  billing_cycle_id UUID REFERENCES public.billing_cycles(id) ON DELETE SET NULL,
  charge_config_id UUID REFERENCES public.maintenance_configurations(id) ON DELETE SET NULL,
  invoice_number TEXT NOT NULL UNIQUE,
  invoice_date DATE NOT NULL DEFAULT CURRENT_DATE,
  due_date DATE NOT NULL,
  subtotal NUMERIC(12, 2) NOT NULL CHECK (subtotal >= 0),
  adjustments NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  total_amount NUMERIC(12, 2) NOT NULL CHECK (total_amount >= 0),
  amount_paid NUMERIC(12, 2) NOT NULL DEFAULT 0.00 CHECK (amount_paid >= 0),
  balance_due NUMERIC(12, 2) NOT NULL CHECK (balance_due >= 0),
  status TEXT NOT NULL DEFAULT 'UNPAID' CHECK (
    status IN ('UNPAID', 'PARTIALLY_PAID', 'PAID', 'OVERDUE', 'CANCELLED')
  ),
  line_items JSONB NOT NULL DEFAULT '[]'::jsonb,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_unit_billing_cycle UNIQUE (billing_cycle_id, unit_id)
);

-- ============================================================
-- 4. PAYMENTS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  society_id UUID NOT NULL REFERENCES public.societies(id) ON DELETE CASCADE,
  invoice_id UUID NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  unit_id UUID NOT NULL REFERENCES public.units(id) ON DELETE CASCADE,
  amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
  payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  payment_method TEXT NOT NULL CHECK (
    payment_method IN ('CASH', 'CHEQUE', 'BANK_TRANSFER', 'UPI', 'CARD', 'OTHER')
  ),
  reference_number TEXT,
  status TEXT NOT NULL DEFAULT 'COMPLETED' CHECK (
    status IN ('COMPLETED', 'PENDING', 'FAILED', 'CANCELLED')
  ),
  recorded_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 5. RECEIPTS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.receipts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  society_id UUID NOT NULL REFERENCES public.societies(id) ON DELETE CASCADE,
  invoice_id UUID NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  payment_id UUID NOT NULL UNIQUE REFERENCES public.payments(id) ON DELETE CASCADE,
  unit_id UUID NOT NULL REFERENCES public.units(id) ON DELETE CASCADE,
  receipt_number TEXT NOT NULL UNIQUE,
  amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
  receipt_date DATE NOT NULL DEFAULT CURRENT_DATE,
  issued_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 6. PERFORMANCE INDEXES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_maint_configs_society ON public.maintenance_configurations(society_id);
CREATE INDEX IF NOT EXISTS idx_maint_configs_active ON public.maintenance_configurations(society_id, is_active);

CREATE INDEX IF NOT EXISTS idx_billing_cycles_society ON public.billing_cycles(society_id);
CREATE INDEX IF NOT EXISTS idx_billing_cycles_status ON public.billing_cycles(status);

CREATE INDEX IF NOT EXISTS idx_invoices_society ON public.invoices(society_id);
CREATE INDEX IF NOT EXISTS idx_invoices_unit ON public.invoices(unit_id);
CREATE INDEX IF NOT EXISTS idx_invoices_cycle ON public.invoices(billing_cycle_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON public.invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_due_date ON public.invoices(due_date);

CREATE INDEX IF NOT EXISTS idx_payments_society ON public.payments(society_id);
CREATE INDEX IF NOT EXISTS idx_payments_invoice ON public.payments(invoice_id);
CREATE INDEX IF NOT EXISTS idx_payments_unit ON public.payments(unit_id);
CREATE INDEX IF NOT EXISTS idx_payments_date ON public.payments(payment_date);

CREATE INDEX IF NOT EXISTS idx_receipts_society ON public.receipts(society_id);
CREATE INDEX IF NOT EXISTS idx_receipts_invoice ON public.receipts(invoice_id);
CREATE INDEX IF NOT EXISTS idx_receipts_unit ON public.receipts(unit_id);
CREATE INDEX IF NOT EXISTS idx_receipts_payment ON public.receipts(payment_id);

-- ============================================================
-- 7. ENABLE ROW LEVEL SECURITY (RLS)
-- ============================================================
ALTER TABLE public.maintenance_configurations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.billing_cycles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.receipts ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 8. MAINTENANCE CONFIGURATIONS RLS POLICIES
-- ============================================================
DROP POLICY IF EXISTS "Members can view maintenance configurations" ON public.maintenance_configurations;
CREATE POLICY "Members can view maintenance configurations"
  ON public.maintenance_configurations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.society_memberships sm
      WHERE sm.society_id = maintenance_configurations.society_id
        AND sm.user_id = auth.uid()
        AND sm.status = 'ACTIVE'
    )
    OR public.is_super_admin(auth.uid())
  );

DROP POLICY IF EXISTS "Admins and treasurers can manage maintenance configurations" ON public.maintenance_configurations;
CREATE POLICY "Admins and treasurers can manage maintenance configurations"
  ON public.maintenance_configurations FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.society_memberships sm
      WHERE sm.society_id = maintenance_configurations.society_id
        AND sm.user_id = auth.uid()
        AND sm.status = 'ACTIVE'
        AND sm.role_id IN ('SOCIETY_ADMIN', 'TREASURER')
    )
    OR public.is_super_admin(auth.uid())
  );

-- ============================================================
-- 9. BILLING CYCLES RLS POLICIES
-- ============================================================
DROP POLICY IF EXISTS "Members can view billing cycles" ON public.billing_cycles;
CREATE POLICY "Members can view billing cycles"
  ON public.billing_cycles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.society_memberships sm
      WHERE sm.society_id = billing_cycles.society_id
        AND sm.user_id = auth.uid()
        AND sm.status = 'ACTIVE'
    )
    OR public.is_super_admin(auth.uid())
  );

DROP POLICY IF EXISTS "Admins and treasurers can manage billing cycles" ON public.billing_cycles;
CREATE POLICY "Admins and treasurers can manage billing cycles"
  ON public.billing_cycles FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.society_memberships sm
      WHERE sm.society_id = billing_cycles.society_id
        AND sm.user_id = auth.uid()
        AND sm.status = 'ACTIVE'
        AND sm.role_id IN ('SOCIETY_ADMIN', 'TREASURER')
    )
    OR public.is_super_admin(auth.uid())
  );

-- ============================================================
-- 10. INVOICES RLS POLICIES (Resident Isolation & Admin Management)
-- ============================================================
DROP POLICY IF EXISTS "Users can view authorized invoices" ON public.invoices;
CREATE POLICY "Users can view authorized invoices"
  ON public.invoices FOR SELECT
  USING (
    -- Governance roles can view all invoices for their society
    EXISTS (
      SELECT 1 FROM public.society_memberships sm
      WHERE sm.society_id = invoices.society_id
        AND sm.user_id = auth.uid()
        AND sm.status = 'ACTIVE'
        AND sm.role_id IN ('SOCIETY_ADMIN', 'TREASURER', 'SECRETARY', 'COMMITTEE_MEMBER', 'AUDITOR')
    )
    -- Residents can ONLY view invoices for units they actively own
    OR EXISTS (
      SELECT 1 FROM public.unit_owners uo
      WHERE uo.unit_id = invoices.unit_id
        AND uo.society_id = invoices.society_id
        AND uo.user_id = auth.uid()
        AND uo.status = 'ACTIVE'
    )
    -- Residents can ONLY view invoices for units they actively occupy
    OR EXISTS (
      SELECT 1 FROM public.unit_occupancies uoc
      WHERE uoc.unit_id = invoices.unit_id
        AND uoc.society_id = invoices.society_id
        AND uoc.user_id = auth.uid()
        AND uoc.status = 'ACTIVE'
    )
    OR public.is_super_admin(auth.uid())
  );

DROP POLICY IF EXISTS "Admins and treasurers can manage invoices" ON public.invoices;
CREATE POLICY "Admins and treasurers can manage invoices"
  ON public.invoices FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.society_memberships sm
      WHERE sm.society_id = invoices.society_id
        AND sm.user_id = auth.uid()
        AND sm.status = 'ACTIVE'
        AND sm.role_id IN ('SOCIETY_ADMIN', 'TREASURER')
    )
    OR public.is_super_admin(auth.uid())
  );

-- ============================================================
-- 11. PAYMENTS RLS POLICIES
-- ============================================================
DROP POLICY IF EXISTS "Users can view authorized payments" ON public.payments;
CREATE POLICY "Users can view authorized payments"
  ON public.payments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.society_memberships sm
      WHERE sm.society_id = payments.society_id
        AND sm.user_id = auth.uid()
        AND sm.status = 'ACTIVE'
        AND sm.role_id IN ('SOCIETY_ADMIN', 'TREASURER', 'SECRETARY', 'COMMITTEE_MEMBER', 'AUDITOR')
    )
    OR EXISTS (
      SELECT 1 FROM public.unit_owners uo
      WHERE uo.unit_id = payments.unit_id
        AND uo.society_id = payments.society_id
        AND uo.user_id = auth.uid()
        AND uo.status = 'ACTIVE'
    )
    OR EXISTS (
      SELECT 1 FROM public.unit_occupancies uoc
      WHERE uoc.unit_id = payments.unit_id
        AND uoc.society_id = payments.society_id
        AND uoc.user_id = auth.uid()
        AND uoc.status = 'ACTIVE'
    )
    OR public.is_super_admin(auth.uid())
  );

DROP POLICY IF EXISTS "Admins and treasurers can record payments" ON public.payments;
CREATE POLICY "Admins and treasurers can record payments"
  ON public.payments FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.society_memberships sm
      WHERE sm.society_id = payments.society_id
        AND sm.user_id = auth.uid()
        AND sm.status = 'ACTIVE'
        AND sm.role_id IN ('SOCIETY_ADMIN', 'TREASURER')
    )
    OR public.is_super_admin(auth.uid())
  );

-- ============================================================
-- 12. RECEIPTS RLS POLICIES
-- ============================================================
DROP POLICY IF EXISTS "Users can view authorized receipts" ON public.receipts;
CREATE POLICY "Users can view authorized receipts"
  ON public.receipts FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.society_memberships sm
      WHERE sm.society_id = receipts.society_id
        AND sm.user_id = auth.uid()
        AND sm.status = 'ACTIVE'
        AND sm.role_id IN ('SOCIETY_ADMIN', 'TREASURER', 'SECRETARY', 'COMMITTEE_MEMBER', 'AUDITOR')
    )
    OR EXISTS (
      SELECT 1 FROM public.unit_owners uo
      WHERE uo.unit_id = receipts.unit_id
        AND uo.society_id = receipts.society_id
        AND uo.user_id = auth.uid()
        AND uo.status = 'ACTIVE'
    )
    OR EXISTS (
      SELECT 1 FROM public.unit_occupancies uoc
      WHERE uoc.unit_id = receipts.unit_id
        AND uoc.society_id = receipts.society_id
        AND uoc.user_id = auth.uid()
        AND uoc.status = 'ACTIVE'
    )
    OR public.is_super_admin(auth.uid())
  );

DROP POLICY IF EXISTS "Admins and treasurers can manage receipts" ON public.receipts;
CREATE POLICY "Admins and treasurers can manage receipts"
  ON public.receipts FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.society_memberships sm
      WHERE sm.society_id = receipts.society_id
        AND sm.user_id = auth.uid()
        AND sm.status = 'ACTIVE'
        AND sm.role_id IN ('SOCIETY_ADMIN', 'TREASURER')
    )
    OR public.is_super_admin(auth.uid())
  );
