-- DwellSync Phase 11.1 Migration: Governance Foundation & Complaint IDOR RLS Remediation
-- Establishes Committees, Committee Members (Temporal Appointments), Society Meeting Governance Metadata,
-- and tightens Complaint INSERT RLS to independently enforce Unit Authorization.

-- ============================================================================
-- 1. COMPLAINT RLS TIGHTENING (PRE-IMPLEMENTATION REMEDIATION)
-- ============================================================================

-- Ensure that complaints referencing a specific unit_id can ONLY be inserted by
-- active owners or occupants of that unit, or authorized society staff/admins/super_admins.
DROP POLICY IF EXISTS "Members can file complaints in their society" ON public.complaints;
CREATE POLICY "Members can file complaints in their society"
  ON public.complaints FOR INSERT
  WITH CHECK (
    created_by = auth.uid()
    AND (
      public.is_super_admin(auth.uid())
      OR (
        EXISTS (
          SELECT 1 FROM public.society_memberships sm
          WHERE sm.society_id = complaints.society_id
            AND sm.user_id = auth.uid()
            AND sm.status = 'ACTIVE'
        )
        AND (
          complaints.unit_id IS NULL
          OR public.has_society_role(auth.uid(), complaints.society_id, ARRAY['SOCIETY_ADMIN', 'SECRETARY', 'COMMITTEE_MEMBER', 'MANAGER', 'STAFF'])
          OR EXISTS (
            SELECT 1 FROM public.unit_owners uo
            WHERE uo.unit_id = complaints.unit_id
              AND uo.society_id = complaints.society_id
              AND uo.user_id = auth.uid()
              AND uo.status = 'ACTIVE'
          )
          OR EXISTS (
            SELECT 1 FROM public.unit_occupancies uoc
            WHERE uoc.unit_id = complaints.unit_id
              AND uoc.society_id = complaints.society_id
              AND uoc.user_id = auth.uid()
              AND uoc.status = 'ACTIVE'
          )
        )
      )
    )
  );

-- ============================================================================
-- 2. COMMITTEES TABLE (Formal Governing Bodies & Tenures)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.committees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  society_id UUID NOT NULL REFERENCES public.societies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  committee_type TEXT NOT NULL DEFAULT 'MANAGING_COMMITTEE' 
    CHECK (committee_type IN ('MANAGING_COMMITTEE', 'SUB_COMMITTEE', 'GRIEVANCE_COMMITTEE', 'ELECTION_COMMITTEE', 'OTHER')),
  term_start_date DATE NOT NULL,
  term_end_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'ACTIVE' 
    CHECK (status IN ('ACTIVE', 'EXPIRED', 'DISSOLVED')),
  description TEXT,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT chk_committee_term_dates CHECK (term_end_date >= term_start_date)
);

-- Ensure at most ONE active Managing Committee exists per society at any given time
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_active_managing_committee 
  ON public.committees (society_id) 
  WHERE (committee_type = 'MANAGING_COMMITTEE' AND status = 'ACTIVE');

CREATE INDEX IF NOT EXISTS idx_committees_society ON public.committees(society_id);
CREATE INDEX IF NOT EXISTS idx_committees_status ON public.committees(status);

