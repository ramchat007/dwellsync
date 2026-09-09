-- DwellSync Phase 13 Migration: Builder Handover & New Society Handover Management
-- Creates tenant-isolated handover workspace tables with RLS, composite FKs,
-- performance indexes, and audit-ready structure.
-- LOCAL ONLY — do NOT execute against remote Supabase without review.

-- ============================================================================
-- 1. HANDOVER PROJECTS
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.handover_projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  society_id UUID NOT NULL REFERENCES public.societies(id) ON DELETE CASCADE,

  title TEXT NOT NULL CHECK (char_length(title) >= 3 AND char_length(title) <= 200),
  description TEXT,

  builder_name TEXT NOT NULL CHECK (char_length(builder_name) >= 1),
  builder_contact_name TEXT,
  builder_contact_email TEXT,
  builder_contact_phone TEXT,

  handover_start_date DATE,
  target_handover_date DATE,
  actual_handover_date DATE,

  status TEXT NOT NULL DEFAULT 'DRAFT' CHECK (status IN (
    'DRAFT', 'IN_PROGRESS', 'UNDER_REVIEW', 'READY_FOR_HANDOVER',
    'HANDOVER_COMPLETED', 'CLOSED', 'CANCELLED'
  )),

  overall_progress INTEGER NOT NULL DEFAULT 0 CHECK (overall_progress >= 0 AND overall_progress <= 100),

  created_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  updated_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Composite uniqueness so child tables can reference (id, society_id)
  CONSTRAINT uq_handover_projects_id_society UNIQUE (id, society_id)
);

CREATE INDEX IF NOT EXISTS idx_handover_projects_society_status
  ON public.handover_projects(society_id, status);
CREATE INDEX IF NOT EXISTS idx_handover_projects_society_created
  ON public.handover_projects(society_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_handover_projects_society_target
  ON public.handover_projects(society_id, target_handover_date);

ALTER TABLE public.handover_projects ENABLE ROW LEVEL SECURITY;

-- Members of the society can view; manage requires HANDOVER_MANAGE permission (enforced at API layer)
CREATE POLICY "handover_projects_society_members_view"
  ON public.handover_projects
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.society_memberships sm
      WHERE sm.society_id = handover_projects.society_id
        AND sm.user_id = auth.uid()
        AND sm.status = 'ACTIVE'
    )
  );

CREATE POLICY "handover_projects_authorized_insert"
  ON public.handover_projects
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.society_memberships sm
      WHERE sm.society_id = handover_projects.society_id
        AND sm.user_id = auth.uid()
        AND sm.status = 'ACTIVE'
        AND sm.role_id IN ('SOCIETY_ADMIN', 'SECRETARY', 'COMMITTEE_MEMBER', 'MANAGER')
    )
  );

CREATE POLICY "handover_projects_authorized_update"
  ON public.handover_projects
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.society_memberships sm
      WHERE sm.society_id = handover_projects.society_id
        AND sm.user_id = auth.uid()
        AND sm.status = 'ACTIVE'
        AND sm.role_id IN ('SOCIETY_ADMIN', 'SECRETARY', 'COMMITTEE_MEMBER', 'MANAGER')
    )
  );

-- ============================================================================
-- 2. HANDOVER CHECKLIST ITEMS
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.handover_checklist_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  society_id UUID NOT NULL REFERENCES public.societies(id) ON DELETE CASCADE,
  handover_project_id UUID NOT NULL,

  category TEXT NOT NULL CHECK (category IN (
    'LEGAL', 'STATUTORY', 'BUILDING', 'ELECTRICAL', 'PLUMBING', 'WATER',
    'FIRE_SAFETY', 'LIFT', 'SECURITY', 'COMMON_AREAS', 'PARKING',
    'LANDSCAPING', 'AMENITIES', 'METERS', 'ASSETS', 'VENDORS', 'AMC',
    'DOCUMENTATION', 'DEFECTS', 'OTHER'
  )),

  title TEXT NOT NULL CHECK (char_length(title) >= 3 AND char_length(title) <= 255),
  description TEXT,

  priority TEXT NOT NULL DEFAULT 'MEDIUM' CHECK (priority IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
  status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN (
    'PENDING', 'IN_PROGRESS', 'COMPLETED', 'NOT_APPLICABLE', 'BLOCKED'
  )),

  responsible_person TEXT,
  builder_responsibility BOOLEAN NOT NULL DEFAULT false,
  society_responsibility BOOLEAN NOT NULL DEFAULT true,

  due_date DATE,
  completed_date DATE,

  notes TEXT,
  evidence_urls JSONB NOT NULL DEFAULT '[]',

  created_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  updated_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT fk_checklist_project_society
    FOREIGN KEY (handover_project_id, society_id)
    REFERENCES public.handover_projects(id, society_id)
    ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_handover_checklist_project
  ON public.handover_checklist_items(handover_project_id, status);
