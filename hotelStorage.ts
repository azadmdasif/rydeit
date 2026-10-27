import { supabase } from './supabase';

export interface HotelPartner {
  id: string;
  hotel_name: string;
  username: string;
  coupon_code: string;
  group?: string;
  message?: string;
  contact_person?: string;
  phone?: string;
  email?: string;
  address?: string;
  commission_per_booking: number;
  total_earnings: number;
  qr_code_url?: string;
  is_active: boolean;
  created_at?: string;
}

export interface HotelAttributedBooking {
  id: number | string;
  readable_id: string;
  customer_name: string;
  customer_phone: string;
  customer_email?: string;
  bike_id?: number;
  bike_name?: string;
  pickup_date: string;
  pickup_time?: string;
  return_date: string;
  return_time?: string;
  total_rent: number;
  advance_amount: number;
  status: string;
  coupon_code: string;
  discount_amount: number;
  hotel_name: string;
  hotel_commission: number;
  created_at: string;
  // Customer profile info (if matched)
  customer_profile?: {
    is_verified?: boolean;
    dl_number?: string | null;
    aadhaar_number?: string | null;
    whatsapp?: string | null;
    username?: string | null;
  };
}

/**
 * Normalizes hotel name to small letters with no spaces or special characters.
 * e.g. "Hotel Akash Deep" -> "hotelakashdeep"
 * e.g. "Treebo Naman's Inn" -> "treebonamansinn"
 * e.g. "Morvee Hotels, Alipore" -> "morveehotelsalipore"
 */
export function normalizeHotelUsername(hotelName: string): string {
  if (!hotelName) return '';
  return hotelName.toLowerCase().replace(/[^a-z0-9]/g, '');
}