-- ============================================================================
-- 3. COMMITTEE MEMBERS TABLE (Temporal Appointments & Succession History)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.committee_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  committee_id UUID NOT NULL REFERENCES public.committees(id) ON DELETE CASCADE,
  society_id UUID NOT NULL REFERENCES public.societies(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  designation TEXT NOT NULL 
    CHECK (designation IN ('PRESIDENT', 'VICE_PRESIDENT', 'CHAIRMAN', 'SECRETARY', 'JOINT_SECRETARY', 'TREASURER', 'JOINT_TREASURER', 'EXECUTIVE_MEMBER', 'INVITEE')),
  appointed_at DATE NOT NULL DEFAULT CURRENT_DATE,
  term_end_date DATE,
  resigned_at DATE,
  status TEXT NOT NULL DEFAULT 'ACTIVE' 
    CHECK (status IN ('ACTIVE', 'RESIGNED', 'REMOVED', 'EXPIRED')),
  voting_rights BOOLEAN NOT NULL DEFAULT true,
  replaced_by_id UUID REFERENCES public.committee_members(id) ON DELETE SET NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- A member can hold at most ONE active seat per committee
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_active_committee_member 
  ON public.committee_members (committee_id, user_id) 
  WHERE (status = 'ACTIVE');

-- Enforce single-holder offices for key designations in active committee
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_officer_per_committee 
  ON public.committee_members (committee_id, designation) 
  WHERE (status = 'ACTIVE' AND designation IN ('PRESIDENT', 'CHAIRMAN', 'SECRETARY', 'TREASURER'));

CREATE INDEX IF NOT EXISTS idx_committee_members_society ON public.committee_members(society_id);
CREATE INDEX IF NOT EXISTS idx_committee_members_committee ON public.committee_members(committee_id);
CREATE INDEX IF NOT EXISTS idx_committee_members_user ON public.committee_members(user_id);
CREATE INDEX IF NOT EXISTS idx_committee_members_status ON public.committee_members(status);

-- ============================================================================
-- 4. SOCIETY MEETINGS ENHANCEMENTS (Governance Metadata)
-- ============================================================================

ALTER TABLE public.society_meetings 
  ADD COLUMN IF NOT EXISTS committee_id UUID REFERENCES public.committees(id) ON DELETE SET NULL;

ALTER TABLE public.society_meetings 
  ADD COLUMN IF NOT EXISTS quorum_required INTEGER DEFAULT 0;

ALTER TABLE public.society_meetings 
  ADD COLUMN IF NOT EXISTS quorum_met BOOLEAN DEFAULT false;

ALTER TABLE public.society_meetings 
  ADD COLUMN IF NOT EXISTS presiding_officer_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_society_meetings_committee 
  ON public.society_meetings(committee_id);

-- ============================================================================
-- 5. ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

ALTER TABLE public.committees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.committee_members ENABLE ROW LEVEL SECURITY;

-- 5.1 Committees Policies
DROP POLICY IF EXISTS "Society members can view active committees" ON public.committees;
CREATE POLICY "Society members can view active committees"
  ON public.committees FOR SELECT
  USING (
    public.is_super_admin(auth.uid())
    OR (
      EXISTS (
        SELECT 1 FROM public.society_memberships sm
        WHERE sm.society_id = committees.society_id
          AND sm.user_id = auth.uid()
          AND sm.status = 'ACTIVE'
      )
      AND (
        status = 'ACTIVE'
        OR public.has_society_role(auth.uid(), committees.society_id, ARRAY['SOCIETY_ADMIN', 'SECRETARY', 'COMMITTEE_MEMBER', 'TREASURER', 'MANAGER'])
      )
    )
  );

DROP POLICY IF EXISTS "Admins and secretaries can manage committees" ON public.committees;
CREATE POLICY "Admins and secretaries can manage committees"
  ON public.committees FOR ALL
  USING (
    public.is_super_admin(auth.uid())
    OR public.has_society_role(auth.uid(), committees.society_id, ARRAY['SOCIETY_ADMIN', 'SECRETARY'])
  )
  WITH CHECK (
    public.is_super_admin(auth.uid())
    OR public.has_society_role(auth.uid(), committees.society_id, ARRAY['SOCIETY_ADMIN', 'SECRETARY'])
  );

-- 5.2 Committee Members Policies
DROP POLICY IF EXISTS "Society members can view committee appointments" ON public.committee_members;
CREATE POLICY "Society members can view committee appointments"
  ON public.committee_members FOR SELECT
  USING (
    public.is_super_admin(auth.uid())
    OR (
      EXISTS (
        SELECT 1 FROM public.society_memberships sm
        WHERE sm.society_id = committee_members.society_id
          AND sm.user_id = auth.uid()
          AND sm.status = 'ACTIVE'
      )
      AND (
        status = 'ACTIVE'
        OR public.has_society_role(auth.uid(), committee_members.society_id, ARRAY['SOCIETY_ADMIN', 'SECRETARY', 'COMMITTEE_MEMBER', 'TREASURER', 'MANAGER'])
      )
    )
  );

DROP POLICY IF EXISTS "Admins and secretaries can insert committee members" ON public.committee_members;
CREATE POLICY "Admins and secretaries can insert committee members"
  ON public.committee_members FOR INSERT
  WITH CHECK (
    public.is_super_admin(auth.uid())
    OR public.has_society_role(auth.uid(), committee_members.society_id, ARRAY['SOCIETY_ADMIN', 'SECRETARY'])
  );

DROP POLICY IF EXISTS "Admins and secretaries can update committee members" ON public.committee_members;
CREATE POLICY "Admins and secretaries can update committee members"
  ON public.committee_members FOR UPDATE
  USING (
    public.is_super_admin(auth.uid())
    OR public.has_society_role(auth.uid(), committee_members.society_id, ARRAY['SOCIETY_ADMIN', 'SECRETARY'])
  )
  WITH CHECK (
    public.is_super_admin(auth.uid())
    OR public.has_society_role(auth.uid(), committee_members.society_id, ARRAY['SOCIETY_ADMIN', 'SECRETARY'])
  );

DROP POLICY IF EXISTS "Only super admins can delete committee records" ON public.committee_members;
CREATE POLICY "Only super admins can delete committee records"
  ON public.committee_members FOR DELETE
  USING (public.is_super_admin(auth.uid()));

