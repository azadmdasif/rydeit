-- ==============================================================================
-- RYDEIT: COMPLETE CROSS-DEVICE MULTI-USER SQL SETUP SCRIPT (BULLETPROOF & IDEMPOTENT)
-- Run this in your Supabase Dashboard: SQL Editor -> New Query -> Run
-- ==============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ==============================================================================
-- 1. FLEET & MACHINES (public.bikes)
-- Cross-device bike availability, slot management, and maintenance blocking
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.bikes (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT DEFAULT '',
    image_url TEXT NOT NULL,
    color TEXT DEFAULT 'black',
    category TEXT NOT NULL DEFAULT 'Bikes',
    daily_rate NUMERIC(10, 2) NOT NULL DEFAULT 700.00,
    status TEXT NOT NULL DEFAULT 'Available',
    rc_number TEXT,
    purchase_date DATE DEFAULT CURRENT_DATE,
    purchase_cost NUMERIC(12, 2) DEFAULT 0.00,
    odometer_reading NUMERIC(10, 2) DEFAULT 0.00,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()),
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW())
);

-- Ensure all columns exist even if public.bikes already existed previously
ALTER TABLE public.bikes ADD COLUMN IF NOT EXISTS rc_number TEXT;
ALTER TABLE public.bikes ADD COLUMN IF NOT EXISTS purchase_date DATE DEFAULT CURRENT_DATE;
ALTER TABLE public.bikes ADD COLUMN IF NOT EXISTS purchase_cost NUMERIC(12, 2) DEFAULT 0.00;
ALTER TABLE public.bikes ADD COLUMN IF NOT EXISTS odometer_reading NUMERIC(10, 2) DEFAULT 0.00;
ALTER TABLE public.bikes ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT FALSE;
ALTER TABLE public.bikes ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'Available';

CREATE INDEX IF NOT EXISTS idx_bikes_status ON public.bikes (status);
CREATE INDEX IF NOT EXISTS idx_bikes_category ON public.bikes (category);
CREATE INDEX IF NOT EXISTS idx_bikes_is_deleted ON public.bikes (is_deleted);

ALTER TABLE public.bikes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public Read Bikes" ON public.bikes;
CREATE POLICY "Public Read Bikes" ON public.bikes FOR SELECT TO public USING (is_deleted = false);
DROP POLICY IF EXISTS "Allow All Actions On Bikes" ON public.bikes;
CREATE POLICY "Allow All Actions On Bikes" ON public.bikes FOR ALL TO public USING (true) WITH CHECK (true);

