import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabase';
import { useToast } from '../App';
import { resolveLoginIdentifierToEmail, findRiderBookingOrProfile, ensureCustomerProfile, linkCustomerBookings } from '../profileSync';
import {
  authenticateHotelPartner,
  fetchHotelPartners,
  normalizeHotelUsername,
  HotelPartner,
  DEFAULT_HOTEL_PARTNERS
} from '../hotelStorage';
import {
  Mail,
  User,
  Phone,
  Lock,
  ArrowRight,
  Eye,
  EyeOff,
  HelpCircle,
  KeyRound,
  Building2,
  Sparkles,
  Search,
  CheckCircle2,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

interface AuthProps {
  onSuccess?: (role?: 'user' | 'hotel') => void;
  defaultRole?: 'user' | 'hotel';
}

export const Auth: React.FC<AuthProps> = ({ onSuccess, defaultRole = 'user' }) => {
  const navigate = useNavigate();
  const { showToast } = useToast();

  // Active Role: 'user' (Rider) or 'hotel' (Hotel Partner)
  const [authRole, setAuthRole] = useState<'user' | 'hotel'>(defaultRole);
  const [isLogin, setIsLogin] = useState(true);
  const [isResetMode, setIsResetMode] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Common credentials input
  const [loginIdentifier, setLoginIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [resetEmail, setResetEmail] = useState('');

  // Rider registration inputs
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [username, setUsername] = useState('');
  const [regEmail, setRegEmail] = useState('');

  // Hotel partner helper directory
  const [hotelPartners, setHotelPartners] = useState<HotelPartner[]>(DEFAULT_HOTEL_PARTNERS);
  const [showHotelHelper, setShowHotelHelper] = useState(false);
  const [hotelSearchQuery, setHotelSearchQuery] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [isInIframe] = useState(() => {
    try {
      return window.self !== window.top;
    } catch {
      return true;
    }
  });

  // Load hotel partners from Supabase table hotel_qr_routes for instant lookup
  useEffect(() => {
    fetchHotelPartners().then(partners => {
      if (partners && partners.length > 0) {
        setHotelPartners(partners);
      }
    });
  }, []);

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError(null);
    try {
      const isLocalhost = typeof window !== 'undefined' && 
        (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
      const redirectUrl = isLocalhost ? `${window.location.origin}/` : 'https://rydeit.in/';
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUrl
        }
      });
      if (error) throw error;
    } catch (err: any) {
      setError(err.message);
      showToast(err.message, 'error');
      setLoading(false);
    }
  };

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetEmail.trim()) {
      showToast('Please enter your registered email address', 'warning');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const cleanTargetEmail = await resolveLoginIdentifierToEmail(resetEmail.trim());
      const { error: resetErr } = await supabase.auth.resetPasswordForEmail(cleanTargetEmail, {
        redirectTo: 'https://rydeit.in/'
      });

      if (resetErr) throw resetErr;

      showToast(`Password reset link sent to ${cleanTargetEmail}. Check your inbox!`, 'success');
      setIsResetMode(false);
    } catch (err: any) {
      setError(err.message || 'Failed to send password reset email.');
      showToast(err.message || 'Failed to send password reset email.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (isLogin) {
        if (!loginIdentifier.trim()) {
          showToast(
            authRole === 'hotel' 
              ? 'Please enter your Hotel Username (hotel name in small letters, no spaces)'
              : 'Please enter your Email, Username, or Mobile Phone', 
            'warning'
          );
          setLoading(false);
          return;
        }

        const trimmedIdentifier = loginIdentifier.trim();
        const trimmedPassword = password.trim();

        // 1. HOTEL PARTNER AUTHENTICATION:
        // Checked either if authRole === 'hotel' OR automatically if credentials match a hotel partner
        if (authRole === 'hotel' || !trimmedIdentifier.includes('@')) {
          const hotelRes = await authenticateHotelPartner(trimmedIdentifier, trimmedPassword);
          if (hotelRes.success && hotelRes.hotel) {
            showToast(`Welcome, ${hotelRes.hotel.hotel_name}! Portal opened successfully.`, 'success');
            if (onSuccess) {
              onSuccess('hotel');
            } else {
              navigate('/hotel-dashboard');
            }
            return;
          } else if (authRole === 'hotel') {
            // If user explicitly selected Hotel Partner tab and it failed, throw hotel-specific message
            throw new Error(
              hotelRes.error ||
              'Invalid hotel credentials. Expected username is hotel name in small letters with no space (e.g. hotelakashdeep) and password is your hotel coupon code (e.g. AKASHDEEP01).'
            );
          }
        }

        // 2. RIDER / CUSTOMER AUTHENTICATION FLOW
        // Resolve identifier to email and find rider records across bookings & profiles
        const rider = await findRiderBookingOrProfile(trimmedIdentifier);
        const resolvedEmail = (rider?.email || (await resolveLoginIdentifierToEmail(trimmedIdentifier)) || trimmedIdentifier).toLowerCase();
        
        const bookingPhone10 = rider?.phone ? rider.phone.replace(/\D/g, '').slice(-10) : '';
        const identifierDigits = trimmedIdentifier.replace(/\D/g, '').slice(-10);
        const effectivePhone10 = bookingPhone10 || (identifierDigits.length === 10 ? identifierDigits : '');

        let signInSuccess = false;
        let lastErrorMsg = '';

        // Attempt 1: Standard sign in with entered credentials
        try {
          const { data, error } = await supabase.auth.signInWithPassword({
            email: resolvedEmail,
            password: trimmedPassword
          });
          if (error) {
            lastErrorMsg = error.message;
          } else if (data?.user) {
            signInSuccess = true;
            await linkCustomerBookings(data.user.id, resolvedEmail, effectivePhone10);
          }
        } catch (attemptErr: any) {
          lastErrorMsg = attemptErr.message || '';
        }

        // Attempt 2: If failed and user has a 10-digit mobile number, try using their 10-digit mobile as default password
        if (!signInSuccess && effectivePhone10 && effectivePhone10 !== trimmedPassword) {
          try {
            const { data: retryData, error: retryError } = await supabase.auth.signInWithPassword({
              email: resolvedEmail,
              password: effectivePhone10
            });
            if (!retryError && retryData?.user) {
              signInSuccess = true;
              await linkCustomerBookings(retryData.user.id, resolvedEmail, effectivePhone10);
            }
          } catch {
            // Ignore fallback error
          }
        }

        // Attempt 3: AUTO-PROVISIONING FOR CONFIRMED/COMPLETED BOOKING RIDERS
        if (!signInSuccess && rider && (rider.hasBooking || rider.hasProfile)) {
          const passwordDigits = trimmedPassword.replace(/\D/g, '').slice(-10);
          const isPhoneMatch = effectivePhone10 && (trimmedPassword === effectivePhone10 || passwordDigits === effectivePhone10);
          
          const candidatePassword = isPhoneMatch ? effectivePhone10 : (trimmedPassword.length >= 6 ? trimmedPassword : effectivePhone10);

          if (candidatePassword && candidatePassword.length >= 6) {
            try {
              const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
                email: resolvedEmail,
                password: candidatePassword,
                options: {
                  data: {
                    full_name: rider.fullName || 'Rider',
                    phone: effectivePhone10,
                    whatsapp: effectivePhone10
                  }
                }
              });

              if (!signUpError && signUpData?.user) {
                signInSuccess = true;
                await ensureCustomerProfile({
                  email: resolvedEmail,
                  full_name: rider.fullName || 'Rider',
                  phone: effectivePhone10
                });
                await linkCustomerBookings(signUpData.user.id, resolvedEmail, effectivePhone10);
              } else if (signUpError) {
                const { data: retryData, error: retryErr } = await supabase.auth.signInWithPassword({
                  email: resolvedEmail,
                  password: candidatePassword
                });
                if (!retryErr && retryData?.user) {
                  signInSuccess = true;
                  await linkCustomerBookings(retryData.user.id, resolvedEmail, effectivePhone10);
                }
              }
            } catch (autoErr: any) {
              console.warn('Auto-provisioning notice:', autoErr);
            }
          }
        }

        if (!signInSuccess) {
          if (rider && (rider.hasBooking || rider.hasProfile)) {
            const maskedPhone = effectivePhone10 ? `ending in •••• ${effectivePhone10.slice(-4)}` : '';
            throw new Error(`Invalid password for ${resolvedEmail}. Your booking default password is your 10-digit mobile number ${maskedPhone}. Please enter your 10-digit mobile number as the password.`);
          }
          throw new Error(lastErrorMsg || 'Invalid login credentials. Please verify your Email/Username/Phone and Password.');
        }

        showToast('Signed in successfully! Welcome to Rydeit.', 'success');
        if (onSuccess) {
          onSuccess('user');
        } else {
          navigate('/my-bookings');
        }
      } else {
        // Register flow (Rider only)
        if (!regEmail.trim()) {
          showToast('Email address is mandatory for registration', 'warning');
          setLoading(false);
          return;
        }
        if (!fullName.trim()) {
          showToast('Please enter your full name', 'warning');
          setLoading(false);
          return;
        }

        const cleanPhone = phone.replace(/\D/g, '').slice(-10);
        const finalUsername = username.trim() || regEmail.split('@')[0].replace(/[^a-zA-Z0-9_]/g, '').toLowerCase();

        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({ 
          email: regEmail.trim().toLowerCase(), 
          password: password.trim(),
          options: {
            data: {
              full_name: fullName.trim(),
              phone: cleanPhone,
              whatsapp: cleanPhone,
              username: finalUsername
            }
          }
        });

        if (signUpError) throw signUpError;

        await ensureCustomerProfile({
          email: regEmail.trim().toLowerCase(),
          full_name: fullName.trim(),
          phone: cleanPhone
        });

        if (signUpData.user?.id) {
          await linkCustomerBookings(signUpData.user.id, regEmail.trim().toLowerCase(), cleanPhone);
        }
        
        showToast('Registration successful! You are now logged in.', 'success');
        if (onSuccess) {
          onSuccess('user');
        } else {
          navigate('/my-bookings');
        }
      }
    } catch (err: any) {
      setError(err.message);
      showToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  // Helper list filtering for hotels
  const filteredHotels = useMemo(() => {
    const q = hotelSearchQuery.trim().toLowerCase();
    if (!q) return hotelPartners.slice(0, 6);
    return hotelPartners.filter(h =>
      h.hotel_name.toLowerCase().includes(q) ||
      h.coupon_code.toLowerCase().includes(q) ||
      (h.username && h.username.includes(q))
    ).slice(0, 8);
  }, [hotelPartners, hotelSearchQuery]);

  const selectHotelHelper = (partner: HotelPartner) => {
    setLoginIdentifier(partner.username || normalizeHotelUsername(partner.hotel_name));
    setPassword(partner.coupon_code);
    setError(null);
    setShowHotelHelper(false);
  };

  const normalizedPreview = (authRole === 'hotel' && loginIdentifier.trim()) 
    ? normalizeHotelUsername(loginIdentifier) 
    : '';

  return (
    <div className="bg-black/90 p-6 sm:p-8 rounded-[2rem] border border-neutral-800 w-full animate-fade-in shadow-2xl font-sans max-w-md mx-auto">
      {/* ROLE SWITCHER TABS: RIDER vs HOTEL PARTNER */}
      {!isResetMode && isLogin && (
        <div className="flex justify-center mb-5">
          <div className="inline-flex p-1 bg-neutral-900 border border-neutral-800 rounded-xl">
            <button
              type="button"
              onClick={() => {
                setAuthRole('user');
                setError(null);
              }}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                authRole === 'user'
                  ? 'bg-sky-500 text-black shadow-md'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              Rider Account
            </button>
            <button
              type="button"
              onClick={() => {
                setAuthRole('hotel');
                setError(null);
              }}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                authRole === 'hotel'
                  ? 'bg-amber-400 text-black shadow-md'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              <Building2 className="w-3.5 h-3.5" />
              <span>Hotel Partner</span>
            </button>
          </div>
        </div>
      )}

      {/* HEADER SECTION */}
      <div className="text-center mb-6">
        <span className={`text-[10px] font-black uppercase tracking-[0.3em] px-3 py-1 rounded-full border ${
          authRole === 'hotel'
            ? 'text-amber-300 bg-amber-500/10 border-amber-500/30'
            : 'text-sky-400 bg-sky-500/10 border-sky-500/20'
        }`}>
          {authRole === 'hotel' ? 'Rydeit Hotel QR Portal' : 'Rydeit Rider Portal'}
        </span>
        <h4 className="text-white font-heading text-2xl uppercase mt-3 tracking-wide">
          {isResetMode 
            ? 'Reset Rider Password' 
            : authRole === 'hotel'
            ? 'Hotel Partner Sign In'
            : isLogin 
            ? 'Sign In to Your Rides' 
            : 'Create Rider Account'}
        </h4>
        <p className="text-neutral-400 text-xs mt-1">
          {isResetMode 
            ? 'Enter your booking email to receive a password reset link.' 
            : authRole === 'hotel'
            ? 'Enter your Hotel Username & Coupon Code to access guest bookings & earnings.'
            : isLogin 
            ? 'Access your confirmed bookings, digital agreements & trip receipts.' 
            : 'Join the club to book and manage machines on any device.'}
        </p>
      </div>

      <div className="space-y-4">
        {/* GOOGLE ONE CLICK (only for Riders in Login mode) */}
        {!isResetMode && isLogin && authRole === 'user' && (
          <>
            <button
              onClick={handleGoogleLogin}
              type="button"
              disabled={loading}
              className="w-full flex items-center justify-center gap-3 bg-white text-black font-bold py-3.5 rounded-xl shadow-lg hover:bg-neutral-200 transition-all disabled:opacity-50 cursor-pointer"
            >
              <img src="https://www.google.com/favicon.ico" className="w-4 h-4" alt="Google" />
              <span className="text-xs uppercase tracking-wider">Continue with Google</span>
            </button>

            {isInIframe && (
              <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-center">
                <p className="text-amber-300 text-[11px] leading-relaxed">
                  Google blocks popups in embedded preview. Use email/phone login below or open in standalone tab.
                </p>
                <a
                  href={window.location.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block mt-2 text-[10px] uppercase font-bold text-black bg-amber-400 hover:bg-amber-300 px-3 py-1 rounded-lg transition-colors"
                >
                  Open in Standalone Tab ↗
                </a>
              </div>
            )}

            <div className="flex items-center gap-4 py-1">
              <div className="h-px bg-neutral-800 flex-grow" />
              <span className="text-[10px] text-neutral-500 font-bold uppercase tracking-wider">OR SIGN IN WITH CREDENTIALS</span>
              <div className="h-px bg-neutral-800 flex-grow" />
            </div>
          </>
        )}

        {/* FORGOT PASSWORD RESET FORM */}
        {isResetMode ? (
          <form onSubmit={handlePasswordReset} className="space-y-4">
            <div className="space-y-1">
              <label className="text-[10px] uppercase font-bold text-neutral-300 tracking-wider">
                Booking Email or Mobile Number *
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-neutral-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  placeholder="e.g. fatinwasta@hotmail.com or 8007503699"
                  value={resetEmail}
                  onChange={(e) => setResetEmail(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl pl-10 pr-3.5 py-3 text-xs text-white placeholder:text-neutral-600 focus:border-sky-400 focus:ring-1 focus:ring-sky-400 outline-none transition-all"
                  required
                />
              </div>
            </div>

            {error && (
              <p className="text-rose-400 bg-rose-500/10 border border-rose-500/20 p-2.5 rounded-xl text-xs text-center leading-relaxed">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-sky-400 hover:bg-sky-300 text-black font-bold uppercase tracking-wider py-3.5 rounded-xl transition-all shadow-lg shadow-sky-500/20 disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
            >
              <KeyRound className="w-4 h-4" />
              <span>{loading ? 'Sending link...' : 'Send Password Reset Email'}</span>
            </button>

            <div className="pt-2 text-center">
              <button
                type="button"
                onClick={() => {
                  setIsResetMode(false);
                  setError(null);
                }}
                className="text-neutral-400 text-xs font-semibold hover:text-white transition-colors cursor-pointer"
              >
                ← Back to Sign In
              </button>
            </div>
          </form>
        ) : (
          <form onSubmit={handleAuth} className="space-y-3.5">
            {isLogin ? (
              <>
                {/* IDENTIFIER FIELD */}
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-neutral-300 tracking-wider flex items-center justify-between">
                    <span>
                      {authRole === 'hotel' ? 'Hotel Username *' : 'Email, Phone, or Hotel Username *'}
                    </span>
                    <span className="text-[9px] text-neutral-400 font-mono">
                      {authRole === 'hotel' ? 'small letters, no space' : 'Any works'}
                    </span>
                  </label>
                  <div className="relative">
                    {authRole === 'hotel' ? (
                      <Building2 className="w-4 h-4 text-amber-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    ) : (
                      <User className="w-4 h-4 text-neutral-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    )}
                    <input
                      type="text"
                      placeholder={
                        authRole === 'hotel'
                          ? "e.g. hotelakashdeep or Hotel Akash Deep"
                          : "e.g. rahul@gmail.com, 8007503699, or hotelakashdeep"
                      }
                      value={loginIdentifier}
                      onChange={(e) => setLoginIdentifier(e.target.value)}
                      className={`w-full bg-neutral-950 border rounded-xl pl-10 pr-3.5 py-3 text-xs text-white placeholder:text-neutral-600 outline-none transition-all font-medium ${
                        authRole === 'hotel'
                          ? 'border-amber-500/30 focus:border-amber-400 focus:ring-1 focus:ring-amber-400'
                          : 'border-neutral-800 focus:border-sky-400 focus:ring-1 focus:ring-sky-400'
                      }`}
                      required
                    />
                  </div>
                  {normalizedPreview && normalizedPreview !== loginIdentifier.trim().toLowerCase() && (
                    <p className="text-[10px] text-amber-400 font-mono pl-1">
                      Normalized username: <span className="font-bold underline">{normalizedPreview}</span>
                    </p>
                  )}
                </div>

                {/* PASSWORD FIELD */}
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-neutral-300 tracking-wider flex items-center justify-between">
                    <span>{authRole === 'hotel' ? 'Hotel Coupon Code (Password) *' : 'Password / Coupon Code *'}</span>
                    {authRole === 'user' && (
                      <button
                        type="button"
                        onClick={() => {
                          setResetEmail(loginIdentifier);
                          setIsResetMode(true);
                          setError(null);
                        }}
                        className="text-[9px] text-neutral-400 hover:text-sky-400 transition-colors cursor-pointer font-sans normal-case"
                      >
                        Forgot password?
                      </button>
                    )}
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-neutral-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      placeholder={
                        authRole === 'hotel'
                          ? "e.g. AKASHDEEP01"
                          : "Enter password (or hotel coupon code)"
                      }
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className={`w-full bg-neutral-950 border rounded-xl pl-10 pr-10 py-3 text-xs text-white placeholder:text-neutral-600 outline-none transition-all font-medium ${
                        authRole === 'hotel'
                          ? 'border-amber-500/30 focus:border-amber-400 focus:ring-1 focus:ring-amber-400 font-mono uppercase'
                          : 'border-neutral-800 focus:border-sky-400 focus:ring-1 focus:ring-sky-400'
                      }`}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-white transition-colors cursor-pointer p-1"
                      aria-label={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* HELPER CALLOUTS */}
                {authRole === 'hotel' ? (
                  <div className="space-y-2">
                    <div className="p-3 bg-amber-500/10 rounded-xl border border-amber-500/20 text-[11px] text-amber-200/90 flex items-start gap-2 leading-relaxed">
                      <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                      <span>
                        <strong className="text-white">Auto-Provisioned Account:</strong> Every hotel in <code className="text-amber-300">hotel_qr_routes</code> automatically gets an account. Username is your hotel name with no spaces (e.g. <span className="text-white font-mono font-bold">hotelakashdeep</span>), password is your coupon code (e.g. <span className="text-white font-mono font-bold">AKASHDEEP01</span>).
                      </span>
                    </div>

                    {/* Find hotel dropdown helper */}
                    <div className="text-right">
                      <button
                        type="button"
                        onClick={() => setShowHotelHelper(!showHotelHelper)}
                        className="text-[11px] text-amber-400 hover:text-amber-300 font-medium inline-flex items-center gap-1 cursor-pointer"
                      >
                        <Search className="w-3 h-3" />
                        <span>Find your hotel code</span>
                        {showHotelHelper ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                      </button>
                    </div>

                    {showHotelHelper && (
                      <div className="p-3 bg-neutral-950 border border-neutral-800 rounded-xl space-y-2 max-h-48 overflow-y-auto">
                        <input
                          type="text"
                          placeholder="Search hotel name..."
                          value={hotelSearchQuery}
                          onChange={(e) => setHotelSearchQuery(e.target.value)}
                          className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder:text-neutral-500 outline-none"
                        />
                        <div className="space-y-1">
                          {filteredHotels.map(h => (
                            <button
                              key={h.coupon_code}
                              type="button"
                              onClick={() => selectHotelHelper(h)}
                              className="w-full text-left p-1.5 rounded hover:bg-white/5 flex items-center justify-between text-xs group cursor-pointer"
                            >
                              <span className="text-white font-medium group-hover:text-amber-300 truncate">{h.hotel_name}</span>
                              <span className="font-mono text-[10px] text-amber-400 bg-amber-400/10 px-1.5 py-0.5 rounded">{h.coupon_code}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="p-3 bg-neutral-950 rounded-xl border border-neutral-800/80 text-[11px] text-neutral-400 flex items-start gap-2 leading-relaxed">
                    <HelpCircle className="w-3.5 h-3.5 text-sky-400 shrink-0 mt-0.5" />
                    <span>
                      <strong className="text-white">Confirmed Booking Rider?</strong> Sign in with booking <span className="text-white font-medium">Email</span> or <span className="text-white font-medium">10-digit Phone</span>. Default password is your <span className="text-sky-300 font-medium">10-digit phone</span>. <span className="text-amber-400/90 font-medium">Hotel partners</span> can also enter hotel username &amp; coupon code here directly!
                    </span>
                  </div>
                )}
              </>
            ) : (
              <>
                {/* REGISTER FIELDS (Rider) */}
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-neutral-300 tracking-wider">Full Name *</label>
                  <div className="relative">
                    <User className="w-4 h-4 text-neutral-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="text"
                      placeholder="e.g. Rahul Sharma"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="w-full bg-neutral-950 border border-neutral-800 rounded-xl pl-10 pr-3.5 py-2.5 text-xs text-white placeholder:text-neutral-600 focus:border-sky-400 outline-none"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase font-bold text-neutral-300 tracking-wider">Mobile Number *</label>
                    <div className="relative">
                      <Phone className="w-4 h-4 text-neutral-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <input
                        type="tel"
                        placeholder="10-digit Mobile"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        className="w-full bg-neutral-950 border border-neutral-800 rounded-xl pl-10 pr-2 py-2.5 text-xs text-white placeholder:text-neutral-600 focus:border-sky-400 outline-none font-mono"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] uppercase font-bold text-neutral-300 tracking-wider">Username</label>
                    <input
                      type="text"
                      placeholder="e.g. rahul_s"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2.5 text-xs text-white placeholder:text-neutral-600 focus:border-sky-400 outline-none font-mono"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-neutral-300 tracking-wider">Email Address (Mandatory) *</label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-neutral-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="email"
                      placeholder="e.g. rahul@gmail.com"
                      value={regEmail}
                      onChange={(e) => setRegEmail(e.target.value)}
                      className="w-full bg-neutral-950 border border-neutral-800 rounded-xl pl-10 pr-3.5 py-2.5 text-xs text-white placeholder:text-neutral-600 focus:border-sky-400 outline-none"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-neutral-300 tracking-wider">Set Password *</label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-neutral-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Create a secure password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full bg-neutral-950 border border-neutral-800 rounded-xl pl-10 pr-10 py-2.5 text-xs text-white placeholder:text-neutral-600 focus:border-sky-400 outline-none"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-white transition-colors cursor-pointer p-1"
                      aria-label={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </>
            )}

            {error && (
              <p className="text-rose-400 bg-rose-500/10 border border-rose-500/20 p-2.5 rounded-xl text-xs text-center leading-relaxed">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className={`w-full font-bold uppercase tracking-wider py-3.5 rounded-xl transition-all shadow-lg disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer mt-2 text-black ${
                authRole === 'hotel'
                  ? 'bg-amber-400 hover:bg-amber-300 shadow-amber-500/20'
                  : 'bg-sky-400 hover:bg-sky-300 shadow-sky-500/20'
              }`}
            >
              <span>
                {loading 
                  ? 'Processing...' 
                  : authRole === 'hotel'
                  ? 'Open Hotel Dashboard'
                  : isLogin 
                  ? 'Sign In to Dashboard' 
                  : 'Complete Registration'}
              </span>
              {!loading && <ArrowRight className="w-4 h-4" />}
            </button>
          </form>
        )}

        {!isResetMode && authRole === 'user' && (
          <div className="pt-2 text-center border-t border-neutral-800/80">
            <button
              onClick={() => {
                setIsLogin(!isLogin);
                setError(null);
              }}
              type="button"
              className="text-sky-400 text-xs font-semibold hover:text-white transition-colors cursor-pointer"
            >
              {isLogin ? "Need a new rider account? Register here" : "Already registered? Sign in"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
