-- DwellSync Phase 0 Core Structural Models Migration
-- Extends societies and creates buildings, wings, floors, units, and structural permissions

-- 1. Extend Societies Table with Phase 0 fields
ALTER TABLE public.societies
  ADD COLUMN IF NOT EXISTS registration_number TEXT,
  ADD COLUMN IF NOT EXISTS society_type TEXT DEFAULT 'COOPERATIVE_HOUSING' CHECK (
    society_type IN (
      'COOPERATIVE_HOUSING',
      'APARTMENT_SOCIETY',
      'GATED_COMMUNITY',
      'VILLA_COMMUNITY',
      'CONDOMINIUM',
      'PROPERTY_MANAGEMENT',
      'OTHER'
    )
  ),
  ADD COLUMN IF NOT EXISTS logo_url TEXT,
  ADD COLUMN IF NOT EXISTS address_line_1 TEXT,
  ADD COLUMN IF NOT EXISTS address_line_2 TEXT,
  ADD COLUMN IF NOT EXISTS landmark TEXT,
  ADD COLUMN IF NOT EXISTS district TEXT,
  ADD COLUMN IF NOT EXISTS country TEXT DEFAULT 'India',
  ADD COLUMN IF NOT EXISTS contact_email TEXT,
  ADD COLUMN IF NOT EXISTS contact_phone TEXT,
  ADD COLUMN IF NOT EXISTS website TEXT,
  ADD COLUMN IF NOT EXISTS timezone TEXT DEFAULT 'Asia/Kolkata',
  ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'INR',
  ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL;

-- Update status check constraint on societies to support ONBOARDING and ARCHIVED
ALTER TABLE public.societies DROP CONSTRAINT IF EXISTS societies_status_check;
ALTER TABLE public.societies ADD CONSTRAINT societies_status_check
  CHECK (status IN ('ONBOARDING', 'ACTIVE', 'SUSPENDED', 'ARCHIVED'));

-- 2. Buildings Table
CREATE TABLE IF NOT EXISTS public.buildings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  society_id UUID NOT NULL REFERENCES public.societies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  code TEXT NOT NULL,
  description TEXT,
  number_of_floors INTEGER NOT NULL DEFAULT 1 CHECK (number_of_floors >= 0),
  status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE', 'UNDER_MAINTENANCE')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_building_society_code UNIQUE (society_id, code)
);

-- 3. Wings Table
CREATE TABLE IF NOT EXISTS public.wings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  society_id UUID NOT NULL REFERENCES public.societies(id) ON DELETE CASCADE,
  building_id UUID NOT NULL REFERENCES public.buildings(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  code TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_wing_building_code UNIQUE (building_id, code)
);

