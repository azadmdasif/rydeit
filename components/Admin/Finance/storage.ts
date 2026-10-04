import { supabase } from '../../../supabase';
import { CapexAsset, LedgerEntry, FinanceDeletedLog, MonthConfig } from './types';
import { getFleetBikes } from '../../../fleetStorage';

const LOCAL_STORAGE_LEDGER_KEY = 'rydeit_finance_ledger_v1';
const LOCAL_STORAGE_ASSETS_KEY = 'rydeit_finance_capex_assets_v1';
const LOCAL_STORAGE_CATEGORIES_KEY = 'rydeit_finance_categories_v1';
const LOCAL_STORAGE_DELETED_LOGS_KEY = 'rydeit_finance_deleted_logs_v1';
const LOCAL_STORAGE_MONTH_CONFIGS_KEY = 'rydeit_finance_month_configs_v1';

export const DEFAULT_CREDIT_CATEGORIES = [
  'bike rental revenue',
  'delivery & pickup charges',
  'security deposit received',
  'late return fee',
  'helmet & accessory rental',
  'damage & repair recovery',
  'scrap & retired bike sale',
  'capital investment',
  'vehicle loan disbursement',
  'other revenue'
];

export const DEFAULT_DEBIT_CATEGORIES = [
  // CapEx
  'bike & scooter purchase',
  'gps tracker & iot hardware',
  'vehicle registration & rto taxes',
  'garage equipment & tools',
  // OpEx - Direct Fleet Running
  'scheduled servicing & engine oil',
  'tires & puncture repair',
  'spare parts & brake pads',
  'battery replacement & ev charging',
  'bodywork & washing detailing',
  'fuel & vehicle transport',
  // OpEx - Overheads & Fixed
  'garage & hub rent',
  'staff salaries & mechanic wages',
  'vehicle insurance renewals',
  'puc & commercial fitness renewal',
  'gps & software platform subscription',
  'marketing & local ads',
  'security deposit refund',
  'loan emi repayment',
  'hub utilities & electricity',
  'others'
];

// Seed initial fleet assets from BIKES constants if none exist
export function getInitialCapexAssets(): CapexAsset[] {
  const currentYear = new Date().getFullYear();
  return getFleetBikes().map((bike, idx) => {
    // Estimate standard market purchase costs for these vehicles
    let cost = 95000;
    if (bike.category === 'Royal Enfield') cost = 185000;
    else if (bike.category === 'Sports') cost = 165000;
    else if (bike.name.includes('Ather')) cost = 145000;
    else if (bike.category === 'Scooter') cost = 92000;

    const salvage = Math.round(cost * 0.12); // ~12% scrap/resale value
    const purchaseYear = currentYear - (idx % 2 === 0 ? 1 : 0);
    const purchaseMonth = ((idx * 2) % 12) + 1;
    const purchaseDate = `${purchaseYear}-${String(purchaseMonth).padStart(2, '0')}-15`;

    return {
      id: `asset-bike-${bike.id}`,
      name: `${bike.name} (WB-02-${1000 + bike.id})`,
      category: 'VEHICLE',
      bike_id: bike.id,
      purchase_date: purchaseDate,
      purchase_cost: cost,
      salvage_value: salvage,
      useful_life_months: 48, // 4 years
      depreciation_method: 'SLM',
      status: 'ACTIVE',
      notes: `Primary rental fleet unit #${bike.id} (${bike.category})`
    };
  });
}

export async function fetchCapexAssets(): Promise<CapexAsset[]> {
  try {
    const { data, error } = await supabase.from('finance_assets').select('*').order('purchase_date', { ascending: false });
    if (!error && data) {
      // If table exists and returned records (or empty array)
      if (data.length > 0) {
        localStorage.setItem(LOCAL_STORAGE_ASSETS_KEY, JSON.stringify(data));
        return data;
      }
    }
  } catch (err) {
    console.warn('Supabase finance_assets not available, using local storage cache:', err);
  }

  try {
    const saved = localStorage.getItem(LOCAL_STORAGE_ASSETS_KEY);
    if (saved) {
      return JSON.parse(saved);
    }
  } catch (e) {
    console.error('Failed to parse cached assets:', e);
  }

  const defaults = getInitialCapexAssets();
  saveCapexAssets(defaults);
  return defaults;
}

