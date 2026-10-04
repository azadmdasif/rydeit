import React, { useState } from 'react';
import { CapexAsset, LedgerEntry } from './types';
import { calculateRangeDepreciation } from './depreciationUtils';
import { 
  TrendingUp, 
  TrendingDown, 
  Download, 
  Printer, 
  ChevronDown, 
  ChevronRight, 
  Wrench, 
  Building2, 
  Wallet, 
  ArrowDownLeft, 
  ArrowUpRight,
  Sparkles,
  PieChart as PieIcon,
  Percent
} from 'lucide-react';

interface PnLStatementProps {
  entries: LedgerEntry[];
  assets: CapexAsset[];
  dateRange: { start: string; end: string };
  tabName: string;
}

export const PnLStatement: React.FC<PnLStatementProps> = ({
  entries,
  assets,
  dateRange,
  tabName
}) => {
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    revenue: true,
    fleetDirect: true,
    overheads: true,
    depreciation: true,
    cashInflows: false,
    cashOutflows: false
  });

  const toggleSection = (s: string) => {
    setExpandedSections(prev => ({ ...prev, [s]: !prev[s] }));
  };

  // Filter entries in range
  const rangeEntries = entries.filter(e => e.date >= dateRange.start && e.date <= dateRange.end && !e.is_deleted && !e.is_opening);

  // Group revenues
  let rentalRev = 0;
  let deliveryRev = 0;
  let penaltyRev = 0;
  let accessoryRev = 0;
  let otherRev = 0;

  // Group Direct Fleet OpEx (COGS equivalent)
  let servicingExp = 0;
  let tiresExp = 0;
  let sparePartsExp = 0;
  let batteryChargingExp = 0;
  let detailingExp = 0;
  let fuelExp = 0;

  // Group Fixed Overheads
  let rentExp = 0;
  let salaryExp = 0;
  let insuranceExp = 0;
  let fitnessPucExp = 0;
  let gpsSoftwareExp = 0;
  let marketingExp = 0;
  let utilitiesExp = 0;
  let otherOverheadsExp = 0;

  // Cash flow tracking
  let cashInflows = 0;
  let cashOutflows = 0;
  let capexCashOutflow = 0;

  rangeEntries.forEach(e => {
    const crAmount = (e.credit_cash || 0) + (e.credit_bank || 0);
    const dbAmount = (e.debit_cash || 0) + (e.debit_bank || 0);
    const cat = (e.category || '').toLowerCase();
    const notes = (e.notes || '').toLowerCase();

    if (crAmount > 0) {
      cashInflows += crAmount;
      if (cat.includes('rental') || cat.includes('booking') || cat === 'revenue') {
        rentalRev += crAmount;
      } else if (cat.includes('delivery')) {
        deliveryRev += crAmount;
      } else if (cat.includes('late') || cat.includes('penalty') || cat.includes('damage')) {
        penaltyRev += crAmount;
      } else if (cat.includes('helmet') || cat.includes('accessory')) {
        accessoryRev += crAmount;
      } else if (!cat.includes('investment') && !cat.includes('loan') && !cat.includes('deposit')) {
        otherRev += crAmount;
      }
    }

    if (dbAmount > 0) {
      cashOutflows += dbAmount;
      if (cat.includes('bike & scooter purchase') || cat.includes('gps tracker') || cat.includes('garage equipment') || e.funding_source === 'capital_investment') {
        capexCashOutflow += dbAmount;
      } else if (cat.includes('servicing') || cat.includes('oil')) {
        servicingExp += dbAmount;
      } else if (cat.includes('tire') || cat.includes('puncture')) {
        tiresExp += dbAmount;
      } else if (cat.includes('spare') || cat.includes('brake')) {
        sparePartsExp += dbAmount;
      } else if (cat.includes('battery') || cat.includes('charging')) {
        batteryChargingExp += dbAmount;
      } else if (cat.includes('bodywork') || cat.includes('washing') || cat.includes('detail')) {
        detailingExp += dbAmount;
      } else if (cat.includes('fuel') || cat.includes('transport')) {
        fuelExp += dbAmount;
      } else if (cat.includes('rent') || cat.includes('garage')) {
        rentExp += dbAmount;
      } else if (cat.includes('salary') || cat.includes('wage') || cat.includes('mechanic')) {
        salaryExp += dbAmount;
      } else if (cat.includes('insurance')) {
        insuranceExp += dbAmount;
      } else if (cat.includes('puc') || cat.includes('fitness')) {
        fitnessPucExp += dbAmount;
      } else if (cat.includes('gps & software') || cat.includes('subscription')) {
        gpsSoftwareExp += dbAmount;
      } else if (cat.includes('marketing') || cat.includes('ad')) {
        marketingExp += dbAmount;
      } else if (cat.includes('utility') || cat.includes('electricity')) {
        utilitiesExp += dbAmount;
      } else if (!cat.includes('deposit refund') && !cat.includes('loan emi')) {
        otherOverheadsExp += dbAmount;
      }
    }
  });

  const grossRevenue = rentalRev + deliveryRev + penaltyRev + accessoryRev + otherRev;
  const directFleetCosts = servicingExp + tiresExp + sparePartsExp + batteryChargingExp + detailingExp + fuelExp;
  const contributionMargin1 = grossRevenue - directFleetCosts;
  const cm1Pct = grossRevenue > 0 ? (contributionMargin1 / grossRevenue) * 100 : 0;

  const totalOverheads = rentExp + salaryExp + insuranceExp + fitnessPucExp + gpsSoftwareExp + marketingExp + utilitiesExp + otherOverheadsExp;
  const ebitda = contributionMargin1 - totalOverheads;
  const ebitdaPct = grossRevenue > 0 ? (ebitda / grossRevenue) * 100 : 0;

  // Depreciation for the period
  const { totalDepreciation, assetBreakdown } = calculateRangeDepreciation(assets, dateRange.start, dateRange.end);
  const ebit = ebitda - totalDepreciation;
  const netMarginPct = grossRevenue > 0 ? (ebit / grossRevenue) * 100 : 0;

  const exportPnlCSV = () => {
    const lines = [
      ['RYDEIT BIKE RENTALS - P&L STATEMENT'],
      ['Reporting Period', `${dateRange.start} to ${dateRange.end}`],
      ['Generated At', new Date().toLocaleString()],
      [''],
      ['LINE ITEM', 'AMOUNT (INR)', '% OF REVENUE'],
      ['1. GROSS REVENUE', grossRevenue, '100%'],
      ['  Rental Booking Revenue', rentalRev, grossRevenue ? `${((rentalRev / grossRevenue) * 100).toFixed(1)}%` : '0%'],
      ['  Delivery & Pickup Charges', deliveryRev, grossRevenue ? `${((deliveryRev / grossRevenue) * 100).toFixed(1)}%` : '0%'],
      ['  Late Fee & Damage Penalties', penaltyRev, grossRevenue ? `${((penaltyRev / grossRevenue) * 100).toFixed(1)}%` : '0%'],
      ['  Accessories & Helmet Rentals', accessoryRev, grossRevenue ? `${((accessoryRev / grossRevenue) * 100).toFixed(1)}%` : '0%'],
      ['  Other Revenue', otherRev, grossRevenue ? `${((otherRev / grossRevenue) * 100).toFixed(1)}%` : '0%'],
      [''],
      ['2. DIRECT FLEET RUNNING COSTS (COGS)', -directFleetCosts, grossRevenue ? `${((directFleetCosts / grossRevenue) * 100).toFixed(1)}%` : '0%'],
      ['  Servicing & Engine Oil', -servicingExp, ''],
      ['  Tires & Puncture Repairs', -tiresExp, ''],
      ['  Spare Parts & Brake Pads', -sparePartsExp, ''],
      ['  Battery & EV Charging', -batteryChargingExp, ''],
      ['  Bodywork & Detailing', -detailingExp, ''],
      ['  Fuel & Logistics', -fuelExp, ''],
      [''],
      ['CONTRIBUTION MARGIN 1 (CM1)', contributionMargin1, `${cm1Pct.toFixed(1)}%`],
      [''],
      ['3. FIXED OVERHEADS & OPERATING COSTS', -totalOverheads, grossRevenue ? `${((totalOverheads / grossRevenue) * 100).toFixed(1)}%` : '0%'],
      ['  Hub & Garage Rent', -rentExp, ''],
      ['  Staff Salaries & Mechanics', -salaryExp, ''],
      ['  Insurance Renewals', -insuranceExp, ''],
      ['  PUC & RTO Commercial Fitness', -fitnessPucExp, ''],
      ['  GPS SIM & Software Platform', -gpsSoftwareExp, ''],
      ['  Marketing & Ads', -marketingExp, ''],
      ['  Hub Utilities & Office', -utilitiesExp, ''],
      [''],
      ['EBITDA', ebitda, `${ebitdaPct.toFixed(1)}%`],
      [''],
      ['4. FLEET DEPRECIATION & AMORTIZATION (D&A)', -totalDepreciation, grossRevenue ? `${((totalDepreciation / grossRevenue) * 100).toFixed(1)}%` : '0%'],
      [''],
      ['NET OPERATING PROFIT (EBIT)', ebit, `${netMarginPct.toFixed(1)}%`]
    ];

    const csvContent = 'data:text/csv;charset=utf-8,' + lines.map(r => r.join(',')).join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Rydeit_PnL_${dateRange.start}_${dateRange.end}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-brand-gray-dark/80 p-6 rounded-3xl border border-white/5">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-brand-orange animate-pulse"></span>
            <h3 className="font-heading text-xl text-white uppercase tracking-tight">Executive P&L Statement</h3>
            <span className="px-2 py-0.5 rounded-full bg-brand-orange/10 text-brand-orange text-[9px] font-black uppercase tracking-widest border border-brand-orange/20">
              Accrual & D&A
            </span>
          </div>
          <p className="text-white/40 text-[10px] font-bold mt-1 uppercase tracking-wider">
            Period: {dateRange.start} to {dateRange.end} • D&A charges allocated from {assets.length} fleet assets
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={exportPnlCSV}
            className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white text-[10px] font-black uppercase tracking-wider flex items-center gap-2 border border-white/10 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-brand-teal" />
            <span>Export CSV</span>
          </button>
          <button
            onClick={() => window.print()}
            className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white text-[10px] font-black uppercase tracking-wider flex items-center gap-2 border border-white/10 cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5 text-brand-yellow" />
            <span>Print</span>
          </button>
        </div>
      </div>

      {/* Top 4 KPI Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 bg-brand-gray-dark/60 rounded-3xl border border-white/5 space-y-1">
          <span className="text-[9px] font-black text-white/40 uppercase tracking-widest">Gross Revenue</span>
          <p className="text-2xl font-heading text-white">₹{grossRevenue.toLocaleString('en-IN')}</p>
          <span className="text-[9px] text-brand-teal font-bold block">100% Turnover</span>
        </div>

        <div className="p-5 bg-brand-gray-dark/60 rounded-3xl border border-white/5 space-y-1">
          <span className="text-[9px] font-black text-white/40 uppercase tracking-widest">Contrib. Margin 1 (CM1)</span>
          <p className="text-2xl font-heading text-brand-teal">₹{contributionMargin1.toLocaleString('en-IN')}</p>
          <span className="text-[9px] text-white/40 font-bold block">{cm1Pct.toFixed(1)}% of Revenue</span>
        </div>

        <div className="p-5 bg-brand-gray-dark/60 rounded-3xl border border-white/5 space-y-1">
          <span className="text-[9px] font-black text-white/40 uppercase tracking-widest">Fleet Depreciation (D&A)</span>
          <p className="text-2xl font-heading text-brand-yellow">₹{totalDepreciation.toLocaleString('en-IN')}</p>
          <span className="text-[9px] text-white/40 font-bold block">Non-cash asset wear</span>
        </div>

        <div className={`p-5 rounded-3xl border space-y-1 ${ebit >= 0 ? 'bg-emerald-950/20 border-emerald-500/30' : 'bg-red-950/20 border-red-500/30'}`}>
          <span className="text-[9px] font-black uppercase tracking-widest text-white/40">Net Operating Profit (EBIT)</span>
          <p className={`text-2xl font-heading ${ebit >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
            {ebit >= 0 ? '+' : ''}₹{ebit.toLocaleString('en-IN')}
          </p>
          <span className={`text-[9px] font-bold block ${ebit >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
            {netMarginPct.toFixed(1)}% Net Margin
          </span>
        </div>
      </div>

      {/* Main Accrual Waterfall Statement */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          {/* Section 1: Gross Income */}
          <div className="bg-brand-gray-dark/60 rounded-3xl border border-white/5 overflow-hidden">
            <button
              onClick={() => toggleSection('revenue')}
              className="w-full p-4 flex justify-between items-center text-left hover:bg-white/[0.02]"
            >
              <div className="flex items-center gap-3">
                {expandedSections.revenue ? <ChevronDown className="w-4 h-4 text-brand-teal" /> : <ChevronRight className="w-4 h-4 text-brand-teal" />}
                <span className="font-heading text-sm text-white uppercase tracking-wider">1. Gross Rental Revenue</span>
              </div>
              <span className="font-mono font-bold text-brand-teal text-sm">₹{grossRevenue.toLocaleString('en-IN')}</span>
            </button>

            {expandedSections.revenue && (
              <div className="p-4 pt-0 space-y-2 border-t border-white/5 text-xs">
                <div className="flex justify-between text-white/70 py-1">
                  <span>Bike Rental Bookings</span>
                  <span className="font-mono font-bold text-white">₹{rentalRev.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between text-white/70 py-1">
                  <span>Home Delivery & Pickup Fees</span>
                  <span className="font-mono font-bold text-white">₹{deliveryRev.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between text-white/70 py-1">
                  <span>Late Returns & Damage Recovery</span>
                  <span className="font-mono font-bold text-white">₹{penaltyRev.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between text-white/70 py-1">
                  <span>Helmet & Riding Accessories</span>
                  <span className="font-mono font-bold text-white">₹{accessoryRev.toLocaleString('en-IN')}</span>
                </div>
                {otherRev > 0 && (
                  <div className="flex justify-between text-white/70 py-1">
                    <span>Other Operational Revenue</span>
                    <span className="font-mono font-bold text-white">₹{otherRev.toLocaleString('en-IN')}</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Section 2: Fleet Direct Running Costs */}
          <div className="bg-brand-gray-dark/60 rounded-3xl border border-white/5 overflow-hidden">
            <button
              onClick={() => toggleSection('fleetDirect')}
              className="w-full p-4 flex justify-between items-center text-left hover:bg-white/[0.02]"
            >
              <div className="flex items-center gap-3">
                {expandedSections.fleetDirect ? <ChevronDown className="w-4 h-4 text-brand-orange" /> : <ChevronRight className="w-4 h-4 text-brand-orange" />}
                <span className="font-heading text-sm text-white uppercase tracking-wider">2. Direct Fleet Running Costs (COGS)</span>
              </div>
              <span className="font-mono font-bold text-brand-orange text-sm">-₹{directFleetCosts.toLocaleString('en-IN')}</span>
            </button>

            {expandedSections.fleetDirect && (
              <div className="p-4 pt-0 space-y-2 border-t border-white/5 text-xs">
                <div className="flex justify-between text-white/70 py-1">
                  <span>Scheduled Servicing & Engine Oil</span>
                  <span className="font-mono font-bold text-white">-₹{servicingExp.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between text-white/70 py-1">
                  <span>Tires & Puncture Repairs</span>
                  <span className="font-mono font-bold text-white">-₹{tiresExp.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between text-white/70 py-1">
                  <span>Spare Parts & Brake Pads</span>
                  <span className="font-mono font-bold text-white">-₹{sparePartsExp.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between text-white/70 py-1">
                  <span>Battery Replacements & EV Charging</span>
                  <span className="font-mono font-bold text-white">-₹{batteryChargingExp.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between text-white/70 py-1">
                  <span>Vehicle Washing & Body Detailing</span>
                  <span className="font-mono font-bold text-white">-₹{detailingExp.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between text-white/70 py-1">
                  <span>Delivery Run Petrol & Towing</span>
                  <span className="font-mono font-bold text-white">-₹{fuelExp.toLocaleString('en-IN')}</span>
                </div>
              </div>
            )}
          </div>

          {/* CM1 Bar */}
          <div className="p-4 bg-brand-teal/10 rounded-2xl border border-brand-teal/20 flex justify-between items-center text-xs">
            <div>
              <span className="font-heading text-white uppercase tracking-wider text-sm block">Contribution Margin 1 (CM1)</span>
              <span className="text-[9px] text-brand-teal font-bold">Revenue after direct fleet wear & servicing</span>
            </div>
            <span className="font-mono font-bold text-brand-teal text-base">₹{contributionMargin1.toLocaleString('en-IN')}</span>
          </div>

          {/* Section 3: Fixed Overheads */}
          <div className="bg-brand-gray-dark/60 rounded-3xl border border-white/5 overflow-hidden">
            <button
              onClick={() => toggleSection('overheads')}
              className="w-full p-4 flex justify-between items-center text-left hover:bg-white/[0.02]"
            >
              <div className="flex items-center gap-3">
                {expandedSections.overheads ? <ChevronDown className="w-4 h-4 text-brand-yellow" /> : <ChevronRight className="w-4 h-4 text-brand-yellow" />}
                <span className="font-heading text-sm text-white uppercase tracking-wider">3. Fixed Overheads & Administrative OpEx</span>
              </div>
              <span className="font-mono font-bold text-brand-yellow text-sm">-₹{totalOverheads.toLocaleString('en-IN')}</span>
            </button>

            {expandedSections.overheads && (
              <div className="p-4 pt-0 space-y-2 border-t border-white/5 text-xs">
                <div className="flex justify-between text-white/70 py-1">
                  <span>Hub & Central Garage Rent</span>
                  <span className="font-mono font-bold text-white">-₹{rentExp.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between text-white/70 py-1">
                  <span>Staff Salaries & Mechanic Wages</span>
                  <span className="font-mono font-bold text-white">-₹{salaryExp.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between text-white/70 py-1">
                  <span>Commercial Vehicle Insurance</span>
                  <span className="font-mono font-bold text-white">-₹{insuranceExp.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between text-white/70 py-1">
                  <span>PUC & RTO Fitness Certifications</span>
                  <span className="font-mono font-bold text-white">-₹{fitnessPucExp.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between text-white/70 py-1">
                  <span>GPS Tracking SIMs & Software</span>
                  <span className="font-mono font-bold text-white">-₹{gpsSoftwareExp.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between text-white/70 py-1">
                  <span>Local Promotion & Ads</span>
                  <span className="font-mono font-bold text-white">-₹{marketingExp.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between text-white/70 py-1">
                  <span>Hub Utilities & Wi-Fi</span>
                  <span className="font-mono font-bold text-white">-₹{utilitiesExp.toLocaleString('en-IN')}</span>
                </div>
              </div>
            )}
          </div>

          {/* Section 4: Depreciation D&A */}
          <div className="bg-brand-gray-dark/60 rounded-3xl border border-white/5 overflow-hidden">
            <button
              onClick={() => toggleSection('depreciation')}
              className="w-full p-4 flex justify-between items-center text-left hover:bg-white/[0.02]"
            >
              <div className="flex items-center gap-3">
                {expandedSections.depreciation ? <ChevronDown className="w-4 h-4 text-purple-400" /> : <ChevronRight className="w-4 h-4 text-purple-400" />}
                <div>
                  <span className="font-heading text-sm text-white uppercase tracking-wider block">4. Fleet Depreciation (D&A)</span>
                  <span className="text-[9px] text-white/40 font-mono">From CapEx Asset Register ({assetBreakdown.length} active units)</span>
                </div>
              </div>
              <span className="font-mono font-bold text-purple-400 text-sm">-₹{totalDepreciation.toLocaleString('en-IN')}</span>
            </button>

            {expandedSections.depreciation && (
              <div className="p-4 pt-0 space-y-1.5 border-t border-white/5 text-xs max-h-48 overflow-y-auto">
                {assetBreakdown.map(item => (
                  <div key={item.assetId} className="flex justify-between text-white/70 py-1">
                    <span className="truncate pr-2">{item.name}</span>
                    <span className="font-mono font-bold text-purple-400 whitespace-nowrap">-₹{item.amount.toLocaleString('en-IN')}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Final Net Operating Profit EBIT Card */}
          <div className={`p-6 rounded-3xl border text-white space-y-2 ${ebit >= 0 ? 'bg-gradient-to-r from-emerald-950/80 to-brand-gray-dark border-emerald-500/40' : 'bg-gradient-to-r from-red-950/80 to-brand-gray-dark border-red-500/40'}`}>
            <div className="flex justify-between items-center">
              <div>
                <span className="text-[10px] font-black uppercase tracking-widest text-white/60">Bottom Line</span>
                <h4 className="font-heading text-2xl text-white uppercase tracking-tight">Accrual Net Operating Profit (EBIT)</h4>
              </div>
              <p className={`text-3xl font-heading font-bold ${ebit >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                {ebit >= 0 ? '+' : ''}₹{ebit.toLocaleString('en-IN')}
              </p>
            </div>
            <div className="flex justify-between items-center text-xs pt-2 border-t border-white/10 text-white/60">
              <span>Operating Profit Margin Ratio</span>
              <span className="font-mono font-bold text-white">{netMarginPct.toFixed(2)}% of Gross Revenue</span>
            </div>
          </div>
        </div>

        {/* Cash Flow Accounting Summary */}
        <div className="space-y-4">
          <div className="bg-brand-gray-dark/60 rounded-3xl border border-white/5 p-5 space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-white/5">
              <Wallet className="w-4 h-4 text-brand-teal" />
              <h4 className="font-heading text-sm text-white uppercase tracking-wider">Cash Flow vs Accrual</h4>
            </div>

            <p className="text-[10px] text-white/50 leading-relaxed">
              While P&L records vehicle purchase cost as monthly <b>depreciation</b>, cash flow records physical money entering and leaving bank & cash registers.
            </p>

            <div className="space-y-3 text-xs">
              <div className="p-3 rounded-2xl bg-white/[0.02] border border-white/5 space-y-1">
                <span className="text-[9px] font-black uppercase tracking-wider text-emerald-400">Total Liquid Inflows</span>
                <p className="text-lg font-mono font-bold text-white">₹{cashInflows.toLocaleString('en-IN')}</p>
                <span className="text-[8px] text-white/30 block">Cash + Bank receipts</span>
              </div>

              <div className="p-3 rounded-2xl bg-white/[0.02] border border-white/5 space-y-1">
                <span className="text-[9px] font-black uppercase tracking-wider text-red-400">Total Liquid Outflows</span>
                <p className="text-lg font-mono font-bold text-white">₹{cashOutflows.toLocaleString('en-IN')}</p>
                <span className="text-[8px] text-white/30 block">OpEx payments + CapEx vehicle buys</span>
              </div>

              {capexCashOutflow > 0 && (
                <div className="p-3 rounded-2xl bg-purple-950/20 border border-purple-500/20 space-y-1">
                  <span className="text-[9px] font-black uppercase tracking-wider text-purple-400">CapEx Cash Purchases</span>
                  <p className="text-base font-mono font-bold text-purple-300">₹{capexCashOutflow.toLocaleString('en-IN')}</p>
                  <span className="text-[8px] text-white/30 block">Asset acquisition disbursements</span>
                </div>
              )}

              <div className="p-3 rounded-2xl bg-brand-orange/10 border border-brand-orange/20 space-y-1">
                <span className="text-[9px] font-black uppercase tracking-wider text-brand-orange">Net Cash Movement</span>
                <p className="text-xl font-mono font-bold text-white">
                  {cashInflows - cashOutflows >= 0 ? '+' : ''}₹{(cashInflows - cashOutflows).toLocaleString('en-IN')}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
