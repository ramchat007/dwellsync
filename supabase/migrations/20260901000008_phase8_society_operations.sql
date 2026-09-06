-- DwellSyncHub Phase 8: Society Operations Migration
-- Creates complaints, amenities, amenity_bookings, society_events, society_meetings with strict multi-tenant RLS

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- 1. COMPLAINTS & SERVICE REQUESTS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.complaints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  society_id UUID NOT NULL REFERENCES public.societies(id) ON DELETE CASCADE,
  unit_id UUID REFERENCES public.units(id) ON DELETE SET NULL,
  created_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL CHECK (
    category IN ('ELECTRICAL', 'PLUMBING', 'ELEVATOR', 'COMMON_AREA', 'SECURITY', 'NOISE', 'CARPENTRY', 'CLEANLINESS', 'OTHER')
  ),
  priority TEXT NOT NULL DEFAULT 'MEDIUM' CHECK (
    priority IN ('LOW', 'MEDIUM', 'HIGH', 'EMERGENCY')
  ),
  status TEXT NOT NULL DEFAULT 'SUBMITTED' CHECK (
    status IN ('SUBMITTED', 'ASSIGNED', 'IN_PROGRESS', 'RESOLVED', 'CLOSED')
  ),
  assigned_to UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  resolved_at TIMESTAMPTZ,
  closed_at TIMESTAMPTZ,
  resolution_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 2. AMENITIES TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.amenities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  society_id UUID NOT NULL REFERENCES public.societies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL CHECK (
    category IN ('CLUBHOUSE', 'GYM', 'SWIMMING_POOL', 'TENNIS_COURT', 'COMMUNITY_HALL', 'ROOFTOP', 'BADMINTON_COURT', 'OTHER')
  ),
  capacity INTEGER,
  operating_hours_start TEXT DEFAULT '06:00',
  operating_hours_end TEXT DEFAULT '22:00',
  slot_duration_minutes INTEGER DEFAULT 60,
  rules TEXT,
  status TEXT NOT NULL DEFAULT 'AVAILABLE' CHECK (
    status IN ('AVAILABLE', 'MAINTENANCE', 'CLOSED')
  ),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 3. AMENITY BOOKINGS TABLE (Strictly Non-Monetary)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.amenity_bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  society_id UUID NOT NULL REFERENCES public.societies(id) ON DELETE CASCADE,
  amenity_id UUID NOT NULL REFERENCES public.amenities(id) ON DELETE CASCADE,
  unit_id UUID REFERENCES public.units(id) ON DELETE SET NULL,
  booked_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  booking_date DATE NOT NULL,
  start_time TEXT NOT NULL,
  end_time TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'CONFIRMED' CHECK (
    status IN ('CONFIRMED', 'CANCELLED', 'COMPLETED')
  ),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 4. SOCIETY EVENTS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.society_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  society_id UUID NOT NULL REFERENCES public.societies(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'GENERAL' CHECK (
    category IN ('CELEBRATION', 'MEETING', 'WORKSHOP', 'SPORTS', 'CULTURAL', 'GENERAL')
  ),
  event_date DATE NOT NULL,
  start_time TEXT,
  end_time TEXT,
  location TEXT NOT NULL,
  organizer_name TEXT,
  organizer_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  visibility TEXT NOT NULL DEFAULT 'ALL_RESIDENTS' CHECK (
    visibility IN ('ALL_RESIDENTS', 'COMMITTEE_ONLY')
  ),
  status TEXT NOT NULL DEFAULT 'UPCOMING' CHECK (
    status IN ('UPCOMING', 'COMPLETED', 'CANCELLED')
  ),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 5. SOCIETY MEETINGS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.society_meetings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  society_id UUID NOT NULL REFERENCES public.societies(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  agenda TEXT,
  meeting_type TEXT NOT NULL CHECK (
    meeting_type IN ('AGM', 'EGM', 'MANAGING_COMMITTEE', 'VENDOR', 'GENERAL')
  ),
  location_type TEXT NOT NULL DEFAULT 'PHYSICAL' CHECK (
    location_type IN ('PHYSICAL', 'ONLINE', 'HYBRID')
  ),
  location_details TEXT,
  meeting_link TEXT,
  scheduled_at TIMESTAMPTZ NOT NULL,
  duration_minutes INTEGER DEFAULT 60,
  status TEXT NOT NULL DEFAULT 'SCHEDULED' CHECK (
    status IN ('SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED')
  ),
  minutes_document_id UUID REFERENCES public.documents(id) ON DELETE SET NULL,
  organized_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- INDEXES FOR MAXIMUM QUERY PERFORMANCE
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_complaints_society ON public.complaints(society_id);
CREATE INDEX IF NOT EXISTS idx_complaints_created_by ON public.complaints(created_by);
CREATE INDEX IF NOT EXISTS idx_complaints_assigned_to ON public.complaints(assigned_to);
CREATE INDEX IF NOT EXISTS idx_complaints_status ON public.complaints(status);
CREATE INDEX IF NOT EXISTS idx_complaints_priority ON public.complaints(priority);
CREATE INDEX IF NOT EXISTS idx_complaints_unit ON public.complaints(unit_id);

CREATE INDEX IF NOT EXISTS idx_amenities_society ON public.amenities(society_id);
CREATE INDEX IF NOT EXISTS idx_amenities_status ON public.amenities(status);

CREATE INDEX IF NOT EXISTS idx_amenity_bookings_amenity_date ON public.amenity_bookings(amenity_id, booking_date);
CREATE INDEX IF NOT EXISTS idx_amenity_bookings_society ON public.amenity_bookings(society_id);
CREATE INDEX IF NOT EXISTS idx_amenity_bookings_user ON public.amenity_bookings(booked_by);
CREATE INDEX IF NOT EXISTS idx_amenity_bookings_status ON public.amenity_bookings(status);

CREATE INDEX IF NOT EXISTS idx_society_events_society_date ON public.society_events(society_id, event_date);
CREATE INDEX IF NOT EXISTS idx_society_events_status ON public.society_events(status);

CREATE INDEX IF NOT EXISTS idx_society_meetings_society_time ON public.society_meetings(society_id, scheduled_at);
CREATE INDEX IF NOT EXISTS idx_society_meetings_status ON public.society_meetings(status);

-- ============================================================
-- ENABLE ROW LEVEL SECURITY
-- ============================================================
ALTER TABLE public.complaints ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.amenities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.amenity_bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.society_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.society_meetings ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- COMPLAINTS RLS POLICIES
-- ============================================================
DROP POLICY IF EXISTS "Residents can view own complaints or admins see society complaints" ON public.complaints;
CREATE POLICY "Residents can view own complaints or admins see society complaints"
  ON public.complaints FOR SELECT
  USING (
    created_by = auth.uid()
    OR assigned_to = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.society_memberships sm
      WHERE sm.society_id = complaints.society_id
        AND sm.user_id = auth.uid()
        AND sm.status = 'ACTIVE'
        AND sm.role_id IN ('SOCIETY_ADMIN', 'SECRETARY', 'COMMITTEE_MEMBER', 'MANAGER', 'STAFF')
    )
    OR public.is_super_admin(auth.uid())
  );

DROP POLICY IF EXISTS "Members can file complaints in their society" ON public.complaints;
CREATE POLICY "Members can file complaints in their society"
  ON public.complaints FOR INSERT
  WITH CHECK (
    created_by = auth.uid()
    AND (
      EXISTS (
        SELECT 1 FROM public.society_memberships sm
        WHERE sm.society_id = complaints.society_id
          AND sm.user_id = auth.uid()
          AND sm.status = 'ACTIVE'
      )
      OR public.is_super_admin(auth.uid())
    )
  );

DROP POLICY IF EXISTS "Staff and admins can update complaints" ON public.complaints;
CREATE POLICY "Staff and admins can update complaints"
  ON public.complaints FOR UPDATE
  USING (
    created_by = auth.uid()
    OR assigned_to = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.society_memberships sm
      WHERE sm.society_id = complaints.society_id
        AND sm.user_id = auth.uid()
        AND sm.status = 'ACTIVE'
        AND sm.role_id IN ('SOCIETY_ADMIN', 'SECRETARY', 'COMMITTEE_MEMBER', 'MANAGER', 'STAFF')
    )
    OR public.is_super_admin(auth.uid())
  );

