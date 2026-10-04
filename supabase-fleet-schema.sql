-- ==============================================================================
-- RYDEIT: COMPLETE FLEET MANAGEMENT & BIKES SCHEMA
-- Run this in the Supabase SQL Editor (Dashboard > SQL Editor > New query)
-- ==============================================================================

-- 1. Create table: public.bikes
CREATE TABLE IF NOT EXISTS public.bikes (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT DEFAULT '',
    image_url TEXT NOT NULL,
    color TEXT DEFAULT 'black',
    category TEXT NOT NULL DEFAULT 'Bikes', -- 'Bikes', 'Sports', 'Scooter', 'Royal Enfield'
    daily_rate NUMERIC(10, 2) NOT NULL DEFAULT 700.00,
    status TEXT NOT NULL DEFAULT 'Available', -- 'Available', 'Booked', 'Running', 'Maintenance'
    rc_number TEXT,
    purchase_date DATE DEFAULT CURRENT_DATE,
    purchase_cost NUMERIC(12, 2) DEFAULT 0.00,
    odometer_reading NUMERIC(10, 2) DEFAULT 0.00,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()),
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW())
);

-- 2. Indexes for fast category, status, and availability queries
CREATE INDEX IF NOT EXISTS idx_bikes_category ON public.bikes (category);
CREATE INDEX IF NOT EXISTS idx_bikes_status ON public.bikes (status);
CREATE INDEX IF NOT EXISTS idx_bikes_is_deleted ON public.bikes (is_deleted);

-- 3. Row Level Security (RLS) Policies
ALTER TABLE public.bikes ENABLE ROW LEVEL SECURITY;

-- Allow public read access to all non-deleted bikes
DROP POLICY IF EXISTS "Public Read Bikes" ON public.bikes;
CREATE POLICY "Public Read Bikes"
ON public.bikes FOR SELECT
TO public
USING (is_deleted = false);

-- Allow full insert/update/delete access for fleet management
DROP POLICY IF EXISTS "Allow All Actions On Bikes" ON public.bikes;
CREATE POLICY "Allow All Actions On Bikes"
ON public.bikes FOR ALL
TO public
USING (true)
WITH CHECK (true);

-- 4. Enable odometer_reading and unrestricted RLS on maintenance_logs
DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'maintenance_logs') THEN
        ALTER TABLE public.maintenance_logs ADD COLUMN IF NOT EXISTS odometer_reading NUMERIC(10, 2);
        ALTER TABLE public.maintenance_logs ENABLE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS "Allow all on maintenance_logs" ON public.maintenance_logs;
        CREATE POLICY "Allow all on maintenance_logs" ON public.maintenance_logs FOR ALL TO public USING (true) WITH CHECK (true);
    END IF;
END $$;

-- 5. Seed initial fleet into public.bikes (idempotent upsert)
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
  purchase_date = EXCLUDED.purchase_date,
  purchase_cost = EXCLUDED.purchase_cost,
  odometer_reading = EXCLUDED.odometer_reading;

-- 6. Auto update sequence for future machine registrations
SELECT setval(pg_get_serial_sequence('public.bikes', 'id'), COALESCE((SELECT MAX(id) + 1 FROM public.bikes), 1), false);
