export type TransactionType = 'credit' | 'debit';
export type PaymentMethod = 'cash' | 'bank';
export type FundingSource = 'revenue' | 'capital_investment' | 'debt_loan';

export interface LedgerEntry {
  id: string;
  tab_name: string;
  date: string;
  credit_cash: number;
  credit_cash_details?: string;
  credit_bank: number;
  credit_bank_details?: string;
  debit_cash: number;
  debit_cash_details?: string;
  debit_bank: number;
  debit_bank_details?: string;
  category: string;
  notes?: string;
  bill_url?: string | null;
  funding_source?: FundingSource;
  asset_id?: string | null;
  is_opening?: boolean;
  is_deleted?: boolean;
  delete_reason?: string;
  deleted_at?: string | null;
  deleted_by?: string | null;
  edit_history?: {
    edited_at: string;
    edited_by: string;
    reason: string;
    previous_values: any;
    new_values: any;
  }[];
  created_at?: string;
}

export interface FinanceDeletedLog {
  id: string;
  entry_id: string;
  tab_name: string;
  entry_date: string;
  category: string;
  amount: number;
  type: string;
  reason: string;
  deleted_by: string;
  deleted_at: string;
  entry_snapshot: LedgerEntry;
}

export interface MonthConfig {
  tab_name: string;
  month: string;
  year: number;
  opening_cash: number;
  opening_bank: number;
  is_initialized: boolean;
  created_at?: string;
  updated_at?: string;
}

export type DepreciationMethod = 'SLM' | 'WDV'; // Straight-Line or Written Down Value

export interface CapexAsset {
  id: string;
  name: string; // e.g. 'Hunter 350 (WB02-AB-1234)'
  category: 'VEHICLE' | 'GPS_IOT' | 'GARAGE_EQUIPMENT' | 'OFFICE_TECH';
  bike_id?: number | null; // Linked to fleet bike if applicable
  purchase_date: string;
  purchase_cost: number; // CapEx amount
  salvage_value: number; // Estimated residual/scrap value (default 10%)
  useful_life_months: number; // Typically 48 months (4 years) for two-wheelers
  depreciation_method: DepreciationMethod;
  annual_depreciation_rate?: number; // For WDV %
  status: 'ACTIVE' | 'SOLD' | 'SCRAPPED';
  notes?: string;
  invoice_url?: string | null;
}

export interface DepreciationCalculation {
  assetId: string;
  assetName: string;
  purchaseCost: number;
  salvageValue: number;
  monthlyDepreciation: number;
  accumulatedDepreciation: number;
  currentBookValue: number;
  monthsActive: number;
  remainingMonths: number;
  isFullyDepreciated: boolean;
}
