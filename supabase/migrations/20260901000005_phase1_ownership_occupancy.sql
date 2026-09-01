-- DwellSync Phase 1 Database Schema Migration
-- Establishes Unit Owners, Unit Occupancies (Tenants/Residents), Family Members, and Invitations

-- ============================================================================
-- 1. UNIT OWNERS TABLE (Multi-Owner & Joint Ownership Support)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.unit_owners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  society_id UUID NOT NULL REFERENCES public.societies(id) ON DELETE CASCADE,
  unit_id UUID NOT NULL REFERENCES public.units(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  is_primary BOOLEAN NOT NULL DEFAULT true,
  ownership_percentage NUMERIC(5, 2) DEFAULT 100.00 CHECK (ownership_percentage >= 0 AND ownership_percentage <= 100.00),
  ownership_type TEXT NOT NULL DEFAULT 'PRIMARY' CHECK (ownership_type IN ('PRIMARY', 'JOINT', 'INHERITED', 'CORPORATE', 'OTHER')),
  start_date DATE DEFAULT CURRENT_DATE,
  end_date DATE,
  status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'HISTORICAL', 'DISPUTED')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_unit_owner UNIQUE (unit_id, user_id)
);

-- ============================================================================
-- 2. UNIT OCCUPANCIES TABLE (Separates Ownership from Residency / Tenancy)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.unit_occupancies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  society_id UUID NOT NULL REFERENCES public.societies(id) ON DELETE CASCADE,
  unit_id UUID NOT NULL REFERENCES public.units(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  occupancy_type TEXT NOT NULL DEFAULT 'TENANT_OCCUPIED' CHECK (occupancy_type IN ('OWNER_OCCUPIED', 'TENANT_OCCUPIED', 'FAMILY_OCCUPIED')),
  lease_start DATE,
  lease_end DATE,
  is_primary_tenant BOOLEAN NOT NULL DEFAULT true,
  status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'EXPIRED', 'TERMINATED')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_unit_active_occupant UNIQUE (unit_id, user_id)
);

-- ============================================================================
-- 3. FAMILY MEMBERS TABLE (Household relationship logging)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.family_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  society_id UUID NOT NULL REFERENCES public.societies(id) ON DELETE CASCADE,
  unit_id UUID NOT NULL REFERENCES public.units(id) ON DELETE CASCADE,
  primary_member_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  relationship TEXT NOT NULL CHECK (relationship IN ('SPOUSE', 'CHILD', 'PARENT', 'SIBLING', 'OTHER')),
  phone TEXT,
  email TEXT,
  is_emergency_contact BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================================
-- 4. INVITATIONS TABLE (Secure single-use token invitations)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  society_id UUID NOT NULL REFERENCES public.societies(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role_id TEXT NOT NULL REFERENCES public.roles(id) ON DELETE RESTRICT,
  unit_id UUID REFERENCES public.units(id) ON DELETE SET NULL,
  unit_number TEXT,
  token TEXT UNIQUE NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  accepted_at TIMESTAMPTZ,
  invited_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'ACCEPTED', 'EXPIRED', 'REVOKED')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================================
-- 5. PERFORMANCE INDEXES
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_unit_owners_society ON public.unit_owners(society_id);
CREATE INDEX IF NOT EXISTS idx_unit_owners_unit ON public.unit_owners(unit_id);
CREATE INDEX IF NOT EXISTS idx_unit_owners_user ON public.unit_owners(user_id);
CREATE INDEX IF NOT EXISTS idx_unit_owners_status ON public.unit_owners(status);

CREATE INDEX IF NOT EXISTS idx_unit_occupancies_society ON public.unit_occupancies(society_id);
CREATE INDEX IF NOT EXISTS idx_unit_occupancies_unit ON public.unit_occupancies(unit_id);
CREATE INDEX IF NOT EXISTS idx_unit_occupancies_user ON public.unit_occupancies(user_id);
CREATE INDEX IF NOT EXISTS idx_unit_occupancies_status ON public.unit_occupancies(status);

CREATE INDEX IF NOT EXISTS idx_family_members_society ON public.family_members(society_id);
CREATE INDEX IF NOT EXISTS idx_family_members_unit ON public.family_members(unit_id);
CREATE INDEX IF NOT EXISTS idx_family_members_primary ON public.family_members(primary_member_id);

CREATE INDEX IF NOT EXISTS idx_invitations_society ON public.invitations(society_id);
CREATE INDEX IF NOT EXISTS idx_invitations_token ON public.invitations(token);
CREATE INDEX IF NOT EXISTS idx_invitations_email ON public.invitations(email);

