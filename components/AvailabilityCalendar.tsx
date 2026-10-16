import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { supabase } from '../supabase';
import type { Bike } from '../types';
import { 
  Calendar as CalendarIcon, 
  ChevronLeft, 
  ChevronRight, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  ArrowRight, 
  Bike as BikeIcon, 
  Check, 
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Clock
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

interface FreeSlot {
  id: string;
  startDate: string;
  startTime: string;
  endDate: string;
  endTime: string;
  durationLabel: string;
  isUnlimited?: boolean;
}

interface BookedSlot {
  id: number;
  readableId: string;
  startDate: string;
  startTime: string;
  endDate: string;
  endTime: string;
  status: string;
  customerName?: string;
  durationLabel: string;
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
    freeSlotsSummary = 'Booked (All day)';
  } else if (isFullyFree) {
    freeSlotsSummary = 'Free all day';
  } else {
    const freeSegs = segments.filter(s => s.type === 'free' && s.durationMinutes >= 30);
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

export const AvailabilityCalendar: React.FC<AvailabilityCalendarProps> = ({ bikes, isAdminMode = false }) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  // State: default to first bike if present so the timeline line view is immediately active
  const [selectedBikeId, setSelectedBikeId] = useState<string>(() => {
    const param = searchParams.get('bikeId');
    if (param) return param;
    return bikes.length > 0 ? bikes[0].id.toString() : 'all';
  });
  const [loading, setLoading] = useState<boolean>(true);
  const [bookings, setBookings] = useState<RawBooking[]>([]);
  const [selectedDateModal, setSelectedDateModal] = useState<string | null>(null);
  const [isSlotsBreakdownOpen, setIsSlotsBreakdownOpen] = useState<boolean>(true);

  // Calendar month state
  const [currentDate, setCurrentDate] = useState<Date>(() => {
    const paramMonth = searchParams.get('month');
    if (paramMonth && /^\d{4}-\d{2}$/.test(paramMonth)) {
      const [y, m] = paramMonth.split('-').map(Number);
      return new Date(y, m - 1, 1);
    }
    return new Date();
  });

  // Keep search params in sync
  useEffect(() => {
    const urlBikeId = searchParams.get('bikeId');
    if (urlBikeId && urlBikeId !== selectedBikeId) {
      setSelectedBikeId(urlBikeId);
    }
  }, [searchParams]);

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

  // Fetch bookings
  const fetchBookings = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('bookings')
        .select('id, readable_id, bike_id, pickup_date, pickup_time, return_date, return_time, status, customer_name, advance_amount, total_rent')
        .order('pickup_date', { ascending: true })
        .order('pickup_time', { ascending: true });

      if (error) {
        console.error('Error fetching bookings:', error);
      } else if (data) {
        setBookings(data as RawBooking[]);
      }
    } catch (err) {
      console.error('Failed to load bookings:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBookings();
  }, []);

  // Active operational bookings: strictly count as booked ONLY if payment is confirmed
  const activeBookings = useMemo(() => {
    return bookings.filter(b => b.status === 'booking_confirmed' || b.status === 'ongoing');
  }, [bookings]);

  // Selected bike object
  const selectedBike = useMemo(() => {
    if (selectedBikeId === 'all') return null;
    return bikes.find(b => b.id.toString() === selectedBikeId) || null;
  }, [selectedBikeId, bikes]);

  // Calendar calculations
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfWeek = new Date(year, month, 1).getDay(); // 0 is Sunday
  const startOffset = (firstDayOfWeek + 6) % 7; // Monday = 0
  const prevMonthDays = new Date(year, month, 0).getDate();

  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  const formatDateStr = (y: number, m: number, d: number) => {
    const mm = String(m + 1).padStart(2, '0');
    const dd = String(d).padStart(2, '0');
    return `${y}-${mm}-${dd}`;
  };

  const todayStr = useMemo(() => {
    const now = new Date();
    return formatDateStr(now.getFullYear(), now.getMonth(), now.getDate());
  }, []);

  const getBikeBookingsOnDate = (bikeId: number, dateStr: string) => {
    return activeBookings.filter(b => {
      if (b.bike_id !== bikeId) return false;
      return b.pickup_date <= dateStr && b.return_date >= dateStr;
    });
  };

  // Map of daily availability stats for the current month
  const dailyStatsMap = useMemo(() => {
    const map = new Map<string, { total: number; booked: number; available: number; maintenance: number; bookedBikes: { bike: Bike; bookings: RawBooking[] }[]; availableBikes: Bike[] }>();

    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = formatDateStr(year, month, day);
      let bookedCount = 0;
      let maintenanceCount = 0;
      const bookedBikes: { bike: Bike; bookings: RawBooking[] }[] = [];
      const availableBikes: Bike[] = [];

      bikes.forEach(bike => {
        if (bike.status === 'Maintenance') {
          maintenanceCount++;
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

      const totalOperational = bikes.length - maintenanceCount;
      const availableCount = Math.max(0, totalOperational - bookedCount);

      map.set(dateStr, {
        total: totalOperational,
        booked: bookedCount,
        available: availableCount,
        maintenance: maintenanceCount,
        bookedBikes,
        availableBikes
      });
    }

    return map;
  }, [bikes, activeBookings, year, month, daysInMonth]);

  // Overall statistics
  const overallStats = useMemo(() => {
    const todayStat = dailyStatsMap.get(todayStr) || { total: bikes.length, booked: 0, available: bikes.length };
    return {
      totalFleet: bikes.length,
      todayAvailable: todayStat.available,
      todayBooked: todayStat.booked
    };
  }, [dailyStatsMap, bikes, todayStr]);

  // Calculation of Booked & Free Slots for the selected bike
  const { bikeBookedSlots, bikeFreeSlots } = useMemo(() => {
    if (!selectedBike) return { bikeBookedSlots: [], bikeFreeSlots: [] };

    const targetBookings = activeBookings
      .filter(b => b.bike_id === selectedBike.id)
      .sort((a, b) => {
        const tA = new Date(`${a.pickup_date}T${a.pickup_time || '10:00'}`).getTime();
        const tB = new Date(`${b.pickup_date}T${b.pickup_time || '10:00'}`).getTime();
        return tA - tB;
      });

    const bookedList: BookedSlot[] = targetBookings.map(b => {
      const pStart = new Date(`${b.pickup_date}T${b.pickup_time || '10:00'}`);
      const pEnd = new Date(`${b.return_date}T${b.return_time || '20:00'}`);
      const diffHours = Math.max(1, Math.round((pEnd.getTime() - pStart.getTime()) / (1000 * 60 * 60)));
      const days = Math.floor(diffHours / 24);
      const hours = diffHours % 24;
      const durationLabel = days > 0 ? `${days}d ${hours > 0 ? `${hours}h` : ''}` : `${diffHours} hrs`;

      return {
        id: b.id,
        readableId: b.readable_id || `RD-${b.id}`,
        startDate: b.pickup_date,
        startTime: b.pickup_time || '10:00',
        endDate: b.return_date,
        endTime: b.return_time || '20:00',
        status: b.status,
        customerName: b.customer_name,
        durationLabel
      };
    });

    const freeList: FreeSlot[] = [];
    const now = new Date();
    const nowStr = todayStr;

    const futureBookings = targetBookings.filter(b => {
      const bEnd = new Date(`${b.return_date}T${b.return_time || '20:00'}`).getTime();
      return bEnd >= now.getTime();
    });

    if (futureBookings.length === 0) {
      freeList.push({
        id: 'free-all',
        startDate: nowStr,
        startTime: '09:00',
        endDate: 'Open / Ongoing',
        endTime: 'Open',
        durationLabel: '100% Free & Open Availability',
        isUnlimited: true
      });
    } else {
      const firstB = futureBookings[0];
      const firstBStart = new Date(`${firstB.pickup_date}T${firstB.pickup_time || '10:00'}`);
      if (firstBStart.getTime() > now.getTime() + (30 * 60 * 1000)) {
        const diffHrs = Math.round((firstBStart.getTime() - now.getTime()) / (1000 * 60 * 60));
        const days = Math.floor(diffHrs / 24);
        const hours = diffHrs % 24;
        const durationLabel = days > 0 ? `${days}d ${hours}h available` : `${diffHrs}h available`;

        freeList.push({
          id: 'free-initial',
          startDate: nowStr,
          startTime: `${String(now.getHours()).padStart(2, '0')}:00`,
          endDate: firstB.pickup_date,
          endTime: firstB.pickup_time || '10:00',
          durationLabel
        });
      }

      for (let i = 0; i < futureBookings.length - 1; i++) {
        const currentB = futureBookings[i];
        const nextB = futureBookings[i + 1];
        const gapStart = new Date(`${currentB.return_date}T${currentB.return_time || '20:00'}`);
        const gapEnd = new Date(`${nextB.pickup_date}T${nextB.pickup_time || '10:00'}`);

        if (gapEnd.getTime() > gapStart.getTime() + (60 * 60 * 1000)) {
          const diffHrs = Math.round((gapEnd.getTime() - gapStart.getTime()) / (1000 * 60 * 60));
          const days = Math.floor(diffHrs / 24);
          const hours = diffHrs % 24;
          const durationLabel = days > 0 ? `${days}d ${hours}h free` : `${diffHrs}h free`;

          freeList.push({
            id: `free-gap-${i}`,
            startDate: currentB.return_date,
            startTime: currentB.return_time || '20:00',
            endDate: nextB.pickup_date,
            endTime: nextB.pickup_time || '10:00',
            durationLabel
          });
        }
      }

      const lastB = futureBookings[futureBookings.length - 1];
      freeList.push({
        id: 'free-after',
        startDate: lastB.return_date,
        startTime: lastB.return_time || '20:00',
        endDate: 'Open Ongoing',
        endTime: 'Open',
        durationLabel: 'Available for future bookings',
        isUnlimited: true
      });
    }

    return { bikeBookedSlots: bookedList, bikeFreeSlots: freeList };
  }, [selectedBike, activeBookings, todayStr]);

  const handleBookSlot = (bikeId: number, fromDate: string, fromTime?: string, toDate?: string, toTime?: string) => {
    const params = new URLSearchParams();
    params.set('bikeId', bikeId.toString());
    if (fromDate && fromDate !== 'Open / Ongoing') params.set('from', fromDate);
    if (fromTime && fromTime !== 'Open') params.set('fromTime', fromTime);
    if (toDate && toDate !== 'Open Ongoing' && toDate !== 'Open / Ongoing') params.set('to', toDate);
    if (toTime && toTime !== 'Open') params.set('toTime', toTime);
    navigate(`/book?${params.toString()}`);
  };

  return (
    <div className={`w-full ${isAdminMode ? 'bg-transparent text-slate-100' : 'bg-black text-slate-100 py-8 px-4 md:px-8'}`}>
      <div className="max-w-7xl mx-auto space-y-5">

        {/* Clean Header Bar: Strict 2-3 Colors on Pitch Black (Black + White + Sky/Orange) */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-neutral-900 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-orange-600/10 text-orange-400">
              <CalendarIcon className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-white tracking-tight">Availability Calendar</h1>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-sky-500/15 text-sky-400 border border-sky-500/30">
                  Payment Confirmed Only
                </span>
              </div>
              <p className="text-xs text-neutral-400 mt-0.5">
                Bikes available vs booked per day. Select any bike to view free and booked time slots.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Quick 3-Number Status */}
            <div className="flex items-center gap-3 text-xs bg-[#0a0a0a] px-3 py-1.5 rounded-xl border border-neutral-800">
              <span className="text-neutral-400 font-medium">Fleet: <strong className="text-white">{overallStats.totalFleet}</strong></span>
              <span className="text-neutral-700">|</span>
              <span className="text-sky-400 font-semibold">{overallStats.todayAvailable} Free</span>
              <span className="text-neutral-700">|</span>
              <span className="text-orange-400 font-semibold">{overallStats.todayBooked} Booked</span>
            </div>

            <button
              type="button"
              onClick={fetchBookings}
              disabled={loading}
              className="p-2 rounded-xl bg-[#0a0a0a] hover:bg-neutral-900 border border-neutral-800 text-neutral-300 hover:text-white transition-all cursor-pointer"
              title="Refresh calendar"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-orange-400' : ''}`} />
            </button>
          </div>
        </div>

        {/* Clean Controls Bar: Bike Focus Dropdown + Month Navigator + Legend */}
        <div className="bg-[#0a0a0a] border border-neutral-800 rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
          
          {/* Machine Focus Dropdown */}
          <div className="flex items-center gap-3 flex-1 max-w-md">
            <label className="text-xs font-semibold text-neutral-400 whitespace-nowrap">
              Focus:
            </label>
            <div className="relative flex-1">
              <select
                value={selectedBikeId}
                onChange={(e) => handleSelectBike(e.target.value)}
                className="w-full bg-black border border-neutral-800 text-neutral-200 text-xs font-medium rounded-xl px-3 py-2 pr-8 appearance-none focus:outline-none focus:border-orange-500 cursor-pointer"
              >
                <option value="all">⚡ All Fleet Machines (Fleet Overview)</option>
                <optgroup label="Royal Enfield">
                  {bikes.filter(b => b.category === 'Royal Enfield').map(b => (
                    <option key={b.id} value={b.id.toString()}>
                      {b.name} (₹{b.dailyRate}/day)
                    </option>
                  ))}
                </optgroup>
                <optgroup label="Sports Bikes">
                  {bikes.filter(b => b.category === 'Sports').map(b => (
                    <option key={b.id} value={b.id.toString()}>
                      {b.name} (₹{b.dailyRate}/day)
                    </option>
                  ))}
                </optgroup>
                <optgroup label="Standard Bikes">
                  {bikes.filter(b => b.category === 'Bikes').map(b => (
                    <option key={b.id} value={b.id.toString()}>
                      {b.name} (₹{b.dailyRate}/day)
                    </option>
                  ))}
                </optgroup>
                <optgroup label="Scooters">
                  {bikes.filter(b => b.category === 'Scooter').map(b => (
                    <option key={b.id} value={b.id.toString()}>
                      {b.name} (₹{b.dailyRate}/day)
                    </option>
                  ))}
                </optgroup>
              </select>
              <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-neutral-500">
                <BikeIcon className="w-3.5 h-3.5" />
              </div>
            </div>
          </div>

          {/* Month Navigator & Legend */}
          <div className="flex flex-wrap items-center justify-between md:justify-end gap-4">
            {/* Timeline Color Legend: Cream (Unbooked) & Orange (Booked) + Dots */}
            <div className="flex flex-wrap items-center gap-3.5 text-xs">
              <div className="flex items-center gap-1.5" title="Unbooked time available for bookings">
                <span className="w-4 h-2 rounded-full bg-[#FDF0D5] shadow-[0_0_6px_rgba(253,240,213,0.5)]"></span>
                <span className="text-[#FDF0D5] font-semibold text-[11px]">Unbooked (Cream)</span>
              </div>
              <div className="flex items-center gap-1.5" title="Payment confirmed reservation">
                <span className="w-4 h-2 rounded-full bg-orange-500 shadow-[0_0_6px_rgba(255,95,31,0.5)]"></span>
                <span className="text-orange-400 font-semibold text-[11px]">Booked (Orange)</span>
              </div>
              <div className="flex items-center gap-1.5" title="Booking start and return time markers">
                <div className="w-2.5 h-2.5 rounded-full bg-orange-500 border border-black ring-1 ring-orange-400 flex items-center justify-center">
                  <div className="w-0.5 h-0.5 rounded-full bg-black"></div>
                </div>
                <span className="text-neutral-400 text-[11px]">Start/End Dots</span>
              </div>
            </div>

            {/* Month & Year Navigation */}
            <div className="flex items-center bg-black rounded-xl border border-neutral-800 p-1">
              <button
                type="button"
                onClick={handlePrevMonth}
                className="p-1 rounded-lg hover:bg-neutral-900 text-neutral-400 hover:text-white transition-all cursor-pointer"
                title="Previous Month"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="px-3 text-xs font-bold text-white min-w-[120px] text-center">
                {monthNames[month]} {year}
              </span>
              <button
                type="button"
                onClick={handleNextMonth}
                className="p-1 rounded-lg hover:bg-neutral-900 text-neutral-400 hover:text-white transition-all cursor-pointer"
                title="Next Month"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={handleToday}
                className="ml-1 px-2 py-0.5 rounded text-[11px] font-semibold text-orange-400 hover:bg-neutral-900 transition-all cursor-pointer"
              >
                Today
              </button>
            </div>
          </div>

        </div>

        {/* Quick Machine Selector Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          <span className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider shrink-0 mr-1 flex items-center gap-1">
            <BikeIcon className="w-3.5 h-3.5 text-orange-400" />
            Machine:
          </span>
          {bikes.map(b => {
            const isSelected = selectedBike?.id === b.id;
            return (
              <button
                key={b.id}
                type="button"
                onClick={() => handleSelectBike(b.id.toString())}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer border ${
                  isSelected
                    ? 'bg-orange-500 text-black border-orange-500 font-bold shadow-md shadow-orange-500/20'
                    : 'bg-[#0a0a0a] text-neutral-300 hover:text-white border-neutral-800 hover:border-neutral-700'
                }`}
              >
                <span>{b.name}</span>
                <span className={`text-[10px] ${isSelected ? 'text-black/80 font-bold' : 'text-neutral-500'}`}>
                  ₹{b.dailyRate}
                </span>
              </button>
            );
          })}
          <button
            type="button"
            onClick={() => handleSelectBike('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer border ${
              selectedBikeId === 'all'
                ? 'bg-neutral-200 text-black border-white font-bold'
                : 'bg-[#0a0a0a] text-neutral-400 hover:text-white border-neutral-800'
            }`}
          >
            All Fleet
          </button>
        </div>

        {/* Selected Bike Spotlight Card */}
        {selectedBike && (
          <div className="bg-[#0a0a0a] border border-neutral-800 rounded-2xl p-4 shadow-sm space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-14 h-14 rounded-xl overflow-hidden bg-black border border-neutral-800 shrink-0">
                  <img
                    src={selectedBike.imageUrl}
                    alt={selectedBike.name}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = '/images/hero-xtreme-125r.jpg';
                    }}
                  />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-base font-bold text-white">{selectedBike.name}</h2>
                    <span className="text-xs font-bold text-neutral-300">₹{selectedBike.dailyRate}/day</span>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-neutral-900 text-neutral-400">
                      {selectedBike.category}
                    </span>
                  </div>
                  <p className="text-xs text-neutral-400 mt-0.5">
                    RC: {selectedBike.rc_number || 'WB-02-REG'} · Status: <span className={selectedBike.status === 'Maintenance' ? 'text-neutral-500' : 'text-sky-400'}>{selectedBike.status}</span>
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsSlotsBreakdownOpen(prev => !prev)}
                  className="px-3 py-1.5 rounded-xl bg-black hover:bg-neutral-900 border border-neutral-800 text-xs font-semibold text-neutral-200 transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <span>Slots Schedule ({bikeFreeSlots.length} free · {bikeBookedSlots.length} booked)</span>
                  {isSlotsBreakdownOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                </button>

                <button
                  type="button"
                  onClick={() => handleSelectBike('all')}
                  className="px-3 py-1.5 rounded-xl bg-black hover:bg-neutral-900 border border-neutral-800 text-xs font-medium text-neutral-400 hover:text-white transition-all cursor-pointer"
                >
                  View All Fleet
                </button>
              </div>
            </div>

            {/* Expandable Slots Breakdown (Details when requested) */}
            {isSlotsBreakdownOpen && (
              <div className="pt-3 border-t border-neutral-800 grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Available / Free Windows */}
                <div className="bg-black rounded-xl p-3 border border-neutral-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-sky-400 flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Free / Open Windows ({bikeFreeSlots.length})
                    </span>
                    <span className="text-[10px] text-neutral-500">Ready to book</span>
                  </div>
                  <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                    {bikeFreeSlots.length === 0 ? (
                      <p className="text-xs text-neutral-500 italic py-2">No upcoming free slots detected.</p>
                    ) : (
                      bikeFreeSlots.map(slot => (
                        <div key={slot.id} className="flex items-center justify-between p-2 rounded-lg bg-[#0a0a0a] border border-neutral-800 text-xs">
                          <div>
                            <span className="font-semibold text-white">{slot.startDate}</span>
                            <span className="text-neutral-500 mx-1">→</span>
                            <span className="font-semibold text-white">{slot.endDate}</span>
                            <p className="text-[10px] text-sky-400 mt-0.5">{slot.durationLabel}</p>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleBookSlot(selectedBike.id, slot.startDate, slot.startTime, slot.endDate, slot.endTime)}
                            className="px-2.5 py-1 rounded-lg bg-orange-600 hover:bg-orange-500 text-white font-semibold text-[11px] transition-all cursor-pointer"
                          >
                            Reserve
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Booked Slots (Payment Confirmed Only) */}
                <div className="bg-black rounded-xl p-3 border border-neutral-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-orange-400 flex items-center gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5" /> Booked Slots ({bikeBookedSlots.length})
                    </span>
                    <span className="text-[10px] text-neutral-500">Confirmed Advance</span>
                  </div>
                  <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                    {bikeBookedSlots.length === 0 ? (
                      <p className="text-xs text-neutral-500 italic py-2">Zero bookings. Entire schedule is open!</p>
                    ) : (
                      bikeBookedSlots.map(slot => (
                        <div key={slot.id} className="flex items-center justify-between p-2 rounded-lg bg-[#0a0a0a] border border-neutral-800 text-xs">
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="font-semibold text-white">{slot.startDate} ({slot.startTime})</span>
                              <span className="text-neutral-500">→</span>
                              <span className="font-semibold text-white">{slot.endDate} ({slot.endTime})</span>
                            </div>
                            <p className="text-[10px] text-neutral-400 mt-0.5">
                              {slot.readableId} {slot.customerName ? `· ${slot.customerName}` : ''} ({slot.durationLabel})
                            </p>
                          </div>
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-orange-500/10 text-orange-400 border border-orange-500/30">
                            {slot.status === 'ongoing' ? 'In Ride' : 'Confirmed'}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Clean Month Calendar Grid */}
        <div className="bg-[#0a0a0a] border border-neutral-800 rounded-2xl overflow-hidden shadow-sm">
          {/* Weekday headers */}
          <div className="grid grid-cols-7 bg-black border-b border-neutral-800 text-center py-2.5">
            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => (
              <div key={day} className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">
                {day}
              </div>
            ))}
          </div>

          {/* Days Grid */}
          <div className="grid grid-cols-7 divide-x divide-y divide-neutral-900 bg-black">
            {/* Previous month leading days */}
            {Array.from({ length: startOffset }).map((_, idx) => {
              const dayNum = prevMonthDays - startOffset + idx + 1;
              return (
                <div key={`prev-${idx}`} className="min-h-[85px] md:min-h-[105px] p-2 bg-black opacity-20 select-none">
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
              const stats = dailyStatsMap.get(dateStr) || { total: bikes.length, booked: 0, available: bikes.length, maintenance: 0, bookedBikes: [], availableBikes: [] };

              // Single bike timeline data
              const dayTimeline = selectedBike ? computeDayTimeline(dateStr, selectedBike.id, activeBookings) : null;

              return (
                <div
                  key={dateStr}
                  onClick={() => setSelectedDateModal(dateStr)}
                  className={`min-h-[105px] md:min-h-[120px] p-2 md:p-2.5 transition-all cursor-pointer flex flex-col justify-between hover:bg-[#0d0d0d] relative group select-none ${
                    isToday ? 'bg-orange-500/10 border-t-2 border-t-orange-500' : 'bg-black'
                  }`}
                >
                  {/* Date Number & Top Mini-Tag */}
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

                    {selectedBike && dayTimeline && (
                      <span className={`text-[9px] font-mono ${
                        dayTimeline.isFullyFree ? 'text-[#FDF0D5]/70' : dayTimeline.isFullyBooked ? 'text-neutral-600' : 'text-[#FDF0D5] font-bold'
                      }`}>
                        {dayTimeline.isFullyFree ? '24h free' : dayTimeline.isFullyBooked ? '0h free' : `${Math.round(dayTimeline.freeMinutes / 60)}h free`}
                      </span>
                    )}
                  </div>

                  {/* Day Status: Extremely Main Info Only */}
                  <div className="my-1 text-[11px] leading-tight">
                    {selectedBike && dayTimeline ? (
                      selectedBike.status === 'Maintenance' ? (
                        <div className="text-[10px] text-neutral-500 font-semibold">In Workshop</div>
                      ) : dayTimeline.isFullyFree ? (
                        <div className="text-[10px] font-semibold text-[#FDF0D5] flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#FDF0D5] shadow-[0_0_6px_rgba(253,240,213,0.7)]"></span>
                          <span>Free all day</span>
                        </div>
                      ) : dayTimeline.isFullyBooked ? (
                        <div className="text-[10px] font-semibold text-orange-400 flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-orange-500 shadow-[0_0_6px_rgba(255,95,31,0.7)]"></span>
                          <span>Booked (all day)</span>
                        </div>
                      ) : (
                        <div className="space-y-0.5">
                          <div className="text-[9.5px] font-bold text-[#FDF0D5] bg-[#FDF0D5]/10 px-1.5 py-0.5 rounded border border-[#FDF0D5]/20 inline-flex items-center gap-1 truncate max-w-full">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#FDF0D5] shrink-0"></span>
                            <span className="truncate">{dayTimeline.freeSlotsSummary}</span>
                          </div>
                        </div>
                      )
                    ) : (
                      <div className="space-y-0.5">
                        <div className="flex items-center justify-between text-[11px] font-semibold">
                          <span className="text-[#FDF0D5]">{stats.available} free</span>
                          {stats.booked > 0 && (
                            <span className="text-orange-400">{stats.booked} booked</span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Continuous Timeline Overlay: Booked (Orange), Unbooked (Cream), Dots at Start/End */}
                  {selectedBike && dayTimeline ? (
                    <div className="w-full relative pt-2 pb-0.5">
                      {/* 24-hour Timeline Track */}
                      <div className="relative w-full h-2 rounded-full bg-neutral-900 overflow-hidden flex items-center shadow-inner">
                        {dayTimeline.segments.map((seg, sIdx) => (
                          <div
                            key={sIdx}
                            className={`h-full transition-all ${
                              seg.type === 'booked'
                                ? 'bg-orange-500 shadow-[0_0_6px_rgba(255,95,31,0.6)]'
                                : 'bg-[#FDF0D5] shadow-[0_0_6px_rgba(253,240,213,0.5)]'
                            }`}
                            style={{ width: `${seg.widthPct}%` }}
                            title={`${seg.type === 'booked' ? 'Booked' : 'Unbooked (Free)'}: ${seg.startTimeLabel} – ${seg.endTimeLabel} (${(seg.durationMinutes / 60).toFixed(1)}h)`}
                          />
                        ))}

                        {/* 6h, 12h, 18h subtle guidelines */}
                        <div className="absolute left-[25%] top-0 bottom-0 w-px bg-black/40 pointer-events-none" />
                        <div className="absolute left-[50%] top-0 bottom-0 w-px bg-black/40 pointer-events-none" />
                        <div className="absolute left-[75%] top-0 bottom-0 w-px bg-black/40 pointer-events-none" />
                      </div>

                      {/* Start / End Dots overlaying the line */}
                      {dayTimeline.dots.map((dot, dIdx) => (
                        <div
                          key={dIdx}
                          className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 z-20 flex flex-col items-center pointer-events-none"
                          style={{ left: `${Math.min(94, Math.max(6, dot.pct))}%` }}
                        >
                          {/* Micro time badge above dot */}
                          <span className="text-[8px] font-mono font-black text-orange-300 bg-black/95 px-1 py-0.2 rounded border border-orange-500/60 shadow whitespace-nowrap mb-0.5 pointer-events-auto">
                            {dot.timeLabel}
                          </span>
                          {/* Dot marker */}
                          <div className="w-3 h-3 rounded-full bg-orange-500 border-2 border-black ring-1 ring-orange-400 shadow-md flex items-center justify-center">
                            <div className="w-1 h-1 rounded-full bg-black"></div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    /* All Fleet Overview split bar */
                    <div className="w-full bg-neutral-900 h-1.5 rounded-full overflow-hidden flex">
                      <div 
                        className="bg-[#FDF0D5] h-full" 
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

        {/* Day Inspection Modal (Opens on demand for more details) */}
        {selectedDateModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
            <div className="bg-[#0a0a0a] border border-neutral-800 rounded-2xl w-full max-w-xl max-h-[85vh] overflow-hidden flex flex-col shadow-2xl">
              
              {/* Modal Header */}
              <div className="p-4 bg-black border-b border-neutral-800 flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-white">
                    {new Date(selectedDateModal).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                  </h3>
                  <p className="text-xs text-neutral-400">Detailed vehicle availability & schedule</p>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedDateModal(null)}
                  className="p-1.5 rounded-lg bg-neutral-900 text-neutral-400 hover:text-white transition-all cursor-pointer"
                >
                  <XCircle className="w-5 h-5" />
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-4 overflow-y-auto space-y-5 flex-1">
                {/* Selected Bike 24-Hour Timeline Spotlight */}
                {selectedBike && (() => {
                  const modalTimeline = computeDayTimeline(selectedDateModal, selectedBike.id, activeBookings);
                  const freeSegs = modalTimeline.segments.filter(s => s.type === 'free' && s.durationMinutes >= 30);
                  const bookedSegs = modalTimeline.segments.filter(s => s.type === 'booked');

                  return (
                    <div className="bg-black p-4 rounded-2xl border border-neutral-800 space-y-4">
                      {/* Machine Title & Category */}
                      <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
                        <div className="flex items-center gap-3">
                          <img 
                            src={selectedBike.imageUrl} 
                            alt={selectedBike.name}
                            className="w-10 h-10 rounded-xl object-cover border border-neutral-800 bg-black"
                            onError={(e) => { (e.target as HTMLImageElement).src = '/images/hero-xtreme-125r.jpg'; }}
                          />
                          <div>
                            <h4 className="text-sm font-bold text-white flex items-center gap-2">
                              <span>{selectedBike.name}</span>
                              <span className="text-[10px] text-neutral-400 font-normal">({selectedBike.category})</span>
                            </h4>
                            <p className="text-xs text-neutral-400 mt-0.5">
                              Daily Rate: <strong className="text-white">₹{selectedBike.dailyRate}</strong> · Status: <span className="text-sky-400 font-medium">{modalTimeline.freeSlotsSummary}</span>
                            </p>
                          </div>
                        </div>

                        <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${
                          modalTimeline.isFullyFree
                            ? 'bg-[#FDF0D5]/10 text-[#FDF0D5] border-[#FDF0D5]/30'
                            : modalTimeline.isFullyBooked
                            ? 'bg-orange-500/10 text-orange-400 border-orange-500/30'
                            : 'bg-orange-500/15 text-orange-300 border-orange-500/40'
                        }`}>
                          {modalTimeline.isFullyFree ? '100% Free' : modalTimeline.isFullyBooked ? '100% Booked' : `${Math.round(modalTimeline.freeMinutes / 60)}h Free`}
                        </span>
                      </div>

                      {/* 24-Hour Visual Timeline Track */}
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between text-[10px] font-semibold text-neutral-400">
                          <span className="flex items-center gap-1.5">
                            <span className="w-3 h-1.5 rounded-full bg-[#FDF0D5]"></span>
                            <span className="text-[#FDF0D5]">Cream: Free</span>
                            <span className="text-neutral-600">·</span>
                            <span className="w-3 h-1.5 rounded-full bg-orange-500"></span>
                            <span className="text-orange-400">Orange: Booked</span>
                          </span>
                          <span className="font-mono text-neutral-500">24-Hour Timeline</span>
                        </div>

                        {/* Visual Bar */}
                        <div className="relative w-full h-4 rounded-lg bg-neutral-900 overflow-hidden flex items-center shadow-inner border border-neutral-800">
                          {modalTimeline.segments.map((seg, sIdx) => (
                            <div
                              key={sIdx}
                              className={`h-full transition-all relative ${
                                seg.type === 'booked'
                                  ? 'bg-orange-500 shadow-[0_0_8px_rgba(255,95,31,0.5)]'
                                  : 'bg-[#FDF0D5] shadow-[0_0_8px_rgba(253,240,213,0.4)]'
                              }`}
                              style={{ width: `${seg.widthPct}%` }}
                              title={`${seg.type === 'booked' ? 'Booked' : 'Free'}: ${seg.startTimeLabel} – ${seg.endTimeLabel} (${(seg.durationMinutes / 60).toFixed(1)} hrs)`}
                            />
                          ))}

                          {/* 4h, 8h, 12h, 16h, 20h subtle graduation lines */}
                          {[16.66, 33.33, 50, 66.66, 83.33].map((pct, idx) => (
                            <div key={idx} className="absolute top-0 bottom-0 w-px bg-black/40 pointer-events-none" style={{ left: `${pct}%` }} />
                          ))}
                        </div>

                        {/* Start/End Time Markers on the Line */}
                        <div className="relative w-full h-6 pointer-events-none">
                          {modalTimeline.dots.map((dot, dIdx) => (
                            <div
                              key={dIdx}
                              className="absolute top-0 -translate-x-1/2 flex flex-col items-center pointer-events-auto"
                              style={{ left: `${Math.min(94, Math.max(6, dot.pct))}%` }}
                            >
                              <div className="w-2.5 h-2.5 rounded-full bg-orange-500 border border-black ring-2 ring-orange-400 -mt-3.5 shadow-md"></div>
                              <span className="text-[9px] font-mono font-bold text-orange-300 bg-neutral-900 px-1 rounded border border-orange-500/50 mt-1 whitespace-nowrap">
                                {dot.type === 'start' ? `Pickup ${dot.timeLabel}` : `Return ${dot.timeLabel}`}
                              </span>
                            </div>
                          ))}
                        </div>

                        {/* 24-Hour Ruler Labels */}
                        <div className="flex justify-between text-[9px] font-mono text-neutral-500 px-0.5 pt-0.5">
                          <span>00:00</span>
                          <span>06:00</span>
                          <span>12:00</span>
                          <span>18:00</span>
                          <span>24:00</span>
                        </div>
                      </div>

                      {/* Unbooked / Open Windows (Available for Short Bookings) */}
                      <div className="space-y-2 pt-1">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-[#FDF0D5] flex items-center gap-1.5">
                          <CheckCircle2 className="w-3.5 h-3.5 text-[#FDF0D5]" />
                          Open Time Windows For This Machine ({freeSegs.length})
                        </span>

                        {freeSegs.length === 0 ? (
                          <p className="text-xs text-neutral-500 italic p-2 bg-neutral-950 rounded-xl border border-neutral-900">
                            Entire day is booked. No open slots on this date.
                          </p>
                        ) : (
                          <div className="space-y-1.5">
                            {freeSegs.map((seg, idx) => (
                              <div
                                key={idx}
                                className="flex items-center justify-between p-2.5 rounded-xl bg-neutral-950 border border-neutral-800 text-xs"
                              >
                                <div className="space-y-0.5">
                                  <div className="flex items-center gap-2">
                                    <span className="font-bold text-[#FDF0D5] font-mono text-xs">
                                      {seg.startTimeLabel} → {seg.endTimeLabel}
                                    </span>
                                    <span className="text-[10px] text-neutral-400">
                                      ({(seg.durationMinutes / 60).toFixed(1)} hrs free)
                                    </span>
                                  </div>
                                  <span className="text-[10px] text-neutral-500">
                                    {seg.startMin === 0 && seg.endMin === 1440
                                      ? 'Full 24-hour day open for rental'
                                      : 'Ideal for short/daytrip rental'}
                                  </span>
                                </div>

                                <button
                                  type="button"
                                  onClick={() => {
                                    setSelectedDateModal(null);
                                    handleBookSlot(
                                      selectedBike.id, 
                                      selectedDateModal, 
                                      seg.startTimeLabel === '00:00' ? '09:00' : seg.startTimeLabel,
                                      selectedDateModal,
                                      seg.endTimeLabel === '24:00' ? '20:00' : seg.endTimeLabel
                                    );
                                  }}
                                  className="px-3 py-1.5 rounded-lg bg-orange-600 hover:bg-orange-500 text-white font-bold text-xs transition-all cursor-pointer shadow-sm"
                                >
                                  Reserve Window →
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Confirmed Bookings on This Date */}
                      {bookedSegs.length > 0 && (
                        <div className="space-y-2 pt-2 border-t border-neutral-900">
                          <span className="text-[11px] font-bold uppercase tracking-wider text-orange-400 flex items-center gap-1.5">
                            <AlertTriangle className="w-3.5 h-3.5 text-orange-400" />
                            Active Booked Windows ({bookedSegs.length})
                          </span>
                          <div className="space-y-1.5">
                            {bookedSegs.map((seg, idx) => (
                              <div key={idx} className="p-2.5 rounded-xl bg-neutral-950 border border-neutral-900 text-xs flex items-center justify-between">
                                <div>
                                  <div className="flex items-center gap-2">
                                    <span className="font-mono text-orange-400 font-bold">
                                      {seg.startTimeLabel} → {seg.endTimeLabel}
                                    </span>
                                    {seg.booking?.readable_id && (
                                      <span className="text-[10px] text-neutral-300 font-bold bg-neutral-900 px-1.5 py-0.5 rounded border border-neutral-800">
                                        {seg.booking.readable_id}
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-[10px] text-neutral-500 mt-0.5">
                                    Rider: {seg.booking?.customer_name || 'Confirmed Guest'} · Status: <span className="text-sky-400">Paid & Verified</span>
                                  </p>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })()}

                {/* Fleet Overview Numbers */}
                {(() => {
                  const stat = dailyStatsMap.get(selectedDateModal) || { total: bikes.length, booked: 0, available: bikes.length, maintenance: 0, bookedBikes: [], availableBikes: [] };
                  return (
                    <div className="grid grid-cols-2 gap-3 text-center">
                      <div className="p-3 bg-black border border-neutral-800 rounded-xl">
                        <span className="text-xs text-neutral-400 block">Fleet Machines Free</span>
                        <span className="text-xl font-bold text-[#FDF0D5]">{stat.available}</span>
                      </div>
                      <div className="p-3 bg-black border border-neutral-800 rounded-xl">
                        <span className="text-xs text-neutral-400 block">Fleet Machines Booked</span>
                        <span className="text-xl font-bold text-orange-400">{stat.booked}</span>
                      </div>
                    </div>
                  );
                })()}

                {/* Other Available Bikes list */}
                <div>
                  <h4 className="text-xs font-bold text-[#FDF0D5] uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-[#FDF0D5]" /> Available Machines ({dailyStatsMap.get(selectedDateModal)?.availableBikes.length || 0})
                  </h4>
                  <div className="space-y-1.5">
                    {(dailyStatsMap.get(selectedDateModal)?.availableBikes || []).map(b => (
                      <div key={b.id} className="flex items-center justify-between p-2.5 rounded-xl bg-black border border-neutral-800 text-xs">
                        <div className="flex items-center gap-2.5">
                          <img 
                            src={b.imageUrl} 
                            alt={b.name} 
                            className="w-9 h-9 rounded-lg object-cover bg-black"
                            onError={(e) => { (e.target as HTMLImageElement).src = '/images/hero-xtreme-125r.jpg'; }}
                          />
                          <div>
                            <span className="text-white font-bold block">{b.name}</span>
                            <span className="text-neutral-400">{b.category} · ₹{b.dailyRate}/day</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              handleSelectBike(b.id.toString());
                            }}
                            className="px-2.5 py-1.5 rounded-lg bg-neutral-900 hover:bg-neutral-800 text-neutral-300 hover:text-white font-semibold text-xs transition-all cursor-pointer border border-neutral-800"
                          >
                            View Line
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedDateModal(null);
                              handleBookSlot(b.id, selectedDateModal);
                            }}
                            className="px-3 py-1.5 rounded-lg bg-orange-600 hover:bg-orange-500 text-white font-semibold text-xs transition-all cursor-pointer"
                          >
                            Book Date
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Booked Bikes list */}
                {(dailyStatsMap.get(selectedDateModal)?.bookedBikes || []).length > 0 && (
                  <div>
                    <h4 className="text-xs font-bold text-orange-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                      <AlertTriangle className="w-4 h-4" /> Booked Machines ({dailyStatsMap.get(selectedDateModal)?.bookedBikes.length})
                    </h4>
                    <div className="space-y-1.5">
                      {(dailyStatsMap.get(selectedDateModal)?.bookedBikes || []).map(({ bike, bookings }) => (
                        <div key={bike.id} className="p-2.5 rounded-xl bg-black border border-neutral-800 text-xs space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="text-white font-bold">{bike.name}</span>
                            <button
                              type="button"
                              onClick={() => {
                                handleSelectBike(bike.id.toString());
                                setSelectedDateModal(null);
                              }}
                              className="text-orange-400 hover:underline font-semibold text-[11px]"
                            >
                              View Slots →
                            </button>
                          </div>
                          {bookings.map(b => (
                            <div key={b.id} className="text-neutral-400 text-[11px] flex items-center justify-between">
                              <span>Ref: <strong className="text-neutral-200">{b.readable_id}</strong> ({b.pickup_date} {b.pickup_time?.slice(0, 5)} → {b.return_date} {b.return_time?.slice(0, 5)})</span>
                              <span className="text-sky-400 font-semibold">Payment Confirmed</span>
                            </div>
                          ))}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="p-3 bg-black border-t border-neutral-800 flex justify-end">
                <button
                  type="button"
                  onClick={() => setSelectedDateModal(null)}
                  className="px-4 py-1.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-neutral-200 text-xs font-semibold cursor-pointer"
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
