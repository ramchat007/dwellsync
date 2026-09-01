-- DwellSync Phase 5: Resident Core Migration
-- Creates notices, society documents, and resident privacy settings with RLS

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Notices Table
CREATE TABLE IF NOT EXISTS public.notices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  society_id UUID NOT NULL REFERENCES public.societies(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'GENERAL' CHECK (
    category IN ('GENERAL', 'MAINTENANCE', 'URGENT', 'EVENT', 'BILLING')
  ),
  priority TEXT NOT NULL DEFAULT 'MEDIUM' CHECK (
    priority IN ('LOW', 'MEDIUM', 'HIGH', 'EMERGENCY')
  ),
  published_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  published_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  attachment_url TEXT,
  status TEXT NOT NULL DEFAULT 'PUBLISHED' CHECK (
    status IN ('PUBLISHED', 'DRAFT', 'ARCHIVED')
  ),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Documents Table
CREATE TABLE IF NOT EXISTS public.documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  society_id UUID NOT NULL REFERENCES public.societies(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL DEFAULT 'SOCIETY_BYLAWS' CHECK (
    category IN ('SOCIETY_BYLAWS', 'AGM_MINUTES', 'FINANCIAL_REPORT', 'FORMS_TEMPLATES', 'RULES_REGULATIONS')
  ),
  file_url TEXT NOT NULL,
  file_type TEXT,
  file_size_kb INTEGER,
  visibility TEXT NOT NULL DEFAULT 'ALL_RESIDENTS' CHECK (
    visibility IN ('ALL_RESIDENTS', 'OWNERS_ONLY', 'COMMITTEE_ONLY')
  ),
  uploaded_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Profile Privacy Settings Table
CREATE TABLE IF NOT EXISTS public.profile_privacy_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  profile_visible_in_directory BOOLEAN NOT NULL DEFAULT TRUE,
  phone_visible_in_directory BOOLEAN NOT NULL DEFAULT FALSE,
  email_visible_in_directory BOOLEAN NOT NULL DEFAULT FALSE,
  allow_neighbor_chat BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_notices_society ON public.notices(society_id);
CREATE INDEX IF NOT EXISTS idx_notices_status ON public.notices(status);
CREATE INDEX IF NOT EXISTS idx_notices_priority ON public.notices(priority);
CREATE INDEX IF NOT EXISTS idx_documents_society ON public.documents(society_id);
CREATE INDEX IF NOT EXISTS idx_documents_visibility ON public.documents(visibility);
CREATE INDEX IF NOT EXISTS idx_privacy_user ON public.profile_privacy_settings(user_id);

-- Enable RLS
ALTER TABLE public.notices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profile_privacy_settings ENABLE ROW LEVEL SECURITY;

-- Notices RLS Policies
DROP POLICY IF EXISTS "Members can view published notices in their society" ON public.notices;
CREATE POLICY "Members can view published notices in their society"
  ON public.notices FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.society_memberships sm
      WHERE sm.society_id = notices.society_id
        AND sm.user_id = auth.uid()
        AND sm.status = 'ACTIVE'
    )
    OR public.is_super_admin(auth.uid())
  );

-- Documents RLS Policies
DROP POLICY IF EXISTS "Members can view documents based on role visibility" ON public.documents;
CREATE POLICY "Members can view documents based on role visibility"
  ON public.documents FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.society_memberships sm
      WHERE sm.society_id = documents.society_id
        AND sm.user_id = auth.uid()
        AND sm.status = 'ACTIVE'
        AND (
          documents.visibility = 'ALL_RESIDENTS'
          OR (documents.visibility = 'OWNERS_ONLY' AND sm.role_id IN ('OWNER', 'SOCIETY_ADMIN', 'SECRETARY', 'TREASURER', 'COMMITTEE_MEMBER'))
          OR (documents.visibility = 'COMMITTEE_ONLY' AND sm.role_id IN ('SOCIETY_ADMIN', 'SECRETARY', 'TREASURER', 'COMMITTEE_MEMBER'))
        )
    )
    OR public.is_super_admin(auth.uid())
  );

-- Privacy Settings RLS Policies
DROP POLICY IF EXISTS "Users can view and edit their own privacy settings" ON public.profile_privacy_settings;
CREATE POLICY "Users can view and edit their own privacy settings"
  ON public.profile_privacy_settings FOR ALL
  USING (auth.uid() = user_id OR public.is_super_admin(auth.uid()))
  WITH CHECK (auth.uid() = user_id OR public.is_super_admin(auth.uid()));

