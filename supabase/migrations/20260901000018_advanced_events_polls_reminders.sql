-- ============================================================
-- DwellSync Migration: Advanced Events + Polls + Reminders
-- Version: 20260901000018_advanced_events_polls_reminders.sql
-- Description:
--   1. Enhances public.society_events with capacity, audience & expanded lifecycle.
--   2. Introduces public.event_rsvps for capacity enforcement & attendee tracking.
--   3. Introduces public.society_polls, public.poll_options, and public.poll_votes.
--   4. Introduces public.activity_reminders for automated scheduled notifications.
--   5. Implements multi-tenant RLS policies with idempotent DROP POLICY guards.
-- ============================================================

-- ------------------------------------------------------------
-- 1. ENHANCE public.society_events
-- ------------------------------------------------------------
ALTER TABLE public.society_events
  ADD COLUMN IF NOT EXISTS capacity INTEGER CHECK (capacity IS NULL OR capacity > 0),
  ADD COLUMN IF NOT EXISTS target_audience TEXT NOT NULL DEFAULT 'ALL_RESIDENTS';

-- Ensure target_audience check constraint
DO $$
BEGIN
  ALTER TABLE public.society_events DROP CONSTRAINT IF EXISTS society_events_target_audience_check;
  ALTER TABLE public.society_events ADD CONSTRAINT society_events_target_audience_check
    CHECK (target_audience IN ('ALL_RESIDENTS', 'OWNERS_ONLY', 'COMMITTEE_ONLY'));
EXCEPTION
  WHEN OTHERS THEN NULL;
END $$;

-- Expand status check constraint to include DRAFT, PUBLISHED, UPCOMING, COMPLETED, CANCELLED
DO $$
BEGIN
  ALTER TABLE public.society_events DROP CONSTRAINT IF EXISTS society_events_status_check;
  ALTER TABLE public.society_events ADD CONSTRAINT society_events_status_check
    CHECK (status IN ('DRAFT', 'PUBLISHED', 'UPCOMING', 'COMPLETED', 'CANCELLED'));
EXCEPTION
  WHEN OTHERS THEN NULL;
END $$;

-- ------------------------------------------------------------
-- 2. EVENT RSVPs TABLE
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.event_rsvps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  society_id UUID NOT NULL REFERENCES public.societies(id) ON DELETE CASCADE,
  event_id UUID NOT NULL REFERENCES public.society_events(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  response TEXT NOT NULL CHECK (response IN ('GOING', 'NOT_GOING', 'MAYBE')),
  guests_count INTEGER NOT NULL DEFAULT 0 CHECK (guests_count >= 0),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_event_rsvps_event_user UNIQUE (event_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_event_rsvps_society ON public.event_rsvps(society_id);
CREATE INDEX IF NOT EXISTS idx_event_rsvps_event ON public.event_rsvps(event_id);
CREATE INDEX IF NOT EXISTS idx_event_rsvps_user ON public.event_rsvps(user_id);
CREATE INDEX IF NOT EXISTS idx_event_rsvps_response ON public.event_rsvps(event_id, response);

-- ------------------------------------------------------------
-- 3. SOCIETY POLLS TABLE
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.society_polls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  society_id UUID NOT NULL REFERENCES public.societies(id) ON DELETE CASCADE,
  title TEXT NOT NULL CHECK (char_length(title) >= 3 AND char_length(title) <= 200),
  description TEXT,
  question TEXT NOT NULL CHECK (char_length(question) >= 5),
  poll_type TEXT NOT NULL DEFAULT 'SINGLE_CHOICE' CHECK (poll_type IN ('SINGLE_CHOICE', 'MULTIPLE_CHOICE')),
  target_audience TEXT NOT NULL DEFAULT 'ALL_RESIDENTS' CHECK (target_audience IN ('ALL_RESIDENTS', 'OWNERS_ONLY', 'COMMITTEE_ONLY')),
  is_anonymous BOOLEAN NOT NULL DEFAULT false,
  results_visibility TEXT NOT NULL DEFAULT 'ALWAYS' CHECK (results_visibility IN ('ALWAYS', 'AFTER_VOTING', 'AFTER_CLOSE', 'ADMIN_ONLY')),
  starts_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ends_at TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'PUBLISHED', 'CLOSED', 'CANCELLED')),
  created_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  updated_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_society_polls_society ON public.society_polls(society_id);
CREATE INDEX IF NOT EXISTS idx_society_polls_status ON public.society_polls(society_id, status);
CREATE INDEX IF NOT EXISTS idx_society_polls_ends_at ON public.society_polls(society_id, ends_at);

