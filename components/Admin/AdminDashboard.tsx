import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabase';
import { useToast } from '../../App';
import { AdminBookings } from './AdminBookings';
import { AdminFleet } from './AdminFleet';
import { AdminUsers } from './AdminUsers';
import { FinanceLedger } from './Finance/FinanceLedger';
import { UpcomingReservations } from './UpcomingReservations';
import { AvailabilityCalendar } from '../AvailabilityCalendar';
import { getFleetBikes } from '../../fleetStorage';

type AdminTab = 'overview' | 'calendar' | 'upcoming' | 'bookings' | 'fleet' | 'users' | 'finance' | 'reports';

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
    // Fetch all bookings for status-based counts
    const { data: allBookings } = await supabase.from('bookings').select('*');
    const { count: usersCount } = await supabase.from('profiles').select('*', { count: 'exact', head: true });

    if (allBookings) {
      const now = new Date();
      const todayStr = now.toISOString().split('T')[0];
      
      // Filter for revenue within range (excluding cancelled bookings)
      const rangeRevenue = allBookings
        .filter(b => {
          if (b.status === 'cancelled') return false;
          const bDate = b.created_at?.split('T')[0];
          return bDate && bDate >= dateRange.start && bDate <= dateRange.end;
        })
        .reduce((acc, b) => acc + (b.total_rent || 0) + (b.adjustment_amount || 0), 0);

      // Only count payment confirmed reservations for upcoming
      const upcoming = allBookings.filter(b => 
        ['booking_confirmed', 'ongoing'].includes(b.status) && b.return_date >= todayStr
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
    { 
      id: 'overview', 
      label: 'Dashboard', 
      icon: (
        <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
      ) 
    },
    { 
      id: 'calendar', 
      label: 'Availability Calendar', 
      icon: (
        <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      ) 
    },
    { 
      id: 'upcoming', 
      label: 'Upcoming Reservations', 
      badge: stats.upcomingReservations, 
      icon: (
        <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M12 11v4l2 2" />
        </svg>
      ) 
    },
    { 
      id: 'bookings', 
      label: 'Rides & Bookings', 
      icon: (
        <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
        </svg>
      ) 
    },
    { 
      id: 'fleet', 
      label: 'Fleet Management', 
      icon: (
        <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
        </svg>
      ) 
    },
    { 
      id: 'finance', 
      label: 'Finance Ledger', 
      icon: (
        <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ) 
    },
    { 
      id: 'users', 
      label: 'Riders & KYC', 
      icon: (
        <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
      ) 
    }
  ];

  return (
    <div className="min-h-screen bg-black text-slate-100 flex flex-col lg:flex-row font-sans selection:bg-orange-500 selection:text-white">
      {/* Sidebar with pitch black styling */}
      <aside className={`transition-all duration-300 bg-black border-b lg:border-r border-neutral-900 flex flex-col shrink-0 ${isSidebarCollapsed ? 'w-full lg:w-20' : 'w-full lg:w-72'}`}>
        {/* Header */}
        {!isSidebarCollapsed ? (
          <div className="p-5 border-b border-neutral-900 flex items-center justify-between">
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-orange-500"></span>
                <span className="font-heading text-lg text-white tracking-wide">
                  RYDEIT <span className="text-orange-500">ADMIN</span>
                </span>
              </div>
              <span className="text-xs font-medium text-neutral-400 mt-1">
                Operations & Fleet Console
              </span>
            </div>
            <button
              type="button"
              onClick={() => {
                setIsSidebarCollapsed(true);
                try { localStorage.setItem('rydeit_admin_sidebar_collapsed', 'true'); } catch {}
              }}
              className="p-2 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-neutral-400 hover:text-white transition-all cursor-pointer"
              title="Collapse sidebar to maximize screen space"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
              </svg>
            </button>
          </div>
        ) : (
          <div className="p-4 border-b border-neutral-900 flex flex-col items-center justify-center gap-2">
            <span className="font-heading text-base text-orange-500">RA</span>
            <button
              type="button"
              onClick={() => {
                setIsSidebarCollapsed(false);
                try { localStorage.setItem('rydeit_admin_sidebar_collapsed', 'false'); } catch {}
              }}
              className="p-2 rounded-xl bg-neutral-900 hover:bg-orange-600 hover:text-white text-neutral-400 transition-all cursor-pointer"
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
                  className={`w-11 h-11 flex items-center justify-center rounded-xl transition-all cursor-pointer relative ${
                    isActive
                      ? 'bg-orange-600 text-white shadow-sm'
                      : 'text-neutral-400 hover:bg-neutral-900 hover:text-white'
                  }`}
                >
                  {tab.icon}
                  {Boolean(tab.badge && tab.badge > 0) && (
                    <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-sky-400 text-black text-[10px] font-bold flex items-center justify-center shadow">
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
                    className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-xs font-semibold tracking-wide transition-all cursor-pointer select-none ${
                      isActive
                        ? 'bg-orange-600 text-white shadow-sm'
                        : 'text-neutral-300 hover:bg-neutral-900 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className={isActive ? 'text-white' : 'text-neutral-400'}>
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
                      className={`p-1 rounded-lg transition-transform text-neutral-400 hover:text-white ${
                        isFinanceExpanded ? 'rotate-180' : ''
                      }`}
                      title={isFinanceExpanded ? 'Collapse finance menu' : 'Expand finance menu'}
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                  </div>

                  {/* Collapsible Sub-Menu */}
                  {isFinanceExpanded && (
                    <div className="pl-6 pr-2 py-1 space-y-1 border-l-2 border-orange-500/40 ml-4">
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
                            className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-all cursor-pointer text-left ${
                              isSubActive
                                ? 'bg-sky-600 text-white font-semibold'
                                : 'text-neutral-400 hover:bg-neutral-900 hover:text-neutral-200'
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
                className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-xs font-semibold tracking-wide transition-all cursor-pointer ${
                  isActive
                    ? 'bg-orange-600 text-white shadow-sm'
                    : 'text-neutral-300 hover:bg-neutral-900 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className={isActive ? 'text-white' : 'text-neutral-400'}>
                    {tab.icon}
                  </span>
                  <span>{tab.label}</span>
                </div>
                {Boolean(tab.badge && tab.badge > 0) && (
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                    isActive ? 'bg-black/40 text-white' : 'bg-sky-500/20 text-sky-300 border border-sky-500/30'
                  }`}>
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </aside>

      {/* Main Content Area - Pitch Black Background & High Contrast Typography */}
      <main className="flex-grow p-6 lg:p-10 overflow-y-auto bg-black">
        {activeTab === 'overview' && (
          <div className="space-y-6 animate-fade-in max-w-6xl mx-auto">
            {/* Clean Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-neutral-900 pb-5">
              <div>
                <h1 className="text-2xl font-bold text-white tracking-tight">Operations Dashboard</h1>
                <p className="text-xs text-neutral-400 mt-0.5">Live fleet status & confirmed bookings</p>
              </div>
              
              {/* Clean Date Filter */}
              <div className="flex items-center gap-2 bg-[#0a0a0a] px-3 py-1.5 rounded-xl border border-neutral-800">
                <input 
                  type="date" 
                  value={dateRange.start} 
                  onChange={(e) => setDateRange(prev => ({...prev, start: e.target.value}))}
                  className="bg-transparent text-xs font-medium text-neutral-300 outline-none cursor-pointer" 
                />
                <span className="text-neutral-500 text-xs">to</span>
                <input 
                  type="date" 
                  value={dateRange.end} 
                  onChange={(e) => setDateRange(prev => ({...prev, end: e.target.value}))}
                  className="bg-transparent text-xs font-medium text-neutral-300 outline-none cursor-pointer" 
                />
              </div>
            </div>

            {/* Essential 4 KPIs - Strict 2-3 Color Scheme on Pitch Black (Black + White + Sky/Orange) */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div 
                onClick={() => setActiveTab('upcoming')}
                className="bg-[#0a0a0a] border border-neutral-800 p-5 rounded-2xl cursor-pointer hover:border-sky-500/40 transition-all shadow-sm"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold uppercase tracking-wider text-neutral-400">Upcoming</span>
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-sky-500/15 text-sky-400 border border-sky-500/30">
                    Paid
                  </span>
                </div>
                <p className="text-3xl font-bold text-sky-400">{stats.upcomingReservations}</p>
                <p className="text-xs text-neutral-400 mt-2">Payment confirmed rides</p>
              </div>

              <div 
                onClick={() => { setActiveTab('bookings'); setBookingFilter('ongoing'); }}
                className="bg-[#0a0a0a] border border-neutral-800 p-5 rounded-2xl cursor-pointer hover:border-neutral-700 transition-all shadow-sm"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold uppercase tracking-wider text-neutral-400">On Road</span>
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-neutral-900 text-neutral-300">
                    Active
                  </span>
                </div>
                <p className="text-3xl font-bold text-white">{stats.activeRides}</p>
                <p className="text-xs text-neutral-400 mt-2">Bikes currently running</p>
              </div>

              <div 
                onClick={handleReturnWatch}
                className="bg-[#0a0a0a] border border-neutral-800 p-5 rounded-2xl cursor-pointer hover:border-orange-500/40 transition-all shadow-sm"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold uppercase tracking-wider text-neutral-400">Overdue</span>
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${stats.overdueRides > 0 ? 'bg-orange-500/20 text-orange-400 border border-orange-500/40' : 'bg-neutral-900 text-neutral-400'}`}>
                    {stats.overdueRides > 0 ? 'Check Now' : 'Clear'}
                  </span>
                </div>
                <p className={`text-3xl font-bold ${stats.overdueRides > 0 ? 'text-orange-400' : 'text-neutral-300'}`}>{stats.overdueRides}</p>
                <p className="text-xs text-neutral-400 mt-2">Past return schedule</p>
              </div>

              <div className="bg-[#0a0a0a] border border-neutral-800 p-5 rounded-2xl shadow-sm">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold uppercase tracking-wider text-neutral-400">Revenue</span>
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-neutral-900 text-neutral-300">
                    Period
                  </span>
                </div>
                <p className="text-3xl font-bold text-white">₹{stats.totalRevenue.toLocaleString()}</p>
                <p className="text-xs text-neutral-400 mt-2">Rent in date range</p>
              </div>
            </div>

            {/* Quick Action Navigation */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
              <button
                type="button"
                onClick={() => setActiveTab('calendar')}
                className="bg-[#0a0a0a] hover:bg-neutral-900 border border-neutral-800 hover:border-orange-500/50 p-5 rounded-2xl text-left transition-all cursor-pointer group flex flex-col justify-between"
              >
                <div>
                  <div className="w-8 h-8 rounded-lg bg-orange-600/10 text-orange-400 flex items-center justify-center mb-3">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <h3 className="text-sm font-bold text-white">Availability Calendar</h3>
                  <p className="text-xs text-neutral-400 mt-1">See free vs booked bikes and time slots</p>
                </div>
                <span className="text-xs font-semibold text-orange-400 mt-4 group-hover:translate-x-0.5 transition-transform inline-flex items-center gap-1">
                  Open Calendar →
                </span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('upcoming')}
                className="bg-[#0a0a0a] hover:bg-neutral-900 border border-neutral-800 hover:border-sky-500/50 p-5 rounded-2xl text-left transition-all cursor-pointer group flex flex-col justify-between"
              >
                <div>
                  <div className="w-8 h-8 rounded-lg bg-sky-500/10 text-sky-400 flex items-center justify-center mb-3">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                  </div>
                  <h3 className="text-sm font-bold text-white">Upcoming Queue</h3>
                  <p className="text-xs text-neutral-400 mt-1">{stats.upcomingReservations} paid bookings awaiting handover</p>
                </div>
                <span className="text-xs font-semibold text-sky-400 mt-4 group-hover:translate-x-0.5 transition-transform inline-flex items-center gap-1">
                  View Pickups →
                </span>
              </button>

              <button
                type="button"
                onClick={() => { setActiveTab('bookings'); setBookingFilter('pending'); }}
                className="bg-[#0a0a0a] hover:bg-neutral-900 border border-neutral-800 hover:border-neutral-700 p-5 rounded-2xl text-left transition-all cursor-pointer group flex flex-col justify-between"
              >
                <div>
                  <div className="w-8 h-8 rounded-lg bg-neutral-900 text-neutral-300 flex items-center justify-center mb-3">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <h3 className="text-sm font-bold text-white">Pending Verification</h3>
                  <p className="text-xs text-slate-400 mt-1">{stats.pendingPayments} inquiries awaiting advance check</p>
                </div>
                <span className="text-xs font-semibold text-slate-300 mt-4 group-hover:translate-x-0.5 transition-transform inline-flex items-center gap-1">
                  Review Payments →
                </span>
              </button>
            </div>
          </div>
        )}

        {/* Tab Components */}
        {activeTab === 'calendar' && <AvailabilityCalendar bikes={getFleetBikes()} isAdminMode={true} />}
        {activeTab === 'upcoming' && <UpcomingReservations onRefreshStats={fetchStats} />}
        {activeTab === 'bookings' && <AdminBookings initialFilter={bookingFilter} />}
        {activeTab === 'fleet' && <AdminFleet />}
        {activeTab === 'finance' && <FinanceLedger currentSubView={financeSubView} onSubViewChange={setFinanceSubView} />}
        {activeTab === 'users' && <AdminUsers />}
      </main>
    </div>
  );
};
