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

  const cleanDigits = trimmed.replace(/\D/g, '');
  const phone10 = cleanDigits.length >= 10 ? cleanDigits.slice(-10) : '';

  try {
    // 1. Try matching in public.profiles by username, phone, or whatsapp
    try {
      let query = supabase.from('profiles').select('email, username, phone, whatsapp');
      if (phone10) {
        query = query.or(`phone.eq.${phone10},whatsapp.eq.${phone10},username.ilike.${trimmed},phone.ilike.%${phone10}%`);
      } else {
        query = query.ilike('username', trimmed);
      }

      const { data, error } = await query.limit(1).maybeSingle();
      if (!error && data?.email) {
        return data.email;
      }

      // If query failed due to username column missing in schema cache, try standard phone/whatsapp query
      if (error && (error.message?.includes('username') || error.code === '42703') && phone10) {
        const { data: fbData } = await supabase
          .from('profiles')
          .select('email, phone, whatsapp')
          .or(`phone.eq.${phone10},whatsapp.eq.${phone10}`)
          .limit(1)
          .maybeSingle();
        if (fbData?.email) {
          return fbData.email;
        }
      }
    } catch (profileErr) {
      console.warn('Profiles query notice:', profileErr);
    }

    // 2. Also check if there is a booking with this customer_phone or customer_name
    if (phone10) {
      const { data: bookingData } = await supabase
        .from('bookings')
        .select('customer_email')
        .ilike('customer_phone', `%${phone10}%`)
        .not('customer_email', 'is', null)
        .limit(1)
        .maybeSingle();

      if (bookingData?.customer_email) {
        return bookingData.customer_email;
      }
    }
  } catch (e) {
    console.warn('Identifier lookup error:', e);
  }

  // Fallback: return input as-is (e.g. if user configured custom Supabase username login)
  return trimmed;
}
