-- ============================================================================
-- DwellSync Phase 15 Migration: Property Management Company Foundation
-- Migration: 20260901000025_property_management_foundation.sql
-- Description:
--   Introduces the Property Management Company (PMC) organizational layer,
--   enabling multi-society management while preserving strict tenant isolation,
--   composite foreign-key integrity, zero incremental cost, and society-level RBAC.
-- ============================================================================

-- 1. Management Companies
CREATE TABLE IF NOT EXISTS public.management_companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  legal_name TEXT,
  code TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE')),
  contact_email TEXT,
  contact_phone TEXT,
  address JSONB DEFAULT '{}'::jsonb,
  logo_url TEXT,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Management Company Members (Users associated with a company)
CREATE TABLE IF NOT EXISTS public.management_company_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  management_company_id UUID NOT NULL REFERENCES public.management_companies(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'COMPANY_OPERATIONS' CHECK (role IN ('COMPANY_ADMIN', 'COMPANY_MANAGER', 'COMPANY_OPERATIONS')),
  status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'SUSPENDED', 'REVOKED')),
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_mgmt_comp_member UNIQUE (management_company_id, user_id),
  CONSTRAINT uq_mgmt_comp_member_id_comp UNIQUE (id, management_company_id)
);

-- 3. Management Company Societies (Societies managed by a company)
CREATE TABLE IF NOT EXISTS public.management_company_societies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  management_company_id UUID NOT NULL REFERENCES public.management_companies(id) ON DELETE CASCADE,
  society_id UUID NOT NULL REFERENCES public.societies(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE')),
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  assigned_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  removed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_mgmt_comp_society UNIQUE (management_company_id, society_id),
  CONSTRAINT uq_mgmt_comp_soc_id_comp UNIQUE (id, management_company_id)
);

-- Rule 2: A society can belong to at most one active management company
CREATE UNIQUE INDEX IF NOT EXISTS idx_mgmt_company_soc_unique_active 
  ON public.management_company_societies (society_id) 
  WHERE status = 'ACTIVE';

-- 4. Explicit Society Access per Company Member
CREATE TABLE IF NOT EXISTS public.management_company_society_access (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  management_company_id UUID NOT NULL REFERENCES public.management_companies(id) ON DELETE CASCADE,
  management_company_member_id UUID NOT NULL,
  management_company_society_id UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'SUSPENDED', 'REVOKED')),
  assigned_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_mgmt_comp_soc_access UNIQUE (management_company_member_id, management_company_society_id),
  -- Composite foreign keys enforcing company tenant isolation at database level
  CONSTRAINT fk_access_member_comp FOREIGN KEY (management_company_member_id, management_company_id)
    REFERENCES public.management_company_members (id, management_company_id) ON DELETE CASCADE,
  CONSTRAINT fk_access_society_comp FOREIGN KEY (management_company_society_id, management_company_id)
    REFERENCES public.management_company_societies (id, management_company_id) ON DELETE CASCADE
);

-- 5. Management Company Staff Assignments (Operational assignments to societies)
CREATE TABLE IF NOT EXISTS public.management_company_staff_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  management_company_id UUID NOT NULL REFERENCES public.management_companies(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  society_id UUID NOT NULL REFERENCES public.societies(id) ON DELETE CASCADE,
  assignment_type TEXT NOT NULL DEFAULT 'OPERATIONS' CHECK (
    assignment_type IN ('PROPERTY_MANAGER', 'FACILITY_STAFF', 'ACCOUNTANT', 'OPERATIONS', 'SUPERVISOR', 'OTHER')
  ),
  status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE', 'SUSPENDED', 'TERMINATED')),
  start_date DATE NOT NULL DEFAULT CURRENT_DATE,
  end_date DATE,
  assigned_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_mgmt_staff_assign UNIQUE (management_company_id, user_id, society_id, assignment_type),
  -- Composite foreign keys enforcing company-society and company-member tenant isolation at database level
  CONSTRAINT fk_staff_comp_society FOREIGN KEY (management_company_id, society_id)
    REFERENCES public.management_company_societies (management_company_id, society_id) ON DELETE CASCADE,
  CONSTRAINT fk_staff_comp_member FOREIGN KEY (management_company_id, user_id)
    REFERENCES public.management_company_members (management_company_id, user_id) ON DELETE CASCADE
);