CREATE INDEX IF NOT EXISTS idx_handover_checklist_society_status
  ON public.handover_checklist_items(society_id, status);
CREATE INDEX IF NOT EXISTS idx_handover_checklist_due
  ON public.handover_checklist_items(society_id, due_date)
  WHERE status NOT IN ('COMPLETED', 'NOT_APPLICABLE');

ALTER TABLE public.handover_checklist_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "handover_checklist_society_members_view"
  ON public.handover_checklist_items FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM public.society_memberships sm
      WHERE sm.society_id = handover_checklist_items.society_id
        AND sm.user_id = auth.uid() AND sm.status = 'ACTIVE')
  );

CREATE POLICY "handover_checklist_authorized_write"
  ON public.handover_checklist_items FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.society_memberships sm
      WHERE sm.society_id = handover_checklist_items.society_id
        AND sm.user_id = auth.uid() AND sm.status = 'ACTIVE'
        AND sm.role_id IN ('SOCIETY_ADMIN', 'SECRETARY', 'COMMITTEE_MEMBER', 'MANAGER'))
  );

-- ============================================================================
-- 3. HANDOVER DEFECTS / PUNCH LIST
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.handover_defects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  society_id UUID NOT NULL REFERENCES public.societies(id) ON DELETE CASCADE,
  handover_project_id UUID NOT NULL,

  location_description TEXT,
  building_id UUID REFERENCES public.buildings(id) ON DELETE SET NULL,
  unit_id UUID REFERENCES public.units(id) ON DELETE SET NULL,

  category TEXT NOT NULL CHECK (category IN (
    'STRUCTURAL', 'ELECTRICAL', 'PLUMBING', 'FINISHING', 'WATERPROOFING',
    'TILING', 'PAINTING', 'CARPENTRY', 'SANITARY', 'COMMON_AREA', 'OTHER'
  )),

  title TEXT NOT NULL CHECK (char_length(title) >= 3 AND char_length(title) <= 255),
  description TEXT NOT NULL,

  severity TEXT NOT NULL DEFAULT 'MEDIUM' CHECK (severity IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),

  reported_date DATE NOT NULL DEFAULT CURRENT_DATE,
  builder_responsibility BOOLEAN NOT NULL DEFAULT true,

  assigned_to UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  target_resolution_date DATE,

  status TEXT NOT NULL DEFAULT 'OPEN' CHECK (status IN (
    'OPEN', 'ASSIGNED', 'IN_PROGRESS', 'PENDING_BUILDER', 'RESOLVED', 'VERIFIED', 'CLOSED'
  )),

  resolution_notes TEXT,
  evidence_urls JSONB NOT NULL DEFAULT '[]',
  resolved_date DATE,

  -- verified_by is required before CLOSED (enforced at API layer)
  verified_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  verified_at TIMESTAMPTZ,

  created_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  updated_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT fk_defects_project_society
    FOREIGN KEY (handover_project_id, society_id)
    REFERENCES public.handover_projects(id, society_id)
    ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_handover_defects_project_status
  ON public.handover_defects(handover_project_id, status);
CREATE INDEX IF NOT EXISTS idx_handover_defects_society_status
  ON public.handover_defects(society_id, status);
CREATE INDEX IF NOT EXISTS idx_handover_defects_severity
  ON public.handover_defects(society_id, severity)
  WHERE status NOT IN ('VERIFIED', 'CLOSED');

