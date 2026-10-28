import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import QRCode from 'qrcode';
import {
  Building2,
  QrCode,
  Copy,
  LogOut,
  Search,
  Phone,
  MessageSquare,
  Printer,
  X,
  RefreshCw,
  Wallet,
  CheckCircle,
  Clock,
  Check
} from 'lucide-react';
import {
  getHotelSession,
  clearHotelSession,
  fetchHotelBookings,
  HotelPartner,
  HotelAttributedBooking,
  normalizeHotelUsername
} from '../../hotelStorage';
import { useToast } from '../../App';
import { SEOHead } from '../SEOHead';

/**
 * Checks whether a booking has confirmed payment.
 * Commission is only credited to the hotel's wallet once status is confirmed/paid.
 */
function isPaymentConfirmed(booking: HotelAttributedBooking): boolean {
  const status = (booking.status || '').toLowerCase().trim();
  const paymentStatus = ((booking as any).payment_status || '').toLowerCase().trim();

  if (
    status === 'payment_confirmed' ||
    status === 'confirmed' ||
    status === 'booking_confirmed' ||
    status === 'ongoing' ||
    status === 'completed' ||
    status === 'active' ||
    status === 'approved'
  ) {
    return true;
  }

  if (
    paymentStatus === 'completed' ||
    paymentStatus === 'confirmed' ||
    paymentStatus === 'paid' ||
    paymentStatus === 'success'
  ) {
    return true;
  }

  return false;
}

/**
 * Formats ISO created_at string into clean Date & Time string.
 */
function formatBookingDateTime(isoDateString?: string): { date: string; time: string } {
  if (!isoDateString) return { date: '—', time: '—' };
  try {
    const d = new Date(isoDateString);
    if (isNaN(d.getTime())) return { date: isoDateString, time: '—' };

    const date = d.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });

    const time = d.toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });

    return { date, time };
  } catch {
    return { date: isoDateString, time: '—' };
  }
}

