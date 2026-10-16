
import React, { useState, useMemo, useEffect } from 'react';
import * as ReactRouterDOM from 'react-router-dom';
import { useToast } from '../App';
import type { Bike, AdditionalCharge, BookingDetails, LegalContent, BikeCategory } from '../types';
import { 
  SECURITY_DEPOSIT_AMOUNT, 
  EARLY_LATE_FEE, 
  OUTSTATION_DAILY_SURCHARGE, 
  DELIVERY_PICKUP_FEE,
  WEB3FORMS_ACCESS_KEY,
  UPI_ID
} from '../constants';
import { supabase } from '../supabase';
import { Auth } from './Auth';
import { TERMS_AND_CONDITIONS } from '../legal';
import { Check, Copy, QrCode, Upload, ArrowRight, ArrowLeft, ShieldCheck, Clock, Sparkles, Smartphone, ExternalLink, ChevronDown, X, Edit3, RotateCcw, User, Calendar, MapPin, FileText } from 'lucide-react';

const { useSearchParams, useNavigate, Link } = ReactRouterDOM;

interface BookingFormProps {
  bikes: Bike[];
  additionalCharges: AdditionalCharge[];
  onShowPolicy: (policy: LegalContent) => void;
}

type BookingStep = 'selection' | 'details' | 'payment';
type DetailsSubStep = 'identity' | 'dates' | 'logistics' | 'summary';

const ValidCheck: React.FC = () => (
  <svg 
    className="w-4 h-4 text-emerald-400 shrink-0" 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2.5" 
    strokeLinecap="round" 
    strokeLinejoin="round"
  >
    <polyline points="20 6 9 17 4 12" className="animate-draw-check" />
  </svg>
);



const inputStyle = (extra?: string) => 
  `bg-[#0c0c0c] border border-white/10 rounded-xl px-3 py-2 sm:py-2.5 text-white w-full placeholder:text-neutral-500 font-sans text-xs focus:outline-none focus:border-brand-orange/60 focus:ring-1 focus:ring-brand-orange/20 transition-all duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] ${extra || ''}`;

const SectionHeader: React.FC<{ number: string, title: string; subtitle?: string }> = ({ number, title, subtitle }) => (
  <div className="mb-3">
    <h4 className="text-white font-heading text-base sm:text-lg tracking-widest uppercase flex items-center gap-2.5">
        <span className="text-brand-orange font-mono">{number}.</span> {title}
    </h4>
    {subtitle && <p className="text-[10px] text-neutral-400 uppercase font-medium tracking-wider mt-0.5 ml-6">{subtitle}</p>}
  </div>
);