-- Indexes for performance and foreign key lookups
CREATE INDEX IF NOT EXISTS idx_mgmt_comp_members_user ON public.management_company_members (user_id, status);
CREATE INDEX IF NOT EXISTS idx_mgmt_comp_societies_soc ON public.management_company_societies (society_id, status);
CREATE INDEX IF NOT EXISTS idx_mgmt_comp_soc_access_member ON public.management_company_society_access (management_company_member_id, status);
CREATE INDEX IF NOT EXISTS idx_mgmt_comp_soc_access_soc ON public.management_company_society_access (management_company_society_id, status);
CREATE INDEX IF NOT EXISTS idx_mgmt_staff_assignments_lookup ON public.management_company_staff_assignments (society_id, user_id, status);

-- Ensure composite foreign key constraints exist idempotently
DO $$
BEGIN
  -- 1. management_company_society_access constraints
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_access_member_comp') THEN
    ALTER TABLE public.management_company_society_access
      ADD CONSTRAINT fk_access_member_comp FOREIGN KEY (management_company_member_id, management_company_id)
      REFERENCES public.management_company_members (id, management_company_id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_access_society_comp') THEN
    ALTER TABLE public.management_company_society_access
      ADD CONSTRAINT fk_access_society_comp FOREIGN KEY (management_company_society_id, management_company_id)
      REFERENCES public.management_company_societies (id, management_company_id) ON DELETE CASCADE;
  END IF;

  -- 2. management_company_staff_assignments constraints
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_staff_comp_society') THEN
    ALTER TABLE public.management_company_staff_assignments
      ADD CONSTRAINT fk_staff_comp_society FOREIGN KEY (management_company_id, society_id)
      REFERENCES public.management_company_societies (management_company_id, society_id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_staff_comp_member') THEN
    ALTER TABLE public.management_company_staff_assignments
      ADD CONSTRAINT fk_staff_comp_member FOREIGN KEY (management_company_id, user_id)
      REFERENCES public.management_company_members (management_company_id, user_id) ON DELETE CASCADE;
  END IF;
END $$;

-- Ensure timestamp update trigger function exists
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Auto-update timestamps triggers
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_timestamp_mgmt_companies') THEN
    CREATE TRIGGER set_timestamp_mgmt_companies
      BEFORE UPDATE ON public.management_companies
      FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_timestamp_mgmt_comp_members') THEN
    CREATE TRIGGER set_timestamp_mgmt_comp_members
      BEFORE UPDATE ON public.management_company_members
      FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_timestamp_mgmt_comp_societies') THEN
    CREATE TRIGGER set_timestamp_mgmt_comp_societies
      BEFORE UPDATE ON public.management_company_societies
      FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_timestamp_mgmt_soc_access') THEN
    CREATE TRIGGER set_timestamp_mgmt_soc_access
      BEFORE UPDATE ON public.management_company_society_access
      FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_timestamp_mgmt_staff_assignments') THEN
    CREATE TRIGGER set_timestamp_mgmt_staff_assignments
      BEFORE UPDATE ON public.management_company_staff_assignments
      FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
  END IF;
END $$;

-- Enable Row Level Security (RLS)
ALTER TABLE public.management_companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.management_company_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.management_company_societies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.management_company_society_access ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.management_company_staff_assignments ENABLE ROW LEVEL SECURITY;

-- ----------------------------------------------------------------------------
-- RLS Policies
-- ----------------------------------------------------------------------------

-- 1. management_companies
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'p_mgmt_comp_select' AND tablename = 'management_companies') THEN
    CREATE POLICY p_mgmt_comp_select ON public.management_companies
      FOR SELECT TO authenticated
      USING (
        public.is_super_admin(auth.uid()) OR
        EXISTS (
          SELECT 1 FROM public.management_company_members
          WHERE management_company_id = public.management_companies.id
            AND user_id = auth.uid()
            AND status = 'ACTIVE'
        )
      );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'p_mgmt_comp_modify' AND tablename = 'management_companies') THEN
    CREATE POLICY p_mgmt_comp_modify ON public.management_companies
      FOR ALL TO authenticated
      USING (
        public.is_super_admin(auth.uid()) OR
        EXISTS (
          SELECT 1 FROM public.management_company_members
          WHERE management_company_id = public.management_companies.id
            AND user_id = auth.uid()
            AND role = 'COMPANY_ADMIN'
            AND status = 'ACTIVE'
        )
      )
      WITH CHECK (
        public.is_super_admin(auth.uid()) OR
        EXISTS (
          SELECT 1 FROM public.management_company_members
          WHERE management_company_id = public.management_companies.id
            AND user_id = auth.uid()
            AND role = 'COMPANY_ADMIN'
            AND status = 'ACTIVE'
        )
      );
  END IF;
