
import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabase';
import { useToast } from '../../App';
import { GOOGLE_MAPS_REVIEW_LINK } from '../../constants';
import { getFleetBikes } from '../../fleetStorage';
import { Modal } from '../Modal';

interface AdminBookingsProps {
  initialFilter?: string;
}

type TimeRange = 'all_time' | 'today' | 'yesterday' | 'this_week' | 'this_month' | 'custom';

export const AdminBookings: React.FC<AdminBookingsProps> = ({ initialFilter = 'all' }) => {
  const { showToast } = useToast();
  const [fleetBikes, setFleetBikes] = useState<any[]>(() => getFleetBikes());
  const BIKES = fleetBikes;
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBooking, setSelectedBooking] = useState<any | null>(null);
  
  // Filtering States
  const [statusFilter, setStatusFilter] = useState(initialFilter);
  const [timeRange, setTimeRange] = useState<TimeRange>('all_time');
  const [customRange, setCustomRange] = useState({
    start: new Date().toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0]
  });
  
  const [adjustment, setAdjustment] = useState({ amount: 0, reason: '', type: 'discount' });
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [showManualModal, setShowManualModal] = useState(false);

  // Payment confirmation & Rent terms modal state
  const [showConfirmPaymentModal, setShowConfirmPaymentModal] = useState(false);
  const [paymentForm, setPaymentForm] = useState({
    advancePaid: 500,
    agreedRent: 0,
    depositAmount: 1000,
    paymentMethod: 'upi',
    note: ''
  });

  // Cancellation modal state
  const [cancelModalBooking, setCancelModalBooking] = useState<any | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelRefundNote, setCancelRefundNote] = useState('');

  // Identity documents update modal for ongoing/confirmed bookings
  const [docModalOpen, setDocModalOpen] = useState(false);
  const [docForm, setDocForm] = useState({
    aadhaar_number: '',
    dl_number: '',
    aadhaar_file: null as File | null,
    dl_file: null as File | null,
    saving: false
  });

  const [manualBooking, setManualBooking] = useState({
    bike_id: BIKES[0]?.id || 15,
    customer_name: '',
    customer_phone: '',
    customer_email: '',
    pickup_date: new Date().toISOString().split('T')[0],
    pickup_time: '10:00',
    return_date: new Date().toISOString().split('T')[0],
    return_time: '20:00',
    standard_rent: 700,
    agreed_rent: 700,
    deposit_amount: 1000, // Deposit Received Amount
    advance_amount: 500,  // Advance / Rent Received Amount
    payment_method: 'upi' as 'upi' | 'cash' | 'card' | 'bank_transfer',
    payment_note: '',
    ride_status: 'verifying_payment' as 'verifying_payment' | 'booking_confirmed' | 'ongoing',
    is_outstation: false,
    start_odometer: 0,
    admin_notes: '',
    aadhaar_number: '',
    dl_number: '',
    aadhaar_image: null as File | null,
    dl_image: null as File | null,
    handover_image: null as File | null,
    pickup_method: 'garage' as 'garage' | 'home',
    drop_method: 'garage' as 'garage' | 'home',
    delivery_address: '',
    return_pickup_address: '',
    same_address_for_drop: true
  });
  const [extension, setExtension] = useState({ days: 1, amount: 0 });

  useEffect(() => {
    fetchBookings();
    const handleUpdate = () => setFleetBikes(getFleetBikes());
    window.addEventListener('rydeit_fleet_updated', handleUpdate);
    return () => window.removeEventListener('rydeit_fleet_updated', handleUpdate);
  }, [statusFilter, timeRange, customRange]);

  const fetchBookings = async () => {
    setLoading(true);
    let query = supabase.from('bookings').select('*').order('created_at', { ascending: false });
    
    // 1. Status Filter
    if (statusFilter === 'pending') query = query.eq('status', 'verifying_payment');
    if (statusFilter === 'confirmed') query = query.eq('status', 'booking_confirmed');
    if (statusFilter === 'running') query = query.eq('status', 'ongoing');
    if (statusFilter === 'completed') query = query.eq('status', 'completed');
    if (statusFilter === 'cancelled') query = query.eq('status', 'cancelled');

    // 2. Time Filter
    const now = new Date();
    let startDate: Date | null = null;
    let endDate: Date | null = null;

    if (timeRange === 'today') {
      startDate = new Date(now.setHours(0, 0, 0, 0));
    } else if (timeRange === 'yesterday') {
      startDate = new Date(now.setDate(now.getDate() - 1));
      startDate.setHours(0, 0, 0, 0);
      endDate = new Date(startDate);
      endDate.setHours(23, 59, 59, 999);
    } else if (timeRange === 'this_week') {
      const day = now.getDay();
      startDate = new Date(now.setDate(now.getDate() - day));
      startDate.setHours(0, 0, 0, 0);
    } else if (timeRange === 'this_month') {
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    } else if (timeRange === 'custom') {
      startDate = new Date(customRange.start);
      startDate.setHours(0, 0, 0, 0);
      endDate = new Date(customRange.end);
      endDate.setHours(23, 59, 59, 999);
    }

    if (startDate) query = query.gte('created_at', startDate.toISOString());
    if (endDate) query = query.lte('created_at', endDate.toISOString());

    const { data, error } = await query;
    
    if (error) {
      showToast(error.message, 'error');
    } else if (data) {
      if (statusFilter === 'overdue') {
        const currentNow = new Date();
        const overdue = data.filter(b => {
          if (b.status !== 'ongoing') return false;
          const returnDate = new Date(`${b.return_date}T${b.return_time}`);
          return returnDate < currentNow;
        });
        setBookings(overdue);
      } else {
        setBookings(data);
      }
    }
    setLoading(false);
  };

  const updateStatus = async (id: string, status: string, reason?: string) => {
    const updates: any = { status };
    if (reason) updates.admin_notes = reason;

    const { error } = await supabase.from('bookings').update(updates).eq('id', id);
    if (error) showToast(error.message, 'error');
    else {
      showToast(`Status updated: ${status}`, 'success');
      
      // If completed, send WhatsApp message with review link
      if (status === 'completed' && selectedBooking) {
        const message = `Hi ${selectedBooking.customer_name}, thank you for riding with Rydeit! We hope you had a great experience. We'd love to hear your feedback. Please leave us a review on Google Maps: ${GOOGLE_MAPS_REVIEW_LINK}`;
        const whatsappUrl = `https://wa.me/${selectedBooking.customer_phone.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`;
        window.open(whatsappUrl, '_blank');
      }

      fetchBookings();
      if (selectedBooking?.id === id) {
          const { data } = await supabase.from('bookings').select('*').eq('id', id).single();
          setSelectedBooking(data);
      }
    }
  };

  // Helper to calculate standard tariff based on machine and dates
  const calculateStandardRent = (bikeId: number, pickDate: string, pickTime: string, retDate: string, retTime: string) => {
    const bike = BIKES.find(b => b.id === bikeId);
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

  const handleManualBikeOrDateChange = (updates: Partial<typeof manualBooking>) => {
    setManualBooking(prev => {
      const next = { ...prev, ...updates };
      const newStandard = calculateStandardRent(next.bike_id, next.pickup_date, next.pickup_time, next.return_date, next.return_time);
      const wasUsingStandard = prev.agreed_rent === prev.standard_rent || prev.agreed_rent === 0;
      
      const bike = BIKES.find(b => b.id === next.bike_id);
      const bikeOdo = bike?.odometer_reading || 0;

      return {
        ...next,
        standard_rent: newStandard,
        agreed_rent: wasUsingStandard ? newStandard : next.agreed_rent,
        start_odometer: next.start_odometer === 0 ? bikeOdo : next.start_odometer
      };
    });
  };

  const handleOpenManualModal = () => {
    const defaultBike = BIKES[0] || { id: 15, dailyRate: 700, odometer_reading: 10000 };
    const today = new Date().toISOString().split('T')[0];
    const stdRent = defaultBike.dailyRate || 700;
    setManualBooking({
      bike_id: defaultBike.id,
      customer_name: '',
      customer_phone: '',
      customer_email: '',
      pickup_date: today,
      pickup_time: '10:00',
      return_date: today,
      return_time: '20:00',
      standard_rent: stdRent,
      agreed_rent: stdRent,
      deposit_amount: 1000,
      advance_amount: 500,
      payment_method: 'upi',
      payment_note: '',
      ride_status: 'verifying_payment',
      is_outstation: false,
      start_odometer: defaultBike.odometer_reading || 0,
      admin_notes: '',
      aadhaar_number: '',
      dl_number: '',
      aadhaar_image: null,
      dl_image: null,
      handover_image: null,
      pickup_method: 'garage',
      drop_method: 'garage',
      delivery_address: '',
      return_pickup_address: '',
      same_address_for_drop: true
    });
    setShowManualModal(true);
  };

  const handleManualBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualBooking.customer_name.trim()) {
      showToast('Customer name is required', 'warning');
      return;
    }
    if (!manualBooking.customer_phone.trim()) {
      showToast('Customer phone is required', 'warning');
      return;
    }

    setLoading(true);
    const readableId = `RD-M${Math.floor(100000 + Math.random() * 900000)}`;

    const reqStart = new Date(`${manualBooking.pickup_date}T${manualBooking.pickup_time}`).getTime();
    const reqEnd = new Date(`${manualBooking.return_date}T${manualBooking.return_time}`).getTime();

    // Verify slot collision with advance-paid bookings
    const { data: conflicts } = await supabase
      .from('bookings')
      .select('id, readable_id, pickup_date, pickup_time, return_date, return_time')
      .eq('bike_id', manualBooking.bike_id)
      .in('status', ['booking_confirmed', 'verifying_payment', 'ongoing']);

    const conflict = conflicts?.find(b => {
      const bStart = new Date(`${b.pickup_date}T${b.pickup_time || '10:00'}`).getTime();
      const bEnd = new Date(`${b.return_date}T${b.return_time || '20:00'}`).getTime();
      return reqStart < bEnd && reqEnd > bStart;
    });

    if (conflict) {
      showToast(`Conflict: Bike already has an active reservation (${conflict.readable_id}: ${conflict.pickup_date} ${conflict.pickup_time} - ${conflict.return_date})`, 'error');
      setLoading(false);
      return;
    }
    
    try {
      let aadhaar_url = '';
      let dl_url = '';
      let customer_photo_url = '';

      // Upload Aadhaar if present (optional)
      if (manualBooking.aadhaar_image) {
        try {
          const fileExt = manualBooking.aadhaar_image.name.split('.').pop();
          const fileName = `aadhaar_${readableId}_${Date.now()}.${fileExt}`;
          const filePath = `manual-docs/${fileName}`;
          const { error: uploadError } = await supabase.storage.from('booking-docs').upload(filePath, manualBooking.aadhaar_image);
          if (!uploadError) {
            const { data: { publicUrl } } = supabase.storage.from('booking-docs').getPublicUrl(filePath);
            aadhaar_url = publicUrl;
          }
        } catch (uploadErr) {
          console.warn('Aadhaar upload skipped/failed:', uploadErr);
        }
      }

      // Upload DL if present (optional)
      if (manualBooking.dl_image) {
        try {
          const fileExt = manualBooking.dl_image.name.split('.').pop();
          const fileName = `dl_${readableId}_${Date.now()}.${fileExt}`;
          const filePath = `manual-docs/${fileName}`;
          const { error: uploadError } = await supabase.storage.from('booking-docs').upload(filePath, manualBooking.dl_image);
          if (!uploadError) {
            const { data: { publicUrl } } = supabase.storage.from('booking-docs').getPublicUrl(filePath);
            dl_url = publicUrl;
          }
        } catch (uploadErr) {
          console.warn('DL upload skipped/failed:', uploadErr);
        }
      }

      // Upload Handover Photo if present (optional)
      if (manualBooking.handover_image) {
        try {
          const fileExt = manualBooking.handover_image.name.split('.').pop();
          const fileName = `handover_${readableId}_${Date.now()}.${fileExt}`;
          const filePath = `handover-photos/${fileName}`;
          const { error: uploadError } = await supabase.storage.from('booking-docs').upload(filePath, manualBooking.handover_image);
          if (!uploadError) {
            const { data: { publicUrl } } = supabase.storage.from('booking-docs').getPublicUrl(filePath);
            customer_photo_url = publicUrl;
          }
        } catch (uploadErr) {
          console.warn('Handover photo upload skipped/failed:', uploadErr);
        }
      }

      let combinedAddress = '';
      if (manualBooking.pickup_method === 'home' && manualBooking.drop_method === 'home') {
        if (manualBooking.same_address_for_drop || manualBooking.delivery_address.trim() === manualBooking.return_pickup_address.trim()) {
          combinedAddress = `Delivery & Return: ${manualBooking.delivery_address.trim()}`;
        } else {
          combinedAddress = `Delivery: ${manualBooking.delivery_address.trim()} | Return Pickup: ${manualBooking.return_pickup_address.trim()}`;
        }
      } else if (manualBooking.pickup_method === 'home') {
        combinedAddress = `Delivery: ${manualBooking.delivery_address.trim()}`;
      } else if (manualBooking.drop_method === 'home') {
        combinedAddress = `Return Pickup: ${manualBooking.return_pickup_address.trim()}`;
      }

      const diff = Number(manualBooking.agreed_rent) - Number(manualBooking.standard_rent);
      let adjustmentAmount = 0;
      let adjustmentReason = '';

      if (diff < 0) {
        adjustmentAmount = diff;
        adjustmentReason = `Negotiated discount: agreed rent ₹${manualBooking.agreed_rent} (₹${Math.abs(diff)} discount on standard ₹${manualBooking.standard_rent})`;
      } else if (diff > 0) {
        adjustmentAmount = diff;
        adjustmentReason = `Premium charge: agreed rent ₹${manualBooking.agreed_rent} (₹${diff} premium over standard ₹${manualBooking.standard_rent})`;
      }

      const combinedNotes = [
        manualBooking.admin_notes.trim(),
        manualBooking.payment_note ? `Payment: ${manualBooking.payment_note.trim()}` : ''
      ].filter(Boolean).join(' | ');

      const bookingPayload: any = {
        bike_id: manualBooking.bike_id,
        customer_name: manualBooking.customer_name.trim(),
        customer_phone: manualBooking.customer_phone.trim(),
        customer_email: manualBooking.customer_email.trim() || null,
        pickup_date: manualBooking.pickup_date,
        pickup_time: manualBooking.pickup_time,
        return_date: manualBooking.return_date,
        return_time: manualBooking.return_time,
        total_rent: Number(manualBooking.standard_rent),
        adjustment_amount: adjustmentAmount,
        adjustment_reason: adjustmentReason || null,
        security_deposit: Number(manualBooking.deposit_amount) || 0,
        advance_amount: Number(manualBooking.advance_amount) || 0,
        payment_method: manualBooking.payment_method,
        status: manualBooking.ride_status || 'verifying_payment',
        readable_id: readableId,
        is_outstation: manualBooking.is_outstation || false,
        needs_delivery: manualBooking.pickup_method === 'home',
        needs_return_pickup: manualBooking.drop_method === 'home',
        address: combinedAddress || null,
        aadhaar_number: manualBooking.aadhaar_number.trim() || null,
        dl_number: manualBooking.dl_number.trim() || null,
        aadhaar_url: aadhaar_url || null,
        dl_url: dl_url || null,
        customer_photo_url: customer_photo_url || null,
        start_odometer: Number(manualBooking.start_odometer) || null,
        admin_notes: combinedNotes || 'Manual walk-in / direct booking'
      };

      const { error } = await supabase.from('bookings').insert(bookingPayload);
      if (error) throw error;

      showToast(`Manual ride request ${readableId} submitted! It is now in the ledger ready for operation.`, 'success');
      setShowManualModal(false);
      fetchBookings();
    } catch (error: any) {
      showToast(error.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDocModal = () => {
    if (!selectedBooking) return;
    setDocForm({
      aadhaar_number: selectedBooking.aadhaar_number || '',
      dl_number: selectedBooking.dl_number || '',
      aadhaar_file: null,
      dl_file: null,
      saving: false
    });
    setDocModalOpen(true);
  };

  const handleSaveDocumentsForSelectedBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBooking) return;
    setDocForm(p => ({ ...p, saving: true }));

    try {
      let aadhaar_url = selectedBooking.aadhaar_url;
      let dl_url = selectedBooking.dl_url;

      if (docForm.aadhaar_file) {
        const fileExt = docForm.aadhaar_file.name.split('.').pop();
        const fileName = `aadhaar_${selectedBooking.readable_id}_${Date.now()}.${fileExt}`;
        const filePath = `manual-docs/${fileName}`;
        const { error: uploadError } = await supabase.storage.from('booking-docs').upload(filePath, docForm.aadhaar_file);
        if (!uploadError) {
          const { data: { publicUrl } } = supabase.storage.from('booking-docs').getPublicUrl(filePath);
          aadhaar_url = publicUrl;
        }
      }

      if (docForm.dl_file) {
        const fileExt = docForm.dl_file.name.split('.').pop();
        const fileName = `dl_${selectedBooking.readable_id}_${Date.now()}.${fileExt}`;
        const filePath = `manual-docs/${fileName}`;
        const { error: uploadError } = await supabase.storage.from('booking-docs').upload(filePath, docForm.dl_file);
        if (!uploadError) {
          const { data: { publicUrl } } = supabase.storage.from('booking-docs').getPublicUrl(filePath);
          dl_url = publicUrl;
        }
      }

      const updates: any = {};
      if (docForm.aadhaar_number.trim()) updates.aadhaar_number = docForm.aadhaar_number.trim();
      if (docForm.dl_number.trim()) updates.dl_number = docForm.dl_number.trim();
      if (aadhaar_url) updates.aadhaar_url = aadhaar_url;
      if (dl_url) updates.dl_url = dl_url;

      const { error } = await supabase.from('bookings').update(updates).eq('id', selectedBooking.id);
      if (error) throw error;

      showToast('Identity documents updated successfully!', 'success');
      setDocModalOpen(false);
      fetchBookings();
      const { data } = await supabase.from('bookings').select('*').eq('id', selectedBooking.id).single();
      setSelectedBooking(data);
    } catch (err: any) {
      showToast(err.message || 'Failed to update documents', 'error');
    } finally {
      setDocForm(p => ({ ...p, saving: false }));
    }
  };

  const handleExtendRide = async () => {
    if (!selectedBooking) return;
    
    const currentReturn = new Date(`${selectedBooking.return_date}T${selectedBooking.return_time}`);
    const newReturn = new Date(currentReturn.getTime() + (extension.days * 24 * 60 * 60 * 1000));
    
    const { error } = await supabase.from('bookings').update({
      return_date: newReturn.toISOString().split('T')[0],
      total_rent: selectedBooking.total_rent + extension.amount,
      admin_notes: `${selectedBooking.admin_notes || ''}\nExtended by ${extension.days} days for ₹${extension.amount} on ${new Date().toLocaleString()}`
    }).eq('id', selectedBooking.id);

    if (error) showToast(error.message, 'error');
    else {
      showToast('Ride extended successfully!', 'success');
      fetchBookings();
      const { data } = await supabase.from('bookings').select('*').eq('id', selectedBooking.id).single();
      setSelectedBooking(data);
      setExtension({ days: 1, amount: 0 });
    }
  };

  const handleAdjustment = async () => {
    if (!selectedBooking || !adjustment.reason) {
        showToast("Reason is required for adjustment", "warning");
        return;
    }
    const currentAdjust = selectedBooking.adjustment_amount || 0;
    const isPositive = ['fee', 'damage', 'revenue', 'premium'].includes(adjustment.type);
    const finalAdjust = isPositive 
      ? currentAdjust + Math.abs(adjustment.amount) 
      : currentAdjust - Math.abs(adjustment.amount);
    
    const { error } = await supabase.from('bookings').update({ 
      adjustment_amount: finalAdjust,
      adjustment_reason: adjustment.reason 
    }).eq('id', selectedBooking.id);

    if (error) showToast(error.message, 'error');
    else {
      showToast('Adjustment applied.', 'success');
      fetchBookings();
      const { data } = await supabase.from('bookings').select('*').eq('id', selectedBooking.id).single();
      setSelectedBooking(data);
      setAdjustment({ amount: 0, reason: '', type: 'discount' });
    }
  };

  const handleResetAdjustment = async () => {
    if (!selectedBooking) return;
    try {
      const { error } = await supabase.from('bookings').update({
        adjustment_amount: 0,
        adjustment_reason: null
      }).eq('id', selectedBooking.id);

      if (error) throw error;
      showToast('Custom adjustment reset to 0.', 'success');
      fetchBookings();
      const { data } = await supabase.from('bookings').select('*').eq('id', selectedBooking.id).single();
      setSelectedBooking(data);
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  const handleOpenConfirmPaymentModal = (booking: any) => {
    setSelectedBooking(booking);
    const baseRent = Number(booking.total_rent) || 0;
    const currentAdj = Number(booking.adjustment_amount) || 0;
    const currentNet = baseRent + currentAdj;

    setPaymentForm({
      advancePaid: booking.advance_amount !== undefined && booking.advance_amount !== null ? Number(booking.advance_amount) : 500,
      agreedRent: currentNet > 0 ? currentNet : baseRent,
      depositAmount: booking.security_deposit !== undefined && booking.security_deposit !== null ? Number(booking.security_deposit) : 1000,
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
    const depositAmount = Number(paymentForm.depositAmount) || 0;

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
        security_deposit: depositAmount,
        payment_method: paymentForm.paymentMethod,
        adjustment_amount: adjustmentAmount,
        adjustment_reason: adjustmentReason
      };

      const { error } = await supabase.from('bookings').update(updates).eq('id', selectedBooking.id);
      if (error) throw error;

      const tagText = diff < 0 ? ` (Discount: ₹${Math.abs(diff)})` : diff > 0 ? ` (Premium: ₹${diff})` : '';
      showToast(`Payment confirmed! Advance: ₹${advancePaid}, Agreed Rent: ₹${agreedRent}, Deposit: ₹${depositAmount}${tagText}`, 'success');

      setShowConfirmPaymentModal(false);
      fetchBookings();

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
      
      showToast('Handover photo successfully logged.', 'success');
      const { data } = await supabase.from('bookings').select('*').eq('id', selectedBooking.id).single();
      setSelectedBooking(data);
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setUploadingPhoto(false);
    }
  };

  return (
    <div className="animate-fade-in space-y-8 max-w-7xl mx-auto">
      {/* Header & Main Filters */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-6">
        <div>
          <h2 className="text-4xl font-heading text-white uppercase tracking-tighter">Ride Ledger</h2>
          <p className="text-brand-teal text-[9px] font-black uppercase tracking-[0.4em] mt-2">Operational Log</p>
        </div>

        <div className="flex gap-4">
          <button 
            onClick={handleOpenManualModal}
            className="px-6 py-3 bg-brand-teal text-brand-black rounded-xl text-[10px] font-black uppercase tracking-widest hover:scale-105 transition-all shadow-lg shadow-brand-teal/20 cursor-pointer"
          >
            + Submit Manual Request
          </button>
          
          <div className="flex flex-wrap gap-2 p-1 bg-brand-gray-dark border border-white/5 rounded-2xl">
            {['all', 'pending', 'confirmed', 'running', 'overdue', 'completed', 'cancelled'].map(f => (
            <button 
                key={f} 
                onClick={() => setStatusFilter(f)} 
                className={`px-5 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all cursor-pointer ${
                  statusFilter === f 
                    ? (f === 'overdue' || f === 'cancelled' ? 'bg-red-500 text-white' : f === 'confirmed' ? 'bg-green-600 text-white shadow-lg shadow-green-600/20' : 'bg-brand-orange text-white') 
                    : 'text-white/40 hover:text-white'
                }`}
            >
              {f === 'confirmed' ? 'Paid / Confirmed' : f}
            </button>
          ))}
        </div>
      </div>
    </div>

      {/* Time Based Filters */}
      <div className="flex flex-col md:flex-row gap-6 items-center bg-brand-gray-dark/40 p-6 rounded-[2.5rem] border border-white/5 shadow-xl">
        <div className="flex flex-wrap gap-2 flex-grow">
          {[
            { id: 'all_time', label: 'All Time' },
            { id: 'today', label: 'Today' },
            { id: 'yesterday', label: 'Yesterday' },
            { id: 'this_week', label: 'This Week' },
            { id: 'this_month', label: 'This Month' },
            { id: 'custom', label: 'Custom' }
          ].map(range => (
            <button 
              key={range.id}
              onClick={() => setTimeRange(range.id as TimeRange)}
              className={`px-6 py-3 rounded-xl text-[9px] font-black uppercase tracking-[0.2em] transition-all border ${
                timeRange === range.id 
                ? 'bg-brand-teal text-brand-black border-brand-teal' 
                : 'bg-brand-black/40 text-white/40 border-white/5 hover:border-white/20'
              }`}
            >
              {range.label}
            </button>
          ))}
        </div>

        {timeRange === 'custom' && (
          <div className="flex items-center gap-4 animate-fade-in bg-brand-black/60 p-3 rounded-2xl border border-white/5">
            <div className="flex flex-col px-3">
              <span className="text-[7px] font-black text-white/20 uppercase tracking-widest">From</span>
              <input 
                type="date" 
                value={customRange.start} 
                onChange={(e) => setCustomRange(p => ({...p, start: e.target.value}))}
                className="bg-transparent text-[10px] font-bold text-white outline-none cursor-pointer" 
              />
            </div>
            <div className="w-px h-6 bg-white/10"></div>
            <div className="flex flex-col px-3">
              <span className="text-[7px] font-black text-white/20 uppercase tracking-widest">To</span>
              <input 
                type="date" 
                value={customRange.end} 
                onChange={(e) => setCustomRange(p => ({...p, end: e.target.value}))}
                className="bg-transparent text-[10px] font-bold text-white outline-none cursor-pointer" 
              />
            </div>
          </div>
        )}
      </div>

      {/* Bookings Table */}
      <div className="bg-brand-gray-dark/40 rounded-[3rem] border border-white/5 overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-brand-black/60 text-[9px] font-black uppercase tracking-widest text-white/30">
              <tr>
                <th className="px-10 py-8">Rider & Vehicle</th>
                <th className="px-10 py-8">Status</th>
                <th className="px-10 py-8">Schedule</th>
                <th className="px-10 py-8">Financials</th>
                <th className="px-10 py-8 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading ? (
                <tr>
                  <td colSpan={5} className="py-20 text-center">
                    <div className="w-10 h-10 border-2 border-brand-teal/20 border-t-brand-teal rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-[9px] font-black text-white/20 uppercase tracking-widest">Querying Records...</p>
                  </td>
                </tr>
              ) : bookings.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-20 text-center">
                    <p className="text-[10px] font-black text-white/10 uppercase tracking-[0.5em]">No Data in this Window</p>
                  </td>
                </tr>
              ) : (
                bookings.map(booking => {
                  const bike = BIKES.find(b => b.id === booking.bike_id);
                  const isOverdue = booking.status === 'ongoing' && new Date(`${booking.return_date}T${booking.return_time}`) < new Date();
                  
                  return (
                    <tr key={booking.id} className="hover:bg-brand-teal/[0.02] transition-colors group">
                      <td className="px-10 py-8">
                        <div className="flex items-center gap-6">
                          <div className="text-center">
                              <div className="text-brand-orange text-[9px] font-black uppercase mb-1">{booking.readable_id}</div>
                              <div className="w-12 h-12 rounded-xl overflow-hidden border border-white/10">
                                  <img src={bike?.imageUrl} className="w-full h-full object-cover" />
                              </div>
                          </div>
                          <div>
                            <div className="text-sm font-bold text-white uppercase tracking-tight">{booking.customer_name}</div>
                            <div className="text-[10px] text-brand-teal font-black uppercase tracking-widest mt-1">{bike?.name}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-10 py-8">
                        <span className={`inline-block px-4 py-2 rounded-xl text-[9px] font-black uppercase border tracking-widest ${
                          booking.status === 'completed' ? 'border-green-500/30 text-green-500' :
                          booking.status === 'ongoing' ? (isOverdue ? 'border-red-500/50 text-red-500 animate-pulse' : 'border-brand-teal/30 text-brand-teal') :
                          booking.status === 'booking_confirmed' ? 'border-green-500/40 text-green-400 bg-green-500/10' :
                          booking.status === 'cancelled' ? 'border-red-500/40 text-red-400 bg-red-500/10' :
                          booking.status === 'verifying_payment' ? 'border-brand-yellow/30 text-brand-yellow' :
                          'border-white/10 text-white/40'
                        }`}>
                          {isOverdue ? 'OVERDUE' : booking.status === 'booking_confirmed' ? 'PAID / CONFIRMED' : booking.status.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-10 py-8">
                        <div className="text-[10px] text-white/60 font-bold uppercase">{booking.pickup_date} @ {booking.pickup_time}</div>
                        <div className={`text-[10px] mt-1 uppercase font-bold ${isOverdue ? 'text-red-500' : 'text-white/30'}`}>Return {booking.return_date}</div>
                        {booking.address && (
                          <div className="mt-2">
                            {booking.address.includes('|') ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-brand-orange/15 border border-brand-orange/30 text-[8px] font-black text-brand-orange uppercase tracking-wider">
                                🚚 Deliv ≠ 🏁 Return
                              </span>
                            ) : booking.address.startsWith('Delivery:') ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-brand-teal/15 border border-brand-teal/30 text-[8px] font-black text-brand-teal uppercase tracking-wider">
                                🚚 Delivery
                              </span>
                            ) : booking.address.startsWith('Return Pickup:') ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-brand-yellow/15 border border-brand-yellow/30 text-[8px] font-black text-brand-yellow uppercase tracking-wider">
                                🏁 Return Pickup
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-[8px] font-black text-white/50 uppercase tracking-wider">
                                📍 Address
                              </span>
                            )}
                          </div>
                        )}
                      </td>
                      <td className="px-10 py-8">
                        <div className="text-sm font-heading text-white">₹{booking.total_rent + (booking.adjustment_amount || 0)}</div>
                        {booking.adjustment_amount !== undefined && booking.adjustment_amount !== 0 && (
                          <div className="mt-1">
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider ${
                              booking.adjustment_amount < 0
                                ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                                : 'bg-brand-orange/20 text-brand-orange border border-brand-orange/30'
                            }`}>
                              {booking.adjustment_amount < 0 ? `🏷️ Discount -₹${Math.abs(booking.adjustment_amount)}` : `🏷️ Premium +₹${booking.adjustment_amount}`}
                            </span>
                          </div>
                        )}
                        {booking.advance_amount !== undefined && booking.advance_amount !== null && booking.advance_amount > 0 && (
                          <div className="text-[9px] font-bold text-green-400/80 mt-1">
                            Adv: ₹{booking.advance_amount} ✓
                          </div>
                        )}
                        {booking.security_deposit !== undefined && booking.security_deposit !== null && Number(booking.security_deposit) > 0 && (
                          <div className="text-[9px] font-bold text-brand-yellow/90 mt-0.5">
                            Deposit: ₹{booking.security_deposit} 🔒
                          </div>
                        )}
                      </td>
                      <td className="px-10 py-8 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => handleOpenConfirmPaymentModal(booking)}
                            className={`px-3 py-2 rounded-xl text-[9px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                              booking.status === 'booking_confirmed'
                                ? 'bg-green-500/10 text-green-400 border border-green-500/30 hover:bg-green-500 hover:text-black'
                                : 'bg-green-500 text-black hover:bg-green-400 font-black shadow-lg shadow-green-500/20'
                            }`}
                            title={booking.status === 'booking_confirmed' ? 'Edit advance & agreed rent' : 'Confirm payment & set rent'}
                          >
                            {booking.status === 'booking_confirmed' ? 'Rent Terms' : 'Confirm Pay'}
                          </button>

                          {booking.status !== 'cancelled' && (
                            <button
                              type="button"
                              onClick={() => handleOpenCancelModal(booking)}
                              className="px-3 py-2 rounded-xl bg-red-500/10 hover:bg-red-500 hover:text-white text-red-400 border border-red-500/30 text-[9px] font-black uppercase tracking-wider transition-all cursor-pointer"
                              title={booking.status === 'booking_confirmed' ? 'Cancel confirmed booking (payment was confirmed)' : 'Cancel booking'}
                            >
                              Cancel
                            </button>
                          )}

                          <button 
                            onClick={() => setSelectedBooking(booking)} 
                            className="text-[9px] font-black text-brand-teal uppercase tracking-widest border border-brand-teal/20 px-4 py-2 rounded-xl hover:bg-brand-teal hover:text-black transition-all shadow-lg cursor-pointer"
                          >
                            Operate
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {selectedBooking && (
        <Modal isOpen={!!selectedBooking} onClose={() => setSelectedBooking(null)} title={`OPERATIONS: ${selectedBooking.readable_id}`} maxWidth="4xl">
          <div className="space-y-8 py-2">
            
            {/* RIDER INFO SECTION */}
            <div className="bg-brand-black/40 p-10 rounded-[3rem] border border-white/5 space-y-8">
              <div className="flex flex-col md:flex-row justify-between items-center gap-10">
                <div className="text-center md:text-left flex-grow">
                  <div className="flex items-center gap-3 mb-2 justify-center md:justify-start">
                    <h4 className="text-brand-teal font-heading text-[10px] uppercase tracking-[0.3em]">Active Rider Identity</h4>
                    {selectedBooking.payment_method && (
                      <span className={`px-4 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-[0.2em] ${selectedBooking.payment_method === 'cash' ? 'bg-green-500/20 text-green-500 border border-green-500/30' : 'bg-brand-teal/20 text-brand-teal border border-brand-teal/30'}`}>
                        {selectedBooking.payment_method} Received
                      </span>
                    )}
                  </div>
                  <p className="text-white font-bold text-3xl uppercase tracking-tighter">{selectedBooking.customer_name}</p>
                  <a 
                    href={`tel:${selectedBooking.customer_phone}`} 
                    className="inline-flex items-center gap-3 bg-brand-teal/10 border border-brand-teal/20 px-6 py-3 rounded-xl text-brand-teal text-sm font-black mt-4 hover:bg-brand-teal hover:text-black transition-all"
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
                    {selectedBooking.customer_phone}
                  </a>
                </div>

                <div className="relative w-full md:w-80 aspect-[4/3] bg-brand-black rounded-[2rem] border-2 border-dashed border-white/10 overflow-hidden flex flex-col items-center justify-center group transition-all hover:border-brand-orange">
                   {uploadingPhoto ? (
                      <div className="flex flex-col items-center gap-4">
                        <div className="w-10 h-10 border-2 border-brand-orange border-t-transparent rounded-full animate-spin"></div>
                        <span className="text-[8px] font-black text-brand-orange uppercase">Processing...</span>
                      </div>
                   ) : selectedBooking.customer_photo_url ? (
                      <img src={selectedBooking.customer_photo_url} className="w-full h-full object-cover" />
                   ) : (
                      <div className="text-center p-6">
                        <svg className="w-10 h-10 text-white/10 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                        <p className="text-[9px] text-white/30 font-black uppercase tracking-widest">Upload Handover Photo</p>
                      </div>
                   )}
                   {!uploadingPhoto && (
                      <div className="absolute inset-0 bg-brand-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity cursor-pointer">
                        <span className="bg-brand-orange text-white text-[9px] font-black px-6 py-2 rounded-full uppercase">Choose Photo</span>
                        <input type="file" accept="image/*" className="absolute inset-0 opacity-0 cursor-pointer" onChange={(e) => e.target.files?.[0] && handlePhotoUpload(e.target.files[0])} />
                      </div>
                   )}
                </div>
              </div>
            </div>

            {/* LOGISTICS & DELIVERY ADDRESSES SECTION */}
            {selectedBooking.address && (
              <div className="bg-brand-black/40 p-10 rounded-[3rem] border border-white/5 space-y-6">
                <h4 className="text-brand-teal font-heading text-sm uppercase tracking-widest flex items-center gap-2">
                  <span>📍</span> Handover Logistics & Delivery Addresses
                </h4>
                {selectedBooking.address.includes('|') ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-brand-black/60 p-6 rounded-2xl border border-brand-teal/20 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black uppercase text-brand-teal tracking-wider">🚚 Delivery Address (Trip Start)</span>
                        <a 
                          href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(selectedBooking.address.split('|')[0].replace('Delivery:', '').trim())}`} 
                          target="_blank" 
                          rel="noreferrer" 
                          className="text-[9px] font-black uppercase text-brand-teal hover:underline inline-flex items-center gap-1"
                        >
                          Google Maps ↗
                        </a>
                      </div>
                      <p className="text-sm text-white leading-relaxed">
                        {selectedBooking.address.split('|')[0].replace('Delivery:', '').trim()}
                      </p>
                    </div>

                    <div className="bg-brand-black/60 p-6 rounded-2xl border border-brand-yellow/20 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black uppercase text-brand-yellow tracking-wider">🏁 Return Pickup Address (Trip End)</span>
                        <a 
                          href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(selectedBooking.address.split('|')[1].replace('Return Pickup:', '').trim())}`} 
                          target="_blank" 
                          rel="noreferrer" 
                          className="text-[9px] font-black uppercase text-brand-yellow hover:underline inline-flex items-center gap-1"
                        >
                          Google Maps ↗
                        </a>
                      </div>
                      <p className="text-sm text-white leading-relaxed">
                        {selectedBooking.address.split('|')[1].replace('Return Pickup:', '').trim()}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="bg-brand-black/60 p-6 rounded-2xl border border-white/10 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black uppercase text-brand-teal tracking-wider">📍 Logistics Address</span>
                      <a 
                        href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(selectedBooking.address)}`} 
                        target="_blank" 
                        rel="noreferrer" 
                        className="text-[9px] font-black uppercase text-brand-teal hover:underline inline-flex items-center gap-1"
                      >
                        Google Maps ↗
                      </a>
                    </div>
                    <p className="text-sm text-white leading-relaxed">{selectedBooking.address}</p>
                  </div>
                )}
              </div>
            )}

            {/* IDENTITY DOCUMENTS SECTION */}
            <div className="bg-brand-black/40 p-10 rounded-[3rem] border border-white/5 space-y-6">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <div>
                  <h4 className="text-brand-teal font-heading text-sm uppercase tracking-widest">
                    Identity Documents (Aadhaar & DL)
                  </h4>
                  <p className="text-[9px] text-white/40 uppercase mt-0.5">
                    Can be collected during booking or later during physical machine handover
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleOpenDocModal}
                  className="px-4 py-2 bg-brand-teal/10 hover:bg-brand-teal hover:text-black text-brand-teal border border-brand-teal/20 rounded-xl text-[9px] font-black uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  <span>{selectedBooking.aadhaar_number || selectedBooking.dl_number ? 'Update Documents' : 'Collect / Upload Documents'}</span>
                </button>
              </div>

              {(selectedBooking.aadhaar_url || selectedBooking.dl_url || selectedBooking.aadhaar_number || selectedBooking.dl_number) ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-2">
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-[9px] font-black text-white/40 uppercase tracking-widest">Aadhaar Card</span>
                      {selectedBooking.aadhaar_url ? (
                        <a href={selectedBooking.aadhaar_url} target="_blank" rel="noreferrer" className="text-[8px] font-black text-brand-teal uppercase hover:underline">View Full</a>
                      ) : (
                        <span className="text-[8px] font-bold text-brand-yellow uppercase">Photo Pending</span>
                      )}
                    </div>
                    {selectedBooking.aadhaar_url ? (
                      <div className="aspect-video bg-brand-black rounded-2xl overflow-hidden border border-white/5">
                        <img src={selectedBooking.aadhaar_url} className="w-full h-full object-cover" alt="Aadhaar" />
                      </div>
                    ) : (
                      <div className="p-4 bg-brand-black/60 rounded-2xl border border-white/5 text-center text-white/30 text-xs">
                        No Aadhaar image uploaded yet
                      </div>
                    )}
                    <div className="text-[10px] text-white/70 font-mono font-bold">
                      No: {selectedBooking.aadhaar_number || 'Not provided'}
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-[9px] font-black text-white/40 uppercase tracking-widest">Driving License</span>
                      {selectedBooking.dl_url ? (
                        <a href={selectedBooking.dl_url} target="_blank" rel="noreferrer" className="text-[8px] font-black text-brand-teal uppercase hover:underline">View Full</a>
                      ) : (
                        <span className="text-[8px] font-bold text-brand-yellow uppercase">Photo Pending</span>
                      )}
                    </div>
                    {selectedBooking.dl_url ? (
                      <div className="aspect-video bg-brand-black rounded-2xl overflow-hidden border border-white/5">
                        <img src={selectedBooking.dl_url} className="w-full h-full object-cover" alt="DL" />
                      </div>
                    ) : (
                      <div className="p-4 bg-brand-black/60 rounded-2xl border border-white/5 text-center text-white/30 text-xs">
                        No DL image uploaded yet
                      </div>
                    )}
                    <div className="text-[10px] text-white/70 font-mono font-bold">
                      No: {selectedBooking.dl_number || 'Not provided'}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-6 bg-brand-black/60 rounded-2xl border border-white/5 flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">📋</span>
                    <div>
                      <p className="text-xs font-bold text-white">Identity Documents Pending</p>
                      <p className="text-[10px] text-white/40 mt-0.5">Rider's Aadhaar card and driving license can be collected now or when the vehicle is handed over.</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleOpenDocModal}
                    className="px-4 py-2 bg-brand-teal text-black rounded-xl text-[10px] font-black uppercase tracking-wider hover:bg-brand-teal/90 transition-all cursor-pointer whitespace-nowrap"
                  >
                    Add Documents Now
                  </button>
                </div>
              )}
            </div>

            {/* PAYMENT PROOF SECTION */}
            {selectedBooking.payment_screenshot_url && (
              <div className="bg-brand-black/40 p-10 rounded-[3rem] border-2 border-brand-yellow/30 space-y-6">
                <div className="flex justify-between items-center">
                  <h4 className="text-brand-yellow font-heading text-sm uppercase tracking-widest flex items-center gap-2">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    Payment Verification Needed ({selectedBooking.payment_method?.toUpperCase() || 'UPI'})
                  </h4>
                  <a href={selectedBooking.payment_screenshot_url} target="_blank" rel="noreferrer" className="text-[9px] font-black text-brand-teal uppercase tracking-widest hover:underline">View Full Size</a>
                </div>
                <div className="relative w-full h-80 bg-brand-black rounded-3xl overflow-hidden border border-white/5 shadow-inner">
                  <img src={selectedBooking.payment_screenshot_url} className="w-full h-full object-contain" alt="Payment Proof" />
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="bg-brand-black/40 p-8 rounded-[2.5rem] border border-white/5 space-y-6">
                <div className="flex items-center justify-between">
                  <h4 className="text-brand-yellow font-heading text-sm uppercase tracking-widest">Financial Operations</h4>
                  {selectedBooking.status === 'booking_confirmed' && (
                    <span className="px-3 py-1 rounded-md text-[9px] font-black uppercase text-green-400 bg-green-500/10 border border-green-500/20">
                      Payment Confirmed
                    </span>
                  )}
                  {selectedBooking.status === 'cancelled' && (
                    <span className="px-3 py-1 rounded-md text-[9px] font-black uppercase text-red-400 bg-red-500/10 border border-red-500/20">
                      Booking Cancelled
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3">
                    {/* Confirm or Adjust Payment Terms Button */}
                    <button 
                      type="button"
                      onClick={() => handleOpenConfirmPaymentModal(selectedBooking)} 
                      className={`py-4 px-3 text-white text-[9px] font-black uppercase rounded-xl transition-all shadow-lg flex items-center justify-center gap-1.5 cursor-pointer ${
                        selectedBooking.status === 'booking_confirmed' 
                          ? 'bg-green-600 hover:bg-green-500 shadow-green-500/20' 
                          : 'bg-green-500 hover:bg-green-600 shadow-green-500/20'
                      }`}
                    >
                      <span>{selectedBooking.status === 'booking_confirmed' ? '✓ Payment Confirmed' : 'Confirm Payment'}</span>
                      <span className="text-[8px] opacity-80">(Edit Terms)</span>
                    </button>

                    {/* Booking Cancelled Button - active and prominent even if payment was confirmed earlier */}
                    {selectedBooking.status !== 'cancelled' ? (
                      <button 
                        type="button"
                        onClick={() => handleOpenCancelModal(selectedBooking)}
                        className={`py-4 px-3 text-[9px] font-black uppercase rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                          selectedBooking.status === 'booking_confirmed'
                            ? 'bg-red-500/20 text-red-400 hover:bg-red-500 hover:text-white border border-red-500/40 shadow-lg shadow-red-500/10'
                            : 'bg-white/5 text-red-400 hover:bg-red-500/10 border border-red-500/20'
                        }`}
                        title={selectedBooking.status === 'booking_confirmed' ? 'Cancel confirmed booking and record refund note' : 'Cancel booking'}
                      >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                        <span>Booking Cancelled</span>
                      </button>
                    ) : (
                      <button 
                        type="button"
                        onClick={() => updateStatus(selectedBooking.id, 'pending_payment', 'Reopened by Admin')}
                        className="py-4 px-3 bg-brand-yellow/10 hover:bg-brand-yellow hover:text-black text-brand-yellow border border-brand-yellow/30 text-[9px] font-black uppercase rounded-xl transition-all cursor-pointer"
                      >
                        Reopen Booking
                      </button>
                    )}

                    {/* Reject verification button */}
                    {selectedBooking.status !== 'cancelled' && (
                      <button 
                        type="button"
                        onClick={() => updateStatus(selectedBooking.id, 'pending_payment', 'Rejected')} 
                        className="col-span-2 py-2.5 bg-white/5 text-white/50 hover:text-red-400 border border-white/10 hover:border-red-500/30 text-[9px] font-black uppercase rounded-xl transition-colors cursor-pointer"
                      >
                        Reject Verification (Set to Pending Payment)
                      </button>
                    )}
                </div>
              </div>

              <div className="bg-brand-black/40 p-8 rounded-[2.5rem] border border-white/5 space-y-6">
                <h4 className="text-brand-teal font-heading text-sm uppercase tracking-widest">Fleet Operations</h4>
                <div className="grid grid-cols-2 gap-4">
                    <button 
                      onClick={() => updateStatus(selectedBooking.id, 'ongoing')} 
                      disabled={selectedBooking.status === 'cancelled'}
                      className={`py-4 bg-brand-teal text-black text-[9px] font-black uppercase rounded-xl hover:bg-brand-teal/80 transition-colors ${selectedBooking.status === 'cancelled' ? 'opacity-30 cursor-not-allowed' : 'cursor-pointer'}`}
                    >
                      Dispatch / Start
                    </button>
                    <button 
                      onClick={() => updateStatus(selectedBooking.id, 'completed')} 
                      disabled={selectedBooking.status === 'cancelled'}
                      className={`py-4 bg-brand-orange text-white text-[9px] font-black uppercase rounded-xl hover:bg-brand-orange/80 transition-colors ${selectedBooking.status === 'cancelled' ? 'opacity-30 cursor-not-allowed' : 'cursor-pointer'}`}
                    >
                      Receive / Finish
                    </button>
                </div>
              </div>
            </div>

            {/* EXTEND RIDE SECTION */}
            {selectedBooking.status === 'ongoing' && (
              <div className="bg-brand-black/40 p-10 rounded-[3rem] border border-brand-teal/20 space-y-8">
                <div className="flex justify-between items-center">
                  <h4 className="text-brand-teal font-heading text-sm uppercase tracking-widest">Extend Ride</h4>
                  <div className="text-[10px] text-white/40 font-black uppercase tracking-widest">Current Return: {selectedBooking.return_date}</div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[9px] font-black text-white/40 uppercase tracking-widest ml-2">Extra Days</label>
                    <input 
                      type="number" 
                      min="1"
                      value={extension.days} 
                      onChange={(e) => setExtension(p => ({...p, days: parseInt(e.target.value)}))} 
                      className="w-full bg-brand-black border border-white/10 rounded-xl p-4 text-white outline-none focus:border-brand-teal" 
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[9px] font-black text-white/40 uppercase tracking-widest ml-2">Extra Rent (₹)</label>
                    <input 
                      type="number" 
                      value={extension.amount} 
                      onChange={(e) => setExtension(p => ({...p, amount: parseFloat(e.target.value)}))} 
                      className="w-full bg-brand-black border border-white/10 rounded-xl p-4 text-white outline-none focus:border-brand-teal" 
                    />
                  </div>
                </div>
                <button 
                  onClick={handleExtendRide}
                  className="w-full py-4 bg-brand-teal text-brand-black font-black uppercase text-[10px] rounded-xl hover:bg-brand-teal/80 transition-all cursor-pointer"
                >
                  Confirm Extension
                </button>
              </div>
            )}

            <div className="bg-brand-black/40 p-10 rounded-[3rem] border border-white/5 space-y-8">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div>
                    <h4 className="text-brand-yellow font-heading text-sm uppercase tracking-widest">Custom Adjustments</h4>
                    <p className="text-[9px] text-white/40 uppercase mt-1">Discounts, premiums, penalty & damage settlements</p>
                  </div>
                  <div className="text-right">
                    <span className="text-[9px] text-white/30 font-black uppercase tracking-widest block">Finally Settled Net</span>
                    <span className="text-xl font-heading text-brand-yellow">₹{selectedBooking.total_rent + (selectedBooking.adjustment_amount || 0)}</span>
                  </div>
                </div>

                {/* Show Active Adjustment Tag */}
                {selectedBooking.adjustment_amount !== 0 && (
                  <div className="p-4 rounded-2xl bg-white/5 border border-white/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 animate-fade-in">
                    <div className="flex items-center gap-3">
                      <span className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider ${
                        selectedBooking.adjustment_amount < 0
                          ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                          : 'bg-brand-orange/20 text-brand-orange border border-brand-orange/30'
                      }`}>
                        {selectedBooking.adjustment_amount < 0 ? '🏷️ Discount Tag' : '🏷️ Premium Tag'}
                      </span>
                      <span className="text-white text-base font-heading">
                        {selectedBooking.adjustment_amount < 0 ? `-₹${Math.abs(selectedBooking.adjustment_amount)}` : `+₹${selectedBooking.adjustment_amount}`}
                      </span>
                      {selectedBooking.adjustment_reason && (
                        <span className="text-white/60 text-xs italic">
                          — {selectedBooking.adjustment_reason}
                        </span>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={handleResetAdjustment}
                      className="text-[9px] text-white/40 hover:text-red-400 font-bold uppercase transition-colors cursor-pointer"
                    >
                      Reset Adjustment
                    </button>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <select 
                      value={adjustment.type} 
                      onChange={(e) => setAdjustment(a => ({...a, type: e.target.value}))} 
                      className="bg-brand-black border border-white/10 rounded-xl p-4 text-xs text-white outline-none focus:border-brand-yellow"
                    >
                        <option value="discount">Discounts (-)</option>
                        <option value="premium">Premium Charge (+)</option>
                        <option value="damage">Damage Charges (+)</option>
                        <option value="refund">Trip Refund (-)</option>
                        <option value="revenue">Other Revenue (+)</option>
                        <option value="expenditure">Other Expenditure (-)</option>
                    </select>
                    <input 
                      type="number" 
                      placeholder="₹ Amount" 
                      value={adjustment.amount || ''} 
                      onChange={(e) => setAdjustment(a => ({...a, amount: parseFloat(e.target.value) || 0}))} 
                      className="bg-brand-black border border-white/10 rounded-xl p-4 text-sm text-white outline-none focus:border-brand-yellow" 
                    />
                    <textarea 
                      placeholder="Reason for adjustment (e.g. negotiated price, helmet add-on, scratch penalty)..." 
                      value={adjustment.reason} 
                      onChange={(e) => setAdjustment(a => ({...a, reason: e.target.value}))} 
                      className="bg-brand-black border border-white/10 rounded-xl p-4 text-xs text-white resize-none outline-none focus:border-brand-yellow h-14" 
                    />
                </div>
                <button 
                  type="button"
                  onClick={handleAdjustment} 
                  className="w-full py-4 bg-brand-yellow hover:bg-brand-yellow/90 text-brand-black font-black uppercase text-[11px] rounded-2xl shadow-xl hover:scale-[1.01] transition-all cursor-pointer"
                >
                  Apply Financial Settlement
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
                  Customer & Vehicle
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

            {/* Deposit Received Input */}
            <div className="space-y-2">
              <div className="flex justify-between items-center ml-1">
                <label className="text-[9px] font-black text-white/60 uppercase tracking-widest">
                  4. Deposit Received Amount (₹)
                </label>
                <span className="text-[8px] text-brand-yellow uppercase font-bold">Refundable Security Deposit</span>
              </div>
              <input 
                type="number" 
                min="0"
                value={paymentForm.depositAmount}
                onChange={(e) => setPaymentForm(p => ({ ...p, depositAmount: parseFloat(e.target.value) || 0 }))}
                className="w-full bg-brand-black border border-white/15 rounded-xl p-4 text-brand-yellow font-heading text-xl outline-none focus:border-brand-yellow"
              />
              <div className="flex flex-wrap gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setPaymentForm(p => ({ ...p, depositAmount: 0 }))}
                  className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-[8px] font-bold text-white/60 uppercase cursor-pointer"
                >
                  ₹0 (Waived)
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentForm(p => ({ ...p, depositAmount: 500 }))}
                  className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-[8px] font-bold text-white/60 uppercase cursor-pointer"
                >
                  ₹500
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentForm(p => ({ ...p, depositAmount: 1000 }))}
                  className="px-2.5 py-1 rounded-lg bg-brand-yellow/10 border border-brand-yellow/30 text-[8px] font-bold text-brand-yellow uppercase cursor-pointer"
                >
                  ₹1,000 (Std)
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentForm(p => ({ ...p, depositAmount: 1500 }))}
                  className="px-2.5 py-1 rounded-lg bg-brand-yellow/10 border border-brand-yellow/30 text-[8px] font-bold text-brand-yellow uppercase cursor-pointer"
                >
                  ₹1,500
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentForm(p => ({ ...p, depositAmount: 2000 }))}
                  className="px-2.5 py-1 rounded-lg bg-brand-yellow/10 border border-brand-yellow/30 text-[8px] font-bold text-brand-yellow uppercase cursor-pointer"
                >
                  ₹2,000
                </button>
              </div>
            </div>

            {/* Adjustment Reason/Note */}
            <div className="space-y-1.5">
              <label className="text-[9px] font-black text-white/60 uppercase tracking-widest ml-1">
                5. Adjustment Note / Reason (Optional)
              </label>
              <input 
                type="text" 
                placeholder="e.g. Negotiated for 3-day trip, Extra helmet add-on, Friend referral discount..."
                value={paymentForm.note}
                onChange={(e) => setPaymentForm(p => ({ ...p, note: e.target.value }))}
                className="w-full bg-brand-black border border-white/15 rounded-xl p-3 text-xs text-white outline-none focus:border-brand-teal"
              />
            </div>

            {/* Financial Settlement Breakdown */}
            <div className="bg-brand-black/60 p-4 rounded-2xl border border-white/10 grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
              <div>
                <span className="text-[8px] font-black text-white/40 uppercase tracking-wider block">Agreed Rent</span>
                <span className="text-base font-heading text-white">₹{paymentForm.agreedRent}</span>
              </div>
              <div className="sm:border-l border-white/10">
                <span className="text-[8px] font-black text-brand-yellow uppercase tracking-wider block">Deposit Recv.</span>
                <span className="text-base font-heading text-brand-yellow">₹{paymentForm.depositAmount}</span>
              </div>
              <div className="sm:border-l border-white/10">
                <span className="text-[8px] font-black text-green-400 uppercase tracking-wider block">Advance Paid</span>
                <span className="text-base font-heading text-green-400">₹{paymentForm.advancePaid}</span>
              </div>
              <div className="sm:border-l border-white/10">
                <span className="text-[8px] font-black text-brand-teal uppercase tracking-wider block">Due at Handover</span>
                <span className="text-base font-heading text-brand-teal">
                  ₹{Math.max(0, (paymentForm.agreedRent + paymentForm.depositAmount) - paymentForm.advancePaid)}
                </span>
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

      {/* CANCEL BOOKING CONFIRMATION MODAL */}
      {cancelModalBooking && (
        <Modal 
          isOpen={!!cancelModalBooking} 
          onClose={() => setCancelModalBooking(null)} 
          title={`CANCEL BOOKING: ${cancelModalBooking.readable_id}`} 
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
                Are you sure you want to cancel booking <strong>{cancelModalBooking.readable_id}</strong> for <strong>{cancelModalBooking.customer_name}</strong>?
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
                  placeholder="Explain why this booking is being cancelled..."
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
                  placeholder="e.g. ₹500 advance refunded via UPI reference #12345 / Advance retained as per policy..."
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
                Keep Booking
              </button>
              <button
                type="button"
                onClick={handleConfirmCancel}
                className="flex-1 py-3.5 bg-red-500 hover:bg-red-600 text-white text-[10px] font-black uppercase rounded-xl transition-all shadow-lg shadow-red-500/20 cursor-pointer"
              >
                Confirm Cancellation
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* IDENTITY DOCUMENTS UPLOAD / UPDATE MODAL FOR ACTIVE/CONFIRMED BOOKINGS */}
      {docModalOpen && selectedBooking && (
        <Modal 
          isOpen={docModalOpen} 
          onClose={() => setDocModalOpen(false)} 
          title={`COLLECT / UPDATE IDENTITY DOCUMENTS: ${selectedBooking.readable_id}`} 
          maxWidth="xl"
        >
          <form onSubmit={handleSaveDocumentsForSelectedBooking} className="space-y-6 py-2">
            <div className="bg-brand-black/60 p-4 rounded-2xl border border-white/10 text-xs text-white/80 space-y-1">
              <p className="font-bold text-white flex items-center gap-2">
                <span className="text-brand-teal">✓</span> Rider: {selectedBooking.customer_name} ({selectedBooking.customer_phone})
              </p>
              <p className="text-[11px] text-white/50">
                You can enter Aadhaar and Driving License numbers, and upload official card photos below.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[9px] font-black text-white/60 uppercase tracking-widest">
                  Aadhaar Card Number
                </label>
                <input 
                  type="text"
                  placeholder="e.g. 1234 5678 9012"
                  value={docForm.aadhaar_number}
                  onChange={(e) => setDocForm(p => ({ ...p, aadhaar_number: e.target.value }))}
                  className="w-full bg-brand-black border border-white/15 rounded-xl p-3 text-xs text-white font-mono outline-none focus:border-brand-teal"
                />
                <label className="flex items-center gap-2 cursor-pointer bg-white/5 border border-dashed border-white/10 rounded-xl p-3 hover:border-brand-teal transition-all">
                  <svg className="w-4 h-4 text-brand-teal shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                  </svg>
                  <span className="text-[9px] font-bold text-white/60 truncate">
                    {docForm.aadhaar_file ? docForm.aadhaar_file.name : (selectedBooking.aadhaar_url ? 'Replace Aadhaar Image' : 'Upload Aadhaar Image')}
                  </span>
                  <input 
                    type="file" 
                    accept="image/*" 
                    className="hidden" 
                    onChange={(e) => e.target.files?.[0] && setDocForm(p => ({ ...p, aadhaar_file: e.target.files![0] }))} 
                  />
                </label>
              </div>

              <div className="space-y-2">
                <label className="text-[9px] font-black text-white/60 uppercase tracking-widest">
                  Driving License Number
                </label>
                <input 
                  type="text"
                  placeholder="e.g. WB02 20210001234"
                  value={docForm.dl_number}
                  onChange={(e) => setDocForm(p => ({ ...p, dl_number: e.target.value }))}
                  className="w-full bg-brand-black border border-white/15 rounded-xl p-3 text-xs text-white font-mono outline-none focus:border-brand-teal"
                />
                <label className="flex items-center gap-2 cursor-pointer bg-white/5 border border-dashed border-white/10 rounded-xl p-3 hover:border-brand-teal transition-all">
                  <svg className="w-4 h-4 text-brand-teal shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                  </svg>
                  <span className="text-[9px] font-bold text-white/60 truncate">
                    {docForm.dl_file ? docForm.dl_file.name : (selectedBooking.dl_url ? 'Replace DL Image' : 'Upload DL Image')}
                  </span>
                  <input 
                    type="file" 
                    accept="image/*" 
                    className="hidden" 
                    onChange={(e) => e.target.files?.[0] && setDocForm(p => ({ ...p, dl_file: e.target.files![0] }))} 
                  />
                </label>
              </div>
            </div>

            <div className="flex gap-4 pt-2">
              <button
                type="button"
                onClick={() => setDocModalOpen(false)}
                className="flex-1 py-3.5 bg-white/5 hover:bg-white/10 text-white/60 text-[10px] font-black uppercase rounded-xl transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={docForm.saving}
                className="flex-1 py-3.5 bg-brand-teal hover:bg-brand-teal/90 text-brand-black font-black uppercase text-[10px] tracking-widest rounded-xl transition-all shadow-lg shadow-brand-teal/20 cursor-pointer disabled:opacity-50"
              >
                {docForm.saving ? 'Saving Documents...' : 'Save Documents'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* SUBMIT MANUAL REQUEST MODAL (IDENTICAL TO ONLINE BOOKING PAGE) */}
      {showManualModal && (
        <Modal 
          isOpen={showManualModal} 
          onClose={() => setShowManualModal(false)} 
          title="SUBMIT MANUAL REQUEST" 
          maxWidth="4xl"
        >
          <form onSubmit={handleManualBooking} className="space-y-6 py-2">
            
            {/* Notice matching online booking workflow */}
            <div className="bg-brand-black/60 p-4 rounded-2xl border border-white/10 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <span className="text-2xl">📋</span>
                <div>
                  <p className="text-xs font-bold text-white uppercase tracking-wider">
                    Submit Ride Request (Online Booking Details)
                  </p>
                  <p className="text-[10px] text-white/50">
                    Captures identical details as the website booking form and logs it into the ledger. You can thereafter confirm payment, set agreed rent, and operate the ride identically to online requests.
                  </p>
                </div>
              </div>
            </div>

            {/* 1. CUSTOMER INFORMATION */}
            <div className="bg-brand-black/50 p-6 rounded-2xl border border-white/5 space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-[10px] font-black text-brand-teal uppercase tracking-widest flex items-center gap-1.5">
                  <span>👤</span> 1. Customer Information
                </h4>
                <span className="text-[9px] text-white/40 uppercase">Walk-in / Phone Rider</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[9px] font-bold text-white/60 uppercase">Rider Full Name *</label>
                  <input 
                    type="text" 
                    placeholder="e.g. Rahul Sharma"
                    value={manualBooking.customer_name}
                    onChange={(e) => setManualBooking(p => ({ ...p, customer_name: e.target.value }))}
                    className="w-full bg-brand-black border border-white/10 rounded-xl p-3 text-xs text-white outline-none focus:border-brand-teal font-bold"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[9px] font-bold text-white/60 uppercase">Mobile Phone *</label>
                  <input 
                    type="tel" 
                    placeholder="e.g. +91 98765 43210"
                    value={manualBooking.customer_phone}
                    onChange={(e) => setManualBooking(p => ({ ...p, customer_phone: e.target.value }))}
                    className="w-full bg-brand-black border border-white/10 rounded-xl p-3 text-xs text-white outline-none focus:border-brand-teal font-mono font-bold"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[9px] font-bold text-white/40 uppercase">Email (Optional)</label>
                  <input 
                    type="email" 
                    placeholder="customer@gmail.com"
                    value={manualBooking.customer_email}
                    onChange={(e) => setManualBooking(p => ({ ...p, customer_email: e.target.value }))}
                    className="w-full bg-brand-black border border-white/10 rounded-xl p-3 text-xs text-white outline-none focus:border-brand-teal"
                  />
                </div>
              </div>
            </div>

            {/* 2. VEHICLE & RENTAL SCHEDULE */}
            <div className="bg-brand-black/50 p-6 rounded-2xl border border-white/5 space-y-4">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                <h4 className="text-[10px] font-black text-brand-teal uppercase tracking-widest flex items-center gap-1.5">
                  <span>🏍️</span> 2. Vehicle & Rental Schedule
                </h4>
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full bg-brand-teal/10 border border-brand-teal/20 text-[9px] font-bold text-brand-teal uppercase">
                    Duration: {getDurationText(manualBooking.pickup_date, manualBooking.pickup_time, manualBooking.return_date, manualBooking.return_time)}
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full bg-white/5 border border-white/10 text-[9px] font-bold text-white/70 uppercase">
                    Standard Tariff: ₹{manualBooking.standard_rent}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5 sm:col-span-2">
                  <label className="text-[9px] font-bold text-white/60 uppercase">Select Machine</label>
                  <select 
                    value={manualBooking.bike_id}
                    onChange={(e) => handleManualBikeOrDateChange({ bike_id: parseInt(e.target.value) })}
                    className="w-full bg-brand-black border border-white/10 rounded-xl p-3 text-xs font-bold text-white outline-none focus:border-brand-teal"
                    required
                  >
                    {BIKES.map(b => (
                      <option key={b.id} value={b.id}>
                        {b.name} ({b.category}) — ₹{b.dailyRate}/day {b.rc_number ? `• ${b.rc_number}` : ''}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5 sm:col-span-2">
                  <label className="text-[9px] font-bold text-white/60 uppercase">Trip Scope (City or Outstation)</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setManualBooking(p => ({ ...p, is_outstation: false }))}
                      className={`py-2 px-3 rounded-xl text-[9px] font-black uppercase transition-all cursor-pointer ${
                        !manualBooking.is_outstation ? 'bg-brand-teal text-black shadow' : 'bg-white/5 text-white/50 border border-white/10'
                      }`}
                    >
                      🏙️ City / Local Riding
                    </button>
                    <button
                      type="button"
                      onClick={() => setManualBooking(p => ({ ...p, is_outstation: true }))}
                      className={`py-2 px-3 rounded-xl text-[9px] font-black uppercase transition-all cursor-pointer ${
                        manualBooking.is_outstation ? 'bg-brand-orange text-white shadow' : 'bg-white/5 text-white/50 border border-white/10'
                      }`}
                    >
                      🛣️ Outstation / Highway
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[9px] font-bold text-white/60 uppercase">Pickup Date & Time</label>
                  <div className="grid grid-cols-2 gap-2">
                    <input 
                      type="date" 
                      value={manualBooking.pickup_date}
                      onChange={(e) => handleManualBikeOrDateChange({ pickup_date: e.target.value })}
                      className="bg-brand-black border border-white/10 rounded-xl p-2.5 text-xs text-white outline-none focus:border-brand-teal cursor-pointer"
                      required
                    />
                    <input 
                      type="time" 
                      value={manualBooking.pickup_time}
                      onChange={(e) => handleManualBikeOrDateChange({ pickup_time: e.target.value })}
                      className="bg-brand-black border border-white/10 rounded-xl p-2.5 text-xs text-white outline-none focus:border-brand-teal cursor-pointer"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[9px] font-bold text-white/60 uppercase">Return Date & Time</label>
                  <div className="grid grid-cols-2 gap-2">
                    <input 
                      type="date" 
                      value={manualBooking.return_date}
                      onChange={(e) => handleManualBikeOrDateChange({ return_date: e.target.value })}
                      className="bg-brand-black border border-white/10 rounded-xl p-2.5 text-xs text-white outline-none focus:border-brand-teal cursor-pointer"
                      required
                    />
                    <input 
                      type="time" 
                      value={manualBooking.return_time}
                      onChange={(e) => handleManualBikeOrDateChange({ return_time: e.target.value })}
                      className="bg-brand-black border border-white/10 rounded-xl p-2.5 text-xs text-white outline-none focus:border-brand-teal cursor-pointer"
                      required
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* 3. AGREED RENT, DEPOSIT & FINANCIAL TERMS (CRITICAL) */}
            <div className="bg-brand-black/60 p-6 rounded-2xl border-2 border-brand-yellow/30 space-y-4">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                <h4 className="text-[10px] font-black text-brand-yellow uppercase tracking-widest flex items-center gap-1.5">
                  <span>💰</span> 3. Agreed Rent, Deposit & Payment Terms
                </h4>
                <span className="text-[8px] text-white/50 uppercase">Same terms as online ride operations</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {/* Agreed Rent */}
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center">
                    <label className="text-[9px] font-bold text-white/70 uppercase">Finally Agreed Rent (₹) *</label>
                    <span className="text-[8px] text-white/40 uppercase">Std: ₹{manualBooking.standard_rent}</span>
                  </div>
                  <input 
                    type="number" 
                    min="1"
                    value={manualBooking.agreed_rent}
                    onChange={(e) => setManualBooking(p => ({ ...p, agreed_rent: parseFloat(e.target.value) || 0 }))}
                    className="w-full bg-brand-black border border-white/15 rounded-xl p-3 text-base font-heading font-bold text-brand-yellow outline-none focus:border-brand-yellow"
                    required
                  />
                  <div className="flex flex-wrap gap-1.5 pt-0.5">
                    <button
                      type="button"
                      onClick={() => setManualBooking(p => ({ ...p, agreed_rent: p.standard_rent }))}
                      className="px-2 py-0.5 rounded bg-white/5 hover:bg-white/10 text-[8px] font-bold text-white/60 uppercase cursor-pointer"
                    >
                      Std (₹{manualBooking.standard_rent})
                    </button>
                    <button
                      type="button"
                      onClick={() => setManualBooking(p => ({ ...p, agreed_rent: Math.max(100, p.standard_rent - 100) }))}
                      className="px-2 py-0.5 rounded bg-green-500/10 border border-green-500/20 text-[8px] font-bold text-green-400 uppercase cursor-pointer"
                    >
                      -₹100
                    </button>
                    <button
                      type="button"
                      onClick={() => setManualBooking(p => ({ ...p, agreed_rent: Math.max(100, p.standard_rent - 200) }))}
                      className="px-2 py-0.5 rounded bg-green-500/10 border border-green-500/20 text-[8px] font-bold text-green-400 uppercase cursor-pointer"
                    >
                      -₹200
                    </button>
                  </div>
                </div>

                {/* Deposit Received Amount */}
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center">
                    <label className="text-[9px] font-bold text-white/70 uppercase">Deposit Received Amount (₹)</label>
                    <span className="text-[8px] text-brand-teal uppercase">Refundable</span>
                  </div>
                  <input 
                    type="number" 
                    min="0"
                    value={manualBooking.deposit_amount}
                    onChange={(e) => setManualBooking(p => ({ ...p, deposit_amount: parseFloat(e.target.value) || 0 }))}
                    className="w-full bg-brand-black border border-white/15 rounded-xl p-3 text-base font-heading font-bold text-brand-teal outline-none focus:border-brand-teal"
                  />
                  <div className="flex flex-wrap gap-1.5 pt-0.5">
                    <button
                      type="button"
                      onClick={() => setManualBooking(p => ({ ...p, deposit_amount: 0 }))}
                      className="px-2 py-0.5 rounded bg-white/5 hover:bg-white/10 text-[8px] font-bold text-white/60 uppercase cursor-pointer"
                    >
                      ₹0 (Waived)
                    </button>
                    <button
                      type="button"
                      onClick={() => setManualBooking(p => ({ ...p, deposit_amount: 1000 }))}
                      className="px-2 py-0.5 rounded bg-brand-teal/10 border border-brand-teal/20 text-[8px] font-bold text-brand-teal uppercase cursor-pointer"
                    >
                      ₹1,000 (Std)
                    </button>
                    <button
                      type="button"
                      onClick={() => setManualBooking(p => ({ ...p, deposit_amount: 1500 }))}
                      className="px-2 py-0.5 rounded bg-brand-teal/10 border border-brand-teal/20 text-[8px] font-bold text-brand-teal uppercase cursor-pointer"
                    >
                      ₹1,500
                    </button>
                  </div>
                </div>

                {/* Advance / Rent Received Amount */}
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center">
                    <label className="text-[9px] font-bold text-white/70 uppercase">Advance Received Amount (₹)</label>
                    <span className="text-[8px] text-green-400 uppercase">Paid Now</span>
                  </div>
                  <input 
                    type="number" 
                    min="0"
                    value={manualBooking.advance_amount}
                    onChange={(e) => setManualBooking(p => ({ ...p, advance_amount: parseFloat(e.target.value) || 0 }))}
                    className="w-full bg-brand-black border border-white/15 rounded-xl p-3 text-base font-heading font-bold text-green-400 outline-none focus:border-green-400"
                  />
                  <div className="flex flex-wrap gap-1.5 pt-0.5">
                    <button
                      type="button"
                      onClick={() => setManualBooking(p => ({ ...p, advance_amount: 500 }))}
                      className="px-2 py-0.5 rounded bg-white/5 hover:bg-white/10 text-[8px] font-bold text-white/60 uppercase cursor-pointer"
                    >
                      ₹500 Min
                    </button>
                    <button
                      type="button"
                      onClick={() => setManualBooking(p => ({ ...p, advance_amount: p.agreed_rent }))}
                      className="px-2 py-0.5 rounded bg-green-500/10 border border-green-500/20 text-[8px] font-bold text-green-400 uppercase cursor-pointer"
                    >
                      Full Rent (₹{manualBooking.agreed_rent})
                    </button>
                    <button
                      type="button"
                      onClick={() => setManualBooking(p => ({ ...p, advance_amount: p.agreed_rent + p.deposit_amount }))}
                      className="px-2 py-0.5 rounded bg-green-500/10 border border-green-500/20 text-[8px] font-bold text-green-400 uppercase cursor-pointer"
                    >
                      Rent + Deposit
                    </button>
                  </div>
                </div>
              </div>

              {/* Payment Method & Transaction Note */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1 border-t border-white/5">
                <div className="space-y-1.5">
                  <label className="text-[9px] font-bold text-white/60 uppercase">Payment Method</label>
                  <select 
                    value={manualBooking.payment_method}
                    onChange={(e) => setManualBooking(p => ({ ...p, payment_method: e.target.value as any }))}
                    className="w-full bg-brand-black border border-white/10 rounded-xl p-2.5 text-xs text-white font-bold outline-none focus:border-brand-teal"
                  >
                    <option value="upi">UPI (GPay / PhonePe / QR)</option>
                    <option value="cash">Cash Received at Garage</option>
                    <option value="card">Debit / Credit Card POS</option>
                    <option value="bank_transfer">Bank Transfer / IMPS</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[9px] font-bold text-white/60 uppercase">Payment / Transaction Note</label>
                  <input 
                    type="text" 
                    placeholder="e.g. UPI Ref #12345 / Cash received by manager..."
                    value={manualBooking.payment_note}
                    onChange={(e) => setManualBooking(p => ({ ...p, payment_note: e.target.value }))}
                    className="w-full bg-brand-black border border-white/10 rounded-xl p-2.5 text-xs text-white outline-none focus:border-brand-teal"
                  />
                </div>
              </div>

              {/* Live Discount/Premium Tag Status */}
              {(() => {
                const diff = Number(manualBooking.agreed_rent) - Number(manualBooking.standard_rent);
                if (diff < 0) {
                  return (
                    <div className="p-3 bg-green-500/10 border border-green-500/30 rounded-xl flex items-center gap-2.5 text-xs">
                      <span className="px-2 py-0.5 rounded bg-green-500 text-black text-[9px] font-black uppercase">
                        Discount Tag -₹{Math.abs(diff)}
                      </span>
                      <span className="text-white/80 text-[11px]">
                        Agreed rent is ₹{Math.abs(diff)} below standard tariff. Automatically logged in accounting ledger.
                      </span>
                    </div>
                  );
                }
                if (diff > 0) {
                  return (
                    <div className="p-3 bg-brand-orange/10 border border-brand-orange/30 rounded-xl flex items-center gap-2.5 text-xs">
                      <span className="px-2 py-0.5 rounded bg-brand-orange text-white text-[9px] font-black uppercase">
                        Premium Tag +₹{diff}
                      </span>
                      <span className="text-white/80 text-[11px]">
                        Agreed rent is ₹{diff} higher than standard tariff.
                      </span>
                    </div>
                  );
                }
                return null;
              })()}

              {/* Financial 4-way settlement breakdown */}
              <div className="bg-brand-black p-4 rounded-xl border border-white/10 grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                <div>
                  <span className="text-[8px] font-black text-white/40 uppercase tracking-wider block">Agreed Rent</span>
                  <span className="text-base font-heading text-white">₹{manualBooking.agreed_rent}</span>
                </div>
                <div className="sm:border-l border-white/10">
                  <span className="text-[8px] font-black text-brand-teal uppercase tracking-wider block">Deposit Recv.</span>
                  <span className="text-base font-heading text-brand-teal">₹{manualBooking.deposit_amount}</span>
                </div>
                <div className="sm:border-l border-white/10">
                  <span className="text-[8px] font-black text-green-400 uppercase tracking-wider block">Advance Recv.</span>
                  <span className="text-base font-heading text-green-400">₹{manualBooking.advance_amount}</span>
                </div>
                <div className="sm:border-l border-white/10">
                  <span className="text-[8px] font-black text-brand-yellow uppercase tracking-wider block">Balance on Handover</span>
                  <span className="text-base font-heading text-brand-yellow">
                    ₹{Math.max(0, (Number(manualBooking.agreed_rent) + Number(manualBooking.deposit_amount)) - Number(manualBooking.advance_amount))}
                  </span>
                </div>
              </div>
            </div>

            {/* 4. LOGISTICS & HANDOVER ADDRESSES */}
            <div className="bg-brand-black/50 p-6 rounded-2xl border border-white/5 space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-[10px] font-black text-brand-teal uppercase tracking-widest flex items-center gap-1.5">
                  <span>📍</span> 4. Logistics & Handover Locations
                </h4>
                <span className="text-[8px] text-white/40 uppercase">Garage or Home Delivery</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[9px] font-bold text-white/60 uppercase">Pickup Handover</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setManualBooking(p => ({ ...p, pickup_method: 'garage' }))}
                      className={`py-2 px-3 rounded-xl text-[9px] font-black uppercase transition-all cursor-pointer ${
                        manualBooking.pickup_method === 'garage'
                          ? 'bg-brand-teal text-black shadow'
                          : 'bg-white/5 text-white/50 border border-white/10'
                      }`}
                    >
                      Garage Pickup
                    </button>
                    <button
                      type="button"
                      onClick={() => setManualBooking(p => ({ ...p, pickup_method: 'home' }))}
                      className={`py-2 px-3 rounded-xl text-[9px] font-black uppercase transition-all cursor-pointer ${
                        manualBooking.pickup_method === 'home'
                          ? 'bg-brand-teal text-black shadow'
                          : 'bg-white/5 text-white/50 border border-white/10'
                      }`}
                    >
                      Deliver to Home
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[9px] font-bold text-white/60 uppercase">Return Drop</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setManualBooking(p => ({ ...p, drop_method: 'garage' }))}
                      className={`py-2 px-3 rounded-xl text-[9px] font-black uppercase transition-all cursor-pointer ${
                        manualBooking.drop_method === 'garage'
                          ? 'bg-brand-yellow text-black shadow'
                          : 'bg-white/5 text-white/50 border border-white/10'
                      }`}
                    >
                      Garage Drop
                    </button>
                    <button
                      type="button"
                      onClick={() => setManualBooking(p => ({ ...p, drop_method: 'home' }))}
                      className={`py-2 px-3 rounded-xl text-[9px] font-black uppercase transition-all cursor-pointer ${
                        manualBooking.drop_method === 'home'
                          ? 'bg-brand-yellow text-black shadow'
                          : 'bg-white/5 text-white/50 border border-white/10'
                      }`}
                    >
                      Pickup from Home
                    </button>
                  </div>
                </div>
              </div>

              {manualBooking.pickup_method === 'home' && manualBooking.drop_method === 'home' ? (
                <div className="space-y-3 pt-3 border-t border-white/5 animate-fade-in">
                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-brand-teal uppercase">
                      🚚 1. Delivery Address (Start of Ride)
                    </label>
                    <input
                      type="text"
                      placeholder="Delivery address in Kolkata (e.g. Park Street Hotel, Flat No...)"
                      value={manualBooking.delivery_address}
                      onChange={(e) => setManualBooking(p => ({ ...p, delivery_address: e.target.value }))}
                      className="w-full bg-brand-black border border-white/10 rounded-xl p-3 text-xs text-white outline-none focus:border-brand-teal"
                      required
                    />
                  </div>

                  <div className="flex items-center justify-between bg-brand-black/40 p-3 rounded-xl border border-white/5">
                    <span className="text-[9px] font-bold text-white/60 uppercase">Return Pickup Address</span>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setManualBooking(p => ({ ...p, same_address_for_drop: true }))}
                        className={`px-3 py-1 rounded-lg text-[8px] font-black uppercase transition-all cursor-pointer ${
                          manualBooking.same_address_for_drop ? 'bg-brand-teal text-black' : 'text-white/40'
                        }`}
                      >
                        Same Address
                      </button>
                      <button
                        type="button"
                        onClick={() => setManualBooking(p => ({ ...p, same_address_for_drop: false }))}
                        className={`px-3 py-1 rounded-lg text-[8px] font-black uppercase transition-all cursor-pointer ${
                          !manualBooking.same_address_for_drop ? 'bg-brand-orange text-white' : 'text-white/40'
                        }`}
                      >
                        Different Address
                      </button>
                    </div>
                  </div>

                  {!manualBooking.same_address_for_drop && (
                    <div className="space-y-1 animate-fade-in">
                      <label className="text-[9px] font-black text-brand-yellow uppercase">
                        🏁 2. Return Pickup Address (End of Ride)
                      </label>
                      <input
                        type="text"
                        placeholder="Different collection address in Kolkata (e.g. CCU Airport, Salt Lake Office...)"
                        value={manualBooking.return_pickup_address}
                        onChange={(e) => setManualBooking(p => ({ ...p, return_pickup_address: e.target.value }))}
                        className="w-full bg-brand-black border border-white/10 rounded-xl p-3 text-xs text-white outline-none focus:border-brand-yellow"
                        required
                      />
                    </div>
                  )}
                </div>
              ) : manualBooking.pickup_method === 'home' ? (
                <div className="space-y-1 pt-3 border-t border-white/5 animate-fade-in">
                  <label className="text-[9px] font-black text-brand-teal uppercase">
                    🚚 Delivery Address (Start of Ride)
                  </label>
                  <input
                    type="text"
                    placeholder="Delivery address in Kolkata..."
                    value={manualBooking.delivery_address}
                    onChange={(e) => setManualBooking(p => ({ ...p, delivery_address: e.target.value }))}
                    className="w-full bg-brand-black border border-white/10 rounded-xl p-3 text-xs text-white outline-none focus:border-brand-teal"
                    required
                  />
                </div>
              ) : manualBooking.drop_method === 'home' ? (
                <div className="space-y-1 pt-3 border-t border-white/5 animate-fade-in">
                  <label className="text-[9px] font-black text-brand-yellow uppercase">
                    🏁 Return Pickup Address (End of Ride)
                  </label>
                  <input
                    type="text"
                    placeholder="Collection address in Kolkata..."
                    value={manualBooking.return_pickup_address}
                    onChange={(e) => setManualBooking(p => ({ ...p, return_pickup_address: e.target.value }))}
                    className="w-full bg-brand-black border border-white/10 rounded-xl p-3 text-xs text-white outline-none focus:border-brand-yellow"
                    required
                  />
                </div>
              ) : null}
            </div>

            {/* 5. IDENTITY DOCUMENTS (CAN BE TAKEN LATER - COMPLETELY OPTIONAL) */}
            <div className="bg-brand-black/50 p-6 rounded-2xl border border-white/5 space-y-4">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                <h4 className="text-[10px] font-black text-brand-teal uppercase tracking-widest flex items-center gap-1.5">
                  <span>📄</span> 5. Identity Documents (Optional — Can Be Taken Later)
                </h4>
                <span className="text-[8px] text-green-400 uppercase font-bold bg-green-500/10 px-2 py-0.5 rounded border border-green-500/20">
                  ✓ Aadhaar & DL can be collected during vehicle handover
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[9px] font-bold text-white/60 uppercase">Aadhaar Card Number (Optional)</label>
                  <input 
                    type="text" 
                    placeholder="12-digit Aadhaar (or enter later)"
                    value={manualBooking.aadhaar_number}
                    onChange={(e) => setManualBooking(p => ({ ...p, aadhaar_number: e.target.value }))}
                    className="w-full bg-brand-black border border-white/10 rounded-xl p-3 text-xs font-mono text-white outline-none focus:border-brand-teal"
                  />
                  <label className="flex items-center gap-2 cursor-pointer bg-white/5 border border-dashed border-white/10 rounded-xl p-3 hover:border-brand-teal transition-all">
                    <svg className="w-4 h-4 text-brand-teal shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                    </svg>
                    <span className="text-[8px] font-black text-white/50 uppercase tracking-widest truncate">
                      {manualBooking.aadhaar_image ? manualBooking.aadhaar_image.name : 'Upload Aadhaar Photo (Optional)'}
                    </span>
                    <input 
                      type="file" 
                      accept="image/*" 
                      className="hidden" 
                      onChange={(e) => e.target.files?.[0] && setManualBooking(p => ({ ...p, aadhaar_image: e.target.files![0] }))} 
                    />
                  </label>
                </div>

                <div className="space-y-2">
                  <label className="text-[9px] font-bold text-white/60 uppercase">Driving License Number (Optional)</label>
                  <input 
                    type="text" 
                    placeholder="DL Number (or enter later)"
                    value={manualBooking.dl_number}
                    onChange={(e) => setManualBooking(p => ({ ...p, dl_number: e.target.value }))}
                    className="w-full bg-brand-black border border-white/10 rounded-xl p-3 text-xs font-mono text-white outline-none focus:border-brand-teal"
                  />
                  <label className="flex items-center gap-2 cursor-pointer bg-white/5 border border-dashed border-white/10 rounded-xl p-3 hover:border-brand-teal transition-all">
                    <svg className="w-4 h-4 text-brand-teal shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                    </svg>
                    <span className="text-[8px] font-black text-white/50 uppercase tracking-widest truncate">
                      {manualBooking.dl_image ? manualBooking.dl_image.name : 'Upload DL Photo (Optional)'}
                    </span>
                    <input 
                      type="file" 
                      accept="image/*" 
                      className="hidden" 
                      onChange={(e) => e.target.files?.[0] && setManualBooking(p => ({ ...p, dl_image: e.target.files![0] }))} 
                    />
                  </label>
                </div>
              </div>
            </div>

            {/* 6. RIDE STATUS & IMMEDIATE DISPATCH */}
            <div className="bg-brand-black/50 p-6 rounded-2xl border border-white/5 space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-[10px] font-black text-brand-teal uppercase tracking-widest flex items-center gap-1.5">
                  <span>⚡</span> 6. Ride Status & Operational Execution
                </h4>
                <span className="text-[8px] text-white/40 uppercase">Immediate Handover or Reservation</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[9px] font-bold text-white/60 uppercase">Operational Status</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setManualBooking(p => ({ ...p, ride_status: 'booking_confirmed' }))}
                      className={`py-3 px-3 rounded-xl text-[9px] font-black uppercase transition-all cursor-pointer text-center ${
                        manualBooking.ride_status === 'booking_confirmed'
                          ? 'bg-green-500 text-black shadow-lg shadow-green-500/20'
                          : 'bg-white/5 text-white/50 border border-white/10'
                      }`}
                    >
                      ✓ Confirmed (Ready)
                    </button>
                    <button
                      type="button"
                      onClick={() => setManualBooking(p => ({ ...p, ride_status: 'ongoing' }))}
                      className={`py-3 px-3 rounded-xl text-[9px] font-black uppercase transition-all cursor-pointer text-center ${
                        manualBooking.ride_status === 'ongoing'
                          ? 'bg-brand-teal text-black shadow-lg shadow-brand-teal/20'
                          : 'bg-white/5 text-white/50 border border-white/10'
                      }`}
                    >
                      🚀 Start Ride Now
                    </button>
                  </div>
                  <p className="text-[8px] text-white/30 uppercase mt-1">
                    {manualBooking.ride_status === 'ongoing' ? 'Sets machine to On Trip immediately' : 'Reserves machine slot on schedule'}
                  </p>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[9px] font-bold text-white/60 uppercase">Starting Odometer (KM)</label>
                  <input 
                    type="number"
                    min="0"
                    placeholder="e.g. 12500"
                    value={manualBooking.start_odometer || ''}
                    onChange={(e) => setManualBooking(p => ({ ...p, start_odometer: parseFloat(e.target.value) || 0 }))}
                    className="w-full bg-brand-black border border-white/10 rounded-xl p-3 text-xs font-mono font-bold text-white outline-none focus:border-brand-teal"
                  />
                  <p className="text-[8px] text-white/30 uppercase">Pre-filled from vehicle odometer</p>
                </div>
              </div>

              {/* Handover inspection notes & photo */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                <div className="space-y-1.5">
                  <label className="text-[9px] font-bold text-white/60 uppercase">Handover Notes / Inspection</label>
                  <textarea 
                    placeholder="e.g. 2 Helmets provided, scratch on silencer, 80% fuel..."
                    value={manualBooking.admin_notes}
                    onChange={(e) => setManualBooking(p => ({ ...p, admin_notes: e.target.value }))}
                    className="w-full bg-brand-black border border-white/10 rounded-xl p-2.5 text-xs text-white resize-none h-16 outline-none focus:border-brand-teal"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[9px] font-bold text-white/60 uppercase">Customer Handover Photo (Optional)</label>
                  <label className="flex flex-col items-center justify-center cursor-pointer bg-white/5 border border-dashed border-white/10 rounded-xl p-3 hover:border-brand-teal transition-all h-16">
                    <span className="text-[9px] font-bold text-white/60 truncate">
                      {manualBooking.handover_image ? manualBooking.handover_image.name : 'Click to take/upload rider photo'}
                    </span>
                    <input 
                      type="file" 
                      accept="image/*" 
                      className="hidden" 
                      onChange={(e) => e.target.files?.[0] && setManualBooking(p => ({ ...p, handover_image: e.target.files![0] }))} 
                    />
                  </label>
                </div>
              </div>
            </div>

            {/* ACTION BUTTONS */}
            <div className="flex gap-4 pt-2">
              <button
                type="button"
                onClick={() => setShowManualModal(false)}
                className="flex-1 py-4 bg-white/5 hover:bg-white/10 text-white/60 text-[10px] font-black uppercase rounded-2xl transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button 
                type="submit"
                className="flex-[2] py-4 bg-brand-teal hover:bg-brand-teal/90 text-brand-black font-black uppercase text-[11px] tracking-wider rounded-2xl shadow-xl hover:scale-[1.01] transition-all cursor-pointer shadow-brand-teal/20"
              >
                Submit Manual Request
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};
