-- ============================================================
-- DwellSync Migration: Pricing, Free Tier & Subscription Architecture
-- Version: 20260901000021_pricing_subscriptions.sql
-- Description:
--   1. Creates public.subscription_plans with pricing, limits, features, and zero-price FREE check.
--   2. Creates public.society_subscriptions with status lifecycle, billing cycles, and tenant isolation.
--   3. Seeds default tiers: FREE, BASIC, PROFESSIONAL, ENTERPRISE.
--   4. Configures Row Level Security (RLS) with idempotent policy drops.
-- ============================================================

-- ------------------------------------------------------------
-- 1. SUBSCRIPTION PLANS TABLE
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.subscription_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  monthly_price NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (monthly_price >= 0),
  annual_price NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (annual_price >= 0),
  currency TEXT NOT NULL DEFAULT 'INR',
  feature_limits JSONB NOT NULL DEFAULT '{}'::jsonb,
  enabled_features TEXT[] NOT NULL DEFAULT '{}',
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Idempotent column additions for safe re-runs
ALTER TABLE public.subscription_plans
  ADD COLUMN IF NOT EXISTS code TEXT,
  ADD COLUMN IF NOT EXISTS name TEXT,
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS monthly_price NUMERIC(12, 2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS annual_price NUMERIC(12, 2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS currency TEXT NOT NULL DEFAULT 'INR',
  ADD COLUMN IF NOT EXISTS feature_limits JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS enabled_features TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS sort_order INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- Unique constraint on code
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'uq_subscription_plans_code'
      AND conrelid = 'public.subscription_plans'::regclass
  ) THEN
    ALTER TABLE public.subscription_plans ADD CONSTRAINT uq_subscription_plans_code UNIQUE (code);
  END IF;
EXCEPTION
  WHEN OTHERS THEN NULL;
END $$;

-- CHECK constraint on plan codes
DO $$
BEGIN
  ALTER TABLE public.subscription_plans DROP CONSTRAINT IF EXISTS subscription_plans_code_check;
  ALTER TABLE public.subscription_plans ADD CONSTRAINT subscription_plans_code_check
    CHECK (code IN ('FREE', 'BASIC', 'PROFESSIONAL', 'ENTERPRISE'));
EXCEPTION
  WHEN OTHERS THEN NULL;
END $$;

-- CHECK constraint: FREE plan must be ₹0
DO $$
BEGIN
  ALTER TABLE public.subscription_plans DROP CONSTRAINT IF EXISTS check_free_plan_zero_price;
  ALTER TABLE public.subscription_plans ADD CONSTRAINT check_free_plan_zero_price
    CHECK (code != 'FREE' OR (monthly_price = 0 AND annual_price = 0));
EXCEPTION
  WHEN OTHERS THEN NULL;
END $$;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_subscription_plans_code ON public.subscription_plans(code);
CREATE INDEX IF NOT EXISTS idx_subscription_plans_active ON public.subscription_plans(is_active);

-- Enable RLS
ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;

-- Read policy: Authenticated users can view active plans; Super Admins see all
DROP POLICY IF EXISTS "Authenticated users can view active subscription plans" ON public.subscription_plans;
CREATE POLICY "Authenticated users can view active subscription plans"
  ON public.subscription_plans FOR SELECT
  TO authenticated
  USING (is_active = true OR public.is_super_admin(auth.uid()));

-- Manage policy: Super Admins only
DROP POLICY IF EXISTS "Super admins can manage subscription plans" ON public.subscription_plans;
CREATE POLICY "Super admins can manage subscription plans"
  ON public.subscription_plans FOR ALL
  TO authenticated
  USING (public.is_super_admin(auth.uid()))
  WITH CHECK (public.is_super_admin(auth.uid()));

-- ------------------------------------------------------------
-- 2. SOCIETY SUBSCRIPTIONS TABLE
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.society_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  society_id UUID NOT NULL REFERENCES public.societies(id) ON DELETE CASCADE,
  plan_id UUID NOT NULL REFERENCES public.subscription_plans(id) ON DELETE RESTRICT,
  status TEXT NOT NULL DEFAULT 'ACTIVE',
  billing_cycle TEXT NOT NULL DEFAULT 'monthly',
  trial_start_date TIMESTAMPTZ,
  trial_end_date TIMESTAMPTZ,
  current_period_start TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  current_period_end TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '1 month'),
  cancel_at_period_end BOOLEAN NOT NULL DEFAULT false,
  cancelled_at TIMESTAMPTZ,
  provider TEXT NOT NULL DEFAULT 'FREE_LOCAL_PROVIDER',
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Idempotent column additions for safe re-runs
ALTER TABLE public.society_subscriptions
  ADD COLUMN IF NOT EXISTS society_id UUID REFERENCES public.societies(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS plan_id UUID REFERENCES public.subscription_plans(id) ON DELETE RESTRICT,
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'ACTIVE',
  ADD COLUMN IF NOT EXISTS billing_cycle TEXT NOT NULL DEFAULT 'monthly',
  ADD COLUMN IF NOT EXISTS trial_start_date TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS trial_end_date TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS current_period_start TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS current_period_end TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '1 month'),
  ADD COLUMN IF NOT EXISTS cancel_at_period_end BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS provider TEXT NOT NULL DEFAULT 'FREE_LOCAL_PROVIDER',
  ADD COLUMN IF NOT EXISTS metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- Unique constraint on society_id
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'uq_society_subscription'
      AND conrelid = 'public.society_subscriptions'::regclass
  ) THEN
    ALTER TABLE public.society_subscriptions ADD CONSTRAINT uq_society_subscription UNIQUE (society_id);
  END IF;
