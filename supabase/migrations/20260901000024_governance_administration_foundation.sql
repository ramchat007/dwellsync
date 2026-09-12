-- ============================================================================
-- Migration: 20260901000024_governance_administration_foundation.sql
-- Description: DwellSync Phase 11 — Governance & Administration Foundation
-- Fully idempotent, safely rerunnable, tenant-isolated, zero-cost
-- ============================================================================

-- 1. Society Administrative Settings Table
CREATE TABLE IF NOT EXISTS public.society_settings (
    society_id UUID PRIMARY KEY,
    financial_year_start_month INTEGER NOT NULL DEFAULT 4,
    agm_due_month INTEGER NOT NULL DEFAULT 9,
    quorum_percentage NUMERIC(5, 2) NOT NULL DEFAULT 30.00,
    default_meeting_duration_minutes INTEGER NOT NULL DEFAULT 60,
    require_visitor_preapproval BOOLEAN NOT NULL DEFAULT false,
    auto_escalate_complaints BOOLEAN NOT NULL DEFAULT true,
    rules_and_by_laws TEXT,
    emergency_contacts JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Idempotently ensure columns in society_settings
DO $$
BEGIN
    ALTER TABLE public.society_settings ADD COLUMN IF NOT EXISTS financial_year_start_month INTEGER DEFAULT 4;
    ALTER TABLE public.society_settings ADD COLUMN IF NOT EXISTS agm_due_month INTEGER DEFAULT 9;
    ALTER TABLE public.society_settings ADD COLUMN IF NOT EXISTS quorum_percentage NUMERIC(5, 2) DEFAULT 30.00;
    ALTER TABLE public.society_settings ADD COLUMN IF NOT EXISTS default_meeting_duration_minutes INTEGER DEFAULT 60;
    ALTER TABLE public.society_settings ADD COLUMN IF NOT EXISTS require_visitor_preapproval BOOLEAN DEFAULT false;
    ALTER TABLE public.society_settings ADD COLUMN IF NOT EXISTS auto_escalate_complaints BOOLEAN DEFAULT true;
    ALTER TABLE public.society_settings ADD COLUMN IF NOT EXISTS rules_and_by_laws TEXT;
    ALTER TABLE public.society_settings ADD COLUMN IF NOT EXISTS emergency_contacts JSONB DEFAULT '[]'::jsonb;
    ALTER TABLE public.society_settings ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();
END $$;

-- Guarded Foreign Keys & CHECK Constraints for society_settings
DO $$
BEGIN
    -- Foreign key to public.societies(id)
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'fk_society_settings_society'
    ) AND NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'society_settings_society_id_fkey'
    ) THEN
        ALTER TABLE public.society_settings
        ADD CONSTRAINT fk_society_settings_society
        FOREIGN KEY (society_id) REFERENCES public.societies(id) ON DELETE CASCADE;
    END IF;

    -- CHECK constraints
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_financial_year_start_month') THEN
        ALTER TABLE public.society_settings
        ADD CONSTRAINT chk_financial_year_start_month
        CHECK (financial_year_start_month BETWEEN 1 AND 12);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_agm_due_month') THEN
        ALTER TABLE public.society_settings
        ADD CONSTRAINT chk_agm_due_month
        CHECK (agm_due_month BETWEEN 1 AND 12);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_quorum_percentage') THEN
        ALTER TABLE public.society_settings
        ADD CONSTRAINT chk_quorum_percentage
        CHECK (quorum_percentage > 0 AND quorum_percentage <= 100);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_default_meeting_duration') THEN
        ALTER TABLE public.society_settings
        ADD CONSTRAINT chk_default_meeting_duration
        CHECK (default_meeting_duration_minutes > 0);
    END IF;
END $$;

-- 2. Governance Decisions & Resolutions Register Table
CREATE TABLE IF NOT EXISTS public.governance_resolutions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    society_id UUID NOT NULL,
    meeting_id UUID,
    resolution_number TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    resolution_type TEXT NOT NULL DEFAULT 'ORDINARY',
    status TEXT NOT NULL DEFAULT 'PASSED',
    proposed_by UUID,
    seconded_by UUID,
    votes_for INTEGER NOT NULL DEFAULT 0,
    votes_against INTEGER NOT NULL DEFAULT 0,
    votes_abstained INTEGER NOT NULL DEFAULT 0,
    passed_date DATE NOT NULL DEFAULT CURRENT_DATE,
    effective_date DATE NOT NULL DEFAULT CURRENT_DATE,
    notes TEXT,
    created_by UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Idempotently ensure columns in governance_resolutions
