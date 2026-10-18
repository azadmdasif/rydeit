import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { supabase } from '../supabase';
import type { Bike, BikeCategory } from '../types';
import { saveFleetBike, getFleetBikes, syncFleetWithSupabase } from '../fleetStorage';
import { 
  Calendar as CalendarIcon, 
  ChevronLeft, 
  ChevronRight, 
  RefreshCw,
  PhoneCall,
  Ban,
  CheckCircle2,
  Clock,
  Search,
  ArrowRight,
  Filter,
  Sparkles,
  X
} from 'lucide-react';

interface AvailabilityCalendarProps {
  bikes: Bike[];
  isAdminMode?: boolean;
}

interface RawBooking {
  id: number;
  readable_id: string;
  bike_id: number;
  pickup_date: string;
  pickup_time: string;
  return_date: string;
  return_time: string;
  status: string;
  customer_name?: string;
  advance_amount?: number;
  total_rent?: number;
}

export interface TimelineSegment {
  type: 'free' | 'booked';
  startMin: number;
  endMin: number;
  startPct: number;
  widthPct: number;
  startTimeLabel: string;
  endTimeLabel: string;
  durationMinutes: number;
  booking?: RawBooking;
}

export interface TimelineDot {
  type: 'start' | 'end';
  minute: number;
  pct: number;
  timeLabel: string;
  booking: RawBooking;
}

export interface DayTimelineData {
  dateStr: string;
  isFullyBooked: boolean;
  isFullyFree: boolean;
  isPartial: boolean;
  freeMinutes: number;
  bookedMinutes: number;
  freeSlotsSummary: string;
  segments: TimelineSegment[];
  dots: TimelineDot[];
}

const LOCAL_STORAGE_BLOCKED_BIKES_KEY = 'rydeit_future_blocked_bikes_v1';

function getBlockedBikeIds(): number[] {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_BLOCKED_BIKES_KEY);
    if (raw) return JSON.parse(raw);
  } catch (err) {
    console.error('Error reading blocked bike ids:', err);
  }
  return [];
}

function setStoredBlockedBikeIds(ids: number[]) {
  try {
    localStorage.setItem(LOCAL_STORAGE_BLOCKED_BIKES_KEY, JSON.stringify(ids));
    window.dispatchEvent(new CustomEvent('rydeit_blocked_bikes_updated', { detail: ids }));
  } catch (err) {
    console.error('Error saving blocked bike ids:', err);
  }
}

function parseTimeToMinutes(t?: string, defaultHour = 10): number {
  if (!t) return defaultHour * 60;
  const parts = t.trim().split(':');
  const h = parseInt(parts[0], 10);
  const m = parts[1] ? parseInt(parts[1], 10) : 0;
  if (isNaN(h)) return defaultHour * 60;
  return Math.min(1440, Math.max(0, h * 60 + (isNaN(m) ? 0 : m)));
}

function formatMinutesToTime(min: number): string {
  const clamped = Math.min(1440, Math.max(0, min));
  const h = Math.min(24, Math.floor(clamped / 60));
  const m = clamped % 60;
  const hh = String(h).padStart(2, '0');
  const mm = String(m).padStart(2, '0');
  return `${hh}:${mm}`;
}

export function computeDayTimeline(dateStr: string, bikeId: number, activeBookings: RawBooking[]): DayTimelineData {
  const dayBookings = activeBookings
    .filter(b => b.bike_id === bikeId && b.pickup_date <= dateStr && b.return_date >= dateStr)
    .sort((a, b) => {
      const aStart = a.pickup_date === dateStr ? parseTimeToMinutes(a.pickup_time, 10) : 0;
      const bStart = b.pickup_date === dateStr ? parseTimeToMinutes(b.pickup_time, 10) : 0;
      return aStart - bStart;
    });

  if (dayBookings.length === 0) {
    return {
      dateStr,
      isFullyBooked: false,
      isFullyFree: true,
      isPartial: false,
      freeMinutes: 1440,
      bookedMinutes: 0,
      freeSlotsSummary: 'Free all day',
      segments: [{
        type: 'free',
        startMin: 0,
        endMin: 1440,
        startPct: 0,
        widthPct: 100,
        startTimeLabel: '00:00',
        endTimeLabel: '24:00',
        durationMinutes: 1440
      }],
      dots: []
    };
  }

  interface RawInterval {
    start: number;
    end: number;
    booking: RawBooking;
  }

  const rawIntervals: RawInterval[] = [];
  const dots: TimelineDot[] = [];

  dayBookings.forEach(b => {
    let startMin = 0;
    if (b.pickup_date === dateStr) {
      startMin = parseTimeToMinutes(b.pickup_time, 10);
      dots.push({
        type: 'start',
        minute: startMin,
        pct: (startMin / 1440) * 100,
        timeLabel: b.pickup_time?.slice(0, 5) || '10:00',
        booking: b
      });
    }

    let endMin = 1440;
    if (b.return_date === dateStr) {
      endMin = parseTimeToMinutes(b.return_time, 20);
      dots.push({
        type: 'end',
        minute: endMin,
        pct: (endMin / 1440) * 100,
        timeLabel: b.return_time?.slice(0, 5) || '20:00',
        booking: b
      });
    }

    if (endMin > startMin) {
      rawIntervals.push({
        start: startMin,
        end: endMin,
        booking: b
      });
    }
  });

  rawIntervals.sort((a, b) => a.start - b.start);

  const mergedIntervals: RawInterval[] = [];
  for (const interval of rawIntervals) {
    if (mergedIntervals.length === 0) {
      mergedIntervals.push({ ...interval });
    } else {
      const prev = mergedIntervals[mergedIntervals.length - 1];
      if (interval.start <= prev.end) {
        prev.end = Math.max(prev.end, interval.end);
      } else {
        mergedIntervals.push({ ...interval });
      }
    }
  }

  const segments: TimelineSegment[] = [];
  let currentCursor = 0;
  let totalBookedMin = 0;

  mergedIntervals.forEach(interval => {
    if (interval.start > currentCursor) {
      const freeDur = interval.start - currentCursor;
      segments.push({
        type: 'free',
        startMin: currentCursor,
        endMin: interval.start,
        startPct: (currentCursor / 1440) * 100,
        widthPct: (freeDur / 1440) * 100,
        startTimeLabel: formatMinutesToTime(currentCursor),
        endTimeLabel: formatMinutesToTime(interval.start),
        durationMinutes: freeDur
      });
    }

    const bookedDur = interval.end - interval.start;
    totalBookedMin += bookedDur;
    segments.push({
      type: 'booked',
      startMin: interval.start,
      endMin: interval.end,
      startPct: (interval.start / 1440) * 100,
      widthPct: (bookedDur / 1440) * 100,
      startTimeLabel: formatMinutesToTime(interval.start),
      endTimeLabel: formatMinutesToTime(interval.end),
      durationMinutes: bookedDur,
      booking: interval.booking
    });

    currentCursor = Math.max(currentCursor, interval.end);
  });

  if (currentCursor < 1440) {
    const freeDur = 1440 - currentCursor;
    segments.push({
      type: 'free',
      startMin: currentCursor,
      endMin: 1440,
      startPct: (currentCursor / 1440) * 100,
      widthPct: (freeDur / 1440) * 100,
      startTimeLabel: formatMinutesToTime(currentCursor),
      endTimeLabel: '24:00',
      durationMinutes: freeDur
    });
  }

  const isFullyBooked = totalBookedMin >= 1430;
  const isFullyFree = totalBookedMin === 0;
  const isPartial = !isFullyBooked && !isFullyFree;
  const freeMinutes = 1440 - totalBookedMin;

  let freeSlotsSummary = '';
  if (isFullyBooked) {
    freeSlotsSummary = 'Booked';
  } else if (isFullyFree) {
    freeSlotsSummary = 'Empty (All Day)';
  } else {
    const freeSegs = segments.filter(s => s.type === 'free' && s.durationMinutes >= 60);
    if (freeSegs.length === 1) {
      const seg = freeSegs[0];
      if (seg.startMin === 0) {
        freeSlotsSummary = `Free till ${seg.endTimeLabel}`;
      } else if (seg.endMin === 1440) {
        freeSlotsSummary = `Free from ${seg.startTimeLabel}`;
      } else {
        freeSlotsSummary = `Free: ${seg.startTimeLabel}–${seg.endTimeLabel}`;
      }
    } else if (freeSegs.length > 1) {
      freeSlotsSummary = `Free: ${freeSegs.map(s => `${s.startTimeLabel}–${s.endTimeLabel}`).join(', ')}`;
    } else {
      freeSlotsSummary = 'Short slot open';
    }
  }

  return {
    dateStr,
    isFullyBooked,
    isFullyFree,
    isPartial,
    freeMinutes,
    bookedMinutes: totalBookedMin,
    freeSlotsSummary,
    segments,
    dots
  };
}

