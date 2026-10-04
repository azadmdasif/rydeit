-- ==============================================================================
-- RYDEIT BIKE RENTALS: COMPLETE FINANCE LEDGER, CAPEX, & MONTH AUDIT SCHEMA
-- Run this script in the Supabase SQL Editor (Dashboard > SQL Editor > New query)
-- ==============================================================================

-- 1. Enable UUID Extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==============================================================================
-- 2. CREATE TABLE: finance_months
-- Stores month spreadsheet tab configurations & starting opening cash/bank balances
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.finance_months (
    tab_name TEXT PRIMARY KEY,                       -- e.g. 'September 2026'
    month TEXT NOT NULL,                             -- e.g. 'September'
    year INTEGER NOT NULL,                           -- e.g. 2026
    opening_cash NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    opening_bank NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    is_initialized BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()),
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW())
);

CREATE INDEX IF NOT EXISTS idx_finance_months_year_month ON public.finance_months (year, month);

-- Safe migrations for existing finance_ledger tables
ALTER TABLE public.finance_ledger ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT FALSE;
ALTER TABLE public.finance_ledger ADD COLUMN IF NOT EXISTS delete_reason TEXT;
ALTER TABLE public.finance_ledger ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE public.finance_ledger ADD COLUMN IF NOT EXISTS deleted_by TEXT;

-- ==============================================================================
-- 3. CREATE TABLE: finance_ledger
-- Stores double-entry cash/bank ledger transactions, daily revenue, and expenses
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.finance_ledger (
    id TEXT PRIMARY KEY,
    tab_name TEXT NOT NULL,                         -- e.g. 'September 2026'
    date DATE NOT NULL,                              -- Transaction date (YYYY-MM-DD)
    credit_cash NUMERIC(12, 2) DEFAULT 0.00,        -- Cash Inflow
    credit_cash_details TEXT DEFAULT '',
    credit_bank NUMERIC(12, 2) DEFAULT 0.00,        -- Bank / Online Inflow
    credit_bank_details TEXT DEFAULT '',
    debit_cash NUMERIC(12, 2) DEFAULT 0.00,         -- Cash Outflow
    debit_cash_details TEXT DEFAULT '',
    debit_bank NUMERIC(12, 2) DEFAULT 0.00,         -- Bank Outflow
    debit_bank_details TEXT DEFAULT '',
    category TEXT NOT NULL DEFAULT 'others',        -- e.g. 'bike rental revenue', 'servicing & oil'
    notes TEXT DEFAULT '',                          -- Remarks / vehicle number
    bill_url TEXT,                                  -- Attached receipt / invoice image link
    funding_source TEXT DEFAULT 'revenue',          -- 'revenue', 'capital_investment', 'debt_loan'
    asset_id TEXT,                                  -- Link to finance_assets if CapEx purchase
    is_opening BOOLEAN DEFAULT FALSE,               -- Month opening balance marker
    is_deleted BOOLEAN DEFAULT FALSE,               -- Soft delete flag
    delete_reason TEXT,                             -- Reason provided when entry was voided
    deleted_at TIMESTAMPTZ,                         -- Timestamp of voiding
    deleted_by TEXT,                                -- Admin email/user who voided entry
    edit_history JSONB DEFAULT '[]'::jsonb,         -- Audit trail of revisions
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW())
);

-- Indexes for lightning-fast queries across date intervals and tabs
CREATE INDEX IF NOT EXISTS idx_finance_ledger_date ON public.finance_ledger (date);
CREATE INDEX IF NOT EXISTS idx_finance_ledger_tab ON public.finance_ledger (tab_name);
CREATE INDEX IF NOT EXISTS idx_finance_ledger_is_deleted ON public.finance_ledger (is_deleted);
CREATE INDEX IF NOT EXISTS idx_finance_ledger_category ON public.finance_ledger (category);

-- ==============================================================================
-- 4. CREATE TABLE: finance_deleted_logs
-- Permanent audit trail of every voided / deleted ledger entry with required reason
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.finance_deleted_logs (
    id TEXT PRIMARY KEY,
    entry_id TEXT NOT NULL,                         -- Original ledger transaction ID
    tab_name TEXT NOT NULL,                         -- e.g. 'September 2026'
    entry_date DATE NOT NULL,                        -- Original transaction date
    category TEXT NOT NULL,                         -- Category (e.g. 'bike rental revenue')
    amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,    -- Amount voided
    type TEXT NOT NULL,                             -- 'Credit Cash', 'Credit Bank', 'Debit Cash', 'Debit Bank'
    reason TEXT NOT NULL,                           -- Mandatory justification from admin
    deleted_by TEXT NOT NULL,                       -- Email / User ID of admin
    deleted_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc'::text, NOW()),
    entry_snapshot JSONB NOT NULL,                  -- Complete JSON snapshot of the voided entry
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW())
);

CREATE INDEX IF NOT EXISTS idx_finance_deleted_logs_deleted_at ON public.finance_deleted_logs (deleted_at DESC);
CREATE INDEX IF NOT EXISTS idx_finance_deleted_logs_entry_id ON public.finance_deleted_logs (entry_id);

