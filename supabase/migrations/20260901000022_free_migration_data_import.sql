-- ============================================================================
-- Migration: 20260901000022_free_migration_data_import.sql
-- Description: Free Migration / Society Data Import foundation
-- Fully idempotent, safely rerunnable, zero-cost, tenant-isolated
-- ============================================================================

-- 1. Create import_jobs table if it doesn't already exist
CREATE TABLE IF NOT EXISTS public.import_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    society_id UUID NOT NULL,
    import_type TEXT NOT NULL,
    file_name TEXT NOT NULL,
    file_size_bytes INTEGER NOT NULL,
    file_format TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'PENDING',
    total_rows INTEGER NOT NULL DEFAULT 0,
    valid_rows INTEGER NOT NULL DEFAULT 0,
    invalid_rows INTEGER NOT NULL DEFAULT 0,
    created_rows INTEGER NOT NULL DEFAULT 0,
    updated_rows INTEGER NOT NULL DEFAULT 0,
    skipped_rows INTEGER NOT NULL DEFAULT 0,
    is_dry_run BOOLEAN NOT NULL DEFAULT true,
    column_mapping JSONB NOT NULL DEFAULT '{}'::jsonb,
    summary JSONB NOT NULL DEFAULT '{}'::jsonb,
    error_report JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_by UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Idempotently ensure all columns exist
DO $$
BEGIN
    ALTER TABLE public.import_jobs ADD COLUMN IF NOT EXISTS society_id UUID;
    ALTER TABLE public.import_jobs ADD COLUMN IF NOT EXISTS import_type TEXT;
    ALTER TABLE public.import_jobs ADD COLUMN IF NOT EXISTS file_name TEXT;
    ALTER TABLE public.import_jobs ADD COLUMN IF NOT EXISTS file_size_bytes INTEGER;
    ALTER TABLE public.import_jobs ADD COLUMN IF NOT EXISTS file_format TEXT;
    ALTER TABLE public.import_jobs ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'PENDING';
    ALTER TABLE public.import_jobs ADD COLUMN IF NOT EXISTS total_rows INTEGER DEFAULT 0;
    ALTER TABLE public.import_jobs ADD COLUMN IF NOT EXISTS valid_rows INTEGER DEFAULT 0;
    ALTER TABLE public.import_jobs ADD COLUMN IF NOT EXISTS invalid_rows INTEGER DEFAULT 0;
    ALTER TABLE public.import_jobs ADD COLUMN IF NOT EXISTS created_rows INTEGER DEFAULT 0;
    ALTER TABLE public.import_jobs ADD COLUMN IF NOT EXISTS updated_rows INTEGER DEFAULT 0;
    ALTER TABLE public.import_jobs ADD COLUMN IF NOT EXISTS skipped_rows INTEGER DEFAULT 0;
    ALTER TABLE public.import_jobs ADD COLUMN IF NOT EXISTS is_dry_run BOOLEAN DEFAULT true;
    ALTER TABLE public.import_jobs ADD COLUMN IF NOT EXISTS column_mapping JSONB DEFAULT '{}'::jsonb;
    ALTER TABLE public.import_jobs ADD COLUMN IF NOT EXISTS summary JSONB DEFAULT '{}'::jsonb;
    ALTER TABLE public.import_jobs ADD COLUMN IF NOT EXISTS error_report JSONB DEFAULT '[]'::jsonb;
    ALTER TABLE public.import_jobs ADD COLUMN IF NOT EXISTS created_by UUID;
    ALTER TABLE public.import_jobs ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
    ALTER TABLE public.import_jobs ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
END $$;

-- 3. Idempotently add CHECK constraints
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'check_import_jobs_import_type'
    ) THEN
        ALTER TABLE public.import_jobs 
            ADD CONSTRAINT check_import_jobs_import_type 
            CHECK (import_type IN ('UNITS_STRUCTURE', 'RESIDENTS_MEMBERS', 'OWNERSHIP_OCCUPANCY', 'MASTER_SOCIETY_DATA'));
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'check_import_jobs_file_format'
    ) THEN
        ALTER TABLE public.import_jobs 
            ADD CONSTRAINT check_import_jobs_file_format 
            CHECK (file_format IN ('csv', 'xlsx'));
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'check_import_jobs_status'
    ) THEN
        ALTER TABLE public.import_jobs 
            ADD CONSTRAINT check_import_jobs_status 
            CHECK (status IN ('PENDING', 'VALIDATING', 'VALIDATED', 'IMPORTING', 'COMPLETED', 'FAILED', 'ROLLED_BACK'));
    END IF;
END $$;

-- 4. Idempotently add Foreign Keys
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'fk_import_jobs_society'
    ) THEN
        ALTER TABLE public.import_jobs 
            ADD CONSTRAINT fk_import_jobs_society 
            FOREIGN KEY (society_id) REFERENCES public.societies(id) ON DELETE CASCADE;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'fk_import_jobs_created_by'
    ) THEN
        ALTER TABLE public.import_jobs 
            ADD CONSTRAINT fk_import_jobs_created_by 
            FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE SET NULL;
    END IF;
END $$;

-- 5. Performance & Lookup Indexes
CREATE INDEX IF NOT EXISTS idx_import_jobs_society_created 
    ON public.import_jobs(society_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_import_jobs_status 
    ON public.import_jobs(society_id, status);

CREATE INDEX IF NOT EXISTS idx_import_jobs_created_by 
    ON public.import_jobs(created_by);

-- 6. Enable Row Level Security
ALTER TABLE public.import_jobs ENABLE ROW LEVEL SECURITY;

-- 7. Idempotent RLS Policies
DROP POLICY IF EXISTS "Super admins can manage all import jobs" ON public.import_jobs;
CREATE POLICY "Super admins can manage all import jobs"
    ON public.import_jobs
    FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.platform_admins
            WHERE platform_admins.user_id = auth.uid()
            AND platform_admins.role_id = 'SUPER_ADMIN'
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.platform_admins
            WHERE platform_admins.user_id = auth.uid()
            AND platform_admins.role_id = 'SUPER_ADMIN'
        )
    );

DROP POLICY IF EXISTS "Society management can view import jobs" ON public.import_jobs;
CREATE POLICY "Society management can view import jobs"
    ON public.import_jobs
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.society_memberships
            WHERE society_memberships.society_id = import_jobs.society_id
            AND society_memberships.user_id = auth.uid()
            AND society_memberships.status = 'ACTIVE'
            AND society_memberships.role_id IN ('SOCIETY_ADMIN', 'SECRETARY', 'MANAGER', 'TREASURER')
        )
    );

DROP POLICY IF EXISTS "Society management can create and update import jobs" ON public.import_jobs;
CREATE POLICY "Society management can create and update import jobs"
    ON public.import_jobs
    FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.society_memberships
            WHERE society_memberships.society_id = import_jobs.society_id
            AND society_memberships.user_id = auth.uid()
            AND society_memberships.status = 'ACTIVE'
            AND society_memberships.role_id IN ('SOCIETY_ADMIN', 'SECRETARY', 'MANAGER', 'TREASURER')
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.society_memberships
            WHERE society_memberships.society_id = import_jobs.society_id
            AND society_memberships.user_id = auth.uid()
            AND society_memberships.status = 'ACTIVE'
            AND society_memberships.role_id IN ('SOCIETY_ADMIN', 'SECRETARY', 'MANAGER', 'TREASURER')
        )
    );
