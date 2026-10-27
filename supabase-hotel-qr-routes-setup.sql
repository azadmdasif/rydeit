-- ==============================================================================
-- RYDEIT: HOTEL PARTNER & HOTEL QR ROUTES SYSTEM SQL SETUP
-- Run this in your Supabase Dashboard: SQL Editor -> New Query -> Run
-- ==============================================================================

-- 1. Enable Row Level Security and allow public read on existing table hotel_qr_routes
-- This ensures the web app can read all hotel codes, names, and any newly added hotels.
ALTER TABLE public.hotel_qr_routes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read access to hotel_qr_routes" ON public.hotel_qr_routes;
CREATE POLICY "Allow public read access to hotel_qr_routes"
ON public.hotel_qr_routes FOR SELECT
TO public
USING (true);

-- Allow hotel commission updates
DROP POLICY IF EXISTS "Allow update on hotel_qr_routes" ON public.hotel_qr_routes;
CREATE POLICY "Allow update on hotel_qr_routes"
ON public.hotel_qr_routes FOR UPDATE
TO public
USING (true)
WITH CHECK (true);

-- 2. Add total_earnings and commission_per_booking columns to hotel_qr_routes (if not present)
ALTER TABLE public.hotel_qr_routes ADD COLUMN IF NOT EXISTS total_earnings NUMERIC(12, 2) DEFAULT 0.00;
ALTER TABLE public.hotel_qr_routes ADD COLUMN IF NOT EXISTS commission_per_booking NUMERIC(10, 2) DEFAULT 150.00;

-- 3. Ensure bookings table has coupon & hotel attribution columns
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS coupon_code TEXT;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS discount_amount NUMERIC(10, 2) DEFAULT 0.00;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS hotel_name TEXT;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS hotel_id TEXT;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS hotel_commission NUMERIC(10, 2) DEFAULT 150.00;

CREATE INDEX IF NOT EXISTS idx_bookings_coupon_code ON public.bookings (coupon_code);
CREATE INDEX IF NOT EXISTS idx_bookings_hotel_name ON public.bookings (hotel_name);

-- 4. Enable public read on bookings matching coupon_code so hotel dashboard can see their guest bookings
DROP POLICY IF EXISTS "Allow read hotel guest bookings" ON public.bookings;
CREATE POLICY "Allow read hotel guest bookings"
ON public.bookings FOR SELECT
TO public
USING (coupon_code IS NOT NULL OR hotel_name IS NOT NULL);

-- 5. Automatic Commission Trigger (Idempotent):
-- When a booking with a coupon code is inserted, automatically credit ₹150 to that hotel in hotel_qr_routes
CREATE OR REPLACE FUNCTION public.fn_credit_hotel_commission_on_qr_routes()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.coupon_code IS NOT NULL AND LENGTH(TRIM(NEW.coupon_code)) > 0 THEN
        UPDATE public.hotel_qr_routes
        SET 
            total_earnings = COALESCE(total_earnings, 0) + COALESCE(NEW.hotel_commission, 150.00),
            updated_at = NOW()
        WHERE UPPER(TRIM(code)) = UPPER(TRIM(NEW.coupon_code));
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_credit_hotel_commission_on_qr_routes ON public.bookings;
CREATE TRIGGER trg_credit_hotel_commission_on_qr_routes
AFTER INSERT ON public.bookings
FOR EACH ROW
EXECUTE FUNCTION public.fn_credit_hotel_commission_on_qr_routes();

-- 6. Add hotel_qr_routes to Supabase Realtime publication (if publication exists)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.hotel_qr_routes;
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        NULL;
END $$;