export const AvailabilityCalendar: React.FC<AvailabilityCalendarProps> = ({ bikes: propBikes, isAdminMode = false }) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  // Fleet list state
  const [fleetList, setFleetList] = useState<Bike[]>(() => propBikes.length > 0 ? propBikes : getFleetBikes());
  const [blockedIds, setBlockedIds] = useState<number[]>(getBlockedBikeIds);

  useEffect(() => {
    if (propBikes && propBikes.length > 0) {
      setFleetList(propBikes);
    }
  }, [propBikes]);

  // Active view: 'calendar' or 'sales_checker'
  const [activeView, setActiveView] = useState<'calendar' | 'sales_checker'>('calendar');

  // Selected bike
  const [selectedBikeId, setSelectedBikeId] = useState<string>(() => {
    const param = searchParams.get('bikeId');
    if (param) return param;
    return fleetList.length > 0 ? fleetList[0].id.toString() : 'all';
  });

  const [loading, setLoading] = useState<boolean>(true);
  const [bookings, setBookings] = useState<RawBooking[]>([]);
  const [selectedDateModal, setSelectedDateModal] = useState<string | null>(null);

  // Sales Call Quick Finder Inputs
  const todayDateStr = useMemo(() => new Date().toISOString().split('T')[0], []);
  const [salesDate, setSalesDate] = useState<string>(todayDateStr);
  const [salesCategory, setSalesCategory] = useState<string>('all');

  // Month navigation
  const [currentDate, setCurrentDate] = useState<Date>(() => {
    const paramMonth = searchParams.get('month');
    if (paramMonth && /^\d{4}-\d{2}$/.test(paramMonth)) {
      const [y, m] = paramMonth.split('-').map(Number);
      return new Date(y, m - 1, 1);
    }
    return new Date();
  });

  const handleSelectBike = (bikeId: string) => {
    setSelectedBikeId(bikeId);
    const newParams = new URLSearchParams(searchParams);
    if (bikeId === 'all') {
      newParams.delete('bikeId');
    } else {
      newParams.set('bikeId', bikeId);
    }
    setSearchParams(newParams);
  };

  // Fetch bookings and sync fleet from Supabase (ensuring cross-device synchronization)
  const refreshAllData = async () => {
    setLoading(true);
    try {
      // 1. Fetch bookings
      const bookingsPromise = supabase
        .from('bookings')
        .select('id, readable_id, bike_id, pickup_date, pickup_time, return_date, return_time, status, customer_name, advance_amount, total_rent')
        .order('pickup_date', { ascending: true })
        .order('pickup_time', { ascending: true });

      // 2. Fetch fleet bikes from Supabase
      const fleetPromise = syncFleetWithSupabase();

      const [bookingsRes, fleetRes] = await Promise.all([bookingsPromise, fleetPromise]);

      if (bookingsRes.data) {
        setBookings(bookingsRes.data as RawBooking[]);
      }

      if (fleetRes && fleetRes.bikes && fleetRes.bikes.length > 0) {
        setFleetList(fleetRes.bikes);
        // Sync blocked IDs from bikes having status 'Maintenance'
        const dbBlocked = fleetRes.bikes.filter(b => b.status === 'Maintenance').map(b => b.id);
        const combinedBlocked = Array.from(new Set([...getBlockedBikeIds(), ...dbBlocked]));
        setStoredBlockedBikeIds(combinedBlocked);
        setBlockedIds(combinedBlocked);
      }
    } catch (err) {
      console.error('Failed to load data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshAllData();

    // Listen for local fleet updates
    const handleFleetUpdated = (e: any) => {
      if (e.detail?.id) {
        setFleetList(prev => prev.map(b => b.id === e.detail.id ? { ...b, ...e.detail } : b));
      }
    };
    window.addEventListener('rydeit_fleet_updated', handleFleetUpdated);

    // Cross-device Supabase Realtime channel
    const channel = supabase
      .channel('availability_realtime_sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bikes' }, () => {
        syncFleetWithSupabase().then(res => {
          if (res?.bikes) {
            setFleetList(res.bikes);
            const dbBlocked = res.bikes.filter(b => b.status === 'Maintenance').map(b => b.id);
            setBlockedIds(Array.from(new Set([...getBlockedBikeIds(), ...dbBlocked])));
          }
        });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bookings' }, () => {
        supabase
          .from('bookings')
          .select('id, readable_id, bike_id, pickup_date, pickup_time, return_date, return_time, status, customer_name, advance_amount, total_rent')
          .order('pickup_date', { ascending: true })
          .then(({ data }) => {
            if (data) setBookings(data as RawBooking[]);
          });
      })
      .subscribe();

    return () => {
      window.removeEventListener('rydeit_fleet_updated', handleFleetUpdated);
      supabase.removeChannel(channel);
    };
  }, []);

  // Filter to active confirmed bookings
  const activeBookings = useMemo(() => {
    return bookings.filter(b => b.status === 'booking_confirmed' || b.status === 'ongoing');
  }, [bookings]);

  // Selected bike object
  const selectedBike = useMemo(() => {
    if (selectedBikeId === 'all') return null;
    return fleetList.find(b => b.id.toString() === selectedBikeId) || null;
  }, [selectedBikeId, fleetList]);

  // Check if a bike is blocked for future slots
  const isBikeBlocked = (bikeId: number) => {
    if (blockedIds.includes(bikeId)) return true;
    const b = fleetList.find(item => item.id === bikeId);
    return b?.status === 'Maintenance';
  };

  // Toggle mark future slots unavailable (persisted to Supabase and synced across devices)
  const handleToggleBlockFutureSlots = async (bikeId: number) => {
    const isCurrentlyBlocked = isBikeBlocked(bikeId);
    let updated: number[];
    const nextStatus = isCurrentlyBlocked ? 'Available' : 'Maintenance';

    if (isCurrentlyBlocked) {
      updated = blockedIds.filter(id => id !== bikeId);
    } else {
      updated = Array.from(new Set([...blockedIds, bikeId]));
    }

    setStoredBlockedBikeIds(updated);
    setBlockedIds(updated);
    setFleetList(prev => prev.map(b => b.id === bikeId ? { ...b, status: nextStatus } : b));

    // Persist to Supabase so other devices receive the update immediately
    await saveFleetBike({ id: bikeId, status: nextStatus });
  };

  // Calendar metrics
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfWeek = new Date(year, month, 1).getDay();
  const startOffset = (firstDayOfWeek + 6) % 7;
  const prevMonthDays = new Date(year, month, 0).getDate();

  const handlePrevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const handleNextMonth = () => setCurrentDate(new Date(year, month + 1, 1));
  const handleToday = () => setCurrentDate(new Date());

  const formatDateStr = (y: number, m: number, d: number) => {
    const mm = String(m + 1).padStart(2, '0');
    const dd = String(d).padStart(2, '0');
    return `${y}-${mm}-${dd}`;
  };

  const todayStr = useMemo(() => {
    const now = new Date();
    return formatDateStr(now.getFullYear(), now.getMonth(), now.getDate());
  }, []);

  // Map of daily availability stats for the month
  const dailyStatsMap = useMemo(() => {
    const map = new Map<string, { 
      total: number; 
      booked: number; 
      available: number; 
      blocked: number; 
      bookedBikes: { bike: Bike; bookings: RawBooking[] }[]; 
      availableBikes: Bike[];
      blockedBikes: Bike[];
    }>();

    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = formatDateStr(year, month, day);
      let bookedCount = 0;
      let blockedCount = 0;
      const bookedBikes: { bike: Bike; bookings: RawBooking[] }[] = [];
      const availableBikes: Bike[] = [];
      const blockedBikesList: Bike[] = [];

      fleetList.forEach(bike => {
        if (isBikeBlocked(bike.id)) {
          blockedCount++;
          blockedBikesList.push(bike);
          return;
        }

        const bikeBookings = activeBookings.filter(b => b.bike_id === bike.id && b.pickup_date <= dateStr && b.return_date >= dateStr);
        if (bikeBookings.length > 0) {
          bookedCount++;
          bookedBikes.push({ bike, bookings: bikeBookings });
        } else {
          availableBikes.push(bike);
        }
      });

      const totalOperational = fleetList.length - blockedCount;
      const availableCount = Math.max(0, totalOperational - bookedCount);

      map.set(dateStr, {
        total: totalOperational,
        booked: bookedCount,
        available: availableCount,
        blocked: blockedCount,
        bookedBikes,
        availableBikes,
        blockedBikes: blockedBikesList
      });
    }

    return map;
  }, [fleetList, activeBookings, blockedIds, year, month, daysInMonth]);

  // Overall stats
  const overallStats = useMemo(() => {
    const todayStat = dailyStatsMap.get(todayStr) || { total: fleetList.length, booked: 0, available: fleetList.length };
    return {
      totalFleet: fleetList.length,
      todayAvailable: todayStat.available,
      todayBooked: todayStat.booked
    };
  }, [dailyStatsMap, fleetList, todayStr]);

  // Sales Call Helper: Alternate Bikes in same category on salesDate or today
  const alternateBikesForSelected = useMemo(() => {
    if (!selectedBike) return [];
    const dateToCheck = selectedDateModal || salesDate || todayStr;
    const sameCat = fleetList.filter(b => b.id !== selectedBike.id && b.category === selectedBike.category && !isBikeBlocked(b.id));
    
    return sameCat.filter(b => {
      const bBookings = activeBookings.filter(bk => bk.bike_id === b.id && bk.pickup_date <= dateToCheck && bk.return_date >= dateToCheck);
      return bBookings.length === 0;
    });
  }, [selectedBike, fleetList, blockedIds, activeBookings, selectedDateModal, salesDate, todayStr]);

  // Sales Call Helper: Upcoming empty slots for selected bike
  const nextEmptySlotsForSelected = useMemo(() => {
    if (!selectedBike || isBikeBlocked(selectedBike.id)) return [];
    const emptySlots: { date: string; summary: string }[] = [];
    const start = new Date();

    for (let i = 0; i < 7; i++) {
      const d = new Date(start.getTime() + i * 86400000);
      const dStr = d.toISOString().split('T')[0];
      const tl = computeDayTimeline(dStr, selectedBike.id, activeBookings);
      if (!tl.isFullyBooked) {
        emptySlots.push({
          date: dStr,
          summary: tl.freeSlotsSummary
        });
      }
    }
    return emptySlots;
  }, [selectedBike, activeBookings, blockedIds]);

  // Quick Book handler
  const handleBookSlot = (bikeId: number, fromDate: string, fromTime?: string, toDate?: string, toTime?: string) => {
    const params = new URLSearchParams();
    params.set('bikeId', bikeId.toString());
    if (fromDate) params.set('from', fromDate);
    if (fromTime) params.set('fromTime', fromTime);
    if (toDate) params.set('to', toDate);
    if (toTime) params.set('toTime', toTime);
    navigate(`/book?${params.toString()}`);
  };

  return (
    <div className={`w-full ${isAdminMode ? 'bg-transparent text-slate-100' : 'bg-black text-slate-100 py-6 px-3 md:px-6'}`}>
      <div className="max-w-7xl mx-auto space-y-4">

        {/* Top Header: Short, Minimal, High Contrast */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-neutral-900 pb-3">
          <div className="flex items-center gap-2.5">
            <span className="w-2.5 h-2.5 rounded-full bg-orange-500"></span>
            <h1 className="text-lg font-bold text-white uppercase tracking-wider">Availability</h1>
            <div className="flex items-center gap-2 ml-2 text-xs">
              <span className="text-neutral-400">Fleet: <strong className="text-white">{overallStats.totalFleet}</strong></span>
              <span className="text-neutral-700">|</span>
              <span className="text-emerald-400 font-semibold">{overallStats.todayAvailable} Free Today</span>
              <span className="text-neutral-700">|</span>
              <span className="text-orange-400 font-semibold">{overallStats.todayBooked} Booked</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* View Switcher: Calendar vs Sales Call Finder */}
            <div className="bg-neutral-950 p-1 rounded-xl border border-neutral-800 flex items-center gap-1">
              <button
                type="button"
                onClick={() => setActiveView('calendar')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  activeView === 'calendar' 
                    ? 'bg-neutral-800 text-white shadow-sm' 
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                Calendar
              </button>
              <button
                type="button"
                onClick={() => setActiveView('sales_checker')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                  activeView === 'sales_checker' 
                    ? 'bg-orange-600 text-white shadow-sm' 
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                <PhoneCall className="w-3 h-3 text-orange-400" />
                <span>Sales Finder</span>
              </button>
            </div>

            <button
              type="button"
              onClick={refreshAllData}
              disabled={loading}
              className="p-2 rounded-xl bg-neutral-950 hover:bg-neutral-900 border border-neutral-800 text-neutral-300 hover:text-white transition-all cursor-pointer"
              title="Refresh"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-orange-400' : ''}`} />
            </button>
          </div>
        </div>

        {/* SALES CALL QUICK FINDER (Direct answer during calls) */}
        {activeView === 'sales_checker' && (
          <div className="bg-[#0a0a0a] border border-neutral-800 rounded-2xl p-4 sm:p-5 space-y-4 animate-fade-in shadow-xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-neutral-800/80 pb-3">
              <div className="flex items-center gap-2">
                <PhoneCall className="w-4 h-4 text-orange-500" />
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                  Live Dispatch & Alternates
                </h3>
              </div>

              {/* 1-Tap Date Presets */}
              <div className="flex items-center gap-1.5 text-xs">
                <span className="text-neutral-500 text-[11px]">Quick Date:</span>
                {[
                  { label: 'Today', days: 0 },
                  { label: 'Tomorrow', days: 1 },
                  { label: 'This Sat', days: ((6 - new Date().getDay() + 7) % 7) || 7 },
                  { label: 'This Sun', days: ((7 - new Date().getDay() + 7) % 7) || 7 }
                ].map(p => {
                  const targetD = new Date(Date.now() + p.days * 86400000).toISOString().split('T')[0];
                  const isActive = salesDate === targetD;
                  return (
                    <button
                      key={p.label}
                      type="button"
                      onClick={() => setSalesDate(targetD)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                        isActive
                          ? 'bg-orange-500/20 border-orange-500 text-orange-400'
                          : 'bg-neutral-900 border-neutral-800 text-neutral-400 hover:text-white'
                      }`}
                    >
                      {p.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Filter Controls */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] uppercase font-bold text-neutral-400 block mb-1">
                  Enquiry Date
                </label>
                <input
                  type="date"
                  value={salesDate}
                  onChange={(e) => setSalesDate(e.target.value)}
                  className="w-full bg-black border border-neutral-800 rounded-xl px-3 py-2 text-xs text-white focus:border-orange-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-[10px] uppercase font-bold text-neutral-400 block mb-1">
                  Vehicle Category Filter
                </label>
                <select
                  value={salesCategory}
                  onChange={(e) => setSalesCategory(e.target.value)}
                  className="w-full bg-black border border-neutral-800 rounded-xl px-3 py-2 text-xs text-white focus:border-orange-500 focus:outline-none"
                >
                  <option value="all">All Fleet Categories</option>
                  <option value="Scooter">Scooters (Activa, Burgman, Jupiter)</option>
                  <option value="Royal Enfield">Royal Enfield (Classic, Hunter 350)</option>
                  <option value="Sports">Sports Bikes (R15, Duke, NS200)</option>
                  <option value="Bikes">Commuter Bikes (Xtreme, Shine, Pulsar)</option>
                </select>
              </div>
            </div>

            {/* Real-time Matching Bikes Result */}
            {(() => {
              const categoryFiltered = salesCategory === 'all' 
                ? fleetList 
                : fleetList.filter(b => b.category === salesCategory);

              const emptyBikes: { bike: Bike; timeline: DayTimelineData }[] = [];
              const partialBikes: { bike: Bike; timeline: DayTimelineData }[] = [];
              const bookedBikes: { bike: Bike; timeline: DayTimelineData; booking?: RawBooking }[] = [];
              const blockedBikes: Bike[] = [];

              categoryFiltered.forEach(b => {
                if (isBikeBlocked(b.id)) {
                  blockedBikes.push(b);
                  return;
                }
                const tl = computeDayTimeline(salesDate, b.id, activeBookings);
                if (tl.isFullyFree) {
                  emptyBikes.push({ bike: b, timeline: tl });
                } else if (tl.isFullyBooked) {
                  const bkg = activeBookings.find(bk => bk.bike_id === b.id && bk.pickup_date <= salesDate && bk.return_date >= salesDate);
                  bookedBikes.push({ bike: b, timeline: tl, booking: bkg });
                } else {
                  partialBikes.push({ bike: b, timeline: tl });
                }
              });

              return (
                <div className="space-y-4 pt-2">
                  {/* Empty Vehicles - Ready to Recommend */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        Empty / Available Vehicles ({emptyBikes.length})
                      </span>
                      <span className="text-[10px] text-neutral-500">Ready for instant confirmation</span>
                    </div>

                    {emptyBikes.length === 0 ? (
                      <div className="p-3 rounded-xl bg-black border border-neutral-800 text-xs text-neutral-500 italic">
                        No 100% empty vehicles in this category for {salesDate}. Check partial slots below.
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                        {emptyBikes.map(({ bike }) => (
                          <div 
                            key={bike.id} 
                            className="bg-black border border-emerald-500/25 p-3 rounded-xl flex items-center justify-between hover:border-emerald-500/50 transition-colors"
                          >
                            <div>
                              <div className="flex items-center gap-1.5">
                                <span className="font-bold text-white text-xs">{bike.name}</span>
                                <span className="text-[10px] text-neutral-400">({bike.category})</span>
                              </div>
                              <div className="text-[11px] font-semibold text-emerald-400 mt-0.5">
                                ₹{bike.dailyRate}/day · 100% Empty
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleBookSlot(bike.id, salesDate, '10:00', salesDate, '20:00')}
                              className="px-2.5 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-[11px] transition-all cursor-pointer active:scale-95"
                            >
                              Reserve
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Partial Slots - Offer Alternate Time Slot to Customer */}
                  {partialBikes.length > 0 && (
                    <div className="space-y-2 pt-2 border-t border-neutral-900">
                      <span className="text-xs font-bold uppercase tracking-wider text-sky-400 flex items-center gap-1.5">
                        <Clock className="w-4 h-4 text-sky-400" />
                        Partial Slots Open ({partialBikes.length}) — Suggest Alternate Times
                      </span>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        {partialBikes.map(({ bike, timeline }) => (
                          <div key={bike.id} className="bg-black border border-sky-500/25 p-3 rounded-xl flex items-center justify-between">
                            <div>
                              <span className="font-bold text-white text-xs">{bike.name}</span>
                              <div className="text-xs text-sky-300 font-medium mt-0.5">
                                {timeline.freeSlotsSummary}
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedBikeId(bike.id.toString());
                                setSelectedDateModal(salesDate);
                              }}
                              className="px-2.5 py-1 rounded-lg bg-neutral-900 hover:bg-neutral-800 text-sky-300 border border-neutral-800 text-xs font-semibold cursor-pointer"
                            >
                              View Slots →
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Booked Vehicles - Suggest Alternate Bikes */}
                  {bookedBikes.length > 0 && (
                    <div className="space-y-2 pt-2 border-t border-neutral-900">
                      <span className="text-xs font-bold uppercase tracking-wider text-neutral-400 flex items-center gap-1.5">
                        <span>Booked Vehicles ({bookedBikes.length})</span>
                      </span>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {bookedBikes.map(({ bike, booking }) => {
                          // Suggest empty alternate in same category
                          const alt = emptyBikes.find(eb => eb.bike.category === bike.category);

                          return (
                            <div key={bike.id} className="bg-black/60 border border-neutral-900 p-2.5 rounded-xl flex items-center justify-between text-xs">
                              <div>
                                <span className="font-semibold text-neutral-300">{bike.name}</span>
                                <div className="text-[10px] text-neutral-500 mt-0.5">
                                  Booked {booking?.pickup_time?.slice(0, 5) || '10:00'} → {booking?.return_time?.slice(0, 5) || '20:00'}
                                </div>
                              </div>
                              {alt ? (
                                <button
                                  type="button"
                                  onClick={() => handleBookSlot(alt.bike.id, salesDate)}
                                  className="text-[10px] text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 px-2 py-1 rounded border border-emerald-500/30 font-semibold cursor-pointer"
                                >
                                  Suggest {alt.bike.name} →
                                </button>
                              ) : (
                                <span className="text-[10px] text-neutral-600">Unavailable</span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Blocked / Unavailable Vehicles */}
                  {blockedBikes.length > 0 && (
                    <div className="pt-2 border-t border-neutral-900 text-xs text-neutral-500 flex items-center justify-between">
                      <span>Blocked / Maintenance ({blockedBikes.length}): {blockedBikes.map(b => b.name).join(', ')}</span>
                    </div>
                  )}
                </div>
              );
            })()}
          </div>
        )}

        {/* CALENDAR CONTROLS & BIKE SELECTION */}
        <div className="bg-[#0a0a0a] border border-neutral-800 rounded-2xl p-3.5 flex flex-col md:flex-row md:items-center justify-between gap-3">
          
          {/* Bike Focus Selector Dropdown */}
          <div className="flex items-center gap-2 flex-1 max-w-md">
            <span className="text-xs font-bold text-neutral-400 uppercase tracking-wider shrink-0">
              Vehicle:
            </span>
            <select
              value={selectedBikeId}
              onChange={(e) => handleSelectBike(e.target.value)}
              className="w-full bg-black border border-neutral-800 text-neutral-200 text-xs font-semibold rounded-xl px-3 py-2 focus:border-orange-500 focus:outline-none cursor-pointer"
            >
              <option value="all">⚡ All Fleet (Overview)</option>
              <optgroup label="Scooters">
                {fleetList.filter(b => b.category === 'Scooter').map(b => (
                  <option key={b.id} value={b.id.toString()}>
                    {b.name} (₹{b.dailyRate}) {isBikeBlocked(b.id) ? '· [BLOCKED]' : ''}
                  </option>
                ))}
              </optgroup>
              <optgroup label="Royal Enfield">
                {fleetList.filter(b => b.category === 'Royal Enfield').map(b => (
                  <option key={b.id} value={b.id.toString()}>
                    {b.name} (₹{b.dailyRate}) {isBikeBlocked(b.id) ? '· [BLOCKED]' : ''}
                  </option>
                ))}
              </optgroup>
              <optgroup label="Sports">
                {fleetList.filter(b => b.category === 'Sports').map(b => (
                  <option key={b.id} value={b.id.toString()}>
                    {b.name} (₹{b.dailyRate}) {isBikeBlocked(b.id) ? '· [BLOCKED]' : ''}
                  </option>
                ))}
              </optgroup>
              <optgroup label="Commuters">
                {fleetList.filter(b => b.category === 'Bikes').map(b => (
                  <option key={b.id} value={b.id.toString()}>
                    {b.name} (₹{b.dailyRate}) {isBikeBlocked(b.id) ? '· [BLOCKED]' : ''}
                  </option>
                ))}
              </optgroup>
            </select>
          </div>

          {/* Month Switcher & Block Action */}
          <div className="flex items-center justify-between md:justify-end gap-2.5 flex-wrap">
            {/* Mark All Future Slots Unavailable Option */}
            {selectedBike && (
              <button
                type="button"
                onClick={() => handleToggleBlockFutureSlots(selectedBike.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer border ${
                  isBikeBlocked(selectedBike.id)
                    ? 'bg-rose-500/20 text-rose-300 border-rose-500/40 hover:bg-rose-500/30'
                    : 'bg-neutral-900 text-neutral-300 hover:text-white border-neutral-800 hover:border-neutral-700'
                }`}
                title={isBikeBlocked(selectedBike.id) ? 'Click to unblock and make available' : 'Mark all future slots unavailable for this bike'}
              >
                <Ban className="w-3.5 h-3.5" />
                <span>{isBikeBlocked(selectedBike.id) ? 'Unblock Future Slots' : 'Block All Future Slots'}</span>
              </button>
            )}

            {/* Month & Year Navigation */}
            <div className="flex items-center bg-black rounded-xl border border-neutral-800 p-1">
              <button
                type="button"
                onClick={handlePrevMonth}
                className="p-1 rounded-lg hover:bg-neutral-900 text-neutral-400 hover:text-white cursor-pointer"
                title="Prev Month"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="px-3 text-xs font-bold text-white min-w-[110px] text-center">
                {monthNames[month]} {year}
              </span>
              <button
                type="button"
                onClick={handleNextMonth}
                className="p-1 rounded-lg hover:bg-neutral-900 text-neutral-400 hover:text-white cursor-pointer"
                title="Next Month"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={handleToday}
                className="ml-1 px-2 py-0.5 rounded text-[11px] font-bold text-orange-400 hover:bg-neutral-900 cursor-pointer"
              >
                Today
              </button>
            </div>
          </div>
        </div>

        {/* Selected Bike Sales Banner (Shows alternate slots & alternate bikes) */}
        {selectedBike && (
          <div className="bg-[#0a0a0a] border border-neutral-800 rounded-2xl p-3 sm:p-4 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
              <div className="flex items-center gap-3">
                <img
                  src={selectedBike.imageUrl}
                  alt={selectedBike.name}
                  className="w-10 h-10 rounded-xl object-cover border border-neutral-800 bg-black shrink-0"
                  onError={(e) => { (e.target as HTMLImageElement).src = '/images/hero-xtreme-125r.jpg'; }}
                />
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-sm font-bold text-white">{selectedBike.name}</h2>
                    <span className="text-xs font-semibold text-neutral-300">₹{selectedBike.dailyRate}/day</span>
                    <span className="text-[10px] text-neutral-400">({selectedBike.category})</span>
                    {isBikeBlocked(selectedBike.id) && (
                      <span className="text-[10px] font-bold text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded border border-rose-500/30">
                        Future Slots Blocked
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-neutral-500 mt-0.5">
                    RC: {selectedBike.rc_number || 'WB-02-REG'} · Click any calendar day to inspect open hours or book.
                  </p>
                </div>
              </div>

              {/* Quick suggestion for Sales Call */}
              {alternateBikesForSelected.length > 0 && (
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-neutral-500 text-[11px]">Alternate Available {selectedBike.category}:</span>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {alternateBikesForSelected.slice(0, 2).map(alt => (
                      <button
                        key={alt.id}
                        type="button"
                        onClick={() => handleSelectBike(alt.id.toString())}
                        className="px-2.5 py-1 rounded-lg bg-neutral-900 hover:bg-neutral-800 text-emerald-400 border border-neutral-800 text-xs font-semibold cursor-pointer"
                        title={`Click to switch to ${alt.name}`}
                      >
                        {alt.name} (Free)
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Next Empty Windows (for sales call reference) */}
            {nextEmptySlotsForSelected.length > 0 && !isBikeBlocked(selectedBike.id) && (
              <div className="pt-2 border-t border-neutral-900 flex items-center gap-2 overflow-x-auto text-xs pb-0.5">
                <span className="text-[10px] uppercase font-bold text-neutral-500 shrink-0">
                  Upcoming Free Slots:
                </span>
                {nextEmptySlotsForSelected.map((slot, idx) => (
                  <span
                    key={idx}
                    onClick={() => setSelectedDateModal(slot.date)}
                    className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[11px] font-medium whitespace-nowrap cursor-pointer hover:bg-emerald-500/20"
                  >
                    {slot.date.slice(5)}: {slot.summary}
                  </span>
                ))}
              </div>
            )}
          </div>
        )}

        {/* HIGH-READABILITY MONTH CALENDAR GRID */}
        <div className="bg-[#0a0a0a] border border-neutral-800 rounded-2xl overflow-hidden shadow-sm">
          {/* Weekday headers */}
          <div className="grid grid-cols-7 bg-black border-b border-neutral-800 text-center py-2">
            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => (
              <div key={day} className="text-xs font-bold text-neutral-400 uppercase tracking-wider">
                {day}
              </div>
            ))}
          </div>

          {/* Days Grid */}
          <div className="grid grid-cols-7 divide-x divide-y divide-neutral-900 bg-black">
            {/* Leading days from previous month */}
            {Array.from({ length: startOffset }).map((_, idx) => {
              const dayNum = prevMonthDays - startOffset + idx + 1;
              return (
                <div key={`prev-${idx}`} className="min-h-[75px] md:min-h-[90px] p-2 bg-black opacity-15 select-none">
                  <span className="text-xs text-neutral-600 font-semibold">{dayNum}</span>
                </div>
              );
            })}

            {/* Current month days */}
            {Array.from({ length: daysInMonth }).map((_, idx) => {
              const day = idx + 1;
              const dateStr = formatDateStr(year, month, day);
              const isToday = dateStr === todayStr;
              const isPast = dateStr < todayStr;
              const stats = dailyStatsMap.get(dateStr) || { total: fleetList.length, booked: 0, available: fleetList.length, blocked: 0, bookedBikes: [], availableBikes: [], blockedBikes: [] };

              const dayTimeline = selectedBike ? computeDayTimeline(dateStr, selectedBike.id, activeBookings) : null;
              const isBlocked = selectedBike ? isBikeBlocked(selectedBike.id) : false;

              return (
                <div
                  key={dateStr}
                  onClick={() => setSelectedDateModal(dateStr)}
                  className={`min-h-[85px] md:min-h-[100px] p-2 md:p-2.5 transition-all cursor-pointer flex flex-col justify-between hover:bg-[#0e0e0e] relative select-none ${
                    isToday ? 'bg-orange-500/10 border-t-2 border-t-orange-500' : 'bg-black'
                  }`}
                >
                  {/* Date Header Row */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <span className={`text-xs font-bold ${isToday ? 'text-orange-400 font-black' : isPast ? 'text-neutral-500' : 'text-neutral-200'}`}>
                        {day}
                      </span>
                      {isToday && (
                        <span className="text-[8px] font-black uppercase text-orange-400 bg-orange-500/20 px-1 py-0.2 rounded border border-orange-500/30">
                          Today
                        </span>
                      )}
                    </div>

                    {/* Status Pill on Day Cell */}
                    {selectedBike ? (
                      isBlocked ? (
                        <span className="text-[9px] font-bold text-rose-400 bg-rose-500/10 px-1.5 py-0.2 rounded">
                          Blocked
                        </span>
                      ) : dayTimeline?.isFullyFree ? (
                        <span className="text-[9px] font-bold text-emerald-400 bg-emerald-500/15 px-1.5 py-0.2 rounded">
                          Empty
                        </span>
                      ) : dayTimeline?.isFullyBooked ? (
                        <span className="text-[9px] font-bold text-orange-400 bg-orange-500/15 px-1.5 py-0.2 rounded">
                          Booked
                        </span>
                      ) : (
                        <span className="text-[9px] font-bold text-sky-300 bg-sky-500/15 px-1.5 py-0.2 rounded">
                          Partial
                        </span>
                      )
                    ) : (
                      <span className="text-[9px] font-mono text-emerald-400 font-semibold">
                        {stats.available} free
                      </span>
                    )}
                  </div>

                  {/* Day Content: Short Summary */}
                  <div className="my-1 text-[10.5px] leading-tight">
                    {selectedBike && dayTimeline ? (
                      isBlocked ? (
                        <span className="text-[10px] text-neutral-500 font-medium">Unavailable</span>
                      ) : (
                        <span className={`truncate block font-medium ${
                          dayTimeline.isFullyFree ? 'text-emerald-300' : dayTimeline.isFullyBooked ? 'text-orange-300' : 'text-sky-300'
                        }`}>
                          {dayTimeline.freeSlotsSummary}
                        </span>
                      )
                    ) : (
                      <div className="flex items-center justify-between text-[10px] text-neutral-400 font-medium">
                        <span className="text-emerald-400">{stats.available} Free</span>
                        {stats.booked > 0 && <span className="text-orange-400">{stats.booked} Booked</span>}
                      </div>
                    )}
                  </div>

                  {/* Clean 24-Hour Flat Timeline Bar */}
                  {selectedBike && dayTimeline ? (
                    <div className="w-full h-1.5 rounded-full bg-neutral-900 overflow-hidden flex shadow-inner">
                      {isBlocked ? (
                        <div className="w-full h-full bg-neutral-800" />
                      ) : (
                        dayTimeline.segments.map((seg, sIdx) => (
                          <div
                            key={sIdx}
                            className={`h-full ${
                              seg.type === 'booked' ? 'bg-orange-500' : 'bg-emerald-500'
                            }`}
                            style={{ width: `${seg.widthPct}%` }}
                            title={`${seg.type === 'booked' ? 'Booked' : 'Empty'}: ${seg.startTimeLabel}–${seg.endTimeLabel}`}
                          />
                        ))
                      )}
                    </div>
                  ) : (
                    <div className="w-full h-1.5 rounded-full bg-neutral-900 overflow-hidden flex">
                      <div 
                        className="bg-emerald-500 h-full" 
                        style={{ width: `${stats.total > 0 ? (stats.available / stats.total) * 100 : 100}%` }} 
                      />
                      <div 
                        className="bg-orange-500 h-full" 
                        style={{ width: `${stats.total > 0 ? (stats.booked / stats.total) * 100 : 0}%` }} 
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* DAY DISPATCH & INSPECT MODAL (Opens when clicking any date) */}
        {selectedDateModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-sm animate-fade-in">
            <div className="bg-[#0a0a0a] border border-neutral-800 rounded-3xl w-full max-w-xl max-h-[85vh] overflow-hidden flex flex-col shadow-2xl">
              
              {/* Header */}
              <div className="p-4 bg-black border-b border-neutral-800 flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-white">
                    {new Date(selectedDateModal).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
                  </h3>
                  <p className="text-xs text-neutral-400">Available vehicles & handover slots</p>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedDateModal(null)}
                  className="p-1.5 rounded-xl bg-neutral-900 text-neutral-400 hover:text-white cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Body */}
              <div className="p-4 overflow-y-auto space-y-4 flex-1">
                {/* If a bike is focused, show its detailed slots */}
                {selectedBike && (() => {
                  const dayTL = computeDayTimeline(selectedDateModal, selectedBike.id, activeBookings);
                  const isBlocked = isBikeBlocked(selectedBike.id);
                  const freeSegs = dayTL.segments.filter(s => s.type === 'free' && s.durationMinutes >= 60);

                  return (
                    <div className="bg-black p-3.5 rounded-2xl border border-neutral-800 space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="font-bold text-white text-sm">{selectedBike.name}</span>
                          <span className="text-neutral-400 text-xs ml-2">₹{selectedBike.dailyRate}/day</span>
                        </div>
                        <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                          isBlocked ? 'bg-rose-500/10 text-rose-400' :
                          dayTL.isFullyFree ? 'bg-emerald-500/15 text-emerald-400' :
                          dayTL.isFullyBooked ? 'bg-orange-500/15 text-orange-400' :
                          'bg-sky-500/15 text-sky-300'
                        }`}>
                          {isBlocked ? 'Blocked' : dayTL.freeSlotsSummary}
                        </span>
                      </div>

                      {/* Timeline Bar */}
                      <div className="space-y-1">
                        <div className="w-full h-3 rounded-lg bg-neutral-900 overflow-hidden flex">
                          {isBlocked ? (
                            <div className="w-full h-full bg-neutral-800" />
                          ) : (
                            dayTL.segments.map((seg, idx) => (
                              <div
                                key={idx}
                                className={`h-full ${seg.type === 'booked' ? 'bg-orange-500' : 'bg-emerald-500'}`}
                                style={{ width: `${seg.widthPct}%` }}
                                title={`${seg.startTimeLabel}–${seg.endTimeLabel}`}
                              />
                            ))
                          )}
                        </div>
                        <div className="flex justify-between text-[9px] font-mono text-neutral-500">
                          <span>00:00</span>
                          <span>06:00</span>
                          <span>12:00</span>
                          <span>18:00</span>
                          <span>24:00</span>
                        </div>
                      </div>

                      {/* Open slots to book */}
                      {!isBlocked && freeSegs.length > 0 && (
                        <div className="space-y-1.5 pt-1">
                          <span className="text-[10px] uppercase font-bold text-emerald-400 block">
                            Empty Slots Ready To Book:
                          </span>
                          {freeSegs.map((seg, idx) => (
                            <div key={idx} className="flex items-center justify-between p-2 rounded-xl bg-neutral-950 border border-neutral-800 text-xs">
                              <div>
                                <span className="font-mono text-white font-bold">{seg.startTimeLabel} → {seg.endTimeLabel}</span>
                                <span className="text-neutral-400 text-[11px] ml-2">({Math.round(seg.durationMinutes / 60)}h free)</span>
                              </div>
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedDateModal(null);
                                  handleBookSlot(selectedBike.id, selectedDateModal, seg.startTimeLabel, selectedDateModal, seg.endTimeLabel);
                                }}
                                className="px-3 py-1 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xs cursor-pointer"
                              >
                                Reserve Slot
                              </button>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Alternate Vehicles in same category if booked */}
                      {dayTL.isFullyBooked && alternateBikesForSelected.length > 0 && (
                        <div className="p-3 bg-neutral-950 rounded-xl border border-neutral-800 space-y-2">
                          <span className="text-xs font-bold text-orange-400 block">
                            Bike is booked! Suggest these empty {selectedBike.category} alternatives:
                          </span>
                          <div className="space-y-1">
                            {alternateBikesForSelected.map(alt => (
                              <div key={alt.id} className="flex items-center justify-between text-xs">
                                <span className="text-white font-medium">{alt.name} (₹{alt.dailyRate}/day)</span>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSelectedDateModal(null);
                                    handleBookSlot(alt.id, selectedDateModal);
                                  }}
                                  className="text-xs font-bold text-emerald-400 hover:underline"
                                >
                                  Book {alt.name} →
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })()}

                {/* All Available Vehicles on this date */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-white">
                      Available Vehicles ({dailyStatsMap.get(selectedDateModal)?.availableBikes.length || 0})
                    </span>
                    <span className="text-[10px] text-neutral-500">100% Free all day</span>
                  </div>

                  <div className="space-y-1.5">
                    {(dailyStatsMap.get(selectedDateModal)?.availableBikes || []).map(b => (
                      <div key={b.id} className="flex items-center justify-between p-2.5 rounded-xl bg-black border border-neutral-800 text-xs">
                        <div>
                          <span className="text-white font-bold">{b.name}</span>
                          <span className="text-neutral-400 ml-2">₹{b.dailyRate}/day · {b.category}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedBikeId(b.id.toString());
                            }}
                            className="px-2.5 py-1 rounded-lg bg-neutral-900 hover:bg-neutral-800 text-neutral-300 text-xs font-semibold cursor-pointer"
                          >
                            Timeline
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedDateModal(null);
                              handleBookSlot(b.id, selectedDateModal);
                            }}
                            className="px-3 py-1 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-bold cursor-pointer"
                          >
                            Reserve
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Booked Vehicles */}
                {(dailyStatsMap.get(selectedDateModal)?.bookedBikes || []).length > 0 && (
                  <div className="space-y-2 pt-2 border-t border-neutral-900">
                    <span className="text-xs font-bold uppercase tracking-wider text-neutral-400">
                      Booked Vehicles ({dailyStatsMap.get(selectedDateModal)?.bookedBikes.length})
                    </span>
                    <div className="space-y-1.5">
                      {(dailyStatsMap.get(selectedDateModal)?.bookedBikes || []).map(({ bike, bookings }) => (
                        <div key={bike.id} className="p-2.5 rounded-xl bg-black/60 border border-neutral-900 text-xs flex items-center justify-between">
                          <div>
                            <span className="text-neutral-300 font-semibold">{bike.name}</span>
                            <div className="text-[10px] text-neutral-500 mt-0.5">
                              {bookings.map(b => `${b.readable_id}: ${b.pickup_time?.slice(0, 5)}–${b.return_time?.slice(0, 5)}`).join(', ')}
                            </div>
                          </div>
                          <span className="text-[10px] text-orange-400 font-semibold bg-orange-500/10 px-2 py-0.5 rounded border border-orange-500/20">
                            Booked
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="p-3 bg-black border-t border-neutral-800 flex justify-end">
                <button
                  type="button"
                  onClick={() => setSelectedDateModal(null)}
                  className="px-4 py-1.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-neutral-300 text-xs font-semibold cursor-pointer"
                >
                  Close
                </button>
              </div>

            </div>
          </div>
        )}

      </div>
    </div>
  );
};