-- ============================================================
-- AMENITIES RLS POLICIES
-- ============================================================
DROP POLICY IF EXISTS "Members can view amenities in their society" ON public.amenities;
CREATE POLICY "Members can view amenities in their society"
  ON public.amenities FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.society_memberships sm
      WHERE sm.society_id = amenities.society_id
        AND sm.user_id = auth.uid()
        AND sm.status = 'ACTIVE'
    )
    OR public.is_super_admin(auth.uid())
  );

DROP POLICY IF EXISTS "Admins and managers can manage amenities" ON public.amenities;
CREATE POLICY "Admins and managers can manage amenities"
  ON public.amenities FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.society_memberships sm
      WHERE sm.society_id = amenities.society_id
        AND sm.user_id = auth.uid()
        AND sm.status = 'ACTIVE'
        AND sm.role_id IN ('SOCIETY_ADMIN', 'SECRETARY', 'MANAGER')
    )
    OR public.is_super_admin(auth.uid())
  );

-- ============================================================
-- AMENITY BOOKINGS RLS POLICIES
-- ============================================================
DROP POLICY IF EXISTS "Members can view society amenity bookings" ON public.amenity_bookings;
CREATE POLICY "Members can view society amenity bookings"
  ON public.amenity_bookings FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.society_memberships sm
      WHERE sm.society_id = amenity_bookings.society_id
        AND sm.user_id = auth.uid()
        AND sm.status = 'ACTIVE'
    )
    OR public.is_super_admin(auth.uid())
  );