DO $$
BEGIN
    ALTER TABLE public.governance_resolutions ADD COLUMN IF NOT EXISTS meeting_id UUID;
    ALTER TABLE public.governance_resolutions ADD COLUMN IF NOT EXISTS resolution_type TEXT DEFAULT 'ORDINARY';
    ALTER TABLE public.governance_resolutions ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'PASSED';
    ALTER TABLE public.governance_resolutions ADD COLUMN IF NOT EXISTS votes_for INTEGER DEFAULT 0;
    ALTER TABLE public.governance_resolutions ADD COLUMN IF NOT EXISTS votes_against INTEGER DEFAULT 0;
    ALTER TABLE public.governance_resolutions ADD COLUMN IF NOT EXISTS votes_abstained INTEGER DEFAULT 0;
    ALTER TABLE public.governance_resolutions ADD COLUMN IF NOT EXISTS passed_date DATE DEFAULT CURRENT_DATE;
    ALTER TABLE public.governance_resolutions ADD COLUMN IF NOT EXISTS effective_date DATE DEFAULT CURRENT_DATE;
    ALTER TABLE public.governance_resolutions ADD COLUMN IF NOT EXISTS notes TEXT;
    ALTER TABLE public.governance_resolutions ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();
END $$;

-- Guarded Foreign Keys, Unique Constraints & CHECK Constraints for governance_resolutions
DO $$
BEGIN
    -- Foreign key to public.societies(id)
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'fk_resolutions_society'
    ) AND NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'governance_resolutions_society_id_fkey'
    ) THEN
        ALTER TABLE public.governance_resolutions
        ADD CONSTRAINT fk_resolutions_society
        FOREIGN KEY (society_id) REFERENCES public.societies(id) ON DELETE CASCADE;
    END IF;

    -- Foreign key to public.society_meetings(id)
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'fk_resolutions_meeting'
    ) AND NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'governance_resolutions_meeting_id_fkey'
    ) THEN
        ALTER TABLE public.governance_resolutions
        ADD CONSTRAINT fk_resolutions_meeting
        FOREIGN KEY (meeting_id) REFERENCES public.society_meetings(id) ON DELETE SET NULL;
    END IF;

    -- Foreign key to public.profiles(id) for proposed_by
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'fk_resolutions_proposed_by'
    ) AND NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'governance_resolutions_proposed_by_fkey'
    ) THEN
        ALTER TABLE public.governance_resolutions
        ADD CONSTRAINT fk_resolutions_proposed_by
        FOREIGN KEY (proposed_by) REFERENCES public.profiles(id) ON DELETE SET NULL;
    END IF;

    -- Foreign key to public.profiles(id) for seconded_by
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'fk_resolutions_seconded_by'
    ) AND NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'governance_resolutions_seconded_by_fkey'
    ) THEN
        ALTER TABLE public.governance_resolutions
        ADD CONSTRAINT fk_resolutions_seconded_by
        FOREIGN KEY (seconded_by) REFERENCES public.profiles(id) ON DELETE SET NULL;
    END IF;

    -- Foreign key to public.profiles(id) for created_by
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'fk_resolutions_created_by'
    ) AND NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'governance_resolutions_created_by_fkey'
    ) THEN
        ALTER TABLE public.governance_resolutions
        ADD CONSTRAINT fk_resolutions_created_by
        FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE SET NULL;
    END IF;

    -- Unique constraint (society_id, resolution_number)
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'uq_resolution_number_society'
    ) THEN
        ALTER TABLE public.governance_resolutions
        ADD CONSTRAINT uq_resolution_number_society
        UNIQUE (society_id, resolution_number);
    END IF;

    -- CHECK constraints
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_resolution_type') THEN
        ALTER TABLE public.governance_resolutions
        ADD CONSTRAINT chk_resolution_type
        CHECK (resolution_type IN ('ORDINARY', 'SPECIAL', 'CIRCULAR', 'EMERGENCY'));
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_resolution_status') THEN
        ALTER TABLE public.governance_resolutions
        ADD CONSTRAINT chk_resolution_status
        CHECK (status IN ('PROPOSED', 'PASSED', 'REJECTED', 'DEFERRED'));
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_votes_for') THEN
        ALTER TABLE public.governance_resolutions
        ADD CONSTRAINT chk_votes_for
        CHECK (votes_for >= 0);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_votes_against') THEN
        ALTER TABLE public.governance_resolutions
        ADD CONSTRAINT chk_votes_against
        CHECK (votes_against >= 0);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_votes_abstained') THEN
        ALTER TABLE public.governance_resolutions
        ADD CONSTRAINT chk_votes_abstained
        CHECK (votes_abstained >= 0);
    END IF;
