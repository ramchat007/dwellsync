-- DwellSync Phase 11.3 Migration: Governance Committee Meetings & Proceedings
-- Hardens society_meetings with composite tenant constraints and introduces
-- meeting_agendas, meeting_attendees, meeting_minutes, and meeting_action_items with strict RLS.

-- ============================================================================
-- 1. HARDEN SOCIETY_MEETINGS WITH COMPOSITE CONSTRAINTS
-- ============================================================================

-- 1.1 Add unique constraint on society_meetings(id, society_id) to serve as composite target
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'uq_society_meetings_id_society'
  ) THEN
    ALTER TABLE public.society_meetings
      ADD CONSTRAINT uq_society_meetings_id_society UNIQUE (id, society_id);
  END IF;
END $$;

-- 1.2 Add composite foreign key from society_meetings to committees(id, society_id)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fk_society_meetings_committee_society'
  ) THEN
    ALTER TABLE public.society_meetings
      ADD CONSTRAINT fk_society_meetings_committee_society
      FOREIGN KEY (committee_id, society_id)
      REFERENCES public.committees(id, society_id)
      ON DELETE SET NULL;
      ON DELETE RESTRICT;
  END IF;
END $$;

-- ============================================================================
-- 2. MEETING AGENDAS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.meeting_agendas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  society_id UUID NOT NULL REFERENCES public.societies(id) ON DELETE CASCADE,
  meeting_id UUID NOT NULL,
  item_order INTEGER NOT NULL DEFAULT 1 CHECK (item_order > 0),
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'DISCUSSED', 'DEFERRED')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT fk_meeting_agendas_meeting_society
    FOREIGN KEY (meeting_id, society_id)
    REFERENCES public.society_meetings(id, society_id)
    ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_meeting_agendas_meeting_order 
  ON public.meeting_agendas(meeting_id, item_order);
CREATE INDEX IF NOT EXISTS idx_meeting_agendas_society 
  ON public.meeting_agendas(society_id);

-- ============================================================================
-- 3. MEETING ATTENDEES TABLE (Attendance & Quorum Verification)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.meeting_attendees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  society_id UUID NOT NULL REFERENCES public.societies(id) ON DELETE CASCADE,
  meeting_id UUID NOT NULL,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  attendee_type TEXT NOT NULL DEFAULT 'MEMBER' CHECK (attendee_type IN ('MEMBER', 'INVITEE', 'SPECIAL_GUEST')),
  attended BOOLEAN NOT NULL DEFAULT true,
  marked_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  notes TEXT,
  CONSTRAINT uq_meeting_attendees_meeting_user UNIQUE (meeting_id, user_id),
  CONSTRAINT fk_meeting_attendees_meeting_society
    FOREIGN KEY (meeting_id, society_id)
    REFERENCES public.society_meetings(id, society_id)
    ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_meeting_attendees_meeting 
  ON public.meeting_attendees(meeting_id);
CREATE INDEX IF NOT EXISTS idx_meeting_attendees_user 
  ON public.meeting_attendees(user_id);
CREATE INDEX IF NOT EXISTS idx_meeting_attendees_society 
  ON public.meeting_attendees(society_id);

-- ============================================================================
-- 4. MEETING MINUTES TABLE (Proceedings & Non-Binding Decisions)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.meeting_minutes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  society_id UUID NOT NULL REFERENCES public.societies(id) ON DELETE CASCADE,
  meeting_id UUID NOT NULL UNIQUE,
  content_summary TEXT NOT NULL,
  decisions_summary TEXT,
  recorded_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  status TEXT NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'PUBLISHED')),
  published_at TIMESTAMPTZ,
  published_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT fk_meeting_minutes_meeting_society
    FOREIGN KEY (meeting_id, society_id)
    REFERENCES public.society_meetings(id, society_id)
    ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_meeting_minutes_meeting 
  ON public.meeting_minutes(meeting_id);
CREATE INDEX IF NOT EXISTS idx_meeting_minutes_society 
  ON public.meeting_minutes(society_id);
CREATE INDEX IF NOT EXISTS idx_meeting_minutes_status 
  ON public.meeting_minutes(status);

