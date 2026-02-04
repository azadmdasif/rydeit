
import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabase';
import { useToast } from '../../App';
import { BIKES } from '../../constants';
import { AdminBookings } from './AdminBookings';
import { AdminFleet } from './AdminFleet';
import { AdminUsers } from './AdminUsers';

type AdminTab = 'overview' | 'bookings' | 'fleet' | 'users' | 'reports';

export const AdminDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<AdminTab>('overview');
  const [bookingFilter, setBookingFilter] = useState('all');
  
  // Date range state
  const [dateRange, setDateRange] = useState({
    start: new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0]
  });

  const [stats, setStats] = useState({
    totalBookings: 0,
    activeRides: 0,
    pendingPayments: 0,
    totalRevenue: 0,
    totalUsers: 0,
    overdueRides: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, [dateRange]);

  const fetchStats = async () => {
    setLoading(true);
    // Fetch all bookings for status-based counts, but revenue is filtered by date
    const { data: allBookings } = await supabase.from('bookings').select('*');
    const { count: usersCount } = await supabase.from('profiles').select('*', { count: 'exact', head: true });

    if (allBookings) {
      const now = new Date();
      
      // Filter for revenue within range
      const rangeRevenue = allBookings
        .filter(b => {
          const bDate = b.created_at.split('T')[0];
          return bDate >= dateRange.start && bDate <= dateRange.end;
        })
        .reduce((acc, b) => acc + (b.total_rent || 0) + (b.adjustment_amount || 0), 0);

      setStats({
        totalBookings: allBookings.length,
        activeRides: allBookings.filter(b => b.status === 'ongoing').length,
        pendingPayments: allBookings.filter(b => b.status === 'verifying_payment').length,
        totalRevenue: rangeRevenue,
        totalUsers: usersCount || 0,
        overdueRides: allBookings.filter(b => {
            if (b.status !== 'ongoing') return false;
            const returnDate = new Date(`${b.return_date}T${b.return_time}`);
            return returnDate < now;
        }).length
      });
    }
    setLoading(false);
  };

  const handleReturnWatch = () => {
    setBookingFilter('overdue');
    setActiveTab('bookings');
  };

  const tabs = [
    { id: 'overview', label: 'Dashboard', icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg> },
    { id: 'bookings', label: 'Rides', icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg> },
    { id: 'fleet', label: 'Fleet', icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg> },
    { id: 'users', label: 'Riders', icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg> }
  ];

  return (
    <div className="min-h-screen bg-brand-black flex flex-col lg:flex-row">
      {/* Sidebar */}
      <aside className="w-full lg:w-72 bg-brand-gray-dark border-b lg:border-r border-white/5 flex flex-col shrink-0">
        <div className="p-8 border-b border-white/5 flex items-center justify-between">
          <div className="flex flex-col">
            <span className="font-heading text-xl text-white tracking-tighter">COMMAND <span className="text-brand-orange">CENTER</span></span>
            <span className="text-[8px] font-black text-brand-teal uppercase tracking-[0.4em] mt-1">Operational Intel</span>
          </div>
        </div>
        <nav className="flex-grow p-4 lg:p-6 space-y-1">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id as AdminTab);
                if (tab.id === 'bookings') setBookingFilter('all');
              }}
              className={`w-full flex items-center gap-4 px-6 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all group ${activeTab === tab.id ? 'bg-brand-orange text-white shadow-xl shadow-brand-orange/20' : 'text-white/30 hover:bg-white/5'}`}
            >
              <span className={`${activeTab === tab.id ? 'text-white' : 'text-brand-teal/40 group-hover:text-brand-teal'}`}>{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </nav>
      </aside>

      {/* Content Area */}
      <main className="flex-grow p-6 lg:p-12 overflow-y-auto bg-brand-black">
        {activeTab === 'overview' && (
          <div className="space-y-12 animate-fade-in max-w-7xl mx-auto">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
              <div>
                <h1 className="text-4xl lg:text-5xl font-heading text-white uppercase tracking-tighter">Fleet Pulse</h1>
                <p className="text-brand-teal text-[10px] font-black uppercase tracking-[0.4em] mt-2">Operational Performance</p>
              </div>
              
              {/* Date Filter */}
              <div className="flex items-center gap-3 bg-brand-gray-dark/50 p-2 rounded-2xl border border-white/5">
                <div className="flex flex-col px-3">
                  <span className="text-[8px] font-black text-white/20 uppercase tracking-widest">Start Date</span>
                  <input 
                    type="date" 
                    value={dateRange.start} 
                    onChange={(e) => setDateRange(prev => ({...prev, start: e.target.value}))}
                    className="bg-transparent text-[10px] font-bold text-white outline-none cursor-pointer" 
                  />
                </div>
                <div className="w-px h-8 bg-white/10"></div>
                <div className="flex flex-col px-3">
                  <span className="text-[8px] font-black text-white/20 uppercase tracking-widest">End Date</span>
                  <input 
                    type="date" 
                    value={dateRange.end} 
                    onChange={(e) => setDateRange(prev => ({...prev, end: e.target.value}))}
                    className="bg-transparent text-[10px] font-bold text-white outline-none cursor-pointer" 
                  />
                </div>
              </div>
            </div>

            {/* Metrics */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8">
              {[
                { label: 'Live Rides', value: stats.activeRides, color: 'text-brand-teal', bg: 'bg-brand-teal/5', border: 'border-brand-teal/20', desc: 'Active on road' },
                { label: 'Pending Verification', value: stats.pendingPayments, color: 'text-brand-yellow', bg: 'bg-brand-yellow/5', border: 'border-brand-yellow/20', desc: 'Awaiting check' },
                { label: 'Overdue Returns', value: stats.overdueRides, color: 'text-red-500', bg: 'bg-red-500/5', border: 'border-red-500/20', desc: 'Past return time', alert: stats.overdueRides > 0 },
                { label: 'Range Revenue', value: `₹${stats.totalRevenue.toLocaleString()}`, color: 'text-white', bg: 'bg-white/5', border: 'border-white/10', desc: 'Selected period' }
              ].map(card => (
                <div key={card.label} className={`${card.bg} ${card.border} p-8 rounded-[2.5rem] border relative overflow-hidden group hover:scale-[1.02] transition-all duration-300`}>
                  <p className="text-[9px] font-black text-white/40 uppercase tracking-[0.2em] mb-2">{card.label}</p>
                  <p className={`text-4xl lg:text-5xl font-heading ${card.color}`}>{card.value}</p>
                  <p className="text-[8px] font-bold text-white/20 uppercase tracking-widest mt-4">{card.desc}</p>
                </div>
              ))}
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="bg-brand-gray-dark/40 p-10 rounded-[3rem] border border-white/5">
                <h3 className="text-white font-heading text-xl uppercase mb-1 tracking-widest">Active Operations</h3>
                <p className="text-[10px] font-black text-brand-teal uppercase tracking-widest mb-8 opacity-40">Critical Queue</p>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <button 
                      onClick={() => { setActiveTab('bookings'); setBookingFilter('pending'); }} 
                      className="bg-brand-black/40 p-8 rounded-3xl border border-white/5 hover:border-brand-yellow transition-all text-left flex flex-col justify-between group"
                  >
                    <p className="text-white font-bold uppercase tracking-widest text-sm mb-1">Verify Payments</p>
                    <p className="text-[10px] text-brand-yellow uppercase font-black">{stats.pendingPayments} Waiting</p>
                  </button>

                  <button 
                      onClick={handleReturnWatch} 
                      className="bg-brand-black/40 p-8 rounded-3xl border border-white/5 hover:border-red-500 transition-all text-left flex flex-col justify-between group"
                  >
                    <p className="text-white font-bold uppercase tracking-widest text-sm mb-1">Return Watch</p>
                    <p className="text-[10px] text-red-500 uppercase font-black">{stats.overdueRides} Overdue</p>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'bookings' && <AdminBookings initialFilter={bookingFilter} />}
        {activeTab === 'fleet' && <AdminFleet />}
        {activeTab === 'users' && <AdminUsers />}
      </main>
    </div>
  );
};
