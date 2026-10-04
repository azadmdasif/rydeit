import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../../../supabase';
import { 
  CapexAsset, 
  LedgerEntry, 
  TransactionType, 
  PaymentMethod, 
  FundingSource,
  FinanceDeletedLog,
  MonthConfig
} from './types';
import { 
  DEFAULT_CREDIT_CATEGORIES, 
  DEFAULT_DEBIT_CATEGORIES, 
  fetchCapexAssets, 
  fetchLedgerEntries, 
  saveCapexAssets, 
  saveCapexAsset,
  deleteCapexAsset,
  saveLedgerEntry, 
  softDeleteLedgerEntry,
  fetchDeletedLogs,
  restoreLedgerEntry,
  fetchMonthConfig,
  saveMonthConfig,
  initializeMonth
} from './storage';
import { CapexAssetRegister } from './CapexAssetRegister';
import { PnLStatement } from './PnLStatement';
import { 
  FileSpreadsheet, 
  TrendingUp, 
  PieChart as PieChartIcon, 
  Calendar, 
  Download, 
  Plus, 
  RefreshCw, 
  History, 
  Trash2, 
  Pencil, 
  Upload, 
  Link as LinkIcon, 
  ExternalLink, 
  Sparkles,
  Bike as BikeIcon,
  Tag,
  Search,
  Filter,
  ArrowRight
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip as RechartsTooltip, 
  PieChart, 
  Pie, 
  Cell 
} from 'recharts';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export interface FinanceLedgerProps {
  currentSubView?: 'sheet' | 'capex' | 'pnl' | 'analytics';
  onSubViewChange?: (view: 'sheet' | 'capex' | 'pnl' | 'analytics') => void;
}