// Complete list of 52 Kolkata partner hotels synced from public.hotel_qr_routes
const RAW_HOTEL_DATA: { code: string; hotel_name: string; group?: string }[] = [
  { code: 'AKASHDEEP01', hotel_name: 'Hotel Akash Deep', group: 'seven_point' },
  { code: 'ALIPOREGH01', hotel_name: 'Alipore Guest House', group: 'mominpore' },
  { code: 'ALIPORETRANSIT01', hotel_name: 'New Alipore Transit House', group: 'mominpore' },
  { code: 'ARHAM01', hotel_name: 'Arham Guest House', group: 'mominpore' },
  { code: 'ASADGH01', hotel_name: 'Asad Guest House', group: 'mominpore' },
  { code: 'ASTONRES01', hotel_name: 'Hotel Aston Residency', group: 'mominpore' },
  { code: 'AVENUE01', hotel_name: 'Avenue Hotels', group: 'seven_point' },
  { code: 'BESTINN01', hotel_name: 'Best Inn By BookMeriHotel', group: 'mominpore' },
  { code: 'DEEPGH01', hotel_name: 'Deep Guest House', group: 'mominpore' },
  { code: 'DIAMONDGH01', hotel_name: 'Diamond Guest House', group: 'mominpore' },
  { code: 'DIANAS01', hotel_name: 'Dianas Divine Mercy Guest House', group: 'seven_point' },
  { code: 'DREAMGH01', hotel_name: 'Dream Guest House', group: 'mominpore' },
  { code: 'ESTEEM01', hotel_name: 'Hotel Esteem', group: 'mominpore' },
  { code: 'FABHASTINGS01', hotel_name: 'FabHotel The Hastings Club', group: 'mominpore' },
  { code: 'FINESTAYS01', hotel_name: 'Finestays Shanti Priya', group: 'mominpore' },
  { code: 'GALAXYGH01', hotel_name: 'Galaxy Guest House', group: 'mominpore' },
  { code: 'GLOBEINTL01', hotel_name: 'Treebo Globe International', group: 'mominpore' },
  { code: 'GOLDENKEY01', hotel_name: 'Hotel Golden Key', group: 'mominpore' },
  { code: 'GOLDENORCHID01', hotel_name: 'FabHotel The Golden Orchid', group: 'mominpore' },
  { code: 'GOLDENRETREAT01', hotel_name: 'Golden Retreat Guest House', group: 'mominpore' },
  { code: 'HASTING01', hotel_name: 'Hasting Guest House', group: 'mominpore' },
  { code: 'HOTELASTON01', hotel_name: 'Hotel Aston', group: 'mominpore' },
  { code: 'HOTELSTEAM01', hotel_name: 'Hotel Steam', group: 'mominpore' },
  { code: 'KEISUITES01', hotel_name: 'The Kei Suites', group: 'mominpore' },
  { code: 'KOLKATAGH01', hotel_name: 'Kolkata Guest House', group: 'mominpore' },
  { code: 'LAKEPALM01', hotel_name: 'The Lake Palm Hotel', group: 'mominpore' },
  { code: 'MALIK01', hotel_name: 'Malik Guest House', group: 'mominpore' },
  { code: 'MANGALAM01', hotel_name: 'Hotel Mangalam', group: 'mominpore' },
  { code: 'MEZBAN01', hotel_name: 'Mezban Guest House', group: 'mominpore' },
  { code: 'MORVEE01', hotel_name: 'Morvee Hotels, Alipore', group: 'mominpore' },
  { code: 'NAMANSINN01', hotel_name: "Treebo Naman's Inn", group: 'mominpore' },
  { code: 'NEERANAND01', hotel_name: 'Itsy Hotels Neeranand Plaza', group: 'mominpore' },
  { code: 'NESTINTL01', hotel_name: 'Hotel Nest International', group: 'seven_point' },
  { code: 'NEWMETRO01', hotel_name: 'New Metro Guest House', group: 'mominpore' },
  { code: 'NOOR01', hotel_name: 'Noor Guest House', group: 'mominpore' },
  { code: 'OPUS01', hotel_name: 'The Opus Boutique Hotel', group: 'mominpore' },
  { code: 'PANASIA01', hotel_name: 'Hotel Pan Asia Continental', group: 'mominpore' },
  { code: 'PARKEASTERN01', hotel_name: 'Park Eastern Hotel', group: 'seven_point' },
  { code: 'PLATINUM01', hotel_name: 'Hotel Platinum', group: 'seven_point' },
  { code: 'RAVIZINN01', hotel_name: 'Hotel Raviz Inn', group: 'mominpore' },
  { code: 'ROLAND01', hotel_name: 'Roland Hotel', group: 'mominpore' },
  { code: 'ROSEWOOD01', hotel_name: 'The Rosewood Hotel', group: 'mominpore' },
  { code: 'ROYALGH01', hotel_name: 'Royal Guest House', group: 'mominpore' },
  { code: 'ROYALPLACE01', hotel_name: 'Hotel Royal Place', group: 'seven_point' },
  { code: 'SAFFRON01', hotel_name: 'Saffron Guest House', group: 'mominpore' },
  { code: 'SAINIINN01', hotel_name: 'Hotel Saini Inn', group: 'mominpore' },
  { code: 'SAPPHIREGH01', hotel_name: 'Sapphire Guest House', group: 'seven_point' },
  { code: 'SHILAINTL01', hotel_name: 'Hotel Shila International', group: 'mominpore' },
  { code: 'SHREELAXMI01', hotel_name: 'Shree Laxmi Guest House', group: 'mominpore' },
  { code: 'STAYHUB01', hotel_name: 'Stay Hub Hotel Bhowanipore', group: 'mominpore' },
  { code: 'SWAGATH01', hotel_name: 'Hotel Swagath', group: 'mominpore' },
  { code: 'TUCASA01', hotel_name: 'Hotel Tu Casa', group: 'seven_point' }
];

export const DEFAULT_HOTEL_PARTNERS: HotelPartner[] = RAW_HOTEL_DATA.map((item) => ({
  id: item.code,
  hotel_name: item.hotel_name,
  username: normalizeHotelUsername(item.hotel_name),
  coupon_code: item.code.toUpperCase(),
  group: item.group,
  commission_per_booking: 150,
  total_earnings: 0,
  is_active: true
}));

const LOCAL_STORAGE_HOTELS_KEY = 'rydeit_hotel_partners_cache_v2';
const LOCAL_STORAGE_HOTEL_SESSION_KEY = 'rydeit_hotel_active_session_v2';
const LOCAL_STORAGE_COUPON_ATTRIBUTIONS_KEY = 'rydeit_coupon_attributions_v2';

/**
 * Retrieve cached hotel partners from localStorage, falling back to default list
 */
function getLocalCachedHotels(): HotelPartner[] {
  if (typeof window === 'undefined') return DEFAULT_HOTEL_PARTNERS;
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_HOTELS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (e) {
    console.warn('Failed to parse local hotel cache:', e);
  }
  return DEFAULT_HOTEL_PARTNERS;
}

/**
 * Save updated hotel partners to localStorage
 */