-- ============================================================================
-- 5. MEETING ACTION ITEMS TABLE (Post-Meeting Administrative Tasks)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.meeting_action_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  society_id UUID NOT NULL REFERENCES public.societies(id) ON DELETE CASCADE,
  meeting_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  assigned_to UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  due_date DATE,
  status TEXT NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED')),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT fk_meeting_action_items_meeting_society
    FOREIGN KEY (meeting_id, society_id)
    REFERENCES public.society_meetings(id, society_id)
    ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_meeting_action_items_meeting 
  ON public.meeting_action_items(meeting_id);
CREATE INDEX IF NOT EXISTS idx_meeting_action_items_assigned 
  ON public.meeting_action_items(assigned_to);
CREATE INDEX IF NOT EXISTS idx_meeting_action_items_society 
  ON public.meeting_action_items(society_id);
CREATE INDEX IF NOT EXISTS idx_meeting_action_items_status 
  ON public.meeting_action_items(status);

-- ============================================================================
-- 6. ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

ALTER TABLE public.meeting_agendas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meeting_attendees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meeting_minutes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meeting_action_items ENABLE ROW LEVEL SECURITY;

-- 6.1 Meeting Agendas RLS
DROP POLICY IF EXISTS "Members can view meeting agendas" ON public.meeting_agendas;
CREATE POLICY "Members can view meeting agendas"
  ON public.meeting_agendas FOR SELECT
  USING (
    public.is_super_admin(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.society_meetings sm
      JOIN public.society_memberships smem ON smem.society_id = sm.society_id
      WHERE sm.id = meeting_agendas.meeting_id
        AND smem.user_id = auth.uid()
        AND smem.status = 'ACTIVE'
        AND (
          sm.meeting_type IN ('AGM', 'EGM', 'GENERAL')
          OR smem.role_id IN ('SOCIETY_ADMIN', 'SECRETARY', 'COMMITTEE_MEMBER', 'TREASURER', 'MANAGER')
        )
    )
  );

DROP POLICY IF EXISTS "Admins and secretaries can manage agendas" ON public.meeting_agendas;
CREATE POLICY "Admins and secretaries can manage agendas"
  ON public.meeting_agendas FOR ALL
  USING (
    public.is_super_admin(auth.uid())
    OR public.has_society_role(auth.uid(), meeting_agendas.society_id, ARRAY['SOCIETY_ADMIN', 'SECRETARY'])
  )
  WITH CHECK (
    public.is_super_admin(auth.uid())
    OR public.has_society_role(auth.uid(), meeting_agendas.society_id, ARRAY['SOCIETY_ADMIN', 'SECRETARY'])
  );

-- 6.2 Meeting Attendees RLS
DROP POLICY IF EXISTS "Management and attendee can view attendance" ON public.meeting_attendees;
CREATE POLICY "Management and attendee can view attendance"
  ON public.meeting_attendees FOR SELECT
  USING (
    public.is_super_admin(auth.uid())
    OR user_id = auth.uid()
    OR public.has_society_role(auth.uid(), meeting_attendees.society_id, ARRAY['SOCIETY_ADMIN', 'SECRETARY', 'COMMITTEE_MEMBER', 'TREASURER', 'MANAGER'])
  );

DROP POLICY IF EXISTS "Admins and secretaries can manage attendees" ON public.meeting_attendees;
CREATE POLICY "Admins and secretaries can manage attendees"
  ON public.meeting_attendees FOR INSERT
  WITH CHECK (
    public.is_super_admin(auth.uid())
    OR public.has_society_role(auth.uid(), meeting_attendees.society_id, ARRAY['SOCIETY_ADMIN', 'SECRETARY'])
  );

DROP POLICY IF EXISTS "Admins and secretaries can update attendees" ON public.meeting_attendees;
CREATE POLICY "Admins and secretaries can update attendees"
  ON public.meeting_attendees FOR UPDATE
  USING (
    public.is_super_admin(auth.uid())
    OR public.has_society_role(auth.uid(), meeting_attendees.society_id, ARRAY['SOCIETY_ADMIN', 'SECRETARY'])
  )
  WITH CHECK (
    public.is_super_admin(auth.uid())
    OR public.has_society_role(auth.uid(), meeting_attendees.society_id, ARRAY['SOCIETY_ADMIN', 'SECRETARY'])
  );