-- ============================================================================
-- 6. ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================
ALTER TABLE public.unit_owners ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.unit_occupancies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.family_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invitations ENABLE ROW LEVEL SECURITY;

-- 6.1 Unit Owners Policies
CREATE POLICY "Super Admins can manage all unit owners"
  ON public.unit_owners FOR ALL
  TO authenticated
  USING (public.is_super_admin(auth.uid()))
  WITH CHECK (public.is_super_admin(auth.uid()));

CREATE POLICY "Society members can view unit owners in their society"
  ON public.unit_owners FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.society_memberships sm
      WHERE sm.society_id = unit_owners.society_id
        AND sm.user_id = auth.uid()
        AND sm.status = 'ACTIVE'
    )
  );

CREATE POLICY "Society Admins can manage unit owners in their society"
  ON public.unit_owners FOR ALL
  TO authenticated
  USING (
    public.has_society_role(auth.uid(), unit_owners.society_id, ARRAY['SOCIETY_ADMIN', 'SECRETARY'])
  )
  WITH CHECK (
    public.has_society_role(auth.uid(), unit_owners.society_id, ARRAY['SOCIETY_ADMIN', 'SECRETARY'])
  );

-- 6.2 Unit Occupancies Policies
CREATE POLICY "Super Admins can manage all unit occupancies"
  ON public.unit_occupancies FOR ALL
  TO authenticated
  USING (public.is_super_admin(auth.uid()))
  WITH CHECK (public.is_super_admin(auth.uid()));

CREATE POLICY "Society members can view unit occupancies in their society"
  ON public.unit_occupancies FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.society_memberships sm
      WHERE sm.society_id = unit_occupancies.society_id
        AND sm.user_id = auth.uid()
        AND sm.status = 'ACTIVE'
    )
  );

CREATE POLICY "Society Admins can manage unit occupancies in their society"
  ON public.unit_occupancies FOR ALL
  TO authenticated
  USING (
    public.has_society_role(auth.uid(), unit_occupancies.society_id, ARRAY['SOCIETY_ADMIN', 'SECRETARY'])
  )
  WITH CHECK (
    public.has_society_role(auth.uid(), unit_occupancies.society_id, ARRAY['SOCIETY_ADMIN', 'SECRETARY'])
  );

-- 6.3 Family Members Policies
CREATE POLICY "Super Admins can manage all family members"
  ON public.family_members FOR ALL
  TO authenticated
  USING (public.is_super_admin(auth.uid()))
  WITH CHECK (public.is_super_admin(auth.uid()));

CREATE POLICY "Society members can view family members in their society"
  ON public.family_members FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.society_memberships sm
      WHERE sm.society_id = family_members.society_id
        AND sm.user_id = auth.uid()
        AND sm.status = 'ACTIVE'
    )
  );

CREATE POLICY "Residents or Admins can manage family members"
  ON public.family_members FOR ALL
  TO authenticated
  USING (
    primary_member_id = auth.uid() OR
    public.has_society_role(auth.uid(), family_members.society_id, ARRAY['SOCIETY_ADMIN', 'SECRETARY'])
  )
  WITH CHECK (
    primary_member_id = auth.uid() OR
    public.has_society_role(auth.uid(), family_members.society_id, ARRAY['SOCIETY_ADMIN', 'SECRETARY'])
  );

-- 6.4 Invitations Policies
CREATE POLICY "Super Admins can manage all invitations"
  ON public.invitations FOR ALL
  TO authenticated
  USING (public.is_super_admin(auth.uid()))
  WITH CHECK (public.is_super_admin(auth.uid()));

CREATE POLICY "Society Admins can manage invitations in their society"
  ON public.invitations FOR ALL
  TO authenticated
  USING (
    public.has_society_role(auth.uid(), invitations.society_id, ARRAY['SOCIETY_ADMIN', 'SECRETARY'])
  )
  WITH CHECK (
    public.has_society_role(auth.uid(), invitations.society_id, ARRAY['SOCIETY_ADMIN', 'SECRETARY'])
  );

-- ============================================================================
-- 7. UPDATED AT TRIGGERS
-- ============================================================================
CREATE TRIGGER update_unit_owners_updated_at
  BEFORE UPDATE ON public.unit_owners
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_unit_occupancies_updated_at
  BEFORE UPDATE ON public.unit_occupancies
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_family_members_updated_at
  BEFORE UPDATE ON public.family_members
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_invitations_updated_at
  BEFORE UPDATE ON public.invitations
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

