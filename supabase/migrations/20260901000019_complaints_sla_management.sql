-- ============================================================
-- DwellSync Migration 19: Complaints / Helpdesk Enhancement + SLA Management
-- Fully Idempotent, Non-Destructive, Safely Rerunnable
-- ============================================================

-- 1. ENHANCE PUBLIC.COMPLAINTS TABLE
-- ============================================================

-- Add new lifecycle, SLA, and timeline fields to complaints
ALTER TABLE public.complaints
  ADD COLUMN IF NOT EXISTS subcategory TEXT,
  ADD COLUMN IF NOT EXISTS sla_status TEXT NOT NULL DEFAULT 'ON_TRACK',
  ADD COLUMN IF NOT EXISTS sla_cycle_number INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS response_due_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS responded_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS resolution_due_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS sla_paused_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS total_paused_duration_minutes INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS on_hold_reason TEXT,
  ADD COLUMN IF NOT EXISTS closure_reason TEXT,
  ADD COLUMN IF NOT EXISTS is_response_breached BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS is_resolution_breached BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS escalation_level INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_escalated_at TIMESTAMPTZ;

-- Drop and re-create check constraints on complaints for extended statuses, priorities, and SLA statuses
DO $$
BEGIN
  ALTER TABLE public.complaints DROP CONSTRAINT IF EXISTS complaints_status_check;
  ALTER TABLE public.complaints ADD CONSTRAINT complaints_status_check CHECK (
    status IN ('SUBMITTED', 'NEW', 'ACKNOWLEDGED', 'ASSIGNED', 'IN_PROGRESS', 'ON_HOLD', 'RESOLVED', 'CLOSED', 'REOPENED')
  );

  ALTER TABLE public.complaints DROP CONSTRAINT IF EXISTS complaints_priority_check;
  ALTER TABLE public.complaints ADD CONSTRAINT complaints_priority_check CHECK (
    priority IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL', 'EMERGENCY')
  );

  ALTER TABLE public.complaints DROP CONSTRAINT IF EXISTS complaints_sla_status_check;
  ALTER TABLE public.complaints ADD CONSTRAINT complaints_sla_status_check CHECK (
    sla_status IN ('ON_TRACK', 'DUE_SOON', 'BREACHED', 'PAUSED', 'COMPLETED')
  );
END $$;

-- Indexes for SLA queries and dashboard filtering
CREATE INDEX IF NOT EXISTS idx_complaints_sla_status ON public.complaints(society_id, sla_status);
CREATE INDEX IF NOT EXISTS idx_complaints_resolution_due ON public.complaints(society_id, resolution_due_at);
CREATE INDEX IF NOT EXISTS idx_complaints_escalation ON public.complaints(society_id, escalation_level);

-- ============================================================
-- 2. SLA CONFIGURATIONS TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS public.complaint_sla_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  society_id UUID NOT NULL REFERENCES public.societies(id) ON DELETE CASCADE,
  category TEXT NOT NULL CHECK (
    category IN ('ELECTRICAL', 'PLUMBING', 'ELEVATOR', 'COMMON_AREA', 'SECURITY', 'NOISE', 'CARPENTRY', 'CLEANLINESS', 'OTHER', 'ALL')
  ),
  priority TEXT NOT NULL CHECK (
    priority IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL', 'EMERGENCY', 'ALL')
  ),
  response_time_hours NUMERIC(6, 2) NOT NULL CHECK (response_time_hours > 0),
  resolution_time_hours NUMERIC(6, 2) NOT NULL CHECK (resolution_time_hours > 0),
  business_hours_only BOOLEAN NOT NULL DEFAULT FALSE,
  business_hours_start TIME DEFAULT '09:00:00',
  business_hours_end TIME DEFAULT '18:00:00',
  exclude_weekends BOOLEAN NOT NULL DEFAULT TRUE,
  effective_from DATE NOT NULL DEFAULT CURRENT_DATE,
  effective_to DATE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_complaint_sla_configs UNIQUE (society_id, category, priority, effective_from)
);