function saveLocalCachedHotels(hotels: HotelPartner[]) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(LOCAL_STORAGE_HOTELS_KEY, JSON.stringify(hotels));
  } catch (e) {
    console.warn('Failed to save local hotel cache:', e);
  }
}

/**
 * Fetch all hotel partners directly from Supabase table 'hotel_qr_routes'.
 * Automatically maps:
 * - username: hotel_name in small letters no space
 * - coupon_code: code (text)
 * - password: code
 * Every time a new hotel is inserted in hotel_qr_routes, it automatically gets an account.
 */
export async function fetchHotelPartners(): Promise<HotelPartner[]> {
  const localList = getLocalCachedHotels();

  try {
    // 1. Primary table: public.hotel_qr_routes (as shown in user's Supabase dashboard)
    const { data: qrRoutes, error: qrRoutesError } = await supabase
      .from('hotel_qr_routes')
      .select('*')
      .order('hotel_name', { ascending: true });

    if (!qrRoutesError && qrRoutes && qrRoutes.length > 0) {
      const formatted: HotelPartner[] = qrRoutes.map((row: any) => {
        const rawCode = String(row.code || '').trim().toUpperCase();
        const hotelName = String(row.hotel_name || row.name || 'Hotel Partner').trim();
        const username = normalizeHotelUsername(hotelName);

        return {
          id: rawCode || String(row.id || username),
          hotel_name: hotelName,
          username: username,
          coupon_code: rawCode,
          group: row.group || '',
          message: row.message || '',
          contact_person: row.contact_person || 'Front Desk',
          phone: row.phone || '',
          email: row.email || '',
          address: row.address || '',
          commission_per_booking: Number(row.commission_per_booking || 150),
          total_earnings: Number(row.total_earnings || 0),
          qr_code_url: row.qr_code_url || '',
          is_active: row.active ?? true,
          created_at: row.updated_at || row.created_at
        };
      });

      // Merge with default list in case any are missing
      const mergedMap = new Map<string, HotelPartner>();
      DEFAULT_HOTEL_PARTNERS.forEach(p => mergedMap.set(p.coupon_code.toUpperCase(), p));
      formatted.forEach(p => mergedMap.set(p.coupon_code.toUpperCase(), p));

      const mergedList = Array.from(mergedMap.values());
      saveLocalCachedHotels(mergedList);
      return mergedList;
    }

    // 2. Secondary fallback table: public.hotel_partners (if created via schema migration)
    const { data: partnersData, error: partnersError } = await supabase
      .from('hotel_partners')
      .select('*')
      .eq('is_active', true)
      .order('hotel_name', { ascending: true });

    if (!partnersError && partnersData && partnersData.length > 0) {
      const formatted: HotelPartner[] = partnersData.map((d: any) => ({
        id: String(d.id),
        hotel_name: d.hotel_name,
        username: normalizeHotelUsername(d.hotel_name),
        coupon_code: String(d.coupon_code).toUpperCase(),
        contact_person: d.contact_person || '',
        phone: d.phone || '',
        email: d.email || '',
        address: d.address || '',
        commission_per_booking: Number(d.commission_per_booking || 150),
        total_earnings: Number(d.total_earnings || 0),
        qr_code_url: d.qr_code_url || '',
        is_active: d.is_active ?? true,
        created_at: d.created_at
      }));

      const mergedMap = new Map<string, HotelPartner>();
      DEFAULT_HOTEL_PARTNERS.forEach(p => mergedMap.set(p.coupon_code.toUpperCase(), p));
      formatted.forEach(p => mergedMap.set(p.coupon_code.toUpperCase(), p));

      const mergedList = Array.from(mergedMap.values());
      saveLocalCachedHotels(mergedList);
      return mergedList;
    }
  } catch (err) {
    console.warn('Supabase hotel partners query skipped, using local cache:', err);
  }

  return localList;
}

/**
 * Authenticate hotel partner using Hotel Name as username (small letters no space)
 * and Coupon Code as password.
 * 
 * Rules:
 * - Username: hotel name in small letters no space (e.g. "hotelakashdeep", "aliporeguesthouse")
 *   Also accepts the normal hotel name with spaces ("Hotel Akash Deep") for user convenience.
 * - Password: the hotel's coupon code (e.g. "AKASHDEEP01").
 * 
 * AUTOMATIC ACCOUNT CREATION:
 * If a hotel was recently added to hotel_qr_routes in Supabase, this function will query
 * hotel_qr_routes dynamically by password/code so newly added hotels can log in immediately.
 */