DROP POLICY IF EXISTS "Residents can create amenity bookings" ON public.amenity_bookings;
CREATE POLICY "Residents can create amenity bookings"
  ON public.amenity_bookings FOR INSERT
  WITH CHECK (
    booked_by = auth.uid()
    AND (
      EXISTS (
        SELECT 1 FROM public.society_memberships sm
        WHERE sm.society_id = amenity_bookings.society_id
          AND sm.user_id = auth.uid()
          AND sm.status = 'ACTIVE'
      )
      OR public.is_super_admin(auth.uid())
    )
  );

DROP POLICY IF EXISTS "Booker or admins can update amenity bookings" ON public.amenity_bookings;
CREATE POLICY "Booker or admins can update amenity bookings"
  ON public.amenity_bookings FOR UPDATE
  USING (
    booked_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.society_memberships sm
      WHERE sm.society_id = amenity_bookings.society_id
        AND sm.user_id = auth.uid()
        AND sm.status = 'ACTIVE'
        AND sm.role_id IN ('SOCIETY_ADMIN', 'SECRETARY', 'MANAGER')
    )
    OR public.is_super_admin(auth.uid())
  );

-- ============================================================
-- SOCIETY EVENTS RLS POLICIES
-- ============================================================
DROP POLICY IF EXISTS "Members can view events based on visibility" ON public.society_events;
CREATE POLICY "Members can view events based on visibility"
  ON public.society_events FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.society_memberships sm
      WHERE sm.society_id = society_events.society_id
        AND sm.user_id = auth.uid()
        AND sm.status = 'ACTIVE'
        AND (
          society_events.visibility = 'ALL_RESIDENTS'
          OR sm.role_id IN ('SOCIETY_ADMIN', 'SECRETARY', 'COMMITTEE_MEMBER', 'MANAGER')
        )
    )
    OR public.is_super_admin(auth.uid())
  );

DROP POLICY IF EXISTS "Admins and committee can manage events" ON public.society_events;
CREATE POLICY "Admins and committee can manage events"
  ON public.society_events FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.society_memberships sm
      WHERE sm.society_id = society_events.society_id
        AND sm.user_id = auth.uid()
        AND sm.status = 'ACTIVE'
        AND sm.role_id IN ('SOCIETY_ADMIN', 'SECRETARY', 'COMMITTEE_MEMBER')
    )
    OR public.is_super_admin(auth.uid())
  );

-- ============================================================
-- SOCIETY MEETINGS RLS POLICIES
-- ============================================================
DROP POLICY IF EXISTS "Members can view meetings based on type" ON public.society_meetings;
CREATE POLICY "Members can view meetings based on type"
  ON public.society_meetings FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.society_memberships sm
      WHERE sm.society_id = society_meetings.society_id
        AND sm.user_id = auth.uid()
        AND sm.status = 'ACTIVE'
        AND (
          society_meetings.meeting_type IN ('AGM', 'EGM', 'GENERAL')
          OR sm.role_id IN ('SOCIETY_ADMIN', 'SECRETARY', 'COMMITTEE_MEMBER', 'TREASURER', 'AUDITOR')
        )
    )
    OR public.is_super_admin(auth.uid())
  );

DROP POLICY IF EXISTS "Admins and committee can manage meetings" ON public.society_meetings;
CREATE POLICY "Admins and committee can manage meetings"
  ON public.society_meetings FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.society_memberships sm
      WHERE sm.society_id = society_meetings.society_id
        AND sm.user_id = auth.uid()
        AND sm.status = 'ACTIVE'
        AND sm.role_id IN ('SOCIETY_ADMIN', 'SECRETARY', 'COMMITTEE_MEMBER')
    )
    OR public.is_super_admin(auth.uid())
  );

-- ============================================================
-- NOTICES & DOCUMENTS WRITE RLS POLICIES
-- ============================================================
DROP POLICY IF EXISTS "Admins can manage notices" ON public.notices;
CREATE POLICY "Admins can manage notices"
  ON public.notices FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.society_memberships sm
      WHERE sm.society_id = notices.society_id
        AND sm.user_id = auth.uid()
        AND sm.status = 'ACTIVE'
        AND sm.role_id IN ('SOCIETY_ADMIN', 'SECRETARY', 'COMMITTEE_MEMBER')
    )
    OR public.is_super_admin(auth.uid())
  );

DROP POLICY IF EXISTS "Admins can manage documents" ON public.documents;
CREATE POLICY "Admins can manage documents"
  ON public.documents FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.society_memberships sm
      WHERE sm.society_id = documents.society_id
        AND sm.user_id = auth.uid()
        AND sm.status = 'ACTIVE'
        AND sm.role_id IN ('SOCIETY_ADMIN', 'SECRETARY', 'COMMITTEE_MEMBER')
    )
    OR public.is_super_admin(auth.uid())
  );