-- ------------------------------------------------------------
-- 4. POLL OPTIONS TABLE
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.poll_options (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  society_id UUID NOT NULL REFERENCES public.societies(id) ON DELETE CASCADE,
  poll_id UUID NOT NULL REFERENCES public.society_polls(id) ON DELETE CASCADE,
  option_text TEXT NOT NULL CHECK (char_length(option_text) >= 1),
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_poll_options_poll ON public.poll_options(poll_id, display_order);
CREATE INDEX IF NOT EXISTS idx_poll_options_society ON public.poll_options(society_id);

-- ------------------------------------------------------------
-- 5. POLL VOTES TABLE
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.poll_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  society_id UUID NOT NULL REFERENCES public.societies(id) ON DELETE CASCADE,
  poll_id UUID NOT NULL REFERENCES public.society_polls(id) ON DELETE CASCADE,
  option_id UUID NOT NULL REFERENCES public.poll_options(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_poll_votes_poll_option_user UNIQUE (poll_id, option_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_poll_votes_poll ON public.poll_votes(poll_id);
CREATE INDEX IF NOT EXISTS idx_poll_votes_user ON public.poll_votes(user_id);
CREATE INDEX IF NOT EXISTS idx_poll_votes_option ON public.poll_votes(option_id);

-- ------------------------------------------------------------
-- 6. ACTIVITY REMINDERS TABLE
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.activity_reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  society_id UUID NOT NULL REFERENCES public.societies(id) ON DELETE CASCADE,
  target_type TEXT NOT NULL CHECK (target_type IN ('EVENT', 'POLL')),
  target_id UUID NOT NULL,
  reminder_type TEXT NOT NULL CHECK (reminder_type IN ('HOURS_BEFORE_START', 'HOURS_BEFORE_END', 'EXACT_TIME')),
  trigger_offset_hours INTEGER,
  scheduled_at TIMESTAMPTZ NOT NULL,
  audience TEXT NOT NULL DEFAULT 'ALL_ELIGIBLE' CHECK (audience IN ('ALL_ELIGIBLE', 'RSVP_GOING', 'NON_VOTERS')),
  status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'SENT', 'FAILED', 'CANCELLED')),
  sent_at TIMESTAMPTZ,
  recipients_count INTEGER DEFAULT 0,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_activity_reminders_status ON public.activity_reminders(society_id, status, scheduled_at);
CREATE INDEX IF NOT EXISTS idx_activity_reminders_target ON public.activity_reminders(target_id, target_type);

-- ------------------------------------------------------------
-- 7. ENABLE ROW LEVEL SECURITY
-- ------------------------------------------------------------
ALTER TABLE public.event_rsvps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.society_polls ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.poll_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.poll_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_reminders ENABLE ROW LEVEL SECURITY;

-- ------------------------------------------------------------
-- 8. RLS POLICIES (Idempotent DROP POLICY IF EXISTS)
-- ------------------------------------------------------------

-- Helper check functions or direct membership checks:

-- --- EVENT RSVPs POLICIES ---
DROP POLICY IF EXISTS "Members can view event RSVPs" ON public.event_rsvps;
CREATE POLICY "Members can view event RSVPs"
  ON public.event_rsvps FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.society_memberships sm
      WHERE sm.society_id = event_rsvps.society_id
        AND sm.user_id = auth.uid()
        AND sm.status = 'ACTIVE'
    )
  );

DROP POLICY IF EXISTS "Members can insert their own event RSVPs" ON public.event_rsvps;
CREATE POLICY "Members can insert their own event RSVPs"
  ON public.event_rsvps FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.society_memberships sm
      WHERE sm.society_id = event_rsvps.society_id
        AND sm.user_id = auth.uid()
        AND sm.status = 'ACTIVE'
    )
  );

DROP POLICY IF EXISTS "Members can update their own event RSVPs" ON public.event_rsvps;
CREATE POLICY "Members can update their own event RSVPs"
  ON public.event_rsvps FOR UPDATE
  USING (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.society_memberships sm
      WHERE sm.society_id = event_rsvps.society_id
        AND sm.user_id = auth.uid()
        AND sm.status = 'ACTIVE'
    )
  );

DROP POLICY IF EXISTS "Admins and committee can manage all RSVPs" ON public.event_rsvps;
CREATE POLICY "Admins and committee can manage all RSVPs"
  ON public.event_rsvps FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.society_memberships sm
      WHERE sm.society_id = event_rsvps.society_id
        AND sm.user_id = auth.uid()
        AND sm.status = 'ACTIVE'
        AND sm.role_id IN ('SUPER_ADMIN', 'SOCIETY_ADMIN', 'SECRETARY', 'COMMITTEE_MEMBER', 'MANAGER')
    )
  );