export async function saveCapexAssets(assets: CapexAsset[]): Promise<void> {
  try {
    localStorage.setItem(LOCAL_STORAGE_ASSETS_KEY, JSON.stringify(assets));
  } catch (e) {
    console.error('Failed to store assets locally:', e);
  }

  try {
    await supabase.from('finance_assets').upsert(assets);
  } catch (err) {
    console.warn('Supabase sync skipped for finance_assets:', err);
  }
}

export async function saveCapexAsset(asset: CapexAsset): Promise<CapexAsset> {
  try {
    const saved = localStorage.getItem(LOCAL_STORAGE_ASSETS_KEY);
    const all: CapexAsset[] = saved ? JSON.parse(saved) : [];
    const idx = all.findIndex(a => a.id === asset.id);
    if (idx >= 0) {
      all[idx] = asset;
    } else {
      all.unshift(asset);
    }
    localStorage.setItem(LOCAL_STORAGE_ASSETS_KEY, JSON.stringify(all));
  } catch (e) {
    console.error('Failed to store asset locally:', e);
  }

  try {
    const { error } = await supabase.from('finance_assets').upsert([asset]);
    if (error) {
      console.warn('Supabase finance_assets upsert warning:', error);
    }
  } catch (err) {
    console.warn('Supabase sync skipped for finance_assets:', err);
  }

  return asset;
}

export async function deleteCapexAsset(assetId: string): Promise<void> {
  try {
    const saved = localStorage.getItem(LOCAL_STORAGE_ASSETS_KEY);
    if (saved) {
      const all: CapexAsset[] = JSON.parse(saved);
      const filtered = all.filter(a => a.id !== assetId);
      localStorage.setItem(LOCAL_STORAGE_ASSETS_KEY, JSON.stringify(filtered));
    }
  } catch (e) {
    console.error('Failed to delete asset locally:', e);
  }

  try {
    const { error } = await supabase.from('finance_assets').delete().eq('id', assetId);
    if (error) {
      console.warn('Supabase finance_assets delete warning:', error);
    }
  } catch (err) {
    console.warn('Supabase delete skipped for finance_assets:', err);
  }
}

export async function fetchLedgerEntries(tabName?: string): Promise<LedgerEntry[]> {
  // Always fetch deleted logs to cross-reference voided transactions
  let deletedIds = new Set<string>();
  try {
    const deletedLogs = await fetchDeletedLogs();
    deletedIds = new Set(deletedLogs.map(l => l.entry_id));
  } catch (e) {
    console.warn('Could not fetch deleted logs during ledger fetch:', e);
  }

  // 1. Try Supabase
  try {
    let query = supabase.from('finance_ledger').select('*').order('date', { ascending: true });
    if (tabName) query = query.eq('tab_name', tabName);
    const { data, error } = await query;
    if (!error && data && data.length > 0) {
      const active = data.filter(e => !e.is_deleted && !deletedIds.has(e.id));
      return active;
    }
  } catch (err) {
    console.warn('Supabase finance_ledger unavailable, using local cache:', err);
  }

  // 2. Try localStorage
  try {
    const saved = localStorage.getItem(LOCAL_STORAGE_LEDGER_KEY);
    if (saved) {
      const all: LedgerEntry[] = JSON.parse(saved);
      // Clean up local cache if any voided entry is still active
      const cleaned = all.map(e => deletedIds.has(e.id) ? { ...e, is_deleted: true } : e);
      localStorage.setItem(LOCAL_STORAGE_LEDGER_KEY, JSON.stringify(cleaned));

      const active = cleaned.filter(e => !e.is_deleted && !deletedIds.has(e.id));
      if (tabName) return active.filter(e => e.tab_name === tabName);
      return active;
    }
  } catch (e) {
    console.error('Failed to parse cached ledger:', e);
  }

  return [];
}

