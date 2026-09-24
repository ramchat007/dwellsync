-- ============================================================================
-- DwellSync Migration: Resident Onboarding, Document Verification & Vehicle Registry
-- Migration Version: 20260901000028
-- ============================================================================

-- 1. Extend society_access_requests to support rich self-service onboarding
ALTER TABLE public.society_access_requests
  ADD COLUMN IF NOT EXISTS building_name TEXT,
  ADD COLUMN IF NOT EXISTS wing_name TEXT,
  ADD COLUMN IF NOT EXISTS floor_number INTEGER,
  ADD COLUMN IF NOT EXISTS unit_type TEXT,
  ADD COLUMN IF NOT EXISTS area_sqft NUMERIC,
  ADD COLUMN IF NOT EXISTS has_parking BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS parking_slot_number TEXT,
  ADD COLUMN IF NOT EXISTS parking_type TEXT,
  ADD COLUMN IF NOT EXISTS vehicles JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS document_type TEXT,
  ADD COLUMN IF NOT EXISTS document_url TEXT,
  ADD COLUMN IF NOT EXISTS document_name TEXT,
  ADD COLUMN IF NOT EXISTS document_file_size_kb INTEGER,
  ADD COLUMN IF NOT EXISTS lease_start_date DATE,
  ADD COLUMN IF NOT EXISTS lease_end_date DATE,
  ADD COLUMN IF NOT EXISTS owner_contact_name TEXT,
  ADD COLUMN IF NOT EXISTS owner_contact_phone TEXT;

-- Index for speedy retrieval by status & society
CREATE INDEX IF NOT EXISTS idx_society_access_requests_soc_status 
  ON public.society_access_requests (society_id, status);

-- 2. Create society_vehicles table for premise vehicle registration & EV tracking
CREATE TABLE IF NOT EXISTS public.society_vehicles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  society_id UUID NOT NULL REFERENCES public.societies(id) ON DELETE CASCADE,
  unit_id UUID REFERENCES public.units(id) ON DELETE SET NULL,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  vehicle_type TEXT NOT NULL DEFAULT 'TWO_WHEELER' CHECK (vehicle_type IN ('TWO_WHEELER', 'FOUR_WHEELER', 'BICYCLE', 'COMMERCIAL', 'OTHER')),
  plate_number TEXT NOT NULL,
  make_model TEXT,
  color TEXT,
  fuel_type TEXT DEFAULT 'PETROL' CHECK (fuel_type IN ('PETROL', 'DIESEL', 'ELECTRIC', 'CNG', 'HYBRID')),
  is_ev BOOLEAN DEFAULT false,
  parking_slot_number TEXT,
  parking_type TEXT,
  rfid_tag TEXT,
  status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_society_vehicles_plate UNIQUE (society_id, plate_number)
);

CREATE INDEX IF NOT EXISTS idx_society_vehicles_society ON public.society_vehicles (society_id);
CREATE INDEX IF NOT EXISTS idx_society_vehicles_unit ON public.society_vehicles (unit_id);
CREATE INDEX IF NOT EXISTS idx_society_vehicles_user ON public.society_vehicles (user_id);
CREATE INDEX IF NOT EXISTS idx_society_vehicles_plate ON public.society_vehicles (society_id, plate_number);

-- 3. Row Level Security for society_vehicles
ALTER TABLE public.society_vehicles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "society_vehicles_select_policy" ON public.society_vehicles;
CREATE POLICY "society_vehicles_select_policy"
  ON public.society_vehicles FOR SELECT
  USING (
    auth.uid() = user_id
    OR public.is_super_admin(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.society_memberships sm
      WHERE sm.society_id = society_vehicles.society_id
        AND sm.user_id = auth.uid()
        AND sm.status = 'ACTIVE'
    )
  );

DROP POLICY IF EXISTS "society_vehicles_insert_policy" ON public.society_vehicles;
CREATE POLICY "society_vehicles_insert_policy"
  ON public.society_vehicles FOR INSERT
  WITH CHECK (
    public.is_super_admin(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.society_memberships sm
      WHERE sm.society_id = society_vehicles.society_id
        AND sm.user_id = auth.uid()
        AND sm.role_id IN ('SOCIETY_ADMIN', 'SECRETARY', 'MANAGER', 'TREASURER')
        AND sm.status = 'ACTIVE'
    )
    OR (auth.uid() = user_id)
  );

DROP POLICY IF EXISTS "society_vehicles_update_policy" ON public.society_vehicles;
CREATE POLICY "society_vehicles_update_policy"
  ON public.society_vehicles FOR UPDATE
  USING (
    public.is_super_admin(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.society_memberships sm
      WHERE sm.society_id = society_vehicles.society_id
        AND sm.user_id = auth.uid()
        AND sm.role_id IN ('SOCIETY_ADMIN', 'SECRETARY', 'MANAGER', 'TREASURER')
        AND sm.status = 'ACTIVE'
    )
    OR (auth.uid() = user_id)
  );

DROP POLICY IF EXISTS "society_vehicles_delete_policy" ON public.society_vehicles;
CREATE POLICY "society_vehicles_delete_policy"
  ON public.society_vehicles FOR DELETE
  USING (
    public.is_super_admin(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.society_memberships sm
      WHERE sm.society_id = society_vehicles.society_id
        AND sm.user_id = auth.uid()
        AND sm.role_id IN ('SOCIETY_ADMIN', 'SECRETARY', 'MANAGER', 'TREASURER')
        AND sm.status = 'ACTIVE'
    )
  );

-- 4. Ensure society-documents storage bucket exists
INSERT INTO storage.buckets (id, name, public)
VALUES ('society-documents', 'society-documents', false)
ON CONFLICT (id) DO NOTHING;
