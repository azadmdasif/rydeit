import React, { useState } from 'react';
import { CapexAsset, DepreciationCalculation } from './types';
import { calculateAssetDepreciation } from './depreciationUtils';
import { 
  Plus, 
  Trash2, 
  Calendar, 
  HelpCircle,
  Clock,
  Sparkles,
  Bike as BikeIcon,
  Tag,
  ArrowUpRight,
  Pencil,
  AlertTriangle
} from 'lucide-react';
import { getFleetBikes } from '../../../fleetStorage';

interface CapexAssetRegisterProps {
  assets: CapexAsset[];
  onAddAsset: (asset: CapexAsset, logToLedger: boolean, fundingSource: 'revenue' | 'capital_investment' | 'debt_loan') => Promise<void>;
  onDeleteAsset: (assetId: string) => Promise<void>;
  onUpdateAsset?: (asset: CapexAsset) => Promise<void>;
}

export const CapexAssetRegister: React.FC<CapexAssetRegisterProps> = ({
  assets,
  onAddAsset,
  onDeleteAsset,
  onUpdateAsset
}) => {
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedAssetForSchedule, setSelectedAssetForSchedule] = useState<CapexAsset | null>(null);

  // Edit Asset State
  const [editingAsset, setEditingAsset] = useState<CapexAsset | null>(null);
  const [editName, setEditName] = useState('');
  const [editCategory, setEditCategory] = useState<'VEHICLE' | 'GPS_IOT' | 'GARAGE_EQUIPMENT' | 'OFFICE_TECH'>('VEHICLE');
  const [editPurchaseDate, setEditPurchaseDate] = useState('');
  const [editPurchaseCost, setEditPurchaseCost] = useState<number>(0);
  const [editSalvageValue, setEditSalvageValue] = useState<number>(0);
  const [editUsefulLifeMonths, setEditUsefulLifeMonths] = useState<number>(48);
  const [editDepreciationMethod, setEditDepreciationMethod] = useState<'SLM' | 'WDV'>('SLM');
  const [editAnnualRate, setEditAnnualRate] = useState<number>(20);
  const [editStatus, setEditStatus] = useState<'ACTIVE' | 'SOLD' | 'SCRAPPED'>('ACTIVE');
  const [editNotes, setEditNotes] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);

  // Delete Asset Modal State
  const [assetToDelete, setAssetToDelete] = useState<CapexAsset | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Add Form State
  const [name, setName] = useState('');
  const [category, setCategory] = useState<'VEHICLE' | 'GPS_IOT' | 'GARAGE_EQUIPMENT' | 'OFFICE_TECH'>('VEHICLE');
  const [selectedBikeId, setSelectedBikeId] = useState<number | null>(null);
  const [purchaseDate, setPurchaseDate] = useState(new Date().toISOString().split('T')[0]);
  const [purchaseCost, setPurchaseCost] = useState<number>(95000);
  const [salvageValue, setSalvageValue] = useState<number>(10000);
  const [usefulLifeMonths, setUsefulLifeMonths] = useState<number>(48);
  const [depreciationMethod, setDepreciationMethod] = useState<'SLM' | 'WDV'>('SLM');
  const [fundingSource, setFundingSource] = useState<'revenue' | 'capital_investment' | 'debt_loan'>('capital_investment');
  const [logToLedger, setLogToLedger] = useState(true);
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Handle bike selection preset
  const handleSelectBikePreset = (bikeId: number) => {
    const fleetBikes = getFleetBikes();
    const bike = fleetBikes.find(b => b.id === bikeId);
    if (!bike) return;
    setSelectedBikeId(bike.id);
    setName(`${bike.name} (WB-02-XXXX)`);
    setCategory('VEHICLE');
    let cost = 95000;
    if (bike.category === 'Royal Enfield') cost = 185000;
    else if (bike.category === 'Sports') cost = 165000;
    else if (bike.name.includes('Ather')) cost = 145000;
    setPurchaseCost(cost);
    setSalvageValue(Math.round(cost * 0.12));
  };

  // Open Edit Modal
  const handleOpenEdit = (asset: CapexAsset) => {
    setEditingAsset(asset);
    setEditName(asset.name);
    setEditCategory(asset.category);
    setEditPurchaseDate(asset.purchase_date);
    setEditPurchaseCost(asset.purchase_cost);
    setEditSalvageValue(asset.salvage_value);
    setEditUsefulLifeMonths(asset.useful_life_months);
    setEditDepreciationMethod(asset.depreciation_method || 'SLM');
    setEditAnnualRate(asset.annual_depreciation_rate || 20);
    setEditStatus(asset.status || 'ACTIVE');
    setEditNotes(asset.notes || '');
  };

  // Save Edited Asset
  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAsset) return;
    setIsUpdating(true);
    try {
      const updated: CapexAsset = {
        ...editingAsset,
        name: editName.trim(),
        category: editCategory,
        purchase_date: editPurchaseDate,
        purchase_cost: Number(editPurchaseCost) || 0,
        salvage_value: Number(editSalvageValue) || 0,
        useful_life_months: Number(editUsefulLifeMonths) || 48,
        depreciation_method: editDepreciationMethod,
        annual_depreciation_rate: Number(editAnnualRate) || 20,
        status: editStatus,
        notes: editNotes.trim()
      };
      if (onUpdateAsset) {
        await onUpdateAsset(updated);
      }
      setEditingAsset(null);
      alert(`Asset "${updated.name}" updated successfully!`);
    } catch (err: any) {
      alert(`Failed to update asset: ${err.message || 'Unknown error'}`);
    } finally {
      setIsUpdating(false);
    }
  };

  // Confirm Delete Asset
  const handleConfirmDelete = async () => {
    if (!assetToDelete) return;
    setIsDeleting(true);
    try {
      await onDeleteAsset(assetToDelete.id);
      setAssetToDelete(null);
      alert(`Asset "${assetToDelete.name}" removed from register!`);
    } catch (err: any) {
      alert(`Failed to delete asset: ${err.message || 'Unknown error'}`);
    } finally {
      setIsDeleting(false);
    }
  };

  // Calculations for summary
  const calculations: DepreciationCalculation[] = assets.map(a => calculateAssetDepreciation(a, new Date()));
  const totalCapex = assets.reduce((sum, a) => sum + (a.status === 'ACTIVE' ? a.purchase_cost : 0), 0);
  const totalAccumulatedDep = calculations.reduce((sum, c) => sum + c.accumulatedDepreciation, 0);
  const totalCurrentBookValue = calculations.reduce((sum, c) => sum + c.currentBookValue, 0);
  const totalMonthlyDepreciation = calculations.reduce((sum, c) => sum + c.monthlyDepreciation, 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || purchaseCost <= 0) return;

    setIsSubmitting(true);
    try {
      const newAsset: CapexAsset = {
        id: `asset-${Date.now()}`,
        name: name.trim(),
        category,
        bike_id: selectedBikeId,
        purchase_date: purchaseDate,
        purchase_cost: purchaseCost,
        salvage_value: salvageValue,
        useful_life_months: usefulLifeMonths,
        depreciation_method: depreciationMethod,
        status: 'ACTIVE',
        notes: notes.trim() || undefined
      };

      await onAddAsset(newAsset, logToLedger, fundingSource);
      setShowAddModal(false);
      // Reset
      setName('');
      setSelectedBikeId(null);
      setNotes('');
    } catch (err: any) {
      alert(`Error creating asset: ${err.message || 'Unknown error'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & KPI Summary */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-brand-gray-dark/80 p-6 rounded-3xl border border-white/5">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-brand-teal animate-pulse"></span>
            <h3 className="font-heading text-xl text-white uppercase tracking-tight">CapEx & Fleet Asset Register</h3>
            <span className="px-2 py-0.5 rounded-full bg-brand-teal/10 text-brand-teal text-[9px] font-black uppercase tracking-widest border border-brand-teal/20">
              Asset Accounting
            </span>
          </div>
          <p className="text-white/40 text-[10px] font-bold mt-1 uppercase tracking-wider">
            Track fixed asset investments, Straight-Line & WDV depreciation schedules, and carrying book value
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="px-5 py-3 rounded-2xl bg-brand-orange hover:bg-brand-orange/90 text-white text-[10px] font-black uppercase tracking-widest flex items-center gap-2 shadow-lg shadow-brand-orange/20 cursor-pointer transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>Add CapEx Asset</span>
        </button>
      </div>

      {/* 4 Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 bg-brand-gray-dark/60 rounded-3xl border border-white/5 space-y-2">
          <div className="flex justify-between items-center text-white/40 text-[9px] font-black uppercase tracking-widest">
            <span>Total Fleet CapEx</span>
            <Tag className="w-3.5 h-3.5 text-brand-teal" />
          </div>
          <p className="text-2xl font-heading text-white tracking-tight">
            ₹{totalCapex.toLocaleString('en-IN')}
          </p>
          <p className="text-white/30 text-[9px] font-semibold">
            {assets.filter(a => a.status === 'ACTIVE').length} active capital units
          </p>
        </div>

        <div className="p-5 bg-brand-gray-dark/60 rounded-3xl border border-white/5 space-y-2">
          <div className="flex justify-between items-center text-white/40 text-[9px] font-black uppercase tracking-widest">
            <span>Accumulated Depreciation</span>
            <Clock className="w-3.5 h-3.5 text-brand-yellow" />
          </div>
          <p className="text-2xl font-heading text-brand-yellow tracking-tight">
            ₹{totalAccumulatedDep.toLocaleString('en-IN')}
          </p>
          <p className="text-white/30 text-[9px] font-semibold">
            {totalCapex > 0 ? ((totalAccumulatedDep / totalCapex) * 100).toFixed(1) : 0}% depreciated to date
          </p>
        </div>

        <div className="p-5 bg-brand-gray-dark/60 rounded-3xl border border-white/5 space-y-2">
          <div className="flex justify-between items-center text-white/40 text-[9px] font-black uppercase tracking-widest">
            <span>Net Asset Book Value</span>
            <Sparkles className="w-3.5 h-3.5 text-brand-teal" />
          </div>
          <p className="text-2xl font-heading text-brand-teal tracking-tight">
            ₹{totalCurrentBookValue.toLocaleString('en-IN')}
          </p>
          <p className="text-white/30 text-[9px] font-semibold">
            Balance sheet asset value
          </p>
        </div>

        <div className="p-5 bg-brand-gray-dark/60 rounded-3xl border border-white/5 space-y-2">
          <div className="flex justify-between items-center text-white/40 text-[9px] font-black uppercase tracking-widest">
            <span>Monthly D&A Expense</span>
            <ArrowUpRight className="w-3.5 h-3.5 text-brand-orange" />
          </div>
          <p className="text-2xl font-heading text-brand-orange tracking-tight">
            ₹{totalMonthlyDepreciation.toLocaleString('en-IN')}<span className="text-xs text-white/40 font-sans font-bold">/mo</span>
          </p>
          <p className="text-white/30 text-[9px] font-semibold">
            Monthly P&L depreciation run-rate
          </p>
        </div>
      </div>

      {/* Asset Table */}
      <div className="bg-brand-gray-dark/60 rounded-3xl border border-white/5 overflow-hidden">
        <div className="p-5 border-b border-white/5 flex justify-between items-center">
          <h4 className="font-heading text-sm text-white uppercase tracking-wider">
            Fleet Asset Depreciation Schedule ({assets.length} Assets)
          </h4>
          <span className="text-[9px] text-white/40 font-mono">
            Method: SLM (48 Months Useful Life, ~10% Scrap Value)
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-white/80">
            <thead className="bg-white/[0.02] text-white/40 text-[9px] font-black uppercase tracking-widest border-b border-white/5">
              <tr>
                <th className="py-3.5 px-4">Asset / Registration</th>
                <th className="py-3.5 px-4">Type</th>
                <th className="py-3.5 px-4">Purchased</th>
                <th className="py-3.5 px-4 text-right">Initial CapEx</th>
                <th className="py-3.5 px-4 text-right">Salvage Value</th>
                <th className="py-3.5 px-4 text-right">Monthly Dep.</th>
                <th className="py-3.5 px-4 text-right">Accumulated Dep.</th>
                <th className="py-3.5 px-4 text-right">Book Value</th>
                <th className="py-3.5 px-4 text-center">Life Progress</th>
                <th className="py-3.5 px-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 font-medium">
              {assets.map((asset) => {
                const calc = calculateAssetDepreciation(asset, new Date());
                const percentDepreciated = Math.min(100, Math.round((calc.accumulatedDepreciation / (asset.purchase_cost - asset.salvage_value || 1)) * 100));

                return (
                  <tr key={asset.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="py-3.5 px-4 font-bold text-white">
                      <div className="flex items-center gap-2">
                        {asset.category === 'VEHICLE' ? (
                          <BikeIcon className="w-4 h-4 text-brand-orange shrink-0" />
                        ) : (
                          <Tag className="w-4 h-4 text-brand-teal shrink-0" />
                        )}
                        <div>
                          <p className="text-xs text-white">{asset.name}</p>
                          {asset.notes && <p className="text-[9px] text-white/40 font-normal">{asset.notes}</p>}
                        </div>
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      <span className="px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider bg-white/5 text-white/60">
                        {asset.category}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 font-mono text-[11px] text-white/60 whitespace-nowrap">
                      {asset.purchase_date}
                    </td>

                    <td className="py-3.5 px-4 text-right font-mono font-bold text-white whitespace-nowrap">
                      ₹{asset.purchase_cost.toLocaleString('en-IN')}
                    </td>

                    <td className="py-3.5 px-4 text-right font-mono text-white/50 whitespace-nowrap">
                      ₹{asset.salvage_value.toLocaleString('en-IN')}
                    </td>

                    <td className="py-3.5 px-4 text-right font-mono text-brand-yellow font-bold whitespace-nowrap">
                      ₹{calc.monthlyDepreciation.toLocaleString('en-IN')}
                    </td>

                    <td className="py-3.5 px-4 text-right font-mono text-white/60 whitespace-nowrap">
                      ₹{calc.accumulatedDepreciation.toLocaleString('en-IN')}
                    </td>

                    <td className="py-3.5 px-4 text-right font-mono font-bold text-brand-teal whitespace-nowrap">
                      ₹{calc.currentBookValue.toLocaleString('en-IN')}
                    </td>

                    <td className="py-3.5 px-4 text-center">
                      <div className="w-20 mx-auto space-y-1">
                        <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
                          <div 
                            className={`h-full rounded-full ${percentDepreciated >= 90 ? 'bg-red-500' : percentDepreciated >= 50 ? 'bg-brand-yellow' : 'bg-brand-teal'}`}
                            style={{ width: `${percentDepreciated}%` }}
                          />
                        </div>
                        <span className="text-[8px] font-mono text-white/40 block">
                          {calc.monthsActive} / {asset.useful_life_months} mo ({percentDepreciated}%)
                        </span>
                      </div>
                    </td>

                    <td className="py-3.5 px-4 text-center whitespace-nowrap">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => setSelectedAssetForSchedule(asset)}
                          className="px-2 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-white text-[9px] font-bold uppercase tracking-wider cursor-pointer"
                          title="View 4-year schedule"
                        >
                          Schedule
                        </button>
                        <button
                          onClick={() => handleOpenEdit(asset)}
                          className="p-1.5 rounded-lg bg-white/5 hover:bg-brand-teal/20 text-white/50 hover:text-brand-teal transition-colors cursor-pointer"
                          title={`Edit ${asset.name}`}
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setAssetToDelete(asset)}
                          className="p-1.5 rounded-lg bg-white/5 hover:bg-red-500/20 text-white/50 hover:text-red-400 transition-colors cursor-pointer"
                          title={`Delete ${asset.name}`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Asset Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-brand-gray-dark border border-white/10 rounded-3xl max-w-lg w-full p-6 space-y-5 text-white shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-white/10 pb-4">
              <div>
                <h3 className="font-heading text-lg text-white uppercase tracking-tight">Add CapEx Asset Purchase</h3>
                <p className="text-[10px] text-white/40 font-bold uppercase tracking-widest mt-0.5">
                  Record vehicle or equipment capital expenditure & depreciation rules
                </p>
              </div>
              <button 
                onClick={() => setShowAddModal(false)}
                className="text-white/40 hover:text-white text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Quick Preset Selector from Fleet */}
              <div className="space-y-1">
                <label className="text-[9px] font-black text-white/50 uppercase tracking-widest flex items-center justify-between">
                  <span>Quick Preset from Rydeit Fleet (Optional)</span>
                  <span className="text-brand-teal text-[8px]">Auto-fills specs</span>
                </label>
                <select
                  value={selectedBikeId || ''}
                  onChange={(e) => {
                    const id = Number(e.target.value);
                    if (id) handleSelectBikePreset(id);
                  }}
                  className="w-full p-2.5 bg-black/40 border border-white/10 rounded-xl text-xs text-white outline-none focus:border-brand-orange"
                >
                  <option value="">-- Or enter custom asset details below --</option>
                  {getFleetBikes().map(b => (
                    <option key={b.id} value={b.id}>
                      {b.name} ({b.category}) - ₹{b.dailyRate}/day
                    </option>
                  ))}
                </select>
              </div>

              {/* Name & Category */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-white/50 uppercase tracking-widest">Asset Name & Reg No *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Ather 450X (WB-02-1234)"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full p-2.5 bg-black/40 border border-white/10 rounded-xl text-xs text-white outline-none focus:border-brand-orange"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] font-black text-white/50 uppercase tracking-widest">Asset Category *</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as any)}
                    className="w-full p-2.5 bg-black/40 border border-white/10 rounded-xl text-xs text-white outline-none focus:border-brand-orange"
                  >
                    <option value="VEHICLE">Fleet Vehicle (Bike/Scooter)</option>
                    <option value="GPS_IOT">GPS Tracker & IoT Hardware</option>
                    <option value="GARAGE_EQUIPMENT">Garage Equipment & Tools</option>
                    <option value="OFFICE_TECH">Office Hardware & Computers</option>
                  </select>
                </div>
              </div>

              {/* Purchase Cost & Salvage Value */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-white/50 uppercase tracking-widest">Purchase Cost (CapEx ₹) *</label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={purchaseCost}
                    onChange={(e) => {
                      const cost = parseFloat(e.target.value) || 0;
                      setPurchaseCost(cost);
                      setSalvageValue(Math.round(cost * 0.1));
                    }}
                    className="w-full p-2.5 bg-black/40 border border-white/10 rounded-xl text-xs font-mono font-bold text-white outline-none focus:border-brand-orange"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] font-black text-white/50 uppercase tracking-widest">Estimated Salvage (₹)</label>
                  <input
                    type="number"
                    min="0"
                    value={salvageValue}
                    onChange={(e) => setSalvageValue(parseFloat(e.target.value) || 0)}
                    className="w-full p-2.5 bg-black/40 border border-white/10 rounded-xl text-xs font-mono font-bold text-white outline-none focus:border-brand-orange"
                  />
                </div>
              </div>

              {/* Purchase Date & Useful Life */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-white/50 uppercase tracking-widest">Purchase Date *</label>
                  <input
                    type="date"
                    required
                    value={purchaseDate}
                    onChange={(e) => setPurchaseDate(e.target.value)}
                    className="w-full p-2.5 bg-black/40 border border-white/10 rounded-xl text-xs font-mono font-bold text-white outline-none focus:border-brand-orange"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] font-black text-white/50 uppercase tracking-widest">Useful Life (Months) *</label>
                  <input
                    type="number"
                    min="6"
                    max="120"
                    value={usefulLifeMonths}
                    onChange={(e) => setUsefulLifeMonths(parseInt(e.target.value) || 48)}
                    className="w-full p-2.5 bg-black/40 border border-white/10 rounded-xl text-xs font-mono font-bold text-white outline-none focus:border-brand-orange"
                  />
                  <span className="text-[8px] text-white/40 block">48 months = 4 years standard</span>
                </div>
              </div>

              {/* Depreciation Method & Capital Source */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-white/50 uppercase tracking-widest">Depreciation Method</label>
                  <select
                    value={depreciationMethod}
                    onChange={(e) => setDepreciationMethod(e.target.value as any)}
                    className="w-full p-2.5 bg-black/40 border border-white/10 rounded-xl text-xs text-white outline-none focus:border-brand-orange"
                  >
                    <option value="SLM">Straight Line Method (SLM - Recommended)</option>
                    <option value="WDV">Written Down Value (WDV 20% p.a.)</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] font-black text-white/50 uppercase tracking-widest">Funding Source</label>
                  <select
                    value={fundingSource}
                    onChange={(e) => setFundingSource(e.target.value as any)}
                    className="w-full p-2.5 bg-black/40 border border-white/10 rounded-xl text-xs text-white outline-none focus:border-brand-orange"
                  >
                    <option value="capital_investment">Capital Investment / Founder Equity</option>
                    <option value="debt_loan">Bank Vehicle Loan / Debt</option>
                    <option value="revenue">Operational Revenue / Profits</option>
                  </select>
                </div>
              </div>

              {/* Sync to Ledger Checkbox */}
              <div className="p-3 bg-black/30 rounded-xl border border-white/10 flex items-center gap-3">
                <input
                  type="checkbox"
                  id="logToLedger"
                  checked={logToLedger}
                  onChange={(e) => setLogToLedger(e.target.checked)}
                  className="w-4 h-4 rounded text-brand-orange accent-brand-orange cursor-pointer"
                />
                <label htmlFor="logToLedger" className="text-xs text-white/80 cursor-pointer select-none">
                  <b className="text-white">Also record cash debit in Ledger Book</b>
                  <span className="block text-[9px] text-white/40">Logs a corresponding CapEx debit transaction dated {purchaseDate}</span>
                </label>
              </div>

              {/* Notes */}
              <div className="space-y-1">
                <label className="text-[9px] font-black text-white/50 uppercase tracking-widest">Notes & Dealer Info</label>
                <input
                  type="text"
                  placeholder="e.g. Purchased from authorized dealer, includes 5-yr warranty"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full p-2.5 bg-black/40 border border-white/10 rounded-xl text-xs text-white outline-none focus:border-brand-orange"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white text-xs font-bold uppercase tracking-wider"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-6 py-2.5 rounded-xl bg-brand-orange hover:bg-brand-orange/90 text-white text-xs font-black uppercase tracking-wider shadow-lg shadow-brand-orange/20 cursor-pointer"
                >
                  {isSubmitting ? 'Recording...' : 'Save CapEx Asset'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Schedule Detail Modal */}
      {selectedAssetForSchedule && (() => {
        const asset = selectedAssetForSchedule;
        const depBase = asset.purchase_cost - asset.salvage_value;
        const monthlyDep = Math.round(depBase / asset.useful_life_months);
        const yearsCount = Math.ceil(asset.useful_life_months / 12);
        const purchaseY = new Date(asset.purchase_date).getFullYear();

        return (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-fade-in">
            <div className="bg-brand-gray-dark border border-white/10 rounded-3xl max-w-2xl w-full p-6 space-y-5 text-white shadow-2xl max-h-[85vh] overflow-y-auto">
              <div className="flex justify-between items-start border-b border-white/10 pb-4">
                <div>
                  <h3 className="font-heading text-lg text-white uppercase tracking-tight">
                    {asset.name} - 4-Year Depreciation Schedule
                  </h3>
                  <p className="text-[10px] text-brand-teal font-mono uppercase tracking-widest mt-0.5">
                    Cost: ₹{asset.purchase_cost.toLocaleString()} • Salvage: ₹{asset.salvage_value.toLocaleString()} • Monthly: ₹{monthlyDep.toLocaleString()}
                  </p>
                </div>
                <button 
                  onClick={() => setSelectedAssetForSchedule(null)}
                  className="text-white/40 hover:text-white text-sm font-bold"
                >
                  ✕
                </button>
              </div>

              <div className="overflow-x-auto rounded-2xl border border-white/10">
                <table className="w-full text-left text-xs">
                  <thead className="bg-white/5 text-[9px] font-black uppercase tracking-widest text-white/50 border-b border-white/10">
                    <tr>
                      <th className="py-2.5 px-3">Year</th>
                      <th className="py-2.5 px-3 text-right">Opening Book Value</th>
                      <th className="py-2.5 px-3 text-right">Annual Depreciation</th>
                      <th className="py-2.5 px-3 text-right">Closing Book Value</th>
                      <th className="py-2.5 px-3 text-right">Accumulated Dep.</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 font-mono">
                    {Array.from({ length: yearsCount }).map((_, idx) => {
                      const yr = purchaseY + idx;
                      const monthsInYear = Math.min(12, asset.useful_life_months - (idx * 12));
                      const yrDep = monthlyDep * monthsInYear;
                      const priorDep = monthlyDep * (idx * 12);
                      const openingBook = asset.purchase_cost - priorDep;
                      const closingBook = Math.max(asset.salvage_value, openingBook - yrDep);

                      return (
                        <tr key={idx} className="hover:bg-white/[0.02]">
                          <td className="py-2.5 px-3 font-bold text-white">Year {idx + 1} ({yr})</td>
                          <td className="py-2.5 px-3 text-right text-white/70">₹{openingBook.toLocaleString()}</td>
                          <td className="py-2.5 px-3 text-right text-brand-orange font-bold">₹{yrDep.toLocaleString()}</td>
                          <td className="py-2.5 px-3 text-right text-brand-teal font-bold">₹{closingBook.toLocaleString()}</td>
                          <td className="py-2.5 px-3 text-right text-white/50">₹{(priorDep + yrDep).toLocaleString()}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="flex justify-end">
                <button
                  onClick={() => setSelectedAssetForSchedule(null)}
                  className="px-5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold uppercase tracking-wider"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Edit Asset Modal */}
      {editingAsset && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-brand-gray-dark border border-white/10 rounded-3xl max-w-lg w-full p-6 space-y-5 text-white shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-white/10 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-brand-teal/20 text-brand-teal flex items-center justify-center">
                  <Pencil className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-heading text-lg text-white uppercase tracking-tight">Edit Fleet Asset</h3>
                  <p className="text-[10px] text-brand-teal font-mono font-bold mt-0.5">
                    {editingAsset.name}
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setEditingAsset(null)}
                className="text-white/40 hover:text-white text-sm font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[9px] font-black uppercase text-white/50 tracking-widest">Asset Name / Vehicle Plate</label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={e => setEditName(e.target.value)}
                  className="w-full p-3 bg-black/40 border border-white/10 rounded-xl text-sm font-bold text-white outline-none focus:border-brand-teal"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[9px] font-black uppercase text-white/50 tracking-widest">Category</label>
                  <select
                    value={editCategory}
                    onChange={e => setEditCategory(e.target.value as any)}
                    className="w-full p-2.5 bg-black/40 border border-white/10 rounded-xl text-xs text-white outline-none focus:border-brand-teal"
                  >
                    <option value="VEHICLE">Vehicle (Bike / Scooter)</option>
                    <option value="GPS_IOT">GPS / IoT Tracker Unit</option>
                    <option value="GARAGE_EQUIPMENT">Garage & Tooling Equipment</option>
                    <option value="OFFICE_TECH">Tech / Mobile Devices</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] font-black uppercase text-white/50 tracking-widest">Asset Status</label>
                  <select
                    value={editStatus}
                    onChange={e => setEditStatus(e.target.value as any)}
                    className="w-full p-2.5 bg-black/40 border border-white/10 rounded-xl text-xs text-white outline-none focus:border-brand-teal"
                  >
                    <option value="ACTIVE">ACTIVE (In Service)</option>
                    <option value="SOLD">SOLD (Disposed)</option>
                    <option value="SCRAPPED">SCRAPPED (Retired)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[9px] font-black uppercase text-white/50 tracking-widest">Purchase Date</label>
                  <input
                    type="date"
                    required
                    value={editPurchaseDate}
                    onChange={e => setEditPurchaseDate(e.target.value)}
                    className="w-full p-2.5 bg-black/40 border border-white/10 rounded-xl text-xs text-white outline-none focus:border-brand-teal"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] font-black uppercase text-white/50 tracking-widest">Purchase Cost (₹)</label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={editPurchaseCost}
                    onChange={e => setEditPurchaseCost(parseFloat(e.target.value) || 0)}
                    className="w-full p-2.5 bg-black/40 border border-white/10 rounded-xl text-xs font-mono font-bold text-white outline-none focus:border-brand-teal"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[9px] font-black uppercase text-white/50 tracking-widest">Salvage / Scrap Value (₹)</label>
                  <input
                    type="number"
                    min="0"
                    value={editSalvageValue}
                    onChange={e => setEditSalvageValue(parseFloat(e.target.value) || 0)}
                    className="w-full p-2.5 bg-black/40 border border-white/10 rounded-xl text-xs font-mono font-bold text-white outline-none focus:border-brand-teal"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] font-black uppercase text-white/50 tracking-widest">Useful Life (Months)</label>
                  <input
                    type="number"
                    min="6"
                    max="120"
                    value={editUsefulLifeMonths}
                    onChange={e => setEditUsefulLifeMonths(parseInt(e.target.value) || 48)}
                    className="w-full p-2.5 bg-black/40 border border-white/10 rounded-xl text-xs font-mono font-bold text-white outline-none focus:border-brand-teal"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[9px] font-black uppercase text-white/50 tracking-widest">Depreciation Method</label>
                  <select
                    value={editDepreciationMethod}
                    onChange={e => setEditDepreciationMethod(e.target.value as any)}
                    className="w-full p-2.5 bg-black/40 border border-white/10 rounded-xl text-xs text-white outline-none focus:border-brand-teal"
                  >
                    <option value="SLM">Straight Line (SLM)</option>
                    <option value="WDV">Written Down Value (WDV)</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] font-black uppercase text-white/50 tracking-widest">Annual Dep. Rate (%)</label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    step="0.1"
                    value={editAnnualRate}
                    onChange={e => setEditAnnualRate(parseFloat(e.target.value) || 20)}
                    className="w-full p-2.5 bg-black/40 border border-white/10 rounded-xl text-xs font-mono font-bold text-white outline-none focus:border-brand-teal"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[9px] font-black uppercase text-white/50 tracking-widest">Notes & Remarks</label>
                <textarea
                  rows={2}
                  value={editNotes}
                  onChange={e => setEditNotes(e.target.value)}
                  placeholder="Registration number, insurance details, engine/chassis no."
                  className="w-full p-2.5 bg-black/40 border border-white/10 rounded-xl text-xs text-white outline-none focus:border-brand-teal"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setEditingAsset(null)}
                  className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white text-xs font-bold uppercase tracking-wider cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUpdating}
                  className="px-5 py-2 rounded-xl bg-brand-teal hover:bg-brand-teal/80 text-black text-xs font-black uppercase tracking-wider shadow-lg shadow-brand-teal/20 cursor-pointer disabled:opacity-50"
                >
                  {isUpdating ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Asset Confirmation Modal */}
      {assetToDelete && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-brand-gray-dark border border-white/10 rounded-3xl max-w-md w-full p-6 space-y-5 text-white shadow-2xl">
            <div className="flex items-center gap-3 border-b border-white/10 pb-4">
              <div className="w-10 h-10 rounded-2xl bg-red-500/20 text-red-400 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-heading text-lg text-white uppercase tracking-tight">Delete Asset</h3>
                <p className="text-[10px] text-white/40 font-mono mt-0.5">
                  Confirm permanent removal from asset register
                </p>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-black/40 border border-white/5 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-white/50">Asset:</span>
                <span className="font-bold text-white">{assetToDelete.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-white/50">Purchase Cost:</span>
                <span className="font-mono text-white">₹{assetToDelete.purchase_cost.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-white/50">Acquisition Date:</span>
                <span className="font-mono text-white/70">{assetToDelete.purchase_date}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-white/50">Status:</span>
                <span className="font-bold text-brand-teal">{assetToDelete.status || 'ACTIVE'}</span>
              </div>
            </div>

            <p className="text-xs text-white/60 leading-relaxed">
              Are you sure you want to delete <b className="text-white">{assetToDelete.name}</b>? This will remove the asset from Supabase table <code className="text-brand-teal">finance_assets</code> and the local cache.
            </p>

            <div className="flex justify-end gap-2.5 pt-3 border-t border-white/10">
              <button
                type="button"
                onClick={() => setAssetToDelete(null)}
                className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white text-xs font-bold uppercase tracking-wider cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                className="px-5 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-black uppercase tracking-wider shadow-lg shadow-red-600/30 flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{isDeleting ? 'Deleting...' : 'Confirm Delete'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