DROP POLICY IF EXISTS "Only super admins can delete attendees" ON public.meeting_attendees;
CREATE POLICY "Only super admins can delete attendees"
  ON public.meeting_attendees FOR DELETE
  USING (public.is_super_admin(auth.uid()));

-- 6.3 Meeting Minutes RLS
DROP POLICY IF EXISTS "Members can view published minutes and management can view drafts" ON public.meeting_minutes;
CREATE POLICY "Members can view published minutes and management can view drafts"
  ON public.meeting_minutes FOR SELECT
  USING (
    public.is_super_admin(auth.uid())
    OR (
      EXISTS (
        SELECT 1 FROM public.society_memberships sm
        WHERE sm.society_id = meeting_minutes.society_id
          AND sm.user_id = auth.uid()
          AND sm.status = 'ACTIVE'
      )
      AND (
        meeting_minutes.status = 'PUBLISHED'
        OR public.has_society_role(auth.uid(), meeting_minutes.society_id, ARRAY['SOCIETY_ADMIN', 'SECRETARY', 'COMMITTEE_MEMBER', 'TREASURER', 'MANAGER'])
      )
    )
  );

DROP POLICY IF EXISTS "Admins and secretaries can insert minutes" ON public.meeting_minutes;
CREATE POLICY "Admins and secretaries can insert minutes"
  ON public.meeting_minutes FOR INSERT
  WITH CHECK (
    public.is_super_admin(auth.uid())
    OR public.has_society_role(auth.uid(), meeting_minutes.society_id, ARRAY['SOCIETY_ADMIN', 'SECRETARY'])
  );

DROP POLICY IF EXISTS "Admins and secretaries can update draft minutes" ON public.meeting_minutes;
CREATE POLICY "Admins and secretaries can update draft minutes"
  ON public.meeting_minutes FOR UPDATE
  USING (
    (public.is_super_admin(auth.uid())
     OR public.has_society_role(auth.uid(), meeting_minutes.society_id, ARRAY['SOCIETY_ADMIN', 'SECRETARY']))
    AND meeting_minutes.status = 'DRAFT'
  )
  WITH CHECK (
    public.is_super_admin(auth.uid())
    OR public.has_society_role(auth.uid(), meeting_minutes.society_id, ARRAY['SOCIETY_ADMIN', 'SECRETARY'])
  );

-- 6.4 Meeting Action Items RLS
DROP POLICY IF EXISTS "Management and assignees can view action items" ON public.meeting_action_items;
CREATE POLICY "Management and assignees can view action items"
  ON public.meeting_action_items FOR SELECT
  USING (
    public.is_super_admin(auth.uid())
    OR assigned_to = auth.uid()
    OR public.has_society_role(auth.uid(), meeting_action_items.society_id, ARRAY['SOCIETY_ADMIN', 'SECRETARY', 'COMMITTEE_MEMBER', 'TREASURER', 'MANAGER'])
  );

DROP POLICY IF EXISTS "Admins and secretaries can manage action items" ON public.meeting_action_items;
CREATE POLICY "Admins and secretaries can manage action items"
  ON public.meeting_action_items FOR INSERT
  WITH CHECK (
    public.is_super_admin(auth.uid())
    OR public.has_society_role(auth.uid(), meeting_action_items.society_id, ARRAY['SOCIETY_ADMIN', 'SECRETARY'])
  );

DROP POLICY IF EXISTS "Admins, secretaries, and assignees can update action items" ON public.meeting_action_items;
CREATE POLICY "Admins, secretaries, and assignees can update action items"
  ON public.meeting_action_items FOR UPDATE
  USING (
    public.is_super_admin(auth.uid())
    OR public.has_society_role(auth.uid(), meeting_action_items.society_id, ARRAY['SOCIETY_ADMIN', 'SECRETARY'])
    OR assigned_to = auth.uid()
  )
  WITH CHECK (
    public.is_super_admin(auth.uid())
    OR public.has_society_role(auth.uid(), meeting_action_items.society_id, ARRAY['SOCIETY_ADMIN', 'SECRETARY'])
    OR assigned_to = auth.uid()
  );
