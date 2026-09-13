-- ============================================================================
-- DwellSync Migration: Society Access Requests Hardening
-- Work Package WP-03: Unlinked User Onboarding & Society Access Request
-- ============================================================================

-- 1. Status Check Constraint Reconciliation: Support CANCELLED status
ALTER TABLE public.society_access_requests
  DROP CONSTRAINT IF EXISTS society_access_requests_status_check;

ALTER TABLE public.society_access_requests
  ADD CONSTRAINT society_access_requests_status_check
  CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED'));

-- 2. Partial Unique Index: Prevent duplicate PENDING requests for same user & society
CREATE UNIQUE INDEX IF NOT EXISTS idx_society_access_requests_pending_unique
  ON public.society_access_requests (society_id, user_id)
  WHERE status = 'PENDING';

CREATE UNIQUE INDEX IF NOT EXISTS idx_society_access_requests_user_soc_pending
  ON public.society_access_requests (user_id, society_id)
  WHERE status = 'PENDING';

-- 3. Ensure RLS is enabled
ALTER TABLE public.society_access_requests ENABLE ROW LEVEL SECURITY;

-- 4. Hardened SELECT Policy: Requester reads own requests; Society Admins read their society requests
DROP POLICY IF EXISTS "Users can read own requests and Society Admins can read all" ON public.society_access_requests;
DROP POLICY IF EXISTS "society_access_requests_select_policy" ON public.society_access_requests;

CREATE POLICY "society_access_requests_select_policy"
  ON public.society_access_requests FOR SELECT
  USING (
    auth.uid() = user_id 
    OR public.is_super_admin(auth.uid()) 
    OR EXISTS (
      SELECT 1 FROM public.society_memberships sm 
      WHERE sm.society_id = society_access_requests.society_id 
        AND sm.user_id = auth.uid() 
        AND sm.role_id IN ('SOCIETY_ADMIN', 'SECRETARY', 'MANAGER')
        AND sm.status = 'ACTIVE'
    )
  );

-- 5. Hardened INSERT Policy: Authenticated users can only insert their own requests
DROP POLICY IF EXISTS "Authenticated users can submit access requests" ON public.society_access_requests;
DROP POLICY IF EXISTS "society_access_requests_insert_policy" ON public.society_access_requests;

CREATE POLICY "society_access_requests_insert_policy"
  ON public.society_access_requests FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
  );

-- 6. Hardened UPDATE Policy: Requester can cancel pending requests, Admins can review requests
DROP POLICY IF EXISTS "society_access_requests_update_policy" ON public.society_access_requests;

CREATE POLICY "society_access_requests_update_policy"
  ON public.society_access_requests FOR UPDATE
  USING (
    -- Requester can update only their own pending request (e.g. cancellation)
    (auth.uid() = user_id AND status = 'PENDING')
    -- Or Super Admin
    OR public.is_super_admin(auth.uid())
    -- Or Authorized Society Admin
    OR EXISTS (
      SELECT 1 FROM public.society_memberships sm 
      WHERE sm.society_id = society_access_requests.society_id 
        AND sm.user_id = auth.uid() 
        AND sm.role_id IN ('SOCIETY_ADMIN', 'SECRETARY', 'MANAGER')
        AND sm.status = 'ACTIVE'
    )
  );
