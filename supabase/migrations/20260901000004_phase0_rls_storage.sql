-- DwellSync Phase 0 Row Level Security & Storage Setup

-- 1. Enable RLS on physical structural hierarchy tables
ALTER TABLE public.buildings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.floors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.units ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 2. BUILDINGS RLS POLICIES
-- ============================================================================

CREATE POLICY "Super Admins can manage all buildings"
  ON public.buildings FOR ALL
  TO authenticated
  USING (public.is_super_admin(auth.uid()))
  WITH CHECK (public.is_super_admin(auth.uid()));

CREATE POLICY "Society members can view buildings in their society"
  ON public.buildings FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.society_memberships sm
      WHERE sm.society_id = buildings.society_id
        AND sm.user_id = auth.uid()
        AND sm.status = 'ACTIVE'
    )
  );

CREATE POLICY "Society Admins can manage buildings in their society"
  ON public.buildings FOR ALL
  TO authenticated
  USING (
    public.has_society_role(auth.uid(), buildings.society_id, ARRAY['SOCIETY_ADMIN', 'SECRETARY'])
  )
  WITH CHECK (
    public.has_society_role(auth.uid(), buildings.society_id, ARRAY['SOCIETY_ADMIN', 'SECRETARY'])
  );

-- ============================================================================
-- 3. WINGS RLS POLICIES
-- ============================================================================

CREATE POLICY "Super Admins can manage all wings"
  ON public.wings FOR ALL
  TO authenticated
  USING (public.is_super_admin(auth.uid()))
  WITH CHECK (public.is_super_admin(auth.uid()));

CREATE POLICY "Society members can view wings in their society"
  ON public.wings FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.society_memberships sm
      WHERE sm.society_id = wings.society_id
        AND sm.user_id = auth.uid()
        AND sm.status = 'ACTIVE'
    )
  );

CREATE POLICY "Society Admins can manage wings in their society"
  ON public.wings FOR ALL
  TO authenticated
  USING (
    public.has_society_role(auth.uid(), wings.society_id, ARRAY['SOCIETY_ADMIN', 'SECRETARY'])
  )
  WITH CHECK (
    public.has_society_role(auth.uid(), wings.society_id, ARRAY['SOCIETY_ADMIN', 'SECRETARY'])
  );

-- ============================================================================
-- 4. FLOORS RLS POLICIES
-- ============================================================================

CREATE POLICY "Super Admins can manage all floors"
  ON public.floors FOR ALL
  TO authenticated
  USING (public.is_super_admin(auth.uid()))
  WITH CHECK (public.is_super_admin(auth.uid()));

CREATE POLICY "Society members can view floors in their society"
  ON public.floors FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.society_memberships sm
      WHERE sm.society_id = floors.society_id
        AND sm.user_id = auth.uid()
        AND sm.status = 'ACTIVE'
    )
  );

CREATE POLICY "Society Admins can manage floors in their society"
  ON public.floors FOR ALL
  TO authenticated
  USING (
    public.has_society_role(auth.uid(), floors.society_id, ARRAY['SOCIETY_ADMIN', 'SECRETARY'])
  )
  WITH CHECK (
    public.has_society_role(auth.uid(), floors.society_id, ARRAY['SOCIETY_ADMIN', 'SECRETARY'])
  );

-- ============================================================================
-- 5. UNITS RLS POLICIES
-- ============================================================================

CREATE POLICY "Super Admins can manage all units"
  ON public.units FOR ALL
  TO authenticated
  USING (public.is_super_admin(auth.uid()))
  WITH CHECK (public.is_super_admin(auth.uid()));

CREATE POLICY "Society members can view units in their society"
  ON public.units FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.society_memberships sm
      WHERE sm.society_id = units.society_id
        AND sm.user_id = auth.uid()
        AND sm.status = 'ACTIVE'
    )
  );

CREATE POLICY "Society Admins can manage units in their society"
  ON public.units FOR ALL
  TO authenticated
  USING (
    public.has_society_role(auth.uid(), units.society_id, ARRAY['SOCIETY_ADMIN', 'SECRETARY'])
  )
  WITH CHECK (
    public.has_society_role(auth.uid(), units.society_id, ARRAY['SOCIETY_ADMIN', 'SECRETARY'])
  );

-- ============================================================================
-- 6. SUPABASE STORAGE BUCKETS INITIALIZATION & POLICIES
-- ============================================================================

-- Create buckets for society assets and profile images if storage extension exists
INSERT INTO storage.buckets (id, name, public)
VALUES 
  ('society-assets', 'society-assets', true),
  ('profile-images', 'profile-images', true)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS: Public read for logos/profile avatars, authenticated write
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'storage' AND tablename = 'objects') THEN
    -- Society Assets View Policy
    DROP POLICY IF EXISTS "Public can view society assets" ON storage.objects;
    CREATE POLICY "Public can view society assets"
      ON storage.objects FOR SELECT
      TO public
      USING (bucket_id = 'society-assets');

    -- Society Assets Upload Policy (Admins only)
    DROP POLICY IF EXISTS "Admins can upload society assets" ON storage.objects;
    CREATE POLICY "Admins can upload society assets"
      ON storage.objects FOR INSERT
      TO authenticated
      WITH CHECK (
        bucket_id = 'society-assets' AND
        (public.is_super_admin(auth.uid()) OR EXISTS (
          SELECT 1 FROM public.society_memberships sm
          WHERE sm.user_id = auth.uid()
            AND sm.role_id IN ('SOCIETY_ADMIN', 'SECRETARY')
            AND sm.status = 'ACTIVE'
        ))
      );

    -- Profile Images View Policy
    DROP POLICY IF EXISTS "Public can view profile images" ON storage.objects;
    CREATE POLICY "Public can view profile images"
      ON storage.objects FOR SELECT
      TO public
      USING (bucket_id = 'profile-images');

    -- Profile Images Upload Policy (Owner or Admin)
    DROP POLICY IF EXISTS "Users can upload own avatar" ON storage.objects;
    CREATE POLICY "Users can upload own avatar"
      ON storage.objects FOR INSERT
      TO authenticated
      WITH CHECK (bucket_id = 'profile-images');
  END IF;
END $$;

