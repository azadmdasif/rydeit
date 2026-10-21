import { useState, useEffect } from 'react';
import { BIKES } from './constants';
import type { Bike, MaintenanceLog } from './types';
import { supabase } from './supabase';

const LOCAL_STORAGE_FLEET_KEY = 'rydeit_fleet_custom_v2';
const LOCAL_STORAGE_DELETED_BIKES_KEY = 'rydeit_fleet_deleted_v2';
const LOCAL_STORAGE_MAINT_KEY = 'rydeit_maintenance_logs_v1';

export const SUPABASE_FLEET_SQL = `-- ==============================================================================
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
`;

// Seed default maintenance logs
const DEFAULT_MAINTENANCE_LOGS: MaintenanceLog[] = [
  {
    id: 'maint-1',
    bike_id: 15,
    description: 'Scheduled 1st Periodic Service & Motul 10W-30 Oil Change',
    cost: 650,
    date: '2024-03-10',
    odometer_reading: 1000
  },
  {
    id: 'maint-2',
    bike_id: 15,
    description: '2nd Periodic Service, Air Filter Clean & Brake Inspection',
    cost: 450,
    date: '2024-07-15',
    odometer_reading: 5500
  },
  {
    id: 'maint-3',
    bike_id: 15,
    description: 'Brake Pad Replacement & CVT Transmission Clean',
    cost: 1250,
    date: '2026-09-02',
    odometer_reading: 11800
  },
  {
    id: 'maint-4',
    bike_id: 16,
    description: '1st General Servicing & Engine Oil Change',
    cost: 580,
    date: '2024-04-12',
    odometer_reading: 1200
  },
  {
    id: 'maint-5',
    bike_id: 16,
    description: 'Rear Brake Shoe Replacement & Drive Belt Check',
    cost: 890,
    date: '2026-08-20',
    odometer_reading: 13900
  },
  {
    id: 'maint-6',
    bike_id: 8,
    description: '1st Service, Semi-Synthetic Engine Oil & Filter',
    cost: 1450,
    date: '2024-02-18',
    odometer_reading: 500
  },
  {
    id: 'maint-7',
    bike_id: 8,
    description: 'Drive Chain Cleaning, Lubing & Clutch Adjustment',
    cost: 350,
    date: '2024-06-25',
    odometer_reading: 6200
  },
  {
    id: 'maint-8',
    bike_id: 8,
    description: 'Major 10,000 KM Service, Spark Plug & Brake Fluid',
    cost: 2600,
    date: '2026-09-10',
    odometer_reading: 15400
  },
  {
    id: 'maint-9',
    bike_id: 19,
    description: 'Diagnostic Software Scan & Drive Belt Tension Calibration',
    cost: 500,
    date: '2024-08-14',
    odometer_reading: 4500
  },
  {
    id: 'maint-10',
    bike_id: 11,
    description: '1st Performance Service & Motul 300V Synthetic Oil',
    cost: 2800,
    date: '2024-07-22',
    odometer_reading: 1000
  },
  {
    id: 'maint-11',
    bike_id: 11,
    description: 'Coolant Flush, Chain Sprocket & Brake Bleed',
    cost: 1650,
    date: '2026-08-15',
    odometer_reading: 5200
  },
  {
    id: 'maint-12',
    bike_id: 3,
    description: 'General Servicing & Spark Plug Clean',
    cost: 480,
    date: '2024-03-25',
    odometer_reading: 6500
  },
  {
    id: 'maint-13',
    bike_id: 3,
    description: 'Front Fork Oil Seal Replacement & Brake Overhaul',
    cost: 1100,
    date: '2026-07-18',
    odometer_reading: 17200
  }
];

function getDeletedBikeIds(): number[] {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_DELETED_BIKES_KEY);
    if (raw) return JSON.parse(raw);
  } catch (err) {
    console.error('Error reading deleted bike ids:', err);
  }
  return [];
}

export function getCustomFleetMap(): Record<number, Partial<Bike>> {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_FLEET_KEY);
    if (raw) return JSON.parse(raw);
  } catch (err) {
    console.error('Error reading fleet custom map:', err);
  }
  return {};
}