-- Seed initial fleet into public.bikes (idempotent upsert)
INSERT INTO public.bikes (id, name, description, image_url, color, category, daily_rate, status, rc_number, purchase_date, purchase_cost, odometer_reading, is_deleted)
VALUES
  (15, 'Suzuki Burgman', 'Powerful, premium 125cc scooter', '/images/suziki-burgman.jpg', 'yellow', 'Scooter', 700, 'Available', 'WB-02-AH-1515', '2024-01-10', 98000, 12450, false),
  (16, 'Honda Activa 125', 'India’s most-sold 125cc scooter', '/images/honda-activa-125.jpg', 'black', 'Scooter', 700, 'Available', 'WB-02-AK-1616', '2024-02-15', 92000, 14820, false),
  (17, 'TVS Jupiter 125', 'Comfortable, full-features family scooter', '/images/tvs-jupiter-125.jpg', 'orange', 'Scooter', 700, 'Available', 'WB-02-AM-1717', '2024-03-20', 89000, 9600, false),
  (18, 'Honda Dio 125', 'Sporty 125cc youth scooter', '/images/honda-dio-125.jpg', 'teal', 'Scooter', 700, 'Available', 'WB-02-AN-1818', '2024-04-05', 88000, 8200, false),
  (19, 'Ather 450X', 'Tech-packed premium electric scooter', '/images/ather-450x.jpg', 'teal', 'Scooter', 900, 'Available', 'WB-02-EV-1919', '2024-05-12', 145000, 6400, false),
  (1, 'Hero Xtreme 125r', 'Sport-commuter staple', '/images/hero-xtreme-125r.jpg', 'black', 'Bikes', 700, 'Available', 'WB-02-AX-1001', '2024-02-18', 95000, 11200, false),
  (3, 'Honda Shine 125', 'Smooth 125cc refined engine', '/images/honda-shine-125.jpg', 'orange', 'Bikes', 700, 'Available', 'WB-02-AY-1003', '2023-11-22', 88000, 18500, false),
  (5, 'Bajaj Pulsar 150', 'Sport-commuter staple', '/images/bajaj-pulsar-150.jpg', 'black', 'Bikes', 700, 'Available', 'WB-02-AZ-1005', '2023-10-15', 115000, 21400, false),
  (6, 'TVS Apache RTR 160 4V', 'Sharp handling streetfighter', '/images/tvs-apache-rtr-160.jpg', 'orange', 'Bikes', 900, 'Available', 'WB-02-BA-1006', '2024-01-25', 132000, 13900, false),
  (8, 'RE Hunter 350', 'Compact urban cruiser (349cc)', '/images/re-hunter-350.jpg', 'teal', 'Royal Enfield', 1500, 'Available', 'WB-02-BB-1008', '2023-12-05', 185000, 16800, false),
  (12, 'RE Classic 350', 'Retro-styled cruiser', '/images/re-classic-350.jpg', 'black', 'Royal Enfield', 1600, 'Available', 'WB-02-BC-1012', '2023-09-10', 215000, 24500, false),
  (9, 'Bajaj Pulsar NS200', 'Fiery naked sport-commuter', '/images/bajaj-pulsar-ns200.jpg', 'orange', 'Sports', 1200, 'Available', 'WB-02-BD-1009', '2024-03-01', 160000, 10400, false),
  (10, 'Yamaha R15 V4', 'Supersport mini-bike, track DNA', '/images/yamaha-r15-v4.jpg', 'teal', 'Sports', 1800, 'Available', 'WB-02-BE-1010', '2024-04-18', 210000, 7800, false),
  (11, 'KTM Duke 390', 'High-performance naked streetfighter', '/images/ktm-duke-390.jpg', 'orange', 'Sports', 2200, 'Available', 'WB-02-BF-1011', '2024-05-30', 320000, 5900, false)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  image_url = EXCLUDED.image_url,
  color = EXCLUDED.color,
  category = EXCLUDED.category,
  daily_rate = EXCLUDED.daily_rate,
  rc_number = EXCLUDED.rc_number,
  odometer_reading = EXCLUDED.odometer_reading;

SELECT setval(pg_get_serial_sequence('public.bikes', 'id'), COALESCE((SELECT MAX(id) + 1 FROM public.bikes), 1), false);

-- ==============================================================================
-- 2. CUSTOMER PROFILES (public.profiles)
-- Supports login via Email, Username, or Mobile Phone across all devices
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT,
    username TEXT,
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

-- CRITICAL FIX: Ensure all columns are explicitly added if public.profiles pre-existed
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS username TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS full_name TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS whatsapp TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS dl_url TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS aadhaar_url TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS dl_number TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS aadhaar_number TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT FALSE;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT FALSE;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_blocked BOOLEAN DEFAULT FALSE;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS admin_notes TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW());
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW());

-- Safe partial unique indexes (never fail on nulls or prior duplicates)
CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_email_unique ON public.profiles (LOWER(email)) WHERE email IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_username_unique ON public.profiles (LOWER(username)) WHERE username IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_profiles_phone ON public.profiles (phone);
CREATE INDEX IF NOT EXISTS idx_profiles_whatsapp ON public.profiles (whatsapp);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public and users can access profiles" ON public.profiles;
CREATE POLICY "Public and users can access profiles" ON public.profiles FOR ALL TO public USING (true) WITH CHECK (true);