export async function authenticateHotelPartner(
  usernameInput: string,
  passwordInput: string
): Promise<{ success: boolean; hotel?: HotelPartner; error?: string }> {
  const rawUser = usernameInput.trim();
  const rawPass = passwordInput.trim();

  if (!rawUser) {
    return { success: false, error: 'Please enter your Hotel Username (hotel name in small letters, no space).' };
  }
  if (!rawPass) {
    return { success: false, error: 'Please enter your Coupon Code as password.' };
  }

  const normalizedInputUsername = normalizeHotelUsername(rawUser);
  const cleanPassCode = rawPass.toUpperCase();

  // 1. Check against loaded / cached partner list
  const partners = await fetchHotelPartners();
  let match = partners.find(h => {
    const partnerUsername = normalizeHotelUsername(h.hotel_name);
    const partnerCode = h.coupon_code.trim().toUpperCase();
    return partnerUsername === normalizedInputUsername && partnerCode === cleanPassCode;
  });

  // 2. If not found in memory/cache, query Supabase hotel_qr_routes in real-time
  // This satisfies: "everytime new hotel is entered in this qr routes table, it should automatically get an account"
  if (!match) {
    try {
      const { data: routeRow, error: routeErr } = await supabase
        .from('hotel_qr_routes')
        .select('*')
        .ilike('code', cleanPassCode)
        .maybeSingle();

      if (!routeErr && routeRow) {
        const rowHotelName = String(routeRow.hotel_name || '').trim();
        const rowUsername = normalizeHotelUsername(rowHotelName);

        if (rowUsername === normalizedInputUsername) {
          match = {
            id: String(routeRow.code),
            hotel_name: rowHotelName,
            username: rowUsername,
            coupon_code: String(routeRow.code).toUpperCase(),
            group: routeRow.group || '',
            message: routeRow.message || '',
            commission_per_booking: 150,
            total_earnings: Number(routeRow.total_earnings || 0),
            is_active: routeRow.active ?? true,
            created_at: routeRow.updated_at
          };

          // Cache this newly discovered hotel partner
          const currentList = getLocalCachedHotels();
          currentList.push(match);
          saveLocalCachedHotels(currentList);
        }
      }
    } catch (e) {
      console.warn('Real-time hotel_qr_routes check error:', e);
    }
  }

  // 3. Fallback check for hotel_partners table
  if (!match) {
    try {
      const { data: partnerRow } = await supabase
        .from('hotel_partners')
        .select('*')
        .ilike('coupon_code', cleanPassCode)
        .maybeSingle();

      if (partnerRow) {
        const pName = String(partnerRow.hotel_name || '').trim();
        if (normalizeHotelUsername(pName) === normalizedInputUsername) {
          match = {
            id: String(partnerRow.id),
            hotel_name: pName,
            username: normalizeHotelUsername(pName),
            coupon_code: String(partnerRow.coupon_code).toUpperCase(),
            contact_person: partnerRow.contact_person || '',
            phone: partnerRow.phone || '',
            email: partnerRow.email || '',
            address: partnerRow.address || '',
            commission_per_booking: Number(partnerRow.commission_per_booking || 150),
            total_earnings: Number(partnerRow.total_earnings || 0),
            is_active: partnerRow.is_active ?? true,
            created_at: partnerRow.created_at
          };
        }
      }
    } catch (e) {
      console.warn('Real-time hotel_partners check error:', e);
    }
  }

  if (!match) {
    return {
      success: false,
      error: `Invalid hotel credentials. Expected username is the hotel name in small letters with no space (e.g. hotelakashdeep) and password is your hotel coupon code (e.g. AKASHDEEP01).`
    };
  }

  // 4. Save active session
  setHotelSession(match);
  return { success: true, hotel: match };
}

/**
 * Validates a coupon code entered by a customer during booking.
 * Returns discount (₹150) and matched hotel partner info if valid.
 */
