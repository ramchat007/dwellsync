-- DwellSync Migration: Pricing, Free Tier & Subscription Architecture
-- Creates subscription_plans and society_subscriptions with RLS, constraints, and seed data.
-- LOCAL ONLY — do not execute against remote database.

-- ============================================================================
-- 1. SUBSCRIPTION PLANS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.subscription_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE CHECK (code IN ('FREE', 'BASIC', 'PROFESSIONAL', 'ENTERPRISE')),
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
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT check_free_plan_zero_price CHECK (code != 'FREE' OR (monthly_price = 0 AND annual_price = 0))
);

CREATE INDEX IF NOT EXISTS idx_subscription_plans_code ON public.subscription_plans(code);
CREATE INDEX IF NOT EXISTS idx_subscription_plans_active ON public.subscription_plans(is_active);

-- Enable RLS
ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;

-- Everyone authenticated can read active subscription plans
DROP POLICY IF EXISTS "Authenticated users can view active subscription plans" ON public.subscription_plans;
CREATE POLICY "Authenticated users can view active subscription plans"
  ON public.subscription_plans FOR SELECT
  TO authenticated
  USING (is_active = true OR public.is_super_admin(auth.uid()));

-- Only Super Admins can manage plans
DROP POLICY IF EXISTS "Super admins can manage subscription plans" ON public.subscription_plans;
CREATE POLICY "Super admins can manage subscription plans"
  ON public.subscription_plans FOR ALL
  TO authenticated
  USING (public.is_super_admin(auth.uid()))
  WITH CHECK (public.is_super_admin(auth.uid()));

-- ============================================================================
-- 2. SOCIETY SUBSCRIPTIONS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.society_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  society_id UUID NOT NULL REFERENCES public.societies(id) ON DELETE CASCADE,
  plan_id UUID NOT NULL REFERENCES public.subscription_plans(id) ON DELETE RESTRICT,
  status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('TRIAL', 'ACTIVE', 'PAST_DUE', 'CANCELLED', 'EXPIRED')),
  billing_cycle TEXT NOT NULL DEFAULT 'monthly' CHECK (billing_cycle IN ('monthly', 'annual')),
  trial_start_date TIMESTAMPTZ,
  trial_end_date TIMESTAMPTZ,
  current_period_start TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  current_period_end TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '1 month'),
  cancel_at_period_end BOOLEAN NOT NULL DEFAULT false,
  cancelled_at TIMESTAMPTZ,
  provider TEXT NOT NULL DEFAULT 'FREE_LOCAL_PROVIDER',
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_society_subscription UNIQUE (society_id)
);

CREATE INDEX IF NOT EXISTS idx_society_subscriptions_society ON public.society_subscriptions(society_id);
CREATE INDEX IF NOT EXISTS idx_society_subscriptions_plan ON public.society_subscriptions(plan_id);
CREATE INDEX IF NOT EXISTS idx_society_subscriptions_status ON public.society_subscriptions(status);

-- Enable RLS
ALTER TABLE public.society_subscriptions ENABLE ROW LEVEL SECURITY;

-- Society members can view their society subscription, and Super Admins can view all
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

-- Only Super Admins can manage society subscriptions
DROP POLICY IF EXISTS "Super admins can manage society subscriptions" ON public.society_subscriptions;
CREATE POLICY "Super admins can manage society subscriptions"
  ON public.society_subscriptions FOR ALL
  TO authenticated
  USING (public.is_super_admin(auth.uid()))
  WITH CHECK (public.is_super_admin(auth.uid()));

-- ============================================================================
-- 3. SEED DEFAULT SUBSCRIPTION PLANS
-- ============================================================================

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

