-- ==============================================================================
-- RYDEIT: COMPLETE SUPABASE SETUP SCRIPT (BOOKINGS, PROFILES & STORAGE)
-- Run this in your Supabase Dashboard: SQL Editor -> New Query -> Run
-- ==============================================================================

-- 1. Ensure public.profiles table exists with proper columns
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT UNIQUE,
    username TEXT UNIQUE,
    full_name TEXT,
    phone TEXT,
    whatsapp TEXT,
    dl_url TEXT,
    aadhaar_url TEXT,
    dl_number TEXT,
    aadhaar_number TEXT,
    is_verified BOOLEAN DEFAULT FALSE,
    is_admin BOOLEAN DEFAULT FALSE,
    is_blocked BOOLEAN DEFAULT FALSE,
    admin_notes TEXT,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()),
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW())
);

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='username') THEN
        ALTER TABLE public.profiles ADD COLUMN username TEXT UNIQUE;
    END IF;
END $$;

-- Enable RLS on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Allow public / authenticated access to profiles
DROP POLICY IF EXISTS "Public and users can access profiles" ON public.profiles;
CREATE POLICY "Public and users can access profiles"
ON public.profiles FOR ALL
TO public
USING (true)
WITH CHECK (true);

-- 2. Trigger: Automatically create public.profiles row when a new user signs up in Supabase Auth
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, is_admin, is_verified)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    false,
    false
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Backfill existing auth users into public.profiles if any are missing
INSERT INTO public.profiles (id, email, full_name, is_admin, is_verified)
SELECT id, email, COALESCE(raw_user_meta_data->>'full_name', split_part(email, '@', 1)), false, false
FROM auth.users
ON CONFLICT (id) DO NOTHING;

-- 3. Ensure public.bookings table exists with all required columns
CREATE TABLE IF NOT EXISTS public.bookings (
    id BIGSERIAL PRIMARY KEY,
    readable_id TEXT UNIQUE NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    bike_id BIGINT NOT NULL,
    customer_name TEXT NOT NULL,
    customer_phone TEXT NOT NULL,
    customer_email TEXT NOT NULL,
    pickup_date TEXT NOT NULL,
    pickup_time TEXT NOT NULL,
    return_date TEXT NOT NULL,
    return_time TEXT NOT NULL,
    total_rent NUMERIC(10, 2) DEFAULT 0,
    advance_amount NUMERIC(10, 2) DEFAULT 0,
    security_deposit NUMERIC(10, 2) DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'pending_payment',
    payment_screenshot_url TEXT,
    payment_method TEXT DEFAULT 'UPI',
    is_outstation BOOLEAN DEFAULT FALSE,
    needs_delivery BOOLEAN DEFAULT FALSE,
    needs_return_pickup BOOLEAN DEFAULT FALSE,
    address TEXT,
    admin_notes TEXT,
    start_timestamp TIMESTAMPTZ,
    end_timestamp TIMESTAMPTZ,
    start_odometer NUMERIC(10, 2),
    end_odometer NUMERIC(10, 2),
    adjustment_amount NUMERIC(10, 2) DEFAULT 0,
    adjustment_reason TEXT,
    customer_photo_url TEXT,
    settled BOOLEAN DEFAULT FALSE,
    aadhaar_url TEXT,
    dl_url TEXT,
    aadhaar_number TEXT,
    dl_number TEXT,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()),
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW())
);

-- Enable RLS on bookings
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;

-- Allow public and users to read, create and update bookings
DROP POLICY IF EXISTS "Allow All Actions On Bookings" ON public.bookings;
CREATE POLICY "Allow All Actions On Bookings"
ON public.bookings FOR ALL
TO public
USING (true)
WITH CHECK (true);

-- 4. Set up Storage Buckets: booking-docs & identity-docs
INSERT INTO storage.buckets (id, name, public)
VALUES 
  ('booking-docs', 'booking-docs', true),
  ('identity-docs', 'identity-docs', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Enable public / authenticated uploads and reads for booking-docs
DROP POLICY IF EXISTS "Public Upload booking-docs" ON storage.objects;
DROP POLICY IF EXISTS "Public Select booking-docs" ON storage.objects;
DROP POLICY IF EXISTS "Public Upload identity-docs" ON storage.objects;
DROP POLICY IF EXISTS "Public Select identity-docs" ON storage.objects;

CREATE POLICY "Public Upload booking-docs"
ON storage.objects FOR INSERT
TO public
WITH CHECK (bucket_id = 'booking-docs');

CREATE POLICY "Public Select booking-docs"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'booking-docs');

CREATE POLICY "Public Upload identity-docs"
ON storage.objects FOR INSERT
TO public
WITH CHECK (bucket_id = 'identity-docs');

CREATE POLICY "Public Select identity-docs"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'identity-docs');

-- ==============================================================================
-- DONE! All storage policies, profiles auto-creation, and bookings RLS are set.
-- ==============================================================================