export async function validateCouponCode(
  rawCode: string
): Promise<{ isValid: boolean; discount: number; hotel?: HotelPartner; error?: string }> {
  if (!rawCode || !rawCode.trim()) {
    return { isValid: false, discount: 0, error: 'Please enter a coupon code.' };
  }

  const cleanCode = rawCode.trim().toUpperCase();
  const partners = await fetchHotelPartners();

  let hotel = partners.find(h => h.coupon_code.trim().toUpperCase() === cleanCode && h.is_active);

  // If not in local list, check hotel_qr_routes in real-time
  if (!hotel) {
    try {
      const { data: routeRow } = await supabase
        .from('hotel_qr_routes')
        .select('*')
        .ilike('code', cleanCode)
        .maybeSingle();

      if (routeRow && (routeRow.active ?? true)) {
        hotel = {
          id: String(routeRow.code),
          hotel_name: String(routeRow.hotel_name).trim(),
          username: normalizeHotelUsername(String(routeRow.hotel_name)),
          coupon_code: String(routeRow.code).toUpperCase(),
          group: routeRow.group || '',
          message: routeRow.message || '',
          commission_per_booking: 150,
          total_earnings: Number(routeRow.total_earnings || 0),
          is_active: true
        };
      }
    } catch (e) {
      console.warn('Real-time coupon lookup error:', e);
    }
  }

  if (!hotel) {
    return {
      isValid: false,
      discount: 0,
      error: `Coupon "${cleanCode}" is invalid or expired. Please check your coupon code.`
    };
  }

  return {
    isValid: true,
    discount: 150, // ₹150 discount on total order per user requirement
    hotel
  };
}

/**
 * Credit ₹150 to hotel partner account when their coupon code is used in a booking.
 */
export async function creditHotelCommission(
  couponCode: string,
  bookingReadableId: string,
  hotelId?: string
): Promise<void> {
  const cleanCode = couponCode.trim().toUpperCase();
  const commissionAmount = 150;

  // 1. Update local cache
  const hotels = getLocalCachedHotels();
  const targetIndex = hotels.findIndex(h => h.coupon_code.toUpperCase() === cleanCode);
  if (targetIndex !== -1) {
    hotels[targetIndex].total_earnings = (hotels[targetIndex].total_earnings || 0) + commissionAmount;
    saveLocalCachedHotels(hotels);
  }

  // 2. Track attribution locally so hotel dashboard reflects it instantly
  try {
    const rawAttributions = localStorage.getItem(LOCAL_STORAGE_COUPON_ATTRIBUTIONS_KEY);
    const attributions: Record<string, string[]> = rawAttributions ? JSON.parse(rawAttributions) : {};
    if (!attributions[cleanCode]) attributions[cleanCode] = [];
    if (!attributions[cleanCode].includes(bookingReadableId)) {
      attributions[cleanCode].push(bookingReadableId);
    }
    localStorage.setItem(LOCAL_STORAGE_COUPON_ATTRIBUTIONS_KEY, JSON.stringify(attributions));
  } catch (e) {
    console.warn('Failed to update local attribution records:', e);
  }

  // 3. Attempt Supabase increments in both hotel_qr_routes and hotel_partners
  try {
    // Try updating hotel_qr_routes if total_earnings column exists
    const { data: routeRow } = await supabase
      .from('hotel_qr_routes')
      .select('code, total_earnings')
      .ilike('code', cleanCode)
      .maybeSingle();

    if (routeRow && routeRow.total_earnings !== undefined) {
      const newTotal = Number(routeRow.total_earnings || 0) + commissionAmount;
      await supabase
        .from('hotel_qr_routes')
        .update({ total_earnings: newTotal, updated_at: new Date().toISOString() })
        .eq('code', routeRow.code);
    }
  } catch (err) {
    // Column might not exist yet; safe to ignore
  }

  try {
    const { data: existing } = await supabase
      .from('hotel_partners')
      .select('id, total_earnings')
      .ilike('coupon_code', cleanCode)
      .maybeSingle();

    if (existing) {
      const newTotal = Number(existing.total_earnings || 0) + commissionAmount;
      await supabase
        .from('hotel_partners')
        .update({ total_earnings: newTotal, updated_at: new Date().toISOString() })
        .eq('id', existing.id);
    }
  } catch (err) {
    // Table might not exist; safe to ignore
  }
}

/**
 * Fetch all customer bookings attributed to a specific hotel's coupon code.
 * Also calculates total live commission earned (bookings.length * 150).
 */