ALTER TABLE public.handover_defects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "handover_defects_society_members_view"
  ON public.handover_defects FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM public.society_memberships sm
      WHERE sm.society_id = handover_defects.society_id
        AND sm.user_id = auth.uid() AND sm.status = 'ACTIVE')
  );

CREATE POLICY "handover_defects_authorized_write"
  ON public.handover_defects FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.society_memberships sm
      WHERE sm.society_id = handover_defects.society_id
        AND sm.user_id = auth.uid() AND sm.status = 'ACTIVE'
        AND sm.role_id IN ('SOCIETY_ADMIN', 'SECRETARY', 'COMMITTEE_MEMBER', 'MANAGER'))
  );

-- ============================================================================
-- 4. HANDOVER BUILDER COMMITMENTS
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.handover_commitments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  society_id UUID NOT NULL REFERENCES public.societies(id) ON DELETE CASCADE,
  handover_project_id UUID NOT NULL,

  title TEXT NOT NULL CHECK (char_length(title) >= 3 AND char_length(title) <= 255),
  description TEXT,

  category TEXT NOT NULL DEFAULT 'OTHER' CHECK (category IN (
    'CIVIL', 'ELECTRICAL', 'PLUMBING', 'LANDSCAPING', 'AMENITY',
    'DOCUMENTATION', 'STATUTORY', 'INFRASTRUCTURE', 'OTHER'
  )),

  builder_name TEXT,
  responsible_person TEXT,

  target_date DATE,
  priority TEXT NOT NULL DEFAULT 'MEDIUM' CHECK (priority IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),

  status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN (
    'PENDING', 'IN_PROGRESS', 'COMPLETED', 'OVERDUE', 'DISPUTED', 'WAIVED'
  )),

  notes TEXT,
  evidence_urls JSONB NOT NULL DEFAULT '[]',

  completion_date DATE,
  verification_status TEXT NOT NULL DEFAULT 'UNVERIFIED' CHECK (
    verification_status IN ('UNVERIFIED', 'VERIFIED', 'REJECTED')
  ),
  verified_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  verified_at TIMESTAMPTZ,

  created_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  updated_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT fk_commitments_project_society
    FOREIGN KEY (handover_project_id, society_id)
    REFERENCES public.handover_projects(id, society_id)
    ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_handover_commitments_project_status
  ON public.handover_commitments(handover_project_id, status);
CREATE INDEX IF NOT EXISTS idx_handover_commitments_society_status
  ON public.handover_commitments(society_id, status);
CREATE INDEX IF NOT EXISTS idx_handover_commitments_target_date
  ON public.handover_commitments(society_id, target_date)
  WHERE status NOT IN ('COMPLETED', 'WAIVED');

ALTER TABLE public.handover_commitments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "handover_commitments_society_members_view"
  ON public.handover_commitments FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM public.society_memberships sm
      WHERE sm.society_id = handover_commitments.society_id
        AND sm.user_id = auth.uid() AND sm.status = 'ACTIVE')
  );

CREATE POLICY "handover_commitments_authorized_write"
  ON public.handover_commitments FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.society_memberships sm
      WHERE sm.society_id = handover_commitments.society_id
        AND sm.user_id = auth.uid() AND sm.status = 'ACTIVE'
        AND sm.role_id IN ('SOCIETY_ADMIN', 'SECRETARY', 'COMMITTEE_MEMBER', 'MANAGER'))
  );

-- ============================================================================
-- 5. HANDOVER STATUTORY & COMPLIANCE RECORDS
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.handover_statutory_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  society_id UUID NOT NULL REFERENCES public.societies(id) ON DELETE CASCADE,
  handover_project_id UUID NOT NULL,

  document_type TEXT NOT NULL CHECK (char_length(document_type) >= 2 AND char_length(document_type) <= 150),
  document_number TEXT,
  issuing_authority TEXT,

  issue_date DATE,
  expiry_date DATE,

  status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN (
    'PENDING', 'RECEIVED', 'VERIFIED', 'EXPIRED', 'NOT_APPLICABLE'
  )),

  document_url TEXT,
  notes TEXT,

  created_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  updated_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT fk_statutory_project_society
    FOREIGN KEY (handover_project_id, society_id)
    REFERENCES public.handover_projects(id, society_id)
    ON DELETE CASCADE
);

