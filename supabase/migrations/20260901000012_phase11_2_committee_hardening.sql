-- DwellSync Phase 11.2 Migration: Governance Schema Hardening
-- Remediates findings F1 (Composite Foreign Key) and F2 (Resignation Date Constraint)
-- from the Phase 11.1 Acceptance Audit.

-- ============================================================================
-- 1. F1 — COMPOSITE UNIQUE & FOREIGN KEY (TENANT INTEGRITY)
-- ============================================================================

-- Ensure committees has a unique constraint on (id, society_id) to serve as composite target
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'uq_committees_id_society'
  ) THEN
    ALTER TABLE public.committees
      ADD CONSTRAINT uq_committees_id_society UNIQUE (id, society_id);
  END IF;
END $$;

-- Enforce composite foreign key on committee_members(committee_id, society_id)
-- guaranteeing committee_members.society_id cannot diverge from committees.society_id
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fk_committee_members_committee_society'
  ) THEN
    ALTER TABLE public.committee_members
      ADD CONSTRAINT fk_committee_members_committee_society
      FOREIGN KEY (committee_id, society_id)
      REFERENCES public.committees(id, society_id)
      ON DELETE CASCADE;
  END IF;
END $$;

-- ============================================================================
-- 2. F2 — RESIGNATION DATE CONSTRAINT (TEMPORAL CONSISTENCY)
-- ============================================================================

-- Enforce that resigned_at must be on or after appointed_at when present
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_member_resignation_date'
  ) THEN
    ALTER TABLE public.committee_members
      ADD CONSTRAINT chk_member_resignation_date
      CHECK (
        resigned_at IS NULL
        OR resigned_at >= appointed_at
      );
  END IF;
END $$;
