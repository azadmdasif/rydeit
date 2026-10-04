
import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabase';
import { useToast } from '../../App';
import { AdminBookings } from './AdminBookings';
import { AdminFleet } from './AdminFleet';
import { AdminUsers } from './AdminUsers';
import { FinanceLedger } from './Finance/FinanceLedger';
import { UpcomingReservations } from './UpcomingReservations';

type AdminTab = 'overview' | 'upcoming' | 'bookings' | 'fleet' | 'users' | 'finance' | 'reports';

export const AdminDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<AdminTab>('overview');
  const [bookingFilter, setBookingFilter] = useState('all');
  const [isFinanceExpanded, setIsFinanceExpanded] = useState<boolean>(true);
  const [financeSubView, setFinanceSubView] = useState<'sheet' | 'capex' | 'pnl' | 'analytics'>('sheet');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(() => {
    try {
      return localStorage.getItem('rydeit_admin_sidebar_collapsed') === 'true';
    } catch {
      return false;
    }
  });
  
  // Date range state
  const [dateRange, setDateRange] = useState({
    start: new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0]
  });

  const [stats, setStats] = useState({
    totalBookings: 0,
    activeRides: 0,
    pendingPayments: 0,
    upcomingReservations: 0,
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
      const todayStr = now.toISOString().split('T')[0];
      
      // Filter for revenue within range (excluding cancelled bookings)
      const rangeRevenue = allBookings
        .filter(b => {
          if (b.status === 'cancelled') return false;
          const bDate = b.created_at.split('T')[0];
          return bDate >= dateRange.start && bDate <= dateRange.end;
        })
        .reduce((acc, b) => acc + (b.total_rent || 0) + (b.adjustment_amount || 0), 0);

      const upcoming = allBookings.filter(b => 
        ['booking_confirmed', 'verifying_payment'].includes(b.status) && b.return_date >= todayStr
      );

      setStats({
        totalBookings: allBookings.length,
        activeRides: allBookings.filter(b => b.status === 'ongoing').length,
        pendingPayments: allBookings.filter(b => b.status === 'verifying_payment').length,
        upcomingReservations: upcoming.length,
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

  const tabs: { id: AdminTab; label: string; icon: React.ReactNode; badge?: number }[] = [
    { id: 'overview', label: 'Dashboard', icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg> },
    { 
      id: 'upcoming', 
      label: 'Upcoming Reservations', 
      badge: stats.upcomingReservations, 
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 11v4l2 2" />
        </svg>
      ) 
    },
    { id: 'bookings', label: 'Rides', icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg> },
    { id: 'fleet', label: 'Fleet', icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg> },
    { id: 'finance', label: 'Finance Ledger', icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg> },
    { id: 'users', label: 'Riders', icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg> }
  ];

  return (
    <div className="min-h-screen bg-brand-black flex flex-col lg:flex-row">
      {/* Sidebar */}
      <aside className={`transition-all duration-300 bg-brand-gray-dark border-b lg:border-r border-white/5 flex flex-col shrink-0 ${isSidebarCollapsed ? 'w-full lg:w-20' : 'w-full lg:w-72'}`}>
        {/* Header */}
        {!isSidebarCollapsed ? (
          <div className="p-6 border-b border-white/5 flex items-center justify-between">
            <div className="flex flex-col">
              <span className="font-heading text-xl text-white tracking-tighter">COMMAND <span className="text-brand-orange">CENTER</span></span>
              <span className="text-[8px] font-black text-brand-teal uppercase tracking-[0.4em] mt-1">Operational Intel</span>
            </div>
            <button
              type="button"
              onClick={() => {
                setIsSidebarCollapsed(true);
                try { localStorage.setItem('rydeit_admin_sidebar_collapsed', 'true'); } catch {}
              }}
              className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/50 hover:text-white transition-all cursor-pointer"
              title="Collapse sidebar to maximize screen space"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
              </svg>
            </button>
          </div>
        ) : (
          <div className="p-4 border-b border-white/5 flex flex-col items-center justify-center gap-2">
            <span className="font-heading text-base text-brand-orange">CC</span>
            <button
              type="button"
              onClick={() => {
                setIsSidebarCollapsed(false);
                try { localStorage.setItem('rydeit_admin_sidebar_collapsed', 'false'); } catch {}
              }}
              className="p-2 rounded-xl bg-white/5 hover:bg-brand-orange hover:text-white text-brand-teal transition-all cursor-pointer"
              title="Expand sidebar"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        )}

        {/* Navigation Items */}
        <nav className={`flex-grow p-3 lg:p-4 space-y-1.5 ${isSidebarCollapsed ? 'flex flex-col items-center' : ''}`}>
          {tabs.map(tab => {
            const isFinance = tab.id === 'finance';
            const isActive = activeTab === tab.id;

            if (isSidebarCollapsed) {
              return (
                <button
                  key={tab.id}
                  onClick={() => {
                    setActiveTab(tab.id as AdminTab);
                    if (tab.id === 'bookings') setBookingFilter('all');
                  }}
                  title={tab.label}
                  className={`w-12 h-12 flex items-center justify-center rounded-2xl transition-all group cursor-pointer relative ${
                    isActive
                      ? 'bg-brand-orange text-white shadow-xl shadow-brand-orange/20'
                      : 'text-white/40 hover:bg-white/5 hover:text-white'
                  }`}
                >
                  <span className={`${isActive ? 'text-white' : 'text-brand-teal/40 group-hover:text-brand-teal'}`}>
                    {tab.icon}
                  </span>
                  {Boolean(tab.badge && tab.badge > 0) && (
                    <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-green-500 text-black text-[9px] font-black flex items-center justify-center shadow">
                      {tab.badge}
                    </span>
                  )}
                </button>
              );
            }

            if (isFinance) {
              return (
                <div key={tab.id} className="space-y-1">
                  <div
                    onClick={() => {
                      setActiveTab('finance');
                      setIsFinanceExpanded(prev => !prev);
                    }}
                    className={`w-full flex items-center justify-between px-6 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all group cursor-pointer select-none ${
                      isActive
                        ? 'bg-brand-orange text-white shadow-xl shadow-brand-orange/20'
                        : 'text-white/40 hover:bg-white/5 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <span className={`${isActive ? 'text-white' : 'text-brand-teal/40 group-hover:text-brand-teal'}`}>
                        {tab.icon}
                      </span>
                      <span>{tab.label}</span>
                    </div>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsFinanceExpanded(prev => !prev);
                      }}
                      className={`p-1 rounded-lg transition-transform text-white/50 hover:text-white ${
                        isFinanceExpanded ? 'rotate-180' : ''
                      }`}
                      title={isFinanceExpanded ? 'Collapse finance menu' : 'Expand finance menu'}
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                  </div>

                  {/* Collapsible Sub-Menu */}
                  {isFinanceExpanded && (
                    <div className="pl-6 pr-2 py-1 space-y-1 border-l-2 border-brand-orange/30 ml-6 animate-fade-in">
                      {[
                        { id: 'sheet', label: 'Ledger Book', icon: '📑' },
                        { id: 'capex', label: 'CapEx & Assets', icon: '🏍️' },
                        { id: 'pnl', label: 'P&L Statement', icon: '📈' },
                        { id: 'analytics', label: 'Analytics', icon: '📊' }
                      ].map(sub => {
                        const isSubActive = isActive && financeSubView === sub.id;
                        return (
                          <button
                            key={sub.id}
                            type="button"
                            onClick={() => {
                              setActiveTab('finance');
                              setFinanceSubView(sub.id as any);
                            }}
                            className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-[9px] font-black uppercase tracking-wider transition-all cursor-pointer text-left ${
                              isSubActive
                                ? 'bg-brand-teal text-white shadow-md shadow-brand-teal/20'
                                : 'text-white/40 hover:bg-white/5 hover:text-white'
                            }`}
                          >
                            <span className="text-xs">{sub.icon}</span>
                            <span>{sub.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            }

            return (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id as AdminTab);
                  if (tab.id === 'bookings') setBookingFilter('all');
                }}
                className={`w-full flex items-center justify-between px-6 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all group ${
                  isActive
                    ? 'bg-brand-orange text-white shadow-xl shadow-brand-orange/20'
                    : 'text-white/30 hover:bg-white/5 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-4">
                  <span className={`${isActive ? 'text-white' : 'text-brand-teal/40 group-hover:text-brand-teal'}`}>
                    {tab.icon}
                  </span>
                  <span>{tab.label}</span>
                </div>
                {Boolean(tab.badge && tab.badge > 0) && (
                  <span className={`px-2 py-0.5 rounded-full text-[9px] font-black ${
                    isActive ? 'bg-black/30 text-white' : 'bg-green-500/20 text-green-400 border border-green-500/30'
                  }`}>
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
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
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 lg:gap-6">
              {[
                { 
                  label: 'Upcoming Rides', 
                  value: stats.upcomingReservations, 
                  color: 'text-green-400', 
                  bg: 'bg-green-500/5', 
                  border: 'border-green-500/20', 
                  desc: 'Advance paid & locked',
                  onClick: () => setActiveTab('upcoming')
                },
                { label: 'Live Rides', value: stats.activeRides, color: 'text-brand-teal', bg: 'bg-brand-teal/5', border: 'border-brand-teal/20', desc: 'Active on road' },
                { label: 'Pending Verification', value: stats.pendingPayments, color: 'text-brand-yellow', bg: 'bg-brand-yellow/5', border: 'border-brand-yellow/20', desc: 'Awaiting check' },
                { label: 'Overdue Returns', value: stats.overdueRides, color: 'text-red-500', bg: 'bg-red-500/5', border: 'border-red-500/20', desc: 'Past return time', alert: stats.overdueRides > 0 },
                { label: 'Range Revenue', value: `₹${stats.totalRevenue.toLocaleString()}`, color: 'text-white', bg: 'bg-white/5', border: 'border-white/10', desc: 'Selected period' }
              ].map(card => (
                <div 
                  key={card.label} 
                  onClick={card.onClick}
                  className={`${card.bg} ${card.border} p-6 lg:p-7 rounded-[2.5rem] border relative overflow-hidden group hover:scale-[1.02] transition-all duration-300 ${card.onClick ? 'cursor-pointer hover:border-green-500/50' : ''}`}
                >
                  <p className="text-[9px] font-black text-white/40 uppercase tracking-[0.2em] mb-2">{card.label}</p>
                  <p className={`text-3xl lg:text-4xl font-heading ${card.color}`}>{card.value}</p>
                  <p className="text-[8px] font-bold text-white/20 uppercase tracking-widest mt-4">{card.desc}</p>
                </div>
              ))}
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="bg-brand-gray-dark/40 p-10 rounded-[3rem] border border-white/5">
                <h3 className="text-white font-heading text-xl uppercase mb-1 tracking-widest">Active Operations</h3>
                <p className="text-[10px] font-black text-brand-teal uppercase tracking-widest mb-8 opacity-40">Critical Queue</p>
                
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <button 
                      onClick={() => setActiveTab('upcoming')} 
                      className="bg-brand-black/40 p-6 rounded-3xl border border-green-500/20 hover:border-green-500 transition-all text-left flex flex-col justify-between group cursor-pointer"
                  >
                    <div>
                      <p className="text-white font-bold uppercase tracking-widest text-xs mb-1">Upcoming Rides</p>
                      <p className="text-[9px] text-white/40 uppercase">Advance paid queue</p>
                    </div>
                    <p className="text-[10px] text-green-400 uppercase font-black mt-4">{stats.upcomingReservations} Reserved</p>
                  </button>

                  <button 
                      onClick={() => { setActiveTab('bookings'); setBookingFilter('pending'); }} 
                      className="bg-brand-black/40 p-6 rounded-3xl border border-white/5 hover:border-brand-yellow transition-all text-left flex flex-col justify-between group cursor-pointer"
                  >
                    <div>
                      <p className="text-white font-bold uppercase tracking-widest text-xs mb-1">Verify Payments</p>
                      <p className="text-[9px] text-white/40 uppercase">Awaiting review</p>
                    </div>
                    <p className="text-[10px] text-brand-yellow uppercase font-black mt-4">{stats.pendingPayments} Waiting</p>
                  </button>

                  <button 
                      onClick={handleReturnWatch} 
                      className="bg-brand-black/40 p-6 rounded-3xl border border-white/5 hover:border-red-500 transition-all text-left flex flex-col justify-between group cursor-pointer"
                  >
                    <div>
                      <p className="text-white font-bold uppercase tracking-widest text-xs mb-1">Return Watch</p>
                      <p className="text-[9px] text-white/40 uppercase">Past schedule</p>
                    </div>
                    <p className="text-[10px] text-red-500 uppercase font-black mt-4">{stats.overdueRides} Overdue</p>
                  </button>
                </div>
              </div>

              {/* Quick Upcoming Departures Preview Card */}
              <div className="bg-brand-gray-dark/40 p-10 rounded-[3rem] border border-white/5 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="text-white font-heading text-xl uppercase tracking-widest">Upcoming Departure Hub</h3>
                    <span className="text-[9px] font-black uppercase text-green-400 bg-green-500/10 px-3 py-1 rounded-full border border-green-500/20">
                      Slots Locked
                    </span>
                  </div>
                  <p className="text-[10px] font-black text-brand-teal uppercase tracking-widest mb-6 opacity-40">
                    Advance Paid Fleet Schedule
                  </p>
                  <p className="text-white/60 text-xs leading-relaxed">
                    Vehicles with advance payments are guaranteed and unavailable for further booking on the same date and time slots. View the full departure board to coordinate logistics and contact riders.
                  </p>
                </div>

                <div className="pt-6 mt-6 border-t border-white/5">
                  <button
                    type="button"
                    onClick={() => setActiveTab('upcoming')}
                    className="w-full py-4 rounded-2xl bg-brand-orange hover:bg-brand-yellow text-white hover:text-black font-heading tracking-widest uppercase text-xs transition-all shadow-lg shadow-brand-orange/20 cursor-pointer flex items-center justify-center gap-2"
                  >
                    <span>Open Upcoming Reservations View</span>
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'upcoming' && <UpcomingReservations onRefreshStats={fetchStats} />}
        {activeTab === 'bookings' && <AdminBookings initialFilter={bookingFilter} />}
        {activeTab === 'fleet' && <AdminFleet />}
        {activeTab === 'finance' && <FinanceLedger currentSubView={financeSubView} onSubViewChange={setFinanceSubView} />}
        {activeTab === 'users' && <AdminUsers />}
      </main>
    </div>
  );
};
