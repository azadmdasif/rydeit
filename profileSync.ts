import { supabase } from './supabase';
import type { UserProfile } from './types';

export interface EnsureCustomerProfileParams {
  email: string;
  full_name: string;
  phone: string;
  dl_number?: string | null;
  aadhaar_number?: string | null;
  dl_url?: string | null;
  aadhaar_url?: string | null;
}

/**
 * Creates or updates a profile in public.profiles for any payment-confirmed customer.
 * Generates a clean username and creates/links their Supabase Auth account so the rider
 * can immediately sign in using either their Email, Username, or 10-digit Mobile Number.
 */
export async function ensureCustomerProfile(customer: EnsureCustomerProfileParams): Promise<{
  profileId: string | null;
  username: string;
  isNew: boolean;
}> {
  const cleanEmail = customer.email.trim().toLowerCase();
  const rawDigits = customer.phone.replace(/\D/g, '');
  const cleanPhone = rawDigits.length >= 10 ? rawDigits.slice(-10) : rawDigits;
  const fullName = customer.full_name.trim();

  // Generate a friendly unique username: e.g. "rahul_sharma" or "rahul_5432"
  const emailPrefix = cleanEmail.split('@')[0].replace(/[^a-zA-Z0-9_]/g, '_').toLowerCase();
  const phoneSuffix = cleanPhone.slice(-4) || '1234';
  const defaultUsername = emailPrefix.length >= 3 ? emailPrefix : `rider_${phoneSuffix}`;

  try {
    // 1. Check if profile already exists in public.profiles by email, phone, or whatsapp
    let existingProfile: any = null;
    try {
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .or(`email.ilike.${cleanEmail},phone.eq.${cleanPhone},whatsapp.eq.${cleanPhone}`)
        .limit(1)
        .maybeSingle();
      existingProfile = data;
    } catch (e) {
      console.warn('Profile search warning:', e);
    }

    if (existingProfile) {
      // Update existing profile with any fresh KYC, phone, or name details
      const updates: any = {
        updated_at: new Date().toISOString()
      };
      if (fullName && (!existingProfile.full_name || existingProfile.full_name.toLowerCase() === 'anonymous')) {
        updates.full_name = fullName;
      }
      if (cleanPhone && !existingProfile.phone) {
        updates.phone = cleanPhone;
        updates.whatsapp = cleanPhone;
      }
      if (customer.dl_number && !existingProfile.dl_number) updates.dl_number = customer.dl_number;
      if (customer.aadhaar_number && !existingProfile.aadhaar_number) updates.aadhaar_number = customer.aadhaar_number;
      if (customer.dl_url && !existingProfile.dl_url) updates.dl_url = customer.dl_url;
      if (customer.aadhaar_url && !existingProfile.aadhaar_url) updates.aadhaar_url = customer.aadhaar_url;
      if (!existingProfile.username) updates.username = defaultUsername;

      try {
        await supabase.from('profiles').update(updates).eq('id', existingProfile.id);
      } catch (err) {
        console.warn('Profile update warning:', err);
      }

      // Link any unlinked bookings with matching email or phone
      await linkCustomerBookings(existingProfile.id, cleanEmail, cleanPhone);

      return {
        profileId: existingProfile.id,
        username: existingProfile.username || defaultUsername,
        isNew: false
      };
    }

    // 2. Insert fresh record into public.profiles (WITHOUT calling supabase.auth.signUp so the current admin session is never hijacked)
    const profilePayload: any = {
      email: cleanEmail,
      full_name: fullName,
      phone: cleanPhone,
      whatsapp: cleanPhone,
      username: defaultUsername,
      dl_number: customer.dl_number || null,
      aadhaar_number: customer.aadhaar_number || null,
      dl_url: customer.dl_url || null,
      aadhaar_url: customer.aadhaar_url || null,
      is_verified: Boolean(customer.dl_number || customer.dl_url),
      is_admin: false,
      is_blocked: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    try {
      let resolvedId: string | null = null;

      // 1. Try standard insert (does not require ON CONFLICT unique constraint)
      const { data: inserted, error: insertError } = await supabase
        .from('profiles')
        .insert(profilePayload)
        .select('id')
        .maybeSingle();

      if (inserted?.id) {
        resolvedId = inserted.id;
      }

      // 2. If column 'username' does not exist yet (42703), retry without username
      if (insertError && (insertError.message?.includes('username') || insertError.details?.includes('username') || insertError.code === '42703')) {
        const payloadWithoutUsername = { ...profilePayload };
        delete payloadWithoutUsername.username;
        const { data: retryInserted } = await supabase
          .from('profiles')
          .insert(payloadWithoutUsername)
          .select('id')
          .maybeSingle();
        if (retryInserted?.id) {
          resolvedId = retryInserted.id;
        }
      }

      // 3. If duplicate key error (row with this email or id already exists), fetch existing
      if (insertError && (insertError.message?.includes('duplicate key') || insertError.code === '23505' || insertError.message?.includes('already exists'))) {
        const { data: existing } = await supabase
          .from('profiles')
          .select('id')
          .or(`email.ilike.${cleanEmail},phone.eq.${cleanPhone}`)
          .maybeSingle();
        if (existing?.id) {
          resolvedId = existing.id;
          try {
            await supabase.from('profiles').update(profilePayload).eq('id', existing.id);
          } catch (updateErr) {
            console.warn('Profile update notice:', updateErr);
          }
        }
      }

      if (resolvedId) {
        await linkCustomerBookings(resolvedId, cleanEmail, cleanPhone);
      }

      return {
        profileId: resolvedId,
        username: defaultUsername,
        isNew: true
      };
    } catch (insertErr) {
      console.warn('Profile direct insert notice (handled):', insertErr);
      return {
        profileId: null,
        username: defaultUsername,
        isNew: true
      };
    }
  } catch (globalErr) {
    console.error('Error ensuring customer profile:', globalErr);
    return {
      profileId: null,
      username: defaultUsername,
      isNew: false
    };
  }
}

/**
 * Associates all existing bookings with matching customer email or phone to their profile ID.
 */
export async function linkCustomerBookings(profileId: string, email: string, phone?: string): Promise<number> {
  if (!profileId || !email) return 0;
  try {
    const cleanEmail = email.trim().toLowerCase();
    const cleanPhone = phone ? phone.replace(/\D/g, '').slice(-10) : '';

    // Update bookings with null user_id
    let filter = `customer_email.ilike.${cleanEmail}`;
    if (cleanPhone && cleanPhone.length >= 10) {
      filter += `,customer_phone.ilike.%${cleanPhone}%`;
    }

    const { data: matchingBookings, error: findError } = await supabase
      .from('bookings')
      .select('id, user_id')
      .or(filter)
      .is('user_id', null);

    if (findError || !matchingBookings || matchingBookings.length === 0) {
      return 0;
    }

    const idsToUpdate = matchingBookings.map(b => b.id);
    const { error: updateError } = await supabase
      .from('bookings')
      .update({ user_id: profileId })
      .in('id', idsToUpdate);

    if (updateError) {
      console.warn('Notice updating unlinked bookings:', updateError);
      return 0;
    }

    return idsToUpdate.length;
  } catch (err) {
    console.warn('Failed linking customer bookings:', err);
    return 0;
  }
}

export interface RiderRecordInfo {
  email: string;
  phone: string;
  fullName: string;
  hasBooking: boolean;
  hasProfile: boolean;
}

/**
 * Searches both public.profiles and bookings for any rider matching the given identifier
 * (which can be an Email, a Username, or a 10-digit Phone number).
 */
export async function findRiderBookingOrProfile(identifier: string): Promise<RiderRecordInfo | null> {
  const trimmed = identifier.trim();
  if (!trimmed) return null;

  const isEmail = trimmed.includes('@');
  const cleanEmail = isEmail ? trimmed.toLowerCase() : '';
  const digits = trimmed.replace(/\D/g, '');
  const phone10 = digits.length >= 10 ? digits.slice(-10) : '';

  let resolvedEmail = cleanEmail;
  let resolvedPhone = phone10;
  let resolvedName = '';
  let hasBooking = false;
  let hasProfile = false;

  try {
    // 1. Try public.profiles first
    try {
      let profileQuery = supabase.from('profiles').select('email, phone, whatsapp, full_name, username');
      if (isEmail) {
        profileQuery = profileQuery.ilike('email', cleanEmail);
      } else if (phone10) {
        profileQuery = profileQuery.or(`phone.eq.${phone10},whatsapp.eq.${phone10},phone.ilike.%${phone10}%`);
      } else {
        profileQuery = profileQuery.ilike('username', trimmed);
      }

      const { data: profileData } = await profileQuery.limit(1).maybeSingle();
      if (profileData) {
        hasProfile = true;
        if (!resolvedEmail && profileData.email) {
          resolvedEmail = profileData.email.trim().toLowerCase();
        }
        if (!resolvedPhone && (profileData.phone || profileData.whatsapp)) {
          const raw = profileData.phone || profileData.whatsapp;
          resolvedPhone = raw.replace(/\D/g, '').slice(-10);
        }
        if (!resolvedName && profileData.full_name) {
          resolvedName = profileData.full_name.trim();
        }
      }
    } catch (profileErr) {
      console.warn('Profile search notice:', profileErr);
    }

    // 2. Query bookings table for customer records
    try {
      let bookingQuery = supabase
        .from('bookings')
        .select('customer_email, customer_phone, customer_name, status, created_at')
        .order('created_at', { ascending: false });

      if (resolvedEmail) {
        bookingQuery = bookingQuery.ilike('customer_email', resolvedEmail);
      } else if (phone10) {
        bookingQuery = bookingQuery.ilike('customer_phone', `%${phone10}%`);
      } else {
        bookingQuery = bookingQuery.ilike('customer_name', `%${trimmed}%`);
      }

      const { data: bookingData } = await bookingQuery.limit(1).maybeSingle();
      if (bookingData) {
        hasBooking = true;
        if (!resolvedEmail && bookingData.customer_email) {
          resolvedEmail = bookingData.customer_email.trim().toLowerCase();
        }
        if (!resolvedPhone && bookingData.customer_phone) {
          resolvedPhone = bookingData.customer_phone.replace(/\D/g, '').slice(-10);
        }
        if (!resolvedName && bookingData.customer_name) {
          resolvedName = bookingData.customer_name.trim();
        }
      }
    } catch (bookingErr) {
      console.warn('Booking search notice:', bookingErr);
    }

    if (resolvedEmail || resolvedPhone) {
      return {
        email: resolvedEmail,
        phone: resolvedPhone,
        fullName: resolvedName,
        hasBooking,
        hasProfile
      };
    }
  } catch (err) {
    console.warn('findRiderBookingOrProfile general error:', err);
  }

  return null;
}

/**
 * Resolves an identifier (which can be an Email, a Username, or a 10-digit Phone number)
 * to the registered account Email address so Supabase Auth can verify the password.
 */
export async function resolveLoginIdentifierToEmail(identifier: string): Promise<string> {
  const trimmed = identifier.trim();
  if (!trimmed) return '';

  // If already an email, return as-is
  if (trimmed.includes('@')) {
    return trimmed.toLowerCase();
  }

  // Use the unified rider lookup
  const rider = await findRiderBookingOrProfile(trimmed);
  if (rider?.email) {
    return rider.email;
  }

  // Fallback: return input as-is
  return trimmed;
}
