-- DwellSync Pre-Phase 0 Row Level Security (RLS) Policies
-- Implements robust tenant isolation, platform admin security, and append-only audit logging

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.societies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.society_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.impersonation_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 1. PROFILES POLICIES
-- ============================================================================

CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Super Admins can view all profiles"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (public.is_super_admin(auth.uid()));

CREATE POLICY "Members can view profiles in same society"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.society_memberships sm1
      JOIN public.society_memberships sm2 ON sm1.society_id = sm2.society_id
      WHERE sm1.user_id = auth.uid()
        AND sm2.user_id = profiles.id
        AND sm1.status = 'ACTIVE'
        AND sm2.status = 'ACTIVE'
    )
  );

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Super Admins can update any profile"
  ON public.profiles FOR ALL
  TO authenticated
  USING (public.is_super_admin(auth.uid()))
  WITH CHECK (public.is_super_admin(auth.uid()));

-- ============================================================================
-- 2. SOCIETIES POLICIES (TENANT ISOLATION)
-- ============================================================================

CREATE POLICY "Super Admins can view all societies"
  ON public.societies FOR SELECT
  TO authenticated
  USING (public.is_super_admin(auth.uid()));

CREATE POLICY "Super Admins can manage all societies"
  ON public.societies FOR ALL
  TO authenticated
  USING (public.is_super_admin(auth.uid()))
  WITH CHECK (public.is_super_admin(auth.uid()));

CREATE POLICY "Members can view their own societies"
  ON public.societies FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.society_memberships
      WHERE society_memberships.society_id = societies.id
        AND society_memberships.user_id = auth.uid()
        AND society_memberships.status = 'ACTIVE'
    )
  );

-- ============================================================================
-- 3. ROLES & PERMISSIONS POLICIES (CATALOG)
-- ============================================================================

CREATE POLICY "Authenticated users can view roles"
  ON public.roles FOR SELECT
  TO authenticated
  USING (TRUE);

CREATE POLICY "Super Admins can manage roles"
  ON public.roles FOR ALL
  TO authenticated
  USING (public.is_super_admin(auth.uid()))
  WITH CHECK (public.is_super_admin(auth.uid()));

CREATE POLICY "Authenticated users can view permissions"
  ON public.permissions FOR SELECT
  TO authenticated
  USING (TRUE);

CREATE POLICY "Super Admins can manage permissions"
  ON public.permissions FOR ALL
  TO authenticated
  USING (public.is_super_admin(auth.uid()))
  WITH CHECK (public.is_super_admin(auth.uid()));

CREATE POLICY "Authenticated users can view role_permissions"
  ON public.role_permissions FOR SELECT
  TO authenticated
  USING (TRUE);

CREATE POLICY "Super Admins can manage role_permissions"
  ON public.role_permissions FOR ALL
  TO authenticated
  USING (public.is_super_admin(auth.uid()))
  WITH CHECK (public.is_super_admin(auth.uid()));

-- ============================================================================
-- 4. SOCIETY MEMBERSHIPS POLICIES
-- ============================================================================

CREATE POLICY "Super Admins can manage all society memberships"
  ON public.society_memberships FOR ALL
  TO authenticated
  USING (public.is_super_admin(auth.uid()))
  WITH CHECK (public.is_super_admin(auth.uid()));

CREATE POLICY "Users can view memberships in their society"
  ON public.society_memberships FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.society_memberships sm
      WHERE sm.society_id = society_memberships.society_id
        AND sm.user_id = auth.uid()
        AND sm.status = 'ACTIVE'
    )
  );

CREATE POLICY "Society Admins can manage memberships in their society"
  ON public.society_memberships FOR ALL
  TO authenticated
  USING (
    public.has_society_role(auth.uid(), society_memberships.society_id, ARRAY['SOCIETY_ADMIN', 'SECRETARY'])
  )
  WITH CHECK (
    public.has_society_role(auth.uid(), society_memberships.society_id, ARRAY['SOCIETY_ADMIN', 'SECRETARY'])
  );

-- ============================================================================
-- 5. PLATFORM ADMINS POLICIES
-- ============================================================================

CREATE POLICY "Super Admins can view platform admins"
  ON public.platform_admins FOR SELECT
  TO authenticated
  USING (public.is_super_admin(auth.uid()));

CREATE POLICY "Super Admins can manage platform admins"
  ON public.platform_admins FOR ALL
  TO authenticated
  USING (public.is_super_admin(auth.uid()))
  WITH CHECK (public.is_super_admin(auth.uid()));

-- ============================================================================
-- 6. IMPERSONATION SESSIONS POLICIES
-- ============================================================================

CREATE POLICY "Super Admins can view impersonation sessions"
  ON public.impersonation_sessions FOR SELECT
  TO authenticated
  USING (public.is_super_admin(auth.uid()));

CREATE POLICY "Super Admins can manage impersonation sessions"
  ON public.impersonation_sessions FOR ALL
  TO authenticated
  USING (public.is_super_admin(auth.uid()))
  WITH CHECK (public.is_super_admin(auth.uid()));

-- ============================================================================
-- 7. AUDIT LOGS POLICIES (APPEND-ONLY)
-- ============================================================================

CREATE POLICY "Super Admins can view all audit logs"
  ON public.audit_logs FOR SELECT
  TO authenticated
  USING (public.is_super_admin(auth.uid()));

CREATE POLICY "Society Admins can view their society audit logs"
  ON public.audit_logs FOR SELECT
  TO authenticated
  USING (
    society_id IS NOT NULL AND
    public.has_society_role(auth.uid(), audit_logs.society_id, ARRAY['SOCIETY_ADMIN'])
  );

CREATE POLICY "Authenticated users can insert audit logs"
  ON public.audit_logs FOR INSERT
  TO authenticated
  WITH CHECK (
    actor_user_id = auth.uid() OR public.is_super_admin(auth.uid())
  );
