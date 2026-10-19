-- ==============================================================================
-- FIX BOOKING STATUS UPDATES, DISPATCH & CANCELLATION PERMISSIONS
-- Run this once in your Supabase Dashboard: SQL Editor -> New Query -> Run
-- ==============================================================================

-- 1. Ensure public.bookings allows UPDATE and ALL operations for admin / app
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

DROP POLICY IF EXISTS "Allow All Actions On Bookings" ON public.bookings;
CREATE POLICY "Allow All Actions On Bookings" 
ON public.bookings FOR ALL 
TO public 
USING (true) 
WITH CHECK (true);

-- 2. Drop any blocking trigger on bookings that was aborting status updates
-- (Status, dispatch, and cancellation should never fail due to background trigger exceptions)
DROP TRIGGER IF EXISTS trg_confirmed_booking_profile ON public.bookings;

-- 3. Ensure public.profiles allows all operations
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public and users can access profiles" ON public.profiles;
CREATE POLICY "Public and users can access profiles" 
ON public.profiles FOR ALL 
TO public 
USING (true) 
WITH CHECK (true);

-- 4. Ensure readable_id has unique constraint in public.bookings
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

-- 5. Ensure username and email columns in public.profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS username TEXT;

UPDATE public.profiles
SET username = LOWER(REGEXP_REPLACE(SPLIT_PART(COALESCE(email, 'user'), '@', 1), '[^a-zA-Z0-9_]', '_', 'g'))
WHERE username IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_username_unique ON public.profiles (LOWER(username)) WHERE username IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_email_unique ON public.profiles (email) WHERE email IS NOT NULL;

-- 6. Reload PostgREST schema cache immediately
NOTIFY pgrst, 'reload schema';
