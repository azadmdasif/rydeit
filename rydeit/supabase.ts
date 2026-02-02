
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://sgjloqkekawzcsvvjssx.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNnamxvcWtla2F3emNzdnZqc3N4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkzMjk2MjgsImV4cCI6MjA4NDkwNTYyOH0.NYpEgmG4CxSGEgCF6YOV2YU_wkztLle1EOfasWeL-Ko';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