-- expiry_date index enables Phase 12 analytics to find upcoming expirations
CREATE INDEX IF NOT EXISTS idx_handover_statutory_expiry
  ON public.handover_statutory_records(society_id, expiry_date)
  WHERE status NOT IN ('EXPIRED', 'NOT_APPLICABLE');
CREATE INDEX IF NOT EXISTS idx_handover_statutory_project
  ON public.handover_statutory_records(handover_project_id, status);

ALTER TABLE public.handover_statutory_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "handover_statutory_society_members_view"
  ON public.handover_statutory_records FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM public.society_memberships sm
      WHERE sm.society_id = handover_statutory_records.society_id
        AND sm.user_id = auth.uid() AND sm.status = 'ACTIVE')
  );

CREATE POLICY "handover_statutory_authorized_write"
  ON public.handover_statutory_records FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.society_memberships sm
      WHERE sm.society_id = handover_statutory_records.society_id
        AND sm.user_id = auth.uid() AND sm.status = 'ACTIVE'
        AND sm.role_id IN ('SOCIETY_ADMIN', 'SECRETARY', 'COMMITTEE_MEMBER', 'MANAGER'))
  );

-- ============================================================================
-- 6. HANDOVER ASSETS
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.handover_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  society_id UUID NOT NULL REFERENCES public.societies(id) ON DELETE CASCADE,
  handover_project_id UUID NOT NULL,

  asset_name TEXT NOT NULL CHECK (char_length(asset_name) >= 2 AND char_length(asset_name) <= 255),
  category TEXT NOT NULL DEFAULT 'OTHER' CHECK (category IN (
    'PUMP', 'DG_SET', 'TRANSFORMER', 'LIFT', 'FIRE_EQUIPMENT', 'CCTV',
    'ACCESS_CONTROL', 'GYM_EQUIPMENT', 'CLUBHOUSE_EQUIPMENT',
    'GARDEN_EQUIPMENT', 'ELECTRICAL_INFRA', 'WATER_INFRA',
    'SOLAR_PANEL', 'INTERCOM', 'OTHER'
  )),

  location_description TEXT,
  building_id UUID REFERENCES public.buildings(id) ON DELETE SET NULL,

  manufacturer TEXT,
  model TEXT,
  serial_number TEXT,
  installation_date DATE,

  warranty_start DATE,
  warranty_end DATE,

  current_condition TEXT NOT NULL DEFAULT 'GOOD' CHECK (current_condition IN (
    'EXCELLENT', 'GOOD', 'FAIR', 'POOR', 'DEFECTIVE'
  )),

  handover_status TEXT NOT NULL DEFAULT 'PENDING' CHECK (handover_status IN (
    'PENDING', 'INSPECTED', 'ACCEPTED', 'REJECTED', 'UNDER_REPAIR'
  )),

  builder_vendor TEXT,
  document_urls JSONB NOT NULL DEFAULT '[]',
  notes TEXT,

  created_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  updated_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT fk_assets_project_society
    FOREIGN KEY (handover_project_id, society_id)
    REFERENCES public.handover_projects(id, society_id)
    ON DELETE CASCADE
);

-- warranty_end index for Phase 12 analytics
CREATE INDEX IF NOT EXISTS idx_handover_assets_warranty_end
  ON public.handover_assets(society_id, warranty_end)
  WHERE handover_status NOT IN ('REJECTED');
CREATE INDEX IF NOT EXISTS idx_handover_assets_project_status
  ON public.handover_assets(handover_project_id, handover_status);

ALTER TABLE public.handover_assets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "handover_assets_society_members_view"
  ON public.handover_assets FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM public.society_memberships sm
      WHERE sm.society_id = handover_assets.society_id
        AND sm.user_id = auth.uid() AND sm.status = 'ACTIVE')
  );

CREATE POLICY "handover_assets_authorized_write"
  ON public.handover_assets FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.society_memberships sm
      WHERE sm.society_id = handover_assets.society_id
        AND sm.user_id = auth.uid() AND sm.status = 'ACTIVE'
        AND sm.role_id IN ('SOCIETY_ADMIN', 'SECRETARY', 'COMMITTEE_MEMBER', 'MANAGER'))
  );