END $$;

-- 2. management_company_members
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'p_mgmt_members_select' AND tablename = 'management_company_members') THEN
    CREATE POLICY p_mgmt_members_select ON public.management_company_members
      FOR SELECT TO authenticated
      USING (
        public.is_super_admin(auth.uid()) OR
        user_id = auth.uid() OR
        EXISTS (
          SELECT 1 FROM public.management_company_members m2
          WHERE m2.management_company_id = public.management_company_members.management_company_id
            AND m2.user_id = auth.uid()
            AND m2.status = 'ACTIVE'
        )
      );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'p_mgmt_members_manage' AND tablename = 'management_company_members') THEN
    CREATE POLICY p_mgmt_members_manage ON public.management_company_members
      FOR ALL TO authenticated
      USING (
        public.is_super_admin(auth.uid()) OR
        EXISTS (
          SELECT 1 FROM public.management_company_members admin_mem
          WHERE admin_mem.management_company_id = public.management_company_members.management_company_id
            AND admin_mem.user_id = auth.uid()
            AND admin_mem.role = 'COMPANY_ADMIN'
            AND admin_mem.status = 'ACTIVE'
        )
      )
      WITH CHECK (
        public.is_super_admin(auth.uid()) OR
        EXISTS (
          SELECT 1 FROM public.management_company_members admin_mem
          WHERE admin_mem.management_company_id = public.management_company_members.management_company_id
            AND admin_mem.user_id = auth.uid()
            AND admin_mem.role = 'COMPANY_ADMIN'
            AND admin_mem.status = 'ACTIVE'
        )
      );
  END IF;
END $$;

-- 3. management_company_societies
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'p_mgmt_soc_select' AND tablename = 'management_company_societies') THEN
    CREATE POLICY p_mgmt_soc_select ON public.management_company_societies
      FOR SELECT TO authenticated
      USING (
        public.is_super_admin(auth.uid()) OR
        EXISTS (
          SELECT 1 FROM public.management_company_members mem
          WHERE mem.management_company_id = public.management_company_societies.management_company_id
            AND mem.user_id = auth.uid()
            AND mem.status = 'ACTIVE'
        )
      );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'p_mgmt_soc_manage' AND tablename = 'management_company_societies') THEN
    CREATE POLICY p_mgmt_soc_manage ON public.management_company_societies
      FOR ALL TO authenticated
      USING (
        public.is_super_admin(auth.uid()) OR
        EXISTS (
          SELECT 1 FROM public.management_company_members admin_mem
          WHERE admin_mem.management_company_id = public.management_company_societies.management_company_id
            AND admin_mem.user_id = auth.uid()
            AND admin_mem.role = 'COMPANY_ADMIN'
            AND admin_mem.status = 'ACTIVE'
        )
      )
      WITH CHECK (
        public.is_super_admin(auth.uid()) OR
        EXISTS (
          SELECT 1 FROM public.management_company_members admin_mem
          WHERE admin_mem.management_company_id = public.management_company_societies.management_company_id
            AND admin_mem.user_id = auth.uid()
            AND admin_mem.role = 'COMPANY_ADMIN'
            AND admin_mem.status = 'ACTIVE'
        )
      );
  END IF;