export const FinanceLedger: React.FC<FinanceLedgerProps> = ({
  currentSubView,
  onSubViewChange
}) => {
  const [internalView, setInternalView] = useState<'sheet' | 'capex' | 'pnl' | 'analytics'>('sheet');
  const activeView = currentSubView || internalView;
  const setActiveView = (v: 'sheet' | 'capex' | 'pnl' | 'analytics') => {
    setInternalView(v);
    if (onSubViewChange) onSubViewChange(v);
  };
  const [loading, setLoading] = useState(true);

  // Month & Interval State
  const currentYear = new Date().getFullYear();
  const [selectedMonth, setSelectedMonth] = useState(MONTHS[new Date().getMonth()]);
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [dateInterval, setDateInterval] = useState<'month' | 'today' | 'this_week' | 'this_month' | 'custom'>('month');
  const [customStart, setCustomStart] = useState(`${currentYear}-${String(new Date().getMonth() + 1).padStart(2, '0')}-01`);
  const [customEnd, setCustomEnd] = useState(new Date().toISOString().split('T')[0]);

  // Data State
  const [entries, setEntries] = useState<LedgerEntry[]>([]);
  const [assets, setAssets] = useState<CapexAsset[]>([]);
  const [openingCash, setOpeningCash] = useState(26895);
  const [openingBank, setOpeningBank] = useState(27240);
  const [monthConfig, setMonthConfig] = useState<MonthConfig | null>(null);

  // Edit Opening Balance & Init Month States
  const [showEditOpeningModal, setShowEditOpeningModal] = useState(false);
  const [showInitMonthModal, setShowInitMonthModal] = useState(false);
  const [editOpeningCashInput, setEditOpeningCashInput] = useState<number>(26895);
  const [editOpeningBankInput, setEditOpeningBankInput] = useState<number>(27240);
  const [isSavingOpening, setIsSavingOpening] = useState(false);

  // Transaction Input Form State
  const [txType, setTxType] = useState<TransactionType>('credit');
  const [txMethod, setTxMethod] = useState<PaymentMethod>('bank');
  const [txCategory, setTxCategory] = useState(DEFAULT_CREDIT_CATEGORIES[0]);
  const [txAmount, setTxAmount] = useState<number>(0);
  const [txDate, setTxDate] = useState(new Date().toISOString().split('T')[0]);
  const [txFundingSource, setTxFundingSource] = useState<FundingSource>('revenue');
  const [txNotes, setTxNotes] = useState('');
  const [txBillFile, setTxBillFile] = useState<File | null>(null);
  const [isSubmittingTx, setIsSubmittingTx] = useState(false);

  // Edit / Audit State
  const [editingEntry, setEditingEntry] = useState<LedgerEntry | null>(null);
  const [editReason, setEditReason] = useState('');
  const [activeAuditEntry, setActiveAuditEntry] = useState<LedgerEntry | null>(null);
  const [deleteModalEntry, setDeleteModalEntry] = useState<LedgerEntry | null>(null);
  const [deleteReasonInput, setDeleteReasonInput] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeletedLogsModal, setShowDeletedLogsModal] = useState(false);
  const [deletedLogs, setDeletedLogs] = useState<FinanceDeletedLog[]>([]);
  const [userEmail, setUserEmail] = useState<string>('admin@rydeit.in');

  // Analytics Pie Focus
  const [pieFocus, setPieFocus] = useState<'debit' | 'credit'>('debit');

  const activeTabName = `${selectedMonth} ${selectedYear}`;

  useEffect(() => {
    loadData();
  }, [selectedMonth, selectedYear]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [loadedEntries, loadedAssets, logs, cfg, { data: authData }] = await Promise.all([
        fetchLedgerEntries(activeTabName),
        fetchCapexAssets(),
        fetchDeletedLogs(),
        fetchMonthConfig(activeTabName),
        supabase.auth.getUser()
      ]);
      setEntries(loadedEntries);
      setAssets(loadedAssets);
      setDeletedLogs(logs);

      if (cfg) {
        setMonthConfig(cfg);
        setOpeningCash(cfg.opening_cash);
        setOpeningBank(cfg.opening_bank);
      } else {
        setMonthConfig({
          tab_name: activeTabName,
          month: selectedMonth,
          year: selectedYear,
          opening_cash: 0,
          opening_bank: 0,
          is_initialized: false
        });
      }

      if (authData?.user?.email) {
        setUserEmail(authData.user.email);
      }
    } catch (e) {
      console.error('Error loading finance data:', e);
    } finally {
      setLoading(false);
    }
  };

  // Compute active date range
  const getDateRange = (): { start: string; end: string } => {
    const now = new Date();
    const toYMD = (d: Date) => d.toISOString().split('T')[0];

    if (dateInterval === 'today') {
      const today = toYMD(now);
      return { start: today, end: today };
    }
    if (dateInterval === 'this_week') {
      const day = now.getDay();
      const diff = now.getDate() - day + (day === 0 ? -6 : 1);
      const monday = new Date(now.setDate(diff));
      const sunday = new Date(monday);
      sunday.setDate(monday.getDate() + 6);
      return { start: toYMD(monday), end: toYMD(sunday) };
    }
    if (dateInterval === 'this_month') {
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      return { start: toYMD(start), end: toYMD(end) };
    }
    if (dateInterval === 'custom') {
      return { start: customStart, end: customEnd };
    }
    // Full selected month
    const mIdx = MONTHS.indexOf(selectedMonth);
    const start = new Date(selectedYear, mIdx, 1);
    const end = new Date(selectedYear, mIdx + 1, 0);
    return { start: toYMD(start), end: toYMD(end) };
  };

  // Set of deleted entry IDs for instantaneous, bulletproof exclusion
  const deletedEntryIds = useMemo(() => {
    return new Set(deletedLogs.map(l => l.entry_id));
  }, [deletedLogs]);

  // Filtered entries according to active range, soft-delete flag, and audit log IDs
  const dateRange = getDateRange();
  const filteredEntries = useMemo(() => {
    return entries.filter(e => 
      e.date >= dateRange.start && 
      e.date <= dateRange.end && 
      !e.is_deleted && 
      !deletedEntryIds.has(e.id)
    );
  }, [entries, dateRange, deletedEntryIds]);

  // Compute running balances
  const sheetRows = useMemo(() => {
    let currentCash = openingCash;
    let currentBank = openingBank;

    return filteredEntries.map(entry => {
      const crCash = entry.credit_cash || 0;
      const crBank = entry.credit_bank || 0;
      const dbCash = entry.debit_cash || 0;
      const dbBank = entry.debit_bank || 0;

      currentCash = currentCash + crCash - dbCash;
      currentBank = currentBank + crBank - dbBank;

      return {
        entry,
        runningCash: currentCash,
        runningBank: currentBank,
        runningTotal: currentCash + currentBank
      };
    });
  }, [filteredEntries, openingCash, openingBank]);

  // Calculate month aggregate figures matching Balancing Dashboard
  const monthStats = useMemo(() => {
    const monthEntries = entries.filter(e => 
      e.tab_name === activeTabName && 
      !e.is_deleted && 
      !e.is_opening && 
      !deletedEntryIds.has(e.id)
    );
    const totalCredits = monthEntries.reduce((sum, e) => sum + (e.credit_cash || 0) + (e.credit_bank || 0), 0);
    const totalDebits = monthEntries.reduce((sum, e) => sum + (e.debit_cash || 0) + (e.debit_bank || 0), 0);
    
    const netCash = monthEntries.reduce((sum, e) => sum + (e.credit_cash || 0) - (e.debit_cash || 0), 0);
    const netBank = monthEntries.reduce((sum, e) => sum + (e.credit_bank || 0) - (e.debit_bank || 0), 0);

    const endingCash = openingCash + netCash;
    const endingBank = openingBank + netBank;
    const endingTotal = endingCash + endingBank;

    return {
      totalCredits,
      totalDebits,
      endingCash,
      endingBank,
      endingTotal
    };
  }, [entries, activeTabName, openingCash, openingBank]);

  // Save updated opening balance for current month
  const handleSaveOpeningBalance = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingOpening(true);
    try {
      const updatedConfig: MonthConfig = {
        tab_name: activeTabName,
        month: selectedMonth,
        year: selectedYear,
        opening_cash: Number(editOpeningCashInput) || 0,
        opening_bank: Number(editOpeningBankInput) || 0,
        is_initialized: true
      };

      await saveMonthConfig(updatedConfig);
      setMonthConfig(updatedConfig);
      setOpeningCash(updatedConfig.opening_cash);
      setOpeningBank(updatedConfig.opening_bank);
      setShowEditOpeningModal(false);

      // Reload entries so the opening balance row is refreshed
      const reloaded = await fetchLedgerEntries(activeTabName);
      setEntries(reloaded);
      alert(`Opening balance for ${activeTabName} updated successfully!`);
    } catch (err: any) {
      alert(`Failed to save opening balance: ${err.message || 'Unknown error'}`);
    } finally {
      setIsSavingOpening(false);
    }
  };

  // Initialize a new month tab
  const handleInitializeMonth = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingOpening(true);
    try {
      const cfg = await initializeMonth(
        activeTabName,
        selectedMonth,
        selectedYear,
        Number(editOpeningCashInput) || 0,
        Number(editOpeningBankInput) || 0
      );
      setMonthConfig(cfg);
      setOpeningCash(cfg.opening_cash);
      setOpeningBank(cfg.opening_bank);
      setShowInitMonthModal(false);

      const reloaded = await fetchLedgerEntries(activeTabName);
      setEntries(reloaded);
      alert(`Month ${activeTabName} successfully initialized!`);
    } catch (err: any) {
      alert(`Failed to initialize month: ${err.message || 'Unknown error'}`);
    } finally {
      setIsSavingOpening(false);
    }
  };

  // Add standard transaction
  const handleAddTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (txAmount <= 0) return;

    setIsSubmittingTx(true);
    try {
      let billUrl = null;
      if (txBillFile) {
        const fileExt = txBillFile.name.split('.').pop();
        const fileName = `${Date.now()}_receipt.${fileExt}`;
        const filePath = `receipts/${fileName}`;
        const { error: upErr } = await supabase.storage.from('receipts').upload(filePath, txBillFile);
        if (!upErr) {
          const { data: urlData } = supabase.storage.from('receipts').getPublicUrl(filePath);
          billUrl = urlData?.publicUrl;
        }
      }

      const entryDetails = txNotes ? `${txCategory}: ${txNotes}` : txCategory;
      const newEntry: Partial<LedgerEntry> = {
        tab_name: activeTabName,
        date: txDate,
        credit_cash: txType === 'credit' && txMethod === 'cash' ? txAmount : 0,
        credit_cash_details: txType === 'credit' && txMethod === 'cash' ? entryDetails : '',
        credit_bank: txType === 'credit' && txMethod === 'bank' ? txAmount : 0,
        credit_bank_details: txType === 'credit' && txMethod === 'bank' ? entryDetails : '',
        debit_cash: txType === 'debit' && txMethod === 'cash' ? txAmount : 0,
        debit_cash_details: txType === 'debit' && txMethod === 'cash' ? entryDetails : '',
        debit_bank: txType === 'debit' && txMethod === 'bank' ? txAmount : 0,
        debit_bank_details: txType === 'debit' && txMethod === 'bank' ? entryDetails : '',
        category: txCategory,
        notes: txNotes,
        bill_url: billUrl,
        funding_source: txFundingSource
      };

      const saved = await saveLedgerEntry(newEntry);
      setEntries(prev => [...prev, saved]);
      // Reset form
      setTxAmount(0);
      setTxNotes('');
      setTxBillFile(null);
    } catch (err: any) {
      alert(`Error recording transaction: ${err.message || 'Unknown'}`);
    } finally {
      setIsSubmittingTx(false);
    }
  };

  // Add CapEx Asset and sync to ledger
  const handleAddCapexAsset = async (asset: CapexAsset, alsoLogToLedger: boolean, funding: FundingSource) => {
    const updated = [asset, ...assets];
    setAssets(updated);
    await saveCapexAssets(updated);

    if (alsoLogToLedger) {
      const entry: Partial<LedgerEntry> = {
        tab_name: activeTabName,
        date: asset.purchase_date,
        debit_bank: asset.purchase_cost,
        debit_bank_details: `CapEx: ${asset.name} Purchase`,
        category: 'bike & scooter purchase',
        notes: `Capital expenditure for ${asset.name}. Salvage value: ₹${asset.salvage_value}`,
        funding_source: funding,
        asset_id: asset.id
      };
      const saved = await saveLedgerEntry(entry);
      setEntries(prev => [...prev, saved]);
    }
  };

  const handleUpdateCapexAsset = async (updatedAsset: CapexAsset) => {
    const updated = assets.map(a => a.id === updatedAsset.id ? updatedAsset : a);
    setAssets(updated);
    await saveCapexAsset(updatedAsset);
  };

  const handleDeleteCapexAsset = async (assetId: string) => {
    const updated = assets.filter(a => a.id !== assetId);
    setAssets(updated);
    await deleteCapexAsset(assetId);
  };

  const openDeleteModal = (entry: LedgerEntry) => {
    setDeleteModalEntry(entry);
    setDeleteReasonInput('');
  };

  const handleConfirmDelete = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!deleteModalEntry || !deleteReasonInput.trim()) return;

    setIsDeleting(true);
    try {
      const log = await softDeleteLedgerEntry(deleteModalEntry.id, deleteReasonInput.trim(), userEmail);
      setEntries(prev => prev.filter(e => e.id !== deleteModalEntry.id));
      if (log) {
        setDeletedLogs(prev => [log, ...prev]);
      }
      setDeleteModalEntry(null);
      setDeleteReasonInput('');
      alert('Entry voided and archived into Supabase audit logs!');
    } catch (err: any) {
      alert(`Failed to delete entry: ${err.message || 'Unknown error'}`);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleRestore = async (entryId: string) => {
    try {
      await restoreLedgerEntry(entryId);
      const [reloaded, logs] = await Promise.all([
        fetchLedgerEntries(activeTabName),
        fetchDeletedLogs()
      ]);
      setEntries(reloaded);
      setDeletedLogs(logs);
      alert('Entry restored successfully to the active ledger!');
    } catch (err: any) {
      alert(`Failed to restore entry: ${err.message || 'Unknown error'}`);
    }
  };

  // Export Sheet to CSV
  const exportSheetCSV = () => {
    const rows = [
      ['Date', 'Credit Cash', 'Cash Details', 'Credit Bank', 'Bank Details', 'Debit Cash', 'Debit Details', 'Debit Bank', 'Debit Details', 'Total Cash', 'Total Bank', 'Total Combined'],
      ...sheetRows.map(r => [
        r.entry.date,
        r.entry.credit_cash || '',
        r.entry.credit_cash_details || '',
        r.entry.credit_bank || '',
        r.entry.credit_bank_details || '',
        r.entry.debit_cash || '',
        r.entry.debit_cash_details || '',
        r.entry.debit_bank || '',
        r.entry.debit_bank_details || '',
        r.runningCash,
        r.runningBank,
        r.runningTotal
      ])
    ];

    const csvContent = 'data:text/csv;charset=utf-8,' + rows.map(r => r.map(c => `"${c}"`).join(',')).join('\n');
    const encoded = encodeURI(csvContent);
    const link = document.createElement('a');
    link.href = encoded;
    link.download = `Rydeit_Ledger_${activeTabName}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Analytics breakdowns
  const categoryBreakdown = useMemo(() => {
    const map: Record<string, number> = {};
    filteredEntries.forEach(e => {
      const cr = (e.credit_cash || 0) + (e.credit_bank || 0);
      const db = (e.debit_cash || 0) + (e.debit_bank || 0);
      if (pieFocus === 'debit' && db > 0) {
        map[e.category] = (map[e.category] || 0) + db;
      } else if (pieFocus === 'credit' && cr > 0) {
        map[e.category] = (map[e.category] || 0) + cr;
      }
    });

    const total = Object.values(map).reduce((a, b) => a + b, 0);
    return Object.entries(map).map(([name, value]) => ({
      name: name.toUpperCase(),
      value,
      percentage: total > 0 ? (value / total) * 100 : 0
    })).sort((a, b) => b.value - a.value);
  }, [filteredEntries, pieFocus]);

  const COLORS = ['#FF5F1F', '#00C2C7', '#FFC700', '#A855F7', '#3B82F6', '#10B981', '#EC4899', '#64748B'];

  return (
    <div className="space-y-8 animate-fade-in max-w-7xl mx-auto text-white">
      {/* Top Banner and Navigation */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 bg-brand-gray-dark/80 p-6 rounded-3xl border border-white/5">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-brand-orange/20 text-brand-orange flex items-center justify-center font-heading text-lg">
              ₹
            </div>
            <div>
              <h2 className="font-heading text-2xl text-white uppercase tracking-tighter">
                Rydeit Financial Ledger & Accounting
              </h2>
              <p className="text-[10px] font-black text-brand-teal uppercase tracking-[0.3em] mt-0.5">
                Admin Exclusive • CapEx, D&A & Unit Economics Engine
              </p>
            </div>
          </div>
        </div>

        {/* View Switcher Tabs */}
        <div className="flex bg-black/40 p-1 rounded-2xl border border-white/5 w-full sm:w-auto">
          {[
            { id: 'sheet', label: 'Ledger Book', icon: <FileSpreadsheet className="w-3.5 h-3.5" /> },
            { id: 'capex', label: 'CapEx & Assets', icon: <BikeIcon className="w-3.5 h-3.5" /> },
            { id: 'pnl', label: 'P&L Statement', icon: <TrendingUp className="w-3.5 h-3.5" /> },
            { id: 'analytics', label: 'Analytics', icon: <PieChartIcon className="w-3.5 h-3.5" /> }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveView(tab.id as any)}
              className={`flex-1 sm:flex-initial px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                activeView === tab.id
                  ? 'bg-brand-orange text-white shadow-lg shadow-brand-orange/20'
                  : 'text-white/40 hover:text-white'
              }`}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Date Interval & Control Bar */}
      <div className="bg-brand-gray-dark/50 p-4 rounded-3xl border border-white/5 flex flex-wrap justify-between items-center gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[9px] font-black uppercase text-white/40 tracking-widest mr-1">Period:</span>
          {(['month', 'today', 'this_week', 'this_month', 'custom'] as const).map(p => (
            <button
              key={p}
              onClick={() => setDateInterval(p)}
              className={`px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                dateInterval === p
                  ? 'bg-white/10 text-brand-teal border border-brand-teal/30'
                  : 'bg-black/30 text-white/40 hover:text-white'
              }`}
            >
              {p.replace('_', ' ')}
            </button>
          ))}

          {dateInterval === 'month' && (
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="bg-black/40 border border-white/10 text-white rounded-xl px-3 py-1.5 text-xs font-bold outline-none"
            >
              {MONTHS.map(m => (
                <option key={m} value={m}>{m} {selectedYear}</option>
              ))}
            </select>
          )}

          {dateInterval === 'custom' && (
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={customStart}
                onChange={e => setCustomStart(e.target.value)}
                className="bg-black/40 border border-white/10 text-white rounded-xl px-2 py-1 text-xs"
              />
              <span className="text-white/40 text-xs font-bold">to</span>
              <input
                type="date"
                value={customEnd}
                onChange={e => setCustomEnd(e.target.value)}
                className="bg-black/40 border border-white/10 text-white rounded-xl px-2 py-1 text-xs"
              />
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[9px] font-mono text-white/50 bg-black/30 px-3 py-1.5 rounded-xl border border-white/5">
            Active: <b>{dateRange.start}</b> to <b>{dateRange.end}</b> ({filteredEntries.length} entries)
          </span>
        </div>
      </div>

      {/* VIEW 1: Tabular Ledger Sheet */}
      {activeView === 'sheet' && monthConfig && !monthConfig.is_initialized && (
        <div className="flex items-center justify-center py-20 px-4 animate-fade-in">
          <div className="bg-brand-gray-dark border border-white/10 rounded-3xl max-w-lg w-full p-10 text-center space-y-6 shadow-2xl">
            <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-brand-orange mx-auto flex items-center justify-center">
              <Calendar className="w-8 h-8" />
            </div>

            <div className="space-y-2">
              <h3 className="font-heading text-xl text-white tracking-wide uppercase">
                Month Not Initialized
              </h3>
              <p className="text-white/60 text-xs leading-relaxed max-w-sm mx-auto">
                There is currently no spreadsheet sheet tab configured for <b className="text-white">{selectedMonth} {selectedYear}</b>. Create the tab with automated balances to begin ledger logging.
              </p>
            </div>

            <button
              onClick={() => {
                setEditOpeningCashInput(monthStats.endingCash > 0 ? monthStats.endingCash : 25000);
                setEditOpeningBankInput(monthStats.endingBank > 0 ? monthStats.endingBank : 100000);
                setShowInitMonthModal(true);
              }}
              className="w-full py-4 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-heading text-sm uppercase tracking-wider shadow-xl shadow-emerald-600/30 flex items-center justify-center gap-2 cursor-pointer transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>Initialize Month: {selectedMonth} {selectedYear}</span>
            </button>
          </div>
        </div>
      )}

      {activeView === 'sheet' && (!monthConfig || monthConfig.is_initialized) && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start animate-fade-in">
          {/* Left Column: Form & Summary */}
          <div className="space-y-6">
            {/* Balancing Dashboard Card */}
            <div className="bg-brand-gray-dark/60 p-6 rounded-3xl border border-white/5 space-y-4">
              <div className="flex justify-between items-center pb-2 border-b border-white/5">
                <span className="text-[10px] font-black uppercase text-white/50 tracking-widest">
                  Balancing Dashboard
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setEditOpeningCashInput(openingCash);
                    setEditOpeningBankInput(openingBank);
                    setShowEditOpeningModal(true);
                  }}
                  className="text-[10px] font-black uppercase tracking-wider text-emerald-400 hover:text-emerald-300 transition-colors cursor-pointer"
                >
                  Edit Opening
                </button>
              </div>

              {/* Opening Balances */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3.5 rounded-2xl bg-black/40 border border-white/5">
                  <span className="text-[8px] font-black uppercase text-white/40 block tracking-wider">
                    Opening Cash
                  </span>
                  <span className="text-xl font-heading text-white font-bold mt-1 block">
                    ₹{openingCash.toLocaleString('en-IN')}
                  </span>
                </div>
                <div className="p-3.5 rounded-2xl bg-black/40 border border-white/5">
                  <span className="text-[8px] font-black uppercase text-white/40 block tracking-wider">
                    Opening Bank
                  </span>
                  <span className="text-xl font-heading text-brand-teal font-bold mt-1 block">
                    ₹{openingBank.toLocaleString('en-IN')}
                  </span>
                </div>
              </div>

              {/* Month Total Credits & Debits */}
              <div className="space-y-1.5 pt-1 text-xs font-mono">
                <div className="flex items-center justify-between text-white/70">
                  <span className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                    <span className="font-sans text-xs">Total Credits (Month)</span>
                  </span>
                  <span className="text-emerald-400 font-bold">
                    +₹{monthStats.totalCredits.toLocaleString('en-IN')}
                  </span>
                </div>
                <div className="flex items-center justify-between text-white/70">
                  <span className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-400"></span>
                    <span className="font-sans text-xs">Total Debits (Month)</span>
                  </span>
                  <span className="text-red-400 font-bold">
                    -₹{monthStats.totalDebits.toLocaleString('en-IN')}
                  </span>
                </div>
              </div>

              {/* Ending Ledger Bal Box */}
              <div className="p-4 rounded-2xl bg-[#362423] border border-red-500/20 flex justify-between items-center">
                <div>
                  <span className="text-[8px] font-black uppercase text-brand-orange tracking-widest block">
                    Ending Ledger Bal
                  </span>
                  <span className="text-2xl font-heading text-white font-bold mt-0.5 block">
                    ₹{monthStats.endingTotal.toLocaleString('en-IN')}
                  </span>
                </div>
                <div className="text-right text-[10px] font-mono space-y-0.5 text-white/70">
                  <p>Cash: <b className="text-white">₹{monthStats.endingCash.toLocaleString('en-IN')}</b></p>
                  <p>Bank: <b className="text-brand-teal">₹{monthStats.endingBank.toLocaleString('en-IN')}</b></p>
                </div>
              </div>
            </div>

            {/* Add Transaction Form */}
            <div className="bg-brand-gray-dark/60 p-6 rounded-3xl border border-white/5 space-y-5">
              <h3 className="font-heading text-sm text-white uppercase tracking-wider pb-3 border-b border-white/5">
                Log Ledger Entry
              </h3>

              <form onSubmit={handleAddTransaction} className="space-y-4">
                {/* Credit vs Debit */}
                <div className="grid grid-cols-2 bg-black/40 p-1 rounded-2xl border border-white/5">
                  <button
                    type="button"
                    onClick={() => {
                      setTxType('credit');
                      setTxCategory(DEFAULT_CREDIT_CATEGORIES[0]);
                    }}
                    className={`py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${
                      txType === 'credit' ? 'bg-emerald-600 text-white shadow-md' : 'text-white/40 hover:text-white'
                    }`}
                  >
                    Credit (Inflow)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setTxType('debit');
                      setTxCategory(DEFAULT_DEBIT_CATEGORIES[0]);
                    }}
                    className={`py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${
                      txType === 'debit' ? 'bg-red-600 text-white shadow-md' : 'text-white/40 hover:text-white'
                    }`}
                  >
                    Debit (Outflow)
                  </button>
                </div>

                {/* Cash vs Bank */}
                <div className="grid grid-cols-2 bg-black/40 p-1 rounded-2xl border border-white/5">
                  <button
                    type="button"
                    onClick={() => setTxMethod('bank')}
                    className={`py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${
                      txMethod === 'bank' ? 'bg-white/10 text-brand-teal font-black' : 'text-white/40 hover:text-white'
                    }`}
                  >
                    Bank / UPI
                  </button>
                  <button
                    type="button"
                    onClick={() => setTxMethod('cash')}
                    className={`py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${
                      txMethod === 'cash' ? 'bg-white/10 text-brand-teal font-black' : 'text-white/40 hover:text-white'
                    }`}
                  >
                    Cash Ledger
                  </button>
                </div>

                {/* Category */}
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-white/50 uppercase tracking-widest">Category</label>
                  <select
                    value={txCategory}
                    onChange={(e) => setTxCategory(e.target.value)}
                    className="w-full p-2.5 bg-black/40 border border-white/10 rounded-xl text-xs text-white outline-none focus:border-brand-orange"
                  >
                    {(txType === 'credit' ? DEFAULT_CREDIT_CATEGORIES : DEFAULT_DEBIT_CATEGORIES).map(c => (
                      <option key={c} value={c}>{c.toUpperCase()}</option>
                    ))}
                  </select>
                </div>

                {/* Funding Source */}
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-white/50 uppercase tracking-widest">Capital / Funding Source</label>
                  <select
                    value={txFundingSource}
                    onChange={(e) => setTxFundingSource(e.target.value as any)}
                    className="w-full p-2.5 bg-black/40 border border-white/10 rounded-xl text-xs text-white outline-none focus:border-brand-orange"
                  >
                    <option value="revenue">Operational Revenue / Customer Payments</option>
                    <option value="capital_investment">Capital Investment Fund (Founder Equity)</option>
                    <option value="debt_loan">Bank Vehicle Loan / Debt</option>
                  </select>
                </div>

                {/* Amount and Date */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-white/50 uppercase tracking-widest">Amount (₹) *</label>
                    <input
                      type="number"
                      required
                      min="1"
                      value={txAmount || ''}
                      onChange={(e) => setTxAmount(parseFloat(e.target.value) || 0)}
                      placeholder="0"
                      className="w-full p-2.5 bg-black/40 border border-white/10 rounded-xl text-xs font-mono font-bold text-white outline-none focus:border-brand-orange"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-white/50 uppercase tracking-widest">Date *</label>
                    <input
                      type="date"
                      required
                      value={txDate}
                      onChange={(e) => setTxDate(e.target.value)}
                      className="w-full p-2.5 bg-black/40 border border-white/10 rounded-xl text-xs font-mono text-white outline-none focus:border-brand-orange"
                    />
                  </div>
                </div>

                {/* Notes */}
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-white/50 uppercase tracking-widest">Details / Description</label>
                  <input
                    type="text"
                    value={txNotes}
                    onChange={(e) => setTxNotes(e.target.value)}
                    placeholder="e.g. Hunter 350 periodic 3000km oil change"
                    className="w-full p-2.5 bg-black/40 border border-white/10 rounded-xl text-xs text-white outline-none focus:border-brand-orange"
                  />
                </div>

                {/* Bill upload */}
                <div className="p-3 bg-black/30 rounded-xl border border-white/5 space-y-2">
                  <label className="text-[9px] font-black text-white/50 uppercase tracking-widest flex items-center gap-1.5">
                    <Upload className="w-3 h-3" />
                    <span>Attach Bill / Receipt (Optional)</span>
                  </label>
                  <input
                    type="file"
                    onChange={(e) => setTxBillFile(e.target.files?.[0] || null)}
                    className="text-xs text-white/60 file:mr-2 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-[9px] file:font-black file:uppercase file:bg-white/10 file:text-white"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSubmittingTx || txAmount <= 0}
                  className={`w-full py-3.5 rounded-2xl text-[10px] font-black uppercase tracking-widest text-white shadow-lg transition-all cursor-pointer ${
                    txType === 'credit'
                      ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20'
                      : 'bg-brand-orange hover:bg-brand-orange/90 shadow-brand-orange/20'
                  }`}
                >
                  {isSubmittingTx ? 'Saving...' : 'Record Transaction'}
                </button>
              </form>
            </div>
          </div>

          {/* Right Column: Multi-Column Ledger Grid */}
          <div className="lg:col-span-2 bg-brand-gray-dark/60 rounded-3xl border border-white/5 flex flex-col h-[750px] overflow-hidden">
            <div className="p-5 border-b border-white/5 flex justify-between items-center bg-white/[0.01]">
              <div>
                <h4 className="font-heading text-sm text-white uppercase tracking-wider">
                  {selectedMonth.toUpperCase()} {selectedYear} LEDGER RECORDS
                </h4>
                <p className="text-[9px] text-white/40 font-mono mt-0.5">
                  {filteredEntries.length} entries in active interval
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowDeletedLogsModal(true)}
                  className="px-3 py-1.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 text-[9px] font-bold uppercase tracking-wider flex items-center gap-1.5 border border-red-500/20 cursor-pointer transition-colors"
                >
                  <History className="w-3.5 h-3.5" />
                  <span>Deleted Logs ({deletedLogs.length})</span>
                </button>
                <button
                  onClick={exportSheetCSV}
                  className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-white text-[9px] font-bold uppercase tracking-wider flex items-center gap-1.5 border border-white/10 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5 text-brand-teal" />
                  <span>Export CSV</span>
                </button>
                <button
                  onClick={loadData}
                  className="p-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-white/60 hover:text-white transition-colors"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="sticky top-0 bg-brand-gray-dark border-b border-white/10 text-[9px] font-black uppercase tracking-widest text-white/40 z-10 shadow-sm">
                  <tr>
                    <th className="py-3 px-3 text-center">Action</th>
                    <th className="py-3 px-3">Date</th>
                    <th className="py-3 px-3 text-right text-emerald-400">Cr Cash</th>
                    <th className="py-3 px-3">Details</th>
                    <th className="py-3 px-3 text-right text-emerald-400">Cr Bank</th>
                    <th className="py-3 px-3">Details</th>
                    <th className="py-3 px-3 text-right text-red-400">Db Cash</th>
                    <th className="py-3 px-3">Details</th>
                    <th className="py-3 px-3 text-right text-red-400">Db Bank</th>
                    <th className="py-3 px-3">Details</th>
                    <th className="py-3 px-3 text-right">Cash Bal</th>
                    <th className="py-3 px-3 text-right">Bank Bal</th>
                    <th className="py-3 px-3 text-right text-brand-teal bg-brand-teal/5">Total Bal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 font-mono text-[11px]">
                  {/* Opening Balance Row */}
                  <tr className="bg-brand-yellow/5 italic text-white/70">
                    <td className="py-2.5 px-3 text-center text-[9px] text-white/30">INIT</td>
                    <td className="py-2.5 px-3">{dateRange.start}</td>
                    <td colSpan={8} className="py-2.5 px-3 font-sans font-bold text-brand-yellow text-[10px] uppercase">
                      Starting Period Balance
                    </td>
                    <td className="py-2.5 px-3 text-right font-bold text-white">₹{openingCash.toLocaleString('en-IN')}</td>
                    <td className="py-2.5 px-3 text-right font-bold text-brand-teal">₹{openingBank.toLocaleString('en-IN')}</td>
                    <td className="py-2.5 px-3 text-right font-bold text-brand-orange bg-brand-teal/5">
                      ₹{(openingCash + openingBank).toLocaleString('en-IN')}
                    </td>
                  </tr>

                  {sheetRows.map(({ entry, runningCash, runningBank, runningTotal }) => (
                    <tr key={entry.id} className="hover:bg-white/[0.02] transition-colors">
                      <td className="py-2.5 px-3 text-center">
                        <button
                          onClick={() => openDeleteModal(entry)}
                          className="p-1 rounded text-white/20 hover:text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer"
                          title="Void entry with reason"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                      <td className="py-2.5 px-3 text-white/70 whitespace-nowrap">{entry.date}</td>
                      <td className="py-2.5 px-3 text-right text-emerald-400 font-bold whitespace-nowrap">
                        {entry.credit_cash ? `₹${entry.credit_cash.toLocaleString('en-IN')}` : '-'}
                      </td>
                      <td className="py-2.5 px-3 max-w-[120px] truncate text-white/50 font-sans text-[10px]" title={entry.credit_cash_details}>
                        {entry.credit_cash_details || '-'}
                      </td>
                      <td className="py-2.5 px-3 text-right text-emerald-400 font-bold whitespace-nowrap">
                        {entry.credit_bank ? `₹${entry.credit_bank.toLocaleString('en-IN')}` : '-'}
                      </td>
                      <td className="py-2.5 px-3 max-w-[120px] truncate text-white/50 font-sans text-[10px]" title={entry.credit_bank_details}>
                        {entry.credit_bank_details || '-'}
                      </td>
                      <td className="py-2.5 px-3 text-right text-red-400 font-bold whitespace-nowrap">
                        {entry.debit_cash ? `₹${entry.debit_cash.toLocaleString('en-IN')}` : '-'}
                      </td>
                      <td className="py-2.5 px-3 max-w-[120px] truncate text-white/50 font-sans text-[10px]" title={entry.debit_cash_details}>
                        {entry.debit_cash_details || '-'}
                      </td>
                      <td className="py-2.5 px-3 text-right text-red-400 font-bold whitespace-nowrap">
                        {entry.debit_bank ? `₹${entry.debit_bank.toLocaleString('en-IN')}` : '-'}
                      </td>
                      <td className="py-2.5 px-3 max-w-[120px] truncate text-white/50 font-sans text-[10px]" title={entry.debit_bank_details}>
                        {entry.debit_bank_details || '-'}
                      </td>
                      <td className="py-2.5 px-3 text-right text-white/80 whitespace-nowrap">
                        ₹{runningCash.toLocaleString('en-IN')}
                      </td>
                      <td className="py-2.5 px-3 text-right text-white/80 whitespace-nowrap">
                        ₹{runningBank.toLocaleString('en-IN')}
                      </td>
                      <td className="py-2.5 px-3 text-right font-bold text-brand-teal whitespace-nowrap bg-brand-teal/5">
                        ₹{runningTotal.toLocaleString('en-IN')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* VIEW 2: CapEx & Fleet Asset Register */}
      {activeView === 'capex' && (
        <CapexAssetRegister
          assets={assets}
          onAddAsset={handleAddCapexAsset}
          onDeleteAsset={handleDeleteCapexAsset}
          onUpdateAsset={handleUpdateCapexAsset}
        />
      )}

      {/* VIEW 3: Executive P&L Statement */}
      {activeView === 'pnl' && (
        <PnLStatement
          entries={entries}
          assets={assets}
          dateRange={dateRange}
          tabName={activeTabName}
        />
      )}

      {/* VIEW 4: Analytics & Visuals */}
      {activeView === 'analytics' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Category Breakdown Table */}
            <div className="lg:col-span-2 bg-brand-gray-dark/60 p-6 rounded-3xl border border-white/5 space-y-4">
              <div className="flex justify-between items-center pb-3 border-b border-white/5">
                <h4 className="font-heading text-sm text-white uppercase tracking-wider">
                  Category Breakdown Ranking ({categoryBreakdown.length} Categories)
                </h4>
                <div className="flex bg-black/40 p-1 rounded-xl border border-white/5">
                  <button
                    onClick={() => setPieFocus('debit')}
                    className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider ${
                      pieFocus === 'debit' ? 'bg-red-500 text-white' : 'text-white/40'
                    }`}
                  >
                    Expenses (Out)
                  </button>
                  <button
                    onClick={() => setPieFocus('credit')}
                    className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider ${
                      pieFocus === 'credit' ? 'bg-emerald-600 text-white' : 'text-white/40'
                    }`}
                  >
                    Revenue (In)
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-white/80">
                  <thead className="bg-white/5 text-[9px] font-black uppercase tracking-widest text-white/40 border-b border-white/5">
                    <tr>
                      <th className="py-2.5 px-3">Category</th>
                      <th className="py-2.5 px-3 text-right">Amount (₹)</th>
                      <th className="py-2.5 px-3 text-right">Share %</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 font-mono">
                    {categoryBreakdown.map((item, idx) => (
                      <tr key={item.name} className="hover:bg-white/[0.02]">
                        <td className="py-2.5 px-3 font-sans font-bold flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[idx % COLORS.length] }}></span>
                          <span className="text-white text-xs">{item.name}</span>
                        </td>
                        <td className="py-2.5 px-3 text-right font-bold text-white">
                          ₹{item.value.toLocaleString('en-IN')}
                        </td>
                        <td className="py-2.5 px-3 text-right text-brand-teal">
                          {item.percentage.toFixed(1)}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Pie Chart */}
            <div className="bg-brand-gray-dark/60 p-6 rounded-3xl border border-white/5 flex flex-col justify-between h-[420px]">
              <div>
                <h4 className="font-heading text-sm text-white uppercase tracking-wider">Weight Distribution</h4>
                <p className="text-[9px] text-white/40 font-mono mt-0.5">Focus: {pieFocus.toUpperCase()}</p>
              </div>

              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={categoryBreakdown}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {categoryBreakdown.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <RechartsTooltip formatter={(val: any) => [`₹${Number(val).toLocaleString('en-IN')}`, 'Amount']} />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              <p className="text-[9px] text-white/30 text-center font-mono">
                Showing top contributors for selected interval
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal with Required Reason */}
      {deleteModalEntry && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-brand-gray-dark border border-white/10 rounded-3xl max-w-md w-full p-6 space-y-5 text-white shadow-2xl">
            <div className="flex justify-between items-start border-b border-white/10 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-red-500/20 text-red-400 flex items-center justify-center">
                  <Trash2 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-heading text-lg text-white uppercase tracking-tight">Void Ledger Entry</h3>
                  <p className="text-[10px] text-red-400 font-mono font-bold mt-0.5">
                    Will be archived in Supabase audit logs
                  </p>
                </div>
              </div>
              <button
                onClick={() => setDeleteModalEntry(null)}
                className="text-white/40 hover:text-white text-sm font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Target Entry Card */}
            <div className="p-3.5 rounded-2xl bg-black/40 border border-white/5 space-y-1.5 text-xs">
              <div className="flex justify-between text-white/50 text-[10px]">
                <span>Date: <b className="text-white">{deleteModalEntry.date}</b></span>
                <span className="uppercase font-mono text-brand-teal font-bold">{deleteModalEntry.category}</span>
              </div>
              <div className="flex justify-between items-baseline pt-1">
                <span className="text-white/60">Amount:</span>
                <span className="text-base font-heading text-white">
                  ₹{((deleteModalEntry.credit_cash || 0) + (deleteModalEntry.credit_bank || 0) + (deleteModalEntry.debit_cash || 0) + (deleteModalEntry.debit_bank || 0)).toLocaleString('en-IN')}
                </span>
              </div>
              {(deleteModalEntry.notes || deleteModalEntry.credit_bank_details || deleteModalEntry.debit_bank_details) && (
                <p className="text-[10px] text-white/40 italic pt-1 truncate">
                  {deleteModalEntry.notes || deleteModalEntry.credit_bank_details || deleteModalEntry.debit_bank_details}
                </p>
              )}
            </div>

            {/* Reason Form */}
            <form onSubmit={handleConfirmDelete} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[9px] font-black uppercase tracking-widest text-white/60 flex items-center justify-between">
                  <span>Reason for Deletion * (Mandatory)</span>
                  <span className="text-red-400 text-[8px]">Stored in Supabase</span>
                </label>

                {/* Preset Pills */}
                <div className="flex flex-wrap gap-1.5 pb-1">
                  {[
                    'Duplicate transaction',
                    'Ride cancelled / refund issued',
                    'Typo in amount',
                    'Wrong account / mode',
                    'Internal test entry'
                  ].map(preset => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setDeleteReasonInput(preset)}
                      className="px-2 py-0.5 rounded-md bg-white/5 hover:bg-white/10 text-white/70 text-[8px] font-bold transition-colors cursor-pointer"
                    >
                      + {preset}
                    </button>
                  ))}
                </div>

                <textarea
                  required
                  rows={3}
                  value={deleteReasonInput}
                  onChange={(e) => setDeleteReasonInput(e.target.value)}
                  placeholder="Explain why this entry is being voided (e.g. Duplicate booking entry corrected by admin)..."
                  className="w-full p-2.5 bg-black/40 border border-white/10 rounded-xl text-xs text-white outline-none focus:border-red-500/80 resize-none font-sans"
                />
              </div>

              <div className="flex justify-end gap-2.5 pt-2 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setDeleteModalEntry(null)}
                  className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white text-xs font-bold uppercase tracking-wider cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isDeleting || !deleteReasonInput.trim()}
                  className="px-5 py-2 rounded-xl bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-xs font-black uppercase tracking-wider shadow-lg shadow-red-600/30 flex items-center gap-2 cursor-pointer"
                >
                  {isDeleting ? 'Archiving...' : 'Confirm Void & Save Log'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Deleted Logs Audit Trail Modal */}
      {showDeletedLogsModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-brand-gray-dark border border-white/10 rounded-3xl max-w-4xl w-full p-6 space-y-5 text-white shadow-2xl max-h-[85vh] flex flex-col">
            <div className="flex justify-between items-start border-b border-white/10 pb-4 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-red-500/20 text-red-400 flex items-center justify-center">
                  <History className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-heading text-lg text-white uppercase tracking-tight">
                    Deleted Ledger Audit Trail ({deletedLogs.length} Records)
                  </h3>
                  <p className="text-[10px] text-brand-teal font-mono uppercase tracking-widest mt-0.5">
                    Synced with Supabase table `finance_deleted_logs`
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowDeletedLogsModal(false)}
                className="text-white/40 hover:text-white text-sm font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            {deletedLogs.length === 0 ? (
              <div className="p-12 text-center text-white/30 space-y-2">
                <p className="text-sm font-bold">No deleted entries found.</p>
                <p className="text-xs">All active ledger rows remain in clean standing.</p>
              </div>
            ) : (
              <div className="overflow-y-auto flex-1 rounded-2xl border border-white/10">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="sticky top-0 bg-brand-gray-dark border-b border-white/10 text-[9px] font-black uppercase tracking-widest text-white/40">
                    <tr>
                      <th className="py-2.5 px-3">Deleted At</th>
                      <th className="py-2.5 px-3">Original Date</th>
                      <th className="py-2.5 px-3">Category & Type</th>
                      <th className="py-2.5 px-3 text-right">Amount</th>
                      <th className="py-2.5 px-3">Deletion Reason</th>
                      <th className="py-2.5 px-3">Deleted By</th>
                      <th className="py-2.5 px-3 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 font-mono text-[11px]">
                    {deletedLogs.map(log => (
                      <tr key={log.id} className="hover:bg-white/[0.02] transition-colors">
                        <td className="py-2.5 px-3 text-white/40 whitespace-nowrap">
                          {new Date(log.deleted_at).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' })}
                        </td>
                        <td className="py-2.5 px-3 text-white/70 whitespace-nowrap">{log.entry_date}</td>
                        <td className="py-2.5 px-3 font-sans">
                          <span className="font-bold text-white block capitalize">{log.category}</span>
                          <span className="text-[9px] text-white/40 uppercase">{log.type}</span>
                        </td>
                        <td className="py-2.5 px-3 text-right font-bold text-red-400 whitespace-nowrap">
                          ₹{log.amount.toLocaleString('en-IN')}
                        </td>
                        <td className="py-2.5 px-3 font-sans text-xs max-w-[220px]">
                          <span className="text-white/80 font-medium bg-red-950/40 border border-red-500/20 px-2 py-1 rounded-lg block">
                            "{log.reason}"
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-white/40 text-[10px] truncate max-w-[120px]" title={log.deleted_by}>
                          {log.deleted_by}
                        </td>
                        <td className="py-2.5 px-3 text-center whitespace-nowrap">
                          <button
                            onClick={() => handleRestore(log.entry_id)}
                            className="px-2.5 py-1 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/30 text-[9px] font-black uppercase tracking-wider cursor-pointer transition-colors"
                            title="Restore entry back to ledger"
                          >
                            Restore
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div className="flex justify-end pt-2 border-t border-white/10 shrink-0">
              <button
                onClick={() => setShowDeletedLogsModal(false)}
                className="px-5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold uppercase tracking-wider cursor-pointer"
              >
                Close Audit Trail
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Opening Balance Modal */}
      {showEditOpeningModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-brand-gray-dark border border-white/10 rounded-3xl max-w-md w-full p-6 space-y-5 text-white shadow-2xl">
            <div className="flex justify-between items-start border-b border-white/10 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                  <Calendar className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-heading text-lg text-white uppercase tracking-tight">Edit Opening Balance</h3>
                  <p className="text-[10px] text-brand-teal font-mono font-bold mt-0.5">
                    {activeTabName}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowEditOpeningModal(false)}
                className="text-white/40 hover:text-white text-sm font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveOpeningBalance} className="space-y-4">
              <div className="space-y-3">
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-white/60 uppercase tracking-widest">
                    Opening Cash Balance (₹) *
                  </label>
                  <input
                    type="number"
                    required
                    min="0"
                    step="any"
                    value={editOpeningCashInput}
                    onChange={(e) => setEditOpeningCashInput(parseFloat(e.target.value) || 0)}
                    className="w-full p-3 bg-black/40 border border-white/10 rounded-xl text-sm font-mono font-bold text-white outline-none focus:border-emerald-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] font-black text-white/60 uppercase tracking-widest">
                    Opening Bank Balance (₹) *
                  </label>
                  <input
                    type="number"
                    required
                    min="0"
                    step="any"
                    value={editOpeningBankInput}
                    onChange={(e) => setEditOpeningBankInput(parseFloat(e.target.value) || 0)}
                    className="w-full p-3 bg-black/40 border border-white/10 rounded-xl text-sm font-mono font-bold text-brand-teal outline-none focus:border-brand-teal"
                  />
                </div>

                <div className="p-3 bg-black/30 border border-white/5 rounded-xl text-[10px] text-white/50 space-y-1">
                  <p className="flex justify-between">
                    <span>Combined Opening:</span>
                    <b className="text-white font-mono">
                      ₹{((Number(editOpeningCashInput) || 0) + (Number(editOpeningBankInput) || 0)).toLocaleString('en-IN')}
                    </b>
                  </p>
                  <p className="text-[9px] text-white/40 italic">
                    Saved directly to Supabase table `finance_months` & updates the starting row in `finance_ledger`.
                  </p>
                </div>
              </div>

              <div className="flex justify-end gap-2.5 pt-3 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setShowEditOpeningModal(false)}
                  className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white text-xs font-bold uppercase tracking-wider cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingOpening}
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black uppercase tracking-wider shadow-lg shadow-emerald-600/30 flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {isSavingOpening ? 'Saving...' : 'Save Opening Balance'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Initialize Month Modal */}
      {showInitMonthModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-brand-gray-dark border border-white/10 rounded-3xl max-w-md w-full p-6 space-y-5 text-white shadow-2xl">
            <div className="flex justify-between items-start border-b border-white/10 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                  <Plus className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-heading text-lg text-white uppercase tracking-tight">
                    Initialize Month Tab
                  </h3>
                  <p className="text-[10px] text-brand-teal font-mono font-bold mt-0.5">
                    {activeTabName}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowInitMonthModal(false)}
                className="text-white/40 hover:text-white text-sm font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleInitializeMonth} className="space-y-4">
              <p className="text-xs text-white/60 leading-relaxed">
                Configure starting cash and bank balances to create the spreadsheet tab for <b className="text-white">{activeTabName}</b>.
              </p>

              <div className="space-y-3">
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-white/60 uppercase tracking-widest">
                    Starting Cash (₹)
                  </label>
                  <input
                    type="number"
                    required
                    min="0"
                    step="any"
                    value={editOpeningCashInput}
                    onChange={(e) => setEditOpeningCashInput(parseFloat(e.target.value) || 0)}
                    className="w-full p-3 bg-black/40 border border-white/10 rounded-xl text-sm font-mono font-bold text-white outline-none focus:border-emerald-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] font-black text-white/60 uppercase tracking-widest">
                    Starting Bank (₹)
                  </label>
                  <input
                    type="number"
                    required
                    min="0"
                    step="any"
                    value={editOpeningBankInput}
                    onChange={(e) => setEditOpeningBankInput(parseFloat(e.target.value) || 0)}
                    className="w-full p-3 bg-black/40 border border-white/10 rounded-xl text-sm font-mono font-bold text-brand-teal outline-none focus:border-brand-teal"
                  />
                </div>

                {monthStats.endingTotal > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      setEditOpeningCashInput(monthStats.endingCash);
                      setEditOpeningBankInput(monthStats.endingBank);
                    }}
                    className="w-full p-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-[9px] font-black uppercase tracking-wider text-brand-teal flex items-center justify-between cursor-pointer transition-colors"
                  >
                    <span>Carry Forward Previous Closing:</span>
                    <span className="font-mono text-white">
                      Cash ₹{monthStats.endingCash.toLocaleString('en-IN')} | Bank ₹{monthStats.endingBank.toLocaleString('en-IN')}
                    </span>
                  </button>
                )}
              </div>

              <div className="flex justify-end gap-2.5 pt-3 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setShowInitMonthModal(false)}
                  className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white text-xs font-bold uppercase tracking-wider cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingOpening}
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black uppercase tracking-wider shadow-lg shadow-emerald-600/30 flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {isSavingOpening ? 'Initializing...' : 'Initialize Tab'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
