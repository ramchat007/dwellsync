-- DwellSync Phase 12 Migration: Analytics & Production Hardening Performance Indexes
-- Provides composite indexes for tenant-scoped analytics aggregation across:
-- Units, Unit Occupancies, Invoices, Payments, Complaints, Visitors, Notifications, Meetings, Action Items, and Audit Logs.

-- ============================================================================
-- 1. UNIT & OCCUPANCY PERFORMANCE INDEXES
-- ============================================================================

-- The units table stores unit occupancy/lifecycle state in `status` ('ACTIVE', 'VACANT', 'OCCUPIED', 'UNDER_MAINTENANCE', 'INACTIVE')
CREATE INDEX IF NOT EXISTS idx_units_society_status
  ON public.units(society_id, status);

CREATE INDEX IF NOT EXISTS idx_unit_occupancies_society_status
  ON public.unit_occupancies(society_id, status);

CREATE INDEX IF NOT EXISTS idx_unit_owners_society_status
  ON public.unit_owners(society_id, status);

-- ============================================================================
-- 2. MAINTENANCE & BILLING ANALYTICS INDEXES
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_invoices_society_status
  ON public.invoices(society_id, status);

CREATE INDEX IF NOT EXISTS idx_invoices_society_created
  ON public.invoices(society_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_payments_society_status
  ON public.payments(society_id, status);

CREATE INDEX IF NOT EXISTS idx_payments_society_created
  ON public.payments(society_id, created_at DESC);

-- ============================================================================
-- 3. HELPDESK & COMPLAINT PERFORMANCE INDEXES
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_complaints_society_status
  ON public.complaints(society_id, status);

CREATE INDEX IF NOT EXISTS idx_complaints_society_priority
  ON public.complaints(society_id, priority);

CREATE INDEX IF NOT EXISTS idx_complaints_society_created
  ON public.complaints(society_id, created_at DESC);

-- ============================================================================
-- 4. VISITOR LOGGING PERFORMANCE INDEXES
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_visitors_society_status
  ON public.visitors(society_id, status);

CREATE INDEX IF NOT EXISTS idx_visitors_society_created
  ON public.visitors(society_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_visitors_society_checkin
  ON public.visitors(society_id, check_in_at DESC);

-- ============================================================================
-- 5. COMMUNICATIONS & NOTIFICATIONS INDEXES
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_notifications_society_read
  ON public.notifications(society_id, is_read);

CREATE INDEX IF NOT EXISTS idx_notifications_society_created
  ON public.notifications(society_id, created_at DESC);

-- ============================================================================
-- 6. GOVERNANCE MEETINGS & ACTION ITEMS INDEXES
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_society_meetings_society_status
  ON public.society_meetings(society_id, status);

CREATE INDEX IF NOT EXISTS idx_society_meetings_society_scheduled
  ON public.society_meetings(society_id, scheduled_at DESC);

CREATE INDEX IF NOT EXISTS idx_meeting_action_items_meeting_status
  ON public.meeting_action_items(meeting_id, status);

CREATE INDEX IF NOT EXISTS idx_meeting_action_items_society_status
  ON public.meeting_action_items(society_id, status);

-- ============================================================================
-- 7. AUDIT LOG TELEMETRY INDEXES
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_audit_logs_society_created
  ON public.audit_logs(society_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_audit_logs_created
  ON public.audit_logs(created_at DESC);