// Map database row to Bike model
export function mapDbBike(row: any): Bike {
  return {
    id: Number(row.id),
    name: row.name || 'Machine',
    description: row.description || '',
    imageUrl: row.image_url || '/images/ather-450x.jpg',
    color: (row.color as any) || 'black',
    category: (row.category as any) || 'Bikes',
    dailyRate: Number(row.daily_rate) || 700,
    status: (row.status as any) || 'Available',
    rc_number: row.rc_number || `WB-02-${1000 + row.id}`,
    purchase_date: row.purchase_date || '2024-01-01',
    purchase_cost: Number(row.purchase_cost) || 0,
    odometer_reading: Number(row.odometer_reading) || 0
  };
}

// Synchronous reader for fast component renders
export function getFleetBikes(): Bike[] {
  const deletedIds = getDeletedBikeIds();
  const customMap = getCustomFleetMap();

  // Combine default bikes and custom map, filtering out any deleted bikes
  const result: Bike[] = [];
  const processedIds = new Set<number>();

  // 1. Process custom entries first
  Object.keys(customMap).forEach(key => {
    const id = Number(key);
    if (deletedIds.includes(id)) return;
    const base = BIKES.find(b => b.id === id);
    const custom = customMap[id];
    processedIds.add(id);
    result.push({
      ...(base || {}),
      id,
      name: custom.name || base?.name || 'Machine',
      description: custom.description || base?.description || '',
      imageUrl: custom.imageUrl || base?.imageUrl || '/images/ather-450x.jpg',
      color: custom.color || base?.color || 'black',
      category: custom.category || base?.category || 'Bikes',
      dailyRate: custom.dailyRate !== undefined ? Number(custom.dailyRate) : (base?.dailyRate || 700),
      status: custom.status || base?.status || 'Available',
      rc_number: custom.rc_number || base?.rc_number || `WB-02-${1000 + id}`,
      purchase_date: custom.purchase_date || base?.purchase_date || '2024-01-01',
      purchase_cost: custom.purchase_cost !== undefined ? Number(custom.purchase_cost) : (base?.purchase_cost || 0),
      odometer_reading: custom.odometer_reading !== undefined ? Number(custom.odometer_reading) : (base?.odometer_reading || 0)
    } as Bike);
  });

  // 2. Add remaining default bikes
  BIKES.forEach(b => {
    if (deletedIds.includes(b.id) || processedIds.has(b.id)) return;
    result.push(b);
  });

  return result;
}

// Asynchronous sync with Supabase bikes table
export async function syncFleetWithSupabase(): Promise<{ bikes: Bike[]; source: 'supabase' | 'local' }> {
  try {
    const { data, error } = await supabase
      .from('bikes')
      .select('*')
      .eq('is_deleted', false)
      .order('id', { ascending: true });

    if (!error && data && data.length > 0) {
      const dbBikes = data.map(mapDbBike);
      // Update local storage cache
      const customMap: Record<number, Partial<Bike>> = {};
      dbBikes.forEach(b => {
        customMap[b.id] = b;
      });
      localStorage.setItem(LOCAL_STORAGE_FLEET_KEY, JSON.stringify(customMap));
      return { bikes: dbBikes, source: 'supabase' };
    }
  } catch (err) {
    console.warn('Supabase bikes query returned error, using local storage cache:', err);
  }

  return { bikes: getFleetBikes(), source: 'local' };
}

// Check if Supabase bikes table exists and is accessible
export async function checkSupabaseBikesTable(): Promise<{ exists: boolean; count: number; error?: string }> {
  try {
    const { data, error, count } = await supabase
      .from('bikes')
      .select('id', { count: 'exact', head: false })
      .limit(1);

    if (error) {
      return { exists: false, count: 0, error: error.message };
    }
    return { exists: true, count: count || data?.length || 0 };
  } catch (err: any) {
    return { exists: false, count: 0, error: err.message };
  }
}

