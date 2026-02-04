
import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../../supabase';
import { useToast } from '../../App';
import { BIKES } from '../../constants';
import { Modal } from '../Modal';

type SortKey = 'name' | 'revenue' | 'netProfit' | 'rideCount' | 'distance';
type StatusFilter = 'ALL' | 'ALIVE' | 'DEAD' | 'MAINTENANCE';

export const AdminFleet: React.FC = () => {
  const { showToast } = useToast();
  const [fleetStats, setFleetStats] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBike, setSelectedBike] = useState<any | null>(null);
  const [viewScheduleBike, setViewScheduleBike] = useState<any | null>(null);
  const [maintenance, setMaintenance] = useState({ description: '', cost: 0, odo: '' });

  // Filter & Sort State
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('All');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');
  const [sortKey, setSortKey] = useState<SortKey>('name');

  useEffect(() => {
    fetchFleetData();
  }, []);

  const fetchFleetData = async () => {
    setLoading(true);
    const { data: bookings } = await supabase.from('bookings').select('*');
    const { data: maint } = await supabase.from('maintenance_logs').select('*');

    const stats = BIKES.map(bike => {
      const bikeBookings = bookings?.filter(b => b.bike_id === bike.id) || [];
      const bikeMaint = maint?.filter(m => m.bike_id === bike.id) || [];
      
      const isRunning = bikeBookings.some(b => b.status === 'ongoing');
      
      const revenue = bikeBookings.reduce((acc, b) => acc + (b.total_rent || 0) + (b.adjustment_amount || 0), 0);
      const maintCost = bikeMaint.reduce((acc, m) => acc + (m.cost || 0), 0);
      const totalDistance = bikeBookings.reduce((acc, b) => {
        if (b.start_odometer && b.end_odometer) return acc + (b.end_odometer - b.start_odometer);
        return acc;
      }, 0);

      return {
        ...bike,
        status: isRunning ? 'ALIVE' : (bike.status === 'Maintenance' ? 'MAINTENANCE' : 'DEAD'),
        rideCount: bikeBookings.length,
        revenue,
        maintCost,
        netRevenue: revenue - maintCost,
        distance: totalDistance,
        futureRides: bikeBookings.filter(b => b.status === 'booking_confirmed' && new Date(b.pickup_date) >= new Date())
      };
    });

    setFleetStats(stats);
    setLoading(false);
  };

  const filteredAndSortedFleet = useMemo(() => {
    return fleetStats
      .filter(bike => {
        const matchesSearch = bike.name.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesCategory = categoryFilter === 'All' || bike.category === categoryFilter;
        const matchesStatus = statusFilter === 'ALL' || bike.status === statusFilter;
        return matchesSearch && matchesCategory && matchesStatus;
      })
      .sort((a, b) => {
        if (sortKey === 'name') return a.name.localeCompare(b.name);
        if (sortKey === 'revenue') return b.revenue - a.revenue;
        if (sortKey === 'netProfit') return b.netRevenue - a.netRevenue;
        if (sortKey === 'rideCount') return b.rideCount - a.rideCount;
        if (sortKey === 'distance') return b.distance - a.distance;
        return 0;
      });
  }, [fleetStats, searchTerm, categoryFilter, statusFilter, sortKey]);

  const logMaintenance = async () => {
    if (!selectedBike || !maintenance.description) return;
    const { error } = await supabase.from('maintenance_logs').insert({
      bike_id: selectedBike.id,
      description: maintenance.description,
      cost: maintenance.cost,
      odometer_reading: parseFloat(maintenance.odo) || 0,
      date: new Date().toISOString().split('T')[0]
    });

    if (error) showToast(error.message, 'error');
    else {
      showToast('Maintenance record saved.', 'success');
      fetchFleetData();
      setSelectedBike(null);
      setMaintenance({ description: '', cost: 0, odo: '' });
    }
  };

  return (
    <div className="animate-fade-in space-y-12 max-w-7xl mx-auto pb-20">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
        <div>
          <h2 className="text-4xl font-heading text-white uppercase tracking-tighter">Fleet Command</h2>
          <p className="text-brand-teal text-[9px] font-black uppercase tracking-[0.4em] mt-2">Machine Status & Financial Sorting</p>
        </div>
        <div className="flex flex-wrap gap-4">
             <div className="bg-brand-gray-dark/40 px-6 py-3 rounded-2xl border border-white/5">
                 <p className="text-[8px] font-black text-white/30 uppercase tracking-widest mb-1">Fleet Utilization</p>
                 <p className="text-xl font-heading text-brand-teal">
                    {Math.round((fleetStats.filter(b => b.status === 'ALIVE').length / fleetStats.length) * 100) || 0}%
                 </p>
             </div>
             <div className="bg-brand-gray-dark/40 px-6 py-3 rounded-2xl border border-white/5">
                 <p className="text-[8px] font-black text-white/30 uppercase tracking-widest mb-1">Active / Total</p>
                 <p className="text-xl font-heading text-white">
                    {fleetStats.filter(b => b.status === 'ALIVE').length} <span className="text-white/20">/</span> {fleetStats.length}
                 </p>
             </div>
        </div>
      </div>

      {/* Control Bar */}
      <div className="bg-brand-gray-dark/40 p-6 rounded-[2.5rem] border border-white/5 flex flex-col lg:flex-row gap-6 items-center">
        {/* Search */}
        <div className="relative w-full lg:w-72">
            <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
            <input 
                type="text" 
                placeholder="Search machine..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-brand-black/60 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-xs font-bold text-white outline-none focus:border-brand-teal transition-all"
            />
        </div>

        {/* Status Filter */}
        <div className="flex gap-2 p-1 bg-brand-black/60 rounded-2xl border border-white/5">
            {['ALL', 'ALIVE', 'DEAD'].map(s => (
                <button 
                    key={s} 
                    onClick={() => setStatusFilter(s as StatusFilter)}
                    className={`px-6 py-3 rounded-xl text-[8px] font-black uppercase tracking-widest transition-all ${statusFilter === s ? 'bg-brand-teal text-black' : 'text-white/30 hover:text-white'}`}
                >
                    {s}
                </button>
            ))}
        </div>

        {/* Category Dropdown */}
        <select 
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="w-full lg:w-48 bg-brand-black/60 border border-white/10 rounded-2xl p-4 text-[10px] font-black uppercase tracking-widest text-white outline-none cursor-pointer"
        >
            <option value="All">All Categories</option>
            <option value="Bikes">Bikes</option>
            <option value="Scooter">Scooters</option>
            <option value="Royal Enfield">Royal Enfield</option>
            <option value="Sports">Sports</option>
        </select>

        {/* Sort Dropdown */}
        <div className="flex items-center gap-4 ml-auto w-full lg:w-auto">
            <span className="text-[8px] font-black text-white/20 uppercase tracking-widest hidden xl:block">Sort By</span>
            <select 
                value={sortKey}
                onChange={(e) => setSortKey(e.target.value as SortKey)}
                className="w-full lg:w-56 bg-brand-orange text-white rounded-2xl p-4 text-[10px] font-black uppercase tracking-widest outline-none cursor-pointer shadow-lg shadow-brand-orange/20"
            >
                <option value="name">Name (A-Z)</option>
                <option value="netProfit">Highest Net Profit</option>
                <option value="revenue">Gross Revenue</option>
                <option value="rideCount">Utilization (Rides)</option>
                <option value="distance">Mileage (KM)</option>
            </select>
        </div>
      </div>

      {loading ? (
        <div className="py-32 flex flex-col items-center">
            <div className="w-12 h-12 border-4 border-brand-teal/20 border-t-brand-teal rounded-full animate-spin mb-6"></div>
            <p className="text-[10px] font-black text-white/20 uppercase tracking-[0.5em]">Scanning Assets</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-10">
          {filteredAndSortedFleet.length === 0 ? (
              <div className="col-span-full py-32 text-center bg-brand-gray-dark/20 border-2 border-dashed border-white/5 rounded-[3.5rem]">
                  <p className="text-white/10 font-heading text-4xl uppercase">No Machines Match Filters</p>
              </div>
          ) : (
            filteredAndSortedFleet.map(bike => (
              <div key={bike.id} className="bg-brand-gray-dark/40 rounded-[3rem] border border-white/5 flex flex-col group hover:border-brand-teal transition-all duration-500 overflow-hidden shadow-2xl relative">
                <div className="p-10 pb-0">
                    <div className="flex gap-8 mb-10">
                        <div className="relative group-hover:scale-105 transition-transform duration-500">
                            <img src={bike.imageUrl} className={`w-28 h-28 object-cover rounded-[2rem] border border-white/10 shadow-2xl ${bike.status === 'DEAD' ? 'grayscale opacity-40' : ''}`} alt="" />
                            <div className={`absolute -bottom-2 -right-2 px-3 py-1.5 rounded-full text-[8px] font-black uppercase tracking-widest shadow-xl border ${
                                bike.status === 'ALIVE' ? 'bg-green-500 text-black border-green-400' : 
                                bike.status === 'MAINTENANCE' ? 'bg-brand-yellow text-black' : 
                                'bg-brand-black text-white/40 border-white/10'
                            }`}>
                                {bike.status}
                            </div>
                        </div>
                        <div className="flex flex-col justify-center">
                            <span className="text-brand-orange text-[9px] font-black uppercase tracking-[0.3em] mb-2">{bike.category}</span>
                            <h3 className="text-white font-bold text-xl uppercase tracking-tight leading-tight">{bike.name}</h3>
                            <div className="flex gap-3 mt-3">
                                <button onClick={() => setViewScheduleBike(bike)} className="text-[8px] font-black text-brand-teal uppercase tracking-widest border border-brand-teal/20 px-3 py-1 rounded-lg hover:bg-brand-teal hover:text-black transition-all">Schedule</button>
                                <button onClick={() => setSelectedBike(bike)} className="text-[8px] font-black text-white/40 uppercase tracking-widest border border-white/10 px-3 py-1 rounded-lg hover:bg-white/5 transition-all">Service</button>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 mb-10 border-t border-white/5 pt-8">
                        <div className="space-y-1">
                            <p className="text-[8px] font-black text-white/30 uppercase tracking-widest">Revenue (Net)</p>
                            <p className="text-xl font-heading text-white">₹{bike.netRevenue.toLocaleString()}</p>
                        </div>
                        <div className="space-y-1">
                            <p className="text-[8px] font-black text-white/30 uppercase tracking-widest">Odometer (Est)</p>
                            <p className="text-xl font-heading text-brand-teal">{Math.round(bike.distance)} <span className="text-[10px]">KM</span></p>
                        </div>
                    </div>
                </div>

                <div className="mt-auto bg-brand-black/60 p-6 flex items-center justify-between border-t border-white/5">
                    <div className="flex flex-col">
                        <span className="text-[8px] font-black text-white/20 uppercase tracking-widest">Utilization</span>
                        <span className="text-white font-bold text-xs">{bike.rideCount} Successful Rides</span>
                    </div>
                    <div className="flex gap-1">
                        {[...Array(5)].map((_, i) => (
                            <div key={i} className={`w-1.5 h-6 rounded-full ${i < bike.rideCount ? 'bg-brand-teal shadow-[0_0_10px_rgba(0,194,199,0.5)]' : 'bg-white/5'}`}></div>
                        ))}
                    </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Modals remain the same ... */}
      {viewScheduleBike && (
        <Modal isOpen={!!viewScheduleBike} onClose={() => setViewScheduleBike(null)} title={`${viewScheduleBike.name} : Schedule`}>
            <div className="space-y-8 py-6 max-h-[60vh] overflow-y-auto no-scrollbar">
                <div className="grid grid-cols-1 gap-4">
                    {viewScheduleBike.futureRides.length === 0 ? (
                        <div className="p-20 text-center border-2 border-dashed border-white/5 rounded-3xl">
                            <p className="text-white/20 font-heading text-4xl uppercase">No Bookings</p>
                        </div>
                    ) : (
                        viewScheduleBike.futureRides.map((ride: any) => (
                            <div key={ride.id} className="bg-brand-black/40 p-6 rounded-2xl border border-white/5 flex justify-between items-center group hover:border-brand-teal transition-all">
                                <div>
                                    <p className="text-brand-orange text-[9px] font-black uppercase tracking-widest">{ride.readable_id}</p>
                                    <p className="text-white font-bold uppercase mt-1">{ride.customer_name}</p>
                                    <div className="flex gap-4 mt-2">
                                        <div className="text-[10px] text-white/40 uppercase font-black tracking-widest">
                                            Pick: <span className="text-brand-teal">{ride.pickup_date}</span>
                                        </div>
                                        <div className="text-[10px] text-white/40 uppercase font-black tracking-widest">
                                            Drop: <span className="text-brand-yellow">{ride.return_date}</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className="text-xl font-heading text-white">₹{ride.total_rent}</div>
                                    <span className="text-[8px] font-black text-green-500 uppercase tracking-widest bg-green-500/10 px-3 py-1 rounded-lg">Reserved</span>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </Modal>
      )}

      {selectedBike && (
        <Modal isOpen={!!selectedBike} onClose={() => setSelectedBike(null)} title={`MAINTENANCE: ${selectedBike.name}`}>
          <div className="space-y-10 py-10 px-2">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-4">
                    <label className="text-[10px] font-black text-white/30 uppercase tracking-widest ml-4">Maintenance Cost</label>
                    <input type="number" value={maintenance.cost} onChange={(e) => setMaintenance(m => ({...m, cost: parseFloat(e.target.value)}))} className="w-full bg-brand-black border border-white/10 rounded-2xl p-6 text-sm font-bold text-white" />
                </div>
                <div className="space-y-4">
                    <label className="text-[10px] font-black text-white/30 uppercase tracking-widest ml-4">Odometer</label>
                    <input type="number" value={maintenance.odo} onChange={(e) => setMaintenance(m => ({...m, odo: e.target.value}))} className="w-full bg-brand-black border border-white/10 rounded-2xl p-6 text-sm font-bold text-white" />
                </div>
            </div>
            <textarea value={maintenance.description} onChange={(e) => setMaintenance(m => ({...m, description: e.target.value}))} placeholder="Work description..." className="w-full h-40 bg-brand-black border border-white/10 rounded-[2.5rem] p-8 text-sm font-bold text-white resize-none" />
            <button onClick={logMaintenance} className="w-full py-6 bg-brand-orange text-white font-heading uppercase tracking-widest text-xs rounded-[2rem] shadow-2xl hover:bg-brand-yellow hover:text-black transition-all">Submit Entry</button>
          </div>
        </Modal>
      )}
    </div>
  );
};
