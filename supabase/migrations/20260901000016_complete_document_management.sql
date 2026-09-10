-- DwellSync Migration: Complete Document Management Module
-- Enhances documents table, introduces document_folders, document_versions,
-- document_entity_links, private Supabase Storage bucket, and comprehensive RLS.
-- LOCAL ONLY — do not execute against remote database.

-- ============================================================================
-- 1. DOCUMENT FOLDERS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.document_folders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  society_id UUID NOT NULL REFERENCES public.societies(id) ON DELETE CASCADE,
  name TEXT NOT NULL CHECK (char_length(name) >= 1 AND char_length(name) <= 100),
  description TEXT,
  parent_id UUID REFERENCES public.document_folders(id) ON DELETE CASCADE,
  color TEXT DEFAULT '#3B82F6',
  icon TEXT DEFAULT 'Folder',
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_doc_folders_id_society UNIQUE (id, society_id)
);

CREATE INDEX IF NOT EXISTS idx_doc_folders_society ON public.document_folders(society_id);
CREATE INDEX IF NOT EXISTS idx_doc_folders_parent ON public.document_folders(society_id, parent_id);

ALTER TABLE public.document_folders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members can view document folders in their society" ON public.document_folders;
CREATE POLICY "Members can view document folders in their society"
  ON public.document_folders FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.society_memberships sm
      WHERE sm.society_id = document_folders.society_id
        AND sm.user_id = auth.uid()
        AND sm.status = 'ACTIVE'
    )
  );

DROP POLICY IF EXISTS "Authorized roles can manage document folders" ON public.document_folders;
CREATE POLICY "Authorized roles can manage document folders"
  ON public.document_folders FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.society_memberships sm
      WHERE sm.society_id = document_folders.society_id
        AND sm.user_id = auth.uid()
        AND sm.status = 'ACTIVE'
        AND sm.role_id IN ('SOCIETY_ADMIN', 'SECRETARY', 'COMMITTEE_MEMBER', 'MANAGER', 'SUPER_ADMIN')
    )
  );

-- ============================================================================
-- 2. EXTEND DOCUMENTS TABLE
-- ============================================================================

-- Ensure composite unique constraint on documents(id, society_id)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'uq_documents_id_society'
      AND conrelid = 'public.documents'::regclass
  ) THEN
    ALTER TABLE public.documents ADD CONSTRAINT uq_documents_id_society UNIQUE (id, society_id);
  END IF;
END $$;

-- Update category CHECK constraint to encompass all society domain categories
DO $$
BEGIN
  ALTER TABLE public.documents DROP CONSTRAINT IF EXISTS documents_category_check;
  ALTER TABLE public.documents ADD CONSTRAINT documents_category_check CHECK (
    category IN (
      'SOCIETY_BYLAWS',
      'AGM_MINUTES',
      'FINANCIAL_REPORT',
      'FORMS_TEMPLATES',
      'RULES_REGULATIONS',
      'STATUTORY_COMPLIANCE',
      'ENGINEERING_MAINTENANCE',
      'LEGAL_CONTRACTS',
      'BUILDER_HANDOVER',
      'NOTICES_CIRCULARS',
      'RESIDENT_UNIT_DOCUMENTS',
      'GENERAL'
    )
  );
END $$;

-- Update visibility CHECK constraint to support admin-only and custom role restrictions
DO $$
BEGIN
  ALTER TABLE public.documents DROP CONSTRAINT IF EXISTS documents_visibility_check;
  ALTER TABLE public.documents ADD CONSTRAINT documents_visibility_check CHECK (
    visibility IN (
      'ALL_RESIDENTS',
      'OWNERS_ONLY',
      'COMMITTEE_ONLY',
      'ADMIN_ONLY',
      'ROLE_RESTRICTED'
    )
  );
END $$;