// Save or update bike in Supabase & local storage
export async function saveFleetBike(updatedBike: Partial<Bike> & { id: number }): Promise<void> {
  try {
    // 1. Update local storage
    const customMap = getCustomFleetMap();
    customMap[updatedBike.id] = {
      ...(customMap[updatedBike.id] || {}),
      ...updatedBike
    };
    localStorage.setItem(LOCAL_STORAGE_FLEET_KEY, JSON.stringify(customMap));
    window.dispatchEvent(new CustomEvent('rydeit_fleet_updated', { detail: updatedBike }));

    // 2. Update Supabase if available
    try {
      const payload: any = {
        updated_at: new Date().toISOString()
      };
      if (updatedBike.name !== undefined) payload.name = updatedBike.name;
      if (updatedBike.dailyRate !== undefined) payload.daily_rate = updatedBike.dailyRate;
      if (updatedBike.imageUrl !== undefined) payload.image_url = updatedBike.imageUrl;
      if (updatedBike.rc_number !== undefined) payload.rc_number = updatedBike.rc_number;
      if (updatedBike.purchase_date !== undefined) payload.purchase_date = updatedBike.purchase_date;
      if (updatedBike.purchase_cost !== undefined) payload.purchase_cost = updatedBike.purchase_cost;
      if (updatedBike.odometer_reading !== undefined) payload.odometer_reading = updatedBike.odometer_reading;
      if (updatedBike.category !== undefined) payload.category = updatedBike.category;
      if (updatedBike.status !== undefined) payload.status = updatedBike.status;
      if (updatedBike.description !== undefined) payload.description = updatedBike.description;

      await supabase.from('bikes').update(payload).eq('id', updatedBike.id);
    } catch (e) {
      console.warn('Optional Supabase update notice:', e);
    }
  } catch (err) {
    console.error('Error saving fleet bike customization:', err);
  }
}

// Delete bike completely from website & Supabase
export async function deleteFleetBike(bikeId: number): Promise<void> {
  try {
    // 1. Mark in deleted IDs local cache
    const deletedIds = getDeletedBikeIds();
    if (!deletedIds.includes(bikeId)) {
      deletedIds.push(bikeId);
      localStorage.setItem(LOCAL_STORAGE_DELETED_BIKES_KEY, JSON.stringify(deletedIds));
    }

    // 2. Remove from custom map
    const customMap = getCustomFleetMap();
    if (customMap[bikeId]) {
      delete customMap[bikeId];
      localStorage.setItem(LOCAL_STORAGE_FLEET_KEY, JSON.stringify(customMap));
    }

    // 3. Delete / Soft-delete in Supabase
    try {
      // Soft-delete flag first (for foreign key safety with past bookings)
      await supabase.from('bikes').update({ is_deleted: true }).eq('id', bikeId);
      // Also attempt hard delete if no cascade constraints
      await supabase.from('bikes').delete().eq('id', bikeId);
    } catch (dbErr) {
      console.warn('Supabase delete notice:', dbErr);
    }

    // 4. Notify app
    window.dispatchEvent(new CustomEvent('rydeit_fleet_updated', { detail: { deletedBikeId: bikeId } }));
  } catch (err) {
    console.error('Error deleting fleet bike:', err);
  }
}

// Add new bike to Supabase & local storage
export async function addFleetBike(newBike: Omit<Bike, 'id'>): Promise<Bike> {
  let generatedId = Date.now() % 100000;

  // Try creating in Supabase first to get serial ID
  try {
    const { data, error } = await supabase.from('bikes').insert({
      name: newBike.name,
      description: newBike.description || '',
      image_url: newBike.imageUrl,
      color: newBike.color || 'black',
      category: newBike.category,
      daily_rate: newBike.dailyRate,
      status: newBike.status || 'Available',
      rc_number: newBike.rc_number || `WB-02-${1000 + generatedId}`,
      purchase_date: newBike.purchase_date || new Date().toISOString().split('T')[0],
      purchase_cost: newBike.purchase_cost || 0,
      odometer_reading: newBike.odometer_reading || 0,
      is_deleted: false
    }).select().single();

    if (!error && data) {
      const created = mapDbBike(data);
      const customMap = getCustomFleetMap();
      customMap[created.id] = created;
      localStorage.setItem(LOCAL_STORAGE_FLEET_KEY, JSON.stringify(customMap));
      window.dispatchEvent(new CustomEvent('rydeit_fleet_updated', { detail: created }));
      return created;
    }
  } catch (dbErr) {
    console.warn('Supabase insert fallback to local:', dbErr);
  }

  // Local fallback
  const created: Bike = {
    ...newBike,
    id: generatedId
  };
  const customMap = getCustomFleetMap();
  customMap[created.id] = created;
  localStorage.setItem(LOCAL_STORAGE_FLEET_KEY, JSON.stringify(customMap));
  window.dispatchEvent(new CustomEvent('rydeit_fleet_updated', { detail: created }));
  return created;
}

