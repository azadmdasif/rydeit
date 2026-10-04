import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../../supabase';
import { useToast } from '../../App';
import { GOOGLE_MAPS_REVIEW_LINK } from '../../constants';
import { getFleetBikes } from '../../fleetStorage';
import { Modal } from '../Modal';

interface UpcomingReservationsProps {
  onOpenBookingOperations?: (booking: any) => void;
  onRefreshStats?: () => void;
}

type UpcomingFilter = 'all' | 'today' | 'tomorrow' | 'week' | 'confirmed' | 'verifying';

export const UpcomingReservations: React.FC<UpcomingReservationsProps> = ({ onRefreshStats }) => {
  const { showToast } = useToast();
  const [fleetBikes, setFleetBikes] = useState<any[]>(() => getFleetBikes());
  const BIKES = fleetBikes;
  const [reservations, setReservations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<UpcomingFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [bikeFilter, setBikeFilter] = useState<string>('all');

  // Modal & Operations state
  const [selectedBooking, setSelectedBooking] = useState<any | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [viewPaymentProofUrl, setViewPaymentProofUrl] = useState<string | null>(null);
  const [cancelModalBooking, setCancelModalBooking] = useState<any | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelRefundNote, setCancelRefundNote] = useState('');

  // Payment confirmation & Rent terms modal state
  const [showConfirmPaymentModal, setShowConfirmPaymentModal] = useState(false);
  const [paymentForm, setPaymentForm] = useState({
    advancePaid: 500,
    agreedRent: 0,
    paymentMethod: 'upi',
    note: ''
  });

  useEffect(() => {
    fetchUpcomingReservations();
    const handleFleetUpdate = () => setFleetBikes(getFleetBikes());
    window.addEventListener('rydeit_fleet_updated', handleFleetUpdate);
    return () => window.removeEventListener('rydeit_fleet_updated', handleFleetUpdate);
  }, []);

  const fetchUpcomingReservations = async () => {
    setLoading(true);
    try {
      // Query reservations where advance has been paid or confirmed:
      // status = 'booking_confirmed' (advance verified/locked) OR 'verifying_payment' (advance paid via UPI/cash, awaiting/checking)
      const { data, error } = await supabase
        .from('bookings')
        .select('*')
        .in('status', ['booking_confirmed', 'verifying_payment'])
        .order('pickup_date', { ascending: true })
        .order('pickup_time', { ascending: true });

      if (error) throw error;

      // Filter to future or today's active reservations (not ended in past)
      const todayStr = new Date().toISOString().split('T')[0];
      const validUpcoming = (data || []).filter(b => {
        // Return date must be today or future
        return b.return_date >= todayStr;
      });

      setReservations(validUpcoming);
    } catch (err: any) {
      console.error('Error fetching upcoming reservations:', err);
      showToast(err.message || 'Failed to load upcoming reservations', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Status updates
  const updateStatus = async (id: string, status: string, reason?: string) => {
    try {
      const updates: any = { status };
      if (reason) updates.admin_notes = reason;

      const { error } = await supabase.from('bookings').update(updates).eq('id', id);
      if (error) throw error;

      showToast(`Reservation status updated: ${status.replace('_', ' ')}`, 'success');

      if (status === 'completed' && selectedBooking) {
        const message = `Hi ${selectedBooking.customer_name}, thank you for riding with Rydeit! Please leave us a review on Google Maps: ${GOOGLE_MAPS_REVIEW_LINK}`;
        const whatsappUrl = `https://wa.me/${selectedBooking.customer_phone.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`;
        window.open(whatsappUrl, '_blank');
      }

      await fetchUpcomingReservations();
      if (onRefreshStats) onRefreshStats();

      if (selectedBooking?.id === id) {
        if (status === 'ongoing' || status === 'completed' || status === 'cancelled') {
          setSelectedBooking(null);
        } else {
          const { data } = await supabase.from('bookings').select('*').eq('id', id).single();
          setSelectedBooking(data);
        }
      }
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  const handleQuickDispatch = async (booking: any) => {
    await updateStatus(booking.id, 'ongoing');
    showToast(`Machine handed over to ${booking.customer_name}. Ride is now ONGOING!`, 'success');
  };

  const handleOpenConfirmPaymentModal = (booking: any) => {
    setSelectedBooking(booking);
    const baseRent = Number(booking.total_rent) || 0;
    const currentAdj = Number(booking.adjustment_amount) || 0;
    const currentNet = baseRent + currentAdj;

    setPaymentForm({
      advancePaid: booking.advance_amount !== undefined && booking.advance_amount !== null ? Number(booking.advance_amount) : 500,
      agreedRent: currentNet > 0 ? currentNet : baseRent,
      paymentMethod: booking.payment_method || 'upi',
      note: booking.adjustment_reason || ''
    });
    setShowConfirmPaymentModal(true);
  };

  const handleSavePaymentAndTerms = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!selectedBooking) return;

    const baseRent = Number(selectedBooking.total_rent) || 0;
    const agreedRent = Number(paymentForm.agreedRent);
    const advancePaid = Number(paymentForm.advancePaid);

    if (isNaN(agreedRent) || agreedRent <= 0) {
      showToast("Please enter a valid agreed rent amount", "warning");
      return;
    }
    if (isNaN(advancePaid) || advancePaid < 0) {
      showToast("Please enter a valid advance paid amount", "warning");
      return;
    }

    const diff = agreedRent - baseRent;
    let adjustmentAmount = 0;
    let adjustmentReason = paymentForm.note.trim();

    if (diff < 0) {
      adjustmentAmount = diff; // Negative discount
      if (!adjustmentReason) {
        adjustmentReason = `Discount: Finally agreed rent ₹${agreedRent} (₹${Math.abs(diff)} discount on booking rent ₹${baseRent})`;
      }
    } else if (diff > 0) {
      adjustmentAmount = diff; // Positive premium
      if (!adjustmentReason) {
        adjustmentReason = `Premium: Finally agreed rent ₹${agreedRent} (₹${diff} premium over booking rent ₹${baseRent})`;
      }
    } else {
      adjustmentAmount = 0;
      if (!adjustmentReason) {
        adjustmentReason = `Agreed rent matches standard booking rent (₹${agreedRent})`;
      }
    }

    try {
      const updates: any = {
        status: 'booking_confirmed',
        advance_amount: advancePaid,
        payment_method: paymentForm.paymentMethod,
        adjustment_amount: adjustmentAmount,
        adjustment_reason: adjustmentReason
      };

      const { error } = await supabase.from('bookings').update(updates).eq('id', selectedBooking.id);
      if (error) throw error;

      const tagText = diff < 0 ? ` (Discount: ₹${Math.abs(diff)})` : diff > 0 ? ` (Premium: ₹${diff})` : '';
      showToast(`Payment confirmed! Advance: ₹${advancePaid}, Agreed Rent: ₹${agreedRent}${tagText}`, 'success');

      setShowConfirmPaymentModal(false);
      await fetchUpcomingReservations();
      if (onRefreshStats) onRefreshStats();

      const { data } = await supabase.from('bookings').select('*').eq('id', selectedBooking.id).single();
      setSelectedBooking(data);
    } catch (err: any) {
      showToast(err.message || 'Failed to save payment terms', 'error');
    }
  };

  const handleOpenCancelModal = (booking: any) => {
    setSelectedBooking(booking);
    setCancelModalBooking(booking);
    setCancelReason('');
    setCancelRefundNote(
      booking.status === 'booking_confirmed' && booking.advance_amount
        ? `Advance of ₹${booking.advance_amount} was paid via ${booking.payment_method?.toUpperCase() || 'UPI'}.`
        : ''
    );
  };

  const handleConfirmCancel = async () => {
    if (!cancelModalBooking) return;
    const noteParts = [];
    if (cancelReason.trim()) noteParts.push(`Reason: ${cancelReason.trim()}`);
    if (cancelRefundNote.trim()) noteParts.push(`Refund/Settlement: ${cancelRefundNote.trim()}`);
    const adminNote = noteParts.join(' | ') || 'Booking cancelled by admin';

    await updateStatus(cancelModalBooking.id, 'cancelled', adminNote);
    setCancelModalBooking(null);
    setCancelReason('');
    setCancelRefundNote('');
    showToast(`Booking ${cancelModalBooking.readable_id} has been cancelled. Vehicle slot is now released.`, 'info');
  };

  const handlePhotoUpload = async (file: File) => {
    if (!selectedBooking) return;
    setUploadingPhoto(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `handover_${selectedBooking.readable_id}_${Date.now()}.${fileExt}`;
      const filePath = `handover-photos/${fileName}`;

      const { error: uploadError } = await supabase.storage.from('booking-docs').upload(filePath, file);
      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage.from('booking-docs').getPublicUrl(filePath);
      await supabase.from('bookings').update({ customer_photo_url: publicUrl }).eq('id', selectedBooking.id);

      const { data } = await supabase.from('bookings').select('*').eq('id', selectedBooking.id).single();
      setSelectedBooking(data);
      showToast('Handover photo recorded successfully.', 'success');
      fetchUpcomingReservations();
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setUploadingPhoto(false);
    }
  };

  // Helper date calculations
  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);
  const tomorrowStr = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().split('T')[0];
  }, []);
  const nextWeekStr = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return d.toISOString().split('T')[0];
  }, []);

  // Filtered reservations
  const filteredReservations = useMemo(() => {
    return reservations.filter(b => {
      // 1. Time / status filter
      if (activeFilter === 'today' && b.pickup_date !== todayStr) return false;
      if (activeFilter === 'tomorrow' && b.pickup_date !== tomorrowStr) return false;
      if (activeFilter === 'week' && (b.pickup_date < todayStr || b.pickup_date > nextWeekStr)) return false;
      if (activeFilter === 'confirmed' && b.status !== 'booking_confirmed') return false;
      if (activeFilter === 'verifying' && b.status !== 'verifying_payment') return false;

      // 2. Machine filter
      if (bikeFilter !== 'all' && b.bike_id.toString() !== bikeFilter) return false;

      // 3. Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesName = (b.customer_name || '').toLowerCase().includes(q);
        const matchesPhone = (b.customer_phone || '').includes(q);
        const matchesId = (b.readable_id || '').toLowerCase().includes(q);
        const bike = BIKES.find(bike => bike.id === b.bike_id);
        const matchesBike = (bike?.name || '').toLowerCase().includes(q);
        if (!matchesName && !matchesPhone && !matchesId && !matchesBike) return false;
      }

      return true;
    });
  }, [reservations, activeFilter, bikeFilter, searchQuery, todayStr, tomorrowStr, nextWeekStr]);

  // Aggregate Metrics
  const metrics = useMemo(() => {
    const totalAdvance = reservations.reduce((acc, b) => acc + (b.advance_amount || Math.floor((b.total_rent || 0) * 0.4)), 0);
    const totalRent = reservations.reduce((acc, b) => acc + (b.total_rent || 0), 0);
    const totalBalance = Math.max(0, totalRent - totalAdvance);
    const todayDepartures = reservations.filter(b => b.pickup_date === todayStr).length;
    const tomorrowDepartures = reservations.filter(b => b.pickup_date === tomorrowStr).length;

    // Next departure
    const now = new Date();
    const futureOnly = reservations.filter(b => {
      const pDate = new Date(`${b.pickup_date}T${b.pickup_time || '10:00'}`);
      return pDate >= now;
    });
    const nextRide = futureOnly.length > 0 ? futureOnly[0] : null;

    return {
      totalCount: reservations.length,
      totalAdvance,
      totalRent,
      totalBalance,
      todayDepartures,
      tomorrowDepartures,
      nextRide
    };
  }, [reservations, todayStr, tomorrowStr]);

  // Helper for human countdown
  const getRelativeTimeBadge = (pickupDate: string, pickupTime: string) => {
    const now = new Date();
    const target = new Date(`${pickupDate}T${pickupTime || '10:00'}`);
    const diffMs = target.getTime() - now.getTime();
    const diffHours = Math.round(diffMs / (1000 * 60 * 60));
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

    if (pickupDate === todayStr) {
      if (diffHours <= 0) return { label: 'PICKUP DUE NOW', color: 'bg-red-500 text-white animate-pulse' };
      if (diffHours === 1) return { label: 'IN 1 HOUR', color: 'bg-brand-orange text-white animate-pulse' };
      return { label: `TODAY IN ${diffHours}H`, color: 'bg-brand-orange text-white' };
    }
    if (pickupDate === tomorrowStr) {
      return { label: 'TOMORROW', color: 'bg-brand-yellow text-brand-black font-black' };
    }
    if (diffDays <= 7) {
      return { label: `IN ${diffDays} DAYS`, color: 'bg-brand-teal/20 text-brand-teal border border-brand-teal/30' };
    }
    return { label: pickupDate, color: 'bg-white/10 text-white/60 border border-white/10' };
  };

  // WhatsApp Reminder Generator
  const getWhatsAppReminderUrl = (booking: any, bikeName: string) => {
    const cleanPhone = (booking.customer_phone || '').replace(/\D/g, '');
    const advancePaid = booking.advance_amount || Math.floor((booking.total_rent || 0) * 0.4);
    const balanceDue = Math.max(0, (booking.total_rent || 0) - advancePaid);

    const message = `Hi ${booking.customer_name},\n\n` +
      `Greetings from *Rydeit Rentals*!\n` +
      `This is a confirmation reminder for your upcoming reserved ride:\n\n` +
      `🏍️ *Machine:* ${bikeName}\n` +
      `🔖 *Booking ID:* ${booking.readable_id}\n` +
      `📅 *Pickup:* ${booking.pickup_date} @ ${booking.pickup_time}\n` +
      `🏁 *Return:* ${booking.return_date} @ ${booking.return_time}\n` +
      `💰 *Advance Paid:* ₹${advancePaid} (Confirmed ✓)\n` +
      `💵 *Balance at Handover:* ₹${balanceDue}\n\n` +
      `📍 *Garage Location:* 6C, Mohammadan Burial Ground Lane, Kolkata - 700023\n` +
      `⚠️ *Please bring:* Original Driving License & Aadhaar Card for biometric verification.\n\n` +
      `Have a safe & thrilling journey! Reach us at +91 76860 22245 for any assistance.`;

    return `https://wa.me/91${cleanPhone}?text=${encodeURIComponent(message)}`;
  };

  return (
    <div className="space-y-10 animate-fade-in max-w-7xl mx-auto pb-16">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 border-b border-white/5 pb-8">
        <div>
          <div className="flex items-center gap-3">
            <span className="w-3 h-3 rounded-full bg-green-500 animate-ping"></span>
            <span className="text-[10px] font-black text-brand-teal uppercase tracking-[0.4em]">Advance Payment Confirmed</span>
          </div>
          <h1 className="text-4xl lg:text-5xl font-heading text-white uppercase tracking-tighter mt-2">
            Upcoming <span className="text-brand-orange">Reservations</span>
          </h1>
          <p className="text-white/40 text-xs mt-2 max-w-xl">
            Live queue of reserved machines with locked advance payments. These time slots are strictly reserved and blocked from overlapping bookings.
          </p>
        </div>

        <button
          type="button"
          onClick={fetchUpcomingReservations}
          className="flex items-center gap-2 px-5 py-3 rounded-xl bg-brand-gray-dark border border-white/10 text-white/70 hover:text-white hover:border-brand-teal transition-all text-xs font-bold uppercase tracking-wider"
        >
          <svg className={`w-4 h-4 ${loading ? 'animate-spin text-brand-teal' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Refresh Queue
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-brand-gray-dark/50 p-7 rounded-[2.5rem] border border-brand-teal/20 relative overflow-hidden group hover:border-brand-teal/50 transition-all">
          <div className="absolute top-0 right-0 w-24 h-24 bg-brand-teal/5 rounded-full blur-2xl group-hover:bg-brand-teal/10 transition-all"></div>
          <p className="text-[9px] font-black text-white/40 uppercase tracking-[0.2em] mb-1">Upcoming Fleet Departures</p>
          <p className="text-4xl lg:text-5xl font-heading text-brand-teal">{metrics.totalCount}</p>
          <div className="flex items-center gap-3 mt-4 text-[9px] font-bold text-white/50 uppercase tracking-wider">
            <span className="text-brand-orange font-black">{metrics.todayDepartures} Today</span>
            <span>•</span>
            <span className="text-brand-yellow font-black">{metrics.tomorrowDepartures} Tomorrow</span>
          </div>
        </div>

        <div className="bg-brand-gray-dark/50 p-7 rounded-[2.5rem] border border-green-500/20 relative overflow-hidden group hover:border-green-500/50 transition-all">
          <div className="absolute top-0 right-0 w-24 h-24 bg-green-500/5 rounded-full blur-2xl group-hover:bg-green-500/10 transition-all"></div>
          <p className="text-[9px] font-black text-white/40 uppercase tracking-[0.2em] mb-1">Advance Collected</p>
          <p className="text-4xl lg:text-5xl font-heading text-green-400">₹{metrics.totalAdvance.toLocaleString()}</p>
          <p className="text-[9px] font-bold text-white/30 uppercase tracking-widest mt-4">Secured in Bank / Cash</p>
        </div>

        <div className="bg-brand-gray-dark/50 p-7 rounded-[2.5rem] border border-brand-yellow/20 relative overflow-hidden group hover:border-brand-yellow/50 transition-all">
          <div className="absolute top-0 right-0 w-24 h-24 bg-brand-yellow/5 rounded-full blur-2xl group-hover:bg-brand-yellow/10 transition-all"></div>
          <p className="text-[9px] font-black text-white/40 uppercase tracking-[0.2em] mb-1">Balance Due at Handover</p>
          <p className="text-4xl lg:text-5xl font-heading text-brand-yellow">₹{metrics.totalBalance.toLocaleString()}</p>
          <p className="text-[9px] font-bold text-white/30 uppercase tracking-widest mt-4">Payable Before Ignition</p>
        </div>

        <div className="bg-brand-gray-dark/50 p-7 rounded-[2.5rem] border border-brand-orange/20 relative overflow-hidden group hover:border-brand-orange/50 transition-all">
          <div className="absolute top-0 right-0 w-24 h-24 bg-brand-orange/5 rounded-full blur-2xl group-hover:bg-brand-orange/10 transition-all"></div>
          <p className="text-[9px] font-black text-white/40 uppercase tracking-[0.2em] mb-1">Next Departure</p>
          {metrics.nextRide ? (
            <div>
              <p className="text-2xl lg:text-3xl font-heading text-brand-orange truncate">
                {BIKES.find(b => b.id === metrics.nextRide.bike_id)?.name || 'Bike'}
              </p>
              <p className="text-[10px] font-black text-white uppercase tracking-wider mt-2">
                {metrics.nextRide.pickup_date} @ {metrics.nextRide.pickup_time}
              </p>
              <p className="text-[9px] text-white/40 uppercase tracking-widest truncate mt-0.5">
                Rider: {metrics.nextRide.customer_name}
              </p>
            </div>
          ) : (
            <div>
              <p className="text-3xl font-heading text-white/20">None Pending</p>
              <p className="text-[9px] font-bold text-white/20 uppercase tracking-widest mt-4">Fleet idling</p>
            </div>
          )}
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-brand-gray-dark/40 p-6 rounded-[2.5rem] border border-white/5 space-y-4 shadow-xl">
        <div className="flex flex-col lg:flex-row justify-between items-stretch lg:items-center gap-4">
          {/* Quick Filter Tabs */}
          <div className="flex flex-wrap gap-2">
            {[
              { id: 'all', label: 'All Upcoming' },
              { id: 'today', label: `Today (${metrics.todayDepartures})` },
              { id: 'tomorrow', label: `Tomorrow (${metrics.tomorrowDepartures})` },
              { id: 'week', label: 'Next 7 Days' },
              { id: 'confirmed', label: 'Verified Paid' },
              { id: 'verifying', label: 'Proof Uploaded' }
            ].map(tab => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveFilter(tab.id as UpcomingFilter)}
                className={`px-5 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all cursor-pointer border ${
                  activeFilter === tab.id
                    ? 'bg-brand-orange text-white border-brand-orange shadow-lg shadow-brand-orange/20'
                    : 'bg-brand-black/40 text-white/50 border-white/5 hover:border-white/20 hover:text-white'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Search & Machine Dropdown */}
          <div className="flex flex-col sm:flex-row gap-3 items-center">
            {/* Machine Filter */}
            <select
              value={bikeFilter}
              onChange={(e) => setBikeFilter(e.target.value)}
              className="w-full sm:w-auto bg-brand-black/60 border border-white/10 rounded-xl px-4 py-2.5 text-[10px] font-bold uppercase tracking-wider text-white outline-none focus:border-brand-teal cursor-pointer"
            >
              <option value="all">All Fleet Machines</option>
              {BIKES.map(bike => (
                <option key={bike.id} value={bike.id.toString()}>{bike.name}</option>
              ))}
            </select>

            {/* Search Input */}
            <div className="relative w-full sm:w-64">
              <input
                type="text"
                placeholder="Search rider, phone, ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-brand-black/60 border border-white/10 rounded-xl pl-9 pr-4 py-2.5 text-[10px] text-white placeholder:text-white/30 outline-none focus:border-brand-teal transition-all"
              />
              <svg className="w-4 h-4 text-white/30 absolute left-3 top-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Reservations List */}
      <div className="space-y-4">
        {loading ? (
          <div className="bg-brand-gray-dark/30 rounded-[3rem] border border-white/5 p-20 text-center">
            <div className="w-12 h-12 border-2 border-brand-teal/20 border-t-brand-teal rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-[10px] font-black text-white/30 uppercase tracking-widest">Scanning Confirmed Bookings...</p>
          </div>
        ) : filteredReservations.length === 0 ? (
          <div className="bg-brand-gray-dark/30 rounded-[3rem] border border-white/5 p-20 text-center">
            <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4 text-white/20">
              <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <h3 className="font-heading text-xl text-white/40 uppercase tracking-widest">No Upcoming Reservations Found</h3>
            <p className="text-white/20 text-xs mt-1">There are no advance-paid bookings matching the selected filter.</p>
          </div>
        ) : (
          filteredReservations.map(booking => {
            const bike = BIKES.find(b => b.id === booking.bike_id);
            const baseRent = Number(booking.total_rent) || 0;
            const adjAmount = Number(booking.adjustment_amount) || 0;
            const finalAgreedRent = baseRent + adjAmount;
            const advancePaid = booking.advance_amount !== undefined && booking.advance_amount !== null 
              ? Number(booking.advance_amount) 
              : Math.floor(finalAgreedRent * 0.4);
            const balanceDue = Math.max(0, finalAgreedRent - advancePaid);
            const badge = getRelativeTimeBadge(booking.pickup_date, booking.pickup_time);
            const isConfirmed = booking.status === 'booking_confirmed';
            const isVerifying = booking.status === 'verifying_payment';

            return (
              <div
                key={booking.id}
                className="bg-brand-gray-dark/40 hover:bg-brand-gray-dark/60 border border-white/5 hover:border-brand-teal/30 rounded-[2.5rem] p-6 lg:p-8 transition-all duration-300 shadow-xl"
              >
                <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
                  {/* Left: Machine & Rider */}
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6 w-full lg:w-auto">
                    <div className="relative w-28 h-20 rounded-2xl overflow-hidden border border-white/10 shrink-0">
                      <img src={bike?.imageUrl} alt={bike?.name} className="w-full h-full object-cover" />
                      <div className="absolute bottom-1 right-1 bg-black/80 px-1.5 py-0.5 rounded text-[8px] font-black text-brand-yellow">
                        ₹{bike?.dailyRate}/d
                      </div>
                    </div>

                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-brand-orange text-[10px] font-black uppercase tracking-widest">
                          {booking.readable_id}
                        </span>
                        <span className={`px-2.5 py-0.5 rounded-full text-[8px] font-black uppercase tracking-wider ${badge.color}`}>
                          {badge.label}
                        </span>
                        <span className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-wider ${
                          isConfirmed ? 'bg-green-500/20 text-green-400 border border-green-500/30' : 'bg-brand-yellow/20 text-brand-yellow border border-brand-yellow/30'
                        }`}>
                          {isConfirmed ? 'ADVANCE VERIFIED' : 'PROOF UNDER REVIEW'}
                        </span>
                      </div>

                      <h3 className="text-xl font-heading text-white uppercase tracking-tight">
                        {bike?.name}
                      </h3>

                      <div className="flex flex-wrap items-center gap-3 pt-1 text-[11px] text-white/70">
                        <span className="font-bold text-white">{booking.customer_name}</span>
                        <span>•</span>
                        <a
                          href={`tel:${booking.customer_phone}`}
                          className="text-brand-teal hover:underline font-bold inline-flex items-center gap-1"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                          </svg>
                          {booking.customer_phone}
                        </a>
                      </div>
                    </div>
                  </div>

                  {/* Middle: Slot Schedule & Logistics */}
                  <div className="grid grid-cols-2 gap-6 bg-brand-black/40 px-6 py-4 rounded-2xl border border-white/5 w-full lg:w-auto">
                    <div>
                      <span className="text-[8px] font-black text-white/30 uppercase tracking-widest block">Pickup Slot</span>
                      <p className="text-xs font-bold text-white uppercase mt-0.5">{booking.pickup_date}</p>
                      <p className="text-[10px] text-brand-teal font-black uppercase">@ {booking.pickup_time}</p>
                    </div>

                    <div>
                      <span className="text-[8px] font-black text-white/30 uppercase tracking-widest block">Return Slot</span>
                      <p className="text-xs font-bold text-white uppercase mt-0.5">{booking.return_date}</p>
                      <p className="text-[10px] text-brand-yellow font-black uppercase">@ {booking.return_time}</p>
                    </div>

                    {booking.address ? (
                      <div className="col-span-2 pt-2 border-t border-white/5 space-y-1 text-[9px]">
                        {booking.address.includes('|') ? (
                          <>
                            <div className="flex items-start gap-1.5 text-white/90">
                              <span className="text-brand-teal font-black shrink-0">🚚 Deliv:</span>
                              <span className="truncate">{booking.address.split('|')[0].replace('Delivery:', '').trim()}</span>
                            </div>
                            <div className="flex items-start gap-1.5 text-white/90">
                              <span className="text-brand-yellow font-black shrink-0">🏁 Return:</span>
                              <span className="truncate">{booking.address.split('|')[1].replace('Return Pickup:', '').trim()}</span>
                            </div>
                          </>
                        ) : (
                          <div className="flex items-start gap-1.5 text-white/90">
                            <span className="text-brand-teal font-black shrink-0">📍 Handover:</span>
                            <span className="truncate">{booking.address}</span>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="col-span-2 pt-2 border-t border-white/5 flex items-center justify-between text-[9px] font-bold text-white/40 uppercase">
                        <span>Location:</span>
                        <span className="text-white/80">Garage (Self-Pickup & Return)</span>
                      </div>
                    )}
                  </div>

                  {/* Right: Financials & Action Buttons */}
                  <div className="flex flex-col sm:flex-row lg:flex-col items-start lg:items-end justify-between gap-4 w-full lg:w-auto">
                    <div className="text-left lg:text-right">
                      <div className="flex items-center lg:justify-end gap-2">
                        <span className="text-xs text-white/40 uppercase font-black">Agreed Rent:</span>
                        <span className="text-base font-heading text-white">₹{finalAgreedRent}</span>
                      </div>

                      {adjAmount !== 0 && (
                        <div className="flex items-center lg:justify-end mt-1">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider ${
                            adjAmount < 0
                              ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                              : 'bg-brand-orange/20 text-brand-orange border border-brand-orange/30'
                          }`}>
                            {adjAmount < 0 ? `🏷️ Discount -₹${Math.abs(adjAmount)}` : `🏷️ Premium +₹${adjAmount}`}
                          </span>
                        </div>
                      )}

                      <div className="flex items-center lg:justify-end gap-3 mt-1.5 text-[10px]">
                        <span className="text-green-400 font-bold bg-green-500/10 px-2 py-0.5 rounded border border-green-500/20">
                          Advance: ₹{advancePaid} ✓
                        </span>
                        <span className="text-brand-yellow font-bold bg-brand-yellow/10 px-2 py-0.5 rounded border border-brand-yellow/20">
                          Due: ₹{balanceDue}
                        </span>
                      </div>

                      {booking.payment_screenshot_url && (
                        <button
                          type="button"
                          onClick={() => setViewPaymentProofUrl(booking.payment_screenshot_url)}
                          className="text-[9px] font-black text-brand-teal hover:underline uppercase tracking-wider mt-1.5 inline-flex items-center gap-1 cursor-pointer"
                        >
                          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                          View UPI Screenshot
                        </button>
                      )}
                    </div>

                    {/* Action Buttons */}
                    <div className="flex flex-wrap gap-2 w-full sm:w-auto justify-start lg:justify-end">
                      {/* Confirm Payment / Edit Rent Terms Button */}
                      <button
                        type="button"
                        onClick={() => handleOpenConfirmPaymentModal(booking)}
                        className={`px-3.5 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1.5 ${
                          isConfirmed
                            ? 'bg-green-500/15 hover:bg-green-500 hover:text-black text-green-400 border border-green-500/30'
                            : 'bg-green-500 hover:bg-green-400 text-black font-black shadow-lg shadow-green-500/20'
                        }`}
                        title="Manually entry advance paid and finally agreed rent"
                      >
                        <span>{isConfirmed ? 'Rent Terms' : 'Confirm Pay'}</span>
                      </button>

                      {/* Cancel Booking Button - available and prominent even if payment was confirmed earlier */}
                      <button
                        type="button"
                        onClick={() => handleOpenCancelModal(booking)}
                        className="px-3.5 py-2.5 rounded-xl bg-red-500/10 hover:bg-red-500 hover:text-white border border-red-500/30 text-red-400 text-[9px] font-black uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1"
                        title="Cancel confirmed booking (payment was confirmed)"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                        <span>Cancel</span>
                      </button>

                      {/* WhatsApp Reminder Button */}
                      <a
                        href={getWhatsAppReminderUrl(booking, bike?.name || 'Machine')}
                        target="_blank"
                        rel="noreferrer"
                        className="px-3 py-2.5 rounded-xl bg-[#25D366]/10 text-[#25D366] hover:bg-[#25D366] hover:text-black border border-[#25D366]/30 text-[9px] font-black uppercase tracking-wider transition-all flex items-center gap-1.5 shadow"
                        title="Send confirmation reminder on WhatsApp"
                      >
                        <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 448 512">
                          <path d="M380.9 97.1C339 55.1 283.2 32 223.9 32c-122.4 0-222 99.6-222 222 0 39.1 10.2 77.3 29.6 111L0 480l117.7-30.9c32.4 17.7 68.9 27 106.1 27h.1c122.3 0 221.9-99.6 221.9-222 0-59.3-25.2-115-67.1-157zm-157 .9c48.4 0 93.2 18.7 127.3 52.8 34.1 34.1 52.8 78.9 52.8 127.3s-18.7 93.2-52.8 127.3c-34.1 34.1-78.9 52.8-127.3 52.8h-.1c-34.9 0-68.9-9.8-97.3-27.9l-11.5-6.8-71.3 18.6 19-69.8-7.5-11.8C34 317.6 24 286.5 24 252.3c0-110.3 89.7-200 200-200z" />
                        </svg>
                        WhatsApp
                      </a>

                      {/* Operations Modal Button */}
                      <button
                        type="button"
                        onClick={() => setSelectedBooking(booking)}
                        className="px-4 py-2.5 rounded-xl bg-brand-black/60 hover:bg-brand-teal hover:text-brand-black border border-brand-teal/30 text-brand-teal text-[9px] font-black uppercase tracking-wider transition-all cursor-pointer"
                      >
                        Operate
                      </button>

                      {/* Quick Handover Button */}
                      <button
                        type="button"
                        onClick={() => handleQuickDispatch(booking)}
                        className="px-4 py-2.5 rounded-xl bg-brand-orange hover:bg-brand-yellow text-white hover:text-black font-black uppercase text-[9px] tracking-wider transition-all shadow-lg shadow-brand-orange/20 cursor-pointer"
                      >
                        Dispatch
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* OPERATIONS MODAL */}
      {selectedBooking && (
        <Modal isOpen={!!selectedBooking} onClose={() => setSelectedBooking(null)} title={`OPERATIONS: ${selectedBooking.readable_id}`} maxWidth="4xl">
          <div className="space-y-8 py-2">
            {/* Rider Info Header */}
            <div className="bg-brand-black/40 p-8 rounded-[2.5rem] border border-white/5 space-y-6">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-brand-teal font-heading text-[10px] uppercase tracking-[0.3em]">Reserved Rider</span>
                    <span className="px-3 py-1 rounded-lg text-[8px] font-black uppercase tracking-wider bg-green-500/20 text-green-400 border border-green-500/30">
                      Advance Paid: ₹{selectedBooking.advance_amount || Math.floor((selectedBooking.total_rent || 0) * 0.4)}
                    </span>
                  </div>
                  <h3 className="text-white font-bold text-2xl uppercase tracking-tight">{selectedBooking.customer_name}</h3>
                  <div className="flex flex-wrap items-center gap-3 mt-3">
                    <a
                      href={`tel:${selectedBooking.customer_phone}`}
                      className="inline-flex items-center gap-2 bg-brand-teal/10 border border-brand-teal/20 px-4 py-2 rounded-xl text-brand-teal text-xs font-black hover:bg-brand-teal hover:text-black transition-all"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                      </svg>
                      {selectedBooking.customer_phone}
                    </a>

                    <span className="text-[10px] text-white/50 uppercase font-bold">
                      Vehicle: <strong className="text-white">{BIKES.find(b => b.id === selectedBooking.bike_id)?.name}</strong>
                    </span>
                  </div>
                </div>

                {/* Handover photo */}
                <div className="relative w-44 aspect-[4/3] bg-brand-black rounded-2xl border-2 border-dashed border-white/10 overflow-hidden flex flex-col items-center justify-center group hover:border-brand-orange transition-all shrink-0">
                  {uploadingPhoto ? (
                    <div className="flex flex-col items-center gap-2">
                      <div className="w-6 h-6 border-2 border-brand-orange border-t-transparent rounded-full animate-spin"></div>
                      <span className="text-[7px] font-black text-brand-orange uppercase">Saving...</span>
                    </div>
                  ) : selectedBooking.customer_photo_url ? (
                    <img src={selectedBooking.customer_photo_url} alt="Handover" className="w-full h-full object-cover" />
                  ) : (
                    <div className="text-center p-3">
                      <svg className="w-8 h-8 text-white/20 mx-auto mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                      </svg>
                      <p className="text-[8px] text-white/40 font-black uppercase tracking-wider">Handover Photo</p>
                    </div>
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    className="absolute inset-0 opacity-0 cursor-pointer"
                    onChange={(e) => e.target.files?.[0] && handlePhotoUpload(e.target.files[0])}
                  />
                </div>
              </div>
            </div>

            {/* LOGISTICS & DELIVERY ADDRESSES SECTION */}
            {selectedBooking.address && (
              <div className="bg-brand-black/40 p-8 rounded-[2.5rem] border border-white/5 space-y-4">
                <h4 className="text-brand-teal font-heading text-xs uppercase tracking-widest flex items-center gap-2">
                  <span>📍</span> Handover Logistics & Delivery Addresses
                </h4>
                {selectedBooking.address.includes('|') ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-brand-black/60 p-5 rounded-2xl border border-brand-teal/20 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[9px] font-black uppercase text-brand-teal tracking-wider">🚚 Delivery Address (Trip Start)</span>
                        <a 
                          href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(selectedBooking.address.split('|')[0].replace('Delivery:', '').trim())}`} 
                          target="_blank" 
                          rel="noreferrer" 
                          className="text-[8px] font-black uppercase text-brand-teal hover:underline inline-flex items-center gap-1"
                        >
                          Google Maps ↗
                        </a>
                      </div>
                      <p className="text-xs text-white leading-relaxed">
                        {selectedBooking.address.split('|')[0].replace('Delivery:', '').trim()}
                      </p>
                    </div>

                    <div className="bg-brand-black/60 p-5 rounded-2xl border border-brand-yellow/20 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[9px] font-black uppercase text-brand-yellow tracking-wider">🏁 Return Pickup Address (Trip End)</span>
                        <a 
                          href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(selectedBooking.address.split('|')[1].replace('Return Pickup:', '').trim())}`} 
                          target="_blank" 
                          rel="noreferrer" 
                          className="text-[8px] font-black uppercase text-brand-yellow hover:underline inline-flex items-center gap-1"
                        >
                          Google Maps ↗
                        </a>
                      </div>
                      <p className="text-xs text-white leading-relaxed">
                        {selectedBooking.address.split('|')[1].replace('Return Pickup:', '').trim()}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="bg-brand-black/60 p-5 rounded-2xl border border-white/10 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[9px] font-black uppercase text-brand-teal tracking-wider">📍 Logistics Address</span>
                      <a 
                        href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(selectedBooking.address)}`} 
                        target="_blank" 
                        rel="noreferrer" 
                        className="text-[8px] font-black uppercase text-brand-teal hover:underline inline-flex items-center gap-1"
                      >
                        Google Maps ↗
                      </a>
                    </div>
                    <p className="text-xs text-white leading-relaxed">{selectedBooking.address}</p>
                  </div>
                )}
              </div>
            )}

            {/* Documents Preview */}
            {(selectedBooking.aadhaar_url || selectedBooking.dl_url) && (
              <div className="bg-brand-black/40 p-8 rounded-[2.5rem] border border-white/5 space-y-6">
                <h4 className="text-brand-teal font-heading text-xs uppercase tracking-widest">Customer Identity Documents</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {selectedBooking.aadhaar_url && (
                    <div className="space-y-2">
                      <div className="flex justify-between items-center text-[9px] font-black uppercase text-white/50">
                        <span>Aadhaar Card ({selectedBooking.aadhaar_number || 'On File'})</span>
                        <a href={selectedBooking.aadhaar_url} target="_blank" rel="noreferrer" className="text-brand-teal hover:underline">View Full</a>
                      </div>
                      <div className="aspect-video bg-brand-black rounded-xl overflow-hidden border border-white/10">
                        <img src={selectedBooking.aadhaar_url} alt="Aadhaar" className="w-full h-full object-cover" />
                      </div>
                    </div>
                  )}

                  {selectedBooking.dl_url && (
                    <div className="space-y-2">
                      <div className="flex justify-between items-center text-[9px] font-black uppercase text-white/50">
                        <span>Driving License ({selectedBooking.dl_number || 'On File'})</span>
                        <a href={selectedBooking.dl_url} target="_blank" rel="noreferrer" className="text-brand-teal hover:underline">View Full</a>
                      </div>
                      <div className="aspect-video bg-brand-black rounded-xl overflow-hidden border border-white/10">
                        <img src={selectedBooking.dl_url} alt="DL" className="w-full h-full object-cover" />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Payment Proof Preview if present */}
            {selectedBooking.payment_screenshot_url && (
              <div className="bg-brand-black/40 p-8 rounded-[2.5rem] border-2 border-brand-yellow/30 space-y-4">
                <div className="flex justify-between items-center">
                  <h4 className="text-brand-yellow font-heading text-xs uppercase tracking-widest flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Advance Payment Receipt ({selectedBooking.payment_method?.toUpperCase() || 'UPI'})
                  </h4>
                  <a href={selectedBooking.payment_screenshot_url} target="_blank" rel="noreferrer" className="text-[9px] font-black text-brand-teal uppercase tracking-widest hover:underline">
                    Open Full Size
                  </a>
                </div>
                <div className="relative w-full h-64 bg-brand-black rounded-2xl overflow-hidden border border-white/10">
                  <img src={selectedBooking.payment_screenshot_url} alt="Payment Receipt" className="w-full h-full object-contain" />
                </div>
              </div>
            )}

            {/* Operations Actions */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => handleOpenConfirmPaymentModal(selectedBooking)}
                className="py-4 px-6 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all bg-green-500 hover:bg-green-600 text-white shadow-lg shadow-green-500/20 cursor-pointer flex items-center justify-center gap-2"
              >
                <span>{selectedBooking.status === 'booking_confirmed' ? '✓ Payment Confirmed (Edit Rent / Advance)' : 'Confirm Payment & Rent Terms'}</span>
              </button>

              <button
                type="button"
                onClick={() => handleQuickDispatch(selectedBooking)}
                className="py-4 px-6 rounded-xl bg-brand-teal hover:bg-brand-teal/80 text-brand-black font-black text-[10px] uppercase tracking-widest transition-all shadow-lg shadow-brand-teal/20 cursor-pointer"
              >
                Dispatch Machine (Start Ride)
              </button>
            </div>

            {/* Cancel Action - prominent even if payment confirmed */}
            <div className="pt-4 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between gap-4">
              <span className="text-[10px] text-white/50">
                {selectedBooking.status === 'booking_confirmed'
                  ? 'Advance payment was confirmed earlier. Cancelling will log refund/settlement notes and release the slot.'
                  : 'Cancelling releases this machine slot immediately.'}
              </span>
              <button
                type="button"
                onClick={() => handleOpenCancelModal(selectedBooking)}
                className="w-full sm:w-auto py-3 px-6 rounded-xl bg-red-500/10 hover:bg-red-500 hover:text-white border border-red-500/30 text-red-400 font-black text-[10px] uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                <span>Booking Cancelled</span>
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* CONFIRM PAYMENT & SET AGREED RENT MODAL */}
      {showConfirmPaymentModal && selectedBooking && (
        <Modal 
          isOpen={showConfirmPaymentModal} 
          onClose={() => setShowConfirmPaymentModal(false)} 
          title={`CONFIRM PAYMENT & TERMS: ${selectedBooking.readable_id}`} 
          maxWidth="2xl"
        >
          <form onSubmit={handleSavePaymentAndTerms} className="space-y-6 py-2">
            {/* Context Card */}
            <div className="bg-brand-black/60 p-5 rounded-2xl border border-white/10 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <p className="text-[9px] font-black uppercase text-brand-teal tracking-widest">
                  Customer & Machine
                </p>
                <p className="text-white text-base font-bold uppercase mt-0.5">
                  {selectedBooking.customer_name}
                </p>
                <p className="text-white/50 text-xs">
                  {BIKES.find(b => b.id === selectedBooking.bike_id)?.name || 'Machine'} • {selectedBooking.pickup_date} to {selectedBooking.return_date}
                </p>
              </div>

              <div className="text-left sm:text-right bg-brand-black p-3 rounded-xl border border-white/5">
                <span className="text-[8px] font-black uppercase text-white/40 tracking-wider block">
                  Original Booking Rent
                </span>
                <span className="text-xl font-heading text-white">
                  ₹{selectedBooking.total_rent}
                </span>
              </div>
            </div>

            {/* Inputs Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {/* Advance Paid Input */}
              <div className="space-y-2">
                <label className="text-[9px] font-black text-white/60 uppercase tracking-widest ml-1">
                  1. Advance Amount Paid (₹)
                </label>
                <input 
                  type="number" 
                  min="0"
                  value={paymentForm.advancePaid}
                  onChange={(e) => setPaymentForm(p => ({ ...p, advancePaid: parseFloat(e.target.value) || 0 }))}
                  className="w-full bg-brand-black border border-white/15 rounded-xl p-4 text-white font-heading text-lg outline-none focus:border-green-500"
                  required
                />
                <div className="flex gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setPaymentForm(p => ({ ...p, advancePaid: 500 }))}
                    className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-[8px] font-bold text-white/60 uppercase cursor-pointer"
                  >
                    ₹500 Min
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentForm(p => ({ ...p, advancePaid: 1000 }))}
                    className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-[8px] font-bold text-white/60 uppercase cursor-pointer"
                  >
                    ₹1,000
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentForm(p => ({ ...p, advancePaid: paymentForm.agreedRent }))}
                    className="px-2.5 py-1 rounded-lg bg-green-500/10 border border-green-500/20 text-[8px] font-bold text-green-400 uppercase cursor-pointer"
                  >
                    Full Rent (₹{paymentForm.agreedRent})
                  </button>
                </div>
              </div>

              {/* Payment Method Selection */}
              <div className="space-y-2">
                <label className="text-[9px] font-black text-white/60 uppercase tracking-widest ml-1">
                  2. Payment Method
                </label>
                <select
                  value={paymentForm.paymentMethod}
                  onChange={(e) => setPaymentForm(p => ({ ...p, paymentMethod: e.target.value }))}
                  className="w-full bg-brand-black border border-white/15 rounded-xl p-4 text-white text-sm outline-none focus:border-brand-teal"
                >
                  <option value="upi">UPI (GPay / PhonePe / Paytm)</option>
                  <option value="cash">Cash Received at Garage</option>
                  <option value="bank_transfer">Bank Transfer / IMPS / NEFT</option>
                  <option value="card">Debit / Credit Card</option>
                </select>
                <p className="text-[8px] text-white/40 uppercase ml-1">How customer paid advance</p>
              </div>
            </div>

            {/* Finally Agreed Rent Input */}
            <div className="space-y-2">
              <div className="flex justify-between items-center ml-1">
                <label className="text-[9px] font-black text-white/60 uppercase tracking-widest">
                  3. Finally Agreed Rent (₹)
                </label>
                <span className="text-[8px] text-brand-yellow uppercase font-bold">
                  Original Rent: ₹{selectedBooking.total_rent}
                </span>
              </div>
              <input 
                type="number" 
                min="1"
                value={paymentForm.agreedRent}
                onChange={(e) => setPaymentForm(p => ({ ...p, agreedRent: parseFloat(e.target.value) || 0 }))}
                className="w-full bg-brand-black border border-white/15 rounded-xl p-4 text-white font-heading text-xl outline-none focus:border-brand-yellow"
                required
              />
              <div className="flex flex-wrap gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setPaymentForm(p => ({ ...p, agreedRent: Number(selectedBooking.total_rent) }))}
                  className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-[8px] font-bold text-white/60 uppercase cursor-pointer"
                >
                  Reset to Original (₹{selectedBooking.total_rent})
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentForm(p => ({ ...p, agreedRent: Math.max(100, p.agreedRent - 100) }))}
                  className="px-2.5 py-1 rounded-lg bg-green-500/10 text-green-400 border border-green-500/20 text-[8px] font-bold uppercase cursor-pointer"
                >
                  - ₹100
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentForm(p => ({ ...p, agreedRent: Math.max(100, p.agreedRent - 200) }))}
                  className="px-2.5 py-1 rounded-lg bg-green-500/10 text-green-400 border border-green-500/20 text-[8px] font-bold uppercase cursor-pointer"
                >
                  - ₹200
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentForm(p => ({ ...p, agreedRent: p.agreedRent + 100 }))}
                  className="px-2.5 py-1 rounded-lg bg-brand-orange/10 text-brand-orange border border-brand-orange/20 text-[8px] font-bold uppercase cursor-pointer"
                >
                  + ₹100
                </button>
              </div>
            </div>

            {/* LIVE DYNAMIC DISCOUNT OR PREMIUM TAG CARD */}
            {(() => {
              const diff = Number(paymentForm.agreedRent) - Number(selectedBooking.total_rent);
              if (diff < 0) {
                return (
                  <div className="bg-green-500/10 border-2 border-green-500/40 rounded-2xl p-4 flex items-center gap-3 animate-fade-in">
                    <span className="text-2xl shrink-0">🏷️</span>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded bg-green-500 text-black text-[9px] font-black uppercase">
                          Discount Tag
                        </span>
                        <span className="text-green-400 font-bold text-sm">
                          -₹{Math.abs(diff)}
                        </span>
                      </div>
                      <p className="text-[10px] text-white/80 mt-1 leading-relaxed">
                        Finally agreed rent is <strong>₹{Math.abs(diff)} lower</strong> than the booked rent. This will be automatically recorded as a custom adjustment under the <strong>Discount</strong> tag.
                      </p>
                    </div>
                  </div>
                );
              }
              if (diff > 0) {
                return (
                  <div className="bg-brand-orange/10 border-2 border-brand-orange/40 rounded-2xl p-4 flex items-center gap-3 animate-fade-in">
                    <span className="text-2xl shrink-0">🏷️</span>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded bg-brand-orange text-white text-[9px] font-black uppercase">
                          Premium Tag
                        </span>
                        <span className="text-brand-orange font-bold text-sm">
                          +₹{diff}
                        </span>
                      </div>
                      <p className="text-[10px] text-white/80 mt-1 leading-relaxed">
                        Finally agreed rent is <strong>₹{diff} higher</strong> than the booked rent. This will be automatically recorded as a custom adjustment under the <strong>Premium</strong> tag.
                      </p>
                    </div>
                  </div>
                );
              }
              return (
                <div className="bg-white/5 border border-white/10 rounded-2xl p-4 flex items-center gap-3">
                  <span className="text-brand-teal text-xl shrink-0">✓</span>
                  <div>
                    <p className="text-xs font-black text-white/80 uppercase tracking-wider">
                      Standard Rent Maintained (₹{selectedBooking.total_rent})
                    </p>
                    <p className="text-[10px] text-white/50 mt-0.5">
                      Finally agreed rent equals booking base rent. No discount or premium adjustment needed.
                    </p>
                  </div>
                </div>
              );
            })()}

            {/* Adjustment Reason/Note */}
            <div className="space-y-1.5">
              <label className="text-[9px] font-black text-white/60 uppercase tracking-widest ml-1">
                4. Adjustment Note / Reason (Optional)
              </label>
              <input 
                type="text" 
                placeholder="e.g. Negotiated for 3-day trip, Helmet add-on included, Regular rider discount..."
                value={paymentForm.note}
                onChange={(e) => setPaymentForm(p => ({ ...p, note: e.target.value }))}
                className="w-full bg-brand-black border border-white/15 rounded-xl p-3 text-xs text-white outline-none focus:border-brand-teal"
              />
            </div>

            {/* Financial Settlement Breakdown */}
            <div className="bg-brand-black/60 p-4 rounded-2xl border border-white/10 grid grid-cols-3 gap-4 text-center">
              <div>
                <span className="text-[8px] font-black text-white/40 uppercase tracking-wider block">Agreed Rent</span>
                <span className="text-base font-heading text-white">₹{paymentForm.agreedRent}</span>
              </div>
              <div className="border-x border-white/10">
                <span className="text-[8px] font-black text-green-400 uppercase tracking-wider block">Advance Paid</span>
                <span className="text-base font-heading text-green-400">₹{paymentForm.advancePaid}</span>
              </div>
              <div>
                <span className="text-[8px] font-black text-brand-yellow uppercase tracking-wider block">Due at Handover</span>
                <span className="text-base font-heading text-brand-yellow">₹{Math.max(0, paymentForm.agreedRent - paymentForm.advancePaid)}</span>
              </div>
            </div>

            {/* Submit */}
            <div className="flex gap-4 pt-2">
              <button
                type="button"
                onClick={() => setShowConfirmPaymentModal(false)}
                className="flex-1 py-4 bg-white/5 hover:bg-white/10 text-white/60 text-[10px] font-black uppercase rounded-xl transition-all cursor-pointer"
              >
                Back
              </button>
              <button
                type="submit"
                className="flex-[2] py-4 bg-green-500 hover:bg-green-600 text-white font-black uppercase text-[10px] tracking-widest rounded-xl transition-all shadow-lg shadow-green-500/20 cursor-pointer"
              >
                Confirm Payment & Apply Rent Terms
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* PAYMENT PROOF LIGHTBOX */}
      {viewPaymentProofUrl && (
        <Modal isOpen={!!viewPaymentProofUrl} onClose={() => setViewPaymentProofUrl(null)} title="Advance Payment Screenshot" maxWidth="2xl">
          <div className="space-y-4 py-2">
            <div className="w-full h-96 bg-brand-black rounded-2xl overflow-hidden border border-white/10 flex items-center justify-center">
              <img src={viewPaymentProofUrl} alt="Payment Proof" className="max-w-full max-h-full object-contain" />
            </div>
            <div className="flex justify-end">
              <a
                href={viewPaymentProofUrl}
                target="_blank"
                rel="noreferrer"
                className="px-6 py-2.5 rounded-xl bg-brand-teal text-brand-black font-black uppercase text-[10px] tracking-wider hover:bg-brand-teal/80 transition-all"
              >
                Open Original Image
              </a>
            </div>
          </div>
        </Modal>
      )}

      {/* CANCEL RESERVATION CONFIRMATION */}
      {cancelModalBooking && (
        <Modal 
          isOpen={!!cancelModalBooking} 
          onClose={() => setCancelModalBooking(null)} 
          title={`CANCEL RESERVATION: ${cancelModalBooking.readable_id}`} 
          maxWidth="md"
        >
          <div className="space-y-6 py-2">
            <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-2xl text-red-200 text-xs leading-relaxed space-y-2">
              <p className="font-bold flex items-center gap-1.5 text-red-400 uppercase tracking-wider">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                {cancelModalBooking.status === 'booking_confirmed' ? 'Cancel Confirmed Paid Booking' : 'Cancel Reservation'}
              </p>
              <p>
                Are you sure you want to cancel reservation <strong>{cancelModalBooking.readable_id}</strong> for <strong>{cancelModalBooking.customer_name}</strong>?
              </p>
              {cancelModalBooking.status === 'booking_confirmed' && (
                <div className="bg-red-500/20 p-2.5 rounded-xl border border-red-500/30 text-[11px] text-white">
                  <strong>Advance Payment was confirmed:</strong> ₹{cancelModalBooking.advance_amount || 0} via {cancelModalBooking.payment_method?.toUpperCase() || 'UPI'}.
                </div>
              )}
              <p className="text-[10px] text-white/60">
                Cancelling will set the status to <strong>Cancelled</strong> and instantly release the vehicle slot for new reservations.
              </p>
            </div>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase text-white/60 tracking-wider">
                  Cancellation Reason
                </label>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {['Customer Request', 'Customer Emergency', 'No Show', 'Vehicle Maintenance', 'Weather / Trip Cancelled'].map(r => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setCancelReason(r)}
                      className={`px-2.5 py-1 rounded-lg text-[8px] font-bold uppercase transition-all cursor-pointer ${
                        cancelReason === r ? 'bg-red-500 text-white' : 'bg-white/5 text-white/50 hover:text-white'
                      }`}
                    >
                      {r}
                    </button>
                  ))}
                </div>
                <textarea 
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  placeholder="Explain why this reservation is being cancelled..."
                  className="w-full bg-brand-black border border-white/15 rounded-xl p-3 text-xs text-white resize-none h-20 outline-none focus:border-red-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase text-white/60 tracking-wider">
                  Refund & Settlement Note
                </label>
                <textarea 
                  value={cancelRefundNote}
                  onChange={(e) => setCancelRefundNote(e.target.value)}
                  placeholder="e.g. ₹500 advance refunded via UPI / retained per cancellation policy..."
                  className="w-full bg-brand-black border border-white/15 rounded-xl p-3 text-xs text-white resize-none h-16 outline-none focus:border-red-500"
                />
              </div>
            </div>

            <div className="flex gap-4 pt-2">
              <button
                type="button"
                onClick={() => setCancelModalBooking(null)}
                className="flex-1 py-3.5 bg-white/5 hover:bg-white/10 text-white/60 text-[10px] font-black uppercase rounded-xl transition-all cursor-pointer"
              >
                Keep Reservation
              </button>
              <button
                type="button"
                onClick={handleConfirmCancel}
                className="flex-[2] py-3.5 bg-red-500 hover:bg-red-600 text-white font-black uppercase text-[10px] tracking-wider rounded-xl transition-all shadow-lg shadow-red-500/20 cursor-pointer"
              >
                Confirm Cancellation (Release Slot)
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
