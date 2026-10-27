-- ==============================================================================
-- RYDEIT: HOTEL PARTNER PORTAL & COUPON CODE SYSTEM SQL SETUP
-- Run this in your Supabase Dashboard: SQL Editor -> New Query -> Run
-- ==============================================================================

-- 1. Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ==============================================================================
-- 2. CREATE HOTEL PARTNERS TABLE (public.hotel_partners)
-- Stores Hotel properties, credentials (Hotel Name as Username, Coupon Code as Password),
-- referral QR parameters, and live commission balances.
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.hotel_partners (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    hotel_name TEXT NOT NULL UNIQUE,
    coupon_code TEXT NOT NULL UNIQUE,
    contact_person TEXT DEFAULT '',
    phone TEXT DEFAULT '',
    email TEXT DEFAULT '',
    address TEXT DEFAULT '',
    commission_per_booking NUMERIC(10, 2) NOT NULL DEFAULT 150.00,
    total_earnings NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    qr_code_url TEXT DEFAULT '',
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()),
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW())
);

-- Ensure all columns exist in case table was created previously with partial schema
ALTER TABLE public.hotel_partners ADD COLUMN IF NOT EXISTS hotel_name TEXT;
ALTER TABLE public.hotel_partners ADD COLUMN IF NOT EXISTS coupon_code TEXT;
ALTER TABLE public.hotel_partners ADD COLUMN IF NOT EXISTS contact_person TEXT DEFAULT '';
ALTER TABLE public.hotel_partners ADD COLUMN IF NOT EXISTS phone TEXT DEFAULT '';
ALTER TABLE public.hotel_partners ADD COLUMN IF NOT EXISTS email TEXT DEFAULT '';
ALTER TABLE public.hotel_partners ADD COLUMN IF NOT EXISTS address TEXT DEFAULT '';
ALTER TABLE public.hotel_partners ADD COLUMN IF NOT EXISTS commission_per_booking NUMERIC(10, 2) DEFAULT 150.00;
ALTER TABLE public.hotel_partners ADD COLUMN IF NOT EXISTS total_earnings NUMERIC(12, 2) DEFAULT 0.00;
ALTER TABLE public.hotel_partners ADD COLUMN IF NOT EXISTS qr_code_url TEXT DEFAULT '';
ALTER TABLE public.hotel_partners ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;
ALTER TABLE public.hotel_partners ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW());
ALTER TABLE public.hotel_partners ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW());

-- Add fast lookup indexes
CREATE INDEX IF NOT EXISTS idx_hotel_partners_coupon_code ON public.hotel_partners (coupon_code);
CREATE INDEX IF NOT EXISTS idx_hotel_partners_hotel_name ON public.hotel_partners (hotel_name);
CREATE INDEX IF NOT EXISTS idx_hotel_partners_is_active ON public.hotel_partners (is_active);

-- Enable RLS & open policies for partner login & attribution
ALTER TABLE public.hotel_partners ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow Read Hotel Partners" ON public.hotel_partners;
CREATE POLICY "Allow Read Hotel Partners" ON public.hotel_partners FOR SELECT TO public USING (true);

DROP POLICY IF EXISTS "Allow Update Hotel Earnings" ON public.hotel_partners;
CREATE POLICY "Allow Update Hotel Earnings" ON public.hotel_partners FOR UPDATE TO public USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow Insert Hotel Partners" ON public.hotel_partners;
CREATE POLICY "Allow Insert Hotel Partners" ON public.hotel_partners FOR INSERT TO public WITH CHECK (true);

-- ==============================================================================
-- 3. ALIAS VIEW / TABLE FOR hotel_qrs
-- Guarantees compatibility whether code queries 'hotel_partners' or 'hotel_qrs'
-- ==============================================================================
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'hotel_qrs') THEN
        CREATE OR REPLACE VIEW public.hotel_qrs AS
        SELECT 
            id,
            hotel_name,
            coupon_code,
            contact_person,
            phone,
            email,
            address,
            commission_per_booking,
            total_earnings,
            qr_code_url,
            is_active,
            created_at,
            updated_at
        FROM public.hotel_partners;
    END IF;
END $$;

-- ==============================================================================
-- 4. UPDATE public.bookings TABLE WITH COUPON & HOTEL ATTRIBUTION COLUMNS
-- ==============================================================================
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS coupon_code TEXT;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS discount_amount NUMERIC(10, 2) DEFAULT 0.00;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS hotel_name TEXT;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS hotel_id TEXT;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS hotel_commission NUMERIC(10, 2) DEFAULT 150.00;

CREATE INDEX IF NOT EXISTS idx_bookings_coupon_code ON public.bookings (coupon_code);
CREATE INDEX IF NOT EXISTS idx_bookings_hotel_name ON public.bookings (hotel_name);

