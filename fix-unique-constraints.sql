-- ==============================================================================
-- FIX SUPABASE ERROR: 42P10
-- "there is no unique or exclusion constraint matching the ON CONFLICT specification"
-- AND ERROR 42703: "column username does not exist"
--
-- Instructions:
-- 1. Open your Supabase Dashboard: https://supabase.com/dashboard
-- 2. Go to "SQL Editor" -> "New Query"
-- 3. Paste this script and click "Run" (green button)
-- ==============================================================================

-- 1. Ensure public.bookings table has a UNIQUE constraint/index on readable_id
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'bookings_readable_id_key'
    ) THEN
        BEGIN
            ALTER TABLE public.bookings ADD CONSTRAINT bookings_readable_id_key UNIQUE (readable_id);
        EXCEPTION
            WHEN duplicate_table THEN NULL;
            WHEN duplicate_object THEN NULL;
            WHEN others THEN NULL;
        END;
    END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS idx_bookings_readable_id_unique ON public.bookings (readable_id);

-- 2. Ensure public.profiles table has a UNIQUE constraint/index on email
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'profiles_email_key'
    ) THEN
        BEGIN
            ALTER TABLE public.profiles ADD CONSTRAINT profiles_email_key UNIQUE (email);
        EXCEPTION
            WHEN duplicate_table THEN NULL;
            WHEN duplicate_object THEN NULL;
            WHEN others THEN NULL;
        END;
    END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_email_unique ON public.profiles (email) WHERE email IS NOT NULL;

-- 3. Ensure username column exists in public.profiles and has a unique index
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS username TEXT;

UPDATE public.profiles
SET username = LOWER(REGEXP_REPLACE(SPLIT_PART(COALESCE(email, 'user'), '@', 1), '[^a-zA-Z0-9_]', '_', 'g'))
WHERE username IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_username_unique ON public.profiles (LOWER(username)) WHERE username IS NOT NULL;

-- 4. Reload PostgREST schema cache immediately
NOTIFY pgrst, 'reload schema';