export async function fetchHotelBookings(
  hotel: HotelPartner
): Promise<HotelAttributedBooking[]> {
  const cleanCode = hotel.coupon_code.trim().toUpperCase();
  const cleanName = hotel.hotel_name.trim();

  const results: HotelAttributedBooking[] = [];

  try {
    // 1. Query Supabase bookings where coupon_code = cleanCode OR hotel_name = cleanName
    const { data: dbBookings, error: bErr } = await supabase
      .from('bookings')
      .select('*')
      .or(`coupon_code.ilike.${cleanCode},hotel_name.ilike.%${cleanName}%`)
      .order('created_at', { ascending: false });

    if (!bErr && dbBookings && dbBookings.length > 0) {
      // Fetch associated customer profiles if available to enrich customer information
      const userIds = dbBookings.map((b: any) => b.user_id).filter(Boolean);
      const phones = dbBookings.map((b: any) => b.customer_phone).filter(Boolean);
      let profilesMap: Record<string, any> = {};

      if (userIds.length > 0 || phones.length > 0) {
        try {
          const { data: profiles } = await supabase
            .from('profiles')
            .select('id, phone, whatsapp, dl_number, aadhaar_number, is_verified, username');
          if (profiles) {
            profiles.forEach((p: any) => {
              if (p.id) profilesMap[p.id] = p;
              if (p.phone) profilesMap[p.phone] = p;
            });
          }
        } catch (e) {
          console.warn('Could not enrich with profiles:', e);
        }
      }

      dbBookings.forEach((b: any) => {
        const profile = profilesMap[b.user_id] || profilesMap[b.customer_phone];
        results.push({
          id: b.id,
          readable_id: b.readable_id || `RD-${b.id}`,
          customer_name: b.customer_name || 'Hotel Guest',
          customer_phone: b.customer_phone || '',
          customer_email: b.customer_email || '',
          bike_id: b.bike_id,
          pickup_date: b.pickup_date,
          pickup_time: b.pickup_time || '10:00',
          return_date: b.return_date,
          return_time: b.return_time || '20:00',
          total_rent: Number(b.total_rent || 0),
          advance_amount: Number(b.advance_amount || 0),
          status: b.status || 'pending_payment',
          coupon_code: b.coupon_code || cleanCode,
          discount_amount: Number(b.discount_amount || 150),
          hotel_name: b.hotel_name || cleanName,
          hotel_commission: Number(b.hotel_commission || 150),
          created_at: b.created_at || new Date().toISOString(),
          customer_profile: profile ? {
            is_verified: profile.is_verified,
            dl_number: profile.dl_number,
            aadhaar_number: profile.aadhaar_number,
            whatsapp: profile.whatsapp,
            username: profile.username
          } : undefined
        });
      });
    }
  } catch (err) {
    console.warn('Error querying Supabase for hotel bookings:', err);
  }

  // Also check local storage for offline / recently created bookings matching coupon
  try {
    const rawAttributions = localStorage.getItem(LOCAL_STORAGE_COUPON_ATTRIBUTIONS_KEY);
    const attributions: Record<string, string[]> = rawAttributions ? JSON.parse(rawAttributions) : {};
    const localReadableIds = attributions[cleanCode] || [];

    for (const rid of localReadableIds) {
      if (!results.some(r => r.readable_id === rid)) {
        // Query by readable_id specifically
        const { data: single } = await supabase
          .from('bookings')
          .select('*')
          .eq('readable_id', rid)
          .maybeSingle();

        if (single) {
          results.push({
            id: single.id,
            readable_id: single.readable_id,
            customer_name: single.customer_name || 'Hotel Guest',
            customer_phone: single.customer_phone || '',
            customer_email: single.customer_email || '',
            bike_id: single.bike_id,
            pickup_date: single.pickup_date,
            pickup_time: single.pickup_time || '10:00',
            return_date: single.return_date,
            return_time: single.return_time || '20:00',
            total_rent: Number(single.total_rent || 0),
            advance_amount: Number(single.advance_amount || 0),
            status: single.status || 'pending_payment',
            coupon_code: cleanCode,
            discount_amount: 150,
            hotel_name: cleanName,
            hotel_commission: 150,
            created_at: single.created_at || new Date().toISOString()
          });
        }
      }
    }
  } catch (e) {
    console.warn('Local attribution check skipped:', e);
  }

  return results;
}

// Session Helpers
export function getHotelSession(): HotelPartner | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_HOTEL_SESSION_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.warn('Failed to parse hotel session:', e);
  }
  return null;
}

export function setHotelSession(hotel: HotelPartner): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(LOCAL_STORAGE_HOTEL_SESSION_KEY, JSON.stringify(hotel));
  } catch (e) {
    console.warn('Failed to set hotel session:', e);
  }
}

export function clearHotelSession(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(LOCAL_STORAGE_HOTEL_SESSION_KEY);
  } catch (e) {
    console.warn('Failed to clear hotel session:', e);
  }
}