export async function saveLedgerEntry(entry: Partial<LedgerEntry>): Promise<LedgerEntry> {
  const completeEntry: LedgerEntry = {
    id: entry.id || `tx-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    tab_name: entry.tab_name || 'General',
    date: entry.date || new Date().toISOString().split('T')[0],
    credit_cash: Number(entry.credit_cash) || 0,
    credit_cash_details: entry.credit_cash_details || '',
    credit_bank: Number(entry.credit_bank) || 0,
    credit_bank_details: entry.credit_bank_details || '',
    debit_cash: Number(entry.debit_cash) || 0,
    debit_cash_details: entry.debit_cash_details || '',
    debit_bank: Number(entry.debit_bank) || 0,
    debit_bank_details: entry.debit_bank_details || '',
    category: entry.category || 'others',
    notes: entry.notes || '',
    bill_url: entry.bill_url || null,
    funding_source: entry.funding_source || 'revenue',
    asset_id: entry.asset_id || null,
    is_opening: entry.is_opening || false,
    is_deleted: false,
    created_at: entry.created_at || new Date().toISOString()
  };

  try {
    const saved = localStorage.getItem(LOCAL_STORAGE_LEDGER_KEY);
    const all: LedgerEntry[] = saved ? JSON.parse(saved) : [];
    const idx = all.findIndex(e => e.id === completeEntry.id);
    if (idx >= 0) {
      all[idx] = { ...all[idx], ...completeEntry };
    } else {
      all.push(completeEntry);
    }
    localStorage.setItem(LOCAL_STORAGE_LEDGER_KEY, JSON.stringify(all));
  } catch (e) {
    console.error('Failed to update local ledger cache:', e);
  }

  try {
    await supabase.from('finance_ledger').upsert(completeEntry);
  } catch (err) {
    console.warn('Supabase sync skipped for ledger entry:', err);
  }

  return completeEntry;
}

export async function softDeleteLedgerEntry(id: string, reason: string, userEmail?: string): Promise<FinanceDeletedLog | null> {
  let targetEntry: LedgerEntry | null = null;
  const now = new Date().toISOString();
  const deletedBy = userEmail || 'Admin';

  try {
    const saved = localStorage.getItem(LOCAL_STORAGE_LEDGER_KEY);
    if (saved) {
      const all: LedgerEntry[] = JSON.parse(saved);
      const updated = all.map(e => {
        if (e.id === id) {
          targetEntry = e;
          return {
            ...e,
            is_deleted: true,
            delete_reason: reason,
            deleted_at: now,
            deleted_by: deletedBy
          };
        }
        return e;
      });
      localStorage.setItem(LOCAL_STORAGE_LEDGER_KEY, JSON.stringify(updated));
    }
  } catch (e) {
    console.error('Local delete failed:', e);
  }

  // Fallback to fetch from Supabase if not found locally
  if (!targetEntry) {
    try {
      const { data } = await supabase.from('finance_ledger').select('*').eq('id', id).single();
      if (data) targetEntry = data;
    } catch (e) {
      console.warn('Could not fetch entry for snapshot:', e);
    }
  }

  const amount = targetEntry 
    ? (targetEntry.credit_cash || 0) + (targetEntry.credit_bank || 0) + (targetEntry.debit_cash || 0) + (targetEntry.debit_bank || 0)
    : 0;

  let txType = 'Debit';
  if (targetEntry) {
    if (targetEntry.credit_cash > 0) txType = 'Credit Cash';
    else if (targetEntry.credit_bank > 0) txType = 'Credit Bank';
    else if (targetEntry.debit_cash > 0) txType = 'Debit Cash';
    else if (targetEntry.debit_bank > 0) txType = 'Debit Bank';
  }

  const logRecord: FinanceDeletedLog = {
    id: `del-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    entry_id: id,
    tab_name: targetEntry?.tab_name || 'General',
    entry_date: targetEntry?.date || now.split('T')[0],
    category: targetEntry?.category || 'others',
    amount,
    type: txType,
    reason,
    deleted_by: deletedBy,
    deleted_at: now,
    entry_snapshot: targetEntry || ({} as LedgerEntry)
  };

  // 1. Save to local deleted logs cache
  try {
    const savedLogs = localStorage.getItem(LOCAL_STORAGE_DELETED_LOGS_KEY);
    const logsList: FinanceDeletedLog[] = savedLogs ? JSON.parse(savedLogs) : [];
    logsList.unshift(logRecord);
    localStorage.setItem(LOCAL_STORAGE_DELETED_LOGS_KEY, JSON.stringify(logsList));
  } catch (e) {
    console.error('Failed to save deleted log locally:', e);
  }

  // 2. Update finance_ledger in Supabase
  try {
    const { error: updErr } = await supabase.from('finance_ledger').update({
      is_deleted: true,
      delete_reason: reason,
      deleted_at: now,
      deleted_by: deletedBy
    }).eq('id', id);

    if (updErr) {
      console.warn('Full update with deleted_by failed, trying fallback without deleted_by:', updErr);
      await supabase.from('finance_ledger').update({
        is_deleted: true,
        delete_reason: reason,
        deleted_at: now
      }).eq('id', id);
    }
  } catch (err) {
    console.warn('Supabase finance_ledger delete skipped:', err);
  }

  // 3. Insert audit log into finance_deleted_logs in Supabase
  try {
    await supabase.from('finance_deleted_logs').insert([logRecord]);
  } catch (err) {
    console.warn('Supabase finance_deleted_logs insert skipped:', err);
  }

  return logRecord;
}

