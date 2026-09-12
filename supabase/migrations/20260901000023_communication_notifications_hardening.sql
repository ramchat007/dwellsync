-- ============================================================================
-- Migration: 20260901000023_communication_notifications_hardening.sql
-- Description: Communication & Notifications Foundation hardening
-- Fully idempotent, safely rerunnable, tenant-isolated, zero-cost
-- ============================================================================

-- 1. Ensure notifications table and all columns exist
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    society_id UUID NOT NULL REFERENCES public.societies(id) ON DELETE CASCADE,
    recipient_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    actor_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    category TEXT NOT NULL,
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

-- Idempotently ensure columns on notifications
DO $$
BEGIN
    ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS actor_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL;
    ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS action_url TEXT;
    ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS is_read BOOLEAN DEFAULT false;
    ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS read_at TIMESTAMPTZ;
    ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS dedup_key TEXT;
    ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;
    ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
END $$;

-- 2. Ensure notification_preferences table and columns exist
CREATE TABLE IF NOT EXISTS public.notification_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    society_id UUID NOT NULL REFERENCES public.societies(id) ON DELETE CASCADE,
    category TEXT NOT NULL,
    email_enabled BOOLEAN NOT NULL DEFAULT true,
    sms_enabled BOOLEAN NOT NULL DEFAULT false,
    whatsapp_enabled BOOLEAN NOT NULL DEFAULT false,
    in_app_enabled BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_user_society_category UNIQUE (user_id, society_id, category),
    CONSTRAINT chk_security_in_app_mandatory CHECK (category != 'SECURITY' OR in_app_enabled = true)
);

-- Idempotently ensure columns and constraints on notification_preferences
DO $$
BEGIN
    ALTER TABLE public.notification_preferences ADD COLUMN IF NOT EXISTS email_enabled BOOLEAN DEFAULT true;
    ALTER TABLE public.notification_preferences ADD COLUMN IF NOT EXISTS sms_enabled BOOLEAN DEFAULT false;
    ALTER TABLE public.notification_preferences ADD COLUMN IF NOT EXISTS whatsapp_enabled BOOLEAN DEFAULT false;
    ALTER TABLE public.notification_preferences ADD COLUMN IF NOT EXISTS in_app_enabled BOOLEAN DEFAULT true;
    ALTER TABLE public.notification_preferences ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'uq_user_society_category') THEN
        ALTER TABLE public.notification_preferences 
        ADD CONSTRAINT uq_user_society_category UNIQUE (user_id, society_id, category);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_security_in_app_mandatory') THEN
        ALTER TABLE public.notification_preferences 
        ADD CONSTRAINT chk_security_in_app_mandatory CHECK (category != 'SECURITY' OR in_app_enabled = true);
    END IF;
END $$;

-- 3. Ensure notification_deliveries table and columns exist
CREATE TABLE IF NOT EXISTS public.notification_deliveries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    notification_id UUID NOT NULL REFERENCES public.notifications(id) ON DELETE CASCADE,
    channel TEXT NOT NULL,
    provider TEXT NOT NULL,
    provider_message_id TEXT,
    status TEXT NOT NULL DEFAULT 'QUEUED',
    error_message TEXT,
    attempts INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Idempotently ensure columns on notification_deliveries
DO $$
BEGIN
    ALTER TABLE public.notification_deliveries ADD COLUMN IF NOT EXISTS provider_message_id TEXT;
    ALTER TABLE public.notification_deliveries ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'QUEUED';
    ALTER TABLE public.notification_deliveries ADD COLUMN IF NOT EXISTS error_message TEXT;
    ALTER TABLE public.notification_deliveries ADD COLUMN IF NOT EXISTS attempts INTEGER DEFAULT 1;
    ALTER TABLE public.notification_deliveries ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
END $$;

