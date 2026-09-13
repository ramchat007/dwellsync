-- ============================================================================
-- DwellSync Phase 16 Migration: Property Management Company Operations & Tasks
-- Migration: 20260901000026_property_management_operations.sql
-- Description:
--   Introduces operational task management and operational collaboration for
--   Property Management Companies (PMCs), enabling property managers, facility
--   staff, and operations teams to coordinate work across authorized societies
--   while preserving strict tenant isolation, composite foreign-key integrity,
--   and society-level RBAC independence.
-- ============================================================================

-- 1. Management Company Tasks
CREATE TABLE IF NOT EXISTS public.management_company_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  management_company_id UUID NOT NULL REFERENCES public.management_companies(id) ON DELETE CASCADE,
  society_id UUID NOT NULL REFERENCES public.societies(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL CHECK (category IN (
    'FACILITY', 'MAINTENANCE', 'HOUSEKEEPING', 'SECURITY', 'ELECTRICAL',
    'PLUMBING', 'LIFT', 'FIRE_SAFETY', 'COMMON_AREA', 'VENDOR',
    'INSPECTION', 'RESIDENT_FOLLOWUP', 'GENERAL'
  )),
  priority TEXT NOT NULL DEFAULT 'MEDIUM' CHECK (priority IN ('LOW', 'MEDIUM', 'HIGH', 'URGENT')),
  status TEXT NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'IN_PROGRESS', 'ON_HOLD', 'COMPLETED', 'CANCELLED')),
  assigned_to UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  due_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT fk_task_comp_society FOREIGN KEY (management_company_id, society_id)
    REFERENCES public.management_company_societies (management_company_id, society_id) ON DELETE CASCADE,
  CONSTRAINT fk_task_assigned_member FOREIGN KEY (management_company_id, assigned_to)
    REFERENCES public.management_company_members (management_company_id, user_id) ON DELETE SET NULL
);

-- 2. Management Company Task Comments
CREATE TABLE IF NOT EXISTS public.management_company_task_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES public.management_company_tasks(id) ON DELETE CASCADE,
  management_company_id UUID NOT NULL REFERENCES public.management_companies(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  comment TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT fk_task_comment_member FOREIGN KEY (management_company_id, user_id)
    REFERENCES public.management_company_members (management_company_id, user_id) ON DELETE CASCADE
);

-- Indexes for performance and lookup
CREATE INDEX IF NOT EXISTS idx_mgmt_tasks_comp_soc ON public.management_company_tasks (management_company_id, society_id, status);
CREATE INDEX IF NOT EXISTS idx_mgmt_tasks_assigned ON public.management_company_tasks (assigned_to, status);
CREATE INDEX IF NOT EXISTS idx_mgmt_tasks_due ON public.management_company_tasks (due_at) WHERE status NOT IN ('COMPLETED', 'CANCELLED');
CREATE INDEX IF NOT EXISTS idx_mgmt_tasks_category ON public.management_company_tasks (society_id, category);
CREATE INDEX IF NOT EXISTS idx_mgmt_task_comments_task ON public.management_company_task_comments (task_id, created_at);

