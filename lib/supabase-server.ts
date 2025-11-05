import { createClient } from '@supabase/supabase-js';

// Supabase bağlantı bilgileri
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Supabase URL ve Service Key environment variables\'da tanımlı olmalıdır.');
}

// Server-side için Supabase client (service key ile - admin yetkileri)
// Bu client RLS bypass eder ve tüm işlemleri yapabilir
export const supabaseServer = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

// Client-side için Supabase client (anon key ile)
// Bu client RLS kurallarına tabidir
export const supabaseClient = createClient(supabaseUrl, supabaseAnonKey);

// Type definitions
export type SupabaseServerClient = typeof supabaseServer;
export type SupabaseClientType = typeof supabaseClient;

