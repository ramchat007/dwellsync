-- ============================================================
-- DwellSync Migration 20: Language & Localization Foundation
-- Fully Idempotent, Non-Destructive, Safely Rerunnable
-- ============================================================

-- 1. Add preferred_language to public.profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS preferred_language TEXT NOT NULL DEFAULT 'en';

-- 2. Guarded check constraint ensuring supported locales (en, mr, hi)
DO $$
BEGIN
  ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_preferred_language_check;
  ALTER TABLE public.profiles ADD CONSTRAINT profiles_preferred_language_check CHECK (
    preferred_language IN ('en', 'mr', 'hi')
  );
END $$;

-- 3. Idempotent index for localized query performance
CREATE INDEX IF NOT EXISTS idx_profiles_preferred_language
  ON public.profiles(preferred_language);
