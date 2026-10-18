-- ==============================================================================
-- FIX SUPABASE SQL ERROR: 42703: column "username" does not exist
-- Run this in your Supabase Dashboard: SQL Editor -> New Query -> Run
-- ==============================================================================

-- 1. Add the column safely to public.profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS username TEXT;

-- 2. Populate unique fallback usernames for existing rows
UPDATE public.profiles
SET username = LOWER(REGEXP_REPLACE(SPLIT_PART(COALESCE(email, 'user'), '@', 1), '[^a-zA-Z0-9_]', '_', 'g'))
WHERE username IS NULL;

-- 3. Add partial unique index
CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_username_unique ON public.profiles (LOWER(username)) WHERE username IS NOT NULL;

-- 4. Notify PostgREST to immediately refresh its schema cache
NOTIFY pgrst, 'reload schema';