// Reset single bike to default
export function resetFleetBike(bikeId: number): Bike[] {
  try {
    const customMap = getCustomFleetMap();
    if (customMap[bikeId]) {
      delete customMap[bikeId];
      localStorage.setItem(LOCAL_STORAGE_FLEET_KEY, JSON.stringify(customMap));
    }
    const deletedIds = getDeletedBikeIds().filter(id => id !== bikeId);
    localStorage.setItem(LOCAL_STORAGE_DELETED_BIKES_KEY, JSON.stringify(deletedIds));
    window.dispatchEvent(new CustomEvent('rydeit_fleet_updated', { detail: { resetBikeId: bikeId } }));
  } catch (err) {
    console.error('Error resetting fleet bike:', err);
  }
  return getFleetBikes();
}

// Maintenance logs helpers
export function getStoredMaintenanceLogs(bikeId?: number): MaintenanceLog[] {
  try {
    let logs: MaintenanceLog[] = [];
    const raw = localStorage.getItem(LOCAL_STORAGE_MAINT_KEY);
    if (raw) {
      logs = JSON.parse(raw);
    } else {
      logs = [...DEFAULT_MAINTENANCE_LOGS];
      localStorage.setItem(LOCAL_STORAGE_MAINT_KEY, JSON.stringify(logs));
    }

    if (bikeId !== undefined) {
      return logs.filter(l => l.bike_id === bikeId).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }
    return logs.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  } catch (err) {
    console.error('Error reading maintenance logs:', err);
    return [];
  }
}

export async function addMaintenanceLog(log: Omit<MaintenanceLog, 'id'>): Promise<MaintenanceLog> {
  const newLog: MaintenanceLog = {
    ...log,
    id: `maint-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`
  };

  try {
    const logs = getStoredMaintenanceLogs();
    logs.unshift(newLog);
    localStorage.setItem(LOCAL_STORAGE_MAINT_KEY, JSON.stringify(logs));

    if (log.odometer_reading && log.odometer_reading > 0) {
      const bikes = getFleetBikes();
      const targetBike = bikes.find(b => b.id === log.bike_id);
      if (targetBike && (!targetBike.odometer_reading || log.odometer_reading > targetBike.odometer_reading)) {
        saveFleetBike({
          id: log.bike_id,
          odometer_reading: log.odometer_reading
        });
      }
    }

    window.dispatchEvent(new CustomEvent('rydeit_fleet_updated', { detail: newLog }));

    try {
      await supabase.from('maintenance_logs').insert({
        bike_id: log.bike_id,
        description: log.description,
        cost: log.cost,
        date: log.date
      });
    } catch {
      // Supabase may require admin session, local storage is authoritative
    }
  } catch (err) {
    console.error('Error saving maintenance log:', err);
  }

  return newLog;
}

export function deleteMaintenanceLog(logId: string): void {
  try {
    const logs = getStoredMaintenanceLogs().filter(l => l.id !== logId);
    localStorage.setItem(LOCAL_STORAGE_MAINT_KEY, JSON.stringify(logs));
    window.dispatchEvent(new CustomEvent('rydeit_fleet_updated', { detail: { deletedMaintId: logId } }));
  } catch (err) {
    console.error('Error deleting maintenance log:', err);
  }
}

export function useFleetBikes(): {
  bikes: Bike[];
  updateBike: (updated: Partial<Bike> & { id: number }) => Promise<void>;
  deleteBike: (id: number) => Promise<void>;
  addBike: (newBike: Omit<Bike, 'id'>) => Promise<Bike>;
  resetBike: (id: number) => void;
  refresh: () => Promise<void>;
} {
  const [bikes, setBikes] = useState<Bike[]>(() => getFleetBikes());

  const refresh = async () => {
    const { bikes: updated } = await syncFleetWithSupabase();
    setBikes(updated);
  };

  useEffect(() => {
    refresh();
    const handleUpdate = () => {
      setBikes(getFleetBikes());
    };
    window.addEventListener('rydeit_fleet_updated', handleUpdate);
    return () => window.removeEventListener('rydeit_fleet_updated', handleUpdate);
  }, []);

  return {
    bikes,
    updateBike: async (updated) => {
      await saveFleetBike(updated);
      setBikes(getFleetBikes());
    },
    deleteBike: async (id) => {
      await deleteFleetBike(id);
      setBikes(getFleetBikes());
    },
    addBike: async (newBike) => {
      const created = await addFleetBike(newBike);
      setBikes(getFleetBikes());
      return created;
    },
    resetBike: (id) => {
      resetFleetBike(id);
      setBikes(getFleetBikes());
    },
    refresh
  };
}
