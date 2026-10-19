import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../../supabase';
import { useToast } from '../../App';
import { GOOGLE_MAPS_REVIEW_LINK, UPI_ID, GARAGE_MAPS_LINK, GARAGE_ADDRESS } from '../../constants';
import { getFleetBikes } from '../../fleetStorage';
import { Modal } from '../Modal';

interface UpcomingReservationsProps {
  onOpenBookingOperations?: (booking: any) => void;
  onRefreshStats?: () => void;
}

type UpcomingFilter = 'all' | 'today' | 'tomorrow' | 'week' | 'confirmed' | 'pending';

export const UpcomingReservations: React.FC<UpcomingReservationsProps> = ({ onRefreshStats }) => {
  const { showToast } = useToast();
  const [fleetBikes, setFleetBikes] = useState<any[]>(() => getFleetBikes());
  const BIKES = fleetBikes;
  const [reservations, setReservations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<UpcomingFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [bikeFilter, setBikeFilter] = useState<string>('all');
  const [expandedBookingId, setExpandedBookingId] = useState<number | null>(null);

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

  // Edit Booking Modal state
  const [editingBooking, setEditingBooking] = useState<any | null>(null);
  const [editForm, setEditForm] = useState({
    customer_name: '',
    customer_phone: '',
    customer_email: '',
    bike_id: 15,
    pickup_date: '',
    pickup_time: '10:00',
    return_date: '',
    return_time: '20:00',
    total_rent: 700,
    advance_amount: 500,
    security_deposit: 1000,
    status: 'booking_confirmed',
    needs_delivery: false,
    address: '',
    admin_notes: '',
  });
  const [savingEdit, setSavingEdit] = useState(false);

  const calculateStandardRent = (bikeId: number, pickDate: string, pickTime: string, retDate: string, retTime: string) => {
    const bike = fleetBikes.find(b => b.id === bikeId) || BIKES.find(b => b.id === bikeId);
    const dailyRate = bike?.dailyRate || 700;
    if (!pickDate || !retDate) return dailyRate;
    const start = new Date(`${pickDate}T${pickTime || '10:00'}`);
    const end = new Date(`${retDate}T${retTime || '20:00'}`);
    const diffMs = end.getTime() - start.getTime();
    const diffHours = Math.max(1, diffMs / (1000 * 60 * 60));
    const days = Math.max(1, Math.ceil(diffHours / 24));
    return days * dailyRate;
  };

  const getDurationText = (pickDate: string, pickTime: string, retDate: string, retTime: string) => {
    if (!pickDate || !retDate) return '1 Day';
    const start = new Date(`${pickDate}T${pickTime || '10:00'}`);
    const end = new Date(`${retDate}T${retTime || '20:00'}`);
    const diffMs = end.getTime() - start.getTime();
    if (diffMs <= 0) return 'Same Day';
    const totalHours = Math.round(diffMs / (1000 * 60 * 60));
    const days = Math.floor(totalHours / 24);
    const remHours = totalHours % 24;
    if (days === 0) return `${totalHours} Hours`;
    if (remHours === 0) return `${days} Day${days > 1 ? 's' : ''}`;
    return `${days} Day${days > 1 ? 's' : ''} ${remHours} Hr${remHours > 1 ? 's' : ''}`;
  };

  const handleOpenEditModal = (booking: any) => {
    setEditingBooking(booking);
    setEditForm({
      customer_name: booking.customer_name || '',
      customer_phone: booking.customer_phone || '',
      customer_email: booking.customer_email || '',
      bike_id: Number(booking.bike_id) || fleetBikes[0]?.id || 15,
      pickup_date: booking.pickup_date || '',
      pickup_time: booking.pickup_time || '10:00',
      return_date: booking.return_date || '',
      return_time: booking.return_time || '20:00',
      total_rent: Number(booking.total_rent) || 0,
      advance_amount: Number(booking.advance_amount) || 0,
      security_deposit: Number(booking.security_deposit) || 1000,
      status: booking.status || 'booking_confirmed',
      needs_delivery: Boolean(booking.needs_delivery),
      address: booking.address || '',
      admin_notes: booking.admin_notes || '',
    });
  };

  const handleRecalculateEditRent = () => {
    const stdRent = calculateStandardRent(
      editForm.bike_id,
      editForm.pickup_date,
      editForm.pickup_time,
      editForm.return_date,
      editForm.return_time
    );
    setEditForm(prev => ({ ...prev, total_rent: stdRent }));
    showToast(`Rent recalculated to standard tariff: ₹${stdRent}`, "info");
  };

  const handleSaveEditBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingBooking) return;
    if (!editForm.customer_name.trim()) {
      showToast("Customer name is required", "warning");
      return;
    }
    if (!editForm.customer_phone.trim()) {
      showToast("Customer phone is required", "warning");
      return;
    }
    if (!editForm.pickup_date || !editForm.return_date) {
      showToast("Pickup and return dates are required", "warning");
      return;
    }

    setSavingEdit(true);
    try {
      // Slot collision check: only block bookings for any vehicle if its status is payment confirmed ('booking_confirmed' or 'ongoing')
      const reqStart = new Date(`${editForm.pickup_date}T${editForm.pickup_time || '10:00'}`).getTime();
      const reqEnd = new Date(`${editForm.return_date}T${editForm.return_time || '20:00'}`).getTime();
      if (!isNaN(reqStart) && !isNaN(reqEnd)) {
        const { data: conflicts } = await supabase
          .from('bookings')
          .select('id, readable_id, pickup_date, pickup_time, return_date, return_time')
          .eq('bike_id', Number(editForm.bike_id))
          .in('status', ['booking_confirmed', 'ongoing']);

        const conflict = conflicts?.find(b => {
          if (b.id === editingBooking.id) return false;
          const bStart = new Date(`${b.pickup_date}T${b.pickup_time || '10:00'}`).getTime();
          const bEnd = new Date(`${b.return_date}T${b.return_time || '20:00'}`).getTime();
          return reqStart < bEnd && reqEnd > bStart;
        });

        if (conflict) {
          showToast(`Conflict: Bike already has a payment-confirmed reservation (${conflict.readable_id || `#${conflict.id}`}). Unconfirmed bookings do not block slots.`, 'error');
          setSavingEdit(false);
          return;
        }
      }

      const updates = {
        customer_name: editForm.customer_name.trim(),
        customer_phone: editForm.customer_phone.trim(),
        customer_email: editForm.customer_email.trim(),
        bike_id: Number(editForm.bike_id),
        pickup_date: editForm.pickup_date,
        pickup_time: editForm.pickup_time,
        return_date: editForm.return_date,
        return_time: editForm.return_time,
        total_rent: Number(editForm.total_rent),
        advance_amount: Number(editForm.advance_amount),
        security_deposit: Number(editForm.security_deposit),
        status: editForm.status,
        needs_delivery: editForm.needs_delivery,
        address: editForm.address.trim(),
        admin_notes: editForm.admin_notes.trim(),
        updated_at: new Date().toISOString()
      };

      const { error } = await supabase
        .from('bookings')
        .update(updates)
        .eq('id', editingBooking.id);

      if (error) throw error;

      showToast(`Booking ${editingBooking.readable_id || `#${editingBooking.id}`} updated successfully!`, "success");
      setEditingBooking(null);
      await fetchUpcomingReservations();
      if (selectedBooking?.id === editingBooking.id) {
        setSelectedBooking((prev: any) => prev ? { ...prev, ...updates } : null);
      }
    } catch (err: any) {
      console.error("Error updating booking:", err);
      showToast(`Failed to update booking: ${err.message || 'Unknown error'}`, "error");
    } finally {
      setSavingEdit(false);
    }
  };

  useEffect(() => {
    fetchUpcomingReservations();
    const handleFleetUpdate = () => setFleetBikes(getFleetBikes());
    window.addEventListener('rydeit_fleet_updated', handleFleetUpdate);
    return () => window.removeEventListener('rydeit_fleet_updated', handleFleetUpdate);
  }, []);

  const fetchUpcomingReservations = async () => {
    setLoading(true);
    try {
      // Query reservations: status = 'booking_confirmed' or 'pending_payment'
      const { data, error } = await supabase
        .from('bookings')
        .select('*')
        .in('status', ['booking_confirmed', 'pending_payment'])
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
      if (status === 'ongoing') updates.start_timestamp = new Date().toISOString();
      if (status === 'completed') updates.end_timestamp = new Date().toISOString();

      let updateError: any = null;
      const numericId = !isNaN(Number(id)) ? Number(id) : id;
      const { data, error } = await supabase.from('bookings').update(updates).eq('id', numericId).select();
      
      if (error || !data || data.length === 0) {
        // Fallback: try by readable_id
        const { error: readErr } = await supabase.from('bookings').update(updates).eq('readable_id', id);
        updateError = readErr;
      }

      if (updateError) throw updateError;

      const actionTitle = 
        status === 'ongoing' ? 'Ride Dispatch' :
        status === 'completed' ? 'Ride Completion' :
        status === 'cancelled' ? 'Booking Cancellation' :
        status === 'booking_confirmed' ? 'Payment Confirmation' :
        status === 'pending_payment' ? 'Set to Pending Payment' :
        `Status change to ${status.replace(/_/g, ' ').toUpperCase()}`;

      showToast(`${actionTitle} successfully done!`, 'success');

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
          const { data: refreshed } = await supabase.from('bookings').select('*').eq('id', numericId).maybeSingle();
          if (refreshed) setSelectedBooking(refreshed);
        }
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to update reservation status', 'error');
    }
  };

  const handleQuickDispatch = async (booking: any) => {
    await updateStatus(booking.id, 'ongoing');
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
      showToast(`Payment Confirmation successfully done! Advance: ₹${advancePaid}, Agreed Rent: ₹${agreedRent}${tagText}`, 'success');

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
      if (activeFilter === 'pending' && b.status !== 'pending_payment') return false;

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
      if (diffHours <= 0) return { label: 'PICKUP DUE NOW', color: 'bg-rose-600 text-white font-bold' };
      if (diffHours === 1) return { label: 'IN 1 HOUR', color: 'bg-orange-600 text-white font-bold' };
      return { label: `TODAY IN ${diffHours}H`, color: 'bg-orange-600/90 text-white font-bold' };
    }
    if (pickupDate === tomorrowStr) {
      return { label: 'TOMORROW', color: 'bg-amber-600 text-white font-bold' };
    }
    if (diffDays <= 7) {
      return { label: `IN ${diffDays} DAYS`, color: 'bg-sky-950/80 text-sky-300 border border-sky-800/60 font-semibold' };
    }
    return { label: pickupDate, color: 'bg-slate-800 text-slate-300 border border-slate-700 font-semibold' };
  };

  // WhatsApp Reminder Generator
  const getWhatsAppReminderUrl = (booking: any, bikeName: string) => {
    const rawPhone = (booking.customer_phone || '').replace(/\D/g, '');
    const cleanPhone = rawPhone.length === 10 ? `91${rawPhone}` : rawPhone.startsWith('91') ? rawPhone : `91${rawPhone}`;
    const advancePaid = booking.advance_amount || Math.floor((booking.total_rent || 0) * 0.4);
    const balanceDue = Math.max(0, (booking.total_rent || 0) - advancePaid);
    const upiId = UPI_ID || '9831846183@ybl';
    const paymentId = booking.readable_id || `RYDE-${booking.id}`;
    const totalAmount = (Number(booking.total_rent) || 0) + (Number(booking.adjustment_amount) || 0);
    const advanceAmount = booking.advance_amount && Number(booking.advance_amount) > 0 ? Number(booking.advance_amount) : 500;

    let message = '';

    if (booking.status === 'pending_payment') {
      message = `*RYDEIT - BOOKING & PAYMENT DETAILS* 🏍️💨\n\n` +
        `Dear *${booking.customer_name}*,\n\n` +
        `Your booking request for *${bikeName}* has been received! Your booking status is currently *PAYMENT PENDING*.\n\n` +
        `⚠️ *Action Required:* Please send the advance payment of ₹${advanceAmount} to officially reserve and guarantee your booking slot. Unreserved slots are released to other riders on a first-come, first-served basis.\n\n` +
        `📋 *Booking Details:*\n` +
        `• *Payment ID / Ref:* ${paymentId}\n` +
        `• *Machine:* ${bikeName}\n` +
        `• *Pickup:* ${booking.pickup_date} @ ${booking.pickup_time || '10:00'}\n` +
        `• *Return:* ${booking.return_date} @ ${booking.return_time || '20:00'}\n` +
        `• *Total Rental Amount:* ₹${totalAmount}\n` +
        `• *Advance Required to Reserve Slot:* ₹${advanceAmount}\n` +
        `• *Refundable Deposit:* ₹1,000 (payable at vehicle handover)\n\n` +
        `💳 *How to Pay:*\n` +
        `1. Transfer *₹${advanceAmount}* via UPI to: *${upiId}*\n` +
        `2. Mention Payment ID in remarks/notes: *${paymentId}*\n` +
        `3. Reply to this chat with your payment screenshot or transaction UTR.\n\n` +
        `Once payment is verified, your booking slot will be officially confirmed!\n\n` +
        `Need assistance? Call/WhatsApp us at +91 76860 22245\n` +
        `Team Rydeit Kolkata`;
    } else {
      message = `Hi ${booking.customer_name},\n\n` +
        `Greetings from *Rydeit Rentals*!\n` +
        `This is a confirmation reminder for your upcoming reserved ride:\n\n` +
        `🏍️ *Machine:* ${bikeName}\n` +
        `🔖 *Booking ID:* ${paymentId}\n` +
        `📅 *Pickup:* ${booking.pickup_date} @ ${booking.pickup_time}\n` +
        `🏁 *Return:* ${booking.return_date} @ ${booking.return_time}\n` +
        `💰 *Advance Paid:* ₹${advancePaid} (Confirmed ✓)\n` +
        `💵 *Balance at Handover:* ₹${balanceDue}\n\n` +
        `📍 *Garage Location & Map:* ${GARAGE_MAPS_LINK} (${GARAGE_ADDRESS})\n` +
        `⚠️ *Please bring:* Original Driving License & Aadhaar Card for biometric verification.\n\n` +
        `Have a safe & thrilling journey! Reach us at +91 76860 22245 for any assistance.`;
    }

    return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
  };

  const getTermsAndRefundPolicyUrl = (booking: any, bikeName: string) => {
    const rawPhone = (booking.customer_phone || '').replace(/\D/g, '');
    const cleanPhone = rawPhone.length === 10 ? `91${rawPhone}` : rawPhone.startsWith('91') ? rawPhone : `91${rawPhone}`;
    const paymentId = booking.readable_id || `RYDE-${booking.id}`;

    const message = `*RYDEIT - TERMS, CONDITIONS & REFUND POLICY* 📄🏍️💨\n\n` +
      `Dear *${booking.customer_name}*,\n\n` +
      `Thank you for choosing Rydeit Rentals! Please review our official Rental Terms, Conditions, and Cancellation Refund Policy for your reservation (Ref: *${paymentId}*, Machine: *${bikeName}*):\n\n` +
      `📋 *1. CANCELLATION & REFUND POLICY:*\n` +
      `Refunds on the booking advance are processed based on the cancellation time before departure:\n` +
      `• *96 hours or more before departure:* 100% Return\n` +
      `• *72 to 96 hours before departure:* 75% Refund\n` +
      `• *48 to 72 hours before departure:* 50% Refund\n` +
      `• *24 to 48 hours before departure:* 25% Return\n` +
      `• *Less than 24 hours before departure:* No Refund\n` +
      `• *Cancellation by Rydeit:* 100% Full Refund issued immediately.\n` +
      `• *No-Show:* Failure to arrive within 2 hours of scheduled pickup without prior notice results in full advance forfeiture.\n\n` +
      `⚙️ *2. KEY RENTAL TERMS & CONDITIONS:*\n` +
      `• *Operating Hours:* 06:00 AM to 10:00 PM daily. Pickups/returns outside 08:00 AM – 08:00 PM incur a ₹99 convenience surcharge.\n` +
      `• *Late Return Penalty:* Returning vehicle after scheduled drop-off time incurs *₹120 per hour*.\n` +
      `• *Breakdown & Service Coverage:* Mechanical support is provided strictly within a 5 KM radius of our main garage. Beyond 5 KM, vehicle towing and logistics are the rider's responsibility.\n` +
      `• *Refundable Security Deposit:* ₹1,000 security deposit is mandatory at machine handover. A walk-around video inspection is conducted at pickup; new damages forfeit deposit.\n` +
      `• *Legal Compliance:* Helmets are mandatory. All traffic fines, speeding tickets, or e-challans generated during rental duration are 100% the rider's responsibility. Racing, stunting, or illegal transport is strictly prohibited.\n\n` +
      `By booking with Rydeit Rentals, you agree to comply with all safety and traffic laws.\n` +
      `Helpline / Enquiries: +91 76860 22245\n` +
      `Team Rydeit Kolkata`;

    return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
  };

  return (
    <div className="space-y-8 animate-fade-in max-w-7xl mx-auto pb-16">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-5 border-b border-neutral-900 pb-6">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-sky-400"></span>
            <span className="text-xs font-semibold text-sky-400 uppercase tracking-wider">Payment Confirmed Slots</span>
          </div>
          <h1 className="text-3xl font-heading text-slate-100 tracking-wide mt-1.5">
            Upcoming <span className="text-orange-500">Reservations</span>
          </h1>
          <p className="text-neutral-400 text-xs mt-1.5 max-w-xl">
            Live queue of reserved machines with confirmed advance payments. These time slots are strictly reserved and blocked from overlapping bookings.
          </p>
        </div>

        <button
          type="button"
          onClick={fetchUpcomingReservations}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#0a0a0a] border border-neutral-800 text-neutral-300 hover:text-white hover:border-neutral-700 transition-all text-xs font-semibold cursor-pointer shadow-sm"
        >
          <svg className={`w-4 h-4 ${loading ? 'animate-spin text-orange-500' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Refresh Queue
        </button>
      </div>

      {/* KPI Cards: Pitch Black & High Contrast (Black + White + Sky/Orange) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-[#0a0a0a] p-4 rounded-2xl border border-neutral-800 shadow-sm">
          <p className="text-xs font-semibold text-neutral-400 uppercase tracking-wide mb-1">Upcoming Departures</p>
          <p className="text-2xl font-bold text-white">{metrics.totalCount}</p>
          <div className="flex items-center gap-2 mt-2 text-xs font-medium text-neutral-400">
            <span className="text-orange-400 font-semibold">{metrics.todayDepartures} Today</span>
            <span>•</span>
            <span className="text-neutral-300">{metrics.tomorrowDepartures} Tomorrow</span>
          </div>
        </div>

        <div className="bg-[#0a0a0a] p-4 rounded-2xl border border-neutral-800 shadow-sm">
          <p className="text-xs font-semibold text-neutral-400 uppercase tracking-wide mb-1">Advance Collected</p>
          <p className="text-2xl font-bold text-sky-400">₹{metrics.totalAdvance.toLocaleString()}</p>
          <p className="text-xs text-neutral-400 mt-2">Secured in Bank / Cash</p>
        </div>

        <div className="bg-[#0a0a0a] p-4 rounded-2xl border border-neutral-800 shadow-sm">
          <p className="text-xs font-semibold text-neutral-400 uppercase tracking-wide mb-1">Balance Due</p>
          <p className="text-2xl font-bold text-white">₹{metrics.totalBalance.toLocaleString()}</p>
          <p className="text-xs text-neutral-400 mt-2">Due at Handover</p>
        </div>

        <div className="bg-[#0a0a0a] p-4 rounded-2xl border border-neutral-800 shadow-sm">
          <p className="text-xs font-semibold text-neutral-400 uppercase tracking-wide mb-1">Next Departure</p>
          {metrics.nextRide ? (
            <div>
              <p className="text-base font-bold text-orange-400 truncate">
                {BIKES.find(b => b.id === metrics.nextRide.bike_id)?.name || 'Bike'}
              </p>
              <p className="text-xs font-medium text-neutral-300 mt-0.5">
                {metrics.nextRide.pickup_date} @ {metrics.nextRide.pickup_time}
              </p>
            </div>
          ) : (
            <div>
              <p className="text-base font-bold text-neutral-400">None Pending</p>
              <p className="text-xs text-neutral-500 mt-1">All slots free</p>
            </div>
          )}
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-[#0a0a0a] p-5 rounded-2xl border border-neutral-800 space-y-4 shadow-sm">
        <div className="flex flex-col lg:flex-row justify-between items-stretch lg:items-center gap-4">
          {/* Quick Filter Tabs */}
          <div className="flex flex-wrap gap-2">
            {[
              { id: 'all', label: `All Upcoming (${metrics.totalCount})` },
              { id: 'today', label: `Today (${metrics.todayDepartures})` },
              { id: 'tomorrow', label: `Tomorrow (${metrics.tomorrowDepartures})` },
              { id: 'week', label: 'Next 7 Days' },
              { id: 'confirmed', label: 'Payment Confirmed' },
              { id: 'pending', label: 'Payment Pending' }
            ].map(tab => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveFilter(tab.id as UpcomingFilter)}
                className={`px-3.5 py-2 rounded-xl text-xs font-semibold tracking-wide transition-all cursor-pointer border ${
                  activeFilter === tab.id
                    ? 'bg-orange-600 text-white border-orange-600 shadow-sm'
                    : 'bg-[#0f141f] text-slate-300 border-slate-800 hover:border-slate-700 hover:text-white'
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
              className="w-full sm:w-auto bg-[#0f141f] border border-slate-700 rounded-xl px-3.5 py-2 text-xs font-semibold text-slate-200 outline-none focus:border-orange-500 cursor-pointer"
            >
              <option value="all">All Fleet Machines</option>
              {BIKES.map(bike => (
                <option key={bike.id} value={bike.id.toString()}>{bike.name}</option>
              ))}
            </select>

            {/* Search Input */}
            <div className="relative w-full sm:w-60">
              <input
                type="text"
                placeholder="Search rider, phone, ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-[#0f141f] border border-slate-700 rounded-xl pl-8 pr-3 py-2 text-xs text-slate-200 placeholder:text-slate-500 outline-none focus:border-orange-500 transition-all"
              />
              <svg className="w-4 h-4 text-slate-500 absolute left-2.5 top-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
            const isPending = booking.status === 'pending_payment';
            const isExpanded = expandedBookingId === booking.id;

            return (
              <div
                key={booking.id}
                className="bg-[#0a0a0a] border border-neutral-800 rounded-2xl p-4 transition-all shadow-sm space-y-3"
              >
                {/* Main Row: Extremely Main Info Only */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  {/* Machine & Rider */}
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl overflow-hidden border border-neutral-800 shrink-0 bg-black">
                      <img src={bike?.imageUrl} alt={bike?.name} className="w-full h-full object-cover" />
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-orange-400 text-xs font-bold uppercase">{booking.readable_id}</span>
                        <span className="text-xs text-neutral-400 font-normal">·</span>
                        <h3 className="text-sm font-bold text-white">{bike?.name}</h3>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-neutral-300 mt-0.5">
                        <span className="font-semibold text-white">{booking.customer_name}</span>
                        <span className="text-neutral-500">·</span>
                        <a href={`tel:${booking.customer_phone}`} className="text-neutral-400 hover:text-white">
                          {booking.customer_phone}
                        </a>
                      </div>
                    </div>
                  </div>

                  {/* Pickup Slot & Status & Primary Actions */}
                  <div className="flex items-center gap-4 flex-wrap sm:flex-nowrap">
                    <div>
                      <span className="text-[10px] text-neutral-500 uppercase font-semibold block">Pickup</span>
                      <p className="text-xs font-semibold text-white">
                        {booking.pickup_date} <span className="text-orange-400">@ {booking.pickup_time}</span>
                      </p>
                    </div>

                    {/* Advance Status Badge (Sky for Confirmed, Amber for Pending) */}
                    <div>
                      <span className="text-[10px] text-neutral-500 uppercase font-semibold block">Advance</span>
                      <span className={`inline-block text-xs font-semibold px-2 py-0.5 rounded-full ${
                        isConfirmed 
                          ? 'bg-sky-500/15 text-sky-400 border border-sky-500/30' 
                          : 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                      }`}>
                        {isConfirmed ? `₹${advancePaid} Paid ✓` : 'Payment Pending'}
                      </span>
                    </div>

                    {/* Actions: Right next to booking details */}
                    <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                      {isPending ? (
                        <>
                          <a
                            href={getWhatsAppReminderUrl(booking, bike?.name || 'Machine')}
                            target="_blank"
                            rel="noreferrer"
                            className="px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500 hover:text-black border border-emerald-500/30 whitespace-nowrap shadow-sm active:scale-95"
                            title="Send WhatsApp payment reminder with payment ID to reserve slot"
                          >
                            <svg className="w-3.5 h-3.5 fill-current shrink-0" viewBox="0 0 24 24">
                              <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448L.057 24zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.882-4.434 9.885-9.885.002-2.641-1.026-5.124-2.893-6.992-1.867-1.868-4.35-2.896-6.992-2.897-5.451 0-9.885 4.434-9.887 9.884-.001 2.126.602 3.738 1.611 5.421l-.999 3.646 3.883-.769zm10.875-6.193c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
                            </svg>
                            <span>Send Payment reminder</span>
                          </a>

                          <a
                            href={`tel:${booking.customer_phone}`}
                            className="px-2.5 py-1.5 rounded-lg bg-neutral-900 hover:bg-neutral-800 text-neutral-200 hover:text-white border border-neutral-800 text-xs font-semibold transition-all flex items-center gap-1.5 shadow-sm active:scale-95 whitespace-nowrap"
                            title={`Call ${booking.customer_name} (${booking.customer_phone})`}
                          >
                            <svg className="w-3.5 h-3.5 text-sky-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                            </svg>
                            <span>Call</span>
                          </a>

                          <button
                            type="button"
                            onClick={() => setSelectedBooking(booking)}
                            className="px-3.5 py-1.5 rounded-lg bg-sky-500/10 hover:bg-sky-400 hover:text-black text-sky-400 border border-sky-500/30 text-xs font-semibold cursor-pointer transition-all active:scale-95 whitespace-nowrap"
                          >
                            Operate
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            type="button"
                            onClick={() => handleQuickDispatch(booking)}
                            className="px-3.5 py-1.5 rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-semibold text-xs transition-all shadow-sm cursor-pointer"
                          >
                            Dispatch
                          </button>

                          <a
                            href={`tel:${booking.customer_phone}`}
                            className="px-2.5 py-1.5 rounded-lg bg-neutral-900 hover:bg-neutral-800 text-neutral-200 hover:text-white border border-neutral-800 text-xs font-semibold transition-all flex items-center gap-1.5 shadow-sm active:scale-95 whitespace-nowrap"
                            title={`Call ${booking.customer_name} (${booking.customer_phone})`}
                          >
                            <svg className="w-3.5 h-3.5 text-sky-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                            </svg>
                            <span>Call</span>
                          </a>

                          <button
                            type="button"
                            onClick={() => setSelectedBooking(booking)}
                            className="px-3.5 py-1.5 rounded-lg bg-sky-500/10 hover:bg-sky-400 hover:text-black text-sky-400 border border-sky-500/30 text-xs font-semibold cursor-pointer transition-all active:scale-95 whitespace-nowrap"
                          >
                            Operate
                          </button>
                        </>
                      )}

                      <button
                        type="button"
                        onClick={() => setExpandedBookingId(isExpanded ? null : booking.id)}
                        className="px-3 py-1.5 rounded-xl bg-black hover:bg-neutral-900 border border-neutral-800 text-neutral-300 hover:text-white font-medium text-xs transition-all cursor-pointer"
                        title={isExpanded ? 'Hide details' : 'Show details'}
                      >
                        {isExpanded ? 'Less ▲' : 'Details ▼'}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Progressive Disclosure: Details Only When Requested */}
                {isExpanded && (
                  <div className="pt-3 border-t border-neutral-800 grid grid-cols-1 md:grid-cols-2 gap-4 text-xs animate-fade-in">
                    {/* Return & Logistics */}
                    <div className="bg-black p-3 rounded-xl border border-neutral-800 space-y-1">
                      <span className="text-[10px] uppercase font-semibold text-neutral-500 block">Return Schedule & Location</span>
                      <p className="font-semibold text-white">
                        {booking.return_date} @ {booking.return_time}
                      </p>
                      <p className="text-neutral-400 text-[11px] truncate mt-1">
                        {booking.address ? booking.address : 'Garage Self-Pickup & Return'}
                      </p>
                    </div>

                    {/* Financial Terms */}
                    <div className="bg-black p-3 rounded-xl border border-neutral-800 space-y-1">
                      <span className="text-[10px] uppercase font-semibold text-neutral-500 block">Agreed Rent & Balance</span>
                      <div className="flex items-center justify-between">
                        <span className="text-neutral-400">Agreed Rent:</span>
                        <span className="font-bold text-white">₹{finalAgreedRent}</span>
                      </div>
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-sky-400 font-semibold">Advance: ₹{advancePaid}</span>
                        <span className="text-orange-400 font-semibold">Balance Due: ₹{balanceDue}</span>
                      </div>
                      {booking.payment_screenshot_url && (
                        <button
                          type="button"
                          onClick={() => setViewPaymentProofUrl(booking.payment_screenshot_url)}
                          className="text-[11px] text-orange-400 hover:underline block pt-1 cursor-pointer"
                        >
                          View UPI Screenshot →
                        </button>
                      )}
                    </div>
                  </div>
                )}
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
                    <span className="px-3 py-1 rounded-lg text-[8px] font-black uppercase tracking-wider bg-sky-500/20 text-sky-400 border border-sky-500/30">
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

                    <a
                      href={getTermsAndRefundPolicyUrl(selectedBooking, BIKES.find(b => b.id === selectedBooking.bike_id)?.name || 'Machine')}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-2 bg-neutral-900 border border-neutral-700 hover:border-white/30 text-white px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-sm active:scale-95"
                      title="Send Terms, Conditions & Refund Policy to rider on WhatsApp"
                    >
                      <svg className="w-4 h-4 text-brand-yellow" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      <span>Send Terms & Policy</span>
                    </a>

                    <a
                      href={getWhatsAppReminderUrl(selectedBooking, BIKES.find(b => b.id === selectedBooking.bike_id)?.name || 'Machine')}
                      target="_blank"
                      rel="noreferrer"
                      className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-sm active:scale-95 ${
                        selectedBooking.status === 'booking_confirmed'
                          ? 'bg-sky-500/20 border border-sky-500/40 hover:bg-sky-400 hover:text-black text-sky-300'
                          : 'bg-emerald-500/20 border border-emerald-500/40 hover:bg-emerald-500 hover:text-black text-emerald-300'
                      }`}
                      title={selectedBooking.status === 'booking_confirmed' ? 'Send official booking confirmation message on WhatsApp' : 'Send WhatsApp reminder with payment ID'}
                    >
                      <svg className="w-4 h-4 fill-current shrink-0" viewBox="0 0 24 24">
                        <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448L.057 24zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.882-4.434 9.885-9.885.002-2.641-1.026-5.124-2.893-6.992-1.867-1.868-4.35-2.896-6.992-2.897-5.451 0-9.885 4.434-9.887 9.884-.001 2.126.602 3.738 1.611 5.421l-.999 3.646 3.883-.769zm10.875-6.193c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
                      </svg>
                      <span>{selectedBooking.status === 'booking_confirmed' ? 'Send Confirmation' : 'Send Reminder'}</span>
                    </a>

                    <span className="text-[10px] text-white/50 uppercase font-bold">
                      Vehicle: <strong className="text-white">{BIKES.find(b => b.id === selectedBooking.bike_id)?.name}</strong>
                    </span>

                    <button
                      type="button"
                      onClick={() => handleOpenEditModal(selectedBooking)}
                      className="inline-flex items-center gap-1.5 bg-amber-500/20 border border-amber-500/40 hover:bg-amber-400 hover:text-black text-amber-300 px-3 py-1.5 rounded-xl text-xs font-bold transition-all shadow-sm active:scale-95 cursor-pointer"
                      title="Edit booking details (name, dates, vehicle, rent)"
                    >
                      <svg className="w-3.5 h-3.5 fill-none stroke-current" viewBox="0 0 24 24" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                      </svg>
                      <span>Edit Details</span>
                    </button>

                    {selectedBooking.status !== 'cancelled' && (
                      <button
                        type="button"
                        onClick={() => handleOpenCancelModal(selectedBooking)}
                        className="inline-flex items-center gap-1.5 bg-rose-500/10 border border-rose-500/30 hover:bg-rose-500 hover:text-white text-rose-300 px-3 py-1.5 rounded-xl text-xs font-bold transition-all shadow-sm active:scale-95 cursor-pointer"
                        title="Cancel this reservation"
                      >
                        <svg className="w-3.5 h-3.5 fill-none stroke-current" viewBox="0 0 24 24" strokeWidth="2">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                        <span>Cancel Booking</span>
                      </button>
                    )}
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
                className="py-4 px-6 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all bg-sky-400 hover:bg-sky-300 text-black shadow-lg shadow-sky-500/20 cursor-pointer flex items-center justify-center gap-2"
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
                  className="w-full bg-brand-black border border-white/15 rounded-xl p-4 text-white font-heading text-lg outline-none focus:border-sky-400"
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
                    className="px-2.5 py-1 rounded-lg bg-sky-500/10 border border-sky-500/20 text-[8px] font-bold text-sky-400 uppercase cursor-pointer"
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
                  className="px-2.5 py-1 rounded-lg bg-sky-500/10 text-sky-400 border border-sky-500/20 text-[8px] font-bold uppercase cursor-pointer"
                >
                  - ₹100
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentForm(p => ({ ...p, agreedRent: Math.max(100, p.agreedRent - 200) }))}
                  className="px-2.5 py-1 rounded-lg bg-sky-500/10 text-sky-400 border border-sky-500/20 text-[8px] font-bold uppercase cursor-pointer"
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
                  <div className="bg-sky-500/10 border border-sky-500/30 rounded-2xl p-4 flex items-center gap-3 animate-fade-in">
                    <span className="text-2xl shrink-0">🏷️</span>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded bg-sky-400 text-black text-[9px] font-black uppercase">
                          Discount Tag
                        </span>
                        <span className="text-sky-400 font-bold text-sm">
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
                <span className="text-[8px] font-black text-sky-400 uppercase tracking-wider block">Advance Paid</span>
                <span className="text-base font-heading text-sky-400">₹{paymentForm.advancePaid}</span>
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
                className="flex-[2] py-4 bg-sky-400 hover:bg-sky-300 text-black font-black uppercase text-[10px] tracking-widest rounded-xl transition-all shadow-lg shadow-sky-500/20 cursor-pointer"
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

      {/* EDIT BOOKING DETAILS MODAL */}
      {editingBooking && (
        <Modal
          isOpen={!!editingBooking}
          onClose={() => setEditingBooking(null)}
          title={`EDIT RESERVATION: ${editingBooking.readable_id || `#${editingBooking.id}`}`}
          maxWidth="3xl"
        >
          <form onSubmit={handleSaveEditBooking} className="space-y-6 py-2">
            
            {/* Header info bar */}
            <div className="bg-brand-black/60 p-4 rounded-2xl border border-white/10 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
              <div>
                <span className="text-[9px] font-black uppercase text-amber-400 tracking-widest block">
                  Admin Reservation Modification
                </span>
                <p className="text-white text-sm font-bold">
                  Editing: <span className="font-mono text-amber-300">{editingBooking.readable_id || editingBooking.id}</span>
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-white/50 uppercase font-semibold">Status:</span>
                <select
                  value={editForm.status}
                  onChange={(e) => setEditForm(p => ({ ...p, status: e.target.value }))}
                  className="bg-brand-black border border-white/20 rounded-lg px-2.5 py-1 text-xs text-white font-bold outline-none focus:border-amber-400"
                >
                  <option value="pending_payment">Pending Payment</option>
                  <option value="booking_confirmed">Booking Confirmed</option>
                  <option value="ongoing">Ongoing (Dispatched)</option>
                  <option value="completed">Completed (Returned)</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
            </div>

            {/* 1. CUSTOMER IDENTITY */}
            <div className="bg-brand-black/40 p-6 rounded-2xl border border-white/5 space-y-4">
              <h4 className="text-xs font-black uppercase tracking-widest text-brand-teal flex items-center gap-2">
                <span>👤</span> 1. Customer Details
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[9px] font-black uppercase tracking-wider text-white/60">
                    Customer Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={editForm.customer_name}
                    onChange={(e) => setEditForm(p => ({ ...p, customer_name: e.target.value }))}
                    className="w-full bg-brand-black border border-white/15 rounded-xl px-3.5 py-2.5 text-xs text-white font-medium outline-none focus:border-brand-teal"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[9px] font-black uppercase tracking-wider text-white/60">
                    Phone / WhatsApp Number *
                  </label>
                  <input
                    type="tel"
                    required
                    value={editForm.customer_phone}
                    onChange={(e) => setEditForm(p => ({ ...p, customer_phone: e.target.value }))}
                    className="w-full bg-brand-black border border-white/15 rounded-xl px-3.5 py-2.5 text-xs text-white font-medium outline-none focus:border-brand-teal"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[9px] font-black uppercase tracking-wider text-white/60">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={editForm.customer_email}
                    onChange={(e) => setEditForm(p => ({ ...p, customer_email: e.target.value }))}
                    className="w-full bg-brand-black border border-white/15 rounded-xl px-3.5 py-2.5 text-xs text-white font-medium outline-none focus:border-brand-teal"
                  />
                </div>
              </div>
            </div>

            {/* 2. VEHICLE SELECTION */}
            <div className="bg-brand-black/40 p-6 rounded-2xl border border-white/5 space-y-4">
              <div className="flex justify-between items-center">
                <h4 className="text-xs font-black uppercase tracking-widest text-amber-400 flex items-center gap-2">
                  <span>🏍️</span> 2. Assigned Vehicle
                </h4>
                {(() => {
                  const currentBike = fleetBikes.find(b => b.id === editForm.bike_id) || BIKES.find(b => b.id === editForm.bike_id);
                  return (
                    <span className="text-[11px] font-mono font-semibold text-brand-orange">
                      Daily Rate: ₹{currentBike?.dailyRate || 700}/day
                    </span>
                  );
                })()}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
                <div className="space-y-1.5">
                  <label className="text-[9px] font-black uppercase tracking-wider text-white/60">
                    Select Machine
                  </label>
                  <select
                    value={editForm.bike_id}
                    onChange={(e) => {
                      const newBikeId = parseInt(e.target.value);
                      setEditForm(p => ({ ...p, bike_id: newBikeId }));
                    }}
                    className="w-full bg-brand-black border border-white/15 rounded-xl px-3.5 py-2.5 text-xs text-white font-medium outline-none focus:border-amber-400"
                  >
                    {fleetBikes.map(b => (
                      <option key={b.id} value={b.id}>
                        {b.name} ({b.category}) — ₹{b.dailyRate}/day {b.rc_number ? `[${b.rc_number}]` : ''}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Bike preview */}
                {(() => {
                  const b = fleetBikes.find(x => x.id === editForm.bike_id) || BIKES.find(x => x.id === editForm.bike_id);
                  if (!b) return null;
                  return (
                    <div className="bg-brand-black/80 border border-white/10 rounded-xl p-2.5 flex items-center gap-3">
                      <img src={b.imageUrl} alt={b.name} className="w-12 h-12 rounded-lg object-cover bg-neutral-900 border border-white/10 shrink-0" />
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-white truncate">{b.name}</p>
                        <p className="text-[10px] text-white/50">{b.category} • {b.rc_number || 'RC on file'}</p>
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>

            {/* 3. DATES & TIMINGS */}
            <div className="bg-brand-black/40 p-6 rounded-2xl border border-white/5 space-y-4">
              <div className="flex justify-between items-center">
                <h4 className="text-xs font-black uppercase tracking-widest text-sky-400 flex items-center gap-2">
                  <span>📅</span> 3. Rental Schedule
                </h4>
                <span className="text-[11px] font-bold text-sky-300">
                  Duration: {getDurationText(editForm.pickup_date, editForm.pickup_time, editForm.return_date, editForm.return_time)}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Pickup */}
                <div className="bg-brand-black/50 p-4 rounded-xl border border-white/5 space-y-3">
                  <span className="text-[9px] font-black uppercase text-sky-400 tracking-wider block">Pickup</span>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[8px] font-black uppercase text-white/40 block mb-1">Date</label>
                      <input
                        type="date"
                        required
                        value={editForm.pickup_date}
                        onChange={(e) => setEditForm(p => ({ ...p, pickup_date: e.target.value }))}
                        className="w-full bg-brand-black border border-white/15 rounded-lg p-2 text-xs text-white outline-none focus:border-sky-400"
                      />
                    </div>
                    <div>
                      <label className="text-[8px] font-black uppercase text-white/40 block mb-1">Time</label>
                      <input
                        type="time"
                        required
                        value={editForm.pickup_time}
                        onChange={(e) => setEditForm(p => ({ ...p, pickup_time: e.target.value }))}
                        className="w-full bg-brand-black border border-white/15 rounded-lg p-2 text-xs text-white outline-none focus:border-sky-400"
                      />
                    </div>
                  </div>
                </div>

                {/* Return */}
                <div className="bg-brand-black/50 p-4 rounded-xl border border-white/5 space-y-3">
                  <span className="text-[9px] font-black uppercase text-brand-yellow tracking-wider block">Return</span>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[8px] font-black uppercase text-white/40 block mb-1">Date</label>
                      <input
                        type="date"
                        required
                        value={editForm.return_date}
                        onChange={(e) => setEditForm(p => ({ ...p, return_date: e.target.value }))}
                        className="w-full bg-brand-black border border-white/15 rounded-lg p-2 text-xs text-white outline-none focus:border-brand-yellow"
                      />
                    </div>
                    <div>
                      <label className="text-[8px] font-black uppercase text-white/40 block mb-1">Time</label>
                      <input
                        type="time"
                        required
                        value={editForm.return_time}
                        onChange={(e) => setEditForm(p => ({ ...p, return_time: e.target.value }))}
                        className="w-full bg-brand-black border border-white/15 rounded-lg p-2 text-xs text-white outline-none focus:border-brand-yellow"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* 4. FINANCIALS */}
            <div className="bg-brand-black/40 p-6 rounded-2xl border border-white/5 space-y-4">
              <div className="flex justify-between items-center">
                <h4 className="text-xs font-black uppercase tracking-widest text-emerald-400 flex items-center gap-2">
                  <span>💰</span> 4. Financial Terms
                </h4>
                <button
                  type="button"
                  onClick={handleRecalculateEditRent}
                  className="px-3 py-1 bg-white/5 hover:bg-white/10 text-white/70 hover:text-white border border-white/10 rounded-lg text-[9px] font-bold uppercase transition-all cursor-pointer"
                >
                  Auto-Calculate Standard Tariff ⟳
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[9px] font-black uppercase tracking-wider text-white/60">
                    Total Rent (₹) *
                  </label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={editForm.total_rent}
                    onChange={(e) => setEditForm(p => ({ ...p, total_rent: parseFloat(e.target.value) || 0 }))}
                    className="w-full bg-brand-black border border-white/15 rounded-xl px-3.5 py-2.5 text-sm font-heading text-white outline-none focus:border-emerald-400"
                  />
                  <span className="text-[8px] text-white/40 block">Standard: ₹{calculateStandardRent(editForm.bike_id, editForm.pickup_date, editForm.pickup_time, editForm.return_date, editForm.return_time)}</span>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[9px] font-black uppercase tracking-wider text-white/60">
                    Advance Amount (₹)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={editForm.advance_amount}
                    onChange={(e) => setEditForm(p => ({ ...p, advance_amount: parseFloat(e.target.value) || 0 }))}
                    className="w-full bg-brand-black border border-white/15 rounded-xl px-3.5 py-2.5 text-sm font-heading text-white outline-none focus:border-emerald-400"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[9px] font-black uppercase tracking-wider text-white/60">
                    Security Deposit (₹)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={editForm.security_deposit}
                    onChange={(e) => setEditForm(p => ({ ...p, security_deposit: parseFloat(e.target.value) || 0 }))}
                    className="w-full bg-brand-black border border-white/15 rounded-xl px-3.5 py-2.5 text-sm font-heading text-white outline-none focus:border-emerald-400"
                  />
                </div>
              </div>
            </div>

            {/* 5. LOGISTICS */}
            <div className="bg-brand-black/40 p-6 rounded-2xl border border-white/5 space-y-4">
              <h4 className="text-xs font-black uppercase tracking-widest text-neutral-300 flex items-center gap-2">
                <span>📍</span> 5. Logistics & Delivery Address
              </h4>
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="edit_upcoming_delivery"
                    checked={editForm.needs_delivery}
                    onChange={(e) => setEditForm(p => ({ ...p, needs_delivery: e.target.checked }))}
                    className="rounded border-white/20 text-brand-orange focus:ring-0 w-4 h-4"
                  />
                  <label htmlFor="edit_upcoming_delivery" className="text-xs text-white font-medium cursor-pointer">
                    Home Delivery / Return Pickup Required
                  </label>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[9px] font-black uppercase tracking-wider text-white/60">
                    Delivery Address / Location Notes
                  </label>
                  <input
                    type="text"
                    placeholder="Enter delivery/pickup address (or leave blank for garage handover)"
                    value={editForm.address}
                    onChange={(e) => setEditForm(p => ({ ...p, address: e.target.value }))}
                    className="w-full bg-brand-black border border-white/15 rounded-xl px-3.5 py-2.5 text-xs text-white outline-none focus:border-white/40"
                  />
                </div>
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setEditingBooking(null)}
                className="flex-1 py-3.5 bg-white/5 hover:bg-white/10 text-white/70 font-black text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={savingEdit}
                className="flex-1 py-3.5 bg-amber-400 hover:bg-amber-300 text-black font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-lg shadow-amber-400/20 cursor-pointer disabled:opacity-50"
              >
                {savingEdit ? 'Saving Changes...' : 'Save Updated Reservation'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};