-- 4. Idempotent Performance & Cooldown Indexes
CREATE INDEX IF NOT EXISTS idx_notifications_recipient_read 
    ON public.notifications(recipient_id, is_read, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_notifications_recipient_unread 
    ON public.notifications(recipient_id, is_read) 
    WHERE is_read = false;

CREATE INDEX IF NOT EXISTS idx_notifications_cooldown 
    ON public.notifications(society_id, recipient_id, type, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_notifications_society_category 
    ON public.notifications(society_id, category, created_at DESC);

CREATE UNIQUE INDEX IF NOT EXISTS idx_notifications_dedup 
    ON public.notifications(society_id, recipient_id, dedup_key) 
    WHERE dedup_key IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_notif_pref_user_soc 
    ON public.notification_preferences(user_id, society_id);

CREATE INDEX IF NOT EXISTS idx_deliveries_notification 
    ON public.notification_deliveries(notification_id);

-- 5. Enable Row Level Security (RLS)
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_deliveries ENABLE ROW LEVEL SECURITY;

-- 6. Notifications RLS Policies
DROP POLICY IF EXISTS "Users can view their own notifications" ON public.notifications;
CREATE POLICY "Users can view their own notifications"
    ON public.notifications FOR SELECT
    TO authenticated
    USING (
        auth.uid() = recipient_id
        OR EXISTS (
            SELECT 1 FROM public.platform_admins
            WHERE platform_admins.user_id = auth.uid()
            AND platform_admins.role_id = 'SUPER_ADMIN'
        )
    );

DROP POLICY IF EXISTS "Users can update their own notification read status" ON public.notifications;
CREATE POLICY "Users can update their own notification read status"
    ON public.notifications FOR UPDATE
    TO authenticated
    USING (auth.uid() = recipient_id)
    WITH CHECK (auth.uid() = recipient_id);

DROP POLICY IF EXISTS "Admins can manage society notifications" ON public.notifications;
CREATE POLICY "Admins can manage society notifications"
    ON public.notifications FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.society_memberships sm
            WHERE sm.society_id = notifications.society_id
            AND sm.user_id = auth.uid()
            AND sm.status = 'ACTIVE'
            AND sm.role_id IN ('SOCIETY_ADMIN', 'SECRETARY', 'MANAGER', 'TREASURER')
        )
        OR EXISTS (
            SELECT 1 FROM public.platform_admins
            WHERE platform_admins.user_id = auth.uid()
            AND platform_admins.role_id = 'SUPER_ADMIN'
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.society_memberships sm
            WHERE sm.society_id = notifications.society_id
            AND sm.user_id = auth.uid()
            AND sm.status = 'ACTIVE'
            AND sm.role_id IN ('SOCIETY_ADMIN', 'SECRETARY', 'MANAGER', 'TREASURER')
        )
        OR EXISTS (
            SELECT 1 FROM public.platform_admins
            WHERE platform_admins.user_id = auth.uid()
            AND platform_admins.role_id = 'SUPER_ADMIN'
        )
    );

-- 7. Notification Preferences RLS Policies
DROP POLICY IF EXISTS "Users can view their own preferences" ON public.notification_preferences;
CREATE POLICY "Users can view their own preferences"
    ON public.notification_preferences FOR SELECT
    TO authenticated
    USING (
        auth.uid() = user_id
        OR EXISTS (
            SELECT 1 FROM public.platform_admins
            WHERE platform_admins.user_id = auth.uid()
            AND platform_admins.role_id = 'SUPER_ADMIN'
        )
    );

DROP POLICY IF EXISTS "Users can update their own preferences" ON public.notification_preferences;
CREATE POLICY "Users can update their own preferences"
    ON public.notification_preferences FOR ALL
    TO authenticated
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

-- 8. Notification Deliveries RLS Policies
DROP POLICY IF EXISTS "Users can view deliveries for their notifications" ON public.notification_deliveries;
CREATE POLICY "Users can view deliveries for their notifications"
    ON public.notification_deliveries FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.notifications n
            WHERE n.id = notification_deliveries.notification_id
            AND (
                n.recipient_id = auth.uid()
                OR EXISTS (
                    SELECT 1 FROM public.platform_admins
                    WHERE platform_admins.user_id = auth.uid()
                    AND platform_admins.role_id = 'SUPER_ADMIN'
                )
            )
        )
    );
