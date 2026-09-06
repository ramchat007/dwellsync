-- DwellSyncHub Phase 7: Security Gate + Visitor Management Migration
-- Creates visitors table with foreign keys, indexes, and RLS policies

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Visitors Table
CREATE TABLE IF NOT EXISTS public.visitors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  society_id UUID NOT NULL REFERENCES public.societies(id) ON DELETE CASCADE,
  unit_id UUID NOT NULL REFERENCES public.units(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  visitor_name TEXT NOT NULL,
  visitor_phone TEXT,
  purpose TEXT NOT NULL DEFAULT 'GUEST' CHECK (
    purpose IN ('GUEST', 'DELIVERY', 'CAB', 'SERVICE', 'FAMILY', 'OTHER')
  ),
  vehicle_number TEXT,
  pass_code TEXT NOT NULL,
  expected_arrival TIMESTAMPTZ,
  valid_until TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'EXPECTED' CHECK (
    status IN ('EXPECTED', 'CHECKED_IN', 'CHECKED_OUT', 'CANCELLED', 'DENIED')
  ),
  check_in_at TIMESTAMPTZ,
  check_out_at TIMESTAMPTZ,
  check_in_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  check_out_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  gate_number TEXT DEFAULT 'Main Gate',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Indexes for gate queries and passcode lookup
CREATE INDEX IF NOT EXISTS idx_visitors_society ON public.visitors(society_id);
CREATE INDEX IF NOT EXISTS idx_visitors_unit ON public.visitors(unit_id);
CREATE INDEX IF NOT EXISTS idx_visitors_status ON public.visitors(status);
CREATE INDEX IF NOT EXISTS idx_visitors_pass_code ON public.visitors(society_id, pass_code);
CREATE INDEX IF NOT EXISTS idx_visitors_created_by ON public.visitors(created_by);
CREATE INDEX IF NOT EXISTS idx_visitors_expected ON public.visitors(expected_arrival);

-- 3. Enable RLS
ALTER TABLE public.visitors ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policies

-- Security Guards and Society Admins: View all visitors in their society
DROP POLICY IF EXISTS "Security and admins can view society visitors" ON public.visitors;
CREATE POLICY "Security and admins can view society visitors"
  ON public.visitors FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.society_memberships sm
      WHERE sm.society_id = visitors.society_id
        AND sm.user_id = auth.uid()
        AND sm.status = 'ACTIVE'
        AND sm.role_id IN ('SECURITY', 'SOCIETY_ADMIN', 'SECRETARY', 'MANAGER', 'COMMITTEE_MEMBER')
    )
    OR public.is_super_admin(auth.uid())
  );

-- Security Guards and Admins: Manage check-in and check-out
DROP POLICY IF EXISTS "Security and admins can update visitor gate status" ON public.visitors;
CREATE POLICY "Security and admins can update visitor gate status"
  ON public.visitors FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.society_memberships sm
      WHERE sm.society_id = visitors.society_id
        AND sm.user_id = auth.uid()
        AND sm.status = 'ACTIVE'
        AND sm.role_id IN ('SECURITY', 'SOCIETY_ADMIN', 'SECRETARY', 'MANAGER')
    )
    OR public.is_super_admin(auth.uid())
  );

-- Security Guards: Register direct walk-in visitors
DROP POLICY IF EXISTS "Security can insert walk-in visitors" ON public.visitors;
CREATE POLICY "Security can insert walk-in visitors"
  ON public.visitors FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.society_memberships sm
      WHERE sm.society_id = visitors.society_id
        AND sm.user_id = auth.uid()
        AND sm.status = 'ACTIVE'
        AND sm.role_id IN ('SECURITY', 'SOCIETY_ADMIN', 'SECRETARY', 'MANAGER')
    )
    OR public.is_super_admin(auth.uid())
  );

-- Residents: View visitors for their own units or created by themselves
DROP POLICY IF EXISTS "Residents can view visitors for their units" ON public.visitors;
CREATE POLICY "Residents can view visitors for their units"
  ON public.visitors FOR SELECT
  USING (
    visitors.created_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.unit_owners uo
      WHERE uo.unit_id = visitors.unit_id
        AND uo.user_id = auth.uid()
        AND uo.status = 'ACTIVE'
    )
    OR EXISTS (
      SELECT 1 FROM public.unit_occupancies uoc
      WHERE uoc.unit_id = visitors.unit_id
        AND uoc.user_id = auth.uid()
        AND uoc.status = 'ACTIVE'
    )
  );

-- Residents: Pre-invite visitors for units they own or occupy
DROP POLICY IF EXISTS "Residents can pre-invite visitors for their units" ON public.visitors;
CREATE POLICY "Residents can pre-invite visitors for their units"
  ON public.visitors FOR INSERT
  WITH CHECK (
    visitors.created_by = auth.uid()
    AND (
      EXISTS (
        SELECT 1 FROM public.unit_owners uo
        WHERE uo.unit_id = visitors.unit_id
          AND uo.user_id = auth.uid()
          AND uo.status = 'ACTIVE'
      )
      OR EXISTS (
        SELECT 1 FROM public.unit_occupancies uoc
        WHERE uoc.unit_id = visitors.unit_id
          AND uoc.user_id = auth.uid()
          AND uoc.status = 'ACTIVE'
      )
    )
  );

-- Residents: Cancel their own expected visitor passes
DROP POLICY IF EXISTS "Residents can cancel their expected visitor invites" ON public.visitors;
CREATE POLICY "Residents can cancel their expected visitor invites"
  ON public.visitors FOR UPDATE
  USING (
    visitors.created_by = auth.uid()
    AND visitors.status = 'EXPECTED'
  )
  WITH CHECK (
    visitors.status = 'CANCELLED'
  );