-- Idempotently ensure columns and constraints on complaint_sla_configs
DO $$
BEGIN
  ALTER TABLE public.complaint_sla_configs ADD COLUMN IF NOT EXISTS business_hours_start TIME DEFAULT '09:00:00';
  ALTER TABLE public.complaint_sla_configs ADD COLUMN IF NOT EXISTS business_hours_end TIME DEFAULT '18:00:00';
  ALTER TABLE public.complaint_sla_configs ADD COLUMN IF NOT EXISTS exclude_weekends BOOLEAN DEFAULT TRUE;
  ALTER TABLE public.complaint_sla_configs ADD COLUMN IF NOT EXISTS effective_from DATE DEFAULT CURRENT_DATE;
  ALTER TABLE public.complaint_sla_configs ADD COLUMN IF NOT EXISTS effective_to DATE;
  ALTER TABLE public.complaint_sla_configs ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;
  ALTER TABLE public.complaint_sla_configs ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL;
  ALTER TABLE public.complaint_sla_configs ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'uq_complaint_sla_configs') THEN
    ALTER TABLE public.complaint_sla_configs
      ADD CONSTRAINT uq_complaint_sla_configs UNIQUE (society_id, category, priority, effective_from);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_sla_configs_society_active ON public.complaint_sla_configs(society_id, is_active);

-- ============================================================
-- 3. COMPLAINT TIMELINE & SLA EVENTS TABLE (Immutable Audit Trail)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.complaint_sla_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  society_id UUID NOT NULL REFERENCES public.societies(id) ON DELETE CASCADE,
  complaint_id UUID NOT NULL REFERENCES public.complaints(id) ON DELETE CASCADE,
  cycle_number INTEGER NOT NULL DEFAULT 1,
  event_type TEXT NOT NULL CHECK (
    event_type IN (
      'CREATED',
      'ACKNOWLEDGED',
      'ASSIGNED',
      'STATUS_CHANGE',
      'PRIORITY_CHANGE',
      'SLA_PAUSED',
      'SLA_RESUMED',
      'RESOLVED',
      'CLOSED',
      'REOPENED',
      'ESCALATED',
      'NOTE_ADDED'
    )
  ),
  from_status TEXT,
  to_status TEXT,
  actor_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  notes TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Idempotently ensure columns on complaint_sla_events
DO $$
BEGIN
  ALTER TABLE public.complaint_sla_events ADD COLUMN IF NOT EXISTS cycle_number INTEGER DEFAULT 1;
  ALTER TABLE public.complaint_sla_events ADD COLUMN IF NOT EXISTS from_status TEXT;
  ALTER TABLE public.complaint_sla_events ADD COLUMN IF NOT EXISTS to_status TEXT;
  ALTER TABLE public.complaint_sla_events ADD COLUMN IF NOT EXISTS actor_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL;
  ALTER TABLE public.complaint_sla_events ADD COLUMN IF NOT EXISTS notes TEXT;
  ALTER TABLE public.complaint_sla_events ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;
END $$;

CREATE INDEX IF NOT EXISTS idx_sla_events_complaint ON public.complaint_sla_events(complaint_id, cycle_number, created_at);
CREATE INDEX IF NOT EXISTS idx_sla_events_society ON public.complaint_sla_events(society_id, created_at);

-- ============================================================
-- 4. ESCALATION RULES TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS public.complaint_escalation_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  society_id UUID NOT NULL REFERENCES public.societies(id) ON DELETE CASCADE,
  level INTEGER NOT NULL CHECK (level IN (1, 2, 3)),
  trigger_condition TEXT NOT NULL CHECK (
    trigger_condition IN ('BREACH_RESPONSE', 'BREACH_RESOLUTION', 'CRITICAL_UNASSIGNED_1H', 'DUE_SOON_2H')
  ),
  notify_roles TEXT[] NOT NULL DEFAULT ARRAY['MANAGER', 'SOCIETY_ADMIN'],
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_escalation_rules_society_level UNIQUE (society_id, level, trigger_condition)
);

-- Idempotently ensure columns and constraints on complaint_escalation_rules
DO $$
BEGIN
  ALTER TABLE public.complaint_escalation_rules ADD COLUMN IF NOT EXISTS notify_roles TEXT[] DEFAULT ARRAY['MANAGER', 'SOCIETY_ADMIN'];
  ALTER TABLE public.complaint_escalation_rules ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;
  ALTER TABLE public.complaint_escalation_rules ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'uq_escalation_rules_society_level') THEN
    ALTER TABLE public.complaint_escalation_rules
      ADD CONSTRAINT uq_escalation_rules_society_level UNIQUE (society_id, level, trigger_condition);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_escalation_rules_society ON public.complaint_escalation_rules(society_id, is_active);

-- ============================================================
-- 5. ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================

ALTER TABLE public.complaint_sla_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.complaint_sla_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.complaint_escalation_rules ENABLE ROW LEVEL SECURITY;