export const HotelDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [hotel, setHotel] = useState<HotelPartner | null>(null);
  const [bookings, setBookings] = useState<HotelAttributedBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'confirmed' | 'pending'>('all');
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [showStandeeModal, setShowStandeeModal] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  // 1. Session verification
  useEffect(() => {
    const session = getHotelSession();
    if (!session) {
      navigate('/login', { replace: true });
      return;
    }
    setHotel(session);
  }, [navigate]);

  // 2. Generate minimalist QR Code
  useEffect(() => {
    if (!hotel) return;

    const bookingUrl = `https://rydeit.in/book?coupon=${encodeURIComponent(hotel.coupon_code)}`;

    QRCode.toDataURL(bookingUrl, {
      width: 440,
      margin: 1,
      color: {
        dark: '#000000',
        light: '#ffffff'
      }
    })
      .then((url) => setQrDataUrl(url))
      .catch((err) => console.error('Failed to generate hotel QR code:', err));
  }, [hotel]);

  // 3. Fetch attributed bookings
  const loadBookings = async (isManualRefresh = false) => {
    if (!hotel) return;
    if (isManualRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const data = await fetchHotelBookings(hotel);
      setBookings(data);
    } catch (err) {
      console.error('Failed to load hotel bookings:', err);
      showToast('Could not refresh bookings. Showing latest cached records.', 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (hotel) {
      loadBookings();
    }
  }, [hotel]);

  const handleLogout = () => {
    clearHotelSession();
    showToast('Signed out of Hotel Partner Portal.', 'info');
    navigate('/login', { replace: true });
  };

  const bookingUrl = useMemo(() => {
    if (!hotel) return '';
    return `https://rydeit.in/book?coupon=${encodeURIComponent(hotel.coupon_code)}`;
  }, [hotel]);

  const handleCopyLink = () => {
    if (!bookingUrl) return;
    navigator.clipboard.writeText(bookingUrl);
    setCopiedLink(true);
    showToast('Booking link copied to clipboard', 'success');
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleCopyCode = () => {
    if (!hotel) return;
    navigator.clipboard.writeText(hotel.coupon_code);
    setCopiedCode(true);
    showToast(`Code ${hotel.coupon_code} copied`, 'success');
    setTimeout(() => setCopiedCode(false), 2000);
  };

  // KPI Calculations & Wallet Balance
  // IMPORTANT: Only bookings with confirmed payment credit money into the hotel's wallet.
  // If any booking is cancelled, it is excluded from total booking count and earnings.
  const stats = useMemo(() => {
    const isCancelled = (b: any) => String(b.status || '').toLowerCase() === 'cancelled';
    const activeBookings = bookings.filter((b) => !isCancelled(b));
    const confirmedList = activeBookings.filter(isPaymentConfirmed);
    const pendingList = activeBookings.filter((b) => !isPaymentConfirmed(b));

    const totalBookingsCount = activeBookings.length;

    // Hotel wallet shows money only for confirmed payments (₹150 each)
    const walletBalance = confirmedList.length * 150;
    const pendingBalance = pendingList.length * 150;
    const totalEarnings = (confirmedList.length + pendingList.length) * 150;

    return {
      totalBookingsCount,
      confirmedCount: confirmedList.length,
      pendingCount: pendingList.length,
      walletBalance,
      pendingBalance,
      totalEarnings
    };
  }, [bookings]);

  // Filtered bookings
  const filteredBookings = useMemo(() => {
    return bookings.filter((b) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        b.customer_name.toLowerCase().includes(q) ||
        b.customer_phone.includes(q) ||
        (b.customer_email && b.customer_email.toLowerCase().includes(q)) ||
        b.readable_id.toLowerCase().includes(q);

      const isConfirmed = isPaymentConfirmed(b);
      const matchesStatus =
        statusFilter === 'all'
          ? true
          : statusFilter === 'confirmed'
          ? isConfirmed
          : !isConfirmed && b.status !== 'cancelled';

      return matchesSearch && matchesStatus;
    });
  }, [bookings, searchQuery, statusFilter]);

  if (!hotel) {
    return null;
  }

  return (
    <div className="min-h-screen bg-[#0a0a0c] text-neutral-300 py-10 px-4 sm:px-6 lg:px-8 font-sans antialiased selection:bg-neutral-800">
      <SEOHead
        title={`${hotel.hotel_name} | Partner Portal`}
        description="Hotel partner portal to view guest bookings, booking date & time, and confirmed wallet balance."
        canonicalPath="/hotel-dashboard"
        robots="noindex, nofollow"
      />

      <div className="max-w-6xl mx-auto space-y-8">
        {/* TOP BAR: MINIMALIST LUXURY HEADER */}
        <header className="border-b border-white/[0.08] pb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <h1 className="text-xl sm:text-2xl font-medium tracking-tight text-white">
                {hotel.hotel_name}
              </h1>
              <span className="text-[11px] font-mono text-neutral-400 bg-white/[0.04] border border-white/[0.08] px-2 py-0.5 rounded">
                @{hotel.username || normalizeHotelUsername(hotel.hotel_name)}
              </span>
            </div>
            <p className="text-xs text-neutral-400 flex items-center gap-2">
              <span>{hotel.address || 'Kolkata, West Bengal'}</span>
              <span className="text-neutral-600">/</span>
              <span>Coupon Code: <strong className="font-mono text-neutral-200">{hotel.coupon_code}</strong></span>
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyCode}
              className="text-xs font-mono text-neutral-300 hover:text-white bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
              title="Copy Coupon Code"
            >
              {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-neutral-400" />}
              <span>{hotel.coupon_code}</span>
            </button>

            <button
              onClick={() => setShowStandeeModal(true)}
              className="text-xs text-neutral-300 hover:text-white bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <QrCode className="w-3.5 h-3.5 text-neutral-400" />
              <span>QR Standee</span>
            </button>

            <button
              onClick={() => loadBookings(true)}
              disabled={refreshing}
              title="Refresh"
              className="p-2 text-neutral-400 hover:text-white bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] rounded-lg transition-colors cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-white' : ''}`} />
            </button>

            <button
              onClick={handleLogout}
              title="Sign Out"
              className="p-2 text-neutral-400 hover:text-red-400 bg-white/[0.04] hover:bg-red-500/10 border border-white/[0.08] hover:border-red-500/20 rounded-lg transition-colors cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        </header>

        {/* METRICS OVERVIEW */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {/* 1. HOTEL WALLET (Primary) */}
          <div className="bg-[#111215] border border-white/[0.08] rounded-xl p-5 space-y-2">
            <div className="text-[11px] font-medium uppercase tracking-wider text-neutral-400 flex items-center justify-between">
              <span>Hotel Wallet</span>
              <Wallet className="w-4 h-4 text-emerald-400/80" />
            </div>
            <div className="flex flex-wrap items-baseline gap-2">
              <span className="text-3xl font-light tracking-tight text-white font-mono">
                {stats.totalEarnings.toLocaleString('en-IN')} INR
              </span>
              {stats.pendingBalance > 0 && stats.walletBalance === 0 ? (
                <span className="text-[10px] font-mono font-medium px-2 py-0.5 rounded border border-amber-400/30 bg-amber-400/10 text-amber-300">
                  Pending Confirmation
                </span>
              ) : stats.walletBalance > 0 && stats.pendingBalance === 0 ? (
                <span className="text-[10px] font-mono font-medium px-2 py-0.5 rounded border border-emerald-400/30 bg-emerald-400/10 text-emerald-300">
                  Payment Confirmed
                </span>
              ) : stats.walletBalance > 0 && stats.pendingBalance > 0 ? (
                <span className="text-[10px] font-mono font-medium px-2 py-0.5 rounded border border-amber-400/30 bg-amber-400/10 text-amber-300">
                  {stats.pendingBalance} INR Pending
                </span>
              ) : null}
            </div>
            <div className="text-[11px] text-neutral-400">
              {stats.walletBalance > 0 && stats.pendingBalance > 0 ? (
                <span>
                  <strong className="text-emerald-400 font-mono">{stats.walletBalance} INR</strong> in wallet · <span className="text-amber-400/90 font-mono">{stats.pendingBalance} INR</span> awaiting clearance
                </span>
              ) : stats.pendingBalance > 0 ? (
                <span className="text-neutral-400">
                  Awaiting rider payment confirmation to clear into wallet
                </span>
              ) : stats.walletBalance > 0 ? (
                <span className="text-emerald-400/90 font-mono">
                  All funds cleared in wallet
                </span>
              ) : (
                <span className="text-neutral-500">
                  No bookings yet
                </span>
              )}
            </div>
          </div>

          {/* 2. CONFIRMED BOOKINGS */}
          <div className="bg-[#111215] border border-white/[0.08] rounded-xl p-5 space-y-1">
            <div className="text-[11px] font-medium uppercase tracking-wider text-neutral-400 flex items-center justify-between">
              <span>Payment Confirmed</span>
              <CheckCircle className="w-4 h-4 text-emerald-400/80" />
            </div>
            <div className="text-3xl font-light tracking-tight text-white font-mono">
              {stats.confirmedCount}
            </div>
            <div className="text-[11px] text-neutral-400 pt-1">
              Credited to wallet
            </div>
          </div>

          {/* 3. PENDING PAYMENT */}
          <div className="bg-[#111215] border border-white/[0.08] rounded-xl p-5 space-y-1">
            <div className="text-[11px] font-medium uppercase tracking-wider text-neutral-400 flex items-center justify-between">
              <span>Pending Payment</span>
              <Clock className="w-4 h-4 text-amber-400/80" />
            </div>
            <div className="text-3xl font-light tracking-tight text-white font-mono">
              {stats.pendingCount}
            </div>
            <div className="text-[11px] text-neutral-400 pt-1">
              Awaiting clearance
            </div>
          </div>

          {/* 4. TOTAL ATTRIBUTED */}
          <div className="bg-[#111215] border border-white/[0.08] rounded-xl p-5 space-y-1">
            <div className="text-[11px] font-medium uppercase tracking-wider text-neutral-400 flex items-center justify-between">
              <span>Total Bookings</span>
              <Building2 className="w-4 h-4 text-neutral-400" />
            </div>
            <div className="text-3xl font-light tracking-tight text-white font-mono">
              {stats.totalBookingsCount}
            </div>
            <div className="text-[11px] text-neutral-400 pt-1">
              Attributed to code
            </div>
          </div>
        </div>

        {/* SUBTLE RECEPTION QR BAR */}
        <div className="bg-[#111215] border border-white/[0.08] rounded-xl p-4 sm:p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4 text-left w-full sm:w-auto">
            {qrDataUrl ? (
              <img
                src={qrDataUrl}
                alt={`QR code for ${hotel.hotel_name}`}
                className="w-14 h-14 bg-white p-1 rounded-lg shrink-0 object-contain"
              />
            ) : (
              <div className="w-14 h-14 bg-white/5 rounded-lg animate-pulse shrink-0" />
            )}
            <div className="space-y-0.5">
              <h2 className="text-sm font-medium text-white">
                Front Desk Booking QR &amp; Link
              </h2>
              <p className="text-xs text-neutral-400">
                Direct referral link with <span className="text-neutral-200 font-mono font-medium">{hotel.coupon_code}</span> applied.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              onClick={handleCopyLink}
              className="flex-1 sm:flex-none text-xs text-neutral-300 hover:text-white bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] px-3.5 py-2 rounded-lg transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
            >
              {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-neutral-400" />}
              <span>{copiedLink ? 'Copied' : 'Copy Link'}</span>
            </button>
            <button
              onClick={() => setShowStandeeModal(true)}
              className="flex-1 sm:flex-none text-xs text-neutral-900 bg-white hover:bg-neutral-200 font-medium px-4 py-2 rounded-lg transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5 text-neutral-900" />
              <span>Print Standee</span>
            </button>
          </div>
        </div>

        {/* BOOKINGS TABLE SECTION */}
        <div className="bg-[#111215] border border-white/[0.08] rounded-xl overflow-hidden">
          {/* Table Toolbar */}
          <div className="p-4 sm:p-5 border-b border-white/[0.06] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-medium text-white">
                Guest Bookings
              </h3>
              <span className="text-xs font-mono text-neutral-400 bg-white/[0.04] px-2 py-0.5 rounded">
                {filteredBookings.length}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              {/* Search */}
              <div className="relative min-w-[200px]">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search guest or ID..."
                  className="w-full bg-[#0a0a0c] border border-white/[0.08] focus:border-white/20 rounded-lg pl-8 pr-3 py-1.5 text-white text-xs placeholder:text-neutral-500 outline-none transition-colors"
                />
                <Search className="w-3.5 h-3.5 text-neutral-500 absolute left-2.5 top-2 pointer-events-none" />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2 top-2 text-neutral-500 hover:text-white"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>

              {/* Status Tabs */}
              <div className="flex items-center bg-[#0a0a0c] border border-white/[0.08] rounded-lg p-0.5 text-xs">
                {(
                  [
                    { key: 'all', label: 'All' },
                    { key: 'confirmed', label: 'Confirmed' },
                    { key: 'pending', label: 'Pending' }
                  ] as const
                ).map((tab) => (
                  <button
                    key={tab.key}
                    onClick={() => setStatusFilter(tab.key)}
                    className={`px-3 py-1 rounded-md text-xs transition-colors cursor-pointer ${
                      statusFilter === tab.key
                        ? 'bg-white/[0.1] text-white font-medium'
                        : 'text-neutral-400 hover:text-white'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Table Rows */}
          {loading ? (
            <div className="py-16 text-center space-y-2">
              <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin mx-auto" />
              <p className="text-xs text-neutral-500">Loading bookings...</p>
            </div>
          ) : filteredBookings.length === 0 ? (
            <div className="py-16 px-4 text-center space-y-2">
              <p className="text-sm text-neutral-400">No bookings match the filter.</p>
              <p className="text-xs text-neutral-600">
                Bookings using code {hotel.coupon_code} will appear here.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-white/[0.06] text-[11px] font-medium text-neutral-400 uppercase tracking-wider bg-white/[0.01]">
                    <th className="py-3 px-4 font-normal">Guest</th>
                    <th className="py-3 px-4 font-normal">Booking ID</th>
                    <th className="py-3 px-4 font-normal">Booking Date &amp; Time</th>
                    <th className="py-3 px-4 font-normal">Rental Period</th>
                    <th className="py-3 px-4 font-normal">Hotel Commission</th>
                    <th className="py-3 px-4 font-normal">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.04]">
                  {filteredBookings.map((b) => {
                    const cleanPhone = b.customer_phone.replace(/\D/g, '');
                    const whatsappLink = `https://wa.me/91${cleanPhone.slice(-10)}?text=Hello%20${encodeURIComponent(b.customer_name)},%20greetings%20from%20${encodeURIComponent(hotel.hotel_name)}!%20Regarding%20your%20Rydeit%20rental%20(${b.readable_id})`;
                    const confirmed = isPaymentConfirmed(b);
                    const bookingTime = formatBookingDateTime(b.created_at);

                    return (
                      <tr
                        key={b.readable_id || b.id}
                        className="hover:bg-white/[0.02] transition-colors"
                      >
                        {/* Guest Profile & Direct Phone/WhatsApp */}
                        <td className="py-3.5 px-4">
                          <div className="font-medium text-white">
                            {b.customer_name}
                          </div>
                          <div className="text-[11px] text-neutral-400 flex items-center gap-2 mt-0.5">
                            <a
                              href={`tel:+91${cleanPhone.slice(-10)}`}
                              className="font-mono hover:text-white transition-colors"
                            >
                              {b.customer_phone}
                            </a>
                            <a
                              href={whatsappLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-neutral-500 hover:text-emerald-400 transition-colors"
                              title="Chat on WhatsApp"
                            >
                              <MessageSquare className="w-3 h-3" />
                            </a>
                          </div>
                        </td>

                        {/* Booking ID */}
                        <td className="py-3.5 px-4 font-mono text-neutral-300">
                          {b.readable_id}
                        </td>

                        {/* Booking Date and Time (Per user requirement: show only booking date and time, no customer revenue) */}
                        <td className="py-3.5 px-4">
                          <div className="text-neutral-200 font-mono text-[11px]">
                            {bookingTime.date}
                          </div>
                          <div className="text-neutral-500 text-[10px] font-mono mt-0.5">
                            {bookingTime.time}
                          </div>
                        </td>

                        {/* Rental Duration Period */}
                        <td className="py-3.5 px-4">
                          <div className="text-neutral-300">
                            {b.pickup_date} <span className="text-neutral-600">→</span> {b.return_date}
                          </div>
                          <div className="text-[10px] text-neutral-500 font-mono mt-0.5">
                            {b.pickup_time || '10:00'} – {b.return_time || '20:00'}
                          </div>
                        </td>

                        {/* Hotel Commission: In Wallet vs Pending vs Cancelled */}
                        <td className="py-3.5 px-4">
                          {confirmed ? (
                            <div className="inline-flex items-center gap-1.5 font-mono text-emerald-400 text-xs">
                              <span>150 INR</span>
                              <span className="text-[10px] text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.5 rounded font-sans">In Wallet</span>
                            </div>
                          ) : b.status === 'cancelled' ? (
                            <div className="inline-flex items-center gap-1.5 font-mono text-neutral-500 text-xs">
                              <span>0 INR</span>
                              <span className="text-[10px] text-neutral-500 bg-neutral-800 border border-neutral-700 px-1.5 py-0.5 rounded font-sans">Cancelled</span>
                            </div>
                          ) : (
                            <div className="inline-flex items-center gap-1.5 font-mono text-amber-300 text-xs">
                              <span>150 INR</span>
                              <span className="text-[10px] text-amber-300 bg-amber-400/10 border border-amber-400/20 px-1.5 py-0.5 rounded font-sans">Pending Confirmation</span>
                            </div>
                          )}
                        </td>

                        {/* Status */}
                        <td className="py-3.5 px-4">
                          {confirmed ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-400">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                              <span>Payment Confirmed</span>
                            </span>
                          ) : b.status === 'cancelled' ? (
                            <span className="inline-flex items-center gap-1 text-[11px] text-neutral-500">
                              <span className="w-1.5 h-1.5 rounded-full bg-neutral-600" />
                              <span>Cancelled</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-400">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                              <span>Pending Payment</span>
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* MINIMALIST PRINTABLE QR STANDEE MODAL */}
      {showStandeeModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#121316] border border-white/[0.1] rounded-2xl max-w-sm w-full p-6 space-y-6 shadow-2xl relative">
            <button
              onClick={() => setShowStandeeModal(false)}
              className="absolute right-4 top-4 text-neutral-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="text-center space-y-1 pt-2">
              <h4 className="text-base font-medium text-white">Front Desk QR Standee</h4>
              <p className="text-xs text-neutral-400">{hotel.hotel_name}</p>
            </div>

            {/* Standee Preview Card */}
            <div
              id="standee-print-card"
              className="bg-white text-black p-6 rounded-xl space-y-4 text-center shadow-lg border border-neutral-200"
            >
              <div>
                <p className="text-[10px] uppercase font-bold tracking-[0.2em] text-neutral-500">
                  Guest Two-Wheeler Rental
                </p>
                <h3 className="text-lg font-bold tracking-tight mt-0.5">
                  {hotel.hotel_name}
                </h3>
              </div>

              {qrDataUrl && (
                <div className="p-2 inline-block bg-white rounded-lg border border-neutral-200">
                  <img
                    src={qrDataUrl}
                    alt="Booking QR Code"
                    className="w-44 h-44 mx-auto object-contain"
                  />
                </div>
              )}

              <div className="space-y-1">
                <p className="text-xs font-semibold text-neutral-800">
                  Scan to Rent Bikes &amp; Scooters
                </p>
                <p className="text-[11px] text-neutral-600 font-mono">
                  Code: <strong className="text-black">{hotel.coupon_code}</strong>
                </p>
                <p className="text-[10px] text-neutral-500 pt-1">
                  Doorstep delivery to hotel reception · Helmet included
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setShowStandeeModal(false)}
                className="px-3 py-1.5 rounded-lg text-xs text-neutral-400 hover:text-white"
              >
                Close
              </button>
              <button
                onClick={() => window.print()}
                className="bg-white text-black font-medium px-4 py-1.5 rounded-lg text-xs flex items-center gap-1.5 hover:bg-neutral-200 transition-colors cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
