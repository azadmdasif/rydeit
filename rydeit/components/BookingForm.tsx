
import React, { useState, useMemo, useEffect } from 'react';
import * as ReactRouterDOM from 'react-router-dom';
import { useToast } from '../App';
import type { Bike, AdditionalCharge, BookingDetails, LegalContent, BikeCategory } from '../types';
import { 
  SECURITY_DEPOSIT_AMOUNT, 
  EARLY_LATE_FEE, 
  OUTSTATION_DAILY_SURCHARGE, 
  DELIVERY_PICKUP_FEE 
} from '../constants';
import { supabase } from '../supabase';
import { Auth } from './Auth';
import { TERMS_AND_CONDITIONS } from '../legal';

const { useSearchParams, useNavigate } = ReactRouterDOM;

interface BookingFormProps {
  bikes: Bike[];
  additionalCharges: AdditionalCharge[];
  onShowPolicy: (policy: LegalContent) => void;
}

type BookingStep = 'selection' | 'details' | 'payment';

const StepIndicator: React.FC<{ currentStep: BookingStep, onStepClick: (step: BookingStep) => void }> = ({ currentStep, onStepClick }) => {
  const steps: { key: BookingStep; label: string }[] = [
    { key: 'selection', label: 'Machine' },
    { key: 'details', label: 'Details' },
    { key: 'payment', label: 'Payment' },
  ];

  return (
    <div className="flex justify-between items-center mb-10 max-w-xl mx-auto px-4">
      {steps.map((s, idx) => {
        const stepIdx = steps.findIndex(st => st.key === currentStep);
        const isCompleted = steps.findIndex(st => st.key === s.key) < stepIdx;
        const isActive = s.key === currentStep;

        return (
          <React.Fragment key={s.key}>
            <button 
              type="button"
              onClick={() => onStepClick(s.key)}
              className="flex flex-col items-center group transition-transform active:scale-95 cursor-pointer"
            >
              <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm transition-all duration-300 ${isActive ? 'bg-brand-orange text-white shadow-[0_0_20px_rgba(255,95,31,0.6)] scale-110' : isCompleted ? 'bg-brand-teal text-brand-black' : 'bg-brand-gray-dark text-white/20 border border-white/10 group-hover:border-white/40'}`}>
                {isCompleted ? '✓' : idx + 1}
              </div>
              <span className={`text-[10px] uppercase font-black mt-2 tracking-widest transition-colors ${isActive ? 'text-brand-orange' : 'text-white/20 group-hover:text-white/40'}`}>{s.label}</span>
            </button>
            {idx < steps.length - 1 && (
              <div className={`flex-grow h-[2px] mx-2 -mt-4 transition-colors duration-500 ${isCompleted ? 'bg-brand-teal' : 'bg-brand-gray-dark'}`} />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
};

const inputStyle = () => `bg-brand-black/40 border border-white/5 rounded-xl p-4 text-white w-full focus:outline-none focus:border-brand-orange transition-all placeholder:text-white/20 font-sans text-sm`;

const SectionHeader: React.FC<{ number: string, title: string; subtitle?: string }> = ({ number, title, subtitle }) => (
  <div className="mb-6">
    <h4 className="text-brand-yellow font-heading text-base tracking-widest uppercase flex items-center gap-3">
        <span className="text-brand-orange opacity-40">{number}.</span> {title}
    </h4>
    {subtitle && <p className="text-[10px] text-brand-gray-light opacity-40 uppercase font-black tracking-widest mt-1 ml-8">{subtitle}</p>}
  </div>
);

export const BookingForm: React.FC<BookingFormProps> = ({ bikes, onShowPolicy }) => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { showToast } = useToast();
  
  // Step initialization: Jump to details if bikeId is present in URL
  const [step, setStep] = useState<BookingStep>(() => {
    const urlBikeId = searchParams.get('bikeId');
    if (urlBikeId) return 'details';
    return (localStorage.getItem('rydeit_current_step') as BookingStep) || 'selection';
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [bookingId, setBookingId] = useState(() => localStorage.getItem('rydeit_pending_id') || `RD-${Math.floor(100000 + Math.random() * 900000)}`);
  const [user, setUser] = useState<any>(null);
  const [applyDiscount, setApplyDiscount] = useState(true);
  const [acceptedTerms, setAcceptedTerms] = useState(false);

  // Initialize form data, giving priority to URL params
  const [formData, setFormData] = useState<BookingDetails>(() => {
    const saved = localStorage.getItem('rydeit_draft');
    const urlBikeId = searchParams.get('bikeId');
    
    let initialData = saved ? JSON.parse(saved) : {
      bikeId: '',
      fromDate: new Date().toISOString().split('T')[0],
      fromTime: '10:00',
      toDate: new Date().toISOString().split('T')[0],
      toTime: '20:00',
      delivery: false,
      homePickup: false,
      outstation: false,
      address: '',
      earlyPickup: false,
      name: '',
      phone: '',
      email: '',
      whatsapp: '',
      pickupMethod: 'garage',
      dropMethod: 'garage'
    };

    if (urlBikeId) initialData.bikeId = urlBikeId;
    return initialData;
  });

  // Sync state if search params change while component is mounted
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

  useEffect(() => {
    if (user) {
      const syncProfile = async () => {
        const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).maybeSingle();
        const draft = JSON.parse(localStorage.getItem('rydeit_draft') || '{}');
        
        if (profile && (!profile.full_name || !profile.whatsapp || !profile.email)) {
          const updates: any = {};
          if (!profile.full_name && draft.name) updates.full_name = draft.name;
          if (!profile.whatsapp && draft.whatsapp) updates.whatsapp = draft.whatsapp;
          if (!profile.phone && (draft.phone || draft.whatsapp)) updates.phone = draft.phone || draft.whatsapp;
          if (!profile.email && draft.email) updates.email = draft.email;

          if (Object.keys(updates).length > 0) {
            const { error } = await supabase.from('profiles').update(updates).eq('id', user.id);
            if (!error) {
              showToast("Profile settings updated with your booking details", "success");
            }
          }
        }

        if (profile) {
          setFormData(prev => ({
            ...prev,
            name: prev.name || profile.full_name || '',
            email: prev.email || user.email || profile.email || '',
            whatsapp: prev.whatsapp || profile.whatsapp || ''
          }));
        }
      };
      syncProfile();
    }
  }, [user]);

  useEffect(() => {
    localStorage.setItem('rydeit_draft', JSON.stringify(formData));
    localStorage.setItem('rydeit_pending_id', bookingId);
    localStorage.setItem('rydeit_current_step', step);
  }, [formData, bookingId, step]);

  useEffect(() => {
    if (user && step === 'payment') {
      const linkBooking = async () => {
        const { error } = await supabase.from('bookings').update({ user_id: user.id }).eq('readable_id', bookingId);
        if (!error) {
          localStorage.removeItem('rydeit_draft');
          localStorage.removeItem('rydeit_pending_id');
          localStorage.removeItem('rydeit_current_step');
          navigate('/my-bookings');
        }
      };
      linkBooking();
    }
  }, [user, step, bookingId, navigate]);

  const bike = useMemo(() => bikes.find(b => b.id.toString() === formData.bikeId), [formData.bikeId, bikes]);

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
        // Fix: inner setDate() was missing the required day argument. Replaced with getDate() to increment correctly.
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

  const handleBikeSelection = (id: string) => {
    const selectedBike = bikes.find(b => b.id.toString() === id);
    if (selectedBike?.status === 'Booked') {
        showToast("Machine is currently unavailable", "warning");
        return;
    }
    setFormData(prev => ({ ...prev, bikeId: id }));
    setStep('details');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleStepClick = (newStep: BookingStep) => {
    if ((newStep === 'details' || newStep === 'payment') && !formData.bikeId) {
      showToast("Please select a machine first", "info");
      return;
    }
    setStep(newStep);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handlePreviousStep = () => {
    if (step === 'details') setStep('selection');
    if (step === 'payment') setStep('details');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleBookNewRide = () => {
    setStep('selection');
    setFormData(prev => ({ 
      ...prev, 
      bikeId: '',
      pickupMethod: 'garage',
      dropMethod: 'garage',
      outstation: false 
    }));
    // Remove query params to prevent immediate jump back to details
    navigate('/book', { replace: true });
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
    
    if ((formData.pickupMethod === 'home' || formData.dropMethod === 'home') && !formData.address.trim()) {
      showToast("Please enter your delivery/pickup address.", 'warning');
      return;
    }

    setIsSubmitting(true);
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
        address: formData.address,
        status: 'pending_payment'
      };

      const { error } = await supabase.from('bookings').upsert(payload, { onConflict: 'readable_id' });
      if (error) throw error;

      setStep('payment');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setIsSubmitting(false);
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

      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth'
      });
    }
  };

  const categories: BikeCategory[] = ['Scooter', 'Bikes', 'Royal Enfield', 'Sports'];

  return (
    <section className="py-16 bg-brand-black min-h-screen">
      <div className="container mx-auto px-4 max-w-6xl">
        <StepIndicator currentStep={step} onStepClick={handleStepClick} />

        <div className="bg-brand-gray-dark/40 rounded-[3.5rem] shadow-2xl overflow-hidden border border-white/5">
          {step === 'selection' && (
            <div className="p-8 lg:p-12 animate-fade-in">
              <div className="flex flex-wrap justify-center gap-3 mb-12 sticky top-4 z-20 py-4 bg-brand-gray-dark/80 backdrop-blur-md rounded-full px-6 border border-white/10 shadow-xl">
                {categories.map(cat => (
                  <button 
                    key={cat}
                    onClick={() => scrollToCategory(cat)}
                    className="px-6 py-2 rounded-full bg-brand-black border border-brand-teal/20 text-brand-teal text-[10px] font-black uppercase tracking-widest hover:bg-brand-teal hover:text-brand-black transition-all"
                  >
                    {cat === 'Scooter' ? 'Scooty' : cat === 'Royal Enfield' ? 'Enfield' : cat}
                  </button>
                ))}
              </div>

              {categories.map(cat => {
                const catBikes = bikes.filter(b => b.category === cat);
                if (catBikes.length === 0) return null;
                return (
                  <div key={cat} id={`booking-cat-${cat}`} className="mb-16 scroll-mt-24">
                    <h3 className="text-xl font-heading text-brand-teal mb-8 uppercase tracking-widest border-l-4 border-brand-orange pl-4">{cat}</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                      {catBikes.map(b => {
                        const isBooked = b.status === 'Booked';
                        return (
                          <div key={b.id} className={`bg-brand-black/60 p-6 rounded-[2.5rem] border transition-all group ${isBooked ? 'border-brand-orange/20 opacity-60' : 'border-white/5 hover:border-brand-teal'}`}>
                            <div className="relative">
                                <img src={b.imageUrl} className={`w-full h-32 object-cover rounded-2xl mb-4 transition-transform ${!isBooked && 'group-hover:scale-110'}`} alt="" />
                                {isBooked && (
                                    <div className="absolute top-2 right-2 bg-brand-orange text-white text-[8px] font-black px-2 py-1 rounded-full uppercase tracking-widest">Booked</div>
                                )}
                            </div>
                            <h4 className="text-white font-bold text-xs uppercase tracking-tight">{b.name}</h4>
                            <div className="flex items-center gap-2 mt-1">
                                <p className="text-brand-teal font-heading text-lg">₹{b.dailyRate}</p>
                                <span className="text-[8px] text-white/30 uppercase font-black tracking-widest">/ day</span>
                            </div>
                            <button 
                                onClick={() => handleBikeSelection(b.id.toString())} 
                                disabled={isBooked}
                                className={`w-full py-3 font-black rounded-xl uppercase tracking-widest text-[10px] mt-4 transition-all ${isBooked ? 'bg-brand-gray-dark text-white/20 cursor-not-allowed' : 'bg-brand-teal/10 text-brand-teal hover:bg-brand-teal hover:text-black'}`}
                            >
                                {isBooked ? 'Unavailable' : 'Select Machine'}
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

          {step === 'details' && (
            <div className="p-8 lg:p-16 animate-fade-in relative">
              <form onSubmit={handleSubmitRequest} className="grid grid-cols-1 lg:grid-cols-12 gap-12">
                <div className="lg:col-span-8 space-y-10">
                  <div className="bg-brand-black/20 p-8 md:p-10 rounded-[2.5rem] border border-white/5 space-y-6">
                    <SectionHeader number="1" title="Identity" subtitle="Who is riding?" />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em] ml-2">Legal Name</label>
                            <input type="text" placeholder="John Doe" value={formData.name} onChange={(e) => setFormData(p => ({...p, name: e.target.value}))} className={inputStyle()} required />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em] ml-2">WhatsApp Number</label>
                            <input type="tel" placeholder="10 Digit Mobile" value={formData.whatsapp} onChange={(e) => setFormData(p => ({...p, whatsapp: e.target.value}))} className={inputStyle()} required />
                        </div>
                    </div>
                    <div className="space-y-1">
                        <label className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em] ml-2">Email Address</label>
                        <input type="email" placeholder="ride@adventure.com" value={formData.email} onChange={(e) => setFormData(p => ({...p, email: e.target.value}))} className={inputStyle()} required />
                    </div>
                  </div>

                  <div className="bg-brand-black/20 p-8 md:p-10 rounded-[2.5rem] border border-white/5 space-y-8">
                    <SectionHeader number="2" title="Journey Context" subtitle="Where are you headed?" />
                    
                    <div className="space-y-4">
                        <label className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em] ml-2">Travel Zone Selection</label>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <button type="button" onClick={() => setFormData(p => ({...p, outstation: false}))} className={`py-5 px-6 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all ${!formData.outstation ? 'bg-brand-teal text-brand-black shadow-lg shadow-brand-teal/20' : 'bg-brand-black/40 text-white/40 border border-white/5'}`}>I will travel within Kolkata</button>
                            <button type="button" onClick={() => setFormData(p => ({...p, outstation: true}))} className={`py-5 px-6 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all ${formData.outstation ? 'bg-brand-teal text-brand-black shadow-lg shadow-brand-teal/20' : 'bg-brand-black/40 text-white/40 border border-white/5'}`}>I will travel outside city (+₹99/day)</button>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                        <div className="space-y-4">
                            <label className="text-[10px] font-black text-brand-teal uppercase tracking-[0.2em] ml-2 flex items-center justify-between">
                              Pickup Schedule
                              {charges?.isEarlyPickup && <span className="text-brand-orange animate-pulse font-bold">Early Pickup (+₹99)</span>}
                              {charges?.isLatePickup && <span className="text-brand-orange animate-pulse font-bold">Late Pickup (+₹99)</span>}
                            </label>
                            <input type="date" value={formData.fromDate} onChange={(e) => setFormData(p => ({...p, fromDate: e.target.value}))} className={inputStyle()} required />
                            <input type="time" min="06:00" max="22:00" value={formData.fromTime} onChange={(e) => setFormData(p => ({...p, fromTime: e.target.value}))} className={inputStyle()} required />
                        </div>
                        <div className="space-y-4">
                            <label className="text-[10px] font-black text-brand-teal uppercase tracking-[0.2em] ml-2 flex items-center justify-between">
                              Drop Schedule
                              {charges?.isEarlyDrop && <span className="text-brand-orange animate-pulse font-bold">Early Drop (+₹99)</span>}
                              {charges?.isLateDrop && <span className="text-brand-orange animate-pulse font-bold">Late Drop (+₹99)</span>}
                            </label>
                            <input type="date" value={formData.toDate} onChange={(e) => setFormData(p => ({...p, toDate: e.target.value}))} className={inputStyle()} required />
                            <input type="time" min="06:00" max="22:00" value={formData.toTime} onChange={(e) => setFormData(p => ({...p, toTime: e.target.value}))} className={inputStyle()} required />
                        </div>
                    </div>
                  </div>

                  <div className="bg-brand-black/20 p-8 md:p-10 rounded-[2.5rem] border border-white/5 space-y-8">
                    <SectionHeader number="3" title="Pickup & Drop Method" subtitle="Logistics Management" />
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-4">
                            <label className="text-[10px] font-black text-brand-yellow uppercase tracking-[0.2em] ml-2">How to get vehicle?</label>
                            <button type="button" onClick={() => setFormData(p => ({...p, pickupMethod: 'garage'}))} className={`w-full py-5 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all ${formData.pickupMethod === 'garage' ? 'bg-brand-teal text-brand-black shadow-lg' : 'bg-brand-black/40 text-white/40 border border-white/5'}`}>Pickup from Garage (Free)</button>
                            <button type="button" onClick={() => setFormData(p => ({...p, pickupMethod: 'home'}))} className={`w-full py-5 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all ${formData.pickupMethod === 'home' ? 'bg-brand-teal text-brand-black shadow-lg' : 'bg-brand-black/40 text-white/40 border border-white/5'}`}>Deliver to Address (+₹199)</button>
                        </div>
                        <div className="space-y-4">
                            <label className="text-[10px] font-black text-brand-yellow uppercase tracking-[0.2em] ml-2">How to return vehicle?</label>
                            <button type="button" onClick={() => setFormData(p => ({...p, dropMethod: 'garage'}))} className={`w-full py-5 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all ${formData.dropMethod === 'garage' ? 'bg-brand-teal text-brand-black shadow-lg' : 'bg-brand-black/40 text-white/40 border border-white/5'}`}>Drop at Garage (Free)</button>
                            <button type="button" onClick={() => setFormData(p => ({...p, dropMethod: 'home'}))} className={`w-full py-5 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all ${formData.dropMethod === 'home' ? 'bg-brand-teal text-brand-black shadow-lg' : 'bg-brand-black/40 text-white/40 border border-white/5'}`}>Pickup from my Address (+₹199)</button>
                        </div>
                    </div>

                    {(formData.pickupMethod === 'home' || formData.dropMethod === 'home') && (
                        <div className="space-y-2 animate-fade-in">
                            <label className="text-[10px] font-black text-brand-teal uppercase tracking-[0.2em] ml-2">Full Delivery/Pickup Address</label>
                            <textarea value={formData.address} onChange={(e) => setFormData(p => ({...p, address: e.target.value}))} placeholder="Enter your full address in Kolkata..." className={`${inputStyle()} h-32 resize-none`} required />
                        </div>
                    )}
                  </div>
                </div>

                <div className="lg:col-span-4">
                  <div className="bg-brand-black p-10 rounded-[3rem] border-2 border-brand-teal/20 shadow-2xl h-fit sticky top-24 space-y-10">
                    <div>
                        <h4 className="font-heading text-xs text-brand-teal uppercase mb-1 tracking-[0.3em]">Fare Summary</h4>
                        <div className="w-12 h-0.5 bg-brand-orange"></div>
                    </div>

                    <div className="space-y-5">
                      <div className="flex justify-between items-center text-[11px] text-white/40 uppercase font-black">
                        <span>Standard Fare</span>
                        <span className="text-white">₹{charges?.referencePrice}</span>
                      </div>
                      
                      {charges?.hasDiscount && applyDiscount && (
                        <div className="flex justify-between items-center text-[11px] text-brand-yellow uppercase font-black">
                          <span>Discount (RYDENOW)</span>
                          <span>-₹{charges.discountAmount}</span>
                        </div>
                      )}
                      
                      {charges?.earlyLatePickupFee ? (
                          <div className="flex justify-between items-center text-[9px] text-brand-orange/60 uppercase font-black">
                            <span>{charges.isEarlyPickup ? 'Early Pickup' : 'Late Pickup'} Fee</span>
                            <span>+₹{charges.earlyLatePickupFee}</span>
                          </div>
                      ) : null}
                      {charges?.earlyLateDropFee ? (
                          <div className="flex justify-between items-center text-[9px] text-brand-orange/60 uppercase font-black">
                            <span>{charges.isEarlyDrop ? 'Early Drop' : 'Late Drop'} Fee</span>
                            <span>+₹{charges.earlyLateDropFee}</span>
                          </div>
                      ) : null}

                      {charges?.deliveryFee ? (
                        <div className="flex justify-between items-center text-[9px] text-brand-teal/60 uppercase font-black">
                            <span>Delivery Fee</span>
                            <span>+₹{charges.deliveryFee}</span>
                        </div>
                      ) : null}

                      {charges?.homePickupFee ? (
                        <div className="flex justify-between items-center text-[9px] text-brand-teal/60 uppercase font-black">
                            <span>Home Pickup Fee</span>
                            <span>+₹{charges.homePickupFee}</span>
                        </div>
                      ) : null}

                      <div className="pt-5 border-t border-white/5">
                        <div className="flex justify-between items-end font-heading text-white">
                            <span className="text-xs tracking-widest">Final Rent</span>
                            <span className="text-4xl text-brand-yellow">₹{charges?.finalPayable}</span>
                        </div>
                        <div className="flex justify-between items-center text-[10px] text-white/40 uppercase font-black mt-2">
                            <span>Advance to Pay</span>
                            <span className="text-brand-teal">₹{charges?.advance}</span>
                        </div>
                      </div>
                    </div>

                    {charges?.hasDiscount && (
                        <button 
                          type="button" 
                          onClick={() => setApplyDiscount(!applyDiscount)} 
                          className={`w-full group relative p-5 rounded-2xl border-2 transition-all duration-500 overflow-hidden ${
                            applyDiscount 
                            ? 'bg-brand-yellow/10 border-brand-yellow shadow-[0_0_20px_rgba(255,199,0,0.3)]' 
                            : 'bg-brand-black/40 border-dashed border-white/10 hover:border-brand-yellow/40'
                          }`}
                        >
                          <div className="flex flex-col items-center text-center space-y-1 relative z-10">
                            <span className={`text-[8px] font-black uppercase tracking-[0.3em] ${applyDiscount ? 'text-brand-yellow' : 'text-white/40'}`}>
                              {applyDiscount ? 'PROMOCODE APPLIED' : 'PROMOCODE AVAILABLE'}
                            </span>
                            <span className={`text-[11px] font-heading tracking-widest ${applyDiscount ? 'text-brand-yellow font-bold' : 'text-white/60'}`}>
                              {applyDiscount 
                                ? `RYDENOW (-₹${charges.discountAmount})` 
                                : `Apply "RYDENOW" to save ₹${charges.discountAmount}`
                              }
                            </span>
                          </div>
                        </button>
                    )}

                    <div className="space-y-6">
                        <div className="flex items-start gap-4 group">
                            <input type="checkbox" checked={acceptedTerms} onChange={(e) => setAcceptedTerms(e.target.checked)} className="mt-1 w-4 h-4 rounded bg-brand-black border-white/10 text-brand-teal focus:ring-brand-teal cursor-pointer" id="tc-check" />
                            <label htmlFor="tc-check" className="text-[9px] text-white/40 uppercase font-bold tracking-widest leading-relaxed cursor-pointer select-none">
                                I accept all <button type="button" onClick={() => onShowPolicy(TERMS_AND_CONDITIONS)} className="text-brand-teal hover:underline font-black">rental terms</button> and city travel regulations.
                            </label>
                        </div>

                        <div className="flex gap-4">
                            <button type="button" onClick={handlePreviousStep} className="flex-1 bg-white/5 text-white/40 py-6 rounded-2xl font-heading tracking-widest border border-white/10 hover:bg-white/10 transition-all uppercase text-[10px]">Back</button>
                            <button type="submit" disabled={isSubmitting} className="flex-[2] bg-brand-orange text-white py-6 rounded-2xl font-heading tracking-widest hover:scale-[1.03] transition-all shadow-[0_0_25px_rgba(255,95,31,0.3)] disabled:opacity-50">
                                {isSubmitting ? 'PROCESSING...' : 'Submit Request'}
                            </button>
                        </div>
                    </div>
                  </div>
                </div>
              </form>
            </div>
          )}

          {step === 'payment' && (
            <div className="p-16 text-center animate-fade-in max-w-2xl mx-auto">
              {!user ? (
                <div className="space-y-10">
                  <div className="w-20 h-20 bg-brand-orange/20 rounded-full flex items-center justify-center mx-auto text-brand-orange">
                    <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 00-2 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-3xl font-heading text-white uppercase tracking-tighter">Draft Reserved</h3>
                    <p className="text-brand-gray-light font-sans text-[10px] tracking-widest uppercase opacity-60">Reserved ID: {bookingId}</p>
                  </div>
                  <div className="bg-brand-black/60 p-8 rounded-[2.5rem] border-2 border-brand-orange/30 shadow-2xl">
                    <p className="text-brand-orange font-bold text-xs uppercase mb-8 tracking-widest">Sign in to claim this order & pay</p>
                    <Auth onSuccess={() => {}} />
                  </div>
                  <div className="pt-4">
                    <button 
                      onClick={handleBookNewRide} 
                      className="w-full py-5 bg-brand-gray-dark border-2 border-white/10 text-white font-black uppercase text-[10px] tracking-widest hover:bg-white/5 hover:border-brand-teal transition-all shadow-xl rounded-2xl"
                    >
                      Book a New Ride
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-8 py-20 flex flex-col items-center">
                   <div className="w-20 h-20 border-4 border-brand-teal/20 border-t-brand-teal rounded-full animate-spin"></div>
                   <h3 className="text-3xl font-heading text-white uppercase tracking-tighter">Syncing Order...</h3>
                   <p className="text-brand-gray-light text-xs tracking-widest uppercase opacity-60">Attaching your rider profile</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </section>
  );
};