-- Ensure composite foreign key constraints exist idempotently
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_task_comp_society') THEN
    ALTER TABLE public.management_company_tasks
      ADD CONSTRAINT fk_task_comp_society FOREIGN KEY (management_company_id, society_id)
      REFERENCES public.management_company_societies (management_company_id, society_id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_task_assigned_member') THEN
    ALTER TABLE public.management_company_tasks
      ADD CONSTRAINT fk_task_assigned_member FOREIGN KEY (management_company_id, assigned_to)
      REFERENCES public.management_company_members (management_company_id, user_id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_task_comment_member') THEN
    ALTER TABLE public.management_company_task_comments
      ADD CONSTRAINT fk_task_comment_member FOREIGN KEY (management_company_id, user_id)
      REFERENCES public.management_company_members (management_company_id, user_id) ON DELETE CASCADE;
  END IF;
END $$;

-- Auto-update timestamps triggers
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_timestamp_mgmt_tasks') THEN
    CREATE TRIGGER set_timestamp_mgmt_tasks
      BEFORE UPDATE ON public.management_company_tasks
      FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_timestamp_mgmt_task_comments') THEN
    CREATE TRIGGER set_timestamp_mgmt_task_comments
      BEFORE UPDATE ON public.management_company_task_comments
      FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
  END IF;
END $$;

-- Enable Row Level Security (RLS)
ALTER TABLE public.management_company_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.management_company_task_comments ENABLE ROW LEVEL SECURITY;

-- ----------------------------------------------------------------------------
-- RLS Policies
-- ----------------------------------------------------------------------------

-- 1. management_company_tasks
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'p_mgmt_tasks_select' AND tablename = 'management_company_tasks') THEN
    CREATE POLICY p_mgmt_tasks_select ON public.management_company_tasks
      FOR SELECT TO authenticated
      USING (
        public.is_super_admin(auth.uid()) OR
        EXISTS (
          SELECT 1 FROM public.management_company_members mem
          WHERE mem.management_company_id = public.management_company_tasks.management_company_id
            AND mem.user_id = auth.uid()
            AND mem.role = 'COMPANY_ADMIN'
            AND mem.status = 'ACTIVE'
        ) OR
        (
          EXISTS (
            SELECT 1 FROM public.management_company_members mem
            WHERE mem.management_company_id = public.management_company_tasks.management_company_id
              AND mem.user_id = auth.uid()
              AND mem.status = 'ACTIVE'
          ) AND (
            assigned_to = auth.uid() OR
            EXISTS (
              SELECT 1 FROM public.management_company_society_access acc
              JOIN public.management_company_societies mcs ON mcs.id = acc.management_company_society_id
              WHERE acc.management_company_id = public.management_company_tasks.management_company_id
                AND acc.management_company_member_id IN (
                  SELECT id FROM public.management_company_members
                  WHERE user_id = auth.uid() AND management_company_id = public.management_company_tasks.management_company_id
                )
                AND mcs.society_id = public.management_company_tasks.society_id
                AND acc.status = 'ACTIVE'
                AND mcs.status = 'ACTIVE'
            )
          )
        )
      );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'p_mgmt_tasks_modify' AND tablename = 'management_company_tasks') THEN
    CREATE POLICY p_mgmt_tasks_modify ON public.management_company_tasks
      FOR ALL TO authenticated
      USING (
        public.is_super_admin(auth.uid()) OR
        EXISTS (
          SELECT 1 FROM public.management_company_members mem
          WHERE mem.management_company_id = public.management_company_tasks.management_company_id
            AND mem.user_id = auth.uid()
            AND mem.role IN ('COMPANY_ADMIN', 'COMPANY_MANAGER')
            AND mem.status = 'ACTIVE'
        ) OR
        (
          assigned_to = auth.uid() AND
          EXISTS (
            SELECT 1 FROM public.management_company_members mem
            WHERE mem.management_company_id = public.management_company_tasks.management_company_id
              AND mem.user_id = auth.uid()
              AND mem.status = 'ACTIVE'
          )
        )
      )
      WITH CHECK (
        public.is_super_admin(auth.uid()) OR
        EXISTS (
          SELECT 1 FROM public.management_company_members mem
          WHERE mem.management_company_id = public.management_company_tasks.management_company_id
            AND mem.user_id = auth.uid()
            AND mem.role IN ('COMPANY_ADMIN', 'COMPANY_MANAGER')
            AND mem.status = 'ACTIVE'
        ) OR
        (
          assigned_to = auth.uid() AND
          EXISTS (
            SELECT 1 FROM public.management_company_members mem
            WHERE mem.management_company_id = public.management_company_tasks.management_company_id
              AND mem.user_id = auth.uid()
              AND mem.status = 'ACTIVE'
          )
        )
      );
  END IF;
END $$;

-- 2. management_company_task_comments
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'p_mgmt_task_comments_select' AND tablename = 'management_company_task_comments') THEN
    CREATE POLICY p_mgmt_task_comments_select ON public.management_company_task_comments
      FOR SELECT TO authenticated
      USING (
        public.is_super_admin(auth.uid()) OR
        EXISTS (
          SELECT 1 FROM public.management_company_tasks t
          WHERE t.id = public.management_company_task_comments.task_id
            AND (
              EXISTS (
                SELECT 1 FROM public.management_company_members mem
                WHERE mem.management_company_id = t.management_company_id
                  AND mem.user_id = auth.uid()
                  AND mem.status = 'ACTIVE'
              )
            )
        )
      );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'p_mgmt_task_comments_insert' AND tablename = 'management_company_task_comments') THEN
    CREATE POLICY p_mgmt_task_comments_insert ON public.management_company_task_comments
      FOR INSERT TO authenticated
      WITH CHECK (
        public.is_super_admin(auth.uid()) OR
        (
          user_id = auth.uid() AND
          EXISTS (
            SELECT 1 FROM public.management_company_members mem
            WHERE mem.management_company_id = public.management_company_task_comments.management_company_id
              AND mem.user_id = auth.uid()
              AND mem.status = 'ACTIVE'
          )
        )
      );
  END IF;
END $$;