-- ============================================================================
-- 7. HANDOVER AMC / WARRANTIES / SERVICE CONTRACTS
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.handover_amc_warranties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  society_id UUID NOT NULL REFERENCES public.societies(id) ON DELETE CASCADE,
  handover_project_id UUID NOT NULL,

  -- Optional link to asset
  handover_asset_id UUID REFERENCES public.handover_assets(id) ON DELETE SET NULL,

  title TEXT NOT NULL CHECK (char_length(title) >= 2 AND char_length(title) <= 255),
  contract_type TEXT NOT NULL DEFAULT 'AMC' CHECK (contract_type IN (
    'AMC', 'WARRANTY', 'SERVICE_CONTRACT', 'VENDOR_CONTRACT', 'OTHER'
  )),

  vendor_name TEXT,
  contact_person TEXT,
  contact_phone TEXT,
  contact_email TEXT,

  start_date DATE,
  end_date DATE,
  renewal_date DATE,

  contract_document_url TEXT,
  status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN (
    'ACTIVE', 'EXPIRED', 'TRANSFERRED', 'CANCELLED', 'RENEWAL_DUE'
  )),
  notes TEXT,

  created_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  updated_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT fk_amc_project_society
    FOREIGN KEY (handover_project_id, society_id)
    REFERENCES public.handover_projects(id, society_id)
    ON DELETE CASCADE
);

-- end_date / renewal_date indexes for Phase 12 analytics ("3 AMCs expire within 30 days")
CREATE INDEX IF NOT EXISTS idx_handover_amc_end_date
  ON public.handover_amc_warranties(society_id, end_date)
  WHERE status NOT IN ('EXPIRED', 'CANCELLED');
CREATE INDEX IF NOT EXISTS idx_handover_amc_renewal_date
  ON public.handover_amc_warranties(society_id, renewal_date)
  WHERE status = 'ACTIVE';
CREATE INDEX IF NOT EXISTS idx_handover_amc_project
  ON public.handover_amc_warranties(handover_project_id, status);

ALTER TABLE public.handover_amc_warranties ENABLE ROW LEVEL SECURITY;

CREATE POLICY "handover_amc_society_members_view"
  ON public.handover_amc_warranties FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM public.society_memberships sm
      WHERE sm.society_id = handover_amc_warranties.society_id
        AND sm.user_id = auth.uid() AND sm.status = 'ACTIVE')
  );

CREATE POLICY "handover_amc_authorized_write"
  ON public.handover_amc_warranties FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.society_memberships sm
      WHERE sm.society_id = handover_amc_warranties.society_id
        AND sm.user_id = auth.uid() AND sm.status = 'ACTIVE'
        AND sm.role_id IN ('SOCIETY_ADMIN', 'SECRETARY', 'COMMITTEE_MEMBER', 'MANAGER'))
  );

-- ============================================================================
-- 8. HANDOVER METERS & READINGS
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.handover_meters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  society_id UUID NOT NULL REFERENCES public.societies(id) ON DELETE CASCADE,
  handover_project_id UUID NOT NULL,

  meter_type TEXT NOT NULL CHECK (meter_type IN (
    'ELECTRICITY_MAIN', 'ELECTRICITY_DG', 'WATER_MAIN', 'WATER_STP',
    'GAS', 'SOLAR', 'LIFT_ELECTRICITY', 'OTHER'
  )),

  meter_number TEXT,
  location_description TEXT,
  building_id UUID REFERENCES public.buildings(id) ON DELETE SET NULL,
  unit_id UUID REFERENCES public.units(id) ON DELETE SET NULL,

  handover_reading NUMERIC(15, 3),
  reading_date DATE,
  unit_of_measurement TEXT,

  notes TEXT,
  evidence_urls JSONB NOT NULL DEFAULT '[]',

  created_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  updated_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT fk_meters_project_society
    FOREIGN KEY (handover_project_id, society_id)
    REFERENCES public.handover_projects(id, society_id)
    ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_handover_meters_project
  ON public.handover_meters(handover_project_id);
CREATE INDEX IF NOT EXISTS idx_handover_meters_society
  ON public.handover_meters(society_id);

ALTER TABLE public.handover_meters ENABLE ROW LEVEL SECURITY;