-- ==============================================================================
-- 3. BOOKINGS TABLE (public.bookings)
-- Enforces mandatory customer_email and stores full manual/converted booking terms
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.bookings (
    id BIGSERIAL PRIMARY KEY,
    readable_id TEXT UNIQUE NOT NULL,
    user_id UUID,
    bike_id BIGINT NOT NULL REFERENCES public.bikes(id) ON DELETE CASCADE,
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
    adjustment_amount NUMERIC(10, 2) DEFAULT 0,
    adjustment_reason TEXT,
    status TEXT NOT NULL DEFAULT 'booking_confirmed',
    payment_method TEXT DEFAULT 'UPI',
    payment_screenshot_url TEXT,
    is_outstation BOOLEAN DEFAULT FALSE,
    needs_delivery BOOLEAN DEFAULT FALSE,
    needs_return_pickup BOOLEAN DEFAULT FALSE,
    address TEXT,
    admin_notes TEXT,
    start_timestamp TIMESTAMPTZ,
    end_timestamp TIMESTAMPTZ,
    start_odometer NUMERIC(10, 2),
    end_odometer NUMERIC(10, 2),
    customer_photo_url TEXT,
    settled BOOLEAN DEFAULT FALSE,
    aadhaar_url TEXT,
    dl_url TEXT,
    aadhaar_number TEXT,
    dl_number TEXT,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()),
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW())
);

-- Ensure all columns exist on public.bookings
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS readable_id TEXT;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS user_id UUID;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS bike_id BIGINT;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS customer_name TEXT;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS customer_phone TEXT;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS customer_email TEXT;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS pickup_date TEXT;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS pickup_time TEXT;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS return_date TEXT;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS return_time TEXT;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS total_rent NUMERIC(10, 2) DEFAULT 0;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS advance_amount NUMERIC(10, 2) DEFAULT 0;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS security_deposit NUMERIC(10, 2) DEFAULT 0;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS adjustment_amount NUMERIC(10, 2) DEFAULT 0;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS adjustment_reason TEXT;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'booking_confirmed';
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS payment_method TEXT DEFAULT 'UPI';
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS payment_screenshot_url TEXT;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS is_outstation BOOLEAN DEFAULT FALSE;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS needs_delivery BOOLEAN DEFAULT FALSE;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS needs_return_pickup BOOLEAN DEFAULT FALSE;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS admin_notes TEXT;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS start_odometer NUMERIC(10, 2);
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS end_odometer NUMERIC(10, 2);
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS customer_photo_url TEXT;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS settled BOOLEAN DEFAULT FALSE;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS aadhaar_url TEXT;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS dl_url TEXT;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS aadhaar_number TEXT;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS dl_number TEXT;

CREATE INDEX IF NOT EXISTS idx_bookings_readable_id ON public.bookings (readable_id);
CREATE INDEX IF NOT EXISTS idx_bookings_user_id ON public.bookings (user_id);
CREATE INDEX IF NOT EXISTS idx_bookings_customer_email ON public.bookings (customer_email);
CREATE INDEX IF NOT EXISTS idx_bookings_customer_phone ON public.bookings (customer_phone);
CREATE INDEX IF NOT EXISTS idx_bookings_bike_id ON public.bookings (bike_id);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON public.bookings (status);

ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow All Actions On Bookings" ON public.bookings;
CREATE POLICY "Allow All Actions On Bookings" ON public.bookings FOR ALL TO public USING (true) WITH CHECK (true);

-- ==============================================================================
-- 4. LEADS PIPELINE TABLE (public.leads)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.leads (
    id TEXT PRIMARY KEY,
    customer_name TEXT NOT NULL,
    customer_phone TEXT NOT NULL,
    source TEXT NOT NULL,
    vehicle_preference TEXT NOT NULL,
    specific_vehicle_id BIGINT,
    specific_vehicle_name TEXT,
    pickup_date TEXT NOT NULL,
    return_date TEXT NOT NULL,
    rental_duration_days INT DEFAULT 1,
    purpose TEXT DEFAULT 'Local City Errands',
    budget_expectation TEXT,
    status TEXT NOT NULL DEFAULT 'need_follow_up',
    follow_up_date TEXT,
    notes TEXT,
    follow_up_comments JSONB DEFAULT '[]'::jsonb,
    converted_booking_id TEXT,
    converted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()),
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW())
);

ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS follow_up_comments JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS converted_booking_id TEXT;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS converted_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_leads_status ON public.leads (status);
CREATE INDEX IF NOT EXISTS idx_leads_customer_phone ON public.leads (customer_phone);

ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow All Actions On Leads" ON public.leads;
CREATE POLICY "Allow All Actions On Leads" ON public.leads FOR ALL TO public USING (true) WITH CHECK (true);

