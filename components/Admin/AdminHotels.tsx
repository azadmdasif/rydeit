import React, { useState, useEffect, useMemo, Component, ErrorInfo, ReactNode } from 'react';
import QRCode from 'qrcode';
import { supabase } from '../../supabase';
import { useToast } from '../../App';
import {
  fetchHotelPartners,
  HotelPartner,
  DEFAULT_HOTEL_PARTNERS,
  normalizeHotelUsername
} from '../../hotelStorage';
import {
  Building2,
  Users,
  Search,
  Phone,
  MessageSquare,
  Calendar,
  Clock,
  Printer,
  Copy,
  Check,
  Wallet,
  TrendingUp,
  RefreshCw,
  X,
  CheckCircle,
  AlertCircle
} from 'lucide-react';

interface ReferredCustomer {
  customer_name: string;
  customer_phone: string;
  customer_email?: string;
  bookings_count: number;
  total_spent: number;
  last_booking_date: string;
}

interface HotelStats extends HotelPartner {
  bookings: any[];
  uniqueCustomers: ReferredCustomer[];
  totalBookingsCount: number;
  confirmedBookingsCount: number;
  pendingBookingsCount: number;
  cancelledBookingsCount: number;
  totalRevenueGenerated: number;
  walletCommission: number;
  pendingCommission: number;
  totalCommission: number;
}

// Error Boundary specifically for AdminHotels to prevent any crash from blanking the screen
interface ErrorBoundaryProps {
  children: ReactNode;
}
interface ErrorBoundaryState {
  hasError: boolean;
  errorMessage: string;
}

class AdminHotelsErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, errorMessage: '' };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, errorMessage: error?.message || 'Unknown error occurred in Hotel Partners console' };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('AdminHotels error boundary caught error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-8 max-w-2xl mx-auto my-12 bg-white border border-rose-200 rounded-2xl shadow-sm text-center space-y-4">
          <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
            <AlertCircle className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900">Hotel Partners Console Notice</h3>
            <p className="text-xs text-slate-500 mt-1">{this.state.errorMessage}</p>
          </div>
          <button
            onClick={() => this.setState({ hasError: false, errorMessage: '' })}
            className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white text-xs font-semibold rounded-xl transition-colors cursor-pointer"
          >
            Reload Hotel Partners
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

const AdminHotelsContent: React.FC = () => {
  const { showToast } = useToast();

  const [hotels, setHotels] = useState<HotelPartner[]>(DEFAULT_HOTEL_PARTNERS || []);
  const [allBookings, setAllBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [activityFilter, setActivityFilter] = useState<'all' | 'with_bookings' | 'zero_bookings'>('all');
  const [clusterFilter, setClusterFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'bookings' | 'revenue' | 'name' | 'commission'>('bookings');

  // Drilldown Selected Hotel Code (id-based rather than object state to avoid stale references)
  const [selectedHotelCode, setSelectedHotelCode] = useState<string | null>(null);
  const [activeDrilldownTab, setActiveDrilldownTab] = useState<'bookings' | 'customers' | 'standee'>('bookings');
  const [standeeQrUrl, setStandeeQrUrl] = useState<string>('');
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  // Load data
  const loadData = async (isManualRefresh = false) => {
    if (isManualRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      // 1. Fetch hotels from Supabase hotel_qr_routes / partners
      const partnerList = await fetchHotelPartners();
      if (Array.isArray(partnerList) && partnerList.length > 0) {
        setHotels(partnerList);
      } else {
        setHotels(DEFAULT_HOTEL_PARTNERS || []);
      }

      // 2. Fetch all bookings
      const { data: bookingsData, error: bookingsError } = await supabase
        .from('bookings')
        .select('*')
        .order('created_at', { ascending: false });

      if (bookingsError) {
        console.warn('Error fetching bookings for admin hotel analytics:', bookingsError);
      }

      setAllBookings(Array.isArray(bookingsData) ? bookingsData : []);
    } catch (err: any) {
      console.error('Failed to load admin hotel data:', err);
      showToast('Could not refresh live bookings. Showing cached partner list.', 'warning');
      setHotels(DEFAULT_HOTEL_PARTNERS || []);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Safe check whether a booking has confirmed payment
  const isPaymentConfirmed = (booking: any): boolean => {
    if (!booking) return false;
    const status = String(booking.status || '').toLowerCase().trim();
    const paymentStatus = String(booking.payment_status || '').toLowerCase().trim();

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
  };

  // Local storage attribution map fallback
  const localAttributions = useMemo(() => {
    if (typeof window === 'undefined') return {};
    try {
      const raw = localStorage.getItem('rydeit_coupon_attributions_v2');
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  }, []);

  // Combine Hotels with their Attributed Bookings & Revenues safely
  const enrichedHotels: HotelStats[] = useMemo(() => {
    const list = Array.isArray(hotels) && hotels.length > 0 ? hotels : DEFAULT_HOTEL_PARTNERS;
    const safeBookings = Array.isArray(allBookings) ? allBookings : [];

    return list.map((hotel) => {
      const cleanCode = String(hotel.coupon_code || '').trim().toUpperCase();
      const cleanHotelName = String(hotel.hotel_name || '').trim().toLowerCase();
      const localIds = (localAttributions && localAttributions[cleanCode]) || [];

      // Find all bookings attributed to this hotel
      const hotelBookings = safeBookings.filter((b) => {
        if (!b) return false;
        const bCode = String(b.coupon_code || '').trim().toUpperCase();
        const bHotelName = String(b.hotel_name || '').trim().toLowerCase();
        const bReadable = String(b.readable_id || '').trim();

        return (
          (cleanCode && bCode === cleanCode) ||
          (bReadable && localIds.includes(bReadable)) ||
          (cleanHotelName && bHotelName === cleanHotelName)
        );
      });

      const isCancelledBooking = (b: any): boolean => {
        const s = String(b?.status || '').toLowerCase().trim();
        return s === 'cancelled' || s === 'canceled';
      };

      const cancelledBookings = hotelBookings.filter(isCancelledBooking);
      const activeBookings = hotelBookings.filter((b) => !isCancelledBooking(b));

      const confirmedBookings = activeBookings.filter(isPaymentConfirmed);
      const pendingBookings = activeBookings.filter((b) => !isPaymentConfirmed(b));

      // Total rental revenue generated by this hotel for Rydeit (cancelled bookings generate 0 revenue)
      const totalRevenueGenerated = activeBookings.reduce(
        (acc, b) => acc + Number(b.total_rent || 0),
        0
      );

      // Commissions
      const walletCommission = confirmedBookings.length * 150;
      const pendingCommission = pendingBookings.length * 150;
      const totalCommission = (confirmedBookings.length + pendingBookings.length) * 150;

      // Extract referred customer profiles safely from active bookings only
      const customerMap = new Map<string, ReferredCustomer>();
      activeBookings.forEach((b) => {
        if (!b) return;
        const rawPhone = b.customer_phone ? String(b.customer_phone).trim() : '';
        const name = String(b.customer_name || 'Hotel Guest').trim();
        const email = String(b.customer_email || '').trim();
        const key = rawPhone ? rawPhone : `${name}_${email}`;

        const existing = customerMap.get(key);
        const rentAmount = Number(b.total_rent || 0);

        if (existing) {
          existing.bookings_count += 1;
          existing.total_spent += rentAmount;
          if (b.created_at) {
            try {
              if (!existing.last_booking_date || new Date(b.created_at) > new Date(existing.last_booking_date)) {
                existing.last_booking_date = b.created_at;
              }
            } catch {}
          }
        } else {
          customerMap.set(key, {
            customer_name: name,
            customer_phone: rawPhone || '—',
            customer_email: email || '',
            bookings_count: 1,
            total_spent: rentAmount,
            last_booking_date: b.created_at || ''
          });
        }
      });

      const uniqueCustomers = Array.from(customerMap.values()).sort(
        (a, b) => b.bookings_count - a.bookings_count
      );

      return {
        ...hotel,
        bookings: hotelBookings,
        uniqueCustomers,
        totalBookingsCount: activeBookings.length, // Cancelled bookings excluded from total booking count per requirement
        confirmedBookingsCount: confirmedBookings.length,
        pendingBookingsCount: pendingBookings.length,
        cancelledBookingsCount: cancelledBookings.length,
        totalRevenueGenerated,
        walletCommission,
        pendingCommission,
        totalCommission
      };
    });
  }, [hotels, allBookings, localAttributions]);

  // Overall Aggregate KPIs
  const overallKPIs = useMemo(() => {
    const totalHotels = enrichedHotels.length;
    const activeReferringHotels = enrichedHotels.filter((h) => (h.totalBookingsCount || 0) > 0).length;
    const totalReferredBookings = enrichedHotels.reduce((acc, h) => acc + (h.totalBookingsCount || 0), 0);
    const totalConfirmedBookings = enrichedHotels.reduce((acc, h) => acc + (h.confirmedBookingsCount || 0), 0);
    const totalPendingBookings = enrichedHotels.reduce((acc, h) => acc + (h.pendingBookingsCount || 0), 0);
    const totalGrossRevenue = enrichedHotels.reduce((acc, h) => acc + (h.totalRevenueGenerated || 0), 0);
    const totalWalletCommission = enrichedHotels.reduce((acc, h) => acc + (h.walletCommission || 0), 0);
    const totalPendingCommission = enrichedHotels.reduce((acc, h) => acc + (h.pendingCommission || 0), 0);

    return {
      totalHotels,
      activeReferringHotels,
      totalReferredBookings,
      totalConfirmedBookings,
      totalPendingBookings,
      totalGrossRevenue,
      totalWalletCommission,
      totalPendingCommission
    };
  }, [enrichedHotels]);

  // Unique clusters/groups for filtering
  const availableClusters = useMemo(() => {
    const set = new Set<string>();
    if (Array.isArray(hotels)) {
      hotels.forEach((h) => {
        if (h && h.group) set.add(String(h.group));
      });
    }
    return Array.from(set);
  }, [hotels]);

  // Filtered & Sorted Hotels
  const filteredHotels = useMemo(() => {
    if (!Array.isArray(enrichedHotels)) return [];

    return enrichedHotels
      .filter((h) => {
        if (!h) return false;

        // Search query
        const q = String(searchQuery || '').toLowerCase().trim();
        const hotelName = String(h.hotel_name || '').toLowerCase();
        const couponCode = String(h.coupon_code || '').toLowerCase();
        const username = String(h.username || '').toLowerCase();
        const group = String(h.group || '').toLowerCase();

        const matchesSearch =
          !q ||
          hotelName.includes(q) ||
          couponCode.includes(q) ||
          username.includes(q) ||
          group.includes(q) ||
          (Array.isArray(h.uniqueCustomers) &&
            h.uniqueCustomers.some((c) => {
              if (!c) return false;
              const name = String(c.customer_name || '').toLowerCase();
              const phone = String(c.customer_phone || '').toLowerCase();
              const email = String(c.customer_email || '').toLowerCase();
              return name.includes(q) || phone.includes(q) || email.includes(q);
            }));

        // Activity filter
        const count = h.totalBookingsCount || 0;
        const matchesActivity =
          activityFilter === 'all'
            ? true
            : activityFilter === 'with_bookings'
            ? count > 0
            : count === 0;

        // Cluster filter
        const matchesCluster =
          clusterFilter === 'all' || String(h.group || '') === clusterFilter;

        return matchesSearch && matchesActivity && matchesCluster;
      })
      .sort((a, b) => {
        if (sortBy === 'bookings') return (b.totalBookingsCount || 0) - (a.totalBookingsCount || 0);
        if (sortBy === 'revenue') return (b.totalRevenueGenerated || 0) - (a.totalRevenueGenerated || 0);
        if (sortBy === 'commission') return (b.totalCommission || 0) - (a.totalCommission || 0);
        if (sortBy === 'name') return String(a.hotel_name || '').localeCompare(String(b.hotel_name || ''));
        return 0;
      });
  }, [enrichedHotels, searchQuery, activityFilter, clusterFilter, sortBy]);

  // Currently selected hotel derived from code
  const selectedHotel: HotelStats | null = useMemo(() => {
    if (!selectedHotelCode) return null;
    return enrichedHotels.find((h) => h.coupon_code === selectedHotelCode) || null;
  }, [enrichedHotels, selectedHotelCode]);

  // Generate QR Standee code when drilldown modal opens
  useEffect(() => {
    if (!selectedHotel) {
      setStandeeQrUrl('');
      return;
    }

    const bookingUrl = `https://rydeit.in/book?coupon=${encodeURIComponent(selectedHotel.coupon_code)}`;
    QRCode.toDataURL(bookingUrl, {
      width: 400,
      margin: 1,
      color: { dark: '#000000', light: '#ffffff' }
    })
      .then((url) => setStandeeQrUrl(url))
      .catch((e) => console.error('Failed to generate standee QR:', e));
  }, [selectedHotel]);

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    showToast(`Coupon code ${code} copied!`, 'success');
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const copyReferralLink = (code: string) => {
    const url = `https://rydeit.in/book?coupon=${encodeURIComponent(code)}`;
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    showToast('Hotel booking referral link copied!', 'success');
    setTimeout(() => setCopiedLink(false), 2000);
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-7xl mx-auto pb-12 font-sans text-slate-800">
      {/* HEADER SECTION */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Hotel Partner Referrals</h1>
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-orange-50 text-orange-700 border border-orange-200">
              {overallKPIs.activeReferringHotels} of {overallKPIs.totalHotels} Active
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Track rental revenue, attributed customer profiles, and ₹150 commissions for every partner hotel.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => loadData(true)}
            disabled={refreshing}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-xs font-medium text-slate-700 shadow-xs transition-colors cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-orange-600' : 'text-slate-500'}`} />
            <span>{refreshing ? 'Refreshing...' : 'Refresh Data'}</span>
          </button>
        </div>
      </div>

      {/* TOP 4 AGGREGATE KPI CARDS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Hotel Generated Revenue */}
        <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Gross Rental Revenue</span>
            <span className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </span>
          </div>
          <p className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-mono">
            ₹{overallKPIs.totalGrossRevenue.toLocaleString('en-IN')}
          </p>
          <p className="text-xs text-slate-500 mt-1.5">
            Total rental booking value from hotel QR codes
          </p>
        </div>

        {/* Total Hotel Bookings */}
        <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Total Bookings</span>
            <span className="w-8 h-8 rounded-lg bg-orange-50 text-orange-600 flex items-center justify-center">
              <Calendar className="w-4 h-4" />
            </span>
          </div>
          <p className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-mono">
            {overallKPIs.totalReferredBookings}
          </p>
          <p className="text-xs text-slate-500 mt-1.5 flex items-center gap-1.5">
            <span className="text-emerald-600 font-medium">{overallKPIs.totalConfirmedBookings} confirmed</span>
            <span>·</span>
            <span className="text-amber-600 font-medium">{overallKPIs.totalPendingBookings} pending</span>
          </p>
        </div>

        {/* Total Commission Payable */}
        <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Hotel Wallet Commissions</span>
            <span className="w-8 h-8 rounded-lg bg-sky-50 text-sky-600 flex items-center justify-center">
              <Wallet className="w-4 h-4" />
            </span>
          </div>
          <p className="text-2xl sm:text-3xl font-extrabold text-emerald-600 font-mono">
            ₹{overallKPIs.totalWalletCommission.toLocaleString('en-IN')}
          </p>
          <p className="text-xs text-slate-500 mt-1.5">
            {overallKPIs.totalPendingCommission > 0 ? (
              <span className="text-amber-600 font-medium">
                +₹{overallKPIs.totalPendingCommission.toLocaleString('en-IN')} pending clearance
              </span>
            ) : (
              'All commissions cleared in wallets'
            )}
          </p>
        </div>

        {/* Total Registered Hotels */}
        <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Registered Hotels</span>
            <span className="w-8 h-8 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center">
              <Building2 className="w-4 h-4" />
            </span>
          </div>
          <p className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-mono">
            {overallKPIs.totalHotels}
          </p>
          <p className="text-xs text-slate-500 mt-1.5">
            Auto-provisioned QR routes in Supabase
          </p>
        </div>
      </div>

      {/* SEARCH & FILTERS BAR */}
      <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search hotel name, coupon code (e.g. AKASHDEEP01), cluster, or guest phone..."
            className="w-full bg-slate-50 border border-slate-200 focus:border-orange-500 focus:bg-white rounded-xl pl-10 pr-3.5 py-2.5 text-xs text-slate-800 placeholder:text-slate-400 outline-none transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Filters & Sorting */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Activity Filter */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl text-xs">
            <button
              onClick={() => setActivityFilter('all')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-all cursor-pointer ${
                activityFilter === 'all' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All ({enrichedHotels.length})
            </button>
            <button
              onClick={() => setActivityFilter('with_bookings')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-all cursor-pointer ${
                activityFilter === 'with_bookings' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              With Bookings ({overallKPIs.activeReferringHotels})
            </button>
          </div>

          {/* Cluster Filter */}
          {availableClusters.length > 0 && (
            <select
              value={clusterFilter}
              onChange={(e) => setClusterFilter(e.target.value)}
              className="bg-slate-50 border border-slate-200 text-xs text-slate-700 px-3 py-2 rounded-xl outline-none cursor-pointer"
            >
              <option value="all">All Clusters</option>
              {availableClusters.map((c) => (
                <option key={c} value={c}>
                  Cluster: {String(c).replace('_', ' ')}
                </option>
              ))}
            </select>
          )}

          {/* Sort By */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="bg-slate-50 border border-slate-200 text-xs text-slate-700 px-3 py-2 rounded-xl outline-none cursor-pointer"
          >
            <option value="bookings">Sort: Most Bookings</option>
            <option value="revenue">Sort: Highest Revenue</option>
            <option value="commission">Sort: Highest Commission</option>
            <option value="name">Sort: Alphabetical</option>
          </select>
        </div>
      </div>

      {/* HOTELS OVERVIEW TABLE */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
        {loading ? (
          <div className="py-20 text-center space-y-2">
            <div className="w-6 h-6 border-2 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
            <p className="text-xs text-slate-400">Loading hotel partners & revenue metrics...</p>
          </div>
        ) : filteredHotels.length === 0 ? (
          <div className="py-16 text-center space-y-2">
            <Building2 className="w-10 h-10 text-slate-300 mx-auto" />
            <p className="text-sm font-semibold text-slate-700">No hotels match your filters</p>
            <p className="text-xs text-slate-400">Try clearing your search query or activity filter.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/70 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                  <th className="py-3.5 px-4">Hotel Name</th>
                  <th className="py-3.5 px-4">Coupon Code</th>
                  <th className="py-3.5 px-4 text-center">Bookings</th>
                  <th className="py-3.5 px-4 text-center">Customers</th>
                  <th className="py-3.5 px-4 text-right">Revenue Generated</th>
                  <th className="py-3.5 px-4 text-right">Hotel Commission</th>
                  <th className="py-3.5 px-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredHotels.map((h) => {
                  const hasBookings = (h.totalBookingsCount || 0) > 0;

                  return (
                    <tr
                      key={h.coupon_code}
                      onClick={() => {
                        setSelectedHotelCode(h.coupon_code);
                        setActiveDrilldownTab('bookings');
                      }}
                      className="hover:bg-slate-50/80 transition-colors cursor-pointer group"
                    >
                      {/* Hotel Name & Username */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2.5">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                            hasBookings
                              ? 'bg-orange-50 text-orange-600 border border-orange-200'
                              : 'bg-slate-100 text-slate-400'
                          }`}>
                            <Building2 className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="font-bold text-slate-900 group-hover:text-orange-600 transition-colors flex items-center gap-1.5">
                              <span>{h.hotel_name}</span>
                              {hasBookings && (
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" title="Active referer" />
                              )}
                            </div>
                            <div className="text-[11px] text-slate-400 font-mono flex items-center gap-1.5">
                              <span>@{h.username || normalizeHotelUsername(h.hotel_name)}</span>
                              {h.group && (
                                <>
                                  <span>·</span>
                                  <span className="capitalize">{String(h.group).replace('_', ' ')}</span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Coupon Code */}
                      <td className="py-3.5 px-4" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => copyCode(h.coupon_code)}
                          className="font-mono text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 px-2 py-1 rounded-md transition-colors inline-flex items-center gap-1"
                          title="Click to copy code"
                        >
                          <span>{h.coupon_code}</span>
                          {copiedCode === h.coupon_code ? (
                            <Check className="w-3 h-3 text-emerald-600" />
                          ) : (
                            <Copy className="w-3 h-3 text-slate-400" />
                          )}
                        </button>
                      </td>

                      {/* Bookings Count */}
                      <td className="py-3.5 px-4 text-center">
                        {hasBookings ? (
                          <div className="inline-flex flex-col items-center">
                            <span className="font-extrabold text-slate-900 font-mono text-sm">
                              {h.totalBookingsCount}
                            </span>
                            <span className="text-[10px] text-slate-400">
                              {h.confirmedBookingsCount} paid · {h.pendingBookingsCount} pend
                            </span>
                          </div>
                        ) : (
                          <span className="text-slate-300 font-mono">0</span>
                        )}
                      </td>

                      {/* Referred Customers */}
                      <td className="py-3.5 px-4 text-center">
                        {Array.isArray(h.uniqueCustomers) && h.uniqueCustomers.length > 0 ? (
                          <span className="font-bold text-slate-700 font-mono px-2 py-0.5 rounded-full bg-slate-100">
                            {h.uniqueCustomers.length} guests
                          </span>
                        ) : (
                          <span className="text-slate-300 font-mono">0</span>
                        )}
                      </td>

                      {/* Gross Revenue Generated */}
                      <td className="py-3.5 px-4 text-right">
                        {(h.totalRevenueGenerated || 0) > 0 ? (
                          <div className="font-bold text-slate-900 font-mono text-sm">
                            ₹{h.totalRevenueGenerated.toLocaleString('en-IN')}
                          </div>
                        ) : (
                          <span className="text-slate-300 font-mono">₹0</span>
                        )}
                      </td>

                      {/* Hotel Commission */}
                      <td className="py-3.5 px-4 text-right">
                        {(h.totalCommission || 0) > 0 ? (
                          <div>
                            <div className="font-bold text-emerald-600 font-mono">
                              ₹{h.walletCommission.toLocaleString('en-IN')}
                            </div>
                            {h.pendingCommission > 0 && (
                              <div className="text-[10px] text-amber-600 font-mono">
                                +₹{h.pendingCommission} pend
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-300 font-mono">₹0</span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-center" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => {
                            setSelectedHotelCode(h.coupon_code);
                            setActiveDrilldownTab('bookings');
                          }}
                          className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-orange-500 hover:text-white text-slate-700 font-medium text-xs transition-all cursor-pointer shadow-2xs"
                        >
                          View Details
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* HOTEL DRILL-DOWN MODAL: DETAILED REVENUE, REFERRED CUSTOMERS & BOOKINGS */}
      {selectedHotel && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5">
          <div className="bg-white rounded-2xl border border-slate-200 max-w-4xl w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden animate-fade-in">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-200 flex items-start justify-between gap-4 bg-slate-50/50">
              <div className="flex items-center gap-3.5">
                <div className="w-11 h-11 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center shrink-0 shadow-2xs">
                  <Building2 className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-bold text-slate-900">{selectedHotel.hotel_name}</h2>
                    <span className="font-mono text-xs text-orange-700 bg-orange-50 border border-orange-200 px-2 py-0.5 rounded-md font-bold">
                      {selectedHotel.coupon_code}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-2">
                    <span>Username: <strong className="text-slate-700 font-mono">@{selectedHotel.username || normalizeHotelUsername(selectedHotel.hotel_name)}</strong></span>
                    <span>·</span>
                    <span>{selectedHotel.address || 'Kolkata, West Bengal'}</span>
                    {selectedHotel.group && (
                      <>
                        <span>·</span>
                        <span className="capitalize">{String(selectedHotel.group).replace('_', ' ')}</span>
                      </>
                    )}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => copyReferralLink(selectedHotel.coupon_code)}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-xs font-medium text-slate-700 flex items-center gap-1.5 transition-colors cursor-pointer"
                  title="Copy Guest Booking Link"
                >
                  {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-slate-500" />}
                  <span>{copiedLink ? 'Link Copied' : 'Copy Booking Link'}</span>
                </button>
                <button
                  onClick={() => setSelectedHotelCode(null)}
                  className="p-1.5 rounded-lg hover:bg-slate-200 text-slate-400 hover:text-slate-600 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Financial & Performance Highlights for this Hotel */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-5 border-b border-slate-200 bg-white">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                <span className="text-[10px] uppercase font-bold text-slate-400">Total Bookings</span>
                <p className="text-xl font-extrabold text-slate-900 font-mono mt-0.5">
                  {selectedHotel.totalBookingsCount}
                </p>
                <span className="text-[10px] text-slate-500">
                  {selectedHotel.confirmedBookingsCount} paid · {selectedHotel.pendingBookingsCount} pending
                  {selectedHotel.cancelledBookingsCount > 0 && ` (${selectedHotel.cancelledBookingsCount} cancelled excluded)`}
                </span>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                <span className="text-[10px] uppercase font-bold text-slate-400">Revenue Generated</span>
                <p className="text-xl font-extrabold text-slate-900 font-mono mt-0.5">
                  ₹{selectedHotel.totalRevenueGenerated.toLocaleString('en-IN')}
                </p>
                <span className="text-[10px] text-slate-500">Gross customer rent</span>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                <span className="text-[10px] uppercase font-bold text-slate-400">Hotel Wallet Commission</span>
                <p className="text-xl font-extrabold text-emerald-600 font-mono mt-0.5">
                  ₹{selectedHotel.walletCommission.toLocaleString('en-IN')}
                </p>
                <span className="text-[10px] text-slate-500">
                  {selectedHotel.pendingCommission > 0 ? `+₹${selectedHotel.pendingCommission} pending` : 'All cleared'}
                </span>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                <span className="text-[10px] uppercase font-bold text-slate-400">Referred Guests</span>
                <p className="text-xl font-extrabold text-slate-900 font-mono mt-0.5">
                  {selectedHotel.uniqueCustomers.length}
                </p>
                <span className="text-[10px] text-slate-500">Unique riders</span>
              </div>
            </div>

            {/* Drilldown Navigation Tabs */}
            <div className="flex items-center gap-1 px-5 border-b border-slate-200 bg-slate-50/50">
              <button
                onClick={() => setActiveDrilldownTab('bookings')}
                className={`py-3 px-4 text-xs font-bold border-b-2 transition-all cursor-pointer ${
                  activeDrilldownTab === 'bookings'
                    ? 'border-orange-500 text-orange-600'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                Referred Bookings ({selectedHotel.totalBookingsCount})
              </button>
              <button
                onClick={() => setActiveDrilldownTab('customers')}
                className={`py-3 px-4 text-xs font-bold border-b-2 transition-all cursor-pointer ${
                  activeDrilldownTab === 'customers'
                    ? 'border-orange-500 text-orange-600'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                Referred Customer Profiles ({selectedHotel.uniqueCustomers.length})
              </button>
              <button
                onClick={() => setActiveDrilldownTab('standee')}
                className={`py-3 px-4 text-xs font-bold border-b-2 transition-all cursor-pointer ${
                  activeDrilldownTab === 'standee'
                    ? 'border-orange-500 text-orange-600'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                Reception QR Standee
              </button>
            </div>

            {/* Drilldown Tab Content */}
            <div className="flex-1 overflow-y-auto p-5">
              {/* TAB 1: REFERRED BOOKINGS */}
              {activeDrilldownTab === 'bookings' && (
                <div className="space-y-3">
                  {selectedHotel.bookings.length === 0 ? (
                    <div className="py-12 text-center text-slate-400 text-xs">
                      No bookings have been made with coupon code {selectedHotel.coupon_code} yet.
                    </div>
                  ) : (
                    <div className="border border-slate-200 rounded-xl overflow-hidden">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="border-b border-slate-200 bg-slate-50 text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                            <th className="py-2.5 px-3">Booking ID</th>
                            <th className="py-2.5 px-3">Guest Customer</th>
                            <th className="py-2.5 px-3">Contact</th>
                            <th className="py-2.5 px-3">Booking Date & Time</th>
                            <th className="py-2.5 px-3">Rental Dates</th>
                            <th className="py-2.5 px-3 text-right">Rent Revenue</th>
                            <th className="py-2.5 px-3 text-center">Status</th>
                            <th className="py-2.5 px-3 text-right">Commission</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {selectedHotel.bookings.map((b) => {
                            const isPaid = isPaymentConfirmed(b);
                            const cleanPhone = String(b.customer_phone || '').replace(/\D/g, '');
                            const whatsappLink = cleanPhone ? `https://wa.me/91${cleanPhone.slice(-10)}` : '#';

                            return (
                              <tr key={b.readable_id || b.id} className="hover:bg-slate-50/60">
                                <td className="py-2.5 px-3 font-mono font-bold text-slate-800">
                                  {b.readable_id}
                                </td>
                                <td className="py-2.5 px-3">
                                  <div className="font-semibold text-slate-900">{b.customer_name || 'Hotel Guest'}</div>
                                  {b.customer_email && (
                                    <div className="text-[10px] text-slate-400 truncate max-w-[140px]">
                                      {b.customer_email}
                                    </div>
                                  )}
                                </td>
                                <td className="py-2.5 px-3">
                                  {cleanPhone ? (
                                    <div className="flex items-center gap-1.5 font-mono text-slate-600">
                                      <a href={`tel:+91${cleanPhone.slice(-10)}`} className="hover:text-orange-600">
                                        {b.customer_phone}
                                      </a>
                                      <a
                                        href={whatsappLink}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-emerald-600 hover:text-emerald-700"
                                        title="WhatsApp guest"
                                      >
                                        <MessageSquare className="w-3 h-3" />
                                      </a>
                                    </div>
                                  ) : (
                                    <span className="text-slate-300">—</span>
                                  )}
                                </td>
                                <td className="py-2.5 px-3 font-mono text-[11px] text-slate-600 whitespace-nowrap">
                                  {b.created_at
                                    ? new Date(b.created_at).toLocaleDateString('en-IN', {
                                        day: 'numeric',
                                        month: 'short',
                                        year: 'numeric',
                                        hour: '2-digit',
                                        minute: '2-digit'
                                      })
                                    : '—'}
                                </td>
                                <td className="py-2.5 px-3 font-mono text-[11px] text-slate-600 whitespace-nowrap">
                                  {b.pickup_date} → {b.return_date}
                                </td>
                                <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">
                                  ₹{Number(b.total_rent || 0).toLocaleString('en-IN')}
                                </td>
                                <td className="py-2.5 px-3 text-center">
                                  {isPaid ? (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                      <CheckCircle className="w-2.5 h-2.5" /> Paid
                                    </span>
                                  ) : String(b.status || '').toLowerCase() === 'cancelled' ? (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600">
                                      Cancelled
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                                      <Clock className="w-2.5 h-2.5" /> Pending
                                    </span>
                                  )}
                                </td>
                                <td className="py-2.5 px-3 text-right font-mono text-xs">
                                  {isPaid ? (
                                    <span className="text-emerald-600 font-bold">₹150 (Wallet)</span>
                                  ) : String(b.status || '').toLowerCase() === 'cancelled' ? (
                                    <span className="text-slate-400 font-mono">₹0 (Cancelled)</span>
                                  ) : (
                                    <span className="text-amber-600">₹150 (Pending)</span>
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
              )}

              {/* TAB 2: REFERRED CUSTOMERS */}
              {activeDrilldownTab === 'customers' && (
                <div className="space-y-3">
                  {selectedHotel.uniqueCustomers.length === 0 ? (
                    <div className="py-12 text-center text-slate-400 text-xs">
                      No customer profiles linked to {selectedHotel.hotel_name} yet.
                    </div>
                  ) : (
                    <div className="border border-slate-200 rounded-xl overflow-hidden">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="border-b border-slate-200 bg-slate-50 text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                            <th className="py-2.5 px-3">Customer Name</th>
                            <th className="py-2.5 px-3">Mobile Phone</th>
                            <th className="py-2.5 px-3">Email Address</th>
                            <th className="py-2.5 px-3 text-center">Bookings Done</th>
                            <th className="py-2.5 px-3 text-right">Total Rental Spend</th>
                            <th className="py-2.5 px-3">Last Active</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {selectedHotel.uniqueCustomers.map((c, i) => {
                            const cleanPhone = String(c.customer_phone || '').replace(/\D/g, '');
                            const whatsappLink = cleanPhone ? `https://wa.me/91${cleanPhone.slice(-10)}` : '#';

                            return (
                              <tr key={i} className="hover:bg-slate-50/60">
                                <td className="py-2.5 px-3 font-semibold text-slate-900">
                                  {c.customer_name}
                                </td>
                                <td className="py-2.5 px-3">
                                  <div className="flex items-center gap-1.5 font-mono text-slate-700">
                                    <a href={`tel:+91${cleanPhone.slice(-10)}`} className="hover:text-orange-600">
                                      {c.customer_phone}
                                    </a>
                                    {cleanPhone && (
                                      <a
                                        href={whatsappLink}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-emerald-600 hover:text-emerald-700"
                                        title="WhatsApp guest"
                                      >
                                        <MessageSquare className="w-3 h-3" />
                                      </a>
                                    )}
                                  </div>
                                </td>
                                <td className="py-2.5 px-3 text-slate-500">
                                  {c.customer_email || '—'}
                                </td>
                                <td className="py-2.5 px-3 text-center font-bold text-slate-800 font-mono">
                                  {c.bookings_count}
                                </td>
                                <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">
                                  ₹{c.total_spent.toLocaleString('en-IN')}
                                </td>
                                <td className="py-2.5 px-3 font-mono text-[11px] text-slate-500">
                                  {c.last_booking_date
                                    ? new Date(c.last_booking_date).toLocaleDateString('en-IN', {
                                        day: 'numeric',
                                        month: 'short',
                                        year: 'numeric'
                                      })
                                    : '—'}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 3: RECEPTION STANDEE & QR */}
              {activeDrilldownTab === 'standee' && (
                <div className="max-w-md mx-auto space-y-4 py-4 text-center">
                  <div className="p-6 bg-slate-50 border border-slate-200 rounded-2xl space-y-4">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                        Front Desk Two-Wheeler Rental
                      </span>
                      <h3 className="text-lg font-bold text-slate-900 mt-0.5">{selectedHotel.hotel_name}</h3>
                      <p className="text-xs font-mono text-orange-600 font-bold mt-1">
                        Coupon Code: {selectedHotel.coupon_code} (₹150 OFF)
                      </p>
                    </div>

                    {standeeQrUrl ? (
                      <div className="p-3 bg-white inline-block rounded-xl border border-slate-200 shadow-xs">
                        <img
                          src={standeeQrUrl}
                          alt={`QR for ${selectedHotel.hotel_name}`}
                          className="w-44 h-44 object-contain mx-auto"
                        />
                      </div>
                    ) : (
                      <div className="w-44 h-44 bg-slate-200 animate-pulse rounded-xl mx-auto" />
                    )}

                    <p className="text-xs text-slate-500">
                      When guests scan this QR, code <span className="font-mono font-bold text-slate-800">{selectedHotel.coupon_code}</span> is auto-applied at checkout.
                    </p>
                  </div>

                  <div className="flex items-center justify-center gap-3">
                    <button
                      onClick={() => copyReferralLink(selectedHotel.coupon_code)}
                      className="px-4 py-2 rounded-xl border border-slate-200 hover:bg-slate-100 text-xs font-semibold text-slate-700 flex items-center gap-2 transition-colors cursor-pointer"
                    >
                      <Copy className="w-4 h-4 text-slate-500" />
                      <span>Copy Direct Link</span>
                    </button>
                    <button
                      onClick={() => window.print()}
                      className="px-4 py-2 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-xs font-semibold flex items-center gap-2 transition-colors cursor-pointer shadow-xs"
                    >
                      <Printer className="w-4 h-4" />
                      <span>Print Standee</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-200 bg-slate-50/50 flex items-center justify-between text-xs text-slate-500">
              <span>Rydeit Kolkata · Hotel Partner Management Console</span>
              <button
                onClick={() => setSelectedHotelCode(null)}
                className="px-4 py-1.5 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-700 font-medium cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export const AdminHotels: React.FC = () => {
  return (
    <AdminHotelsErrorBoundary>
      <AdminHotelsContent />
    </AdminHotelsErrorBoundary>
  );
};