-- ==============================================================================
-- 5. SEED INITIAL TOP KOLKATA HOTEL PARTNERS & ACTIVE COUPON CODES
-- ==============================================================================
INSERT INTO public.hotel_partners (id, hotel_name, coupon_code, contact_person, phone, email, address, commission_per_booking, total_earnings, is_active)
VALUES
    ('hotel_taj_bengal', 'Taj Bengal', 'TAJ150', 'Concierge Desk', '03366123939', 'tajbengal.kolkata@tajhotels.com', '34B, Belvedere Road, Alipore, Kolkata - 700027', 150.00, 0.00, true),
    ('hotel_jw_marriott', 'JW Marriott Kolkata', 'JW150', 'Front Office / Travel Desk', '03366330000', 'jw.kolkata.concierge@marriott.com', '4A, J.B.S. Haldane Avenue, Kolkata - 700105', 150.00, 0.00, true),
    ('hotel_oberoi_grand', 'The Oberoi Grand', 'OBEROI150', 'Guest Relations', '03322492323', 'concierge.grandkolkata@oberoihotels.com', '15, Jawaharlal Nehru Road, New Market Area, Kolkata - 700013', 150.00, 0.00, true),
    ('hotel_itc_sonar', 'ITC Sonar & Royal Bengal', 'ITC150', 'Travel & Concierge', '03344464646', 'concierge.itcsonar@itchotels.in', '1, JBS Haldane Avenue, Tangra, Kolkata - 700046', 150.00, 0.00, true),
    ('hotel_hyatt_regency', 'Hyatt Regency Kolkata', 'HYATT150', 'Concierge Desk', '03339881234', 'kolkata.regency@hyatt.com', 'JA-1, Sector III, Salt Lake City, Kolkata - 700098', 150.00, 0.00, true),
    ('hotel_novotel', 'Novotel Kolkata Hotel and Residences', 'NOVOTEL150', 'Front Desk', '03340323333', 'h8236-re@accor.com', 'CF 11, Action Area 1C, New Town, Rajarhat, Kolkata - 700156', 150.00, 0.00, true),
    ('hotel_the_westin', 'The Westin Kolkata Rajarhat', 'WESTIN150', 'Concierge', '03340371234', 'westin.kolkata@westin.com', 'Plot No. CBD/2, Action Area II, New Town, Kolkata - 700156', 150.00, 0.00, true),
    ('hotel_pride_plaza', 'Pride Plaza Hotel New Town', 'PRIDE150', 'Front Office', '03340259999', 'frontoffice.kolkata@pridehotel.com', 'Terminus, B.G-12, Action Area 1B, New Town, Kolkata - 700156', 150.00, 0.00, true),
    ('hotel_holiday_inn', 'Holiday Inn Express Kolkata Airport', 'HIEX150', 'Reception', '03366367777', 'info@hiexkolkata.com', '28, Jessore Road, Near NSCBI Airport, Kolkata - 700052', 150.00, 0.00, true),
    ('hotel_fairfield', 'Fairfield by Marriott Kolkata', 'FAIRFIELD150', 'Front Desk', '03366664444', 'fairfield.kolkata@marriott.com', 'CB 218, Action Area 1C, New Town, Kolkata - 700156', 150.00, 0.00, true)
ON CONFLICT (coupon_code) DO UPDATE SET
    hotel_name = EXCLUDED.hotel_name,
    contact_person = EXCLUDED.contact_person,
    phone = EXCLUDED.phone,
    email = EXCLUDED.email,
    address = EXCLUDED.address,
    commission_per_booking = EXCLUDED.commission_per_booking,
    is_active = EXCLUDED.is_active;

-- ==============================================================================
-- 6. AUTOMATIC COMMISSION CREDIT TRIGGER (IDEMPOTENT)
-- When a booking with a coupon_code is created, automatically credit ₹150 to that hotel's total_earnings
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.fn_credit_hotel_commission_on_booking()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.coupon_code IS NOT NULL AND LENGTH(TRIM(NEW.coupon_code)) > 0 THEN
        UPDATE public.hotel_partners
        SET 
            total_earnings = COALESCE(total_earnings, 0) + COALESCE(NEW.hotel_commission, 150.00),
            updated_at = TIMEZONE('utc'::text, NOW())
        WHERE UPPER(coupon_code) = UPPER(TRIM(NEW.coupon_code));
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_credit_hotel_commission ON public.bookings;
CREATE TRIGGER trg_credit_hotel_commission
AFTER INSERT ON public.bookings
FOR EACH ROW
EXECUTE FUNCTION public.fn_credit_hotel_commission_on_booking();

-- ==============================================================================
-- 7. REFRESH REALTIME PUBLICATION
-- ==============================================================================
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.hotel_partners;
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        NULL;
END $$;
