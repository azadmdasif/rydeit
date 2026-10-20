
import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../../supabase';
import { useToast } from '../../App';
import { GOOGLE_MAPS_REVIEW_LINK, UPI_ID, GARAGE_MAPS_LINK, GARAGE_ADDRESS } from '../../constants';
import { getFleetBikes } from '../../fleetStorage';
import { ensureCustomerProfile } from '../../profileSync';
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

  // Pillion & Emergency contact modal state
  const [pillionModalOpen, setPillionModalOpen] = useState(false);
  const [pillionForm, setPillionForm] = useState({
    pillion_name: '',
    pillion_phone: '',
    pillion_aadhaar_number: '',
    emergency_contact_phone: '',
    pillion_aadhaar_file: null as File | null,
    pillion_aadhaar_url: '',
    saving: false
  });

  // Local storage helpers for instant pillion caching & cross-device preparation
  const getLocalPillionData = (id: string | number) => {
    try {
      const raw = localStorage.getItem(`rydeit_pillion_${id}`);
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  };

  const saveLocalPillionData = (id: string | number, data: any) => {
    try {
      localStorage.setItem(`rydeit_pillion_${id}`, JSON.stringify(data));
    } catch (e) {
      console.error('Failed to save to local storage', e);
    }
  };

  // Edit Booking details modal state (Admin can edit name, dates, vehicle, phone, rent, etc.)
  const [editingBooking, setEditingBooking] = useState<any | null>(null);
  const [editForm, setEditForm] = useState({
    customer_name: '',
    customer_phone: '',
    customer_email: '',
    has_pillion: false,
    pillion_name: '',
    pillion_phone: '',
    pillion_aadhaar_number: '',
    emergency_contact_phone: '',
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

  const [manualBooking, setManualBooking] = useState({
    bike_id: BIKES[0]?.id || 15,
    customer_name: '',
    customer_phone: '',
    customer_email: '',
    has_pillion: false,
    pillion_name: '',
    pillion_phone: '',
    pillion_aadhaar_number: '',
    emergency_contact_phone: '',
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
    ride_status: 'pending_payment' as 'pending_payment' | 'booking_confirmed' | 'ongoing',
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
    if (statusFilter === 'pending') query = query.in('status', ['pending_payment', 'payment_pending', 'pending']);
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
      const enriched = data.map((b: any) => {
        const local = getLocalPillionData(b.readable_id || b.id);
        const hasPillion = b.has_pillion !== undefined && b.has_pillion !== null
          ? Boolean(b.has_pillion)
          : (local.has_pillion !== undefined && local.has_pillion !== null
              ? Boolean(local.has_pillion)
              : Boolean(b.pillion_name || local.pillion_name));
        return {
          ...b,
          has_pillion: hasPillion,
          pillion_name: b.pillion_name || local.pillion_name || null,
          pillion_phone: b.pillion_phone || local.pillion_phone || null,
          pillion_aadhaar_number: b.pillion_aadhaar_number || local.pillion_aadhaar_number || null,
          pillion_aadhaar_url: b.pillion_aadhaar_url || local.pillion_aadhaar_url || null,
          emergency_contact_phone: b.emergency_contact_phone || local.emergency_contact_phone || null
        };
      });

      if (statusFilter === 'overdue') {
        const currentNow = new Date();
        const overdue = enriched.filter(b => {
          if (b.status !== 'ongoing') return false;
          const returnDate = new Date(`${b.return_date}T${b.return_time}`);
          return returnDate < currentNow;
        });
        setBookings(overdue);
      } else {
        setBookings(enriched);
      }

      // If a booking is currently selected in Operations modal, keep it fresh
      setSelectedBooking((prev: any) => {
        if (!prev) return null;
        const matching = enriched.find(b => b.id === prev.id || (b.readable_id && b.readable_id === prev.readable_id));
        return matching ? { ...prev, ...matching } : prev;
      });
    }
    setLoading(false);
  };

  // Pillion completeness check: if customer requested a pillion, name, mobile, aadhaar and emergency contact are mandatory before dispatch
  const isPillionIncomplete = (booking: any) => {
    if (!booking?.has_pillion) return false;
    const hasName = Boolean(booking.pillion_name && booking.pillion_name.trim());
    const hasPhone = Boolean(booking.pillion_phone && booking.pillion_phone.trim());
    const hasAadhaar = Boolean((booking.pillion_aadhaar_number && booking.pillion_aadhaar_number.trim()) || booking.pillion_aadhaar_url);
    const hasEmergency = Boolean(booking.emergency_contact_phone && booking.emergency_contact_phone.trim());
    return !hasName || !hasPhone || !hasAadhaar || !hasEmergency;
  };

  const getMissingPillionFields = (booking: any) => {
    const missing: string[] = [];
    if (!booking?.pillion_name?.trim()) missing.push('Pillion Name');
    if (!booking?.pillion_phone?.trim()) missing.push('Mobile Number');
    if (!booking?.pillion_aadhaar_number?.trim() && !booking?.pillion_aadhaar_url) missing.push('Aadhaar Document / Number');
    if (!booking?.emergency_contact_phone?.trim()) missing.push('Emergency Contact Number');
    return missing;
  };

  const getStatusSuccessMessage = (status: string, bookingRef: string, customerName?: string) => {
    const nameStr = customerName ? ` for ${customerName}` : '';
    switch (status) {
      case 'ongoing':
        return `Ride ${bookingRef}${nameStr} dispatch successfully done! Status is now ONGOING.`;
      case 'completed':
        return `Ride ${bookingRef}${nameStr} return & completion successfully done! Machine received.`;
      case 'cancelled':
        return `Booking ${bookingRef}${nameStr} cancellation successfully done! Vehicle slot released.`;
      case 'booking_confirmed':
        return `Booking ${bookingRef}${nameStr} confirmation successfully done! Payment recorded.`;
      case 'pending_payment':
        return `Booking ${bookingRef} status updated to Pending Payment successfully done!`;
      default:
        return `Booking ${bookingRef}: Status "${status.replace(/_/g, ' ').toUpperCase()}" successfully done!`;
    }
  };

  const updateStatus = async (id: any, status: string, reason?: string) => {
    const target = (selectedBooking && (String(selectedBooking.id) === String(id) || selectedBooking.readable_id === id))
      ? selectedBooking
      : bookings.find(b => String(b.id) === String(id) || b.readable_id === id);

    // BLOCK DISPATCH IF CUSTOMER HAS A PILLION BUT DETAILS ARE MISSING
    if (status === 'ongoing' && target) {
      if (isPillionIncomplete(target)) {
        const missing = getMissingPillionFields(target);
        showToast(`Cannot dispatch: Customer has a pillion co-rider. Please add missing details first: ${missing.join(', ')}.`, 'error');
        if (target) {
          handleOpenPillionModal(target);
        }
        return;
      }
    }

    const readableId = target?.readable_id || String(id);
    const customerName = target?.customer_name;

    const updates: any = { status };
    if (reason) updates.admin_notes = reason;
    if (status === 'ongoing') updates.start_timestamp = new Date().toISOString();
    if (status === 'completed') updates.end_timestamp = new Date().toISOString();

    // 1. Instantly update local state for immediate visual feedback
    setBookings(prev => prev.map(b => {
      if (String(b.id) === String(id) || b.readable_id === readableId) {
        return { ...b, ...updates };
      }
      return b;
    }));

    if (selectedBooking && (String(selectedBooking.id) === String(id) || selectedBooking.readable_id === readableId)) {
      setSelectedBooking((prev: any) => prev ? { ...prev, ...updates } : null);
    }

    // 2. Persist to Supabase with dual fallback (readable_id first, then numeric/string id)
    let updateError: any = null;
    let updateSucceeded = false;
    
    if (target?.readable_id) {
      const { data, error } = await supabase
        .from('bookings')
        .update(updates)
        .eq('readable_id', target.readable_id)
        .select('id, readable_id, status');
      if (!error && data && data.length > 0) {
        updateSucceeded = true;
      } else {
        updateError = error;
      }
    }
    
    if (!updateSucceeded) {
      const numericId = !isNaN(Number(id)) ? Number(id) : id;
      const { data, error: idError } = await supabase
        .from('bookings')
        .update(updates)
        .eq('id', numericId)
        .select('id, readable_id, status');
      if (!idError && data && data.length > 0) {
        updateSucceeded = true;
        updateError = null;
      } else {
        updateError = idError || updateError;
      }
    }

    if (updateError && !updateSucceeded) {
      console.error('Supabase booking update error:', updateError);
      showToast(`Database error: ${updateError.message || 'Failed to persist status change'}`, 'error');
      fetchBookings();
      return;
    }

    // 3. Prominent success popup saying "---- successfully done!"
    const successMsg = getStatusSuccessMessage(status, readableId, customerName);
    showToast(successMsg, 'success');

    // If completed, trigger WhatsApp review request
    if (status === 'completed' && target) {
      const message = `Hi ${target.customer_name}, thank you for riding with Rydeit! We hope you had a great experience. We'd love to hear your feedback. Please leave us a review on Google Maps: ${GOOGLE_MAPS_REVIEW_LINK}`;
      const whatsappUrl = `https://wa.me/${target.customer_phone.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`;
      window.open(whatsappUrl, '_blank');
    }

    fetchBookings();
    if (selectedBooking && (String(selectedBooking.id) === String(id) || selectedBooking.readable_id === readableId)) {
      const { data } = await supabase.from('bookings').select('*').eq('readable_id', readableId).maybeSingle();
      if (data) setSelectedBooking(data);
    }
  };

  const isPaymentPending = (status: string) => {
    return status === 'pending_payment' || status === 'payment_pending' || status === 'pending';
  };

  const handleSendWhatsAppReminder = (booking: any) => {
    const bike = fleetBikes.find(b => b.id === booking.bike_id);
    const bikeName = bike?.name || 'Rydeit Machine';
    const paymentId = booking.readable_id || `RYDE-${booking.id}`;
    const totalAmount = (Number(booking.total_rent) || 0) + (Number(booking.adjustment_amount) || 0);
    const advanceAmount = booking.advance_amount && Number(booking.advance_amount) > 0 
      ? Number(booking.advance_amount) 
      : 500;
    const upiId = UPI_ID || '9831846183@ybl';
    
    const pickupTimeStr = booking.pickup_time || '10:00';
    const returnTimeStr = booking.return_time || '20:00';
    
    let logisticsInfo = '';
    if (booking.needs_delivery && booking.address) {
      const cleanAddr = booking.address.split('|')[0]?.replace('Delivery:', '').trim() || booking.address;
      logisticsInfo = `\n📍 *Delivery Location:* ${cleanAddr}`;
    } else {
      logisticsInfo = `\n📍 *Pickup Location / Garage Address:* ${GARAGE_ADDRESS}\n🗺️ *Google Maps:* ${GARAGE_MAPS_LINK}`;
    }

    const message = `*RYDEIT - BOOKING & PAYMENT DETAILS* 🏍️💨

Dear *${booking.customer_name}*,

Your booking request for *${bikeName}* has been received! Your booking status is currently *PAYMENT PENDING*.

⚠️ *Action Required:* Please send the advance payment of ₹${advanceAmount} to officially reserve and guarantee your booking slot. Unreserved slots are released to other riders on a first-come, first-served basis.

📋 *Booking Details:*
• *Payment ID / Ref:* ${paymentId}
• *Machine:* ${bikeName}
• *Pickup:* ${booking.pickup_date} @ ${pickupTimeStr}
• *Return:* ${booking.return_date} @ ${returnTimeStr}${logisticsInfo}
• *Total Rental Amount:* ₹${totalAmount}
• *Advance Required to Reserve Slot:* ₹${advanceAmount}
• *Refundable Deposit:* ₹1,000 (payable at vehicle handover)

💳 *How to Pay:*
1. Transfer *₹${advanceAmount}* via UPI to: *${upiId}*
2. Mention Payment ID in remarks/notes: *${paymentId}*
3. Reply to this chat with your payment screenshot or transaction UTR.

Once payment is verified, your booking slot will be officially confirmed!

Need assistance? Call/WhatsApp us at +91 76860 22245
Team Rydeit Kolkata`;

    const rawPhone = (booking.customer_phone || '').replace(/\D/g, '');
    if (!rawPhone) {
      showToast("No customer phone number found for this booking.", "error");
      return;
    }
    const cleanPhone = rawPhone.length === 10 ? `91${rawPhone}` : rawPhone.startsWith('91') ? rawPhone : `91${rawPhone}`;
    const whatsappUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
    showToast(`WhatsApp reminder opened for ${booking.customer_name}!`, "success");
  };

  const handleSendTermsAndRefundPolicy = (booking: any) => {
    const bike = fleetBikes.find(b => b.id === booking.bike_id);
    const bikeName = bike?.name || 'Rydeit Machine';
    const paymentId = booking.readable_id || `RYDE-${booking.id}`;

    const message = `*RYDEIT - TERMS, CONDITIONS & REFUND POLICY* 📄🏍️💨

Dear *${booking.customer_name}*,

Thank you for choosing Rydeit Rentals! Please review our official Rental Terms, Conditions, and Cancellation Refund Policy for your reservation (Ref: *${paymentId}*, Machine: *${bikeName}*):

📋 *1. CANCELLATION & REFUND POLICY:*
Refunds on the booking advance are processed based on the cancellation time before departure:
• *96 hours or more before departure:* 100% Return
• *72 to 96 hours before departure:* 75% Refund
• *48 to 72 hours before departure:* 50% Refund
• *24 to 48 hours before departure:* 25% Return
• *Less than 24 hours before departure:* No Refund
• *Cancellation by Rydeit:* 100% Full Refund issued immediately.
• *No-Show:* Failure to arrive within 2 hours of scheduled pickup without prior notice results in full advance forfeiture.

⚙️ *2. KEY RENTAL TERMS & CONDITIONS:*
• *Operating Hours:* 06:00 AM to 10:00 PM daily. Pickups/returns outside 08:00 AM – 08:00 PM incur a convenience surcharge of ₹99.
• *Late Return Penalty:* Returning vehicle after scheduled drop-off time incurs *₹120 per hour*.
• *Breakdown & Service Coverage:* Mechanical support and fixing services are provided strictly within a 5 KM radius of our main garage. Beyond 5 KM, vehicle towing and logistics are the rider's responsibility.
• *Refundable Security Deposit:* ₹1,000 security deposit is mandatory at machine handover. A walk-around video inspection is conducted at pickup; any new physical damage will forfeit deposit.
• *Legal Compliance:* Helmets are mandatory. All traffic fines, speeding tickets, or e-challans generated during the rental duration are 100% the rider's responsibility. Racing, stunting, or illegal transport is strictly prohibited.

By booking with Rydeit Rentals, you agree to comply with all safety and traffic laws.
Helpline / Enquiries: +91 76860 22245
Team Rydeit Kolkata`;

    const rawPhone = (booking.customer_phone || '').replace(/\D/g, '');
    if (!rawPhone) {
      showToast("No customer phone number found for this booking.", "error");
      return;
    }
    const cleanPhone = rawPhone.length === 10 ? `91${rawPhone}` : rawPhone.startsWith('91') ? rawPhone : `91${rawPhone}`;
    const whatsappUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
    showToast(`Terms & Refund Policy sent to ${booking.customer_name}!`, "success");
  };

  const handleSendBookingConfirmation = (booking: any) => {
    const bike = fleetBikes.find(b => b.id === booking.bike_id);
    const bikeName = bike?.name || 'Rydeit Machine';
    const paymentId = booking.readable_id || `RYDE-${booking.id}`;
    const totalAmount = (Number(booking.total_rent) || 0) + (Number(booking.adjustment_amount) || 0);
    const advancePaid = Number(booking.advance_amount) || 500;
    const balanceDue = Math.max(0, totalAmount - advancePaid);
    
    const pickupTimeStr = booking.pickup_time || '10:00';
    const returnTimeStr = booking.return_time || '20:00';
    
    let logisticsInfo = '';
    if (booking.needs_delivery && booking.address) {
      const cleanAddr = booking.address.split('|')[0]?.replace('Delivery:', '').trim() || booking.address;
      logisticsInfo = `\n📍 *Doorstep Delivery Address:* ${cleanAddr}`;
    } else {
      logisticsInfo = `\n📍 *Pickup Location / Garage Address:* ${GARAGE_ADDRESS}\n🗺️ *Google Maps:* ${GARAGE_MAPS_LINK}`;
    }

    const message = `*RYDEIT - BOOKING CONFIRMED* ✅🏍️💨

Dear *${booking.customer_name}*,

Congratulations! Your reservation for *${bikeName}* is officially *BOOKING CONFIRMED* & reserved.

📋 *Confirmed Booking Summary:*
• *Booking ID / Reference:* ${paymentId}
• *Machine:* ${bikeName}
• *Pickup Schedule:* ${booking.pickup_date} @ ${pickupTimeStr}
• *Return Schedule:* ${booking.return_date} @ ${returnTimeStr}${logisticsInfo}
• *Total Rental Tariff:* ₹${totalAmount}
• *Advance Paid:* ₹${advancePaid} (CONFIRMED ✓)
• *Balance Due at Handover:* ₹${balanceDue}
• *Refundable Security Deposit:* ₹1,000 (payable at pickup)

🪪 *Mandatory for Pickup:*
1. Original Driving License (DL)
2. Original Aadhaar Card
3. A walk-around inspection video will be recorded with you prior to ride start.

📍 *Garage Location & Google Maps:* ${GARAGE_MAPS_LINK}
(${GARAGE_ADDRESS})
📞 *Support Helpline:* +91 76860 22245

We can't wait to hand over your machine. Have an incredible ride!
Team Rydeit Rentals`;

    const rawPhone = (booking.customer_phone || '').replace(/\D/g, '');
    if (!rawPhone) {
      showToast("No customer phone number found for this booking.", "error");
      return;
    }
    const cleanPhone = rawPhone.length === 10 ? `91${rawPhone}` : rawPhone.startsWith('91') ? rawPhone : `91${rawPhone}`;
    const whatsappUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
    showToast(`Booking confirmation sent to ${booking.customer_name}!`, "success");
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
      has_pillion: false,
      pillion_name: '',
      pillion_phone: '',
      pillion_aadhaar_number: '',
      emergency_contact_phone: '',
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
      ride_status: 'pending_payment',
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
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!manualBooking.customer_email.trim() || !emailRegex.test(manualBooking.customer_email.trim())) {
      showToast('Valid Customer Email is mandatory for creating all bookings', 'warning');
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
      .in('status', ['booking_confirmed', 'ongoing']);

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
        status: manualBooking.ride_status || 'pending_payment',
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

      const pillionExtra = {
        pillion_name: manualBooking.pillion_name.trim() || null,
        pillion_phone: manualBooking.pillion_phone.trim() || null,
        pillion_aadhaar_number: manualBooking.pillion_aadhaar_number.trim() || null,
        emergency_contact_phone: manualBooking.emergency_contact_phone.trim() || null
      };

      if (manualBooking.pillion_name.trim() || manualBooking.pillion_phone.trim() || manualBooking.emergency_contact_phone.trim() || manualBooking.pillion_aadhaar_number.trim()) {
        saveLocalPillionData(readableId, pillionExtra);
      }

      // Try insert with pillion fields first
      let { error } = await supabase.from('bookings').insert({ ...bookingPayload, ...pillionExtra });
      if (error && (error.code === '42703' || error.message?.includes('column') || error.code === 'PGRST204')) {
        console.warn('Pillion columns not yet in Supabase schema, inserting booking and saving pillion locally');
        const fallback = await supabase.from('bookings').insert(bookingPayload);
        error = fallback.error;
      }
      if (error) throw error;

      // Ensure each payment-confirmed or registered booking gets a profile in public.profiles
      if (manualBooking.ride_status === 'booking_confirmed' || manualBooking.ride_status === 'ongoing' || Number(manualBooking.advance_amount) > 0) {
        try {
          await ensureCustomerProfile({
            email: manualBooking.customer_email.trim(),
            full_name: manualBooking.customer_name.trim(),
            phone: manualBooking.customer_phone.trim(),
            dl_number: manualBooking.dl_number.trim() || null,
            aadhaar_number: manualBooking.aadhaar_number.trim() || null,
            dl_url: dl_url || null,
            aadhaar_url: aadhaar_url || null
          });
        } catch (profileErr) {
          console.warn('Profile sync notice:', profileErr);
        }
      }

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

  const handleOpenPillionModal = (booking?: any) => {
    const b = booking || selectedBooking;
    if (!b) return;
    const local = getLocalPillionData(b.readable_id || b.id);
    setPillionForm({
      pillion_name: b.pillion_name || local.pillion_name || '',
      pillion_phone: b.pillion_phone || local.pillion_phone || '',
      pillion_aadhaar_number: b.pillion_aadhaar_number || local.pillion_aadhaar_number || '',
      emergency_contact_phone: b.emergency_contact_phone || local.emergency_contact_phone || '',
      pillion_aadhaar_file: null,
      pillion_aadhaar_url: b.pillion_aadhaar_url || local.pillion_aadhaar_url || '',
      saving: false
    });
    setPillionModalOpen(true);
  };

  const handleSavePillionForSelectedBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBooking) return;
    setPillionForm(p => ({ ...p, saving: true }));

    try {
      let pillion_aadhaar_url = pillionForm.pillion_aadhaar_url || selectedBooking.pillion_aadhaar_url || '';

      if (pillionForm.pillion_aadhaar_file) {
        const file = pillionForm.pillion_aadhaar_file;
        const fileExt = file.name.split('.').pop();
        const fileName = `pillion_aadhaar_${selectedBooking.readable_id}_${Date.now()}.${fileExt}`;
        const filePath = `manual-docs/${fileName}`;
        const { error: uploadError } = await supabase.storage.from('booking-docs').upload(filePath, file);
        if (!uploadError) {
          const { data: { publicUrl } } = supabase.storage.from('booking-docs').getPublicUrl(filePath);
          pillion_aadhaar_url = publicUrl;
        } else {
          // Base64 fallback if storage bucket or policy isn't configured yet
          pillion_aadhaar_url = await new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.readAsDataURL(file);
          });
        }
      }

      const pillionPayload: any = {
        has_pillion: true,
        pillion_name: pillionForm.pillion_name.trim() || null,
        pillion_phone: pillionForm.pillion_phone.trim() || null,
        pillion_aadhaar_number: pillionForm.pillion_aadhaar_number.trim() || null,
        pillion_aadhaar_url: pillion_aadhaar_url || null,
        emergency_contact_phone: pillionForm.emergency_contact_phone.trim() || null
      };

      // Always save locally immediately for cross-device preparation & offline resilience
      saveLocalPillionData(selectedBooking.readable_id || selectedBooking.id, pillionPayload);

      // Try updating in Supabase
      const { error } = await supabase
        .from('bookings')
        .update(pillionPayload)
        .eq('id', selectedBooking.id);

      if (error) {
        console.warn('Supabase pillion update notice:', error);
        if (error.code === '42703' || error.message?.includes('column') || error.code === 'PGRST204') {
          showToast('Pillion details saved locally! Run the provided SQL migration in Supabase to sync across all devices.', 'warning');
        } else {
          throw error;
        }
      } else {
        showToast('Pillion & emergency contact details saved and synced across devices!', 'success');
      }

      const updated = {
        ...selectedBooking,
        ...pillionPayload
      };
      setSelectedBooking(updated);
      setBookings(prev => prev.map(b => (b.id === selectedBooking.id ? { ...b, ...pillionPayload } : b)));
      setPillionModalOpen(false);
    } catch (err: any) {
      showToast(err.message || 'Failed to save pillion details', 'error');
    } finally {
      setPillionForm(p => ({ ...p, saving: false }));
    }
  };

  const handleCopySupabaseSql = () => {
    const sql = `-- RYDEIT: PILLION DETAILS & EMERGENCY CONTACT BACKEND MIGRATION
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS customer_email TEXT;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS has_pillion BOOLEAN DEFAULT FALSE;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS pillion_name TEXT;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS pillion_phone TEXT;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS pillion_aadhaar_number TEXT;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS pillion_aadhaar_url TEXT;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS emergency_contact_phone TEXT;
CREATE INDEX IF NOT EXISTS idx_bookings_has_pillion ON public.bookings (has_pillion);
NOTIFY pgrst, 'reload schema';`;
    navigator.clipboard.writeText(sql);
    showToast('Supabase SQL copied to clipboard! Paste and Run in Supabase SQL Editor.', 'success');
  };

  const handleOpenEditModal = (booking: any) => {
    setEditingBooking(booking);
    const local = getLocalPillionData(booking.readable_id || booking.id);
    setEditForm({
      customer_name: booking.customer_name || '',
      customer_phone: booking.customer_phone || '',
      customer_email: booking.customer_email || '',
      has_pillion: booking.has_pillion !== undefined ? Boolean(booking.has_pillion) : Boolean(local.has_pillion),
      pillion_name: booking.pillion_name || local.pillion_name || '',
      pillion_phone: booking.pillion_phone || local.pillion_phone || '',
      pillion_aadhaar_number: booking.pillion_aadhaar_number || local.pillion_aadhaar_number || '',
      emergency_contact_phone: booking.emergency_contact_phone || local.emergency_contact_phone || '',
      bike_id: Number(booking.bike_id) || fleetBikes[0]?.id || 15,
      pickup_date: booking.pickup_date || '',
      pickup_time: booking.pickup_time || '10:00',
      return_date: booking.return_date || '',
      return_time: booking.return_time || '20:00',
      total_rent: Number(booking.total_rent) || 0,
      advance_amount: Number(booking.advance_amount) || 0,
      security_deposit: Number(booking.security_deposit) || 1000,
      status: booking.status || 'pending_payment',
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

  const editBikeConflict = useMemo(() => {
    if (!editingBooking || !editForm.pickup_date || !editForm.return_date) return null;
    const reqStart = new Date(`${editForm.pickup_date}T${editForm.pickup_time || '10:00'}`).getTime();
    const reqEnd = new Date(`${editForm.return_date}T${editForm.return_time || '20:00'}`).getTime();
    return bookings.find(b => {
      if (b.id === editingBooking.id) return false;
      if (b.bike_id !== editForm.bike_id) return false;
      // Don't block bookings for any vehicles unless its booking status changes to payment confirmed (booking_confirmed or ongoing)
      if (b.status !== 'booking_confirmed' && b.status !== 'ongoing') return false;
      const exStart = new Date(`${b.pickup_date}T${b.pickup_time || '10:00'}`).getTime();
      const exEnd = new Date(`${b.return_date}T${b.return_time || '20:00'}`).getTime();
      if (isNaN(exStart) || isNaN(exEnd)) return false;
      return reqStart < exEnd && reqEnd > exStart;
    });
  }, [editingBooking, editForm.bike_id, editForm.pickup_date, editForm.pickup_time, editForm.return_date, editForm.return_time, bookings]);

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
    if (editBikeConflict) {
      showToast(`Conflict: Bike already has a payment-confirmed reservation (${editBikeConflict.readable_id || `#${editBikeConflict.id}`}). Unconfirmed bookings do not block slots.`, 'error');
      return;
    }

    setSavingEdit(true);
    try {
      const updates: any = {
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
        has_pillion: Boolean(editForm.has_pillion)
      };

      const pillionData = {
        has_pillion: Boolean(editForm.has_pillion),
        pillion_name: editForm.has_pillion ? (editForm.pillion_name.trim() || null) : null,
        pillion_phone: editForm.has_pillion ? (editForm.pillion_phone.trim() || null) : null,
        pillion_aadhaar_number: editForm.has_pillion ? (editForm.pillion_aadhaar_number.trim() || null) : null,
        emergency_contact_phone: editForm.has_pillion ? (editForm.emergency_contact_phone.trim() || null) : null
      };

      // Cache locally immediately
      saveLocalPillionData(editingBooking.readable_id || editingBooking.id, pillionData);

      // Attempt update with pillion columns first
      let { error } = await supabase
        .from('bookings')
        .update({ ...updates, ...pillionData })
        .eq('id', editingBooking.id);

      // If columns don't exist in Supabase yet, retry with base updates so user is not blocked
      if (error && (error.code === '42703' || error.message?.includes('column') || error.code === 'PGRST204')) {
        console.warn('Pillion columns not yet in Supabase schema, saving base booking and caching pillion locally');
        const fallback = await supabase.from('bookings').update(updates).eq('id', editingBooking.id);
        error = fallback.error;
      }

      if (error) throw error;

      showToast(`Booking ${editingBooking.readable_id || `#${editingBooking.id}`} update successfully done!`, "success");
      setEditingBooking(null);
      await fetchBookings();
      if (selectedBooking?.id === editingBooking.id) {
        setSelectedBooking((prev: any) => prev ? { ...prev, ...updates, ...pillionData } : null);
      }
    } catch (err: any) {
      console.error("Error updating booking:", err);
      showToast(`Failed to update booking: ${err.message || 'Unknown error'}`, "error");
    } finally {
      setSavingEdit(false);
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

      // 1. Optimistically update local state immediately
      setBookings(prev => prev.map(b => (b.id === selectedBooking.id || b.readable_id === selectedBooking.readable_id) ? { ...b, ...updates } : b));
      setSelectedBooking((prev: any) => prev ? { ...prev, ...updates } : null);

      // 2. Persist to Supabase (by readable_id first, then id)
      let updateError: any = null;
      if (selectedBooking.readable_id) {
        const { error } = await supabase.from('bookings').update(updates).eq('readable_id', selectedBooking.readable_id);
        updateError = error;
      }
      if (updateError || !selectedBooking.readable_id) {
        const numericId = !isNaN(Number(selectedBooking.id)) ? Number(selectedBooking.id) : selectedBooking.id;
        const { error: idError } = await supabase.from('bookings').update(updates).eq('id', numericId);
        updateError = idError;
      }

      if (updateError) throw updateError;

      // Ensure payment confirmed booking gets a profile in public.profiles safely
      if (selectedBooking.customer_email) {
        try {
          await ensureCustomerProfile({
            email: selectedBooking.customer_email,
            full_name: selectedBooking.customer_name,
            phone: selectedBooking.customer_phone,
            dl_number: selectedBooking.dl_number,
            aadhaar_number: selectedBooking.aadhaar_number,
            dl_url: selectedBooking.dl_url,
            aadhaar_url: selectedBooking.aadhaar_url
          });
        } catch (profErr) {
          console.warn('Profile sync notice on confirm payment:', profErr);
        }
      }

      const tagText = diff < 0 ? ` (Discount: ₹${Math.abs(diff)})` : diff > 0 ? ` (Premium: ₹${diff})` : '';
      showToast(`Payment Confirmation successfully done! Booking ${selectedBooking.readable_id} is now CONFIRMED. Advance: ₹${advancePaid}, Agreed Rent: ₹${agreedRent}, Deposit: ₹${depositAmount}${tagText}`, 'success');

      setShowConfirmPaymentModal(false);
      fetchBookings();

      const { data } = await supabase.from('bookings').select('*').eq('readable_id', selectedBooking.readable_id).maybeSingle();
      if (data) setSelectedBooking(data);
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
    <div className="animate-fade-in space-y-6 max-w-7xl mx-auto">
      {/* Header & Main Filters */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-5 border-b border-slate-800/80 pb-6">
        <div>
          <h2 className="text-3xl font-heading text-slate-100 tracking-wide">Rides & Bookings Ledger</h2>
          <p className="text-xs font-medium text-slate-400 mt-1">Live database of bookings, dispatch status, payment verifications, and ride history</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button 
            onClick={handleOpenManualModal}
            className="px-4 py-2.5 bg-orange-600 hover:bg-orange-500 text-white rounded-xl text-xs font-semibold transition-all shadow-sm cursor-pointer"
          >
            + Create Booking
          </button>
          
          <div className="flex flex-wrap gap-1 p-1 bg-slate-100 border border-slate-200 rounded-xl">
            {['all', 'pending', 'confirmed', 'running', 'overdue', 'completed', 'cancelled'].map(f => (
              <button 
                key={f} 
                onClick={() => setStatusFilter(f)} 
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold tracking-wide transition-all cursor-pointer ${
                  statusFilter === f 
                    ? (f === 'overdue' || f === 'cancelled' ? 'bg-rose-600 text-white font-bold shadow-xs' : f === 'confirmed' ? 'bg-sky-600 text-white font-bold shadow-xs' : 'bg-orange-500 text-white font-bold shadow-xs') 
                    : 'text-slate-700 hover:text-slate-900 hover:bg-slate-200/80'
                }`}
              >
                {f === 'confirmed' ? 'Payment Confirmed' : f === 'running' ? 'Active Ride' : f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Time Based Filters */}
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex flex-wrap gap-2">
          {[
            { id: 'all_time', label: 'All Time' },
            { id: 'today', label: 'Today' },
            { id: 'yesterday', label: 'Yesterday' },
            { id: 'this_week', label: 'This Week' },
            { id: 'this_month', label: 'This Month' },
            { id: 'custom', label: 'Custom Range' }
          ].map(range => (
            <button 
              key={range.id}
              onClick={() => setTimeRange(range.id as TimeRange)}
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-all border ${
                timeRange === range.id 
                ? 'bg-slate-900 text-white border-slate-900 shadow-xs font-bold' 
                : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              {range.label}
            </button>
          ))}
        </div>

        {timeRange === 'custom' && (
          <div className="flex items-center gap-3 bg-slate-50 p-2 rounded-xl border border-slate-200">
            <div className="flex items-center gap-2 px-2">
              <span className="text-xs font-medium text-slate-500">From</span>
              <input 
                type="date" 
                value={customRange.start} 
                onChange={(e) => setCustomRange(p => ({...p, start: e.target.value}))}
                className="bg-transparent text-xs font-bold text-slate-800 outline-none cursor-pointer" 
              />
            </div>
            <div className="w-px h-5 bg-slate-200"></div>
            <div className="flex items-center gap-2 px-2">
              <span className="text-xs font-medium text-slate-500">To</span>
              <input 
                type="date" 
                value={customRange.end} 
                onChange={(e) => setCustomRange(p => ({...p, end: e.target.value}))}
                className="bg-transparent text-xs font-bold text-slate-800 outline-none cursor-pointer" 
              />
            </div>
          </div>
        )}
      </div>

      {/* Bookings Table - Crisp White Background & Natural Contrast */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50 text-xs font-bold uppercase tracking-wider text-slate-700 border-b border-slate-200">
              <tr>
                <th className="px-6 py-4">Rider & Vehicle</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Schedule</th>
                <th className="px-6 py-4">Financials</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={5} className="py-16 text-center">
                    <div className="w-8 h-8 border-2 border-orange-500/30 border-t-orange-500 rounded-full animate-spin mx-auto mb-3"></div>
                    <p className="text-xs font-medium text-slate-500">Loading booking records...</p>
                  </td>
                </tr>
              ) : bookings.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-16 text-center">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">No Bookings Found in Selected Period</p>
                  </td>
                </tr>
              ) : (
                bookings.map(booking => {
                  const bike = BIKES.find(b => b.id === booking.bike_id);
                  const isOverdue = booking.status === 'ongoing' && new Date(`${booking.return_date}T${booking.return_time}`) < new Date();
                  
                  return (
                    <tr key={booking.id} className="hover:bg-slate-50/80 transition-colors group">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-4">
                          <div className="text-center shrink-0">
                            <div className="text-orange-600 text-xs font-bold uppercase mb-1">{booking.readable_id}</div>
                            <div className="w-12 h-12 rounded-xl overflow-hidden border border-slate-200 bg-slate-50">
                              <img src={bike?.imageUrl} className="w-full h-full object-cover" />
                            </div>
                          </div>
                          <div>
                            <div className="text-sm font-bold text-slate-900">{booking.customer_name}</div>
                            <div className="text-xs text-slate-700 font-semibold mt-0.5">{bike?.name}</div>
                            <div className="text-xs font-mono font-medium text-slate-500 mt-0.5">{booking.customer_phone}</div>
                            {booking.customer_email && (
                              <div className="text-[11px] text-slate-500 font-medium truncate max-w-[180px]" title={booking.customer_email}>
                                ✉ {booking.customer_email}
                              </div>
                            )}
                            {booking.has_pillion ? (
                              <div className="text-[10px] text-orange-600 font-bold mt-0.5 flex items-center gap-1">
                                <span>👥</span>
                                <span>Pillion: {booking.pillion_name || (isPillionIncomplete(booking) ? 'KYC Required' : 'Co-Rider')}</span>
                              </div>
                            ) : (
                              <div className="text-[10px] text-slate-400 font-medium mt-0.5">
                                <span>👤 Solo Rider</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold tracking-wide border ${
                          booking.status === 'completed' ? 'border-sky-300 bg-sky-50 text-sky-800' :
                          booking.status === 'ongoing' ? (isOverdue ? 'border-orange-300 bg-orange-50 text-orange-800' : 'border-emerald-300 bg-emerald-50 text-emerald-800') :
                          booking.status === 'booking_confirmed' ? 'border-sky-300 bg-sky-50 text-sky-800' :
                          booking.status === 'cancelled' ? 'border-slate-300 bg-slate-100 text-slate-600' :
                          isPaymentPending(booking.status) ? 'border-amber-300 bg-amber-50 text-amber-800' :
                          'border-slate-300 bg-slate-100 text-slate-700'
                        }`}>
                          {isOverdue ? 'OVERDUE' : booking.status === 'booking_confirmed' ? 'PAYMENT CONFIRMED' : isPaymentPending(booking.status) ? 'PENDING PAYMENT' : booking.status.replace('_', ' ').toUpperCase()}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-xs text-slate-900 font-bold">{booking.pickup_date} @ {booking.pickup_time}</div>
                        <div className={`text-xs mt-0.5 font-medium ${isOverdue ? 'text-orange-700 font-bold' : 'text-slate-600'}`}>
                          Return {booking.return_date} @ {booking.return_time}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm font-black text-slate-900">₹{booking.total_rent + (booking.adjustment_amount || 0)}</div>
                        {booking.advance_amount !== undefined && booking.advance_amount !== null && booking.advance_amount > 0 && (
                          <div className="text-xs font-bold text-sky-700 mt-0.5">
                            Adv: ₹{booking.advance_amount} ✓
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2 flex-wrap">
                          {/* Quick Status Selector Dropdown */}
                          <select
                            value={booking.status}
                            onChange={(e) => updateStatus(booking.id, e.target.value)}
                            title="Directly change booking status"
                            className="bg-white border border-slate-300 hover:border-orange-500 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-800 outline-none cursor-pointer transition-all shadow-xs"
                          >
                            <option value="pending_payment">Pending Payment</option>
                            <option value="booking_confirmed">Booking Confirmed</option>
                            <option value="ongoing">Ongoing (Dispatched)</option>
                            <option value="completed">Completed (Returned)</option>
                            <option value="cancelled">Cancelled</option>
                          </select>

                          {/* Primary Direct Action Button */}
                          {booking.status === 'booking_confirmed' && (
                            <button
                              type="button"
                              onClick={() => updateStatus(booking.id, 'ongoing')}
                              className={`px-3 py-1.5 rounded-lg text-white text-xs font-bold transition-all flex items-center gap-1 shadow-xs active:scale-95 whitespace-nowrap cursor-pointer ${
                                booking.has_pillion && isPillionIncomplete(booking)
                                  ? 'bg-rose-600 hover:bg-rose-700'
                                  : 'bg-teal-600 hover:bg-teal-700'
                              }`}
                              title={
                                booking.has_pillion && isPillionIncomplete(booking)
                                  ? 'Dispatch locked: Pillion and emergency contact required'
                                  : 'Dispatch machine and start rental'
                              }
                            >
                              <span>{booking.has_pillion && isPillionIncomplete(booking) ? '⚠️ Pillion KYC & Dispatch' : '🚀 Dispatch'}</span>
                            </button>
                          )}

                          {booking.status === 'ongoing' && (
                            <button
                              type="button"
                              onClick={() => updateStatus(booking.id, 'completed')}
                              className="px-3 py-1.5 rounded-lg bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold transition-all flex items-center gap-1 shadow-xs active:scale-95 whitespace-nowrap cursor-pointer"
                              title="Receive machine and complete rental"
                            >
                              <span>🏁 Receive / Finish</span>
                            </button>
                          )}

                          {isPaymentPending(booking.status) && (
                            <button
                              type="button"
                              onClick={() => handleOpenConfirmPaymentModal(booking)}
                              className="px-3 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold transition-all flex items-center gap-1 shadow-xs active:scale-95 whitespace-nowrap cursor-pointer"
                              title="Confirm payment and lock slot"
                            >
                              <span>✓ Confirm Pay</span>
                            </button>
                          )}

                          {/* Cancel Quick Action */}
                          {booking.status !== 'cancelled' && (
                            <button
                              type="button"
                              onClick={() => handleOpenCancelModal(booking)}
                              className="px-2.5 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-300 text-xs font-bold transition-all flex items-center gap-1 shadow-xs active:scale-95 whitespace-nowrap cursor-pointer"
                              title="Cancel booking"
                            >
                              <span>✕ Cancel</span>
                            </button>
                          )}

                          {booking.status === 'cancelled' && (
                            <button
                              type="button"
                              onClick={() => updateStatus(booking.id, 'pending_payment', 'Reopened by Admin')}
                              className="px-3 py-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 text-xs font-bold transition-all flex items-center gap-1 shadow-xs active:scale-95 whitespace-nowrap cursor-pointer"
                              title="Reopen cancelled booking"
                            >
                              <span>Reopen</span>
                            </button>
                          )}

                          {/* WhatsApp Reminder if payment is pending */}
                          {isPaymentPending(booking.status) && (
                            <button
                              type="button"
                              onClick={() => handleSendWhatsAppReminder(booking)}
                              className="px-2.5 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 text-xs font-bold transition-all cursor-pointer flex items-center gap-1 shadow-xs active:scale-95 whitespace-nowrap"
                              title="Send WhatsApp payment reminder"
                            >
                              <svg className="w-3.5 h-3.5 fill-current shrink-0" viewBox="0 0 24 24">
                                <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448L.057 24zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.882-4.434 9.885-9.885.002-2.641-1.026-5.124-2.893-6.992-1.867-1.868-4.35-2.896-6.992-2.897-5.451 0-9.885 4.434-9.887 9.884-.001 2.126.602 3.738 1.611 5.421l-.999 3.646 3.883-.769zm10.875-6.193c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
                              </svg>
                            </button>
                          )}

                          {/* Full Operations Modal Button */}
                          <button 
                            type="button"
                            onClick={() => setSelectedBooking(booking)} 
                            className="text-xs font-bold text-slate-800 border border-slate-300 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-lg transition-all cursor-pointer shadow-xs active:scale-95 whitespace-nowrap"
                            title="Open full booking operations modal"
                          >
                            Operate ↗
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
            
            {/* PAYMENT PENDING BANNER & WHATSAPP REMINDER */}
            {isPaymentPending(selectedBooking.status) && (
              <div className="bg-amber-500/10 border border-amber-500/30 rounded-3xl p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xl">
                <div className="space-y-1 max-w-xl">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-400 shrink-0 animate-ping"></span>
                    <h4 className="text-sm font-bold text-amber-300 uppercase tracking-wider">Payment Status: Pending Payment</h4>
                  </div>
                  <p className="text-xs text-neutral-300 leading-relaxed">
                    Customer has not confirmed their payment yet. Send complete booking details with Payment ID (<span className="font-mono font-bold text-amber-300">{selectedBooking.readable_id}</span>) and payment instructions instructing the customer to send money to reserve their booking slot.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleSendWhatsAppReminder(selectedBooking)}
                  className="px-4 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xs transition-all flex items-center gap-2 shadow-lg cursor-pointer shrink-0 active:scale-95"
                  title="Send WhatsApp payment reminder with payment ID to reserve slot"
                >
                  <svg className="w-4 h-4 fill-current shrink-0" viewBox="0 0 24 24">
                    <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448L.057 24zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.882-4.434 9.885-9.885.002-2.641-1.026-5.124-2.893-6.992-1.867-1.868-4.35-2.896-6.992-2.897-5.451 0-9.885 4.434-9.887 9.884-.001 2.126.602 3.738 1.611 5.421l-.999 3.646 3.883-.769zm10.875-6.193c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
                  </svg>
                  <span>Send WhatsApp Reminder</span>
                </button>
              </div>
            )}

            {/* BOOKING CONFIRMED BANNER & CONFIRMATION BUTTON */}
            {selectedBooking.status === 'booking_confirmed' && (
              <div className="bg-sky-500/10 border border-sky-500/30 rounded-3xl p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xl">
                <div className="space-y-1 max-w-xl">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-sky-400 shrink-0"></span>
                    <h4 className="text-sm font-bold text-sky-300 uppercase tracking-wider">Status: Booking Confirmed & Reserved</h4>
                  </div>
                  <p className="text-xs text-neutral-300 leading-relaxed">
                    Advance is verified and the slot is locked. Send official WhatsApp booking confirmation with pickup checklist, timing, and garage address to the rider.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleSendBookingConfirmation(selectedBooking)}
                  className="px-4 py-3 rounded-xl bg-sky-400 hover:bg-sky-300 text-black font-bold text-xs transition-all flex items-center gap-2 shadow-lg cursor-pointer shrink-0 active:scale-95"
                  title="Send official booking confirmation message on WhatsApp"
                >
                  <svg className="w-4 h-4 fill-current shrink-0" viewBox="0 0 24 24">
                    <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448L.057 24zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.882-4.434 9.885-9.885.002-2.641-1.026-5.124-2.893-6.992-1.867-1.868-4.35-2.896-6.992-2.897-5.451 0-9.885 4.434-9.887 9.884-.001 2.126.602 3.738 1.611 5.421l-.999 3.646 3.883-.769zm10.875-6.193c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
                  </svg>
                  <span>Send Confirmation</span>
                </button>
              </div>
            )}

            {/* RIDER INFO SECTION */}
            <div className="bg-brand-black/40 p-10 rounded-[3rem] border border-white/5 space-y-8">
              <div className="flex flex-col md:flex-row justify-between items-center gap-10">
                <div className="text-center md:text-left flex-grow">
                  <div className="flex items-center gap-3 mb-2 justify-center md:justify-start">
                    <h4 className="text-brand-teal font-heading text-[10px] uppercase tracking-[0.3em]">Active Rider Identity</h4>
                    {selectedBooking.payment_method && (
                      <span className={`px-4 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-[0.2em] ${selectedBooking.payment_method === 'cash' ? 'bg-sky-500/20 text-sky-400 border border-sky-500/30' : 'bg-brand-teal/20 text-brand-teal border border-brand-teal/30'}`}>
                        {selectedBooking.payment_method} Received
                      </span>
                    )}
                  </div>
                  <p className="text-white font-bold text-3xl uppercase tracking-tighter">{selectedBooking.customer_name}</p>
                  
                  {/* Rider Contact Info: Email & Mobile & Emergency */}
                  <div className="flex flex-wrap items-center gap-y-2 gap-x-4 mt-3">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-black uppercase text-brand-teal tracking-wider">Email:</span>
                      {selectedBooking.customer_email ? (
                        <a 
                          href={`mailto:${selectedBooking.customer_email}`} 
                          className="text-white hover:text-brand-teal font-medium text-xs underline decoration-brand-teal/40 hover:decoration-brand-teal transition-colors"
                          title="Click to email rider"
                        >
                          {selectedBooking.customer_email}
                        </a>
                      ) : (
                        <span className="text-white/40 italic text-xs">Email not provided</span>
                      )}
                    </div>

                    <div className="h-3 w-[1px] bg-white/20 hidden sm:block"></div>

                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-black uppercase text-brand-teal tracking-wider">Mobile:</span>
                      <a 
                        href={`tel:${selectedBooking.customer_phone}`} 
                        className="text-white hover:text-brand-teal font-mono font-medium text-xs underline decoration-brand-teal/40 hover:decoration-brand-teal transition-colors"
                      >
                        {selectedBooking.customer_phone}
                      </a>
                    </div>

                    {selectedBooking.emergency_contact_phone && (
                      <>
                        <div className="h-3 w-[1px] bg-white/20 hidden sm:block"></div>
                        <div className="flex items-center gap-1.5 bg-rose-500/10 border border-rose-500/30 px-2.5 py-1 rounded-lg">
                          <span className="text-[10px]">🚨</span>
                          <span className="text-[9px] font-bold text-rose-300 uppercase">Emergency:</span>
                          <a href={`tel:${selectedBooking.emergency_contact_phone}`} className="text-xs font-mono font-bold text-white hover:underline">
                            {selectedBooking.emergency_contact_phone}
                          </a>
                        </div>
                      </>
                    )}
                    <div className="h-3 w-[1px] bg-white/20 hidden sm:block"></div>

                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-black uppercase text-brand-teal tracking-wider">Pillion:</span>
                      {selectedBooking.has_pillion ? (
                        <span className="px-2.5 py-0.5 rounded-md text-[9px] font-black uppercase bg-brand-orange/20 text-brand-orange border border-brand-orange/30">
                          Yes {selectedBooking.pillion_name ? `(${selectedBooking.pillion_name})` : (isPillionIncomplete(selectedBooking) ? '(KYC Needed)' : '')}
                        </span>
                      ) : (
                        <span className="px-2.5 py-0.5 rounded-md text-[9px] font-black uppercase bg-white/5 text-white/50 border border-white/10">
                          No (Solo Rider)
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Rider Communication Actions */}
                  <div className="flex flex-wrap items-center gap-2.5 mt-4">
                    <a 
                      href={`tel:${selectedBooking.customer_phone}`} 
                      className="inline-flex items-center gap-2 bg-brand-teal/10 border border-brand-teal/20 px-4 py-2.5 rounded-xl text-brand-teal text-xs font-bold hover:bg-brand-teal hover:text-black transition-all"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
                      <span>{selectedBooking.customer_phone}</span>
                    </a>

                    {selectedBooking.customer_email && (
                      <a 
                        href={`mailto:${selectedBooking.customer_email}`} 
                        className="inline-flex items-center gap-2 bg-sky-500/10 border border-sky-500/20 px-4 py-2.5 rounded-xl text-sky-300 text-xs font-bold hover:bg-sky-500 hover:text-black transition-all"
                        title="Compose email to rider"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                        <span>{selectedBooking.customer_email}</span>
                      </a>
                    )}

                    <button
                      type="button"
                      onClick={() => handleSendTermsAndRefundPolicy(selectedBooking)}
                      className="inline-flex items-center gap-2 bg-neutral-900 border border-neutral-700 hover:border-white/30 text-white px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-sm active:scale-95"
                      title="Send Terms, Conditions & Refund Policy to rider on WhatsApp"
                    >
                      <svg className="w-4 h-4 text-brand-yellow" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      <span>Send Terms & Refund Policy</span>
                    </button>

                    {selectedBooking.status === 'booking_confirmed' && (
                      <button
                        type="button"
                        onClick={() => handleSendBookingConfirmation(selectedBooking)}
                        className="inline-flex items-center gap-2 bg-sky-500/20 border border-sky-500/40 hover:bg-sky-400 hover:text-black text-sky-300 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-sm active:scale-95"
                        title="Send official booking confirmation message on WhatsApp"
                      >
                        <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                          <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448L.057 24zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.882-4.434 9.885-9.885.002-2.641-1.026-5.124-2.893-6.992-1.867-1.868-4.35-2.896-6.992-2.897-5.451 0-9.885 4.434-9.887 9.884-.001 2.126.602 3.738 1.611 5.421l-.999 3.646 3.883-.769zm10.875-6.193c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
                        </svg>
                        <span>Send Booking Confirmation</span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => handleOpenEditModal(selectedBooking)}
                      className="inline-flex items-center gap-2 bg-amber-500/20 border border-amber-500/40 hover:bg-amber-400 hover:text-black text-amber-300 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-sm active:scale-95"
                      title="Edit booking details (customer name, phone, dates, vehicle, rent)"
                    >
                      <svg className="w-4 h-4 fill-none stroke-current" viewBox="0 0 24 24" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                      </svg>
                      <span>Edit Booking Details</span>
                    </button>

                    {selectedBooking.status !== 'cancelled' && (
                      <button
                        type="button"
                        onClick={() => handleOpenCancelModal(selectedBooking)}
                        className="inline-flex items-center gap-2 bg-rose-500/10 border border-rose-500/30 hover:bg-rose-500 hover:text-white text-rose-300 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-sm active:scale-95"
                        title="Cancel this booking"
                      >
                        <svg className="w-4 h-4 fill-none stroke-current" viewBox="0 0 24 24" strokeWidth="2">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                        <span>Cancel Booking</span>
                      </button>
                    )}
                  </div>
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

            {/* PILLION RIDER & EMERGENCY CONTACT SECTION */}
            {/* Rule 1: If customer has NO pillion, do not display this section */}
            {/* Rule 2: If customer has pillion, only give admin the option to add pillion & emergency details AFTER booking is confirmed */}
            {selectedBooking.has_pillion && (
              isPaymentPending(selectedBooking.status) ? (
                /* Unconfirmed / Pending Payment: Notice only, no add option before booking confirmed */
                <div className="bg-brand-black/40 p-8 rounded-[2.5rem] border border-amber-500/20 space-y-3">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">👥</span>
                      <div>
                        <h4 className="text-amber-300 font-heading text-xs uppercase tracking-widest flex items-center gap-2">
                          <span>Pillion Co-Rider Requested</span>
                          <span className="px-2 py-0.5 rounded text-[8px] font-black bg-amber-500/20 text-amber-300 uppercase">Awaiting Confirmation</span>
                        </h4>
                        <p className="text-[11px] text-neutral-300 mt-1 leading-relaxed">
                          Customer selected <strong>Yes (With Pillion)</strong> during booking. Pillion KYC documents, Aadhaar upload & 24x7 emergency contact details will unlock for admin entry once the booking payment is confirmed.
                        </p>
                      </div>
                    </div>
                    <span className="px-3 py-1.5 rounded-xl bg-amber-500/10 text-amber-300 border border-amber-500/30 text-[9px] font-black uppercase tracking-wider shrink-0">
                      Unlocks After Payment Confirm
                    </span>
                  </div>
                </div>
              ) : (
                /* Booking is Confirmed / Ongoing: Admin has full option to add pillion & emergency details */
                <div className="bg-brand-black/40 p-10 rounded-[3rem] border border-white/5 space-y-6">
                  {/* Warning banner if pillion details are incomplete */}
                  {isPillionIncomplete(selectedBooking) && (
                    <div className="bg-rose-500/15 border-2 border-rose-500/40 p-5 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xl shadow-rose-950/40">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl shrink-0">🚨</span>
                        <div>
                          <p className="text-xs font-black uppercase tracking-wider text-rose-300">
                            Dispatch Locked — Mandatory Pillion & Emergency Details Missing
                          </p>
                          <p className="text-[11px] text-neutral-200 mt-0.5">
                            Customer has a pillion co-rider. Missing: <strong className="text-rose-200 underline">{getMissingPillionFields(selectedBooking).join(', ')}</strong>. This machine cannot be dispatched until these are recorded.
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleOpenPillionModal(selectedBooking)}
                        className="px-4 py-2.5 bg-rose-500 hover:bg-rose-400 text-white font-black text-[10px] uppercase tracking-wider rounded-xl transition-all cursor-pointer shadow-lg shrink-0"
                      >
                        Complete Details Now
                      </button>
                    </div>
                  )}

                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xl">👥</span>
                        <h4 className="text-brand-teal font-heading text-sm uppercase tracking-widest">
                          Pillion Details & Emergency Contact
                        </h4>
                      </div>
                      <p className="text-[9px] text-white/40 uppercase mt-0.5">
                        Co-rider verification, Aadhaar card document, and 24x7 emergency rescue contact
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handleCopySupabaseSql}
                        className="px-3 py-1.5 bg-white/5 hover:bg-white/10 text-white/70 hover:text-white border border-white/10 rounded-xl text-[9px] font-bold uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1.5"
                        title="Copy SQL for Supabase to enable cross-device sync"
                      >
                        <svg className="w-3.5 h-3.5 text-brand-teal" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                        </svg>
                        <span>Copy Supabase SQL</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleOpenPillionModal(selectedBooking)}
                        className="px-4 py-2 bg-brand-orange hover:bg-brand-orange/90 text-white rounded-xl text-[9px] font-black uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1.5 shadow-lg shadow-brand-orange/20"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                        <span>{(selectedBooking.pillion_name || selectedBooking.emergency_contact_phone) ? 'Update Pillion Info' : '+ Add Pillion & Emergency'}</span>
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
                    {/* 1. Pillion Rider Card */}
                    <div className="bg-brand-black/60 p-6 rounded-2xl border border-white/10 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black uppercase text-brand-teal tracking-wider">Pillion Rider Name</span>
                        {selectedBooking.pillion_name ? (
                          <span className="px-2 py-0.5 rounded text-[8px] font-black bg-brand-teal/20 text-brand-teal uppercase">Registered</span>
                        ) : (
                          <span className="text-[9px] text-rose-400 font-bold uppercase">Required</span>
                        )}
                      </div>
                      <p className="text-base font-bold text-white uppercase tracking-tight">
                        {selectedBooking.pillion_name || 'No Pillion Added'}
                      </p>
                      {selectedBooking.pillion_phone ? (
                        <div className="flex items-center gap-2 pt-1">
                          <a
                            href={`tel:${selectedBooking.pillion_phone}`}
                            className="inline-flex items-center gap-1.5 text-xs text-brand-teal hover:underline font-mono"
                            title="Call Pillion"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
                            <span>{selectedBooking.pillion_phone}</span>
                          </a>
                        </div>
                      ) : (
                        <p className="text-[10px] text-rose-400 font-medium">Mobile: Required before dispatch</p>
                      )}
                    </div>

                    {/* 2. Emergency Contact Card */}
                    <div className="bg-brand-black/60 p-6 rounded-2xl border border-rose-500/20 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black uppercase text-rose-400 tracking-wider flex items-center gap-1">
                          <span>🚨</span> Emergency Contact
                        </span>
                        {selectedBooking.emergency_contact_phone ? (
                          <span className="px-2 py-0.5 rounded text-[8px] font-black bg-rose-500/20 text-rose-300 uppercase">Priority</span>
                        ) : (
                          <span className="text-[9px] text-rose-400 font-bold uppercase">Required</span>
                        )}
                      </div>
                      {selectedBooking.emergency_contact_phone ? (
                        <div className="space-y-2">
                          <p className="text-lg font-mono font-bold text-rose-300">
                            {selectedBooking.emergency_contact_phone}
                          </p>
                          <a
                            href={`tel:${selectedBooking.emergency_contact_phone}`}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-500/20 text-rose-300 hover:bg-rose-500 hover:text-white text-xs font-bold transition-all"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
                            <span>Call Emergency Number</span>
                          </a>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <p className="text-xs text-rose-400/90 font-medium">Emergency contact not recorded</p>
                          <button
                            type="button"
                            onClick={() => handleOpenPillionModal(selectedBooking)}
                            className="text-[10px] text-rose-400 font-bold hover:underline cursor-pointer"
                          >
                            + Set Emergency Contact
                          </button>
                        </div>
                      )}
                    </div>

                    {/* 3. Pillion Aadhaar Card */}
                    <div className="bg-brand-black/60 p-6 rounded-2xl border border-white/10 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black uppercase text-brand-yellow tracking-wider">Pillion Aadhaar</span>
                        {selectedBooking.pillion_aadhaar_url && (
                          <a
                            href={selectedBooking.pillion_aadhaar_url}
                            target="_blank"
                            rel="noreferrer"
                            className="text-[8px] font-black text-brand-teal uppercase hover:underline"
                          >
                            View Full ↗
                          </a>
                        )}
                      </div>
                      {selectedBooking.pillion_aadhaar_url ? (
                        <div className="aspect-video bg-brand-black rounded-xl overflow-hidden border border-white/5">
                          <img src={selectedBooking.pillion_aadhaar_url} className="w-full h-full object-cover" alt="Pillion Aadhaar" />
                        </div>
                      ) : (
                        <div className="p-3 bg-brand-black/40 rounded-xl border border-white/5 text-center text-white/30 text-xs">
                          Aadhaar photo pending
                        </div>
                      )}
                      <div className="text-[10px] text-white/70 font-mono">
                        No: {selectedBooking.pillion_aadhaar_number || 'Not provided'}
                      </div>
                    </div>
                  </div>
                </div>
              )
            )}

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
                    <span className="px-3 py-1 rounded-md text-[9px] font-black uppercase text-sky-400 bg-sky-500/10 border border-sky-500/20">
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
                      className={`py-4 px-3 text-black text-[9px] font-black uppercase rounded-xl transition-all shadow-lg flex items-center justify-center gap-1.5 cursor-pointer ${
                        selectedBooking.status === 'booking_confirmed' 
                          ? 'bg-sky-400 hover:bg-sky-300 shadow-sky-500/20' 
                          : 'bg-sky-400 hover:bg-sky-300 shadow-sky-500/20'
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

                    {/* Send WhatsApp Reminder button */}
                    {isPaymentPending(selectedBooking.status) && (
                      <button 
                        type="button"
                        onClick={() => handleSendWhatsAppReminder(selectedBooking)} 
                        className="col-span-2 py-3 bg-emerald-500/15 hover:bg-emerald-500 text-emerald-300 hover:text-black border border-emerald-500/30 text-[10px] font-black uppercase rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2"
                      >
                        <svg className="w-4 h-4 fill-current shrink-0" viewBox="0 0 24 24">
                          <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448L.057 24zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.882-4.434 9.885-9.885.002-2.641-1.026-5.124-2.893-6.992-1.867-1.868-4.35-2.896-6.992-2.897-5.451 0-9.885 4.434-9.887 9.884-.001 2.126.602 3.738 1.611 5.421l-.999 3.646 3.883-.769zm10.875-6.193c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
                        </svg>
                        <span>Send WhatsApp Reminder</span>
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
                      className={`py-4 text-[9px] font-black uppercase rounded-xl transition-all ${
                        selectedBooking.status === 'cancelled'
                          ? 'bg-neutral-800 text-white/30 opacity-30 cursor-not-allowed'
                          : selectedBooking.has_pillion && isPillionIncomplete(selectedBooking)
                            ? 'bg-rose-500 hover:bg-rose-600 text-white shadow-lg shadow-rose-500/20 cursor-pointer'
                            : 'bg-brand-teal text-black hover:bg-brand-teal/80 cursor-pointer'
                      }`}
                      title={
                        selectedBooking.has_pillion && isPillionIncomplete(selectedBooking)
                          ? 'Dispatch locked: Pillion and emergency contact required before starting rental'
                          : 'Dispatch machine and start rental'
                      }
                    >
                      {selectedBooking.has_pillion && isPillionIncomplete(selectedBooking)
                        ? '⚠️ Dispatch Locked (Pillion Details Required)'
                        : 'Dispatch / Start'}
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
                          ? 'bg-sky-500/20 text-sky-400 border border-sky-500/30'
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
                <span className="text-[8px] font-black text-sky-400 uppercase tracking-wider block">Advance Paid</span>
                <span className="text-base font-heading text-sky-400">₹{paymentForm.advancePaid}</span>
              </div>
              <div className="sm:border-l border-white/10">
                <span className="text-[8px] font-black text-sky-300 uppercase tracking-wider block">Due at Handover</span>
                <span className="text-base font-heading text-sky-300">
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
                className="flex-[2] py-4 bg-sky-400 hover:bg-sky-300 text-black font-black uppercase text-[10px] tracking-widest rounded-xl transition-all shadow-lg shadow-sky-500/20 cursor-pointer"
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

      {/* PILLION & EMERGENCY DETAILS MODAL */}
      {pillionModalOpen && selectedBooking && (
        <Modal 
          isOpen={pillionModalOpen} 
          onClose={() => setPillionModalOpen(false)} 
          title={`PILLION & EMERGENCY CONTACT: ${selectedBooking.readable_id}`} 
          maxWidth="xl"
        >
          <form onSubmit={handleSavePillionForSelectedBooking} className="space-y-6 py-2">
            <div className="bg-brand-black/60 p-4 rounded-2xl border border-white/10 text-xs text-white/80 space-y-1">
              <p className="font-bold text-white flex items-center gap-2">
                <span className="text-brand-teal">✓</span> Rider: {selectedBooking.customer_name} ({selectedBooking.customer_phone})
              </p>
              <p className="text-[11px] text-white/50">
                Register pillion co-rider info, Aadhaar document, and an emergency contact phone for customer safety and roadside support.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[9px] font-black text-white/60 uppercase tracking-widest">
                  Pillion Full Name
                </label>
                <input 
                  type="text"
                  placeholder="e.g. Priya Sharma"
                  value={pillionForm.pillion_name}
                  onChange={(e) => setPillionForm(p => ({ ...p, pillion_name: e.target.value }))}
                  className="w-full bg-brand-black border border-white/15 rounded-xl p-3 text-xs text-white outline-none focus:border-brand-teal font-bold"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[9px] font-black text-white/60 uppercase tracking-widest">
                  Pillion Mobile Number
                </label>
                <input 
                  type="tel"
                  placeholder="e.g. +91 98765 43210"
                  value={pillionForm.pillion_phone}
                  onChange={(e) => setPillionForm(p => ({ ...p, pillion_phone: e.target.value }))}
                  className="w-full bg-brand-black border border-white/15 rounded-xl p-3 text-xs text-white outline-none focus:border-brand-teal font-mono font-medium"
                />
              </div>

              <div className="space-y-2 sm:col-span-2">
                <label className="text-[9px] font-black text-rose-400 uppercase tracking-widest flex items-center gap-1.5">
                  <span>🚨</span> Emergency Contact Number (Mandatory for Support)
                </label>
                <input 
                  type="tel"
                  placeholder="e.g. +91 98123 45678 (Parent / Spouse / Friend)"
                  value={pillionForm.emergency_contact_phone}
                  onChange={(e) => setPillionForm(p => ({ ...p, emergency_contact_phone: e.target.value }))}
                  className="w-full bg-brand-black border border-rose-500/30 rounded-xl p-3 text-xs text-white outline-none focus:border-rose-400 font-mono font-bold"
                />
                <p className="text-[10px] text-white/40">
                  This contact will be called immediately by operations if any breakdown, emergency, or accident occurs.
                </p>
              </div>

              <div className="space-y-2">
                <label className="text-[9px] font-black text-white/60 uppercase tracking-widest">
                  Pillion Aadhaar Card Number
                </label>
                <input 
                  type="text"
                  placeholder="e.g. 1234 5678 9012"
                  value={pillionForm.pillion_aadhaar_number}
                  onChange={(e) => setPillionForm(p => ({ ...p, pillion_aadhaar_number: e.target.value }))}
                  className="w-full bg-brand-black border border-white/15 rounded-xl p-3 text-xs text-white font-mono outline-none focus:border-brand-teal"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[9px] font-black text-white/60 uppercase tracking-widest">
                  Pillion Aadhaar Card Upload
                </label>
                <label className="flex items-center gap-2 cursor-pointer bg-white/5 border border-dashed border-white/10 rounded-xl p-3 hover:border-brand-teal transition-all">
                  <svg className="w-4 h-4 text-brand-teal shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                  </svg>
                  <span className="text-[9px] font-bold text-white/60 truncate">
                    {pillionForm.pillion_aadhaar_file ? pillionForm.pillion_aadhaar_file.name : (selectedBooking.pillion_aadhaar_url ? 'Replace Aadhaar Image' : 'Upload Aadhaar Image')}
                  </span>
                  <input 
                    type="file" 
                    accept="image/*" 
                    className="hidden" 
                    onChange={(e) => e.target.files?.[0] && setPillionForm(p => ({ ...p, pillion_aadhaar_file: e.target.files![0] }))} 
                  />
                </label>
                {selectedBooking.pillion_aadhaar_url && !pillionForm.pillion_aadhaar_file && (
                  <p className="text-[9px] text-brand-teal font-semibold">✓ Current Aadhaar on file</p>
                )}
              </div>
            </div>

            <div className="flex gap-4 pt-2">
              <button
                type="button"
                onClick={() => setPillionModalOpen(false)}
                className="flex-1 py-3.5 bg-white/5 hover:bg-white/10 text-white/60 text-[10px] font-black uppercase rounded-xl transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={pillionForm.saving}
                className="flex-1 py-3.5 bg-brand-orange hover:bg-brand-orange/90 text-white font-black uppercase text-[10px] tracking-widest rounded-xl transition-all shadow-lg shadow-brand-orange/20 cursor-pointer disabled:opacity-50"
              >
                {pillionForm.saving ? 'Saving Details...' : 'Save Pillion & Emergency Details'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* EDIT BOOKING DETAILS MODAL (Name, Phone, Dates, Vehicle, Rent, Logistics) */}
      {editingBooking && (
        <Modal
          isOpen={!!editingBooking}
          onClose={() => setEditingBooking(null)}
          title={`EDIT BOOKING: ${editingBooking.readable_id || `#${editingBooking.id}`}`}
          maxWidth="3xl"
        >
          <form onSubmit={handleSaveEditBooking} className="space-y-6 py-2">
            
            {/* Header info bar */}
            <div className="bg-brand-black/60 p-4 rounded-2xl border border-white/10 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
              <div>
                <span className="text-[9px] font-black uppercase text-amber-400 tracking-widest block">
                  Admin Booking Modification
                </span>
                <p className="text-white text-sm font-bold">
                  Editing Record: <span className="font-mono text-amber-300">{editingBooking.readable_id || editingBooking.id}</span>
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-white/50 uppercase font-semibold">Current Status:</span>
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

            {/* Conflict Warning if any */}
            {editBikeConflict && (
              <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4 flex items-start gap-3">
                <span className="text-xl shrink-0">⚠️</span>
                <div className="text-xs text-amber-300 space-y-1">
                  <p className="font-bold">Schedule Overlap Alert</p>
                  <p className="text-neutral-300 text-[11px] leading-relaxed">
                    This vehicle is also booked by <strong className="text-white">{editBikeConflict.customer_name}</strong> ({editBikeConflict.readable_id || editBikeConflict.id}) from {editBikeConflict.pickup_date} {editBikeConflict.pickup_time} to {editBikeConflict.return_date} {editBikeConflict.return_time}. As admin, you can adjust the timing or assign another vehicle.
                  </p>
                </div>
              </div>
            )}

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

            {/* PILLION DETAILS & EMERGENCY CONTACT */}
            <div className="bg-brand-black/40 p-6 rounded-2xl border border-white/5 space-y-4">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <div>
                  <h4 className="text-xs font-black uppercase tracking-widest text-brand-orange flex items-center gap-2">
                    <span>👥</span> Pillion Details & Emergency Contact
                  </h4>
                  <p className="text-[10px] text-white/40 mt-0.5">Specify if rider travels with a passenger</p>
                </div>

                <div className="flex items-center gap-2 bg-brand-black p-1 rounded-xl border border-white/10">
                  <button
                    type="button"
                    onClick={() => setEditForm(p => ({ ...p, has_pillion: false }))}
                    className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase transition-all cursor-pointer ${
                      !editForm.has_pillion ? 'bg-white/20 text-white' : 'text-white/40 hover:text-white'
                    }`}
                  >
                    No (Solo)
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditForm(p => ({ ...p, has_pillion: true }))}
                    className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase transition-all cursor-pointer ${
                      editForm.has_pillion ? 'bg-brand-orange text-white' : 'text-white/40 hover:text-white'
                    }`}
                  >
                    Yes (With Pillion)
                  </button>
                </div>
              </div>

              {editForm.has_pillion ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-1">
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-black uppercase tracking-wider text-white/60">
                      Pillion Full Name *
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Priya Sharma"
                      value={editForm.pillion_name}
                      onChange={(e) => setEditForm(p => ({ ...p, pillion_name: e.target.value }))}
                      className="w-full bg-brand-black border border-white/15 rounded-xl px-3.5 py-2.5 text-xs text-white font-medium outline-none focus:border-brand-orange"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[9px] font-black uppercase tracking-wider text-white/60">
                      Pillion Mobile Number *
                    </label>
                    <input
                      type="tel"
                      placeholder="+91 98765 43210"
                      value={editForm.pillion_phone}
                      onChange={(e) => setEditForm(p => ({ ...p, pillion_phone: e.target.value }))}
                      className="w-full bg-brand-black border border-white/15 rounded-xl px-3.5 py-2.5 text-xs text-white font-mono font-medium outline-none focus:border-brand-orange"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[9px] font-black uppercase tracking-wider text-white/60">
                      Pillion Aadhaar Number *
                    </label>
                    <input
                      type="text"
                      placeholder="1234 5678 9012"
                      value={editForm.pillion_aadhaar_number}
                      onChange={(e) => setEditForm(p => ({ ...p, pillion_aadhaar_number: e.target.value }))}
                      className="w-full bg-brand-black border border-white/15 rounded-xl px-3.5 py-2.5 text-xs text-white font-mono font-medium outline-none focus:border-brand-orange"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[9px] font-black uppercase tracking-wider text-rose-400">
                      🚨 Emergency Contact No. *
                    </label>
                    <input
                      type="tel"
                      placeholder="+91 98123 45678"
                      value={editForm.emergency_contact_phone}
                      onChange={(e) => setEditForm(p => ({ ...p, emergency_contact_phone: e.target.value }))}
                      className="w-full bg-brand-black border border-rose-500/30 rounded-xl px-3.5 py-2.5 text-xs text-white font-mono font-bold outline-none focus:border-rose-400"
                    />
                  </div>
                </div>
              ) : (
                <div className="p-3 bg-brand-black/60 rounded-xl border border-white/5 text-[11px] text-white/40 italic">
                  Solo Rider selected. Pillion & emergency contact fields are inactive.
                </div>
              )}
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

                {/* Bike preview mini card */}
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

            {/* 4. FINANCIALS & RENT SETTLEMENT */}
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
                  <span className="text-[8px] text-white/40 block">Min advance ₹500</span>
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
                  <span className="text-[8px] text-white/40 block">Payable at handover</span>
                </div>
              </div>
            </div>

            {/* 5. LOGISTICS / ADDRESS & NOTES */}
            <div className="bg-brand-black/40 p-6 rounded-2xl border border-white/5 space-y-4">
              <h4 className="text-xs font-black uppercase tracking-widest text-neutral-300 flex items-center gap-2">
                <span>📍</span> 5. Logistics & Notes
              </h4>
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="edit_needs_delivery"
                    checked={editForm.needs_delivery}
                    onChange={(e) => setEditForm(p => ({ ...p, needs_delivery: e.target.checked }))}
                    className="rounded border-white/20 text-brand-orange focus:ring-0 w-4 h-4"
                  />
                  <label htmlFor="edit_needs_delivery" className="text-xs text-white font-medium cursor-pointer">
                    Home Delivery / Return Pickup Required
                  </label>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[9px] font-black uppercase tracking-wider text-white/60">
                    Delivery Address / Logistics Remarks
                  </label>
                  <input
                    type="text"
                    placeholder="Enter delivery/pickup address (or leave blank for garage handover)"
                    value={editForm.address}
                    onChange={(e) => setEditForm(p => ({ ...p, address: e.target.value }))}
                    className="w-full bg-brand-black border border-white/15 rounded-xl px-3.5 py-2.5 text-xs text-white outline-none focus:border-white/40"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[9px] font-black uppercase tracking-wider text-white/60">
                    Admin Internal Notes
                  </label>
                  <input
                    type="text"
                    placeholder="Internal remarks (e.g. helmet requested, modified by admin)"
                    value={editForm.admin_notes}
                    onChange={(e) => setEditForm(p => ({ ...p, admin_notes: e.target.value }))}
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
                {savingEdit ? 'Saving Changes...' : 'Save Updated Booking Details'}
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
                  <label className="text-[9px] font-bold text-sky-400 uppercase">Rider Email Address (Mandatory) *</label>
                  <input 
                    type="email" 
                    placeholder="customer@gmail.com"
                    value={manualBooking.customer_email}
                    onChange={(e) => setManualBooking(p => ({ ...p, customer_email: e.target.value }))}
                    className="w-full bg-brand-black border border-white/10 rounded-xl p-3 text-xs text-white outline-none focus:border-brand-teal font-medium"
                    required
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
                      className="px-2 py-0.5 rounded bg-sky-500/10 border border-sky-500/20 text-[8px] font-bold text-sky-400 uppercase cursor-pointer"
                    >
                      -₹100
                    </button>
                    <button
                      type="button"
                      onClick={() => setManualBooking(p => ({ ...p, agreed_rent: Math.max(100, p.standard_rent - 200) }))}
                      className="px-2 py-0.5 rounded bg-sky-500/10 border border-sky-500/20 text-[8px] font-bold text-sky-400 uppercase cursor-pointer"
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
                    <span className="text-[8px] text-sky-400 uppercase">Paid Now</span>
                  </div>
                  <input 
                    type="number" 
                    min="0"
                    value={manualBooking.advance_amount}
                    onChange={(e) => setManualBooking(p => ({ ...p, advance_amount: parseFloat(e.target.value) || 0 }))}
                    className="w-full bg-brand-black border border-white/15 rounded-xl p-3 text-base font-heading font-bold text-sky-400 outline-none focus:border-sky-400"
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
                      className="px-2 py-0.5 rounded bg-sky-500/10 border border-sky-500/20 text-[8px] font-bold text-sky-400 uppercase cursor-pointer"
                    >
                      Full Rent (₹{manualBooking.agreed_rent})
                    </button>
                    <button
                      type="button"
                      onClick={() => setManualBooking(p => ({ ...p, advance_amount: p.agreed_rent + p.deposit_amount }))}
                      className="px-2 py-0.5 rounded bg-sky-500/10 border border-sky-500/20 text-[8px] font-bold text-sky-400 uppercase cursor-pointer"
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
                    <div className="p-3 bg-sky-500/10 border border-sky-500/30 rounded-xl flex items-center gap-2.5 text-xs">
                      <span className="px-2 py-0.5 rounded bg-sky-400 text-black text-[9px] font-black uppercase">
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
                  <span className="text-[8px] font-black text-sky-400 uppercase tracking-wider block">Advance Recv.</span>
                  <span className="text-base font-heading text-sky-400">₹{manualBooking.advance_amount}</span>
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
                <span className="text-[8px] text-sky-400 uppercase font-bold bg-sky-500/10 px-2 py-0.5 rounded border border-sky-500/20">
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

            {/* 6. PILLION DETAILS & EMERGENCY CONTACT (OPTIONAL) */}
            <div className="bg-brand-black/50 p-6 rounded-2xl border border-white/5 space-y-4">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                <h4 className="text-[10px] font-black text-brand-orange uppercase tracking-widest flex items-center gap-1.5">
                  <span>👥</span> 6. Pillion Details & Emergency Contact (Optional)
                </h4>
                <span className="text-[8px] text-brand-orange/80 uppercase font-bold bg-brand-orange/10 px-2 py-0.5 rounded border border-brand-orange/20">
                  Can be added now or during trip operation
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[9px] font-bold text-white/60 uppercase">Pillion Name</label>
                  <input 
                    type="text" 
                    placeholder="e.g. Priya Sharma"
                    value={manualBooking.pillion_name}
                    onChange={(e) => setManualBooking(p => ({ ...p, pillion_name: e.target.value }))}
                    className="w-full bg-brand-black border border-white/10 rounded-xl p-3 text-xs text-white outline-none focus:border-brand-orange"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[9px] font-bold text-white/60 uppercase">Pillion Mobile</label>
                  <input 
                    type="tel" 
                    placeholder="+91 98765 43210"
                    value={manualBooking.pillion_phone}
                    onChange={(e) => setManualBooking(p => ({ ...p, pillion_phone: e.target.value }))}
                    className="w-full bg-brand-black border border-white/10 rounded-xl p-3 text-xs text-white outline-none focus:border-brand-orange font-mono"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[9px] font-bold text-white/60 uppercase">Pillion Aadhaar No.</label>
                  <input 
                    type="text" 
                    placeholder="12-digit Aadhaar"
                    value={manualBooking.pillion_aadhaar_number}
                    onChange={(e) => setManualBooking(p => ({ ...p, pillion_aadhaar_number: e.target.value }))}
                    className="w-full bg-brand-black border border-white/10 rounded-xl p-3 text-xs text-white outline-none focus:border-brand-orange font-mono"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[9px] font-bold text-rose-400 uppercase">🚨 Emergency Contact No.</label>
                  <input 
                    type="tel" 
                    placeholder="+91 98123 45678"
                    value={manualBooking.emergency_contact_phone}
                    onChange={(e) => setManualBooking(p => ({ ...p, emergency_contact_phone: e.target.value }))}
                    className="w-full bg-brand-black border border-rose-500/30 rounded-xl p-3 text-xs text-white outline-none focus:border-rose-400 font-mono font-bold"
                  />
                </div>
              </div>
            </div>

            {/* 7. RIDE STATUS & IMMEDIATE DISPATCH */}
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
                          ? 'bg-sky-400 text-black shadow-lg shadow-sky-500/20'
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
