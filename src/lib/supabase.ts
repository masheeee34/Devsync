import { createClient, SupabaseClient } from '@supabase/supabase-js';

let supabaseClient: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient | null {
  if (typeof window === 'undefined') return null;
  
  const url = localStorage.getItem('devsync-supabase-url');
  const key = localStorage.getItem('devsync-supabase-key');
  
  if (!url || !key) {
    return null;
  }

  // Re-create or reuse the client
  if (!supabaseClient) {
    supabaseClient = createClient(url, key, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true
      }
    });
  }
  
  return supabaseClient;
}

export function resetSupabaseClient() {
  supabaseClient = null;
}