export async function fetchDeletedLogs(): Promise<FinanceDeletedLog[]> {
  // Try Supabase first
  try {
    const { data, error } = await supabase
      .from('finance_deleted_logs')
      .select('*')
      .order('deleted_at', { ascending: false });
    if (!error && data && data.length > 0) {
      return data;
    }
  } catch (err) {
    console.warn('Supabase finance_deleted_logs unavailable, using local cache:', err);
  }

  // Fallback to localStorage
  try {
    const saved = localStorage.getItem(LOCAL_STORAGE_DELETED_LOGS_KEY);
    if (saved) {
      return JSON.parse(saved);
    }
  } catch (e) {
    console.error('Failed to parse deleted logs cache:', e);
  }

  return [];
}

export async function restoreLedgerEntry(entryId: string): Promise<void> {
  // Update local storage
  try {
    const saved = localStorage.getItem(LOCAL_STORAGE_LEDGER_KEY);
    if (saved) {
      const all: LedgerEntry[] = JSON.parse(saved);
      const updated = all.map(e => e.id === entryId ? {
        ...e,
        is_deleted: false,
        delete_reason: undefined,
        deleted_at: null,
        deleted_by: null
      } : e);
      localStorage.setItem(LOCAL_STORAGE_LEDGER_KEY, JSON.stringify(updated));
    }

    const savedLogs = localStorage.getItem(LOCAL_STORAGE_DELETED_LOGS_KEY);
    if (savedLogs) {
      const logsList: FinanceDeletedLog[] = JSON.parse(savedLogs);
      const updatedLogs = logsList.filter(l => l.entry_id !== entryId);
      localStorage.setItem(LOCAL_STORAGE_DELETED_LOGS_KEY, JSON.stringify(updatedLogs));
    }
  } catch (e) {
    console.error('Local restore failed:', e);
  }

  // Update Supabase
  try {
    await supabase.from('finance_ledger').update({
      is_deleted: false,
      delete_reason: null,
      deleted_at: null,
      deleted_by: null
    }).eq('id', entryId);

    await supabase.from('finance_deleted_logs').delete().eq('entry_id', entryId);
  } catch (err) {
    console.warn('Supabase restore skipped:', err);
  }
}