-- Add new columns for subcategories, folders, tags, lifecycle status, versions, and attribution
ALTER TABLE public.documents
  ADD COLUMN IF NOT EXISTS subcategory TEXT,
  ADD COLUMN IF NOT EXISTS folder_id UUID REFERENCES public.document_folders(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS tags TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'PUBLISHED' CHECK (status IN ('DRAFT', 'UNDER_REVIEW', 'APPROVED', 'PUBLISHED', 'ARCHIVED')),
  ADD COLUMN IF NOT EXISTS allowed_roles TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS unit_id UUID REFERENCES public.units(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS resident_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS document_date DATE,
  ADD COLUMN IF NOT EXISTS effective_date DATE,
  ADD COLUMN IF NOT EXISTS expiry_date DATE,
  ADD COLUMN IF NOT EXISTS file_path TEXT,
  ADD COLUMN IF NOT EXISTS current_version INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS is_archived BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS archived_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS published_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS published_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS publication_notes TEXT;

-- Composite & performance indexes
CREATE INDEX IF NOT EXISTS idx_documents_society_status ON public.documents(society_id, status);
CREATE INDEX IF NOT EXISTS idx_documents_society_category ON public.documents(society_id, category);
CREATE INDEX IF NOT EXISTS idx_documents_society_folder ON public.documents(society_id, folder_id);
CREATE INDEX IF NOT EXISTS idx_documents_society_expiry ON public.documents(society_id, expiry_date) WHERE expiry_date IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_documents_society_unit ON public.documents(society_id, unit_id) WHERE unit_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_documents_society_resident ON public.documents(society_id, resident_id) WHERE resident_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_documents_tags ON public.documents USING GIN(tags);

-- ============================================================================
-- 3. DOCUMENT VERSIONS TABLE (NON-DESTRUCTIVE HISTORY)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.document_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  society_id UUID NOT NULL REFERENCES public.societies(id) ON DELETE CASCADE,
  document_id UUID NOT NULL,
  version_number INTEGER NOT NULL CHECK (version_number >= 1),
  file_url TEXT NOT NULL,
  file_path TEXT,
  file_name TEXT,
  file_type TEXT,
  file_size_kb INTEGER,
  change_summary TEXT,
  uploaded_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_doc_versions_doc_ver UNIQUE (document_id, version_number),
  CONSTRAINT fk_doc_versions_doc_society
    FOREIGN KEY (document_id, society_id)
    REFERENCES public.documents(id, society_id)
    ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_doc_versions_doc ON public.document_versions(document_id, version_number DESC);
CREATE INDEX IF NOT EXISTS idx_doc_versions_society ON public.document_versions(society_id);

ALTER TABLE public.document_versions ENABLE ROW LEVEL SECURITY;

-- Auto-seed Version 1 records for any existing documents that lack versions
INSERT INTO public.document_versions (
  society_id,
  document_id,
  version_number,
  file_url,
  file_type,
  file_size_kb,
  uploaded_by,
  change_summary,
  created_at
)
SELECT
  d.society_id,
  d.id,
  1,
  d.file_url,
  COALESCE(d.file_type, 'PDF'),
  d.file_size_kb,
  d.uploaded_by,
  'Initial version',
  d.created_at
FROM public.documents d
ON CONFLICT (document_id, version_number) DO NOTHING;

-- ============================================================================
-- 4. DOCUMENT ENTITY LINKS TABLE (CROSS-MODULE INTEGRATIONS)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.document_entity_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  society_id UUID NOT NULL REFERENCES public.societies(id) ON DELETE CASCADE,
  document_id UUID NOT NULL,
  entity_type TEXT NOT NULL CHECK (
    entity_type IN (
      'FINANCIAL_REPORT',
      'EXPENSE_VOUCHER',
      'INVOICE',
      'PAYMENT',
      'RECEIPT',
      'BANK_RECONCILIATION',
      'NOTICE',
      'MEETING',
      'HANDOVER_PROJECT',
      'HANDOVER_DEFECT',
      'HANDOVER_ASSET',
      'HANDOVER_CONTRACT',
      'COMPLAINT',
      'UNIT',
      'RESIDENT',
      'ASSET',
      'ASSET_MAINTENANCE',
      'INVENTORY_ITEM',
      'STOCK_MOVEMENT',
      'GENERAL'
    )
  ),
  entity_id UUID NOT NULL,
  relationship_type TEXT DEFAULT 'ATTACHMENT',
  notes TEXT,
  linked_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_doc_entity_link UNIQUE (society_id, document_id, entity_type, entity_id),
  CONSTRAINT fk_doc_entity_links_doc_society
    FOREIGN KEY (document_id, society_id)
    REFERENCES public.documents(id, society_id)
    ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_doc_entity_links_doc ON public.document_entity_links(document_id);
CREATE INDEX IF NOT EXISTS idx_doc_entity_links_entity ON public.document_entity_links(society_id, entity_type, entity_id);

ALTER TABLE public.document_entity_links ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 5. PRIVATE SUPABASE STORAGE BUCKET INITIALIZATION
-- ============================================================================

INSERT INTO storage.buckets (id, name, public)
VALUES ('society-documents', 'society-documents', false)
ON CONFLICT (id) DO UPDATE SET public = false;

-- Storage object RLS: authenticated members can access their society path
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'storage' AND tablename = 'objects') THEN
    DROP POLICY IF EXISTS "Members can access their society documents" ON storage.objects;
    CREATE POLICY "Members can access their society documents"
      ON storage.objects FOR SELECT
      TO authenticated
      USING (
        bucket_id = 'society-documents' AND
        EXISTS (
          SELECT 1 FROM public.society_memberships sm
          WHERE (storage.foldername(name))[1] = sm.society_id::text
            AND sm.user_id = auth.uid()
            AND sm.status = 'ACTIVE'
        )
      );

    DROP POLICY IF EXISTS "Authorized roles can upload society documents" ON storage.objects;
    CREATE POLICY "Authorized roles can upload society documents"
      ON storage.objects FOR INSERT
      TO authenticated
      WITH CHECK (
        bucket_id = 'society-documents' AND
        EXISTS (
          SELECT 1 FROM public.society_memberships sm
          WHERE (storage.foldername(name))[1] = sm.society_id::text
            AND sm.user_id = auth.uid()
            AND sm.status = 'ACTIVE'
            AND sm.role_id IN ('SOCIETY_ADMIN', 'SECRETARY', 'COMMITTEE_MEMBER', 'MANAGER', 'TREASURER', 'SUPER_ADMIN')
        )
      );
  END IF;
END $$;

-- ============================================================================
-- 6. UPDATED DOCUMENTS RLS POLICIES
-- ============================================================================

DROP POLICY IF EXISTS "Members can view documents based on role visibility" ON public.documents;
CREATE POLICY "Members can view documents based on role visibility"
  ON public.documents FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.society_memberships sm
      WHERE sm.society_id = documents.society_id
        AND sm.user_id = auth.uid()
        AND sm.status = 'ACTIVE'
        AND (
          -- Admins, Secretary, and Committee Members see everything in their society
          sm.role_id IN ('SOCIETY_ADMIN', 'SECRETARY', 'COMMITTEE_MEMBER', 'MANAGER', 'TREASURER', 'SUPER_ADMIN')
          -- Residents / Owners see only published, non-archived documents matching their visibility
          OR (
            documents.status = 'PUBLISHED'
            AND documents.is_archived = false
            AND (
              documents.visibility = 'ALL_RESIDENTS'
              OR (documents.visibility = 'OWNERS_ONLY' AND sm.role_id = 'OWNER')
              OR (documents.visibility = 'ROLE_RESTRICTED' AND sm.role_id = ANY(documents.allowed_roles))
              OR (documents.resident_id = auth.uid())
              OR (
                documents.unit_id IS NOT NULL AND (
                  EXISTS (
                    SELECT 1 FROM public.unit_owners uo
                    WHERE uo.unit_id = documents.unit_id
                      AND uo.user_id = auth.uid()
                      AND uo.status = 'ACTIVE'
                  )
                  OR EXISTS (
                    SELECT 1 FROM public.unit_occupancies uocc
                    WHERE uocc.unit_id = documents.unit_id
                      AND uocc.user_id = auth.uid()
                      AND uocc.status = 'ACTIVE'
                  )
                )
              )
            )
          )
        )
    )
  );