-- 4. Floors Table
CREATE TABLE IF NOT EXISTS public.floors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  society_id UUID NOT NULL REFERENCES public.societies(id) ON DELETE CASCADE,
  building_id UUID NOT NULL REFERENCES public.buildings(id) ON DELETE CASCADE,
  wing_id UUID REFERENCES public.wings(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  floor_number INTEGER NOT NULL,
  display_order INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. Units Table
CREATE TABLE IF NOT EXISTS public.units (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  society_id UUID NOT NULL REFERENCES public.societies(id) ON DELETE CASCADE,
  building_id UUID NOT NULL REFERENCES public.buildings(id) ON DELETE CASCADE,
  wing_id UUID REFERENCES public.wings(id) ON DELETE SET NULL,
  floor_id UUID REFERENCES public.floors(id) ON DELETE SET NULL,
  unit_number TEXT NOT NULL,
  unit_type TEXT NOT NULL DEFAULT '2_BHK' CHECK (
    unit_type IN (
      '1_BHK',
      '2_BHK',
      '3_BHK',
      '4_BHK',
      'PENTHOUSE',
      'SHOP',
      'OFFICE',
      'PARKING',
      'OTHER'
    )
  ),
  area_sqft NUMERIC(10, 2),
  carpet_area_sqft NUMERIC(10, 2),
  built_up_area_sqft NUMERIC(10, 2),
  status TEXT NOT NULL DEFAULT 'VACANT' CHECK (
    status IN ('ACTIVE', 'VACANT', 'OCCUPIED', 'UNDER_MAINTENANCE', 'INACTIVE')
  ),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. Extend Society Memberships with Phase 0 status values & timestamps
ALTER TABLE public.society_memberships
  ADD COLUMN IF NOT EXISTS joined_at TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS left_at TIMESTAMPTZ;

ALTER TABLE public.society_memberships DROP CONSTRAINT IF EXISTS society_memberships_status_check;
ALTER TABLE public.society_memberships ADD CONSTRAINT society_memberships_status_check
  CHECK (status IN ('INVITED', 'ACTIVE', 'SUSPENDED', 'REMOVED'));

-- 7. High Performance Tenant Query Indexes
CREATE INDEX IF NOT EXISTS idx_societies_status ON public.societies(status);
CREATE INDEX IF NOT EXISTS idx_societies_type ON public.societies(society_type);
CREATE INDEX IF NOT EXISTS idx_buildings_society ON public.buildings(society_id);
CREATE INDEX IF NOT EXISTS idx_buildings_society_status ON public.buildings(society_id, status);
CREATE INDEX IF NOT EXISTS idx_wings_society ON public.wings(society_id);
CREATE INDEX IF NOT EXISTS idx_wings_building ON public.wings(building_id);
CREATE INDEX IF NOT EXISTS idx_floors_society ON public.floors(society_id);
CREATE INDEX IF NOT EXISTS idx_floors_building ON public.floors(building_id);
CREATE INDEX IF NOT EXISTS idx_floors_wing ON public.floors(wing_id);
CREATE INDEX IF NOT EXISTS idx_units_society ON public.units(society_id);
CREATE INDEX IF NOT EXISTS idx_units_building ON public.units(building_id);
CREATE INDEX IF NOT EXISTS idx_units_wing ON public.units(wing_id);
CREATE INDEX IF NOT EXISTS idx_units_floor ON public.units(floor_id);
CREATE INDEX IF NOT EXISTS idx_units_status ON public.units(society_id, status);
CREATE INDEX IF NOT EXISTS idx_units_type ON public.units(society_id, unit_type);
CREATE INDEX IF NOT EXISTS idx_memberships_society_status ON public.society_memberships(society_id, status);
CREATE INDEX IF NOT EXISTS idx_profiles_status ON public.profiles(status);

-- 8. Updated At Triggers for new tables
DROP TRIGGER IF EXISTS set_buildings_updated_at ON public.buildings;
CREATE TRIGGER set_buildings_updated_at
  BEFORE UPDATE ON public.buildings
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS set_wings_updated_at ON public.wings;
CREATE TRIGGER set_wings_updated_at
  BEFORE UPDATE ON public.wings
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS set_floors_updated_at ON public.floors;
CREATE TRIGGER set_floors_updated_at
  BEFORE UPDATE ON public.floors
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS set_units_updated_at ON public.units;
CREATE TRIGGER set_units_updated_at
  BEFORE UPDATE ON public.units
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- 9. Phase 0 Granular Permissions Seed
INSERT INTO public.permissions (id, name, category, description) VALUES
  ('building.view', 'View Buildings', 'structural', 'View society buildings and towers'),
  ('building.create', 'Create Building', 'structural', 'Add new building or tower to society'),
  ('building.update', 'Update Building', 'structural', 'Edit building details and floor count'),
  ('building.delete', 'Delete Building', 'structural', 'Remove building from society hierarchy'),
  
  ('wing.view', 'View Wings', 'structural', 'View building wings and blocks'),
  ('wing.create', 'Create Wing', 'structural', 'Add new wing or block to building'),
  ('wing.update', 'Update Wing', 'structural', 'Edit wing details'),
  ('wing.delete', 'Delete Wing', 'structural', 'Remove wing from building'),
  
  ('floor.view', 'View Floors', 'structural', 'View building and wing floor layouts'),
  ('floor.create', 'Create Floor', 'structural', 'Add new floor level to building/wing'),
  ('floor.update', 'Update Floor', 'structural', 'Edit floor details and display order'),
  ('floor.delete', 'Delete Floor', 'structural', 'Remove floor level from hierarchy'),
  
  ('unit.view', 'View Units', 'structural', 'View unit and flat directory'),
  ('unit.create', 'Create Unit', 'structural', 'Add unit or flat to floor/building'),
  ('unit.update', 'Update Unit', 'structural', 'Edit unit dimensions, type, and status'),
  ('unit.delete', 'Delete Unit', 'structural', 'Remove unit from society hierarchy'),
  
  ('people.view', 'View People & Directory', 'people', 'View residents, owners, staff, and members'),
  ('people.create', 'Add Person', 'people', 'Create person profile in society'),
  ('people.update', 'Update Person', 'people', 'Edit person profile and contact info'),
  ('people.delete', 'Remove Person', 'people', 'Remove person record from society'),
  
  ('membership.view', 'View Memberships', 'membership', 'View member roles and flat allocations'),
  ('membership.create', 'Assign Membership', 'membership', 'Grant member role and unit access'),
  ('membership.update', 'Update Membership', 'membership', 'Modify membership status and role'),
  ('membership.remove', 'Revoke Membership', 'membership', 'Revoke society membership')
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  category = EXCLUDED.category,
  description = EXCLUDED.description;

-- Grant new permissions to SUPER_ADMIN
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT 'SUPER_ADMIN', p.id FROM public.permissions p
WHERE p.category IN ('structural', 'people', 'membership')
ON CONFLICT DO NOTHING;

-- Grant structural & membership permissions to SOCIETY_ADMIN, SECRETARY, MANAGER
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT 'SOCIETY_ADMIN', p.id FROM public.permissions p
WHERE p.category IN ('structural', 'people', 'membership')
ON CONFLICT DO NOTHING;

INSERT INTO public.role_permissions (role_id, permission_id)
SELECT 'SECRETARY', p.id FROM public.permissions p
WHERE p.category IN ('structural', 'people', 'membership')
ON CONFLICT DO NOTHING;

INSERT INTO public.role_permissions (role_id, permission_id)
SELECT 'MANAGER', p.id FROM public.permissions p
WHERE p.id IN (
  'building.view', 'building.update', 'wing.view', 'wing.update',
  'floor.view', 'floor.update', 'unit.view', 'unit.update',
  'people.view', 'membership.view'
)
ON CONFLICT DO NOTHING;

INSERT INTO public.role_permissions (role_id, permission_id)
SELECT 'COMMITTEE_MEMBER', p.id FROM public.permissions p
WHERE p.id IN ('building.view', 'wing.view', 'floor.view', 'unit.view', 'people.view', 'membership.view')
ON CONFLICT DO NOTHING;

INSERT INTO public.role_permissions (role_id, permission_id)
SELECT 'RESIDENT', p.id FROM public.permissions p
WHERE p.id IN ('building.view', 'wing.view', 'floor.view', 'unit.view', 'people.view')
ON CONFLICT DO NOTHING;

INSERT INTO public.role_permissions (role_id, permission_id)
SELECT 'OWNER', p.id FROM public.permissions p
WHERE p.id IN ('building.view', 'wing.view', 'floor.view', 'unit.view', 'people.view')
ON CONFLICT DO NOTHING;

INSERT INTO public.role_permissions (role_id, permission_id)
SELECT 'TENANT', p.id FROM public.permissions p
WHERE p.id IN ('building.view', 'wing.view', 'floor.view', 'unit.view', 'people.view')
ON CONFLICT DO NOTHING;

