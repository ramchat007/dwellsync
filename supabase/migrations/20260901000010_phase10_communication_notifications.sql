-- DwellSyncHub Phase 10 Database Schema Migration
-- Establishes Notifications, Notification Preferences, Notification Deliveries, and Strict Security RLS Policies

-- ============================================================
-- 1. NOTIFICATIONS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  society_id UUID NOT NULL REFERENCES public.societies(id) ON DELETE CASCADE,
  recipient_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  actor_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  category TEXT NOT NULL CHECK (
    category IN ('SECURITY', 'BILLING', 'COMPLAINTS', 'NOTICES', 'AMENITIES', 'EVENTS', 'GENERAL')
  ),
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  action_url TEXT,
  is_read BOOLEAN NOT NULL DEFAULT false,
  read_at TIMESTAMPTZ,
  dedup_key TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 2. NOTIFICATION PREFERENCES TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.notification_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  society_id UUID NOT NULL REFERENCES public.societies(id) ON DELETE CASCADE,
  category TEXT NOT NULL CHECK (
    category IN ('SECURITY', 'BILLING', 'COMPLAINTS', 'NOTICES', 'AMENITIES', 'EVENTS', 'GENERAL')
  ),
  email_enabled BOOLEAN NOT NULL DEFAULT true,
  sms_enabled BOOLEAN NOT NULL DEFAULT false,
  whatsapp_enabled BOOLEAN NOT NULL DEFAULT false,
  in_app_enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_user_society_category UNIQUE (user_id, society_id, category),
  CONSTRAINT chk_security_in_app_mandatory CHECK (category != 'SECURITY' OR in_app_enabled = true)
);

-- ============================================================
-- 3. NOTIFICATION DELIVERIES TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.notification_deliveries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  notification_id UUID NOT NULL REFERENCES public.notifications(id) ON DELETE CASCADE,
  channel TEXT NOT NULL CHECK (
    channel IN ('IN_APP', 'EMAIL', 'SMS', 'WHATSAPP')
  ),
  provider TEXT NOT NULL,
  provider_message_id TEXT,
  status TEXT NOT NULL DEFAULT 'QUEUED' CHECK (
    status IN ('QUEUED', 'ACCEPTED', 'DELIVERED', 'FAILED', 'RETRYING', 'CANCELLED')
  ),
  error_message TEXT,
  attempts INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 4. PERFORMANCE & IDEMPOTENCY INDEXES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_notifications_recipient_read 
  ON public.notifications(recipient_id, is_read, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_notifications_society 
  ON public.notifications(society_id, created_at DESC);

CREATE UNIQUE INDEX IF NOT EXISTS idx_notifications_dedup 
  ON public.notifications (society_id, recipient_id, dedup_key) 
  WHERE dedup_key IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_notif_pref_user_soc 
  ON public.notification_preferences(user_id, society_id);

CREATE INDEX IF NOT EXISTS idx_deliveries_notification 
  ON public.notification_deliveries(notification_id);

-- ============================================================
-- 5. ENABLE ROW LEVEL SECURITY (RLS)
-- ============================================================
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_deliveries ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 6. NOTIFICATIONS RLS POLICIES
-- ============================================================
DROP POLICY IF EXISTS "Users can view their own notifications" ON public.notifications;
CREATE POLICY "Users can view their own notifications"
  ON public.notifications FOR SELECT
  USING (
    auth.uid() = recipient_id
    OR public.is_super_admin(auth.uid())
  );

DROP POLICY IF EXISTS "Users can update their own notification read status" ON public.notifications;
CREATE POLICY "Users can update their own notification read status"
  ON public.notifications FOR UPDATE
  USING (auth.uid() = recipient_id)
  WITH CHECK (auth.uid() = recipient_id);

DROP POLICY IF EXISTS "Admins can manage society notifications" ON public.notifications;
CREATE POLICY "Admins can manage society notifications"
  ON public.notifications FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.society_memberships sm
      WHERE sm.society_id = notifications.society_id
        AND sm.user_id = auth.uid()
        AND sm.status = 'ACTIVE'
        AND sm.role_id IN ('SOCIETY_ADMIN', 'TREASURER', 'SECRETARY')
    )
    OR public.is_super_admin(auth.uid())
  );

-- ============================================================
-- 7. NOTIFICATION PREFERENCES RLS POLICIES
-- ============================================================
DROP POLICY IF EXISTS "Users can view their own preferences" ON public.notification_preferences;
CREATE POLICY "Users can view their own preferences"
  ON public.notification_preferences FOR SELECT
  USING (
    auth.uid() = user_id
    OR public.is_super_admin(auth.uid())
  );

DROP POLICY IF EXISTS "Users can update their own preferences" ON public.notification_preferences;
CREATE POLICY "Users can update their own preferences"
  ON public.notification_preferences FOR ALL
  USING (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.society_memberships sm
      WHERE sm.society_id = notification_preferences.society_id
        AND sm.user_id = auth.uid()
        AND sm.status = 'ACTIVE'
    )
  )
  WITH CHECK (
    auth.uid() = user_id
    AND (category != 'SECURITY' OR in_app_enabled = true)
  );

-- ============================================================
-- 8. NOTIFICATION DELIVERIES RLS POLICIES
-- ============================================================
DROP POLICY IF EXISTS "Users can view deliveries for their notifications" ON public.notification_deliveries;
CREATE POLICY "Users can view deliveries for their notifications"
  ON public.notification_deliveries FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.notifications n
      WHERE n.id = notification_deliveries.notification_id
        AND (n.recipient_id = auth.uid() OR public.is_super_admin(auth.uid()))
    )
  );