-- ==============================================================================
-- 5. AUTOMATIC DATABASE TRIGGERS
-- A) Automatically guarantee a customer profile on ANY payment confirmed booking
-- B) Automatically link bookings when a user registers or logs in with their email
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.auto_profile_and_link_confirmed_booking()
RETURNS TRIGGER AS $$
DECLARE
    target_profile_id UUID;
    clean_email TEXT;
    clean_phone TEXT;
    derived_username TEXT;
BEGIN
    clean_email := LOWER(TRIM(COALESCE(NEW.customer_email, '')));
    clean_phone := REGEXP_REPLACE(COALESCE(NEW.customer_phone, ''), '\D', '', 'g');
    IF LENGTH(clean_phone) > 10 THEN
        clean_phone := RIGHT(clean_phone, 10);
    END IF;

    -- Generate a clean fallback username from email prefix (e.g. rahul from rahul@gmail.com)
    IF clean_email <> '' AND POSITION('@' IN clean_email) > 0 THEN
        derived_username := REGEXP_REPLACE(SPLIT_PART(clean_email, '@', 1), '[^a-zA-Z0-9_]', '_', 'g');
    ELSE
        derived_username := 'rider_' || RIGHT(clean_phone, 4);
    END IF;
    IF LENGTH(derived_username) < 3 THEN
        derived_username := 'rider_' || RIGHT(clean_phone, 4);
    END IF;

    -- Auto-create/update profile if payment confirmed, ongoing, or advance paid
    IF (NEW.status IN ('booking_confirmed', 'ongoing') OR COALESCE(NEW.advance_amount, 0) > 0) AND clean_email <> '' THEN
        -- Check if profile exists by email or phone
        SELECT id INTO target_profile_id
        FROM public.profiles
        WHERE LOWER(email) = clean_email 
           OR (clean_phone <> '' AND (phone = clean_phone OR whatsapp = clean_phone))
        LIMIT 1;

        IF target_profile_id IS NOT NULL THEN
            -- Update profile with newest contact & KYC info
            UPDATE public.profiles
            SET full_name = COALESCE(NULLIF(public.profiles.full_name, ''), NEW.customer_name),
                phone = COALESCE(NULLIF(public.profiles.phone, ''), clean_phone),
                whatsapp = COALESCE(NULLIF(public.profiles.whatsapp, ''), clean_phone),
                username = COALESCE(public.profiles.username, derived_username),
                dl_number = COALESCE(public.profiles.dl_number, NEW.dl_number),
                aadhaar_number = COALESCE(public.profiles.aadhaar_number, NEW.aadhaar_number),
                dl_url = COALESCE(public.profiles.dl_url, NEW.dl_url),
                aadhaar_url = COALESCE(public.profiles.aadhaar_url, NEW.aadhaar_url),
                updated_at = NOW()
            WHERE id = target_profile_id;
        ELSE
            -- Insert fresh profile
            INSERT INTO public.profiles (
                email,
                username,
                full_name,
                phone,
                whatsapp,
                dl_number,
                aadhaar_number,
                dl_url,
                aadhaar_url,
                is_verified,
                is_admin,
                is_blocked
            ) VALUES (
                clean_email,
                derived_username,
                NEW.customer_name,
                clean_phone,
                clean_phone,
                NEW.dl_number,
                NEW.aadhaar_number,
                NEW.dl_url,
                NEW.aadhaar_url,
                (NEW.dl_number IS NOT NULL OR NEW.dl_url IS NOT NULL),
                false,
                false
            )
            RETURNING id INTO target_profile_id;
        END IF;

        -- Associate user_id on booking
        IF NEW.user_id IS NULL AND target_profile_id IS NOT NULL THEN
            NEW.user_id := target_profile_id;
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_confirmed_booking_profile ON public.bookings;
CREATE TRIGGER trg_confirmed_booking_profile
    BEFORE INSERT OR UPDATE OF status, advance_amount, customer_email, customer_phone
    ON public.bookings
    FOR EACH ROW
    EXECUTE FUNCTION public.auto_profile_and_link_confirmed_booking();

