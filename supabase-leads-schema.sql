-- ==============================================================================
-- RYDEIT: LEADS & INQUIRIES SCHEMA
-- Run this in the Supabase SQL Editor if you want database sync for inquiries
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.leads (
    id TEXT PRIMARY KEY,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()),
    customer_name TEXT NOT NULL,
    customer_phone TEXT NOT NULL,
    source TEXT NOT NULL DEFAULT 'whatsapp', -- 'whatsapp', 'call', 'walk_in', 'instagram', 'website'
    vehicle_preference TEXT NOT NULL DEFAULT 'scooty', -- 'scooty', 'bike', 'bullet', 'sports', 'flexible'
    specific_vehicle_id BIGINT,
    specific_vehicle_name TEXT,
    pickup_date DATE NOT NULL,
    return_date DATE NOT NULL,
    rental_duration_days INT NOT NULL DEFAULT 1,
    purpose TEXT NOT NULL DEFAULT 'Weekend Trip / Outing',
    budget_expectation TEXT,
    status TEXT NOT NULL DEFAULT 'need_follow_up', -- 'need_follow_up', 'contacted', 'booked', 'not_interested', 'lost_to_availability', 'lost_to_price', 'postponed'
    follow_up_date DATE,
    notes TEXT,
    follow_up_comments JSONB DEFAULT '[]'::jsonb,
    converted_booking_id TEXT,
    converted_at TIMESTAMPTZ
);

-- Ensure follow_up_comments column exists if table was previously created
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS follow_up_comments JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS follow_up_date DATE;

CREATE INDEX IF NOT EXISTS idx_leads_status ON public.leads(status);
CREATE INDEX IF NOT EXISTS idx_leads_vehicle_preference ON public.leads(vehicle_preference);
CREATE INDEX IF NOT EXISTS idx_leads_pickup_date ON public.leads(pickup_date);

ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow All Actions On Leads" ON public.leads;
CREATE POLICY "Allow All Actions On Leads"
ON public.leads FOR ALL
TO public
USING (true)
WITH CHECK (true);
