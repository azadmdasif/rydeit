-- ==============================================================================
-- RYDEIT: PILLION DETAILS & EMERGENCY CONTACT BACKEND MIGRATION
-- Run this in your Supabase Dashboard: SQL Editor -> New Query -> Run
-- This enables cross-device sync of pillion details, aadhaar card, and emergency contacts.
-- ==============================================================================

-- 1. Ensure required columns exist on public.bookings
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS customer_email TEXT;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS has_pillion BOOLEAN DEFAULT FALSE;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS pillion_name TEXT;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS pillion_phone TEXT;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS pillion_aadhaar_number TEXT;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS pillion_aadhaar_url TEXT;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS emergency_contact_phone TEXT;

-- 2. Create performance indexes
CREATE INDEX IF NOT EXISTS idx_bookings_customer_email ON public.bookings (customer_email);
CREATE INDEX IF NOT EXISTS idx_bookings_has_pillion ON public.bookings (has_pillion);
CREATE INDEX IF NOT EXISTS idx_bookings_pillion_phone ON public.bookings (pillion_phone);
CREATE INDEX IF NOT EXISTS idx_bookings_emergency_contact_phone ON public.bookings (emergency_contact_phone);

-- 3. Ensure Storage Bucket for documents exists and is public
INSERT INTO storage.buckets (id, name, public)
VALUES ('booking-docs', 'booking-docs', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- 4. Enable public upload, select, and update policies for booking-docs
DROP POLICY IF EXISTS "Public Upload booking-docs" ON storage.objects;
DROP POLICY IF EXISTS "Public Select booking-docs" ON storage.objects;
DROP POLICY IF EXISTS "Public Update booking-docs" ON storage.objects;

CREATE POLICY "Public Upload booking-docs"
ON storage.objects FOR INSERT
TO public
WITH CHECK (bucket_id = 'booking-docs');

CREATE POLICY "Public Select booking-docs"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'booking-docs');

CREATE POLICY "Public Update booking-docs"
ON storage.objects FOR UPDATE
TO public
USING (bucket_id = 'booking-docs')
WITH CHECK (bucket_id = 'booking-docs');

-- 5. Force reload schema cache for PostgREST so changes take effect immediately
NOTIFY pgrst, 'reload schema';