-- --- SOCIETY POLLS POLICIES ---
DROP POLICY IF EXISTS "Members view published polls" ON public.society_polls;
CREATE POLICY "Members view published polls"
  ON public.society_polls FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.society_memberships sm
      WHERE sm.society_id = society_polls.society_id
        AND sm.user_id = auth.uid()
        AND sm.status = 'ACTIVE'
        AND (
          -- Admin/committee can view all statuses (DRAFT, PUBLISHED, CLOSED, CANCELLED)
          sm.role_id IN ('SUPER_ADMIN', 'SOCIETY_ADMIN', 'SECRETARY', 'COMMITTEE_MEMBER', 'MANAGER')
          OR (
            society_polls.status IN ('PUBLISHED', 'CLOSED')
            AND (
              society_polls.target_audience = 'ALL_RESIDENTS'
              OR (society_polls.target_audience = 'OWNERS_ONLY' AND sm.role_id = 'OWNER')
              OR (society_polls.target_audience = 'COMMITTEE_ONLY' AND sm.role_id IN ('SECRETARY', 'COMMITTEE_MEMBER', 'TREASURER'))
            )
          )
        )
    )
  );

DROP POLICY IF EXISTS "Admins and committee manage polls" ON public.society_polls;
CREATE POLICY "Admins and committee manage polls"
  ON public.society_polls FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.society_memberships sm
      WHERE sm.society_id = society_polls.society_id
        AND sm.user_id = auth.uid()
        AND sm.status = 'ACTIVE'
        AND sm.role_id IN ('SUPER_ADMIN', 'SOCIETY_ADMIN', 'SECRETARY', 'COMMITTEE_MEMBER', 'MANAGER')
    )
  );

-- --- POLL OPTIONS POLICIES ---
DROP POLICY IF EXISTS "Members view poll options" ON public.poll_options;
CREATE POLICY "Members view poll options"
  ON public.poll_options FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.society_polls sp
      JOIN public.society_memberships sm ON sm.society_id = sp.society_id
      WHERE sp.id = poll_options.poll_id
        AND sm.user_id = auth.uid()
        AND sm.status = 'ACTIVE'
    )
  );

DROP POLICY IF EXISTS "Admins and committee manage poll options" ON public.poll_options;
CREATE POLICY "Admins and committee manage poll options"
  ON public.poll_options FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.society_memberships sm
      WHERE sm.society_id = poll_options.society_id
        AND sm.user_id = auth.uid()
        AND sm.status = 'ACTIVE'
        AND sm.role_id IN ('SUPER_ADMIN', 'SOCIETY_ADMIN', 'SECRETARY', 'COMMITTEE_MEMBER', 'MANAGER')
    )
  );

-- --- POLL VOTES POLICIES ---
DROP POLICY IF EXISTS "Members view their own votes" ON public.poll_votes;
CREATE POLICY "Members view their own votes"
  ON public.poll_votes FOR SELECT
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.society_memberships sm
      WHERE sm.society_id = poll_votes.society_id
        AND sm.user_id = auth.uid()
        AND sm.status = 'ACTIVE'
        AND sm.role_id IN ('SUPER_ADMIN', 'SOCIETY_ADMIN', 'SECRETARY', 'COMMITTEE_MEMBER', 'MANAGER')
    )
  );

DROP POLICY IF EXISTS "Members cast their own vote" ON public.poll_votes;
CREATE POLICY "Members cast their own vote"
  ON public.poll_votes FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.society_memberships sm
      WHERE sm.society_id = poll_votes.society_id
        AND sm.user_id = auth.uid()
        AND sm.status = 'ACTIVE'
    )
  );

-- --- ACTIVITY REMINDERS POLICIES ---
DROP POLICY IF EXISTS "Admins and committee manage activity reminders" ON public.activity_reminders;
CREATE POLICY "Admins and committee manage activity reminders"
  ON public.activity_reminders FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.society_memberships sm
      WHERE sm.society_id = activity_reminders.society_id
        AND sm.user_id = auth.uid()
        AND sm.status = 'ACTIVE'
        AND sm.role_id IN ('SUPER_ADMIN', 'SOCIETY_ADMIN', 'SECRETARY', 'COMMITTEE_MEMBER', 'MANAGER')
    )
  );