-- ==============================================================================
-- 5. CREATE TABLE: finance_assets
-- Stores CapEx fleet assets, purchase costs, salvage values, and depreciation rules
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.finance_assets (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,                             -- e.g. 'Ather 450X (WB-02-1234)'
    category TEXT NOT NULL DEFAULT 'VEHICLE',       -- 'VEHICLE', 'GPS_IOT', 'GARAGE_EQUIPMENT', 'OFFICE_TECH'
    bike_id INTEGER,                                -- Optional link to Rydeit fleet bike ID
    purchase_date DATE NOT NULL,                    -- Date asset acquired
    purchase_cost NUMERIC(12, 2) NOT NULL,          -- CapEx investment amount
    salvage_value NUMERIC(12, 2) DEFAULT 0.00,      -- Residual/scrap value at end of life (~10%)
    useful_life_months INTEGER NOT NULL DEFAULT 48, -- 48 months = 4-year standard rental life
    depreciation_method TEXT NOT NULL DEFAULT 'SLM',-- 'SLM' (Straight Line) or 'WDV' (Written Down Value)
    annual_depreciation_rate NUMERIC(5, 2) DEFAULT 20.00,
    status TEXT NOT NULL DEFAULT 'ACTIVE',          -- 'ACTIVE', 'SOLD', 'SCRAPPED'
    notes TEXT,                                     -- Warranty, dealer info
    invoice_url TEXT,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW())
);

CREATE INDEX IF NOT EXISTS idx_finance_assets_category ON public.finance_assets (category);
CREATE INDEX IF NOT EXISTS idx_finance_assets_status ON public.finance_assets (status);
CREATE INDEX IF NOT EXISTS idx_finance_assets_bike_id ON public.finance_assets (bike_id);

-- Safe migrations for existing finance_assets tables
ALTER TABLE public.finance_assets ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'ACTIVE';
ALTER TABLE public.finance_assets ADD COLUMN IF NOT EXISTS annual_depreciation_rate NUMERIC(5, 2) DEFAULT 20.00;
ALTER TABLE public.finance_assets ADD COLUMN IF NOT EXISTS notes TEXT;

-- ==============================================================================
-- 6. STORAGE BUCKET FOR RECEIPTS / INVOICES
-- ==============================================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('receipts', 'receipts', true)
ON CONFLICT (id) DO NOTHING;

-- Storage Policy: Allow public read of receipt images
CREATE POLICY "Public Read Receipts"
ON storage.objects FOR SELECT
USING (bucket_id = 'receipts');

-- Storage Policy: Allow authenticated users to upload receipts
CREATE POLICY "Auth Upload Receipts"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'receipts');

-- ==============================================================================
-- 7. ROW LEVEL SECURITY (RLS) POLICIES (Admin Only Access)
-- ==============================================================================
ALTER TABLE public.finance_months ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.finance_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.finance_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.finance_deleted_logs ENABLE ROW LEVEL SECURITY;

-- Helper function to check if the current authenticated user is an admin
CREATE OR REPLACE FUNCTION public.is_admin_user()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND is_admin = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Policies for finance_months
DROP POLICY IF EXISTS "Admin All Access finance_months" ON public.finance_months;
CREATE POLICY "Admin All Access finance_months"
ON public.finance_months
FOR ALL
TO authenticated
USING (public.is_admin_user())
WITH CHECK (public.is_admin_user());

-- Policies for finance_ledger
DROP POLICY IF EXISTS "Admin All Access finance_ledger" ON public.finance_ledger;
CREATE POLICY "Admin All Access finance_ledger"
ON public.finance_ledger
FOR ALL
TO authenticated
USING (public.is_admin_user())
WITH CHECK (public.is_admin_user());

-- Policies for finance_assets
DROP POLICY IF EXISTS "Admin All Access finance_assets" ON public.finance_assets;
CREATE POLICY "Admin All Access finance_assets"
ON public.finance_assets
FOR ALL
TO authenticated
USING (public.is_admin_user())
WITH CHECK (public.is_admin_user());

-- Policies for finance_deleted_logs
DROP POLICY IF EXISTS "Admin All Access finance_deleted_logs" ON public.finance_deleted_logs;
CREATE POLICY "Admin All Access finance_deleted_logs"
ON public.finance_deleted_logs
FOR ALL
TO authenticated
USING (public.is_admin_user())
WITH CHECK (public.is_admin_user());

-- ==============================================================================
-- 8. INITIAL SEED DATA (September 2026 & Starter Assets)
-- ==============================================================================
INSERT INTO public.finance_months (tab_name, month, year, opening_cash, opening_bank, is_initialized)
VALUES ('September 2026', 'September', 2026, 26895.00, 27240.00, TRUE)
ON CONFLICT (tab_name) DO UPDATE SET
    opening_cash = EXCLUDED.opening_cash,
    opening_bank = EXCLUDED.opening_bank;

INSERT INTO public.finance_assets (id, name, category, bike_id, purchase_date, purchase_cost, salvage_value, useful_life_months, depreciation_method, status, notes)
VALUES
  ('asset-bike-15', 'Suzuki Burgman 125 (WB-02-1015)', 'VEHICLE', 15, '2025-06-15', 98000.00, 11000.00, 48, 'SLM', 'ACTIVE', 'Primary rental fleet unit #15'),
  ('asset-bike-16', 'Honda Activa 125 (WB-02-1016)', 'VEHICLE', 16, '2025-05-10', 92000.00, 10000.00, 48, 'SLM', 'ACTIVE', 'Primary rental fleet unit #16'),
  ('asset-bike-19', 'Ather 450X EV (WB-02-1019)', 'VEHICLE', 19, '2025-08-20', 145000.00, 15000.00, 48, 'SLM', 'ACTIVE', 'Primary EV fleet unit #19'),
  ('asset-bike-8', 'Royal Enfield Hunter 350 (WB-02-1008)', 'VEHICLE', 8, '2025-03-01', 185000.00, 22000.00, 48, 'SLM', 'ACTIVE', 'Cruiser fleet unit #8'),
  ('asset-bike-11', 'KTM Duke 390 (WB-02-1011)', 'VEHICLE', 11, '2025-04-12', 310000.00, 35000.00, 48, 'SLM', 'ACTIVE', 'Performance sports unit #11')
ON CONFLICT (id) DO NOTHING;