export async function fetchMonthConfig(tabName: string): Promise<MonthConfig | null> {
  // 1. Try Supabase
  try {
    const { data, error } = await supabase
      .from('finance_months')
      .select('*')
      .eq('tab_name', tabName)
      .maybeSingle();

    if (!error && data) {
      return {
        tab_name: data.tab_name,
        month: data.month,
        year: data.year,
        opening_cash: Number(data.opening_cash) || 0,
        opening_bank: Number(data.opening_bank) || 0,
        is_initialized: data.is_initialized ?? true,
        created_at: data.created_at,
        updated_at: data.updated_at
      };
    }
  } catch (err) {
    console.warn('Supabase finance_months read failed:', err);
  }

  // 2. Try localStorage
  try {
    const saved = localStorage.getItem(LOCAL_STORAGE_MONTH_CONFIGS_KEY);
    if (saved) {
      const all: MonthConfig[] = JSON.parse(saved);
      const found = all.find(c => c.tab_name === tabName);
      if (found) return found;
    }
  } catch (e) {
    console.error('Failed to read local month configs:', e);
  }

  // 3. Default seed for September 2026 if nothing exists yet
  if (tabName === 'September 2026') {
    const defaultConfig: MonthConfig = {
      tab_name: 'September 2026',
      month: 'September',
      year: 2026,
      opening_cash: 26895,
      opening_bank: 27240,
      is_initialized: true
    };
    await saveMonthConfig(defaultConfig);
    return defaultConfig;
  }

  return null;
}

export async function saveMonthConfig(config: MonthConfig): Promise<MonthConfig> {
  const updatedConfig: MonthConfig = {
    ...config,
    updated_at: new Date().toISOString()
  };

  // 1. Save to localStorage
  try {
    const saved = localStorage.getItem(LOCAL_STORAGE_MONTH_CONFIGS_KEY);
    const all: MonthConfig[] = saved ? JSON.parse(saved) : [];
    const idx = all.findIndex(c => c.tab_name === config.tab_name);
    if (idx >= 0) {
      all[idx] = updatedConfig;
    } else {
      all.push(updatedConfig);
    }
    localStorage.setItem(LOCAL_STORAGE_MONTH_CONFIGS_KEY, JSON.stringify(all));
  } catch (e) {
    console.error('Failed to save month config locally:', e);
  }

  // 2. Save to Supabase finance_months
  try {
    await supabase.from('finance_months').upsert([updatedConfig]);
  } catch (err) {
    console.warn('Supabase finance_months upsert failed:', err);
  }

  // 3. Ensure Opening Balance entry exists in finance_ledger
  const openingEntryId = `opening-${config.tab_name.replace(/\s+/g, '-').toLowerCase()}`;
  const openingEntry: Partial<LedgerEntry> = {
    id: openingEntryId,
    tab_name: config.tab_name,
    date: `${config.year}-${String(
      ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'].indexOf(config.month) + 1
    ).padStart(2, '0')}-01`,
    credit_cash: 0,
    credit_cash_details: 'Opening Balance',
    credit_bank: 0,
    credit_bank_details: 'Opening Balance',
    debit_cash: 0,
    debit_cash_details: '',
    debit_bank: 0,
    debit_bank_details: '',
    category: 'opening balance',
    notes: `Opening cash: ₹${config.opening_cash}, bank: ₹${config.opening_bank}`,
    is_opening: true,
    is_deleted: false
  };

  try {
    await saveLedgerEntry(openingEntry);
  } catch (e) {
    console.warn('Opening entry ledger sync skipped:', e);
  }

  return updatedConfig;
}

export async function initializeMonth(
  tabName: string,
  month: string,
  year: number,
  openingCash: number,
  openingBank: number
): Promise<MonthConfig> {
  const config: MonthConfig = {
    tab_name: tabName,
    month,
    year,
    opening_cash: openingCash,
    opening_bank: openingBank,
    is_initialized: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  return await saveMonthConfig(config);
}
