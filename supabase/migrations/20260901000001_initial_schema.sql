-- DwellSync Pre-Phase 0 Initial Schema Migration
-- Creates core tables, triggers, helper functions, and initial RBAC seed data

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Profiles Table
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  display_name TEXT,
  avatar_url TEXT,
  phone TEXT,
  status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE', 'SUSPENDED')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Societies Table (Multi-tenant)
CREATE TABLE IF NOT EXISTS public.societies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  code TEXT UNIQUE NOT NULL,
  address TEXT,
  city TEXT,
  state TEXT,
  pincode TEXT,
  status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'SUSPENDED', 'PENDING')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Roles Table
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

-- 5. Role Permissions Table (Join Table)
CREATE TABLE IF NOT EXISTS public.role_permissions (
  role_id TEXT NOT NULL REFERENCES public.roles(id) ON DELETE CASCADE,
  permission_id TEXT NOT NULL REFERENCES public.permissions(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (role_id, permission_id)
);

-- 6. Society Memberships Table
CREATE TABLE IF NOT EXISTS public.society_memberships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  society_id UUID NOT NULL REFERENCES public.societies(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role_id TEXT NOT NULL REFERENCES public.roles(id) ON DELETE RESTRICT,
  unit_number TEXT,
  status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE', 'SUSPENDED')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_society_user_role UNIQUE (society_id, user_id, role_id)
);

-- 7. Platform Admins Table (Super Admin Platform-Level Privilege)
CREATE TABLE IF NOT EXISTS public.platform_admins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role_id TEXT NOT NULL DEFAULT 'SUPER_ADMIN' REFERENCES public.roles(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES public.profiles(id)
);

-- 8. Impersonation Sessions Table
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

-- 9. Audit Logs Table (Append-Only)
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

-- Indexes for high performance lookup
CREATE INDEX IF NOT EXISTS idx_memberships_user ON public.society_memberships(user_id);
CREATE INDEX IF NOT EXISTS idx_memberships_society ON public.society_memberships(society_id);
CREATE INDEX IF NOT EXISTS idx_memberships_status ON public.society_memberships(status);
CREATE INDEX IF NOT EXISTS idx_platform_admins_user ON public.platform_admins(user_id);
CREATE INDEX IF NOT EXISTS idx_impersonation_token ON public.impersonation_sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_impersonation_status ON public.impersonation_sessions(status);
CREATE INDEX IF NOT EXISTS idx_audit_logs_actor ON public.audit_logs(actor_user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_society ON public.audit_logs(society_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON public.audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs(created_at DESC);

-- Automatic Profile Synchronization on auth.users insert
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, display_name, avatar_url, phone, status)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data->>'avatar_url',
    NEW.raw_user_meta_data->>'phone',
    'ACTIVE'
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT OR UPDATE OF email, raw_user_meta_data ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Automatic updated_at timestamp trigger
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_profiles_updated_at ON public.profiles;
CREATE TRIGGER set_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS set_societies_updated_at ON public.societies;
CREATE TRIGGER set_societies_updated_at
  BEFORE UPDATE ON public.societies
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS set_memberships_updated_at ON public.society_memberships;
CREATE TRIGGER set_memberships_updated_at
  BEFORE UPDATE ON public.society_memberships
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Security Helper Functions
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

CREATE OR REPLACE FUNCTION public.has_society_role(check_user_id UUID, check_society_id UUID, role_names TEXT[])
RETURNS BOOLEAN AS $$
BEGIN
  IF check_user_id IS NULL OR check_society_id IS NULL THEN
    RETURN FALSE;
  END IF;
  RETURN EXISTS (
    SELECT 1 FROM public.society_memberships
    WHERE user_id = check_user_id
      AND society_id = check_society_id
      AND role_id = ANY(role_names)
      AND status = 'ACTIVE'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Seed Standard Roles
INSERT INTO public.roles (id, name, description, is_platform_role) VALUES
  ('SUPER_ADMIN', 'Platform Super Admin', 'Full control over entire SaaS platform, societies, and users', TRUE),
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

-- Seed System Permissions
INSERT INTO public.permissions (id, name, category, description) VALUES
  -- Platform permissions
  ('platform.admin', 'Platform Administration', 'platform', 'Full platform administration rights'),
  ('platform.impersonate', 'Impersonate Users', 'platform', 'Impersonate society users securely'),
  ('platform.audit_logs.view', 'View Platform Audit Logs', 'platform', 'View platform-wide audit trail'),
  ('societies.create', 'Create Societies', 'societies', 'Create new housing society tenants'),
  ('societies.view', 'View Societies', 'societies', 'View society tenant directory'),
  ('societies.manage', 'Manage Societies', 'societies', 'Activate, suspend, or configure societies'),
  ('users.manage_platform', 'Manage Platform Users', 'users', 'Create and manage platform level accounts'),
  
  -- Society permissions
  ('society.view', 'View Society Profile', 'society', 'View society basic info and directory'),
  ('society.manage', 'Manage Society Settings', 'society', 'Update society settings, rules, and configurations'),
  ('residents.view', 'View Residents', 'residents', 'View society resident and unit directory'),
  ('residents.manage', 'Manage Residents', 'residents', 'Add, edit, or approve resident memberships'),
  ('complaints.view', 'View Complaints', 'complaints', 'View society helpdesk tickets'),
  ('complaints.create', 'Create Complaints', 'complaints', 'Log a complaint or service request'),
  ('complaints.manage', 'Manage Complaints', 'complaints', 'Assign, update SLA, and resolve complaints'),
  ('visitors.view', 'View Visitors', 'visitors', 'View visitor and gate logs'),
  ('visitors.manage', 'Manage Visitors', 'visitors', 'Check in and check out visitors at the gate'),
  ('billing.view', 'View Billing', 'billing', 'View society invoices and maintenance charges'),
  ('billing.manage', 'Manage Billing', 'billing', 'Generate invoices, reconcile payments, and audit ledger'),
  ('documents.view', 'View Documents', 'documents', 'View society shared documents and circulars'),
  ('documents.manage', 'Manage Documents', 'documents', 'Upload and organize society documents'),
  ('audit.view', 'View Society Audit Log', 'audit', 'View society-specific audit trail')
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  category = EXCLUDED.category,
  description = EXCLUDED.description;

-- Seed Role Permissions Mapping
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT 'SUPER_ADMIN', p.id FROM public.permissions p
ON CONFLICT DO NOTHING;

INSERT INTO public.role_permissions (role_id, permission_id)
SELECT 'SOCIETY_ADMIN', p.id FROM public.permissions p
WHERE p.category IN ('society', 'residents', 'complaints', 'visitors', 'billing', 'documents', 'audit')
ON CONFLICT DO NOTHING;

INSERT INTO public.role_permissions (role_id, permission_id)
SELECT 'COMMITTEE_MEMBER', p.id FROM public.permissions p
WHERE p.id IN (
  'society.view', 'residents.view', 'complaints.view', 'complaints.manage',
  'visitors.view', 'billing.view', 'documents.view', 'documents.manage', 'audit.view'
)
ON CONFLICT DO NOTHING;

INSERT INTO public.role_permissions (role_id, permission_id)
SELECT 'SECRETARY', p.id FROM public.permissions p
WHERE p.id IN (
  'society.view', 'society.manage', 'residents.view', 'residents.manage',
  'complaints.view', 'complaints.manage', 'visitors.view', 'billing.view',
  'documents.view', 'documents.manage', 'audit.view'
)
ON CONFLICT DO NOTHING;

INSERT INTO public.role_permissions (role_id, permission_id)
SELECT 'TREASURER', p.id FROM public.permissions p
WHERE p.id IN (
  'society.view', 'residents.view', 'billing.view', 'billing.manage',
  'documents.view', 'documents.manage', 'audit.view'
)
ON CONFLICT DO NOTHING;

INSERT INTO public.role_permissions (role_id, permission_id)
SELECT 'MANAGER', p.id FROM public.permissions p
WHERE p.id IN (
  'society.view', 'residents.view', 'complaints.view', 'complaints.manage',
  'visitors.view', 'visitors.manage', 'documents.view'
)
ON CONFLICT DO NOTHING;

INSERT INTO public.role_permissions (role_id, permission_id)
SELECT 'RESIDENT', p.id FROM public.permissions p
WHERE p.id IN ('society.view', 'complaints.view', 'complaints.create', 'visitors.view', 'billing.view', 'documents.view')
ON CONFLICT DO NOTHING;

INSERT INTO public.role_permissions (role_id, permission_id)
SELECT 'OWNER', p.id FROM public.permissions p
WHERE p.id IN ('society.view', 'complaints.view', 'complaints.create', 'visitors.view', 'billing.view', 'documents.view')
ON CONFLICT DO NOTHING;

INSERT INTO public.role_permissions (role_id, permission_id)
SELECT 'TENANT', p.id FROM public.permissions p
WHERE p.id IN ('society.view', 'complaints.view', 'complaints.create', 'visitors.view', 'billing.view', 'documents.view')
ON CONFLICT DO NOTHING;

INSERT INTO public.role_permissions (role_id, permission_id)
SELECT 'SECURITY', p.id FROM public.permissions p
WHERE p.id IN ('society.view', 'visitors.view', 'visitors.manage')
ON CONFLICT DO NOTHING;

INSERT INTO public.role_permissions (role_id, permission_id)
SELECT 'STAFF', p.id FROM public.permissions p
WHERE p.id IN ('society.view', 'complaints.view')
ON CONFLICT DO NOTHING;

INSERT INTO public.role_permissions (role_id, permission_id)
SELECT 'VENDOR', p.id FROM public.permissions p
WHERE p.id IN ('society.view')
ON CONFLICT DO NOTHING;

INSERT INTO public.role_permissions (role_id, permission_id)
SELECT 'AUDITOR', p.id FROM public.permissions p
WHERE p.id IN ('society.view', 'billing.view', 'documents.view', 'audit.view')
ON CONFLICT DO NOTHING;