-- Version RLS policies
DROP POLICY IF EXISTS "Members can view document versions based on parent document" ON public.document_versions;
CREATE POLICY "Members can view document versions based on parent document"
  ON public.document_versions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.documents d
      WHERE d.id = document_versions.document_id
        AND d.society_id = document_versions.society_id
    )
  );

DROP POLICY IF EXISTS "Authorized users can manage document versions" ON public.document_versions;
CREATE POLICY "Authorized users can manage document versions"
  ON public.document_versions FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.society_memberships sm
      WHERE sm.society_id = document_versions.society_id
        AND sm.user_id = auth.uid()
        AND sm.status = 'ACTIVE'
        AND sm.role_id IN ('SOCIETY_ADMIN', 'SECRETARY', 'COMMITTEE_MEMBER', 'MANAGER', 'TREASURER', 'SUPER_ADMIN')
    )
  );

-- Entity links RLS policies
DROP POLICY IF EXISTS "Members can view document entity links" ON public.document_entity_links;
CREATE POLICY "Members can view document entity links"
  ON public.document_entity_links FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.society_memberships sm
      WHERE sm.society_id = document_entity_links.society_id
        AND sm.user_id = auth.uid()
        AND sm.status = 'ACTIVE'
    )
  );

DROP POLICY IF EXISTS "Authorized users can manage document entity links" ON public.document_entity_links;
CREATE POLICY "Authorized users can manage document entity links"
  ON public.document_entity_links FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.society_memberships sm
      WHERE sm.society_id = document_entity_links.society_id
        AND sm.user_id = auth.uid()
        AND sm.status = 'ACTIVE'
        AND sm.role_id IN ('SOCIETY_ADMIN', 'SECRETARY', 'COMMITTEE_MEMBER', 'MANAGER', 'TREASURER', 'SUPER_ADMIN')
    )
  );
