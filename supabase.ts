import { createClient } from '@supabase/supabase-js';

const supabaseUrl = (import.meta as any).env?.VITE_SUPABASE_URL || 'https://sgjloqkekawzcsvvjssx.supabase.co';
const supabaseAnonKey = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNnamxvcWtla2F3emNzdnZqc3N4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkzMjk2MjgsImV4cCI6MjA4NDkwNTYyOH0.NYpEgmG4CxSGEgCF6YOV2YU_wkztLle1EOfasWeL-Ko';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

/**
 * Resilient booking updater that progressively removes any optional columns
 * (e.g. has_pillion, pillion_*, emergency_*) not yet present in the Supabase schema cache.
 */
export const safeUpdateBooking = async (
  bookingId: string | number,
  payload: Record<string, any>
): Promise<{ data: any; error: any }> => {
  const currentPayload: Record<string, any> = { ...payload };
  const optionalColumns = [
    'has_pillion',
    'pillion_name',
    'pillion_phone',
    'pillion_mobile',
    'pillion_aadhaar_number',
    'pillion_aadhar_number',
    'pillion_aadhaar_url',
    'pillion_aadhar_url',
    'emergency_contact_phone',
    'emergency_contact',
    'pillion_emergency_contact',
    'emergency_relation',
    'customer_email',
    'customer_photo_url',
    'start_odometer',
    'end_odometer',
    'updated_at'
  ];

  for (let attempt = 0; attempt < 15; attempt++) {
    const { data, error } = await supabase
      .from('bookings')
      .update(currentPayload)
      .eq('id', bookingId);

    if (!error) {
      return { data, error: null };
    }

    const errMsg = (error.message || '').toLowerCase();
    const isColumnError =
      error.code === '42703' ||
      error.code === 'PGRST204' ||
      errMsg.includes('column') ||
      errMsg.includes('schema cache');

    if (isColumnError) {
      // 1. Try matching "Could not find the 'xyz' column of 'bookings' in the schema cache"
      const match1 = error.message?.match(/Could not find the '([^']+)' column/i);
      // 2. Try matching column "xyz" does not exist / of relation
      const match2 =
        error.message?.match(/column "?([^"\s]+)"? of relation/i) ||
        error.message?.match(/column "?([^"\s]+)"? does not exist/i);
      const missingCol = match1?.[1] || match2?.[1];

      if (missingCol && missingCol in currentPayload) {
        console.warn(`[safeUpdateBooking] Removing missing column '${missingCol}' from update payload and retrying...`);
        delete currentPayload[missingCol];
        continue;
      }

      // 3. Fallback: find any optional column currently in currentPayload to strip
      const foundOptionalCol = optionalColumns.find(col => col in currentPayload);
      if (foundOptionalCol) {
        console.warn(`[safeUpdateBooking] Removing optional column '${foundOptionalCol}' and retrying...`);
        delete currentPayload[foundOptionalCol];
        continue;
      }
    }

    return { data, error };
  }

  return { data: null, error: new Error('Exceeded maximum retry attempts while adjusting payload schema') };
};