EXCEPTION
  WHEN OTHERS THEN NULL;
END $$;

-- CHECK constraint on status
DO $$
BEGIN
  ALTER TABLE public.society_subscriptions DROP CONSTRAINT IF EXISTS society_subscriptions_status_check;
  ALTER TABLE public.society_subscriptions ADD CONSTRAINT society_subscriptions_status_check
    CHECK (status IN ('TRIAL', 'ACTIVE', 'PAST_DUE', 'CANCELLED', 'EXPIRED'));
EXCEPTION
  WHEN OTHERS THEN NULL;
END $$;

-- CHECK constraint on billing cycle
DO $$
BEGIN
  ALTER TABLE public.society_subscriptions DROP CONSTRAINT IF EXISTS society_subscriptions_billing_cycle_check;
  ALTER TABLE public.society_subscriptions ADD CONSTRAINT society_subscriptions_billing_cycle_check
    CHECK (billing_cycle IN ('monthly', 'annual'));
EXCEPTION
  WHEN OTHERS THEN NULL;
END $$;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_society_subscriptions_society ON public.society_subscriptions(society_id);
CREATE INDEX IF NOT EXISTS idx_society_subscriptions_plan ON public.society_subscriptions(plan_id);
CREATE INDEX IF NOT EXISTS idx_society_subscriptions_status ON public.society_subscriptions(status);

-- Enable RLS
ALTER TABLE public.society_subscriptions ENABLE ROW LEVEL SECURITY;

-- Read policy: Society members and Super Admins
DROP POLICY IF EXISTS "Society members and super admins can view society subscriptions" ON public.society_subscriptions;
CREATE POLICY "Society members and super admins can view society subscriptions"
  ON public.society_subscriptions FOR SELECT
  TO authenticated
  USING (
    public.is_super_admin(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.society_memberships sm
      WHERE sm.society_id = society_subscriptions.society_id
        AND sm.user_id = auth.uid()
        AND sm.status = 'ACTIVE'
    )
  );

-- Manage policy: Super Admins only
DROP POLICY IF EXISTS "Super admins can manage society subscriptions" ON public.society_subscriptions;
CREATE POLICY "Super admins can manage society subscriptions"
  ON public.society_subscriptions FOR ALL
  TO authenticated
  USING (public.is_super_admin(auth.uid()))
  WITH CHECK (public.is_super_admin(auth.uid()));