-- Trigger: When a rider creates an account via Supabase Auth, link their profile & past bookings
CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS TRIGGER AS $$
DECLARE
    gen_username TEXT;
    clean_phone TEXT;
    existing_profile_id UUID;
BEGIN
    clean_phone := REGEXP_REPLACE(COALESCE(NEW.raw_user_meta_data->>'phone', ''), '\D', '', 'g');
    IF LENGTH(clean_phone) > 10 THEN
        clean_phone := RIGHT(clean_phone, 10);
    END IF;

    gen_username := COALESCE(
        NEW.raw_user_meta_data->>'username',
        SPLIT_PART(NEW.email, '@', 1)
    );

    SELECT id INTO existing_profile_id FROM public.profiles WHERE id = NEW.id OR LOWER(email) = LOWER(NEW.email) LIMIT 1;

    IF existing_profile_id IS NOT NULL THEN
        UPDATE public.profiles
        SET id = NEW.id,
            email = LOWER(NEW.email),
            username = COALESCE(public.profiles.username, gen_username),
            full_name = COALESCE(NULLIF(public.profiles.full_name, ''), NEW.raw_user_meta_data->>'full_name', SPLIT_PART(NEW.email, '@', 1)),
            phone = COALESCE(NULLIF(public.profiles.phone, ''), clean_phone),
            updated_at = NOW()
        WHERE id = existing_profile_id;
    ELSE
        INSERT INTO public.profiles (
            id,
            email,
            username,
            full_name,
            phone,
            whatsapp,
            is_admin,
            is_verified
        ) VALUES (
            NEW.id,
            LOWER(NEW.email),
            gen_username,
            COALESCE(NEW.raw_user_meta_data->>'full_name', SPLIT_PART(NEW.email, '@', 1)),
            clean_phone,
            clean_phone,
            false,
            false
        );
    END IF;

    -- Also link all existing bookings with matching email to this new user_id
    UPDATE public.bookings
    SET user_id = NEW.id
    WHERE LOWER(customer_email) = LOWER(NEW.email)
      AND user_id IS NULL;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_auth_user();

-- Backfill any existing bookings that match registered profile emails
UPDATE public.bookings b
SET user_id = p.id
FROM public.profiles p
WHERE LOWER(b.customer_email) = LOWER(p.email)
  AND b.user_id IS NULL;

-- ==============================================================================
-- 6. CROSS-DEVICE REALTIME REPLICATION
-- Instant sync across multiple devices for blockings, calendar slots, & bookings
-- ==============================================================================
DO $$
BEGIN
    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.bikes;
    EXCEPTION WHEN duplicate_object THEN END;

    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.bookings;
    EXCEPTION WHEN duplicate_object THEN END;

    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;
    EXCEPTION WHEN duplicate_object THEN END;

    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.leads;
    EXCEPTION WHEN duplicate_object THEN END;
END $$;

-- ==============================================================================
-- 7. STORAGE BUCKETS (booking-docs & identity-docs)
-- ==============================================================================
INSERT INTO storage.buckets (id, name, public)
VALUES 
  ('booking-docs', 'booking-docs', true),
  ('identity-docs', 'identity-docs', true)
ON CONFLICT (id) DO UPDATE SET public = true;

DROP POLICY IF EXISTS "Public Read Booking Docs" ON storage.objects;
CREATE POLICY "Public Read Booking Docs"
ON storage.objects FOR SELECT TO public
USING (bucket_id IN ('booking-docs', 'identity-docs'));

DROP POLICY IF EXISTS "Public Upload Booking Docs" ON storage.objects;
CREATE POLICY "Public Upload Booking Docs"
ON storage.objects FOR INSERT TO public
WITH CHECK (bucket_id IN ('booking-docs', 'identity-docs'));

DROP POLICY IF EXISTS "Public Update Booking Docs" ON storage.objects;
CREATE POLICY "Public Update Booking Docs"
ON storage.objects FOR UPDATE TO public
USING (bucket_id IN ('booking-docs', 'identity-docs'));

-- Refresh PostgREST schema cache
NOTIFY pgrst, 'reload schema';
