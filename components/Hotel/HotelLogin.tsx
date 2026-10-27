import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, Key, ShieldCheck, ArrowRight, Sparkles, AlertCircle, Search, CheckCircle2 } from 'lucide-react';
import {
  authenticateHotelPartner,
  getHotelSession,
  fetchHotelPartners,
  DEFAULT_HOTEL_PARTNERS,
  HotelPartner,
  normalizeHotelUsername
} from '../../hotelStorage';
import { useToast } from '../../App';
import { SEOHead } from '../SEOHead';

export const HotelLogin: React.FC = () => {
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [usernameInput, setUsernameInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [hotelPartners, setHotelPartners] = useState<HotelPartner[]>(DEFAULT_HOTEL_PARTNERS);
  const [searchHotelQuery, setSearchHotelQuery] = useState('');
  const [showHelperList, setShowHelperList] = useState(false);

  // Auto-redirect if already logged in as hotel partner
  useEffect(() => {
    const session = getHotelSession();
    if (session) {
      navigate('/hotel-dashboard', { replace: true });
    }
  }, [navigate]);

  // Load all live partners from Supabase table hotel_qr_routes
  useEffect(() => {
    fetchHotelPartners().then(partners => {
      if (partners && partners.length > 0) {
        setHotelPartners(partners);
      }
    });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!usernameInput.trim()) {
      setErrorMessage('Please enter your Hotel Username (hotel name in small letters, no spaces).');
      return;
    }
    if (!passwordInput.trim()) {
      setErrorMessage('Please enter your Coupon Code as Password.');
      return;
    }

    setLoading(true);
    try {
      const result = await authenticateHotelPartner(usernameInput, passwordInput);
      if (result.success && result.hotel) {
        showToast(`Welcome, ${result.hotel.hotel_name}! Portal opened successfully.`, 'success');
        navigate('/hotel-dashboard');
      } else {
        setErrorMessage(
          result.error ||
          `Authentication failed. Ensure username is your hotel name in small letters with no space (e.g. hotelakashdeep) and password is your coupon code (e.g. AKASHDEEP01).`
        );
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'An unexpected error occurred during hotel sign in.');
    } finally {
      setLoading(false);
    }
  };

  // Quick helper to fill partner credentials
  const handleSelectHotel = (partner: HotelPartner) => {
    setUsernameInput(partner.username || normalizeHotelUsername(partner.hotel_name));
    setPasswordInput(partner.coupon_code);
    setErrorMessage('');
    setShowHelperList(false);
  };

  // Filtered list for the partner selector
  const filteredHotels = useMemo(() => {
    const q = searchHotelQuery.trim().toLowerCase();
    if (!q) return hotelPartners.slice(0, 8);
    return hotelPartners.filter(h =>
      h.hotel_name.toLowerCase().includes(q) ||
      h.coupon_code.toLowerCase().includes(q) ||
      (h.username && h.username.includes(q))
    ).slice(0, 10);
  }, [hotelPartners, searchHotelQuery]);

  const previewNormalized = usernameInput.trim() ? normalizeHotelUsername(usernameInput) : '';

  return (
    <div className="min-h-[85vh] bg-gradient-to-b from-brand-black via-[#0a0a0c] to-brand-black py-12 px-4 flex items-center justify-center">
      <SEOHead
        title="Hotel Partner Portal Login | Rydeit Kolkata"
        description="Hotel partners sign in with Hotel Name (lowercase, no spaces) as username and Coupon Code as password to view guest bookings, track commissions, and download QR codes."
        canonicalPath="/hotel-login"
        robots="noindex, nofollow"
      />

      <div className="w-full max-w-lg">
        {/* Top Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 mb-3.5 shadow-[0_0_25px_rgba(245,158,11,0.15)]">
            <Building2 className="w-7 h-7" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-heading text-white uppercase tracking-tight">
            Hotel Partner <span className="text-brand-orange">Portal</span>
          </h1>
          <p className="text-xs text-neutral-400 uppercase tracking-widest mt-1 font-medium">
            Concierge &amp; Front Desk Dashboard • 52+ Active Partner Hotels
          </p>
        </div>

        {/* Login Box */}
        <div className="bg-[#111113] border border-white/10 rounded-2xl p-6 sm:p-8 shadow-2xl backdrop-blur-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 w-36 h-36 bg-brand-orange/5 rounded-full blur-2xl pointer-events-none"></div>

          {/* Credentials Info Notice */}
          <div className="mb-6 bg-amber-500/10 border border-amber-500/20 rounded-xl p-3.5 flex items-start gap-3">
            <ShieldCheck className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div className="text-[12px] leading-relaxed text-neutral-200">
              <span className="font-semibold text-white">Sign-In Credentials Rule:</span>
              <ul className="mt-1 space-y-0.5 text-neutral-300 text-[11px]">
                <li>• <strong className="text-brand-teal">Username</strong>: Hotel name in small letters with <em>no spaces</em> (e.g. <code className="bg-black/50 px-1 py-0.5 rounded text-amber-300 font-mono">hotelakashdeep</code> for Hotel Akash Deep).</li>
                <li>• <strong className="text-amber-400">Password</strong>: Your Hotel Coupon Code (e.g. <code className="bg-black/50 px-1 py-0.5 rounded text-amber-300 font-mono">AKASHDEEP01</code>).</li>
              </ul>
            </div>
          </div>

          {/* Error Message */}
          {errorMessage && (
            <div className="mb-5 bg-red-500/10 border border-red-500/30 rounded-xl p-3 flex items-start gap-2.5 text-red-400 text-xs animate-shake">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="block text-[11px] font-bold text-neutral-300 uppercase tracking-wider">
                  Hotel Username
                </label>
                {previewNormalized && (
                  <span className="text-[10px] text-brand-teal font-mono">
                    System ID: @{previewNormalized}
                  </span>
                )}
              </div>
              <div className="relative">
                <input
                  type="text"
                  value={usernameInput}
                  onChange={(e) => {
                    setUsernameInput(e.target.value);
                    if (errorMessage) setErrorMessage('');
                  }}
                  placeholder="e.g. hotelakashdeep or aliporeguesthouse"
                  required
                  autoFocus
                  className="w-full bg-[#08080a] border border-white/15 focus:border-brand-teal focus:ring-1 focus:ring-brand-teal/30 rounded-xl px-4 py-3 text-white text-sm placeholder:text-neutral-500 transition-all outline-none font-mono"
                />
                <Building2 className="w-4 h-4 text-neutral-500 absolute right-3.5 top-3.5 pointer-events-none" />
              </div>
              <p className="text-[10px] text-neutral-400 mt-1">
                Hotel name in small letters, no spaces. You may also type your full hotel name.
              </p>
            </div>

            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="block text-[11px] font-bold text-neutral-300 uppercase tracking-wider">
                  Coupon Code (Password)
                </label>
                <span className="text-[10px] text-amber-400 font-mono tracking-wider">₹150 Guest Discount</span>
              </div>
              <div className="relative">
                <input
                  type="text"
                  value={passwordInput}
                  onChange={(e) => {
                    setPasswordInput(e.target.value.toUpperCase());
                    if (errorMessage) setErrorMessage('');
                  }}
                  placeholder="e.g. AKASHDEEP01"
                  required
                  className="w-full bg-[#08080a] border border-white/15 focus:border-amber-400 focus:ring-1 focus:ring-amber-400/30 rounded-xl px-4 py-3 text-amber-300 font-mono text-sm tracking-wider uppercase placeholder:text-neutral-500 transition-all outline-none"
                />
                <Key className="w-4 h-4 text-neutral-500 absolute right-3.5 top-3.5 pointer-events-none" />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 bg-gradient-to-r from-brand-orange to-brand-yellow hover:from-brand-yellow hover:to-brand-orange text-brand-black font-heading tracking-widest text-xs py-3.5 px-4 rounded-xl shadow-lg transition-all transform active:scale-[0.99] flex items-center justify-center gap-2 cursor-pointer font-bold disabled:opacity-50"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-brand-black border-t-transparent rounded-full animate-spin"></div>
                  <span>AUTHENTICATING HOTEL...</span>
                </>
              ) : (
                <>
                  <span>SIGN IN TO HOTEL DASHBOARD</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Hotel Finder / Quick Select */}
          <div className="mt-8 pt-6 border-t border-white/10">
            <div className="flex items-center justify-between mb-2.5">
              <div className="flex items-center gap-1.5 text-[11px] text-neutral-300 font-bold uppercase tracking-wider">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>Search &amp; Quick-Fill Your Property:</span>
              </div>
              <button
                type="button"
                onClick={() => setShowHelperList(!showHelperList)}
                className="text-[11px] text-brand-teal hover:underline font-mono"
              >
                {showHelperList ? 'Hide List' : 'View All 52 Hotels'}
              </button>
            </div>

            {/* Search Input for Quick-Find */}
            <div className="relative mb-3">
              <input
                type="text"
                value={searchHotelQuery}
                onChange={(e) => setSearchHotelQuery(e.target.value)}
                placeholder="Search hotel name or code (e.g. Akash Deep, Alipore, Esteem)..."
                className="w-full bg-[#08080a] border border-white/10 focus:border-amber-400/50 rounded-lg pl-8 pr-3 py-1.5 text-xs text-white placeholder:text-neutral-500 outline-none"
              />
              <Search className="w-3.5 h-3.5 text-neutral-500 absolute left-2.5 top-2.5 pointer-events-none" />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-56 overflow-y-auto pr-1">
              {filteredHotels.map((p) => {
                const uName = p.username || normalizeHotelUsername(p.hotel_name);
                return (
                  <button
                    key={p.id || p.coupon_code}
                    type="button"
                    onClick={() => handleSelectHotel(p)}
                    className="text-left bg-white/[0.03] hover:bg-amber-500/10 border border-white/10 hover:border-amber-500/40 rounded-lg p-2.5 transition-all group cursor-pointer"
                  >
                    <p className="text-[11px] font-semibold text-white group-hover:text-amber-400 truncate">
                      {p.hotel_name}
                    </p>
                    <div className="flex items-center justify-between text-[10px] text-neutral-400 font-mono mt-0.5">
                      <span className="text-brand-teal">@{uName}</span>
                      <span className="text-amber-400/80">{p.coupon_code}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Benefits Footnote */}
        <div className="mt-6 text-center space-y-1">
          <p className="text-[11px] text-neutral-400">
            Offer ₹150 discount to your hotel guests • Receive ₹150 automatic commission per rental
          </p>
          <p className="text-[11px] text-neutral-500">
            Need front-desk acrylic standee or support? WhatsApp: <a href="https://wa.me/917980869336" className="text-brand-teal hover:underline">+91 7980869336</a>
          </p>
        </div>
      </div>
    </div>
  );
};
