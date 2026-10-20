-- ==============================================================================
-- RYDEIT: ADD PILLION DETAILS & EMERGENCY CONTACT COLUMNS
-- Run this in your Supabase Dashboard: SQL Editor -> New Query -> Run
-- ==============================================================================

-- 1. Add Pillion & Emergency Contact columns to public.bookings
ALTER TABLE public.bookings
ADD COLUMN IF NOT EXISTS pillion_name TEXT,
ADD COLUMN IF NOT EXISTS pillion_phone TEXT,
ADD COLUMN IF NOT EXISTS pillion_mobile TEXT,
ADD COLUMN IF NOT EXISTS pillion_aadhaar_number TEXT,
ADD COLUMN IF NOT EXISTS pillion_aadhar_number TEXT,
ADD COLUMN IF NOT EXISTS pillion_aadhaar_url TEXT,
ADD COLUMN IF NOT EXISTS pillion_aadhar_url TEXT,
ADD COLUMN IF NOT EXISTS emergency_contact TEXT,
ADD COLUMN IF NOT EXISTS pillion_emergency_contact TEXT,
ADD COLUMN IF NOT EXISTS emergency_relation TEXT;

-- 2. Ensure booking-docs storage bucket exists and allows public uploads for aadhar photos
INSERT INTO storage.buckets (id, name, public)
VALUES ('booking-docs', 'booking-docs', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- 3. Storage policy to allow upload to booking-docs
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'objects' AND policyname = 'Public Upload booking-docs'
    ) THEN
        CREATE POLICY "Public Upload booking-docs"
        ON storage.objects FOR INSERT
        TO public
        WITH CHECK (bucket_id = 'booking-docs');
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'objects' AND policyname = 'Public Select booking-docs'
    ) THEN
        CREATE POLICY "Public Select booking-docs"
        ON storage.objects FOR SELECT
        TO public
        USING (bucket_id = 'booking-docs');
    END IF;
END $$;

-- 4. Reload PostgREST schema cache so columns are immediately visible to clients
NOTIFY pgrst, 'reload schema';

-- ==============================================================================
-- SUCCESS: Pillion name, phone, aadhaar, and emergency contact columns are ready!
-- ==============================================================================
