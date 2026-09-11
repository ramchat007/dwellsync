-- ============================================================
-- DwellSync Migration 20: Language & Localization Foundation
-- ============================================================

-- 1. Add preferred_language to public.profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS preferred_language TEXT NOT NULL DEFAULT 'en';

-- Ensure check constraint allows supported locales
DO $$
BEGIN
  ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_preferred_language_check;
  ALTER TABLE public.profiles ADD CONSTRAINT profiles_preferred_language_check CHECK (
    preferred_language IN ('en', 'mr', 'hi')
  );
END $$;

-- Index for localized query performance
CREATE INDEX IF NOT EXISTS idx_profiles_preferred_language
  ON public.profiles(preferred_language);