-- 5A. complaint_sla_configs
DROP POLICY IF EXISTS "Members can view society SLA configs" ON public.complaint_sla_configs;
CREATE POLICY "Members can view society SLA configs"
  ON public.complaint_sla_configs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.society_memberships sm
      WHERE sm.society_id = complaint_sla_configs.society_id
        AND sm.user_id = auth.uid()
        AND sm.status = 'ACTIVE'
    )
    OR EXISTS (
      SELECT 1 FROM public.platform_admins pa
      WHERE pa.user_id = auth.uid()
        AND pa.role_id = 'SUPER_ADMIN'
    )
  );

DROP POLICY IF EXISTS "Admins can manage society SLA configs" ON public.complaint_sla_configs;
CREATE POLICY "Admins can manage society SLA configs"
  ON public.complaint_sla_configs FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.society_memberships sm
      WHERE sm.society_id = complaint_sla_configs.society_id
        AND sm.user_id = auth.uid()
        AND sm.status = 'ACTIVE'
        AND sm.role_id IN ('SUPER_ADMIN', 'SOCIETY_ADMIN', 'SECRETARY', 'MANAGER')
    )
    OR EXISTS (
      SELECT 1 FROM public.platform_admins pa
      WHERE pa.user_id = auth.uid()
        AND pa.role_id = 'SUPER_ADMIN'
    )
  );

-- 5B. complaint_sla_events
DROP POLICY IF EXISTS "Residents view timeline of own complaints or staff view all" ON public.complaint_sla_events;
CREATE POLICY "Residents view timeline of own complaints or staff view all"
  ON public.complaint_sla_events FOR SELECT
  USING (
    -- Staff/Management in society can view all events
    EXISTS (
      SELECT 1 FROM public.society_memberships sm
      WHERE sm.society_id = complaint_sla_events.society_id
        AND sm.user_id = auth.uid()
        AND sm.status = 'ACTIVE'
        AND sm.role_id IN ('SUPER_ADMIN', 'SOCIETY_ADMIN', 'SECRETARY', 'MANAGER', 'STAFF', 'COMMITTEE_MEMBER')
    )
    OR
    -- Resident can view timeline of complaints they created
    EXISTS (
      SELECT 1 FROM public.complaints c
      WHERE c.id = complaint_sla_events.complaint_id
        AND c.created_by = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.platform_admins pa
      WHERE pa.user_id = auth.uid()
        AND pa.role_id = 'SUPER_ADMIN'
    )
  );

DROP POLICY IF EXISTS "Staff and admins can insert SLA timeline events" ON public.complaint_sla_events;
CREATE POLICY "Staff and admins can insert SLA timeline events"
  ON public.complaint_sla_events FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.society_memberships sm
      WHERE sm.society_id = complaint_sla_events.society_id
        AND sm.user_id = auth.uid()
        AND sm.status = 'ACTIVE'
    )
    OR EXISTS (
      SELECT 1 FROM public.platform_admins pa
      WHERE pa.user_id = auth.uid()
        AND pa.role_id = 'SUPER_ADMIN'
    )
  );

-- 5C. complaint_escalation_rules
DROP POLICY IF EXISTS "Staff and admins view escalation rules" ON public.complaint_escalation_rules;
CREATE POLICY "Staff and admins view escalation rules"
  ON public.complaint_escalation_rules FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.society_memberships sm
      WHERE sm.society_id = complaint_escalation_rules.society_id
        AND sm.user_id = auth.uid()
        AND sm.status = 'ACTIVE'
        AND sm.role_id IN ('SUPER_ADMIN', 'SOCIETY_ADMIN', 'SECRETARY', 'MANAGER', 'COMMITTEE_MEMBER')
    )
    OR EXISTS (
      SELECT 1 FROM public.platform_admins pa
      WHERE pa.user_id = auth.uid()
        AND pa.role_id = 'SUPER_ADMIN'
    )
  );

DROP POLICY IF EXISTS "Admins can manage escalation rules" ON public.complaint_escalation_rules;
CREATE POLICY "Admins can manage escalation rules"
  ON public.complaint_escalation_rules FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.society_memberships sm
      WHERE sm.society_id = complaint_escalation_rules.society_id
        AND sm.user_id = auth.uid()
        AND sm.status = 'ACTIVE'
        AND sm.role_id IN ('SUPER_ADMIN', 'SOCIETY_ADMIN', 'SECRETARY', 'MANAGER')
    )
    OR EXISTS (
      SELECT 1 FROM public.platform_admins pa
      WHERE pa.user_id = auth.uid()
        AND pa.role_id = 'SUPER_ADMIN'
    )
  );
