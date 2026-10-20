-- ==============================================================================
-- RYDEIT: MIGRATION TO SUPPORT MULTI-VEHICLE SELECTION IN LEADS
-- Run this in your Supabase SQL Editor:
-- ==============================================================================

ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS requested_vehicles JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS follow_up_comments JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS follow_up_date DATE;