END $$;

-- 4. management_company_society_access
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'p_mgmt_access_select' AND tablename = 'management_company_society_access') THEN
    CREATE POLICY p_mgmt_access_select ON public.management_company_society_access
      FOR SELECT TO authenticated
      USING (
        public.is_super_admin(auth.uid()) OR
        EXISTS (
          SELECT 1 FROM public.management_company_members mem
          WHERE mem.id = public.management_company_society_access.management_company_member_id
            AND mem.user_id = auth.uid()
            AND mem.status = 'ACTIVE'
        ) OR
        EXISTS (
          SELECT 1 FROM public.management_company_members admin_mem
          WHERE admin_mem.management_company_id = public.management_company_society_access.management_company_id
            AND admin_mem.user_id = auth.uid()
            AND admin_mem.role IN ('COMPANY_ADMIN', 'COMPANY_MANAGER')
            AND admin_mem.status = 'ACTIVE'
        )
      );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'p_mgmt_access_manage' AND tablename = 'management_company_society_access') THEN
    CREATE POLICY p_mgmt_access_manage ON public.management_company_society_access
      FOR ALL TO authenticated
      USING (
        public.is_super_admin(auth.uid()) OR
        EXISTS (
          SELECT 1 FROM public.management_company_members admin_mem
          WHERE admin_mem.management_company_id = public.management_company_society_access.management_company_id
            AND admin_mem.user_id = auth.uid()
            AND admin_mem.role = 'COMPANY_ADMIN'
            AND admin_mem.status = 'ACTIVE'
        )
      )
      WITH CHECK (
        public.is_super_admin(auth.uid()) OR
        EXISTS (
          SELECT 1 FROM public.management_company_members admin_mem
          WHERE admin_mem.management_company_id = public.management_company_society_access.management_company_id
            AND admin_mem.user_id = auth.uid()
            AND admin_mem.role = 'COMPANY_ADMIN'
            AND admin_mem.status = 'ACTIVE'
        )
      );
  END IF;
END $$;

-- 5. management_company_staff_assignments
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'p_mgmt_staff_select' AND tablename = 'management_company_staff_assignments') THEN
    CREATE POLICY p_mgmt_staff_select ON public.management_company_staff_assignments
      FOR SELECT TO authenticated
      USING (
        public.is_super_admin(auth.uid()) OR
        user_id = auth.uid() OR
        EXISTS (
          SELECT 1 FROM public.management_company_members mem
          WHERE mem.management_company_id = public.management_company_staff_assignments.management_company_id
            AND mem.user_id = auth.uid()
            AND mem.status = 'ACTIVE'
        )
      );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'p_mgmt_staff_manage' AND tablename = 'management_company_staff_assignments') THEN
    CREATE POLICY p_mgmt_staff_manage ON public.management_company_staff_assignments
      FOR ALL TO authenticated
      USING (
        public.is_super_admin(auth.uid()) OR
        EXISTS (
          SELECT 1 FROM public.management_company_members admin_mem
          WHERE admin_mem.management_company_id = public.management_company_staff_assignments.management_company_id
            AND admin_mem.user_id = auth.uid()
            AND admin_mem.role IN ('COMPANY_ADMIN', 'COMPANY_MANAGER')
            AND admin_mem.status = 'ACTIVE'
        )
      )
      WITH CHECK (
        public.is_super_admin(auth.uid()) OR
        EXISTS (
          SELECT 1 FROM public.management_company_members admin_mem
          WHERE admin_mem.management_company_id = public.management_company_staff_assignments.management_company_id
            AND admin_mem.user_id = auth.uid()
            AND admin_mem.role IN ('COMPANY_ADMIN', 'COMPANY_MANAGER')
            AND admin_mem.status = 'ACTIVE'
        )
      );
  END IF;
END $$;

