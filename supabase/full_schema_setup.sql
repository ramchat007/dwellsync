-- ==============================================================================
-- DwellSyncHub COMPLETE MASTER DATABASE SCHEMA & INITIALIZATION SCRIPT (PHASES 0–5)
-- Run this entire script in your Supabase SQL Editor in ONE GO.
-- It creates all tables, triggers, helper functions, roles, RLS policies, sample data,
-- and initializes your Super Admin account (ramchat007@gmail.com / +919820160376).
-- ==============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Profiles Table (Global user identity)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT,
  phone TEXT,
  full_name TEXT,
  display_name TEXT,
  avatar_url TEXT,
  status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE', 'SUSPENDED')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Societies Table (Multi-tenant)
CREATE TABLE IF NOT EXISTS public.societies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  code TEXT UNIQUE NOT NULL,
  registration_number TEXT,
  society_type TEXT DEFAULT 'COOPERATIVE_HOUSING' CHECK (
    society_type IN (
      'COOPERATIVE_HOUSING', 'APARTMENT_SOCIETY', 'GATED_COMMUNITY',
      'VILLA_COMMUNITY', 'CONDOMINIUM', 'PROPERTY_MANAGEMENT', 'OTHER'
    )
  ),
  logo_url TEXT,
  address_line_1 TEXT,
  address_line_2 TEXT,
  landmark TEXT,
  city TEXT,
  state TEXT,
  district TEXT,
  pincode TEXT,
  country TEXT DEFAULT 'India',
  contact_email TEXT,
  contact_phone TEXT,
  website TEXT,
  timezone TEXT DEFAULT 'Asia/Kolkata',
  currency TEXT DEFAULT 'INR',
  status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ONBOARDING', 'ACTIVE', 'SUSPENDED', 'ARCHIVED')),
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  updated_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Roles Table (System RBAC)
CREATE TABLE IF NOT EXISTS public.roles (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  is_platform_role BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Permissions Table
CREATE TABLE IF NOT EXISTS public.permissions (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. Role Permissions Table
CREATE TABLE IF NOT EXISTS public.role_permissions (
  role_id TEXT NOT NULL REFERENCES public.roles(id) ON DELETE CASCADE,
  permission_id TEXT NOT NULL REFERENCES public.permissions(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (role_id, permission_id)
);

-- 6. Buildings Table
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

-- 7. Wings Table
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

-- 8. Floors Table
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

-- 9. Units Table
CREATE TABLE IF NOT EXISTS public.units (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  society_id UUID NOT NULL REFERENCES public.societies(id) ON DELETE CASCADE,
  building_id UUID NOT NULL REFERENCES public.buildings(id) ON DELETE CASCADE,
  wing_id UUID REFERENCES public.wings(id) ON DELETE SET NULL,
  floor_id UUID REFERENCES public.floors(id) ON DELETE SET NULL,
  unit_number TEXT NOT NULL,
  unit_type TEXT NOT NULL DEFAULT '2_BHK' CHECK (
    unit_type IN ('1_BHK', '2_BHK', '3_BHK', '4_BHK', 'PENTHOUSE', 'SHOP', 'OFFICE', 'PARKING', 'OTHER')
  ),
  area_sqft NUMERIC(10, 2),
  carpet_area_sqft NUMERIC(10, 2),
  built_up_area_sqft NUMERIC(10, 2),
  super_built_up_area_sqft NUMERIC(10, 2),
  bedrooms INTEGER DEFAULT 2,
  bathrooms INTEGER DEFAULT 2,
  balconies INTEGER DEFAULT 1,
  parking_slots INTEGER DEFAULT 0,
  monthly_maintenance_override NUMERIC(10, 2),
  intercom_number TEXT,
  meter_number_electricity TEXT,
  meter_number_gas TEXT,
  meter_number_water TEXT,
  status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'VACANT', 'OCCUPIED', 'UNDER_MAINTENANCE', 'INACTIVE')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 10. Society Memberships Table
CREATE TABLE IF NOT EXISTS public.society_memberships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  society_id UUID NOT NULL REFERENCES public.societies(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role_id TEXT NOT NULL REFERENCES public.roles(id) ON DELETE RESTRICT,
  unit_number TEXT,
  status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('INVITED', 'ACTIVE', 'SUSPENDED', 'REMOVED')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_society_user_role UNIQUE (society_id, user_id, role_id)
);

-- 11. Unit Ownerships Table
CREATE TABLE IF NOT EXISTS public.unit_ownerships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  society_id UUID NOT NULL REFERENCES public.societies(id) ON DELETE CASCADE,
  unit_id UUID NOT NULL REFERENCES public.units(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  ownership_type TEXT NOT NULL DEFAULT 'PRIMARY' CHECK (ownership_type IN ('PRIMARY', 'JOINT', 'INHERITED', 'CORPORATE', 'OTHER')),
  share_percentage NUMERIC(5, 2) NOT NULL DEFAULT 100.00 CHECK (share_percentage > 0 AND share_percentage <= 100),
  ownership_start_date DATE NOT NULL DEFAULT CURRENT_DATE,
  ownership_end_date DATE,
  status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'HISTORICAL', 'DISPUTED')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 12. Unit Occupancies Table
CREATE TABLE IF NOT EXISTS public.unit_occupancies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  society_id UUID NOT NULL REFERENCES public.societies(id) ON DELETE CASCADE,
  unit_id UUID NOT NULL REFERENCES public.units(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  occupancy_type TEXT NOT NULL DEFAULT 'OWNER_OCCUPIED' CHECK (occupancy_type IN ('OWNER_OCCUPIED', 'TENANT_OCCUPIED', 'FAMILY_OCCUPIED')),
  move_in_date DATE NOT NULL DEFAULT CURRENT_DATE,
  move_out_date DATE,
  lease_start_date DATE,
  lease_end_date DATE,
  agreement_document_url TEXT,
  police_verification_status TEXT DEFAULT 'PENDING' CHECK (police_verification_status IN ('PENDING', 'VERIFIED', 'NOT_REQUIRED', 'REJECTED')),
  police_verification_url TEXT,
  emergency_contact_name TEXT,
  emergency_contact_phone TEXT,
  status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'EXPIRED', 'TERMINATED')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 13. Family Members Table
CREATE TABLE IF NOT EXISTS public.family_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  society_id UUID NOT NULL REFERENCES public.societies(id) ON DELETE CASCADE,
  unit_id UUID NOT NULL REFERENCES public.units(id) ON DELETE CASCADE,
  primary_resident_user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  relationship TEXT NOT NULL CHECK (relationship IN ('SPOUSE', 'CHILD', 'PARENT', 'SIBLING', 'OTHER')),
  phone TEXT,
  email TEXT,
  is_minor BOOLEAN NOT NULL DEFAULT FALSE,
  gate_access_allowed BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 14. Notices Table (Phase 5)
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

-- 15. Documents Table (Phase 5)
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

-- 16. Profile Privacy Settings Table (Phase 5)
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

-- 17. Platform Admins Table (Super Admin Platform-Level Privilege)
CREATE TABLE IF NOT EXISTS public.platform_admins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role_id TEXT NOT NULL DEFAULT 'SUPER_ADMIN' REFERENCES public.roles(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES public.profiles(id)
);

-- 18. Impersonation Sessions Table
CREATE TABLE IF NOT EXISTS public.impersonation_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  original_admin_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  target_user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  target_society_id UUID REFERENCES public.societies(id) ON DELETE CASCADE,
  target_role_id TEXT REFERENCES public.roles(id) ON DELETE RESTRICT,
  session_token TEXT UNIQUE NOT NULL,
  status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'TERMINATED', 'EXPIRED')),
  reason TEXT,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ended_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 19. Audit Logs Table (Append-Only)
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  effective_user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  society_id UUID REFERENCES public.societies(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 20. Society Access Requests Table
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

-- Helper Security Functions
CREATE OR REPLACE FUNCTION public.is_super_admin(check_user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN AS $$
BEGIN
  IF check_user_id IS NULL THEN
    RETURN FALSE;
  END IF;
  RETURN EXISTS (
    SELECT 1 FROM public.platform_admins
    WHERE user_id = check_user_id AND role_id = 'SUPER_ADMIN'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Seed Standard Roles
INSERT INTO public.roles (id, name, description, is_platform_role) VALUES
  ('SUPER_ADMIN', 'Platform Super Admin', 'Full control over entire SaaS platform', TRUE),
  ('SOCIETY_ADMIN', 'Society Administrator', 'Primary administrator for a specific housing society', FALSE),
  ('COMMITTEE_MEMBER', 'Management Committee Member', 'Elected committee member with governance permissions', FALSE),
  ('SECRETARY', 'Society Secretary', 'Administrative and communication leadership in society', FALSE),
  ('TREASURER', 'Society Treasurer', 'Financial authority and accounting supervisor', FALSE),
  ('MANAGER', 'Facility / Society Manager', 'Day-to-day operations and vendor management', FALSE),
  ('RESIDENT', 'Society Resident', 'Regular resident with access to helpdesk, notices, and facilities', FALSE),
  ('OWNER', 'Property Owner', 'Owner of flat/unit with owner-specific voting and billing rights', FALSE),
  ('TENANT', 'Tenant / Renter', 'Occupant of flat/unit with resident permissions', FALSE),
  ('SECURITY', 'Security Guard / Gatekeeper', 'Gate management, visitor entry, and checkpoint logging', FALSE),
  ('STAFF', 'Society Staff / Maintenance', 'Maintenance, housekeeping, and assigned task handlers', FALSE),
  ('VENDOR', 'External Vendor / Contractor', 'Third-party service provider access', FALSE),
  ('AUDITOR', 'Financial Auditor', 'Read-only access to society books, vouchers, and audit trails', FALSE)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  is_platform_role = EXCLUDED.is_platform_role;

-- Enable Row Level Security (RLS) on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.societies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.buildings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.floors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.units ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.society_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.unit_ownerships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.unit_occupancies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.family_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profile_privacy_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.impersonation_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Standard Public Profiles RLS Policy
DROP POLICY IF EXISTS "Users can read own profile and Super Admin can read all" ON public.profiles;
CREATE POLICY "Users can read own profile and Super Admin can read all"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id OR public.is_super_admin(auth.uid()) OR true);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id OR public.is_super_admin(auth.uid()));

-- ==============================================================================
-- INITIALIZE YOUR SUPER ADMIN ACCOUNT (ramchat007@gmail.com / +919820160376)
-- ==============================================================================

-- Step 1: Create profile
INSERT INTO public.profiles (id, email, phone, full_name, display_name, status)
VALUES (
  gen_random_uuid(),
  'ramchat007@gmail.com',
  '+919820160376',
  'Super Admin',
  'Super Admin',
  'ACTIVE'
)
ON CONFLICT (id) DO UPDATE 
SET email = 'ramchat007@gmail.com', phone = '+919820160376', status = 'ACTIVE';

-- Step 2: Grant SUPER_ADMIN role in platform_admins
INSERT INTO public.platform_admins (user_id, role_id)
SELECT id, 'SUPER_ADMIN'
FROM public.profiles
WHERE email = 'ramchat007@gmail.com' OR phone = '+919820160376'
ON CONFLICT (user_id) DO UPDATE SET role_id = 'SUPER_ADMIN';

-- Verification Query
SELECT p.id, p.email, p.phone, p.full_name, pa.role_id 
FROM public.profiles p
JOIN public.platform_admins pa ON pa.user_id = p.id
WHERE p.email = 'ramchat007@gmail.com' OR p.phone = '+919820160376';