CREATE POLICY "handover_meters_society_members_view"
  ON public.handover_meters FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM public.society_memberships sm
      WHERE sm.society_id = handover_meters.society_id
        AND sm.user_id = auth.uid() AND sm.status = 'ACTIVE')
  );

CREATE POLICY "handover_meters_authorized_write"
  ON public.handover_meters FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.society_memberships sm
      WHERE sm.society_id = handover_meters.society_id
        AND sm.user_id = auth.uid() AND sm.status = 'ACTIVE'
        AND sm.role_id IN ('SOCIETY_ADMIN', 'SECRETARY', 'COMMITTEE_MEMBER', 'MANAGER'))
  );

-- ============================================================================
-- 9. HANDOVER DOCUMENT LINKS
--    Links handover entities to existing society_documents rows.
--    Does NOT create a second document storage system.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.handover_document_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  society_id UUID NOT NULL REFERENCES public.societies(id) ON DELETE CASCADE,
  handover_project_id UUID NOT NULL,

  -- Link to existing documents
  document_id UUID NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,

  -- Optional context: which entity this document belongs to
  entity_type TEXT CHECK (entity_type IN (
    'PROJECT', 'CHECKLIST_ITEM', 'DEFECT', 'COMMITMENT',
    'STATUTORY', 'ASSET', 'AMC_WARRANTY', 'METER', 'GENERAL'
  )) DEFAULT 'GENERAL',
  entity_id UUID,

  notes TEXT,

  linked_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT uq_handover_doc_link UNIQUE (handover_project_id, document_id, entity_type, entity_id),
  CONSTRAINT fk_doc_links_project_society
    FOREIGN KEY (handover_project_id, society_id)
    REFERENCES public.handover_projects(id, society_id)
    ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_handover_doc_links_project
  ON public.handover_document_links(handover_project_id);
CREATE INDEX IF NOT EXISTS idx_handover_doc_links_entity
  ON public.handover_document_links(entity_type, entity_id);

ALTER TABLE public.handover_document_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "handover_doc_links_society_view"
  ON public.handover_document_links FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM public.society_memberships sm
      WHERE sm.society_id = handover_document_links.society_id
        AND sm.user_id = auth.uid() AND sm.status = 'ACTIVE')
  );

CREATE POLICY "handover_doc_links_authorized_write"
  ON public.handover_document_links FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.society_memberships sm
      WHERE sm.society_id = handover_document_links.society_id
        AND sm.user_id = auth.uid() AND sm.status = 'ACTIVE'
        AND sm.role_id IN ('SOCIETY_ADMIN', 'SECRETARY', 'COMMITTEE_MEMBER', 'MANAGER'))
  );

-- ============================================================================
-- 10. HANDOVER MEETING LINKS
--     Links handover projects to existing society_meetings rows.
--     Reuses Phase 11.3 meeting infrastructure.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.handover_meeting_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  society_id UUID NOT NULL REFERENCES public.societies(id) ON DELETE CASCADE,
  handover_project_id UUID NOT NULL,

  meeting_id UUID NOT NULL REFERENCES public.society_meetings(id) ON DELETE CASCADE,

  notes TEXT,
  linked_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT uq_handover_meeting_link UNIQUE (handover_project_id, meeting_id),
  CONSTRAINT fk_meeting_links_project_society
    FOREIGN KEY (handover_project_id, society_id)
    REFERENCES public.handover_projects(id, society_id)
    ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_handover_meeting_links_project
  ON public.handover_meeting_links(handover_project_id);

ALTER TABLE public.handover_meeting_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "handover_meeting_links_society_view"
  ON public.handover_meeting_links FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM public.society_memberships sm
      WHERE sm.society_id = handover_meeting_links.society_id
        AND sm.user_id = auth.uid() AND sm.status = 'ACTIVE')
  );

CREATE POLICY "handover_meeting_links_authorized_write"
  ON public.handover_meeting_links FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.society_memberships sm
      WHERE sm.society_id = handover_meeting_links.society_id
        AND sm.user_id = auth.uid() AND sm.status = 'ACTIVE'
        AND sm.role_id IN ('SOCIETY_ADMIN', 'SECRETARY', 'COMMITTEE_MEMBER', 'MANAGER'))
  );
