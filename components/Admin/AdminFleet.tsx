import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../../supabase';
import { useToast } from '../../App';
import { Modal } from '../Modal';
import { 
  getFleetBikes, 
  syncFleetWithSupabase,
  checkSupabaseBikesTable,
  saveFleetBike, 
  deleteFleetBike,
  addFleetBike,
  getStoredMaintenanceLogs, 
  addMaintenanceLog, 
  deleteMaintenanceLog,
  SUPABASE_FLEET_SQL
} from '../../fleetStorage';
import type { Bike, BikeCategory, MaintenanceLog } from '../../types';

type SortKey = 'name' | 'revenue' | 'netProfit' | 'dailyRate' | 'odometer' | 'rides';
type StatusFilter = 'ALL' | 'AVAILABLE' | 'RUNNING' | 'MAINTENANCE';

interface FleetBikeItem extends Bike {
  operationalStatus: 'AVAILABLE' | 'RUNNING' | 'MAINTENANCE';
  rideCount: number;
  revenue: number;
  maintCost: number;
  netRevenue: number;
  currentOdometer: number;
  futureRides: any[];
  maintenanceRecords: MaintenanceLog[];
}

export const AdminFleet: React.FC = () => {
  const { showToast } = useToast();
  const [fleetStats, setFleetStats] = useState<FleetBikeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');

  const [dbStatus, setDbStatus] = useState<{ checked: boolean; exists: boolean; count: number }>({
    checked: false,
    exists: false,
    count: 0
  });

  // Modals state
  const [showSqlModal, setShowSqlModal] = useState(false);
  const [sqlCopied, setSqlCopied] = useState(false);

  const [editingBike, setEditingBike] = useState<FleetBikeItem | null>(null);
  const [editFormData, setEditFormData] = useState({
    name: '',
    dailyRate: 700,
    imageUrl: '',
    rc_number: '',
    purchase_date: '',
    odometer_reading: 0,
    category: 'Scooter' as BikeCategory,
    status: 'Available' as Bike['status'],
    description: ''
  });

  const [deletingBike, setDeletingBike] = useState<FleetBikeItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const [showAddModal, setShowAddModal] = useState(false);
  const [addFormData, setAddFormData] = useState({
    name: '',
    dailyRate: 800,
    imageUrl: '/images/ather-450x.jpg',
    rc_number: '',
    purchase_date: new Date().toISOString().split('T')[0],
    purchase_cost: 95000,
    odometer_reading: 1000,
    category: 'Bikes' as BikeCategory,
    status: 'Available' as Bike['status'],
    description: ''
  });

  const [maintenanceBike, setMaintenanceBike] = useState<FleetBikeItem | null>(null);
  const [maintForm, setMaintForm] = useState({
    description: '',
    cost: 500,
    odo: '',
    date: new Date().toISOString().split('T')[0]
  });

  // Filter & Search State
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('All');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');
  const [sortKey, setSortKey] = useState<SortKey>('name');

  useEffect(() => {
    fetchFleetData();
    checkDb();

    const handleFleetUpdate = () => {
      fetchFleetData();
    };
    window.addEventListener('rydeit_fleet_updated', handleFleetUpdate);
    return () => window.removeEventListener('rydeit_fleet_updated', handleFleetUpdate);
  }, []);

  const checkDb = async () => {
    const status = await checkSupabaseBikesTable();
    setDbStatus({
      checked: true,
      exists: status.exists,
      count: status.count
    });
  };

  const fetchFleetData = async () => {
    setLoading(true);
    try {
      // 1. Sync bikes from Supabase if table is present
      const { bikes } = await syncFleetWithSupabase();

      // 2. Fetch bookings and maintenance for calculations
      const { data: bookings } = await supabase.from('bookings').select('*');
      const { data: remoteMaint } = await supabase.from('maintenance_logs').select('*');

      const localMaint = getStoredMaintenanceLogs();
      const allMaintLogs = [...localMaint];

      if (remoteMaint && remoteMaint.length > 0) {
        remoteMaint.forEach(rm => {
          if (!allMaintLogs.some(lm => lm.id === String(rm.id))) {
            allMaintLogs.push({
              id: String(rm.id),
              bike_id: rm.bike_id,
              description: rm.description,
              cost: Number(rm.cost) || 0,
              date: rm.date,
              odometer_reading: rm.odometer_reading ? Number(rm.odometer_reading) : undefined
            });
          }
        });
      }

      const stats: FleetBikeItem[] = bikes.map(bike => {
        const bikeBookings = bookings?.filter(b => b.bike_id === bike.id) || [];
        const validBookings = bikeBookings.filter(b => b.status !== 'cancelled');
        const bikeMaint = allMaintLogs.filter(m => m.bike_id === bike.id);
        
        const isRunning = bikeBookings.some(b => b.status === 'ongoing');
        
        const revenue = validBookings.reduce((acc, b) => acc + (Number(b.total_rent) || 0) + (Number(b.adjustment_amount) || 0), 0);
        const maintCost = bikeMaint.reduce((acc, m) => acc + (Number(m.cost) || 0), 0);
        
        const totalRentalDistance = bikeBookings.reduce((acc, b) => {
          if (b.start_odometer && b.end_odometer && b.end_odometer >= b.start_odometer) {
            return acc + (b.end_odometer - b.start_odometer);
          }
          return acc;
        }, 0);

        const baseOdo = Number(bike.odometer_reading) || 0;
        const currentOdometer = Math.max(baseOdo, baseOdo + totalRentalDistance);

        let operationalStatus: 'AVAILABLE' | 'RUNNING' | 'MAINTENANCE' = 'AVAILABLE';
        if (isRunning) {
          operationalStatus = 'RUNNING';
        } else if (bike.status === 'Maintenance') {
          operationalStatus = 'MAINTENANCE';
        }

        return {
          ...bike,
          operationalStatus,
          rideCount: validBookings.length,
          revenue,
          maintCost,
          netRevenue: revenue - maintCost,
          currentOdometer,
          maintenanceRecords: bikeMaint.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
          futureRides: bikeBookings.filter(b => 
            ['booking_confirmed', 'verifying_payment'].includes(b.status) && 
            new Date(b.pickup_date) >= new Date(new Date().setHours(0, 0, 0, 0))
          )
        };
      });

      setFleetStats(stats);
    } catch (err: any) {
      console.error('Error loading fleet:', err);
      showToast(err.message || 'Failed to load fleet data', 'error');
    } finally {
      setLoading(false);
    }
  };

  const filteredAndSortedFleet = useMemo(() => {
    return fleetStats
      .filter(bike => {
        const query = searchTerm.toLowerCase();
        const matchesSearch = 
          bike.name.toLowerCase().includes(query) || 
          (bike.rc_number && bike.rc_number.toLowerCase().includes(query)) ||
          bike.category.toLowerCase().includes(query);
        const matchesCategory = categoryFilter === 'All' || bike.category === categoryFilter;
        const matchesStatus = statusFilter === 'ALL' || bike.operationalStatus === statusFilter;
        return matchesSearch && matchesCategory && matchesStatus;
      })
      .sort((a, b) => {
        if (sortKey === 'name') return a.name.localeCompare(b.name);
        if (sortKey === 'revenue') return b.revenue - a.revenue;
        if (sortKey === 'netProfit') return b.netRevenue - a.netRevenue;
        if (sortKey === 'dailyRate') return b.dailyRate - a.dailyRate;
        if (sortKey === 'odometer') return b.currentOdometer - a.currentOdometer;
        if (sortKey === 'rides') return b.rideCount - a.rideCount;
        return 0;
      });
  }, [fleetStats, searchTerm, categoryFilter, statusFilter, sortKey]);

  // Overall metrics
  const fleetTotals = useMemo(() => {
    const totalRev = fleetStats.reduce((acc, b) => acc + b.revenue, 0);
    const totalMaint = fleetStats.reduce((acc, b) => acc + b.maintCost, 0);
    const totalRunning = fleetStats.filter(b => b.operationalStatus === 'RUNNING').length;
    return {
      revenue: totalRev,
      maintenance: totalMaint,
      netProfit: totalRev - totalMaint,
      count: fleetStats.length,
      running: totalRunning
    };
  }, [fleetStats]);

  // Open Edit Modal
  const handleOpenEditModal = (bike: FleetBikeItem) => {
    setEditingBike(bike);
    setEditFormData({
      name: bike.name,
      dailyRate: bike.dailyRate,
      imageUrl: bike.imageUrl,
      rc_number: bike.rc_number || `WB-02-${1000 + bike.id}`,
      purchase_date: bike.purchase_date || '2024-01-01',
      odometer_reading: bike.odometer_reading || bike.currentOdometer || 10000,
      category: bike.category,
      status: bike.status,
      description: bike.description || ''
    });
  };

  // Save Edit
  const handleSaveBikeEdits = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingBike) return;

    if (!editFormData.name.trim()) {
      showToast('Machine name is required', 'warning');
      return;
    }
    if (editFormData.dailyRate <= 0) {
      showToast('Please enter a valid daily rate', 'warning');
      return;
    }

    await saveFleetBike({
      id: editingBike.id,
      name: editFormData.name.trim(),
      dailyRate: Number(editFormData.dailyRate),
      imageUrl: editFormData.imageUrl.trim(),
      rc_number: editFormData.rc_number.trim().toUpperCase(),
      purchase_date: editFormData.purchase_date,
      odometer_reading: Number(editFormData.odometer_reading) || 0,
      category: editFormData.category,
      status: editFormData.status,
      description: editFormData.description.trim()
    });

    showToast(`Updated "${editFormData.name}" successfully!`, 'success');
    setEditingBike(null);
    fetchFleetData();
  };

  // Delete Bike Permanently
  const handleConfirmDelete = async () => {
    if (!deletingBike) return;
    setIsDeleting(true);
    try {
      await deleteFleetBike(deletingBike.id);
      showToast(`Machine "${deletingBike.name}" removed from website and database.`, 'info');
      setDeletingBike(null);
      fetchFleetData();
    } catch (err: any) {
      showToast(err.message || 'Failed to delete machine', 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  // Add New Bike
  const handleCreateNewBike = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addFormData.name.trim()) {
      showToast('Please enter machine name', 'warning');
      return;
    }

    try {
      await addFleetBike({
        name: addFormData.name.trim(),
        dailyRate: Number(addFormData.dailyRate),
        imageUrl: addFormData.imageUrl.trim() || '/images/ather-450x.jpg',
        rc_number: addFormData.rc_number.trim().toUpperCase() || `WB-02-NEW-${Math.floor(Math.random() * 9000 + 1000)}`,
        purchase_date: addFormData.purchase_date,
        purchase_cost: Number(addFormData.purchase_cost) || 0,
        odometer_reading: Number(addFormData.odometer_reading) || 0,
        category: addFormData.category,
        status: addFormData.status,
        description: addFormData.description.trim(),
        color: 'teal'
      });

      showToast(`Machine "${addFormData.name}" created and added to fleet!`, 'success');
      setShowAddModal(false);
      setAddFormData({
        name: '',
        dailyRate: 800,
        imageUrl: '/images/ather-450x.jpg',
        rc_number: '',
        purchase_date: new Date().toISOString().split('T')[0],
        purchase_cost: 95000,
        odometer_reading: 1000,
        category: 'Bikes',
        status: 'Available',
        description: ''
      });
      fetchFleetData();
    } catch (err: any) {
      showToast(err.message || 'Failed to create machine', 'error');
    }
  };

  // Open Maintenance Modal
  const handleOpenMaintenanceModal = (bike: FleetBikeItem) => {
    setMaintenanceBike(bike);
    setMaintForm({
      description: '',
      cost: 500,
      odo: String(bike.currentOdometer || ''),
      date: new Date().toISOString().split('T')[0]
    });
  };

  // Save Maintenance Record
  const handleLogMaintenance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!maintenanceBike || !maintForm.description.trim()) {
      showToast('Please enter service description', 'warning');
      return;
    }

    const costNum = Number(maintForm.cost);
    const odoNum = parseFloat(maintForm.odo) || undefined;

    await addMaintenanceLog({
      bike_id: maintenanceBike.id,
      description: maintForm.description.trim(),
      cost: costNum,
      date: maintForm.date,
      odometer_reading: odoNum
    });

    showToast(`Service record of ₹${costNum} saved for ${maintenanceBike.name}.`, 'success');
    setMaintForm({
      description: '',
      cost: 500,
      odo: '',
      date: new Date().toISOString().split('T')[0]
    });
    fetchFleetData();
  };

  // Copy SQL to clipboard
  const handleCopySql = () => {
    navigator.clipboard.writeText(SUPABASE_FLEET_SQL);
    setSqlCopied(true);
    showToast('SQL schema copied to clipboard!', 'success');
    setTimeout(() => setSqlCopied(false), 3000);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-24 px-4 sm:px-6">
      {/* 1. Sleek Header Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-white/5 pb-5">
        <div>
          <h1 className="text-2xl sm:text-3xl font-heading text-white tracking-tight">Fleet Inventory</h1>
          <p className="text-white/40 text-xs mt-0.5">
            Manage machines, rental rates, lifecycle metrics, and maintenance expenses
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Supabase Status Pill */}
          <button
            type="button"
            onClick={() => setShowSqlModal(true)}
            className={`px-3 py-1.5 rounded-lg text-[10px] font-bold tracking-wider transition-all flex items-center gap-1.5 cursor-pointer border ${
              dbStatus.exists 
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20' 
                : 'bg-brand-yellow/10 text-brand-yellow border-brand-yellow/30 hover:bg-brand-yellow/20'
            }`}
            title="Click to view or copy Supabase PostgreSQL schema"
          >
            <span className={`w-2 h-2 rounded-full ${dbStatus.exists ? 'bg-emerald-400' : 'bg-brand-yellow animate-pulse'}`}></span>
            <span>{dbStatus.exists ? 'Supabase Live' : 'Database SQL Setup'}</span>
          </button>

          {/* View Toggle */}
          <div className="flex bg-black/40 border border-white/10 rounded-lg p-0.5">
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-md transition-all cursor-pointer ${
                viewMode === 'grid' ? 'bg-white/15 text-white' : 'text-white/40 hover:text-white'
              }`}
              title="Cards Grid View"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
              </svg>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('table')}
              className={`p-1.5 rounded-md transition-all cursor-pointer ${
                viewMode === 'table' ? 'bg-white/15 text-white' : 'text-white/40 hover:text-white'
              }`}
              title="Compact Table View"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
              </svg>
            </button>
          </div>

          {/* Add Machine Button */}
          <button
            type="button"
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2 rounded-lg bg-brand-teal hover:bg-brand-teal/90 text-brand-black text-xs font-bold transition-all shadow-md shadow-brand-teal/20 cursor-pointer flex items-center gap-1.5"
          >
            <span>+ Add Machine</span>
          </button>
        </div>
      </div>

      {/* 2. Clean Fleet Stats Row (4 Uncluttered Metric Tiles) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-brand-gray-dark/40 border border-white/5 rounded-2xl p-4 flex flex-col justify-between">
          <span className="text-[10px] font-bold uppercase tracking-wider text-white/40">Total Fleet</span>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-heading text-white">{fleetTotals.count}</span>
            <span className="text-[10px] text-brand-teal font-medium">Vehicles</span>
          </div>
        </div>

        <div className="bg-brand-gray-dark/40 border border-white/5 rounded-2xl p-4 flex flex-col justify-between">
          <span className="text-[10px] font-bold uppercase tracking-wider text-white/40">Active On Road</span>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-heading text-emerald-400">{fleetTotals.running}</span>
            <span className="text-[10px] text-white/40">Trips Ongoing</span>
          </div>
        </div>

        <div className="bg-brand-gray-dark/40 border border-white/5 rounded-2xl p-4 flex flex-col justify-between">
          <span className="text-[10px] font-bold uppercase tracking-wider text-white/40">Total Rent Till Date</span>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-heading text-brand-yellow">₹{fleetTotals.revenue.toLocaleString()}</span>
            <span className="text-[10px] text-white/40">Booking Revenue</span>
          </div>
        </div>

        <div className="bg-brand-gray-dark/40 border border-white/5 rounded-2xl p-4 flex flex-col justify-between">
          <span className="text-[10px] font-bold uppercase tracking-wider text-white/40">Maintenance Expenses</span>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-heading text-brand-orange">₹{fleetTotals.maintenance.toLocaleString()}</span>
            <span className="text-[10px] text-white/40">Servicing Costs</span>
          </div>
        </div>
      </div>

      {/* 3. Streamlined Search & Filter Bar */}
      <div className="bg-brand-gray-dark/30 p-3 sm:p-4 rounded-2xl border border-white/5 flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        {/* Search */}
        <div className="relative flex-1">
          <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input 
            type="text" 
            placeholder="Search machine name or registration number..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-black/40 border border-white/10 rounded-xl py-2 pl-9 pr-3 text-xs text-white placeholder-white/30 outline-none focus:border-brand-teal transition-all"
          />
          {searchTerm && (
            <button 
              type="button" 
              onClick={() => setSearchTerm('')} 
              className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white text-xs"
            >
              ✕
            </button>
          )}
        </div>

        {/* Filter controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Category */}
          <select 
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs font-medium text-white outline-none cursor-pointer focus:border-brand-teal"
          >
            <option value="All">All Categories</option>
            <option value="Bikes">Bikes</option>
            <option value="Scooter">Scooters</option>
            <option value="Royal Enfield">Royal Enfield</option>
            <option value="Sports">Sports</option>
          </select>

          {/* Status */}
          <select 
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
            className="bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs font-medium text-white outline-none cursor-pointer focus:border-brand-teal"
          >
            <option value="ALL">All Statuses</option>
            <option value="AVAILABLE">Available</option>
            <option value="RUNNING">On Trip</option>
            <option value="MAINTENANCE">Maintenance</option>
          </select>

          {/* Sort */}
          <select 
            value={sortKey}
            onChange={(e) => setSortKey(e.target.value as SortKey)}
            className="bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs font-medium text-white outline-none cursor-pointer focus:border-brand-teal"
          >
            <option value="name">Sort: Name (A-Z)</option>
            <option value="dailyRate">Sort: Rent (High to Low)</option>
            <option value="revenue">Sort: Total Rent Till Date</option>
            <option value="odometer">Sort: Odometer Reading</option>
            <option value="rides">Sort: Ride Count</option>
          </select>
        </div>
      </div>

      {/* 4. Main Machine Display */}
      {loading ? (
        <div className="py-24 text-center">
          <div className="w-8 h-8 border-2 border-brand-teal/20 border-t-brand-teal rounded-full animate-spin mx-auto mb-3"></div>
          <p className="text-xs font-bold text-white/30 uppercase tracking-widest">Loading Fleet...</p>
        </div>
      ) : filteredAndSortedFleet.length === 0 ? (
        <div className="py-16 text-center bg-brand-gray-dark/20 border border-white/5 rounded-3xl p-8">
          <p className="text-white/40 font-heading text-lg">No Machines Found</p>
          <p className="text-white/20 text-xs mt-1">Try resetting the search or filter to see more vehicles.</p>
        </div>
      ) : viewMode === 'grid' ? (
        /* GRID VIEW (Decluttered, Modern Cards) */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredAndSortedFleet.map(bike => {
            const isRunning = bike.operationalStatus === 'RUNNING';
            const isWorkshop = bike.operationalStatus === 'MAINTENANCE';

            return (
              <div 
                key={bike.id} 
                className="bg-brand-gray-dark/40 hover:bg-brand-gray-dark/60 rounded-2xl border border-white/5 hover:border-brand-teal/30 p-5 flex flex-col justify-between transition-all duration-200 shadow-md group"
              >
                <div>
                  {/* Card Header: Category & Status */}
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-brand-teal bg-brand-teal/10 px-2 py-0.5 rounded-md border border-brand-teal/20">
                        {bike.category}
                      </span>
                      <span className="text-[10px] font-mono font-bold text-white/70 bg-black/50 px-2 py-0.5 rounded-md border border-white/10">
                        {bike.rc_number || `WB-02-${1000 + bike.id}`}
                      </span>
                    </div>

                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider border ${
                      isRunning 
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' 
                        : isWorkshop 
                        ? 'bg-brand-orange/10 text-brand-orange border-brand-orange/30' 
                        : 'bg-brand-teal/10 text-brand-teal border-brand-teal/30'
                    }`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${
                        isRunning ? 'bg-emerald-400 animate-pulse' : isWorkshop ? 'bg-brand-orange' : 'bg-brand-teal'
                      }`}></span>
                      {isRunning ? 'On Trip' : isWorkshop ? 'Workshop' : 'Ready'}
                    </span>
                  </div>

                  {/* Vehicle Image Container */}
                  <div className="relative aspect-[16/10] bg-black/40 rounded-xl overflow-hidden border border-white/5 mb-4 flex items-center justify-center">
                    <img 
                      src={bike.imageUrl} 
                      alt={bike.name} 
                      className="w-full h-full object-contain p-2 transition-transform duration-300 group-hover:scale-105" 
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = '/images/ather-450x.jpg';
                      }}
                    />
                    <div className="absolute top-2.5 right-2.5 bg-black/80 backdrop-blur-md px-2.5 py-1 rounded-lg border border-white/10">
                      <span className="text-xs font-heading text-brand-yellow font-bold">₹{bike.dailyRate}</span>
                      <span className="text-[9px] text-white/50 ml-1">/ day</span>
                    </div>
                  </div>

                  {/* Title */}
                  <div className="mb-3">
                    <h3 className="text-base font-bold text-white tracking-tight line-clamp-1">
                      {bike.name}
                    </h3>
                  </div>

                  {/* Clean 2x2 Metric Grid */}
                  <div className="grid grid-cols-2 gap-2 bg-black/40 p-3 rounded-xl border border-white/5 mb-4 text-xs">
                    <div>
                      <span className="text-[9px] uppercase tracking-wider text-white/40 block">Total Rent Till Date</span>
                      <span className="text-white font-heading text-sm font-bold">₹{bike.revenue.toLocaleString()}</span>
                    </div>
                    <div>
                      <span className="text-[9px] uppercase tracking-wider text-white/40 block">Maintenance Expenses</span>
                      <span className="text-brand-orange font-heading text-sm font-bold">₹{bike.maintCost.toLocaleString()}</span>
                    </div>
                    <div className="pt-1.5 border-t border-white/5">
                      <span className="text-[9px] uppercase tracking-wider text-white/40 block">Odometer</span>
                      <span className="text-white font-mono text-xs">{Math.round(bike.currentOdometer).toLocaleString()} km</span>
                    </div>
                    <div className="pt-1.5 border-t border-white/5">
                      <span className="text-[9px] uppercase tracking-wider text-white/40 block">Purchase Date</span>
                      <span className="text-white/80 font-mono text-xs">{bike.purchase_date || '2024-01-10'}</span>
                    </div>
                  </div>
                </div>

                {/* Card Actions */}
                <div className="flex items-center gap-2 pt-2 border-t border-white/5">
                  <button
                    type="button"
                    onClick={() => handleOpenEditModal(bike)}
                    className="flex-1 py-2 px-3 rounded-xl bg-white/5 hover:bg-brand-teal hover:text-brand-black text-white/80 text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 border border-white/10"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                    <span>Edit</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleOpenMaintenanceModal(bike)}
                    className="flex-1 py-2 px-3 rounded-xl bg-brand-orange/10 hover:bg-brand-orange hover:text-white text-brand-orange text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 border border-brand-orange/20"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    </svg>
                    <span>Service</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setDeletingBike(bike)}
                    className="p-2 rounded-xl bg-white/5 hover:bg-red-500 hover:text-white text-white/40 hover:border-red-500/30 border border-white/5 transition-all cursor-pointer"
                    title="Delete machine from website"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* TABLE VIEW (Minimalist, Data-Dense, Zero-Clutter) */
        <div className="bg-brand-gray-dark/30 border border-white/5 rounded-2xl overflow-hidden shadow-md">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-black/40 border-b border-white/5 text-[10px] uppercase font-bold text-white/40 tracking-wider">
                <tr>
                  <th className="py-3 px-4">Vehicle</th>
                  <th className="py-3 px-3">RC Number</th>
                  <th className="py-3 px-3">Category</th>
                  <th className="py-3 px-3">Daily Rent</th>
                  <th className="py-3 px-3">Total Rent</th>
                  <th className="py-3 px-3">Maintenance</th>
                  <th className="py-3 px-3">Odometer</th>
                  <th className="py-3 px-3">Purchase Date</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredAndSortedFleet.map(bike => {
                  const isRunning = bike.operationalStatus === 'RUNNING';
                  const isWorkshop = bike.operationalStatus === 'MAINTENANCE';

                  return (
                    <tr key={bike.id} className="hover:bg-white/[0.02] transition-colors">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <img 
                            src={bike.imageUrl} 
                            alt={bike.name} 
                            className="w-10 h-10 object-contain rounded-lg bg-black/40 p-1 border border-white/10 shrink-0" 
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = '/images/ather-450x.jpg';
                            }}
                          />
                          <span className="font-bold text-white text-xs">{bike.name}</span>
                        </div>
                      </td>
                      <td className="py-3 px-3 font-mono text-white/70">
                        {bike.rc_number || `WB-02-${1000 + bike.id}`}
                      </td>
                      <td className="py-3 px-3 text-white/60">
                        {bike.category}
                      </td>
                      <td className="py-3 px-3 font-heading text-brand-yellow font-bold">
                        ₹{bike.dailyRate}/day
                      </td>
                      <td className="py-3 px-3 font-heading text-white">
                        ₹{bike.revenue.toLocaleString()}
                      </td>
                      <td className="py-3 px-3 font-heading text-brand-orange">
                        ₹{bike.maintCost.toLocaleString()}
                      </td>
                      <td className="py-3 px-3 font-mono text-white/70">
                        {Math.round(bike.currentOdometer).toLocaleString()} km
                      </td>
                      <td className="py-3 px-3 font-mono text-white/60">
                        {bike.purchase_date || '2024-01-10'}
                      </td>
                      <td className="py-3 px-3">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold border ${
                          isRunning 
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' 
                            : isWorkshop 
                            ? 'bg-brand-orange/10 text-brand-orange border-brand-orange/30' 
                            : 'bg-brand-teal/10 text-brand-teal border-brand-teal/30'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${
                            isRunning ? 'bg-emerald-400 animate-pulse' : isWorkshop ? 'bg-brand-orange' : 'bg-brand-teal'
                          }`}></span>
                          {isRunning ? 'On Trip' : isWorkshop ? 'Workshop' : 'Ready'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleOpenEditModal(bike)}
                            className="p-1.5 rounded-lg bg-white/5 hover:bg-brand-teal hover:text-black text-white/70 border border-white/10 transition-all cursor-pointer"
                            title="Edit Vehicle"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleOpenMaintenanceModal(bike)}
                            className="p-1.5 rounded-lg bg-brand-orange/10 hover:bg-brand-orange hover:text-white text-brand-orange border border-brand-orange/20 transition-all cursor-pointer"
                            title="Log Service / Maintenance"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                            </svg>
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeletingBike(bike)}
                            className="p-1.5 rounded-lg bg-white/5 hover:bg-red-500 hover:text-white text-white/30 border border-white/5 transition-all cursor-pointer"
                            title="Delete Machine"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
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
      )}

      {/* ========================================================================= */}
      {/* 5. SUPABASE SQL SCHEMA MODAL                                              */}
      {/* ========================================================================= */}
      {showSqlModal && (
        <Modal 
          isOpen={showSqlModal} 
          onClose={() => setShowSqlModal(false)} 
          title="Supabase Database: Fleet SQL Schema" 
          maxWidth="2xl"
        >
          <div className="space-y-4 py-2">
            <div className="bg-black/60 p-4 rounded-xl border border-white/10 text-xs text-white/80 space-y-2">
              <p className="font-bold text-white flex items-center gap-2">
                <span className="text-brand-teal">✓</span> Setup Instructions:
              </p>
              <ol className="list-decimal pl-5 space-y-1 text-white/70">
                <li>Click <strong>Copy SQL</strong> below.</li>
                <li>Go to your <strong>Supabase Dashboard &gt; SQL Editor</strong>.</li>
                <li>Paste into a new query and click <strong>Run</strong>.</li>
              </ol>
              <p className="text-[11px] text-white/50">
                This provisions the <code className="text-brand-teal">public.bikes</code> table, enables RLS policies, and syncs all machines and deletions directly in your cloud database.
              </p>
            </div>

            <div className="relative">
              <pre className="bg-black/90 p-4 rounded-xl border border-white/10 text-[10px] font-mono text-emerald-400 overflow-x-auto max-h-72 leading-relaxed">
                {SUPABASE_FLEET_SQL}
              </pre>
              <button
                type="button"
                onClick={handleCopySql}
                className="absolute top-3 right-3 px-3 py-1.5 rounded-lg bg-brand-teal text-black text-xs font-bold hover:bg-white transition-all cursor-pointer shadow"
              >
                {sqlCopied ? '✓ Copied!' : 'Copy SQL'}
              </button>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setShowSqlModal(false)}
                className="px-5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition-all cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* ========================================================================= */}
      {/* 6. EDIT MACHINE MODAL                                                     */}
      {/* ========================================================================= */}
      {editingBike && (
        <Modal 
          isOpen={!!editingBike} 
          onClose={() => setEditingBike(null)} 
          title={`Edit Machine: ${editingBike.name}`} 
          maxWidth="xl"
        >
          <form onSubmit={handleSaveBikeEdits} className="space-y-4 py-2">
            {/* Associated Readouts: Total Rent & Maintenance */}
            <div className="grid grid-cols-2 gap-3 bg-black/40 p-3 rounded-xl border border-white/10 text-xs">
              <div>
                <span className="text-[9px] uppercase tracking-wider text-white/40 block">Total Rent Till Date</span>
                <span className="text-white font-heading font-bold text-sm">₹{editingBike.revenue.toLocaleString()}</span>
                <span className="text-[9px] text-white/40 block mt-0.5">{editingBike.rideCount} booked rides</span>
              </div>
              <div>
                <span className="text-[9px] uppercase tracking-wider text-white/40 block">Maintenance Expenses</span>
                <span className="text-brand-orange font-heading font-bold text-sm">₹{editingBike.maintCost.toLocaleString()}</span>
                <span className="text-[9px] text-white/40 block mt-0.5">{editingBike.maintenanceRecords.length} service records</span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {/* Name */}
              <div className="space-y-1 sm:col-span-2">
                <label className="text-[10px] font-bold text-white/60 uppercase tracking-wider">Machine Name</label>
                <input 
                  type="text"
                  value={editFormData.name}
                  onChange={(e) => setEditFormData(p => ({ ...p, name: e.target.value }))}
                  className="w-full bg-black/60 border border-white/15 rounded-xl p-2.5 text-xs font-bold text-white outline-none focus:border-brand-teal"
                  required
                />
              </div>

              {/* Daily Rent */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-white/60 uppercase tracking-wider">Per Day Rent (₹/day)</label>
                <input 
                  type="number"
                  min="1"
                  value={editFormData.dailyRate}
                  onChange={(e) => setEditFormData(p => ({ ...p, dailyRate: parseFloat(e.target.value) || 0 }))}
                  className="w-full bg-black/60 border border-white/15 rounded-xl p-2.5 text-xs font-heading font-bold text-brand-yellow outline-none focus:border-brand-yellow"
                  required
                />
              </div>

              {/* RC Number */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-white/60 uppercase tracking-wider">RC / Registration Number</label>
                <input 
                  type="text"
                  value={editFormData.rc_number}
                  onChange={(e) => setEditFormData(p => ({ ...p, rc_number: e.target.value }))}
                  placeholder="e.g. WB-02-AH-1515"
                  className="w-full bg-black/60 border border-white/15 rounded-xl p-2.5 text-xs font-mono font-bold text-white uppercase outline-none focus:border-brand-teal"
                  required
                />
              </div>

              {/* Purchase Date */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-white/60 uppercase tracking-wider">Purchase Date</label>
                <input 
                  type="date"
                  value={editFormData.purchase_date}
                  onChange={(e) => setEditFormData(p => ({ ...p, purchase_date: e.target.value }))}
                  className="w-full bg-black/60 border border-white/15 rounded-xl p-2 text-xs text-white outline-none focus:border-brand-teal cursor-pointer"
                />
              </div>

              {/* Odometer Reading */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-white/60 uppercase tracking-wider">Odometer Reading (KM)</label>
                <input 
                  type="number"
                  min="0"
                  value={editFormData.odometer_reading}
                  onChange={(e) => setEditFormData(p => ({ ...p, odometer_reading: parseFloat(e.target.value) || 0 }))}
                  className="w-full bg-black/60 border border-white/15 rounded-xl p-2.5 text-xs text-white outline-none focus:border-brand-teal"
                />
              </div>

              {/* Category */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-white/60 uppercase tracking-wider">Category</label>
                <select
                  value={editFormData.category}
                  onChange={(e) => setEditFormData(p => ({ ...p, category: e.target.value as BikeCategory }))}
                  className="w-full bg-black/60 border border-white/15 rounded-xl p-2.5 text-xs text-white outline-none focus:border-brand-teal"
                >
                  <option value="Scooter">Scooter</option>
                  <option value="Bikes">Bikes</option>
                  <option value="Royal Enfield">Royal Enfield</option>
                  <option value="Sports">Sports</option>
                </select>
              </div>

              {/* Status */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-white/60 uppercase tracking-wider">Status</label>
                <select
                  value={editFormData.status}
                  onChange={(e) => setEditFormData(p => ({ ...p, status: e.target.value as Bike['status'] }))}
                  className="w-full bg-black/60 border border-white/15 rounded-xl p-2.5 text-xs text-white outline-none focus:border-brand-teal"
                >
                  <option value="Available">Available</option>
                  <option value="Running">Running (On Active Trip)</option>
                  <option value="Maintenance">Maintenance (In Workshop)</option>
                  <option value="Booked">Booked</option>
                </select>
              </div>

              {/* Image URL with live preview */}
              <div className="space-y-1 sm:col-span-2">
                <label className="text-[10px] font-bold text-white/60 uppercase tracking-wider">Image URL</label>
                <div className="flex gap-3 items-center">
                  <div className="w-12 h-12 rounded-xl overflow-hidden bg-black border border-white/10 shrink-0">
                    <img 
                      src={editFormData.imageUrl} 
                      alt="Preview" 
                      className="w-full h-full object-contain p-1"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = '/images/ather-450x.jpg';
                      }}
                    />
                  </div>
                  <input 
                    type="text"
                    value={editFormData.imageUrl}
                    onChange={(e) => setEditFormData(p => ({ ...p, imageUrl: e.target.value }))}
                    placeholder="/images/your-bike.jpg or https://..."
                    className="flex-1 bg-black/60 border border-white/15 rounded-xl p-2.5 text-xs font-mono text-white outline-none focus:border-brand-teal"
                    required
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2.5 pt-3 border-t border-white/5">
              <button
                type="button"
                onClick={() => setEditingBike(null)}
                className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/60 text-xs font-bold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl bg-brand-teal hover:bg-brand-teal/90 text-brand-black text-xs font-bold shadow-md shadow-brand-teal/20 cursor-pointer"
              >
                Save Changes
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* ========================================================================= */}
      {/* 7. ADD NEW MACHINE MODAL                                                  */}
      {/* ========================================================================= */}
      {showAddModal && (
        <Modal 
          isOpen={showAddModal} 
          onClose={() => setShowAddModal(false)} 
          title="Register New Machine" 
          maxWidth="xl"
        >
          <form onSubmit={handleCreateNewBike} className="space-y-4 py-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div className="space-y-1 sm:col-span-2">
                <label className="text-[10px] font-bold text-white/60 uppercase tracking-wider">Machine Name</label>
                <input 
                  type="text"
                  placeholder="e.g. Royal Enfield Hunter 350"
                  value={addFormData.name}
                  onChange={(e) => setAddFormData(p => ({ ...p, name: e.target.value }))}
                  className="w-full bg-black/60 border border-white/15 rounded-xl p-2.5 text-xs font-bold text-white outline-none focus:border-brand-teal"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-white/60 uppercase tracking-wider">Per Day Rent (₹/day)</label>
                <input 
                  type="number"
                  min="1"
                  value={addFormData.dailyRate}
                  onChange={(e) => setAddFormData(p => ({ ...p, dailyRate: parseFloat(e.target.value) || 0 }))}
                  className="w-full bg-black/60 border border-white/15 rounded-xl p-2.5 text-xs font-heading font-bold text-brand-yellow outline-none focus:border-brand-yellow"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-white/60 uppercase tracking-wider">RC / Registration Number</label>
                <input 
                  type="text"
                  placeholder="e.g. WB-02-ZZ-9999"
                  value={addFormData.rc_number}
                  onChange={(e) => setAddFormData(p => ({ ...p, rc_number: e.target.value }))}
                  className="w-full bg-black/60 border border-white/15 rounded-xl p-2.5 text-xs font-mono font-bold text-white uppercase outline-none focus:border-brand-teal"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-white/60 uppercase tracking-wider">Category</label>
                <select
                  value={addFormData.category}
                  onChange={(e) => setAddFormData(p => ({ ...p, category: e.target.value as BikeCategory }))}
                  className="w-full bg-black/60 border border-white/15 rounded-xl p-2.5 text-xs text-white outline-none focus:border-brand-teal"
                >
                  <option value="Bikes">Bikes</option>
                  <option value="Scooter">Scooters</option>
                  <option value="Royal Enfield">Royal Enfield</option>
                  <option value="Sports">Sports</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-white/60 uppercase tracking-wider">Initial Odometer (KM)</label>
                <input 
                  type="number"
                  min="0"
                  value={addFormData.odometer_reading}
                  onChange={(e) => setAddFormData(p => ({ ...p, odometer_reading: parseFloat(e.target.value) || 0 }))}
                  className="w-full bg-black/60 border border-white/15 rounded-xl p-2.5 text-xs text-white outline-none focus:border-brand-teal"
                />
              </div>

              <div className="space-y-1 sm:col-span-2">
                <label className="text-[10px] font-bold text-white/60 uppercase tracking-wider">Image URL</label>
                <input 
                  type="text"
                  value={addFormData.imageUrl}
                  onChange={(e) => setAddFormData(p => ({ ...p, imageUrl: e.target.value }))}
                  placeholder="/images/hero-xtreme-125r.jpg or https://..."
                  className="w-full bg-black/60 border border-white/15 rounded-xl p-2.5 text-xs font-mono text-white outline-none focus:border-brand-teal"
                  required
                />
              </div>
            </div>

            <div className="flex justify-end gap-2.5 pt-3 border-t border-white/5">
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/60 text-xs font-bold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl bg-brand-teal hover:bg-brand-teal/90 text-brand-black text-xs font-bold shadow-md shadow-brand-teal/20 cursor-pointer"
              >
                Save Machine
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* ========================================================================= */}
      {/* 8. DELETE CONFIRMATION MODAL                                              */}
      {/* ========================================================================= */}
      {deletingBike && (
        <Modal 
          isOpen={!!deletingBike} 
          onClose={() => setDeletingBike(null)} 
          title="Delete Machine" 
          maxWidth="md"
        >
          <div className="space-y-4 py-2">
            <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 text-xs text-red-200 leading-relaxed space-y-2">
              <p className="font-bold text-red-400 text-sm flex items-center gap-2">
                <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                Confirm Machine Removal
              </p>
              <p>
                Are you sure you want to permanently delete <strong>{deletingBike.name}</strong> ({deletingBike.rc_number})?
              </p>
              <p className="text-[11px] text-white/60">
                This will delete the vehicle record from Supabase and remove it completely from the public catalog, booking form, and rental tariffs.
              </p>
            </div>

            <div className="flex gap-2.5 justify-end pt-2">
              <button
                type="button"
                onClick={() => setDeletingBike(null)}
                className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/60 text-xs font-bold cursor-pointer"
              >
                Keep Machine
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                className="px-5 py-2 rounded-xl bg-red-500 hover:bg-red-600 text-white text-xs font-bold transition-all shadow-md shadow-red-500/20 cursor-pointer"
              >
                {isDeleting ? 'Deleting...' : 'Delete Permanently'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* ========================================================================= */}
      {/* 9. SERVICE & MAINTENANCE MODAL                                            */}
      {/* ========================================================================= */}
      {maintenanceBike && (
        <Modal 
          isOpen={!!maintenanceBike} 
          onClose={() => setMaintenanceBike(null)} 
          title={`Service & Maintenance: ${maintenanceBike.name}`} 
          maxWidth="2xl"
        >
          <div className="space-y-5 py-2">
            <div className="bg-black/60 p-3.5 rounded-xl border border-white/10 flex items-center justify-between text-xs">
              <div>
                <span className="text-[9px] uppercase tracking-wider text-white/40 block">Vehicle</span>
                <span className="text-white font-bold">{maintenanceBike.name} ({maintenanceBike.rc_number})</span>
              </div>
              <div className="text-right">
                <span className="text-[9px] uppercase tracking-wider text-brand-orange block">Total Spent On Service</span>
                <span className="text-brand-orange font-heading text-base font-bold">₹{maintenanceBike.maintCost.toLocaleString()}</span>
              </div>
            </div>

            {/* Service Entry Form */}
            <form onSubmit={handleLogMaintenance} className="bg-black/40 p-4 rounded-xl border border-white/10 space-y-3">
              <span className="text-[10px] font-bold uppercase text-white/60 block">Log New Service Entry</span>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-[9px] uppercase tracking-wider text-white/60 block mb-1">Cost (₹) *</label>
                  <input 
                    type="number"
                    min="0"
                    value={maintForm.cost}
                    onChange={(e) => setMaintForm(p => ({ ...p, cost: parseFloat(e.target.value) || 0 }))}
                    className="w-full bg-black/60 border border-white/15 rounded-lg p-2 text-xs text-white outline-none focus:border-brand-orange"
                    required
                  />
                </div>
                <div>
                  <label className="text-[9px] uppercase tracking-wider text-white/60 block mb-1">Odometer (KM)</label>
                  <input 
                    type="number"
                    value={maintForm.odo}
                    onChange={(e) => setMaintForm(p => ({ ...p, odo: e.target.value }))}
                    placeholder="e.g. 15000"
                    className="w-full bg-black/60 border border-white/15 rounded-lg p-2 text-xs text-white outline-none focus:border-brand-orange"
                  />
                </div>
                <div>
                  <label className="text-[9px] uppercase tracking-wider text-white/60 block mb-1">Date *</label>
                  <input 
                    type="date"
                    value={maintForm.date}
                    onChange={(e) => setMaintForm(p => ({ ...p, date: e.target.value }))}
                    className="w-full bg-black/60 border border-white/15 rounded-lg p-1.5 text-xs text-white outline-none focus:border-brand-orange cursor-pointer"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="text-[9px] uppercase tracking-wider text-white/60 block mb-1">Work Description *</label>
                <input 
                  type="text"
                  value={maintForm.description}
                  onChange={(e) => setMaintForm(p => ({ ...p, description: e.target.value }))}
                  placeholder="e.g. Engine Oil, Brake Pads, Tire replacement, Periodic Service..."
                  className="w-full bg-black/60 border border-white/15 rounded-lg p-2 text-xs text-white outline-none focus:border-brand-orange"
                  required
                />
              </div>

              <div className="flex justify-end pt-1">
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-brand-orange hover:bg-brand-yellow hover:text-black text-white text-xs font-bold transition-all cursor-pointer shadow"
                >
                  Record Service
                </button>
              </div>
            </form>

            {/* Service History */}
            <div className="space-y-2">
              <span className="text-[10px] font-bold uppercase text-white/50 tracking-wider">Service History</span>
              {maintenanceBike.maintenanceRecords.length === 0 ? (
                <p className="text-white/30 text-xs py-3 text-center">No service records logged yet.</p>
              ) : (
                <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                  {maintenanceBike.maintenanceRecords.map(rec => (
                    <div key={rec.id} className="bg-black/40 p-2.5 rounded-lg border border-white/5 flex items-center justify-between text-xs">
                      <div>
                        <span className="text-[10px] font-mono text-brand-teal font-bold mr-2">{rec.date}</span>
                        <span className="text-white">{rec.description}</span>
                        {rec.odometer_reading && (
                          <span className="text-white/40 font-mono text-[10px] ml-2">({rec.odometer_reading} km)</span>
                        )}
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-brand-orange font-heading font-bold">₹{rec.cost.toLocaleString()}</span>
                        <button
                          type="button"
                          onClick={() => {
                            deleteMaintenanceLog(rec.id);
                            fetchFleetData();
                          }}
                          className="text-white/20 hover:text-red-400 p-1 cursor-pointer"
                          title="Delete service log"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
