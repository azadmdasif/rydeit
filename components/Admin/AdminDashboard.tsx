import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../../supabase';
import { useToast } from '../../App';
import { AdminBookings } from './AdminBookings';
import { AdminFleet } from './AdminFleet';
import { AdminUsers } from './AdminUsers';
import { FinanceLedger } from './Finance/FinanceLedger';
import { UpcomingReservations } from './UpcomingReservations';
import { AdminLeads } from './AdminLeads';
import { AdminHotels } from './AdminHotels';
import { AvailabilityCalendar } from '../AvailabilityCalendar';
import { getFleetBikes } from '../../fleetStorage';
import { getStoredLeads, fetchLeadsFromSupabase } from '../../leadsStorage';

type AdminTab = 'overview' | 'leads' | 'calendar' | 'upcoming' | 'bookings' | 'hotels' | 'fleet' | 'users' | 'finance' | 'reports';

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
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState<boolean>(false);
  
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
    overdueRides: 0,
    leadsNeedFollowUp: 0
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

      const currentLeads = await fetchLeadsFromSupabase();
      const followUpCount = currentLeads.filter(l => l.status === 'need_follow_up').length;

      setStats({
        totalBookings: allBookings.length,
        activeRides: allBookings.filter(b => b.status === 'ongoing').length,
        pendingPayments: allBookings.filter(b => b.status === 'pending_payment').length,
        upcomingReservations: upcoming.length,
        totalRevenue: rangeRevenue,
        totalUsers: usersCount || 0,
        overdueRides: allBookings.filter(b => {
          if (b.status !== 'ongoing') return false;
          const returnDate = new Date(`${b.return_date}T${b.return_time}`);
          return returnDate < now;
        }).length,
        leadsNeedFollowUp: followUpCount
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
      id: 'leads', 
      label: 'Log Lead', 
      badge: stats.leadsNeedFollowUp, 
      icon: (
        <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
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
      id: 'hotels', 
      label: 'Hotel Partners', 
      icon: (
        <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
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
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col lg:flex-row font-sans selection:bg-orange-500 selection:text-white admin-panel-white">
      {/* Mobile Top Navigation Bar (Hidden on Desktop) */}
      <div className="lg:hidden sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200 px-3.5 py-2.5 flex items-center justify-between shadow-xs">
        <button
          type="button"
          onClick={() => setIsMobileDrawerOpen(true)}
          className="px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 flex items-center gap-1.5 border border-slate-200 transition-all cursor-pointer active:scale-95"
          title="Open Admin Menu"
        >
          <svg className="w-4 h-4 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
          <span className="text-xs font-bold uppercase tracking-wider text-slate-700">Menu</span>
          {(stats.leadsNeedFollowUp > 0 || stats.upcomingReservations > 0) && (
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping"></span>
          )}
        </button>

        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-orange-500 shrink-0"></span>
          <span className="text-xs font-bold uppercase tracking-wider text-slate-900">
            {tabs.find(t => t.id === activeTab)?.label || 'Log Lead'}
          </span>
        </div>

        <Link
          to="/"
          className="text-[11px] font-semibold px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-900 border border-slate-200 transition-colors"
          title="Exit to customer website"
        >
          Site ↗
        </Link>
      </div>

      {/* Mobile Slide-Over Drawer (Only on Mobile) */}
      {isMobileDrawerOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity"
            onClick={() => setIsMobileDrawerOpen(false)}
          />

          {/* Drawer Content */}
          <div className="relative w-72 max-w-[85vw] bg-white border-r border-slate-200 p-5 z-50 flex flex-col justify-between overflow-y-auto animate-fade-in shadow-2xl">
            <div className="space-y-6">
              {/* Drawer Header */}
              <div className="flex items-center justify-between border-b border-slate-200 pb-4">
                <div className="flex flex-col">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-orange-500"></span>
                    <span className="font-heading text-lg text-slate-900 tracking-wide">
                      RYDEIT <span className="text-orange-500">ADMIN</span>
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-500 mt-0.5">
                    Operations & Fleet Console
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setIsMobileDrawerOpen(false)}
                  className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-900 border border-slate-200 cursor-pointer"
                >
                  ✕
                </button>
              </div>

              {/* Navigation Tabs in Drawer */}
              <nav className="space-y-1.5">
                {tabs.map(tab => {
                  const isFinance = tab.id === 'finance';
                  const isActive = activeTab === tab.id;

                  if (isFinance) {
                    return (
                      <div key={tab.id} className="space-y-1">
                        <div
                          onClick={() => {
                            setActiveTab('finance');
                            setIsFinanceExpanded(prev => !prev);
                          }}
                          className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-xs font-semibold tracking-wide transition-all cursor-pointer ${
                            isActive
                              ? 'bg-orange-500 text-white shadow-xs'
                              : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <span className={isActive ? 'text-white' : 'text-slate-500'}>
                              {tab.icon}
                            </span>
                            <span>{tab.label}</span>
                          </div>
                          <span className={`text-slate-400 text-xs transition-transform ${isFinanceExpanded ? 'rotate-180' : ''}`}>▾</span>
                        </div>

                        {isFinanceExpanded && (
                          <div className="pl-6 pr-2 py-1 space-y-1 border-l-2 border-orange-500 ml-4">
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
                                    setIsMobileDrawerOpen(false);
                                  }}
                                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-all text-left ${
                                    isSubActive
                                      ? 'bg-orange-50 text-orange-700 font-semibold border border-orange-200'
                                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
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
                      type="button"
                      onClick={() => {
                        setActiveTab(tab.id as AdminTab);
                        if (tab.id === 'bookings') setBookingFilter('all');
                        setIsMobileDrawerOpen(false);
                      }}
                      className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-xs font-semibold tracking-wide transition-all cursor-pointer ${
                        isActive
                          ? 'bg-orange-500 text-white shadow-xs'
                          : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span className={isActive ? 'text-white' : 'text-slate-500'}>
                          {tab.icon}
                        </span>
                        <span>{tab.label}</span>
                      </div>
                      {Boolean(tab.badge && tab.badge > 0) && (
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          isActive ? 'bg-white/20 text-white' : 'bg-orange-50 text-orange-700 border border-orange-200'
                        }`}>
                          {tab.badge}
                        </span>
                      )}
                    </button>
                  );
                })}
              </nav>
            </div>

            {/* Drawer Footer */}
            <div className="pt-4 border-t border-slate-200 flex flex-col gap-2.5">
              <Link
                to="/"
                onClick={() => setIsMobileDrawerOpen(false)}
                className="w-full text-center py-2 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-200 text-xs font-semibold text-slate-700 hover:text-slate-900 transition-all flex items-center justify-center gap-1.5"
              >
                <span>← Back to Customer Website</span>
              </Link>
              <div className="flex items-center justify-between text-[11px] text-slate-400 px-1">
                <span>Rydeit Kolkata Admin</span>
                <span>v2.4</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Desktop Sidebar (Only visible on lg screens, hidden on mobile) */}
      <aside className={`hidden lg:flex transition-all duration-300 bg-white border-r border-slate-200 flex-col shrink-0 ${isSidebarCollapsed ? 'lg:w-20' : 'lg:w-72'}`}>
        {/* Header */}
        {!isSidebarCollapsed ? (
          <div className="p-5 border-b border-slate-200 flex items-center justify-between">
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-orange-500"></span>
                <span className="font-heading text-lg text-slate-900 tracking-wide">
                  RYDEIT <span className="text-orange-500">ADMIN</span>
                </span>
              </div>
              <span className="text-xs font-medium text-slate-500 mt-1">
                Operations & Fleet Console
              </span>
            </div>
            <button
              type="button"
              onClick={() => {
                setIsSidebarCollapsed(true);
                try { localStorage.setItem('rydeit_admin_sidebar_collapsed', 'true'); } catch {}
              }}
              className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-900 transition-all cursor-pointer"
              title="Collapse sidebar to maximize screen space"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
              </svg>
            </button>
          </div>
        ) : (
          <div className="p-4 border-b border-slate-200 flex flex-col items-center justify-center gap-2">
            <span className="font-heading text-base text-orange-500">RA</span>
            <button
              type="button"
              onClick={() => {
                setIsSidebarCollapsed(false);
                try { localStorage.setItem('rydeit_admin_sidebar_collapsed', 'false'); } catch {}
              }}
              className="p-2 rounded-xl bg-slate-100 hover:bg-orange-500 hover:text-white text-slate-500 transition-all cursor-pointer"
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
                      ? 'bg-orange-500 text-white shadow-xs'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                  }`}
                >
                  {tab.icon}
                  {Boolean(tab.badge && tab.badge > 0) && (
                    <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-orange-500 text-white text-[10px] font-bold flex items-center justify-center shadow-xs">
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
                        ? 'bg-orange-500 text-white shadow-xs'
                        : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className={isActive ? 'text-white' : 'text-slate-500'}>
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
                      className={`p-1 rounded-lg transition-transform text-slate-400 hover:text-slate-700 ${
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
                    <div className="pl-6 pr-2 py-1 space-y-1 border-l-2 border-orange-500 ml-4">
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
                                ? 'bg-orange-50 text-orange-700 font-semibold border border-orange-200'
                                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
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
                    ? 'bg-orange-500 text-white shadow-xs'
                    : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className={isActive ? 'text-white' : 'text-slate-500'}>
                    {tab.icon}
                  </span>
                  <span>{tab.label}</span>
                </div>
                {Boolean(tab.badge && tab.badge > 0) && (
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                    isActive ? 'bg-white/20 text-white' : 'bg-orange-50 text-orange-700 border border-orange-200'
                  }`}>
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </aside>

      {/* Main Content Area - Clean White Background, Comforting Fonts & Natural Contrast */}
      <main className="flex-grow p-3 sm:p-5 lg:p-8 overflow-y-auto bg-slate-50 text-slate-800">
        {activeTab === 'overview' && (
          <div className="space-y-6 animate-fade-in max-w-6xl mx-auto">
            {/* Clean Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-200 pb-5">
              <div>
                <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Operations Dashboard</h1>
                <p className="text-xs text-slate-500 mt-0.5">Live fleet status & confirmed bookings</p>
              </div>
              
              {/* Clean Date Filter */}
              <div className="flex items-center gap-2 bg-white px-3.5 py-2 rounded-xl border border-slate-200 shadow-xs">
                <input 
                  type="date" 
                  value={dateRange.start} 
                  onChange={(e) => setDateRange(prev => ({...prev, start: e.target.value}))}
                  className="bg-transparent text-xs font-medium text-slate-700 outline-none cursor-pointer" 
                />
                <span className="text-slate-400 text-xs">to</span>
                <input 
                  type="date" 
                  value={dateRange.end} 
                  onChange={(e) => setDateRange(prev => ({...prev, end: e.target.value}))}
                  className="bg-transparent text-xs font-medium text-slate-700 outline-none cursor-pointer" 
                />
              </div>
            </div>

            {/* Essential 4 KPIs - Soft White Cards, Ergonomic Natural Contrast */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div 
                onClick={() => setActiveTab('upcoming')}
                className="bg-white border border-slate-200 p-5 rounded-2xl cursor-pointer hover:border-sky-300 transition-all shadow-xs"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Upcoming</span>
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-sky-50 text-sky-700 border border-sky-200">
                    Paid
                  </span>
                </div>
                <p className="text-3xl font-extrabold text-sky-600">{stats.upcomingReservations}</p>
                <p className="text-xs text-slate-500 mt-2">Payment confirmed rides</p>
              </div>

              <div 
                onClick={() => { setActiveTab('bookings'); setBookingFilter('ongoing'); }}
                className="bg-white border border-slate-200 p-5 rounded-2xl cursor-pointer hover:border-slate-300 transition-all shadow-xs"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">On Road</span>
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                    Active
                  </span>
                </div>
                <p className="text-3xl font-extrabold text-slate-900">{stats.activeRides}</p>
                <p className="text-xs text-slate-500 mt-2">Bikes currently running</p>
              </div>

              <div 
                onClick={handleReturnWatch}
                className="bg-white border border-slate-200 p-5 rounded-2xl cursor-pointer hover:border-orange-300 transition-all shadow-xs"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Overdue</span>
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${stats.overdueRides > 0 ? 'bg-orange-50 text-orange-700 border border-orange-200' : 'bg-slate-100 text-slate-600'}`}>
                    {stats.overdueRides > 0 ? 'Check Now' : 'Clear'}
                  </span>
                </div>
                <p className={`text-3xl font-extrabold ${stats.overdueRides > 0 ? 'text-orange-600' : 'text-slate-800'}`}>{stats.overdueRides}</p>
                <p className="text-xs text-slate-500 mt-2">Past return schedule</p>
              </div>

              <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-xs">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Revenue</span>
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                    Period
                  </span>
                </div>
                <p className="text-3xl font-extrabold text-slate-900">₹{stats.totalRevenue.toLocaleString()}</p>
                <p className="text-xs text-slate-500 mt-2">Rent in date range</p>
              </div>
            </div>

            {/* Quick Action Navigation */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-2">
              <button
                type="button"
                onClick={() => setActiveTab('leads')}
                className="bg-white hover:bg-slate-50/80 border border-slate-200 hover:border-amber-300 p-5 rounded-2xl text-left transition-all cursor-pointer group flex flex-col justify-between shadow-xs"
              >
                <div>
                  <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center mb-3">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                  </div>
                  <h3 className="text-sm font-bold text-slate-900">Log Lead</h3>
                  <p className="text-xs text-slate-500 mt-1">{stats.leadsNeedFollowUp} follow-ups pending</p>
                </div>
                <span className="text-xs font-semibold text-amber-600 mt-4 group-hover:translate-x-0.5 transition-transform inline-flex items-center gap-1">
                  Log Lead →
                </span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('calendar')}
                className="bg-white hover:bg-slate-50/80 border border-slate-200 hover:border-orange-300 p-5 rounded-2xl text-left transition-all cursor-pointer group flex flex-col justify-between shadow-xs"
              >
                <div>
                  <div className="w-8 h-8 rounded-lg bg-orange-50 text-orange-600 flex items-center justify-center mb-3">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <h3 className="text-sm font-bold text-slate-900">Availability Calendar</h3>
                  <p className="text-xs text-slate-500 mt-1">See free vs booked bikes and time slots</p>
                </div>
                <span className="text-xs font-semibold text-orange-600 mt-4 group-hover:translate-x-0.5 transition-transform inline-flex items-center gap-1">
                  Open Calendar →
                </span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('upcoming')}
                className="bg-white hover:bg-slate-50/80 border border-slate-200 hover:border-sky-300 p-5 rounded-2xl text-left transition-all cursor-pointer group flex flex-col justify-between shadow-xs"
              >
                <div>
                  <div className="w-8 h-8 rounded-lg bg-sky-50 text-sky-600 flex items-center justify-center mb-3">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                  </div>
                  <h3 className="text-sm font-bold text-slate-900">Upcoming Queue</h3>
                  <p className="text-xs text-slate-500 mt-1">{stats.upcomingReservations} paid bookings awaiting handover</p>
                </div>
                <span className="text-xs font-semibold text-sky-600 mt-4 group-hover:translate-x-0.5 transition-transform inline-flex items-center gap-1">
                  View Pickups →
                </span>
              </button>

              <button
                type="button"
                onClick={() => { setActiveTab('bookings'); setBookingFilter('pending'); }}
                className="bg-white hover:bg-slate-50/80 border border-slate-200 hover:border-slate-300 p-5 rounded-2xl text-left transition-all cursor-pointer group flex flex-col justify-between shadow-xs"
              >
                <div>
                  <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center mb-3">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <h3 className="text-sm font-bold text-slate-900">Pending Verification</h3>
                  <p className="text-xs text-slate-500 mt-1">{stats.pendingPayments} inquiries awaiting advance check</p>
                </div>
                <span className="text-xs font-semibold text-slate-600 mt-4 group-hover:translate-x-0.5 transition-transform inline-flex items-center gap-1">
                  Review Payments →
                </span>
              </button>
            </div>
          </div>
        )}

        {/* Tab Components */}
        {activeTab === 'leads' && (
          <AdminLeads onNavigateToBooking={() => { setActiveTab('bookings'); setBookingFilter('all'); }} />
        )}
        {activeTab === 'calendar' && <AvailabilityCalendar bikes={getFleetBikes()} isAdminMode={true} />}
        {activeTab === 'upcoming' && <UpcomingReservations onRefreshStats={fetchStats} />}
        {activeTab === 'bookings' && <AdminBookings initialFilter={bookingFilter} />}
        {activeTab === 'hotels' && <AdminHotels />}
        {activeTab === 'fleet' && <AdminFleet />}
        {activeTab === 'finance' && <FinanceLedger currentSubView={financeSubView} onSubViewChange={setFinanceSubView} />}
        {activeTab === 'users' && <AdminUsers />}
      </main>
    </div>
  );
};
