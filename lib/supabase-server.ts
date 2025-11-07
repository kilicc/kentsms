import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Lazy initialization - Build sırasında environment variables olmayabilir
let supabaseServerInstance: SupabaseClient | null = null;
let supabaseClientInstance: SupabaseClient | null = null;

// Get Supabase URL and keys
function getSupabaseConfig() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || '';
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY || '';
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || '';
  
  return { supabaseUrl, supabaseServiceKey, supabaseAnonKey };
}

// Server-side için Supabase client (service key ile - admin yetkileri)
// Bu client RLS bypass eder ve tüm işlemleri yapabilir
function getSupabaseServer(): SupabaseClient {
  if (supabaseServerInstance) {
    return supabaseServerInstance;
  }

  const { supabaseUrl, supabaseServiceKey } = getSupabaseConfig();

  // Runtime'da kontrol et (build sırasında değil)
  // Build sırasında environment variables olmayabilir, bu normal
  if (typeof window === 'undefined') {
    if (!supabaseUrl || !supabaseServiceKey) {
      // Production runtime'da environment variables olmalı
      if (process.env.NODE_ENV === 'production') {
        console.error('Supabase configuration missing:', { 
          hasUrl: !!supabaseUrl, 
          hasServiceKey: !!supabaseServiceKey 
        });
        throw new Error('Supabase URL ve Service Key environment variables\'da tanımlı olmalıdır.');
      }
      
      // Development build sırasında dummy client oluştur
      console.warn('Supabase configuration missing in development, using placeholder');
      supabaseServerInstance = createClient(
        'https://placeholder.supabase.co',
        'placeholder-key',
        {
          auth: {
            autoRefreshToken: false,
            persistSession: false,
          },
        }
      );
      return supabaseServerInstance;
    }
  }

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Supabase configuration missing:', { 
      hasUrl: !!supabaseUrl, 
      hasServiceKey: !!supabaseServiceKey 
    });
    throw new Error('Supabase URL ve Service Key environment variables\'da tanımlı olmalıdır.');
  }

  supabaseServerInstance = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  return supabaseServerInstance;
}

// Client-side için Supabase client (anon key ile)
// Bu client RLS kurallarına tabidir
function getSupabaseClient(): SupabaseClient {
  if (supabaseClientInstance) {
    return supabaseClientInstance;
  }

  const { supabaseUrl, supabaseAnonKey } = getSupabaseConfig();

  // Runtime'da kontrol et (build sırasında değil)
  if (!supabaseUrl || !supabaseAnonKey) {
    // Build sırasında ise dummy client döndür
    if (process.env.NODE_ENV === 'production' && !process.env.NEXT_PUBLIC_SUPABASE_URL) {
      throw new Error('Supabase URL ve Anon Key environment variables\'da tanımlı olmalıdır.');
    }
    
    supabaseClientInstance = createClient(
      supabaseUrl || 'https://placeholder.supabase.co',
      supabaseAnonKey || 'placeholder-key'
    );
    return supabaseClientInstance;
  }

  supabaseClientInstance = createClient(supabaseUrl, supabaseAnonKey);

  return supabaseClientInstance;
}

// Export functions for direct use
export { getSupabaseServer, getSupabaseClient };

// Export with lazy initialization - Backward compatibility
export const supabaseServer = new Proxy({} as any, {
  get(_target, prop) {
    return (getSupabaseServer() as any)[prop];
  },
}) as SupabaseClient;

export const supabaseClient = new Proxy({} as any, {
  get(_target, prop) {
    return (getSupabaseClient() as any)[prop];
  },
}) as SupabaseClient;

// Type definitions
export type SupabaseServerClient = SupabaseClient;
export type SupabaseClientType = SupabaseClient;