export const BookingForm: React.FC<BookingFormProps> = ({ bikes, onShowPolicy }) => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { showToast } = useToast();
  
  const [step, setStep] = useState<BookingStep>(() => {
    const urlBikeId = searchParams.get('bikeId');
    if (urlBikeId) return 'details';
    return (localStorage.getItem('rydeit_current_step') as BookingStep) || 'selection';
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'loading' | 'success'>('idle');
  const [detailsSubStep, setDetailsSubStep] = useState<DetailsSubStep>('identity');
  const [hasEnteredBookingDetails, setHasEnteredBookingDetails] = useState(false);
  const [bookingId, setBookingId] = useState(() => localStorage.getItem('rydeit_pending_id') || `RD-${Math.floor(100000 + Math.random() * 900000)}`);
  const [user, setUser] = useState<any>(null);
  const [applyDiscount, setApplyDiscount] = useState(true);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [hasSubmittedDetails, setHasSubmittedDetails] = useState(false);
  const [uploadingPayment, setUploadingPayment] = useState(false);
  const [paymentScreenshotUploaded, setPaymentScreenshotUploaded] = useState(false);
  const [copiedUpi, setCopiedUpi] = useState(false);
  const [copiedId, setCopiedId] = useState(false);
  const [showAuthOrUpload, setShowAuthOrUpload] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const authSectionRef = React.useRef<HTMLDivElement>(null);

  const handleSignInOrUploadClick = () => {
    setShowAuthOrUpload(prev => !prev);
    if (user) {
      fileInputRef.current?.click();
    }
    setTimeout(() => {
      authSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }, 150);
  };

  const [formData, setFormData] = useState<BookingDetails>(() => {
    const saved = localStorage.getItem('rydeit_draft');
    const urlBikeId = searchParams.get('bikeId');
    const todayStr = new Date().toISOString().split('T')[0];
    
    let initialData = saved ? JSON.parse(saved) : {
      bikeId: '',
      fromDate: todayStr,
      fromTime: '10:00',
      toDate: todayStr,
      toTime: '20:00',
      delivery: false,
      homePickup: false,
      outstation: false,
      address: '',
      deliveryAddress: '',
      pickupAddress: '',
      sameAddressForDrop: true,
      earlyPickup: false,
      name: '',
      phone: '',
      email: '',
      whatsapp: '',
      pickupMethod: 'garage',
      dropMethod: 'garage'
    };

    if (initialData.deliveryAddress === undefined) initialData.deliveryAddress = initialData.address || '';
    if (initialData.pickupAddress === undefined) initialData.pickupAddress = initialData.address || '';
    if (initialData.sameAddressForDrop === undefined) initialData.sameAddressForDrop = true;

    // Ensure past dates in stale drafts reset to today
    if (!initialData.fromDate || initialData.fromDate < todayStr) {
      initialData.fromDate = todayStr;
      initialData.toDate = todayStr;
    }

    if (urlBikeId) initialData.bikeId = urlBikeId;
    return initialData;
  });

  // Active advance-paid bookings for double-booking prevention
  const [reservedSlots, setReservedSlots] = useState<any[]>([]);

  useEffect(() => {
    const fetchReservedSlots = async () => {
      try {
        const { data } = await supabase
          .from('bookings')
          .select('id, readable_id, bike_id, pickup_date, pickup_time, return_date, return_time, status, advance_amount')
          .in('status', ['booking_confirmed', 'ongoing']);
        if (data) setReservedSlots(data);
      } catch (err) {
        console.error('Failed to load reserved slots:', err);
      }
    };
    fetchReservedSlots();
  }, []);

  const conflictingBooking = useMemo(() => {
    if (!formData.bikeId || !formData.fromDate || !formData.fromTime || !formData.toDate || !formData.toTime) {
      return null;
    }
    const reqStart = new Date(`${formData.fromDate}T${formData.fromTime}`).getTime();
    const reqEnd = new Date(`${formData.toDate}T${formData.toTime}`).getTime();
    if (isNaN(reqStart) || isNaN(reqEnd) || reqEnd <= reqStart) return null;

    const targetBikeId = parseInt(formData.bikeId);
    return reservedSlots.find(b => {
      if (b.bike_id !== targetBikeId) return false;
      const exStart = new Date(`${b.pickup_date}T${b.pickup_time || '10:00'}`).getTime();
      const exEnd = new Date(`${b.return_date}T${b.return_time || '20:00'}`).getTime();
      if (isNaN(exStart) || isNaN(exEnd)) return false;
      // Overlapping slot condition: reqStart < exEnd && reqEnd > exStart
      return reqStart < exEnd && reqEnd > exStart;
    }) || null;
  }, [formData.bikeId, formData.fromDate, formData.fromTime, formData.toDate, formData.toTime, reservedSlots]);


  const bike = useMemo(() => bikes.find(b => b.id.toString() === formData.bikeId), [formData.bikeId, bikes]);

  const daysCount = useMemo(() => {
    if (!formData.fromDate || !formData.toDate) return 1;
    const start = new Date(formData.fromDate).getTime();
    const end = new Date(formData.toDate).getTime();
    if (isNaN(start) || isNaN(end) || end < start) return 1;
    const dayDiff = Math.max(0, Math.round((end - start) / (1000 * 3600 * 24)));
    return dayDiff === 0 ? 1 : dayDiff + 1;
  }, [formData.fromDate, formData.toDate]);

  const isNameValid = useMemo(() => formData.name.trim().length >= 3, [formData.name]);
  const isPhoneValid = useMemo(() => formData.whatsapp.replace(/\D/g, '').length >= 10, [formData.whatsapp]);
  const isEmailValid = useMemo(() => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim()), [formData.email]);

  const charges = useMemo(() => {
    if (!bike) return null;

    const start = new Date(`${formData.fromDate}T${formData.fromTime}`);
    const end = new Date(`${formData.toDate}T${formData.toTime}`);
    const rEff = bike.dailyRate + (formData.outstation ? OUTSTATION_DAILY_SURCHARGE : 0);

    const dayDiff = Math.max(0, Math.round((new Date(formData.toDate).getTime() - new Date(formData.fromDate).getTime()) / (1000 * 3600 * 24)));
    const referencePrice = rEff * (dayDiff + 1);

    const totalHours = (end.getTime() - start.getTime()) / (1000 * 3600);
    let basePrice = 0;

    if (totalHours <= 6) {
      basePrice = 0.8 * rEff;
    } else if (totalHours <= 12) {
      basePrice = rEff;
    } else if (totalHours <= 24) {
      basePrice = (formData.fromDate === formData.toDate) ? rEff : 1.4 * rEff;
    } else {
      basePrice = 1.4 * rEff;
      const extraStart = new Date(start.getTime() + 24 * 3600 * 1000);
      const extraEnd = end;
      let temp = new Date(extraStart);
      while (temp < extraEnd) {
        const h = temp.getHours();
        let blockPrice = 0;
        let blockDuration = 0;
        let blockEnd = new Date(temp);
        if (h >= 8 && h < 14) { blockPrice = 0.4 * rEff; blockDuration = 6; blockEnd.setHours(14,0,0,0); }
        else if (h >= 14 && h < 20) { blockPrice = 0.4 * rEff; blockDuration = 6; blockEnd.setHours(20,0,0,0); }
        else { blockPrice = 0.2 * rEff; blockDuration = 12; if (h >= 20) { blockEnd.setDate(blockEnd.getDate() + 1); blockEnd.setHours(8,0,0,0); } else { blockEnd.setHours(8,0,0,0); } }
        const actualEnd = extraEnd < blockEnd ? extraEnd : blockEnd;
        const usedHours = (actualEnd.getTime() - temp.getTime()) / (1000 * 3600);
        if (usedHours < blockDuration) { basePrice += (usedHours < (blockDuration / 2)) ? (blockPrice * 0.5) : blockPrice; }
        else { basePrice += blockPrice; }
        temp = blockEnd;
      }
    }

    const startH = start.getHours();
    const startM = start.getMinutes();
    const endH = end.getHours();
    const endM = end.getMinutes();

    const isEarlyPickup = startH < 8;
    const isLatePickup = startH > 20 || (startH === 20 && startM > 0);
    const isEarlyDrop = endH < 8;
    const isLateDrop = endH > 20 || (endH === 20 && endM > 0);

    const earlyLatePickupFee = (isEarlyPickup || isLatePickup) ? EARLY_LATE_FEE : 0;
    const earlyLateDropFee = (isEarlyDrop || isLateDrop) ? EARLY_LATE_FEE : 0;

    const deliveryFee = formData.pickupMethod === 'home' ? DELIVERY_PICKUP_FEE : 0;
    const homePickupFee = formData.dropMethod === 'home' ? DELIVERY_PICKUP_FEE : 0;

    const discountAmount = referencePrice - basePrice;
    const discountPercent = Math.round((discountAmount / referencePrice) * 100);
    const hasDiscount = discountAmount > 0;

    const finalRent = applyDiscount && hasDiscount ? basePrice : referencePrice;
    const finalPayable = Math.floor(finalRent + earlyLatePickupFee + earlyLateDropFee + deliveryFee + homePickupFee);

    return {
      referencePrice,
      basePrice: Math.floor(basePrice),
      discountAmount: Math.floor(discountAmount),
      discountPercent,
      hasDiscount,
      earlyLatePickupFee,
      earlyLateDropFee,
      isEarlyPickup,
      isLatePickup,
      isEarlyDrop,
      isLateDrop,
      deliveryFee,
      homePickupFee,
      finalPayable,
      advance: Math.floor(finalPayable * 0.4),
      security: SECURITY_DEPOSIT_AMOUNT
    };
  }, [formData, bike, applyDiscount]);

  const sendWhatsAppConfirmation = () => {
    if (!bike || !charges) return;

    const deliveryAddr = formData.pickupMethod === 'home' ? (formData.deliveryAddress || formData.address || '').trim() : '';
    const pickupAddr = formData.dropMethod === 'home' 
      ? (formData.sameAddressForDrop && formData.pickupMethod === 'home' ? deliveryAddr : (formData.pickupAddress || formData.address || '').trim())
      : '';

    let logisticsText = '';
    if (deliveryAddr && pickupAddr) {
      if (deliveryAddr === pickupAddr) {
        logisticsText = `%0A*Delivery & Return Address:* ${encodeURIComponent(deliveryAddr)}%0A`;
      } else {
        logisticsText = `%0A*Delivery Address (Start):* ${encodeURIComponent(deliveryAddr)}%0A*Return Pickup Address (End):* ${encodeURIComponent(pickupAddr)}%0A`;
      }
    } else if (deliveryAddr) {
      logisticsText = `%0A*Delivery Address:* ${encodeURIComponent(deliveryAddr)} (Return at Garage)%0A`;
    } else if (pickupAddr) {
      logisticsText = `%0A*Pickup at Garage, Return Collection Address:* ${encodeURIComponent(pickupAddr)}%0A`;
    }
    
    const message = `*NEW BOOKING REQUEST FROM RYDEIT*%0A%0A` +
      `*Booking ID:* ${bookingId}%0A` +
      `*Machine:* ${bike.name}%0A` +
      `*Rider Name:* ${formData.name}%0A` +
      `*WhatsApp:* ${formData.whatsapp}%0A%0A` +
      `*Pickup:* ${formData.fromDate} @ ${formData.fromTime}%0A` +
      `*Return:* ${formData.toDate} @ ${formData.toTime}%0A` +
      logisticsText +
      `*Total Rent:* ₹${charges.finalPayable}%0A` +
      `*Advance to Pay:* ₹${charges.advance}%0A%0A` +
      `_I have submitted my request on the portal. Please confirm the availability of my machine._`;

    const whatsappUrl = `https://wa.me/917686022245?text=${message}`;
    window.open(whatsappUrl, '_blank');
  };

  useEffect(() => {
    const urlBikeId = searchParams.get('bikeId');
    if (urlBikeId && urlBikeId !== formData.bikeId) {
      setFormData(prev => ({ ...prev, bikeId: urlBikeId }));
      setStep('details');
    }
  }, [searchParams]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setUser(session?.user ?? null));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => setUser(session?.user ?? null));
    return () => subscription.unsubscribe();
  }, []);

  // Sync Profile with Form Data
  useEffect(() => {
    const syncProfile = async () => {
      if (!user) return;
      const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).maybeSingle();
      if (formData.name || formData.whatsapp || formData.email) {
        const updates: any = { id: user.id };
        let needsSync = false;
        if (!profile?.full_name && formData.name) { updates.full_name = formData.name; needsSync = true; }
        if (!profile?.whatsapp && formData.whatsapp) { updates.whatsapp = formData.whatsapp; needsSync = true; }
        if (!profile?.email && (formData.email || user.email)) { updates.email = formData.email || user.email; needsSync = true; }
        if (needsSync) await supabase.from('profiles').upsert(updates, { onConflict: 'id' });
      }
      if (profile && (!formData.name || !formData.whatsapp)) {
        setFormData(prev => ({
          ...prev,
          name: prev.name || profile.full_name || '',
          whatsapp: prev.whatsapp || profile.whatsapp || '',
          email: prev.email || profile.email || user.email || ''
        }));
      }
    };
    syncProfile();
  }, [user]);

  useEffect(() => {
    localStorage.setItem('rydeit_draft', JSON.stringify(formData));
    localStorage.setItem('rydeit_pending_id', bookingId);
    localStorage.setItem('rydeit_current_step', step);
  }, [formData, bookingId, step]);

  useEffect(() => {
    if (user && step === 'payment' && bookingId) {
      const linkBooking = async () => {
        try {
          await supabase.from('bookings').update({ user_id: user.id }).eq('readable_id', bookingId);
        } catch (e) {
          console.error("Error linking booking:", e);
        }
      };
      linkBooking();
    }
  }, [user, step, bookingId]);

  const copyToClipboard = (text: string, type: 'upi' | 'id') => {
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(text);
      if (type === 'upi') {
        setCopiedUpi(true);
        setTimeout(() => setCopiedUpi(false), 2000);
        showToast('UPI ID copied to clipboard!', 'info');
      } else {
        setCopiedId(true);
        setTimeout(() => setCopiedId(false), 2000);
        showToast('Booking ID copied to clipboard!', 'info');
      }
    }
  };

  const handlePaymentScreenshotUpload = async (file: File) => {
    if (!file) return;
    setUploadingPayment(true);
    try {
      let publicUrl = '';
      const fileExt = file.name.split('.').pop() || 'jpg';
      const fileName = `payment_${bookingId}_${Date.now()}.${fileExt}`;
      const filePath = user ? `${user.id}/${fileName}` : `guest_${bookingId}/${fileName}`;

      // 1. Attempt uploading to Supabase Storage
      try {
        const { error: uploadError } = await supabase.storage.from('booking-docs').upload(filePath, file, { upsert: true });
        if (!uploadError) {
          const { data } = supabase.storage.from('booking-docs').getPublicUrl(filePath);
          publicUrl = data?.publicUrl || '';
        } else {
          console.warn('Storage upload policy restricted, activating direct fallback:', uploadError.message);
        }
      } catch (stErr) {
        console.warn('Storage upload failed:', stErr);
      }

      // 2. Base64 fallback if storage bucket has RLS restrictions
      if (!publicUrl) {
        try {
          publicUrl = await new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve((e.target?.result as string) || '');
            reader.onerror = () => resolve('');
            reader.readAsDataURL(file);
          });
        } catch {
          publicUrl = 'uploaded_by_user';
        }
      }

      // 3. Update booking record
      const updatePayload: any = {
        payment_screenshot_url: publicUrl || 'uploaded_by_user',
        status: 'verifying_payment'
      };
      if (user) {
        updatePayload.user_id = user.id;
      }

      let { error: updateError } = await supabase
        .from('bookings')
        .update(updatePayload)
        .eq('readable_id', bookingId);

      // If user_id violates foreign key constraint (e.g. user in auth but not profile yet), retry without user_id
      if (updateError && (updateError.message?.includes('foreign key') || updateError.message?.includes('fkey')) && updatePayload.user_id) {
        console.warn('User FK retry triggered on payment update');
        delete updatePayload.user_id;
        const { error: retryError } = await supabase
          .from('bookings')
          .update(updatePayload)
          .eq('readable_id', bookingId);
        updateError = retryError;
      }

      if (updateError) throw updateError;

      setPaymentScreenshotUploaded(true);
      showToast('Thank you for your payment, our executives are checking its confirmation status. your money is safe!', 'success');
    } catch (err: any) {
      showToast(err.message || 'Upload failed', 'error');
    } finally {
      setUploadingPayment(false);
    }
  };

  const validateIdentity = (): boolean => {
    if (!formData.name || formData.name.trim().length < 2) {
      showToast("Please enter your legal name (minimum 2 characters).", "warning");
      return false;
    }
    const phoneDigits = formData.whatsapp.replace(/\D/g, '');
    if (phoneDigits.length < 10) {
      showToast("Please enter a valid 10-digit WhatsApp number.", "warning");
      return false;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!formData.email || !emailRegex.test(formData.email.trim())) {
      showToast("Please enter a valid email address.", "warning");
      return false;
    }
    return true;
  };

  const validateDates = (): boolean => {
    if (!formData.fromDate || !formData.fromTime || !formData.toDate || !formData.toTime) {
      showToast("Please select pickup and drop dates and times.", "warning");
      return false;
    }
    const pickupT = formData.fromTime;
    const dropT = formData.toTime;
    if (pickupT < "06:00" || pickupT > "22:00" || dropT < "06:00" || dropT > "22:00") {
      showToast("We operate between 06:00 AM and 10:00 PM.", "warning");
      return false;
    }
    const start = new Date(`${formData.fromDate}T${formData.fromTime}`);
    const end = new Date(`${formData.toDate}T${formData.toTime}`);
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      showToast("Invalid date format.", "warning");
      return false;
    }
    if (end <= start) {
      showToast("Drop time must be after pickup time.", "warning");
      return false;
    }
    if (conflictingBooking) {
      showToast("Machine is unavailable for this slot. Please adjust dates or switch machine.", "error");
      return false;
    }
    return true;
  };

  const validateLogistics = (): boolean => {
    const deliveryAddr = formData.pickupMethod === 'home' ? (formData.deliveryAddress || formData.address || '').trim() : '';
    const pickupAddr = formData.dropMethod === 'home' 
      ? (formData.sameAddressForDrop && formData.pickupMethod === 'home' ? deliveryAddr : (formData.pickupAddress || (formData.pickupMethod !== 'home' ? formData.address : '') || '').trim())
      : '';

    if (formData.pickupMethod === 'home' && !deliveryAddr) {
      showToast("Please enter your delivery address in Kolkata.", "warning");
      return false;
    }
    if (formData.dropMethod === 'home' && !pickupAddr) {
      showToast("Please enter your return pickup address in Kolkata.", "warning");
      return false;
    }
    return true;
  };

  const handleNextFromIdentity = () => {
    if (!validateIdentity()) return;
    setHasEnteredBookingDetails(true);
    setDetailsSubStep('dates');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleNextFromDates = () => {
    if (!validateDates()) return;
    setDetailsSubStep('logistics');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleNextFromLogistics = () => {
    if (!validateLogistics()) return;
    setDetailsSubStep('summary');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const isDetailsStepValid = () => {
    const basicInfo = Boolean(formData.name && formData.whatsapp && formData.email);
    if (!basicInfo) return false;
    if (!formData.fromDate || !formData.fromTime || !formData.toDate || !formData.toTime) return false;
    if (conflictingBooking) return false;

    if (formData.pickupMethod === 'home') {
      const del = (formData.deliveryAddress || formData.address || '').trim();
      if (!del) return false;
    }

    if (formData.dropMethod === 'home') {
      if (formData.pickupMethod === 'home' && formData.sameAddressForDrop) {
        const del = (formData.deliveryAddress || formData.address || '').trim();
        if (!del) return false;
      } else {
        const pick = (formData.pickupAddress || (formData.pickupMethod !== 'home' ? formData.address : '') || '').trim();
        if (!pick) return false;
      }
    }

    return true;
  };

  const handleStepClick = (newStep: BookingStep) => {
    if (newStep === 'selection') {
      setStep(newStep);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    if (newStep === 'details') {
      if (!formData.bikeId) {
        showToast("Please select a machine first", "info");
        return;
      }
      setStep(newStep);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    if (newStep === 'payment') {
      if (step === 'payment') return;
      if (!hasSubmittedDetails) {
        if (!isDetailsStepValid()) {
          showToast("Please complete your booking details and submit request first.", "warning");
        } else {
          setDetailsSubStep('summary');
          showToast("Review your booking summary and click Submit Request.", "info");
        }
        return;
      }
      setStep(newStep);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handlePreviousStep = () => {
    if (step === 'details') {
      if (detailsSubStep === 'summary') {
        setDetailsSubStep('logistics');
      } else if (detailsSubStep === 'logistics') {
        setDetailsSubStep('dates');
      } else if (detailsSubStep === 'dates') {
        setDetailsSubStep('identity');
      } else {
        setStep('selection');
      }
    }
    if (step === 'payment') {
      setStep('details');
      setDetailsSubStep('summary');
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleBookNewRide = () => {
    const todayStr = new Date().toISOString().split('T')[0];
    setStep('selection');
    setDetailsSubStep('identity');
    setHasEnteredBookingDetails(false);
    setHasSubmittedDetails(false);
    setFormData(prev => ({ 
      ...prev, 
      bikeId: '',
      fromDate: todayStr,
      toDate: todayStr,
      pickupMethod: 'garage',
      dropMethod: 'garage',
      outstation: false 
    }));
    navigate('/book', { replace: true });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleBikeSelection = (id: string) => {
    const todayStr = new Date().toISOString().split('T')[0];
    setFormData(prev => ({ 
      ...prev, 
      bikeId: id,
      fromDate: (!prev.fromDate || prev.fromDate < todayStr) ? todayStr : prev.fromDate,
      toDate: (!prev.toDate || prev.toDate < todayStr) ? todayStr : prev.toDate,
    }));
    setHasEnteredBookingDetails(false);
    setStep('details');
    setDetailsSubStep('identity');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSubmitRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!acceptedTerms) {
      showToast("Please accept T&C", 'warning');
      return;
    }
    const pickupT = formData.fromTime;
    const dropT = formData.toTime;
    if (pickupT < "06:00" || pickupT > "22:00" || dropT < "06:00" || dropT > "22:00") {
      showToast("We only operate between 06:00 AM and 10:00 PM.", "warning");
      return;
    }
    const start = new Date(`${formData.fromDate}T${formData.fromTime}`);
    const end = new Date(`${formData.toDate}T${formData.toTime}`);
    if (end <= start) {
      showToast("Drop cannot be before pickup", 'error');
      return;
    }

    const deliveryAddr = formData.pickupMethod === 'home' ? (formData.deliveryAddress || formData.address || '').trim() : '';
    const pickupAddr = formData.dropMethod === 'home' 
      ? (formData.sameAddressForDrop && formData.pickupMethod === 'home' ? deliveryAddr : (formData.pickupAddress || (formData.pickupMethod !== 'home' ? formData.address : '') || '').trim())
      : '';

    if (formData.pickupMethod === 'home' && !deliveryAddr) {
      showToast("Please enter your delivery address.", 'warning');
      return;
    }
    if (formData.dropMethod === 'home' && !pickupAddr) {
      showToast("Please enter your return pickup address.", 'warning');
      return;
    }

    let combinedAddress = '';
    if (deliveryAddr && pickupAddr) {
      if (deliveryAddr === pickupAddr) {
        combinedAddress = `Delivery & Return: ${deliveryAddr}`;
      } else {
        combinedAddress = `Delivery: ${deliveryAddr} | Return Pickup: ${pickupAddr}`;
      }
    } else if (deliveryAddr) {
      combinedAddress = `Delivery: ${deliveryAddr}`;
    } else if (pickupAddr) {
      combinedAddress = `Return Pickup: ${pickupAddr}`;
    }

    // Check for slot collision with advance-paid bookings
    const reqStart = start.getTime();
    const reqEnd = end.getTime();

    const { data: conflicts } = await supabase
      .from('bookings')
      .select('id, readable_id, pickup_date, pickup_time, return_date, return_time')
      .eq('bike_id', parseInt(formData.bikeId))
      .in('status', ['booking_confirmed', 'ongoing']);

    const hasConflict = conflicts?.some(b => {
      const bStart = new Date(`${b.pickup_date}T${b.pickup_time || '10:00'}`).getTime();
      const bEnd = new Date(`${b.return_date}T${b.return_time || '20:00'}`).getTime();
      return reqStart < bEnd && reqEnd > bStart;
    });

    if (hasConflict) {
      showToast("This machine already has a confirmed reservation with advance payment for this time slot. Please choose another slot or machine.", 'error');
      return;
    }

    setIsSubmitting(true);
    setSubmitStatus('loading');
    try {
      const payload = {
        readable_id: bookingId,
        user_id: user?.id || null, 
        bike_id: parseInt(formData.bikeId),
        customer_name: formData.name,
        customer_phone: formData.whatsapp,
        customer_email: formData.email,
        pickup_date: formData.fromDate,
        pickup_time: formData.fromTime,
        return_date: formData.toDate,
        return_time: formData.toTime,
        total_rent: charges?.finalPayable,
        advance_amount: charges?.advance,
        security_deposit: charges?.security,
        needs_delivery: formData.pickupMethod === 'home',
        needs_return_pickup: formData.dropMethod === 'home',
        address: combinedAddress,
        status: 'pending_payment'
      };

      let { error: insertError } = await supabase.from('bookings').upsert(payload, { onConflict: 'readable_id' });
      if (insertError && (insertError.message?.includes('foreign key') || insertError.message?.includes('fkey')) && payload.user_id) {
        console.warn('Booking user_id foreign key constraint encountered, retrying with guest payload:', insertError.message);
        const retryPayload = { ...payload, user_id: null };
        const { error: retryError } = await supabase.from('bookings').upsert(retryPayload, { onConflict: 'readable_id' });
        insertError = retryError;
      }
      if (insertError) throw insertError;

      // SEND TO WEB3FORMS FOR EMAIL NOTIFICATION
      try {
        const bike = bikes.find(b => b.id === parseInt(formData.bikeId));
        await fetch('https://api.web3forms.com/submit', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          body: JSON.stringify({
            access_key: WEB3FORMS_ACCESS_KEY,
            subject: `New Booking Request: ${bookingId} - ${formData.name}`,
            from_name: "Rydeit Booking System",
            booking_id: bookingId,
            customer_name: formData.name,
            customer_phone: formData.whatsapp,
            customer_email: formData.email,
            bike_name: bike?.name || 'Unknown',
            pickup: `${formData.fromDate} @ ${formData.fromTime}`,
            return: `${formData.toDate} @ ${formData.toTime}`,
            total_rent: `₹${charges?.finalPayable}`,
            advance_to_pay: `₹${charges?.advance}`,
            security_deposit: `₹${charges?.security}`,
            travel_zone: formData.outstation ? 'OUTSTATION' : 'LOCAL',
            pickup_method: formData.pickupMethod,
            drop_method: formData.dropMethod,
            delivery_address: deliveryAddr || 'Garage Self-Pickup (6C, Mohammadan Burial Ground Lane)',
            return_pickup_address: pickupAddr || 'Garage Self-Drop (6C, Mohammadan Burial Ground Lane)',
            address_summary: combinedAddress || 'Garage Self Pickup & Drop'
          })
        });
      } catch (e) {
        console.error("Web3Forms error:", e);
        // Don't block the user if email fails
      }

      setSubmitStatus('success');
      await new Promise(resolve => setTimeout(resolve, 350));
      setHasSubmittedDetails(true);
      
      // Advance to payment step to show QR code and reservation instructions
      setStep('payment');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setIsSubmitting(false);
      setSubmitStatus('idle');
    }
  };

  const scrollToCategory = (cat: string) => {
    const el = document.getElementById(`booking-cat-${cat}`);
    if (el) {
      const offset = 100;
      const bodyRect = document.body.getBoundingClientRect().top;
      const elementRect = el.getBoundingClientRect().top;
      const elementPosition = elementRect - bodyRect;
      const offsetPosition = elementPosition - offset;
      window.scrollTo({ top: offsetPosition, behavior: 'smooth' });
    }
  };

  const categories: BikeCategory[] = ['Scooter', 'Bikes', 'Royal Enfield', 'Sports'];

  return (
    <section className="py-2 sm:py-4 md:py-6 bg-black min-h-screen flex flex-col justify-between">
      {/* 1. SLIM STICKY SUMMARY AT THE TOP */}
      {bike && (step === 'details' || step === 'payment') && (
        <div className="sticky top-0 z-30 bg-black/95 backdrop-blur-md border-b border-white/10 py-2.5 px-6 sm:px-8 w-full -mt-2 sm:-mt-4 md:-mt-6 mb-4 sm:mb-6 shadow-lg shadow-black/50">
          <div className="max-w-md sm:max-w-lg mx-auto flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
              <img
                src={bike.imageUrl}
                alt={bike.name}
                className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg object-cover bg-neutral-900 border border-white/10 shrink-0"
              />
              <div className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm truncate">
                <span className="font-semibold text-white tracking-tight truncate">{bike.name}</span>
                <span className="text-neutral-600 shrink-0">·</span>
                {(detailsSubStep !== 'identity' || step === 'payment') ? (
                  <>
                    <span className="text-neutral-400 shrink-0 font-medium">
                      {daysCount} {daysCount === 1 ? 'day' : 'days'}
                    </span>
                    <span className="text-neutral-600 shrink-0">·</span>
                    <span
                      key={charges?.finalPayable}
                      className="font-bold text-white font-mono shrink-0 animate-price-crossfade"
                    >
                      ₹{(charges?.finalPayable || 0).toLocaleString('en-IN')}
                    </span>
                  </>
                ) : (
                  <span className="text-neutral-300 font-mono font-medium shrink-0">
                    ₹{bike.dailyRate}/day
                  </span>
                )}
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                setStep('selection');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className="text-[11px] sm:text-xs text-neutral-400 hover:text-white transition-colors cursor-pointer shrink-0 font-medium px-2 py-1 rounded-md hover:bg-white/5 active:scale-[0.98]"
            >
              Change
            </button>
          </div>
        </div>
      )}

      <div className={`mx-auto w-full flex-1 flex flex-col ${step === 'selection' ? 'container px-4 max-w-2xl' : 'max-w-md sm:max-w-lg px-6 sm:px-8 pb-28 sm:pb-32'}`}>
        {step === 'selection' && (
          <div className="bg-[#0a0a0a] rounded-3xl p-6 sm:p-10 border border-neutral-800 shadow-2xl animate-fade-in flex-1">
            <div className="flex flex-wrap justify-center gap-3 mb-10 sticky top-4 z-20 py-3 bg-brand-gray-dark/80 backdrop-blur-md rounded-full px-5 border border-white/10 shadow-xl">
              {categories.map(cat => (
                <button 
                  key={cat}
                  onClick={() => scrollToCategory(cat)}
                  className="px-5 py-2 rounded-full bg-brand-black border border-brand-teal/20 text-brand-teal text-[10px] font-black uppercase tracking-widest hover:bg-brand-teal hover:text-brand-black transition-all"
                >
                  {cat === 'Scooter' ? 'Scooty' : cat === 'Royal Enfield' ? 'Enfield' : cat}
                </button>
              ))}
            </div>

            {categories.map(cat => {
              const catBikes = bikes.filter(b => b.category === cat);
              if (catBikes.length === 0) return null;
              return (
                <div key={cat} id={`booking-cat-${cat}`} className="mb-14 scroll-mt-24">
                  <h3 className="text-lg sm:text-xl font-heading text-brand-teal mb-6 uppercase tracking-widest border-l-4 border-brand-orange pl-3.5">{cat}</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                    {catBikes.map(b => {
                      const isMaintenance = b.status === 'Maintenance';
                      return (
                        <div key={b.id} className={`bg-brand-black/60 p-5 rounded-2xl border transition-all group ${isMaintenance ? 'border-brand-orange/20 opacity-60' : 'border-white/5 hover:border-brand-teal'}`}>
                          <div className="relative">
                              <img src={b.imageUrl} className={`w-full h-32 object-cover rounded-xl mb-3.5 transition-transform ${!isMaintenance && 'group-hover:scale-105'}`} alt="" />
                              {isMaintenance ? (
                                <div className="absolute top-2 right-2 bg-brand-orange text-white text-[8px] font-black px-2 py-1 rounded-full uppercase tracking-widest shadow">
                                  Under Service
                                </div>
                              ) : (
                                <div className="absolute top-2 right-2 bg-brand-teal/80 text-brand-black text-[8px] font-black px-2 py-1 rounded-full uppercase tracking-widest shadow">
                                  Available
                                </div>
                              )}
                          </div>
                          <h4 className="text-white font-bold text-xs uppercase tracking-tight">{b.name}</h4>
                          <div className="flex items-center gap-2 mt-1">
                              <p className="text-brand-teal font-heading text-base">₹{b.dailyRate}</p>
                              <span className="text-[8px] text-white/60 uppercase font-black tracking-widest">/ day</span>
                          </div>
                          <button 
                              onClick={() => handleBikeSelection(b.id.toString())} 
                              disabled={isMaintenance}
                              className={`w-full py-2.5 font-black rounded-xl uppercase tracking-widest text-[10px] mt-3.5 transition-all ${isMaintenance ? 'bg-brand-gray-dark text-white/20 cursor-not-allowed' : 'bg-brand-teal/10 text-brand-teal hover:bg-brand-teal hover:text-black cursor-pointer'}`}
                          >
                              {isMaintenance ? 'Under Service' : 'Select Machine'}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* 2. SINGLE SURFACE FORM (NO CARD-INSIDE-A-CARD) */}
        {step === 'details' && (
          <div className="w-full flex-1 flex flex-col py-1 sm:py-2">
            
            {/* 4 SUB-STEP TABS - SUBTLE, SPACIOUS & CLASSY */}
            <nav 
              aria-label="Booking steps" 
              className="mb-7 w-full bg-neutral-900/50 border border-white/[0.08] rounded-xl p-1.5 grid grid-cols-4 gap-1.5 shadow-sm"
            >
              {[
                { key: 'identity' as DetailsSubStep, num: 1, label: 'Identity' },
                { key: 'dates' as DetailsSubStep, num: 2, label: 'Schedule' },
                { key: 'logistics' as DetailsSubStep, num: 3, label: 'Logistics' },
                { key: 'summary' as DetailsSubStep, num: 4, label: 'Summary' },
              ].map((s) => {
                const order: DetailsSubStep[] = ['identity', 'dates', 'logistics', 'summary'];
                const curIdx = order.indexOf(detailsSubStep);
                const stepIdx = order.indexOf(s.key);
                const isActive = detailsSubStep === s.key;
                const isPassed = stepIdx < curIdx;

                return (
                  <button
                    key={s.key}
                    type="button"
                    onClick={() => {
                      if (stepIdx < curIdx) {
                        setDetailsSubStep(s.key);
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      } else if (stepIdx > curIdx) {
                        if (curIdx === 0 && !validateIdentity()) return;
                        if (curIdx === 1 && !validateDates()) return;
                        if (curIdx === 2 && !validateLogistics()) return;
                        setDetailsSubStep(s.key);
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }
                    }}
                    className={`py-2 px-1.5 rounded-lg flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-1.5 transition-all duration-200 cursor-pointer ${
                      isActive
                        ? 'bg-white/10 text-white font-medium border border-white/15 shadow-sm'
                        : isPassed
                        ? 'text-neutral-300 hover:text-white hover:bg-white/[0.04]'
                        : 'text-neutral-500 hover:text-neutral-400'
                    }`}
                  >
                    <span
                      className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-mono shrink-0 transition-colors ${
                        isActive
                          ? 'bg-brand-orange text-black font-bold'
                          : isPassed
                          ? 'bg-white/10 text-neutral-300 font-semibold'
                          : 'bg-white/5 text-neutral-500'
                      }`}
                    >
                      {isPassed ? '✓' : s.num}
                    </span>
                    <span className="text-[11px] sm:text-xs tracking-tight truncate">
                      {s.label}
                    </span>
                  </button>
                );
              })}
            </nav>

            {/* SUB-STEP 1: IDENTITY */}
            {detailsSubStep === 'identity' && (
              <div key="identity" className="space-y-5 animate-step-in w-full">
                <div className="field-enter bg-[#121214] border border-white/[0.12] rounded-2xl p-4 sm:p-5 space-y-4 shadow-[0_8px_24px_-4px_rgba(0,0,0,0.7),0_2px_6px_rgba(0,0,0,0.4)] hover:border-white/[0.22] hover:shadow-[0_12px_32px_-4px_rgba(0,0,0,0.85)] hover:-translate-y-0.5 transition-all duration-300" style={{ animationDelay: '0ms' }}>
                  {/* Section Title */}
                  <div className="flex items-center gap-2">
                    <span className="w-1.5 h-4 bg-brand-orange rounded-full shrink-0"></span>
                    <h3 className="text-sm sm:text-base font-semibold text-white tracking-tight">
                      Rider Contact Details
                    </h3>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-1">
                    {/* Field 1: Name */}
                    <div className="space-y-1.5 relative">
                      <label className="block text-xs font-medium text-neutral-200 tracking-normal ml-0.5">
                        Legal Full Name
                      </label>
                      <div className="relative">
                        <input 
                          type="text" 
                          autoComplete="name"
                          placeholder="e.g. Mohammad Asif Azad" 
                          value={formData.name} 
                          onChange={(e) => setFormData(p => ({...p, name: e.target.value}))} 
                          className={inputStyle(isNameValid ? 'pr-9' : '')} 
                          required 
                        />
                        {isNameValid && (
                          <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                            <ValidCheck />
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Field 2: WhatsApp Phone */}
                    <div className="space-y-1.5 relative">
                      <label className="block text-xs font-medium text-neutral-200 tracking-normal ml-0.5">
                        WhatsApp Number
                      </label>
                      <div className="relative">
                        <input 
                          type="tel" 
                          inputMode="tel"
                          autoComplete="tel"
                          placeholder="10 Digit Mobile (e.g. 9831846183)" 
                          value={formData.whatsapp} 
                          onChange={(e) => setFormData(p => ({...p, whatsapp: e.target.value}))} 
                          className={inputStyle(isPhoneValid ? 'pr-9' : '')} 
                          required 
                        />
                        {isPhoneValid && (
                          <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                            <ValidCheck />
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Field 3: Email */}
                  <div className="space-y-1.5 relative">
                    <label className="block text-xs font-medium text-neutral-200 tracking-normal ml-0.5">
                      Email Address
                    </label>
                    <div className="relative">
                      <input 
                        type="email" 
                        inputMode="email"
                        autoComplete="email"
                        placeholder="e.g. azadmdasif@gmail.com" 
                        value={formData.email} 
                        onChange={(e) => setFormData(p => ({...p, email: e.target.value}))} 
                        className={inputStyle(isEmailValid ? 'pr-9' : '')} 
                        required 
                      />
                      {isEmailValid && (
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                          <ValidCheck />
                        </div>
                      )}
                    </div>
                  </div>

                  {/* 4. TRUST, DONE QUIETLY */}
                  <div className="flex items-center gap-2 text-neutral-400 text-xs font-normal pt-1 ml-0.5 border-t border-white/[0.06]">
                    <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span className="text-[11px] text-neutral-400">Strictly private. We never share your contact details.</span>
                  </div>
                </div>
              </div>
            )}

            {/* SUB-STEP 2: BOOKING DETAILS (SCHEDULE & TRAVEL ZONE) */}
            {detailsSubStep === 'dates' && (
              <div key="dates" className="space-y-5 animate-step-in w-full">
                
                {/* Question 1: Travel Zone Selection */}
                <div className="field-enter bg-[#121214] border border-white/[0.12] rounded-2xl p-4 sm:p-5 space-y-3.5 shadow-[0_8px_24px_-4px_rgba(0,0,0,0.7),0_2px_6px_rgba(0,0,0,0.4)] hover:border-white/[0.22] hover:shadow-[0_12px_32px_-4px_rgba(0,0,0,0.85)] hover:-translate-y-0.5 transition-all duration-300" style={{ animationDelay: '0ms' }}>
                  <div className="flex items-center gap-2">
                    <span className="w-1.5 h-4 bg-brand-orange rounded-full shrink-0"></span>
                    <h3 className="text-sm sm:text-base font-semibold text-white tracking-tight">
                      Travel Zone
                    </h3>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-0.5">
                    <button 
                      type="button" 
                      onClick={() => setFormData(p => ({...p, outstation: false}))} 
                      className={`p-3.5 rounded-xl border text-left flex items-center justify-between transition-all duration-200 cursor-pointer active:scale-[0.98] ${
                        !formData.outstation 
                          ? 'bg-neutral-900 border-brand-orange/70 ring-1 ring-brand-orange/30 shadow-sm' 
                          : 'bg-black/50 border-white/[0.08] hover:border-white/20'
                      }`}
                    >
                      <p className={`text-xs sm:text-sm font-medium ${!formData.outstation ? 'text-white font-semibold' : 'text-neutral-300'}`}>
                        Within Kolkata
                      </p>
                      <div className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${
                        !formData.outstation ? 'border-brand-orange bg-brand-orange' : 'border-white/25'
                      }`}>
                        {!formData.outstation && <div className="w-1.5 h-1.5 rounded-full bg-black" />}
                      </div>
                    </button>

                    <button 
                      type="button" 
                      onClick={() => setFormData(p => ({...p, outstation: true}))} 
                      className={`p-3.5 rounded-xl border text-left flex items-center justify-between transition-all duration-200 cursor-pointer active:scale-[0.98] ${
                        formData.outstation 
                          ? 'bg-neutral-900 border-brand-orange/70 ring-1 ring-brand-orange/30 shadow-sm' 
                          : 'bg-black/50 border-white/[0.08] hover:border-white/20'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className={`text-xs sm:text-sm font-medium ${formData.outstation ? 'text-white font-semibold' : 'text-neutral-300'}`}>
                          Outside City
                        </span>
                        <span className="text-[10px] text-brand-orange font-medium bg-brand-orange/10 px-1.5 py-0.5 rounded border border-brand-orange/20">
                          +₹99/day
                        </span>
                      </div>
                      <div className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${
                        formData.outstation ? 'border-brand-orange bg-brand-orange' : 'border-white/25'
                      }`}>
                        {formData.outstation && <div className="w-1.5 h-1.5 rounded-full bg-black" />}
                      </div>
                    </button>
                  </div>
                </div>

                {/* Question 2: Pickup Schedule */}
                <div className="field-enter bg-[#121214] border border-white/[0.12] rounded-2xl p-4 sm:p-5 space-y-3.5 shadow-[0_8px_24px_-4px_rgba(0,0,0,0.7),0_2px_6px_rgba(0,0,0,0.4)] hover:border-white/[0.22] hover:shadow-[0_12px_32px_-4px_rgba(0,0,0,0.85)] hover:-translate-y-0.5 transition-all duration-300" style={{ animationDelay: '50ms' }}>
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="w-1.5 h-4 bg-brand-orange rounded-full shrink-0"></span>
                      <h3 className="text-sm sm:text-base font-semibold text-white tracking-tight">
                        Pickup Schedule
                      </h3>
                    </div>
                    {(charges?.isEarlyPickup || charges?.isLatePickup) && (
                      <span className="text-[11px] text-brand-orange font-medium bg-brand-orange/10 px-2.5 py-1 rounded-md border border-brand-orange/20 shrink-0">
                        +₹99 fee
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-0.5">
                    <div className="space-y-1.5">
                      <label className="block text-xs font-medium text-neutral-200 ml-0.5">Pickup Date</label>
                      <input type="date" value={formData.fromDate} onChange={(e) => setFormData(p => ({...p, fromDate: e.target.value}))} className={inputStyle()} required />
                    </div>
                    <div className="space-y-1.5">
                      <label className="block text-xs font-medium text-neutral-200 ml-0.5">Pickup Time</label>
                      <input type="time" min="06:00" max="22:00" value={formData.fromTime} onChange={(e) => setFormData(p => ({...p, fromTime: e.target.value}))} className={inputStyle()} required />
                    </div>
                  </div>
                </div>

                {/* Question 3: Return Schedule */}
                <div className="field-enter bg-[#121214] border border-white/[0.12] rounded-2xl p-4 sm:p-5 space-y-3.5 shadow-[0_8px_24px_-4px_rgba(0,0,0,0.7),0_2px_6px_rgba(0,0,0,0.4)] hover:border-white/[0.22] hover:shadow-[0_12px_32px_-4px_rgba(0,0,0,0.85)] hover:-translate-y-0.5 transition-all duration-300" style={{ animationDelay: '100ms' }}>
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="w-1.5 h-4 bg-brand-orange rounded-full shrink-0"></span>
                      <h3 className="text-sm sm:text-base font-semibold text-white tracking-tight">
                        Return Schedule
                      </h3>
                    </div>
                    {(charges?.isEarlyDrop || charges?.isLateDrop) && (
                      <span className="text-[11px] text-brand-orange font-medium bg-brand-orange/10 px-2.5 py-1 rounded-md border border-brand-orange/20 shrink-0">
                        +₹99 fee
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-0.5">
                    <div className="space-y-1.5">
                      <label className="block text-xs font-medium text-neutral-200 ml-0.5">Return Date</label>
                      <input type="date" value={formData.toDate} onChange={(e) => setFormData(p => ({...p, toDate: e.target.value}))} className={inputStyle()} required />
                    </div>
                    <div className="space-y-1.5">
                      <label className="block text-xs font-medium text-neutral-200 ml-0.5">Return Time</label>
                      <input type="time" min="06:00" max="22:00" value={formData.toTime} onChange={(e) => setFormData(p => ({...p, toTime: e.target.value}))} className={inputStyle()} required />
                    </div>
                  </div>
                </div>

                {/* Availability Badge */}
                <div className="field-enter" style={{ animationDelay: '150ms' }}>
                  {conflictingBooking ? (
                    <div className="bg-red-500/10 border border-red-500/40 rounded-xl p-3.5 text-white space-y-2">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-red-400 shrink-0"></span>
                          <h5 className="text-xs sm:text-sm font-medium text-red-400">
                            Machine unavailable for this schedule
                          </h5>
                        </div>
                        <button 
                          type="button" 
                          onClick={() => setStep('selection')} 
                          className="px-2.5 py-1 bg-white/10 hover:bg-white/20 text-white rounded-lg text-xs font-medium transition-all self-start sm:self-auto cursor-pointer"
                        >
                          Change Bike →
                        </button>
                      </div>
                      <p className="text-xs text-neutral-300 leading-relaxed">
                        <strong>{bike?.name}</strong> is reserved ({conflictingBooking.readable_id}) from <span className="text-white font-medium">{conflictingBooking.pickup_date} @ {conflictingBooking.pickup_time?.slice(0,5)}</span> to <span className="text-white font-medium">{conflictingBooking.return_date} @ {conflictingBooking.return_time?.slice(0,5)}</span>.
                      </p>
                    </div>
                  ) : (
                    <div className="bg-emerald-500/[0.07] border border-emerald-500/20 rounded-xl px-3.5 py-2.5 text-xs text-emerald-300 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                        <span className="font-medium">
                          ✓ {bike?.name} is ready & available
                        </span>
                      </div>
                      <span className="text-[10px] text-neutral-400 font-medium hidden sm:inline">Guaranteed Machine</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* SUB-STEP 3: PICKUP & DROP (LOGISTICS) */}
            {detailsSubStep === 'logistics' && (
              <div key="logistics" className="space-y-5 animate-step-in w-full">
                {/* Question 1: How to get vehicle */}
                <div className="field-enter bg-[#121214] border border-white/[0.12] rounded-2xl p-4 sm:p-5 space-y-3.5 shadow-[0_8px_24px_-4px_rgba(0,0,0,0.7),0_2px_6px_rgba(0,0,0,0.4)] hover:border-white/[0.22] hover:shadow-[0_12px_32px_-4px_rgba(0,0,0,0.85)] hover:-translate-y-0.5 transition-all duration-300" style={{ animationDelay: '0ms' }}>
                  <div className="flex items-center gap-2">
                    <span className="w-1.5 h-4 bg-brand-orange rounded-full shrink-0"></span>
                    <h3 className="text-sm sm:text-base font-semibold text-white tracking-tight">
                      Vehicle Pickup / Delivery
                    </h3>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-0.5">
                    <button 
                      type="button" 
                      onClick={() => setFormData(p => ({...p, pickupMethod: 'garage'}))} 
                      className={`p-3.5 rounded-xl border text-left flex items-center justify-between transition-all duration-200 cursor-pointer active:scale-[0.98] ${
                        formData.pickupMethod === 'garage' 
                          ? 'bg-neutral-900 border-brand-orange/70 ring-1 ring-brand-orange/30 shadow-sm' 
                          : 'bg-black/50 border-white/[0.08] hover:border-white/20'
                      }`}
                    >
                      <div className="space-y-0.5">
                        <p className={`text-xs sm:text-sm font-medium ${formData.pickupMethod === 'garage' ? 'text-white font-semibold' : 'text-neutral-300'}`}>
                          Garage Self Pickup
                        </p>
                        <p className="text-[11px] text-emerald-400 font-medium">Free · 6C Mohammadan Burial Ground Ln</p>
                      </div>
                      <div className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${
                        formData.pickupMethod === 'garage' ? 'border-brand-orange bg-brand-orange' : 'border-white/25'
                      }`}>
                        {formData.pickupMethod === 'garage' && <div className="w-1.5 h-1.5 rounded-full bg-black" />}
                      </div>
                    </button>

                    <button 
                      type="button" 
                      onClick={() => setFormData(p => ({...p, pickupMethod: 'home'}))} 
                      className={`p-3.5 rounded-xl border text-left flex items-center justify-between transition-all duration-200 cursor-pointer active:scale-[0.98] ${
                        formData.pickupMethod === 'home' 
                          ? 'bg-neutral-900 border-brand-orange/70 ring-1 ring-brand-orange/30 shadow-sm' 
                          : 'bg-black/50 border-white/[0.08] hover:border-white/20'
                      }`}
                    >
                      <div className="space-y-0.5">
                        <p className={`text-xs sm:text-sm font-medium ${formData.pickupMethod === 'home' ? 'text-white font-semibold' : 'text-neutral-300'}`}>
                          Doorstep Delivery
                        </p>
                        <p className="text-[11px] text-brand-orange font-medium">+₹199 · Delivery to your location</p>
                      </div>
                      <div className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${
                        formData.pickupMethod === 'home' ? 'border-brand-orange bg-brand-orange' : 'border-white/25'
                      }`}>
                        {formData.pickupMethod === 'home' && <div className="w-1.5 h-1.5 rounded-full bg-black" />}
                      </div>
                    </button>
                  </div>
                </div>

                {/* Question 2: How to return vehicle */}
                <div className="field-enter bg-[#121214] border border-white/[0.12] rounded-2xl p-4 sm:p-5 space-y-3.5 shadow-[0_8px_24px_-4px_rgba(0,0,0,0.7),0_2px_6px_rgba(0,0,0,0.4)] hover:border-white/[0.22] hover:shadow-[0_12px_32px_-4px_rgba(0,0,0,0.85)] hover:-translate-y-0.5 transition-all duration-300" style={{ animationDelay: '50ms' }}>
                  <div className="flex items-center gap-2">
                    <span className="w-1.5 h-4 bg-brand-orange rounded-full shrink-0"></span>
                    <h3 className="text-sm sm:text-base font-semibold text-white tracking-tight">
                      Vehicle Return / Collection
                    </h3>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-0.5">
                    <button 
                      type="button" 
                      onClick={() => setFormData(p => ({...p, dropMethod: 'garage'}))} 
                      className={`p-3.5 rounded-xl border text-left flex items-center justify-between transition-all duration-200 cursor-pointer active:scale-[0.98] ${
                        formData.dropMethod === 'garage' 
                          ? 'bg-neutral-900 border-brand-orange/70 ring-1 ring-brand-orange/30 shadow-sm' 
                          : 'bg-black/50 border-white/[0.08] hover:border-white/20'
                      }`}
                    >
                      <div className="space-y-0.5">
                        <p className={`text-xs sm:text-sm font-medium ${formData.dropMethod === 'garage' ? 'text-white font-semibold' : 'text-neutral-300'}`}>
                          Garage Self Drop
                        </p>
                        <p className="text-[11px] text-emerald-400 font-medium">Free · 6C Mohammadan Burial Ground Ln</p>
                      </div>
                      <div className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${
                        formData.dropMethod === 'garage' ? 'border-brand-orange bg-brand-orange' : 'border-white/25'
                      }`}>
                        {formData.dropMethod === 'garage' && <div className="w-1.5 h-1.5 rounded-full bg-black" />}
                      </div>
                    </button>

                    <button 
                      type="button" 
                      onClick={() => setFormData(p => ({...p, dropMethod: 'home'}))} 
                      className={`p-3.5 rounded-xl border text-left flex items-center justify-between transition-all duration-200 cursor-pointer active:scale-[0.98] ${
                        formData.dropMethod === 'home' 
                          ? 'bg-neutral-900 border-brand-orange/70 ring-1 ring-brand-orange/30 shadow-sm' 
                          : 'bg-black/50 border-white/[0.08] hover:border-white/20'
                      }`}
                    >
                      <div className="space-y-0.5">
                        <p className={`text-xs sm:text-sm font-medium ${formData.dropMethod === 'home' ? 'text-white font-semibold' : 'text-neutral-300'}`}>
                          Doorstep Collection
                        </p>
                        <p className="text-[11px] text-brand-orange font-medium">+₹199 · Picked up from your location</p>
                      </div>
                      <div className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${
                        formData.dropMethod === 'home' ? 'border-brand-orange bg-brand-orange' : 'border-white/25'
                      }`}>
                        {formData.dropMethod === 'home' && <div className="w-1.5 h-1.5 rounded-full bg-black" />}
                      </div>
                    </button>
                  </div>
                </div>

                {/* Question 3: Address Inputs Based on Methods */}
                <div className="field-enter" style={{ animationDelay: '100ms' }}>
                  {formData.pickupMethod === 'home' && formData.dropMethod === 'home' ? (
                    <div className="space-y-4 bg-[#121214] p-4 sm:p-5 rounded-2xl border border-white/[0.12] shadow-[0_8px_24px_-4px_rgba(0,0,0,0.7),0_2px_6px_rgba(0,0,0,0.4)] hover:border-white/[0.22] hover:shadow-[0_12px_32px_-4px_rgba(0,0,0,0.85)] hover:-translate-y-0.5 transition-all duration-300">
                      <div className="flex items-center gap-2">
                        <span className="w-1.5 h-4 bg-brand-orange rounded-full shrink-0"></span>
                        <h3 className="text-sm sm:text-base font-semibold text-white tracking-tight">
                          Delivery Address
                        </h3>
                      </div>

                      <div className="space-y-1.5 pt-0.5">
                        <textarea 
                          value={formData.deliveryAddress || ''} 
                          onChange={(e) => setFormData(p => ({...p, deliveryAddress: e.target.value}))} 
                          placeholder="Enter delivery address in Kolkata (Flat/House No., Street, Landmark)..." 
                          className={`${inputStyle()} h-20 resize-none`} 
                          required 
                        />
                      </div>

                      <div className="bg-neutral-950/70 p-3.5 rounded-xl border border-white/[0.07] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                        <p className="text-xs sm:text-sm font-medium text-white">
                          Return Collection Address
                        </p>

                        <div className="flex items-center gap-1.5 bg-neutral-900 p-1 rounded-lg border border-white/10 shrink-0">
                          <button
                            type="button"
                            onClick={() => setFormData(p => ({...p, sameAddressForDrop: true}))}
                            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all cursor-pointer ${
                              formData.sameAddressForDrop
                                ? 'bg-white/15 text-white shadow-sm'
                                : 'text-neutral-400 hover:text-white'
                            }`}
                          >
                            Same Address
                          </button>
                          <button
                            type="button"
                            onClick={() => setFormData(p => ({...p, sameAddressForDrop: false}))}
                            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all cursor-pointer ${
                              !formData.sameAddressForDrop
                                ? 'bg-white/15 text-white shadow-sm'
                                : 'text-neutral-400 hover:text-white'
                            }`}
                          >
                            Different Address
                          </button>
                        </div>
                      </div>

                      {!formData.sameAddressForDrop && (
                        <div className="space-y-1.5 pt-1">
                          <label className="block text-xs font-medium text-neutral-200 ml-0.5">
                            Return Collection Address (End of Ride)
                          </label>
                          <textarea 
                            value={formData.pickupAddress || ''} 
                            onChange={(e) => setFormData(p => ({...p, pickupAddress: e.target.value}))} 
                            placeholder="Enter different return pickup address in Kolkata..." 
                            className={`${inputStyle()} h-20 resize-none`} 
                            required 
                          />
                        </div>
                      )}
                    </div>
                  ) : formData.pickupMethod === 'home' ? (
                    <div className="space-y-3 bg-[#121214] p-4 sm:p-5 rounded-2xl border border-white/[0.12] shadow-[0_8px_24px_-4px_rgba(0,0,0,0.7),0_2px_6px_rgba(0,0,0,0.4)] hover:border-white/[0.22] hover:shadow-[0_12px_32px_-4px_rgba(0,0,0,0.85)] hover:-translate-y-0.5 transition-all duration-300">
                      <div className="flex items-center gap-2">
                        <span className="w-1.5 h-4 bg-brand-orange rounded-full shrink-0"></span>
                        <h3 className="text-sm sm:text-base font-semibold text-white tracking-tight">
                          Delivery Address
                        </h3>
                      </div>

                      <div className="space-y-1.5 pt-0.5">
                        <textarea 
                          value={formData.deliveryAddress || ''} 
                          onChange={(e) => setFormData(p => ({...p, deliveryAddress: e.target.value}))} 
                          placeholder="Enter Kolkata delivery address (Flat/House No., Street, Landmark)..." 
                          className={`${inputStyle()} h-20 resize-none`} 
                          required 
                        />
                        <p className="text-[11px] text-neutral-400 ml-0.5">
                          ✓ Return point: Rydeit Garage (6C, Mohammadan Burial Ground Lane) at trip end.
                        </p>
                      </div>
                    </div>
                  ) : formData.dropMethod === 'home' ? (
                    <div className="space-y-3 bg-[#121214] p-4 sm:p-5 rounded-2xl border border-white/[0.12] shadow-[0_8px_24px_-4px_rgba(0,0,0,0.7),0_2px_6px_rgba(0,0,0,0.4)] hover:border-white/[0.22] hover:shadow-[0_12px_32px_-4px_rgba(0,0,0,0.85)] hover:-translate-y-0.5 transition-all duration-300">
                      <div className="flex items-center gap-2">
                        <span className="w-1.5 h-4 bg-brand-orange rounded-full shrink-0"></span>
                        <h3 className="text-sm sm:text-base font-semibold text-white tracking-tight">
                          Return Collection Address
                        </h3>
                      </div>

                      <div className="space-y-1.5 pt-0.5">
                        <textarea 
                          value={formData.pickupAddress || ''} 
                          onChange={(e) => setFormData(p => ({...p, pickupAddress: e.target.value}))} 
                          placeholder="Enter collection address in Kolkata..." 
                          className={`${inputStyle()} h-20 resize-none`} 
                          required 
                        />
                        <p className="text-[11px] text-neutral-400 ml-0.5">
                          ✓ Pickup point: Rydeit Garage (6C, Mohammadan Burial Ground Lane) at trip start.
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-[#121214] p-4 sm:p-5 rounded-2xl border border-white/[0.12] shadow-[0_8px_24px_-4px_rgba(0,0,0,0.7),0_2px_6px_rgba(0,0,0,0.4)] flex items-center gap-3.5 text-white/80">
                      <div className="w-9 h-9 rounded-xl bg-white/[0.05] border border-white/10 flex items-center justify-center text-lg shrink-0">
                        📍
                      </div>
                      <div className="space-y-0.5">
                        <p className="text-sm font-semibold text-white tracking-tight">Garage Self Pickup & Return</p>
                        <p className="text-neutral-400 text-xs">6C, Mohammadan Burial Ground Lane, Kolkata - 700023. Zero logistics fee.</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* SUB-STEP 4: BOOKING SUMMARY (REVIEW & CONFIRM) */}
            {detailsSubStep === 'summary' && (
              <form onSubmit={handleSubmitRequest} key="summary" className="space-y-6 animate-step-in w-full">
                {/* Summary Grid: Trip Overview & Fare Breakdown */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  
                  {/* Left: Rider & Logistics Summary */}
                  <div className="field-enter bg-[#121214] p-4 sm:p-5 rounded-2xl border border-white/[0.12] space-y-3.5 shadow-[0_8px_24px_-4px_rgba(0,0,0,0.7),0_2px_6px_rgba(0,0,0,0.4)] hover:border-white/[0.22] hover:shadow-[0_12px_32px_-4px_rgba(0,0,0,0.85)] hover:-translate-y-0.5 transition-all duration-300" style={{ animationDelay: '0ms' }}>
                    <div className="flex items-center justify-between pb-2.5 border-b border-white/[0.08]">
                      <span className="text-sm font-semibold text-white tracking-tight flex items-center gap-2">
                        <User className="w-3.5 h-3.5 text-brand-orange shrink-0" /> Rider Info
                      </span>
                      <button
                        type="button"
                        onClick={() => { setDetailsSubStep('identity'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                        className="text-xs text-neutral-400 hover:text-white flex items-center gap-1 cursor-pointer font-medium transition-colors"
                      >
                        <Edit3 className="w-3 h-3" /> Edit
                      </button>
                    </div>

                    <div className="space-y-1 text-xs sm:text-sm">
                      <p className="text-white font-medium">{formData.name}</p>
                      <p className="text-neutral-400 font-mono text-xs">{formData.whatsapp}</p>
                      <p className="text-neutral-400 text-xs truncate">{formData.email}</p>
                    </div>

                    <div className="flex items-center justify-between pt-3 pb-2 border-t border-b border-white/[0.08]">
                      <span className="text-sm font-semibold text-white tracking-tight flex items-center gap-2">
                        <Calendar className="w-3.5 h-3.5 text-sky-400 shrink-0" /> Schedule & Zone
                      </span>
                      <button
                        type="button"
                        onClick={() => { setDetailsSubStep('dates'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                        className="text-xs text-neutral-400 hover:text-white flex items-center gap-1 cursor-pointer font-medium transition-colors"
                      >
                        <Edit3 className="w-3 h-3" /> Edit
                      </button>
                    </div>

                    <div className="space-y-1.5 text-xs sm:text-sm">
                      <div className="flex justify-between items-center">
                        <span className="text-neutral-400">Pickup:</span>
                        <span className="text-white font-medium">{formData.fromDate} @ {formData.fromTime}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-neutral-400">Return:</span>
                        <span className="text-white font-medium">{formData.toDate} @ {formData.toTime}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-neutral-400">Travel Zone:</span>
                        <span className="text-brand-orange font-medium">{formData.outstation ? 'Outside City' : 'Within Kolkata'}</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-3 pb-2 border-t border-b border-white/[0.08]">
                      <span className="text-sm font-semibold text-white tracking-tight flex items-center gap-2">
                        <MapPin className="w-3.5 h-3.5 text-emerald-400 shrink-0" /> Logistics
                      </span>
                      <button
                        type="button"
                        onClick={() => { setDetailsSubStep('logistics'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                        className="text-xs text-neutral-400 hover:text-white flex items-center gap-1 cursor-pointer font-medium transition-colors"
                      >
                        <Edit3 className="w-3 h-3" /> Edit
                      </button>
                    </div>

                    <div className="space-y-1.5 text-xs">
                      <p className="text-neutral-300">
                        <span className="text-neutral-400 font-medium">Start: </span>
                        {formData.pickupMethod === 'home' ? formData.deliveryAddress || 'Delivery Address' : 'Rydeit Garage (Self Pickup)'}
                      </p>
                      <p className="text-neutral-300">
                        <span className="text-neutral-400 font-medium">End: </span>
                        {formData.dropMethod === 'home' ? (formData.sameAddressForDrop ? formData.deliveryAddress : formData.pickupAddress) || 'Collection Address' : 'Rydeit Garage (Self Drop)'}
                      </p>
                    </div>
                  </div>

                  {/* Right: Transparent Fare Breakdown */}
                  <div className="field-enter bg-[#121214] p-4 sm:p-5 rounded-2xl border border-white/[0.12] shadow-[0_8px_24px_-4px_rgba(0,0,0,0.7),0_2px_6px_rgba(0,0,0,0.4)] hover:border-white/[0.22] hover:shadow-[0_12px_32px_-4px_rgba(0,0,0,0.85)] hover:-translate-y-0.5 transition-all duration-300 space-y-4 flex flex-col justify-between" style={{ animationDelay: '50ms' }}>
                    <div>
                      <div className="flex items-center justify-between mb-3 pb-2.5 border-b border-white/[0.08]">
                        <div className="flex items-center gap-2">
                          <span className="w-1.5 h-4 bg-brand-orange rounded-full shrink-0"></span>
                          <h4 className="text-sm sm:text-base font-semibold text-white tracking-tight">Fare Summary</h4>
                        </div>
                        <span className="text-[11px] text-neutral-400 font-medium">Transparent & Fixed</span>
                      </div>

                      <div className="space-y-2">
                        <div className="flex justify-between items-center text-xs text-neutral-300">
                          <span>Standard Fare ({daysCount} {daysCount === 1 ? 'day' : 'days'})</span>
                          <span className="text-white font-mono">₹{charges?.referencePrice}</span>
                        </div>
                        
                        {charges?.hasDiscount && (
                          <div className="flex justify-between items-center text-xs text-emerald-400">
                            <label className="flex items-center gap-1.5 cursor-pointer">
                              <input 
                                type="checkbox" 
                                checked={applyDiscount} 
                                onChange={(e) => setApplyDiscount(e.target.checked)} 
                                className="w-3.5 h-3.5 rounded bg-black border-white/20 text-emerald-400"
                              />
                              <span>Discount Code (RYDENOW)</span>
                            </label>
                            <span className="font-mono">{applyDiscount ? `-₹${charges.discountAmount}` : '₹0'}</span>
                          </div>
                        )}
                        
                        {charges?.earlyLatePickupFee ? (
                          <div className="flex justify-between items-center text-[11px] text-neutral-300">
                            <span>{charges.isEarlyPickup ? 'Early Pickup' : 'Late Pickup'} Fee</span>
                            <span className="font-mono text-brand-orange">+₹{charges.earlyLatePickupFee}</span>
                          </div>
                        ) : null}
                        {charges?.earlyLateDropFee ? (
                          <div className="flex justify-between items-center text-[11px] text-neutral-300">
                            <span>{charges.isEarlyDrop ? 'Early Drop' : 'Late Drop'} Fee</span>
                            <span className="font-mono text-brand-orange">+₹{charges.earlyLateDropFee}</span>
                          </div>
                        ) : null}

                        {charges?.deliveryFee ? (
                          <div className="flex justify-between items-center text-[11px] text-neutral-300">
                            <span>Delivery Fee</span>
                            <span className="font-mono text-brand-orange">+₹{charges.deliveryFee}</span>
                          </div>
                        ) : null}

                        {charges?.homePickupFee ? (
                          <div className="flex justify-between items-center text-[11px] text-neutral-300">
                            <span>Home Pickup Fee</span>
                            <span className="font-mono text-brand-orange">+₹{charges.homePickupFee}</span>
                          </div>
                        ) : null}

                        <div className="pt-3 border-t border-white/[0.08] space-y-2">
                          <div className="flex justify-between items-baseline">
                            <span className="text-xs text-neutral-300 font-medium">Total Rent</span>
                            <span key={charges?.finalPayable} className="text-xl sm:text-2xl text-white font-mono font-bold animate-price-crossfade">
                              ₹{(charges?.finalPayable || 0).toLocaleString('en-IN')}
                            </span>
                          </div>
                          <div className="flex justify-between items-center text-xs bg-neutral-950/70 p-2.5 rounded-xl border border-white/[0.07]">
                            <span className="text-neutral-300">Advance to Pay (40%)</span>
                            <span className="text-brand-orange font-mono text-sm font-semibold">₹{charges?.advance}</span>
                          </div>
                          <p className="text-[10px] text-neutral-400 text-right">
                            Refundable Security Deposit: ₹{charges?.security} (payable at pickup)
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Terms acceptance */}
                    <div className="pt-2">
                      <div className="flex items-start gap-2.5 p-2.5 rounded-xl bg-white/[0.03] border border-white/[0.08]">
                        <input 
                          type="checkbox" 
                          checked={acceptedTerms} 
                          onChange={(e) => setAcceptedTerms(e.target.checked)} 
                          className="mt-0.5 w-4 h-4 rounded bg-neutral-900 border-white/20 text-brand-orange focus:ring-brand-orange cursor-pointer shrink-0" 
                          id="tc-check-summary" 
                        />
                        <label htmlFor="tc-check-summary" className="text-[11px] text-neutral-300 leading-relaxed cursor-pointer select-none">
                          I accept all <button type="button" onClick={() => onShowPolicy(TERMS_AND_CONDITIONS)} className="text-brand-orange hover:underline font-medium">rental terms</button> and city regulations.
                        </label>
                      </div>
                    </div>
                  </div>
                </div>

              </form>
            )}

            {/* FIXED BOTTOM NAVIGATION BAR - SPACIOUS, CLASSY & SUBTLE */}
            <div className="fixed bottom-0 left-0 right-0 z-30 bg-neutral-950/90 backdrop-blur-xl border-t border-white/[0.08] px-6 sm:px-8 py-3 shadow-[0_-10px_30px_rgba(0,0,0,0.8)]">
              <div className="max-w-md sm:max-w-lg mx-auto w-full">
                <div className="flex items-center justify-between gap-3">
                  {/* Left / Back Button */}
                  <button
                    type="button"
                    onClick={() => {
                      if (detailsSubStep === 'identity') {
                        setStep('selection');
                      } else if (detailsSubStep === 'dates') {
                        setDetailsSubStep('identity');
                      } else if (detailsSubStep === 'logistics') {
                        setDetailsSubStep('dates');
                      } else if (detailsSubStep === 'summary') {
                        setDetailsSubStep('logistics');
                      }
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    className="px-3.5 sm:px-4 py-2.5 rounded-xl border border-white/10 hover:border-white/20 bg-white/[0.03] hover:bg-white/[0.07] text-neutral-300 hover:text-white text-xs font-medium tracking-wide flex items-center gap-1.5 transition-all duration-200 active:scale-[0.98] cursor-pointer shrink-0"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>{detailsSubStep === 'identity' ? 'Change Bike' : 'Back'}</span>
                  </button>

                  {/* Right / Next Button */}
                  {detailsSubStep === 'summary' ? (
                    <button
                      type="button"
                      onClick={handleSubmitRequest}
                      disabled={isSubmitting || !!conflictingBooking}
                      className={`px-5 sm:px-7 py-2.5 rounded-xl font-medium tracking-wide transition-all duration-200 text-xs flex items-center justify-center gap-2 active:scale-[0.98] cursor-pointer shrink-0 ${
                        conflictingBooking
                          ? 'bg-red-500/10 text-red-400 border border-red-500/30 cursor-not-allowed'
                          : 'bg-brand-orange hover:bg-orange-500 text-neutral-950 font-semibold shadow-sm'
                      }`}
                    >
                      {conflictingBooking ? (
                        <span>Machine Unavailable</span>
                      ) : submitStatus === 'loading' ? (
                        <div className="flex items-center gap-2">
                          <span className="w-3.5 h-3.5 border-2 border-black/30 border-t-black rounded-full animate-spin"></span>
                          <span>Processing...</span>
                        </div>
                      ) : submitStatus === 'success' ? (
                        <div className="flex items-center gap-1.5">
                          <ValidCheck />
                          <span>Confirmed</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5">
                          <span>Confirm & Pay</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </div>
                      )}
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        if (detailsSubStep === 'identity') handleNextFromIdentity();
                        else if (detailsSubStep === 'dates') handleNextFromDates();
                        else if (detailsSubStep === 'logistics') handleNextFromLogistics();
                      }}
                      className="px-5 sm:px-7 py-2.5 rounded-xl bg-brand-orange hover:bg-orange-500 text-neutral-950 font-semibold text-xs tracking-wide flex items-center justify-center gap-1.5 cursor-pointer shadow-sm active:scale-[0.98] transition-all duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] shrink-0"
                    >
                      <span>Continue</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* STEP 3: PAYMENT SCREEN */}
        {step === 'payment' && (
            <div className="p-3 xs:p-4 sm:p-8 md:p-10 animate-fade-in max-w-xl mx-auto space-y-3 sm:space-y-4 md:space-y-5 text-center">
              
              {/* Ultra Clear Minimal Message at the Very Top */}
              <div className="space-y-0.5 sm:space-y-1">
                <h3 className="text-lg sm:text-2xl font-heading text-white uppercase tracking-tight">
                  Pay Advance and upload screenshot
                </h3>
                <div className="flex items-center justify-center gap-2 text-[11px] sm:text-xs text-neutral-400 font-mono">
                  <span>Advance: <strong className="text-orange-400 font-bold text-xs sm:text-sm">₹{charges?.advance || 500}</strong></span>
                  <span>·</span>
                  <span>ID: <strong className="text-white">{bookingId}</strong></span>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(bookingId, 'id')}
                    className="text-neutral-400 hover:text-white transition-colors cursor-pointer ml-0.5"
                    title="Copy Booking ID"
                  >
                    {copiedId ? <Check className="w-3.5 h-3.5 text-sky-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              {/* QR Code Card - Prominently Visible at Top */}
              <div className="bg-[#0a0a0a] border border-neutral-800 rounded-2xl sm:rounded-3xl p-2.5 sm:p-5 shadow-xl flex flex-col items-center justify-center gap-2 sm:gap-3">
                <div className="bg-white p-2 sm:p-3 rounded-xl sm:rounded-2xl shadow-xl border border-orange-500/30 inline-block">
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=upi://pay?pa=${encodeURIComponent(UPI_ID)}%26pn=RydeIt%26am=${charges?.advance || 500}%26cu=INR`}
                    alt="RydeIt UPI Advance Payment QR Code"
                    className="w-32 h-32 sm:w-48 sm:h-48 block rounded-lg"
                  />
                  <p className="text-[9px] sm:text-[10px] font-black tracking-widest text-black uppercase mt-1 text-center">
                    Scan & Pay ₹{charges?.advance || 500}
                  </p>
                </div>

                {/* UPI ID Pill with 1-Click Copy */}
                <div className="w-full max-w-xs bg-black border border-neutral-800 rounded-xl px-2.5 py-1 sm:py-1.5 flex items-center justify-between text-[11px] sm:text-xs font-mono">
                  <span className="text-neutral-400 truncate text-[11px]">{UPI_ID}</span>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(UPI_ID, 'upi')}
                    className="text-orange-400 hover:text-orange-300 font-bold text-[10px] uppercase ml-2 flex items-center gap-1 cursor-pointer shrink-0"
                  >
                    {copiedUpi ? <Check className="w-3 h-3 text-sky-400" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedUpi ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
              </div>

              {/* Action Buttons: Pay via UPI App (Top) & Sign In and Upload Screenshot (Under) */}
              <div className="space-y-2 sm:space-y-2.5">
                {/* 1. Launch UPI App Button with Auto-filled Amount and UPI ID */}
                <a
                  href={`upi://pay?pa=${encodeURIComponent(UPI_ID)}&pn=${encodeURIComponent('RydeIt Rentals')}&am=${charges?.advance || 500}&cu=INR&tn=${encodeURIComponent(`RydeIt Advance ${bookingId}`)}`}
                  onClick={() => {
                    const upiUri = `upi://pay?pa=${encodeURIComponent(UPI_ID)}&pn=${encodeURIComponent('RydeIt Rentals')}&am=${charges?.advance || 500}&cu=INR&tn=${encodeURIComponent(`RydeIt Advance ${bookingId}`)}`;
                    window.location.href = upiUri;
                  }}
                  className="w-full py-2.5 sm:py-3.5 px-4 rounded-xl sm:rounded-2xl bg-orange-500 hover:bg-orange-400 text-black font-black uppercase text-xs sm:text-sm tracking-wider shadow-md shadow-orange-500/20 active:scale-98 transition-all flex items-center justify-center gap-2 cursor-pointer block text-center"
                >
                  <Smartphone className="w-4 h-4 stroke-[2.5]" />
                  <span>Pay ₹{charges?.advance || 500} via UPI App</span>
                </a>

                {/* 2. "Sign In and Upload Screenshot" Button Just Under Pay via UPI App Button */}
                <button
                  type="button"
                  onClick={handleSignInOrUploadClick}
                  className="w-full py-2.5 sm:py-3 px-4 rounded-xl sm:rounded-2xl bg-neutral-900 hover:bg-neutral-800 border-2 border-orange-500/60 hover:border-orange-500 text-white font-bold uppercase text-xs sm:text-sm tracking-wider shadow-sm active:scale-98 transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Upload className="w-4 h-4 text-orange-400" />
                  <span>{user ? (paymentScreenshotUploaded ? 'Re-upload Screenshot' : 'Upload Screenshot') : 'Sign In and Upload Screenshot'}</span>
                  <ChevronDown className={`w-4 h-4 transition-transform duration-200 text-neutral-400 ${showAuthOrUpload ? 'rotate-180' : ''}`} />
                </button>

                {/* Hidden File Input for Direct Upload */}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  disabled={uploadingPayment}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handlePaymentScreenshotUpload(file);
                  }}
                  className="hidden"
                />
              </div>

              {/* Options to Start a New Booking or Edit Details (visible without scrolling down) */}
              <div className="grid grid-cols-2 gap-2 sm:gap-2.5 pt-0.5">
                <button
                  type="button"
                  onClick={handlePreviousStep}
                  className="py-2 sm:py-2.5 px-3 rounded-xl bg-neutral-950 hover:bg-neutral-900 border border-neutral-800 hover:border-neutral-700 text-neutral-300 hover:text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-sm active:scale-98"
                  title="Modify dates, times, or machine choices"
                >
                  <Edit3 className="w-3.5 h-3.5 text-orange-400" />
                  <span>Edit Details</span>
                </button>

                <button
                  type="button"
                  onClick={handleBookNewRide}
                  className="py-2 sm:py-2.5 px-3 rounded-xl bg-neutral-950 hover:bg-neutral-900 border border-neutral-800 hover:border-neutral-700 text-neutral-300 hover:text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-sm active:scale-98"
                  title="Start a new booking selection"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-sky-400" />
                  <span>New Booking</span>
                </button>
              </div>

              {/* Upload Status or Sign-In Form Container - Appears on clicking "Sign In and Upload Screenshot" */}
              {(showAuthOrUpload || paymentScreenshotUploaded) && (
                <div ref={authSectionRef} className="pt-2 text-left animate-fade-in">
                  {!user ? (
                    <div className="bg-black/90 p-5 rounded-2xl border border-neutral-800 space-y-4 shadow-2xl relative">
                      <div className="flex items-start justify-between">
                        <div className="space-y-1">
                          <p className="text-xs font-bold text-white uppercase tracking-wider">
                            Sign In to Upload Screenshot
                          </p>
                          <p className="text-[11px] text-neutral-400">
                            Links booking to your account so our team can verify your payment.
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => setShowAuthOrUpload(false)}
                          className="text-neutral-400 hover:text-white p-1 rounded-lg hover:bg-neutral-800 transition-colors cursor-pointer"
                          title="Close"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                      <Auth onSuccess={() => {
                        showToast("Signed in! Now upload your payment screenshot.", "success");
                        setShowAuthOrUpload(true);
                        fileInputRef.current?.click();
                      }} />
                    </div>
                  ) : (
                    <div className="bg-black/90 p-4 rounded-2xl border border-neutral-800 space-y-3 shadow-2xl relative">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-sky-400 font-medium truncate flex items-center gap-1.5">
                          <Check className="w-3.5 h-3.5 shrink-0" /> Signed In: {user.email}
                        </span>
                        <div className="flex items-center gap-3 shrink-0 ml-2">
                          <button
                            type="button"
                            onClick={() => navigate('/my-bookings')}
                            className="text-orange-400 hover:underline font-semibold cursor-pointer"
                          >
                            Dashboard
                          </button>
                          <button
                            type="button"
                            onClick={() => setShowAuthOrUpload(false)}
                            className="text-neutral-400 hover:text-white p-1 rounded-lg hover:bg-neutral-800 transition-colors cursor-pointer"
                            title="Close"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      {paymentScreenshotUploaded ? (
                        <div className="p-4 rounded-xl bg-sky-500/10 border border-sky-500/30 text-center space-y-2">
                          <p className="text-xs font-bold text-sky-400">
                            Payment screenshot submitted! Status: Verifying Payment.
                          </p>
                          <p className="text-[11px] text-neutral-300">
                            Your money is safe and slot is being reserved.
                          </p>
                          <button
                            type="button"
                            onClick={() => navigate('/my-bookings')}
                            className="px-5 py-2 rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-bold text-xs uppercase tracking-wider cursor-pointer"
                          >
                            View in My Bookings →
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between pt-1">
                          <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            disabled={uploadingPayment}
                            className="px-4 py-2 rounded-xl bg-neutral-900 hover:bg-neutral-800 border border-neutral-700 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer"
                          >
                            <Upload className="w-3.5 h-3.5 text-orange-400" />
                            <span>{uploadingPayment ? 'Uploading...' : 'Choose Screenshot Image'}</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => navigate('/my-bookings')}
                            className="text-xs text-neutral-400 hover:text-white underline cursor-pointer"
                          >
                            Upload Later
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Compact Machine Details */}
              {bike && (
                <div className="bg-neutral-950 p-3 rounded-xl border border-neutral-900 text-xs flex items-center justify-between text-neutral-400">
                  <span className="font-semibold text-white truncate max-w-[200px]">{bike.name}</span>
                  <span>{formData.fromDate} · Total: <strong className="text-white">₹{charges?.finalPayable}</strong></span>
                </div>
              )}

              {/* Bottom WhatsApp Help Link */}
              <div className="flex items-center justify-center pt-1">
                <button
                  type="button"
                  onClick={sendWhatsAppConfirmation}
                  className="text-neutral-400 hover:text-[#25D366] transition-colors flex items-center gap-1.5 text-xs font-medium cursor-pointer"
                >
                  <svg className="w-3.5 h-3.5 fill-[#25D366]" viewBox="0 0 448 512">
                    <path d="M380.9 97.1C339 55.1 283.2 32 223.9 32c-122.4 0-222 99.6-222 222 0 39.1 10.2 77.3 29.6 111L0 480l117.7-30.9c32.4 17.7 68.9 27 106.1 27h.1c122.3 0 221.9-99.6 221.9-222 0-59.3-25.2-115-67.1-157zm-157 .9c48.4 0 93.2 18.7 127.3 52.8 34.1 34.1 52.8 78.9 52.8 127.3s-18.7 93.2-52.8 127.3c-34.1 34.1-78.9 52.8-127.3 52.8h-.1c-34.9 0-68.9-9.8-97.3-27.9l-11.5-6.8-71.3 18.6 19-69.8-7.5-11.8C34 317.6 24 286.5 24 252.3c0-110.3 89.7-200 200-200zM176.3 184.2c-5.8-12.8-11.7-13.1-16.1-13.3-3.9-.2-8.4-.1-13 .1-4.5.2-11.7 1.6-17.7 8.3-6.6 7.2-25.2 24.6-25.2 59.9 0 35.3 25.8 69.5 29.3 74.2 3.5 4.7 50.1 80.2 121.7 107.5 59.3 22.8 71.5 18.3 84.4 17.1 12.9-1.2 41.1-16.8 46.9-33 5.8-16.2 5.8-29.9 4-33-1.7-3-6.2-4.7-13-8.3-6.8-3.5-41.1-20.2-47.5-22.6-6.4-2.3-11.1-3.5-15.8 3.5-4.7 7.1-18 22.6-22.1 26.8-4.1 4.2-8.1 4.7-14.9 1.2-6.8-3.5-28.9-10.7-55-34.1-20.3-18.2-34.1-40.6-38.1-47.5s-.4-10.7 3.1-14.2c3.2-3.2 7.1-8.3 10.7-12.4s4.7-7.1 7.1-11.7c2.3-4.7 1.2-8.9-.6-12.4-1.7-3.5-15.8-38.1-21.6-52.2z"/>
                  </svg>
                  <span>Need Help? Chat on WhatsApp</span>
                </button>
              </div>

            </div>
          )}
        </div>
      </section>
  );
};
