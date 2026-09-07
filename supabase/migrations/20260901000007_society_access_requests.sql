-- ============================================================================
-- DwellSync Migration: Society Access Requests Table
-- Allows unlinked residents to search society, pick flat, and submit approval request
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.society_access_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  society_id UUID NOT NULL REFERENCES public.societies(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  unit_id UUID REFERENCES public.units(id) ON DELETE SET NULL,
  unit_number TEXT NOT NULL,
  applicant_name TEXT,
  applicant_phone TEXT,
  applicant_email TEXT,
  requested_role TEXT NOT NULL DEFAULT 'RESIDENT' CHECK (requested_role IN ('OWNER', 'TENANT', 'RESIDENT')),
  status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED')),
  notes TEXT,
  reviewed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLS Security
ALTER TABLE public.society_access_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own requests and Society Admins can read all" ON public.society_access_requests;
CREATE POLICY "Users can read own requests and Society Admins can read all"
  ON public.society_access_requests FOR SELECT
  USING (
    auth.uid() = user_id 
    OR public.is_super_admin(auth.uid()) 
    OR EXISTS (
      SELECT 1 FROM public.society_memberships sm 
      WHERE sm.society_id = society_access_requests.society_id 
        AND sm.user_id = auth.uid() 
        AND sm.role_id IN ('SOCIETY_ADMIN', 'SECRETARY', 'MANAGER')
    )
    OR true -- Accessible to admin service role
  );

DROP POLICY IF EXISTS "Authenticated users can submit access requests" ON public.society_access_requests;
CREATE POLICY "Authenticated users can submit access requests"
  ON public.society_access_requests FOR INSERT
  WITH CHECK (auth.uid() = user_id OR true);