-- ------------------------------------------------------------
-- 3. SEED DEFAULT SUBSCRIPTION PLANS
-- ------------------------------------------------------------
INSERT INTO public.subscription_plans (
  code,
  name,
  description,
  is_active,
  monthly_price,
  annual_price,
  currency,
  feature_limits,
  enabled_features,
  sort_order
) VALUES
(
  'FREE',
  'Free Community Tier',
  'Completely free tier for small housing societies to manage basic residents, gate passes, and helpdesk with zero external paid costs.',
  true,
  0,
  0,
  'INR',
  '{
    "max_units": 30,
    "max_buildings": 2,
    "max_residents": 60,
    "max_storage_mb": 100,
    "max_active_complaints": 25,
    "max_events_per_month": 5,
    "max_polls_per_month": 5,
    "max_staff_members": 5,
    "max_invoices_per_month": 50
  }'::jsonb,
  ARRAY[
    'units',
    'residents',
    'buildings',
    'gate_passes',
    'complaints',
    'notices',
    'documents',
    'events_polls',
    'maintenance_billing'
  ],
  1
),
(
  'BASIC',
  'Standard Society Tier',
  'Designed for medium residential communities requiring higher limits, amenity booking, and committee meetings.',
  true,
  999.00,
  9999.00,
  'INR',
  '{
    "max_units": 100,
    "max_buildings": 5,
    "max_residents": 250,
    "max_storage_mb": 500,
    "max_active_complaints": 100,
    "max_events_per_month": 20,
    "max_polls_per_month": 20,
    "max_staff_members": 15,
    "max_invoices_per_month": 200
  }'::jsonb,
  ARRAY[
    'units',
    'residents',
    'buildings',
    'gate_passes',
    'complaints',
    'notices',
    'documents',
    'events_polls',
    'maintenance_billing',
    'amenities',
    'governance_meetings',
    'committees',
    'analytics_basic'
  ],
  2
),
(
  'PROFESSIONAL',
  'Professional Society Tier',
  'Advanced management for large complexes with double-entry treasury, SLA tracking, and asset inventory.',
  true,
  2499.00,
  24999.00,
  'INR',
  '{
    "max_units": 350,
    "max_buildings": 15,
    "max_residents": 1000,
    "max_storage_mb": 2048,
    "max_active_complaints": 500,
    "max_events_per_month": 100,
    "max_polls_per_month": 100,
    "max_staff_members": 50,
    "max_invoices_per_month": 1000
  }'::jsonb,
  ARRAY[
    'units',
    'residents',
    'buildings',
    'gate_passes',
    'complaints',
    'notices',
    'documents',
    'events_polls',
    'maintenance_billing',
    'amenities',
    'governance_meetings',
    'committees',
    'analytics_basic',
    'analytics_advanced',
    'sla_management',
    'assets_inventory',
    'finance_ledger'
  ],
  3
),
(
  'ENTERPRISE',
  'Enterprise Multi-Complex Tier',
  'Unlimited capacity with builder handover, custom SLA, and priority support for mega-societies.',
  true,
  5999.00,
  59999.00,
  'INR',
  '{
    "max_units": -1,
    "max_buildings": -1,
    "max_residents": -1,
    "max_storage_mb": 10240,
    "max_active_complaints": -1,
    "max_events_per_month": -1,
    "max_polls_per_month": -1,
    "max_staff_members": -1,
    "max_invoices_per_month": -1
  }'::jsonb,
  ARRAY[
    'units',
    'residents',
    'buildings',
    'gate_passes',
    'complaints',
    'notices',
    'documents',
    'events_polls',
    'maintenance_billing',
    'amenities',
    'governance_meetings',
    'committees',
    'analytics_basic',
    'analytics_advanced',
    'sla_management',
    'assets_inventory',
    'finance_ledger',
    'builder_handover',
    'custom_branding'
  ],
  4
)
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  is_active = EXCLUDED.is_active,
  monthly_price = EXCLUDED.monthly_price,
  annual_price = EXCLUDED.annual_price,
  currency = EXCLUDED.currency,
  feature_limits = EXCLUDED.feature_limits,
  enabled_features = EXCLUDED.enabled_features,
  sort_order = EXCLUDED.sort_order,
  updated_at = NOW();