END $$;

-- 3. Idempotent Performance & Scoping Indexes
CREATE INDEX IF NOT EXISTS idx_society_settings_society 
    ON public.society_settings(society_id);

CREATE INDEX IF NOT EXISTS idx_resolutions_society_status 
    ON public.governance_resolutions(society_id, status);

CREATE INDEX IF NOT EXISTS idx_resolutions_meeting 
    ON public.governance_resolutions(meeting_id);

CREATE INDEX IF NOT EXISTS idx_resolutions_passed_date 
    ON public.governance_resolutions(society_id, passed_date DESC);

-- 4. Enable Row Level Security (RLS)
ALTER TABLE public.society_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.governance_resolutions ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies for society_settings
DROP POLICY IF EXISTS "Members can view their society settings" ON public.society_settings;
CREATE POLICY "Members can view their society settings"
    ON public.society_settings FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.society_memberships sm
            WHERE sm.society_id = society_settings.society_id
            AND sm.user_id = auth.uid()
            AND sm.status = 'ACTIVE'
        )
        OR EXISTS (
            SELECT 1 FROM public.platform_admins pa
            WHERE pa.user_id = auth.uid()
            AND pa.role_id = 'SUPER_ADMIN'
        )
    );

DROP POLICY IF EXISTS "Management can update society settings" ON public.society_settings;
CREATE POLICY "Management can update society settings"
    ON public.society_settings FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.society_memberships sm
            WHERE sm.society_id = society_settings.society_id
            AND sm.user_id = auth.uid()
            AND sm.status = 'ACTIVE'
            AND sm.role_id IN ('SOCIETY_ADMIN', 'SECRETARY', 'MANAGER', 'TREASURER')
        )
        OR EXISTS (
            SELECT 1 FROM public.platform_admins pa
            WHERE pa.user_id = auth.uid()
            AND pa.role_id = 'SUPER_ADMIN'
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.society_memberships sm
            WHERE sm.society_id = society_settings.society_id
            AND sm.user_id = auth.uid()
            AND sm.status = 'ACTIVE'
            AND sm.role_id IN ('SOCIETY_ADMIN', 'SECRETARY', 'MANAGER', 'TREASURER')
        )
        OR EXISTS (
            SELECT 1 FROM public.platform_admins pa
            WHERE pa.user_id = auth.uid()
            AND pa.role_id = 'SUPER_ADMIN'
        )
    );

-- 6. RLS Policies for governance_resolutions
DROP POLICY IF EXISTS "Members can view resolutions in their society" ON public.governance_resolutions;
CREATE POLICY "Members can view resolutions in their society"
    ON public.governance_resolutions FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.society_memberships sm
            WHERE sm.society_id = governance_resolutions.society_id
            AND sm.user_id = auth.uid()
            AND sm.status = 'ACTIVE'
        )
        OR EXISTS (
            SELECT 1 FROM public.platform_admins pa
            WHERE pa.user_id = auth.uid()
            AND pa.role_id = 'SUPER_ADMIN'
        )
    );

DROP POLICY IF EXISTS "Management can manage society resolutions" ON public.governance_resolutions;
CREATE POLICY "Management can manage society resolutions"
    ON public.governance_resolutions FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.society_memberships sm
            WHERE sm.society_id = governance_resolutions.society_id
            AND sm.user_id = auth.uid()
            AND sm.status = 'ACTIVE'
            AND sm.role_id IN ('SOCIETY_ADMIN', 'SECRETARY', 'MANAGER', 'TREASURER')
        )
        OR EXISTS (
            SELECT 1 FROM public.platform_admins pa
            WHERE pa.user_id = auth.uid()
            AND pa.role_id = 'SUPER_ADMIN'
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.society_memberships sm
            WHERE sm.society_id = governance_resolutions.society_id
            AND sm.user_id = auth.uid()
            AND sm.status = 'ACTIVE'
            AND sm.role_id IN ('SOCIETY_ADMIN', 'SECRETARY', 'MANAGER', 'TREASURER')
        )
        OR EXISTS (
            SELECT 1 FROM public.platform_admins pa
            WHERE pa.user_id = auth.uid()
            AND pa.role_id = 'SUPER_ADMIN'
        )
    );
