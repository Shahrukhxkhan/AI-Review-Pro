import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Get keys from environment variables safely
const supabaseUrl = (import.meta as any).env?.VITE_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = (import.meta as any).env?.VITE_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

let supabaseInstance: SupabaseClient | null = null;

/**
 * Checks if Supabase has been properly configured with non-placeholder credentials.
 */
export function isSupabaseConfigured(): boolean {
  const isUrlValid = supabaseUrl && !supabaseUrl.includes('your-project-id') && !supabaseUrl.includes('placeholder');
  const isKeyValid = supabaseAnonKey && !supabaseAnonKey.includes('your-anon-role') && !supabaseAnonKey.includes('placeholder');
  return !!(isUrlValid && isKeyValid);
}

/**
 * Lazily initializes and retrieves the Supabase client safely.
 * Returns null if the Supabase credentials are missing or placeholders.
 */
export function getSupabase(): SupabaseClient | null {
  if (!isSupabaseConfigured()) {
    return null;
  }

  if (!supabaseInstance) {
    try {
      supabaseInstance = createClient(supabaseUrl, supabaseAnonKey, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
        }
      });
      console.log('Supabase client initialized successfully.');
    } catch (error) {
      console.error('Failed to initialize Supabase client:', error);
      supabaseInstance = null;
    }
  }

  return supabaseInstance;
}

/**
 * Gets the current configured key values for UI display/settings.
 */
export function getEnvKeys() {
  return {
    supabaseUrl: supabaseUrl || '',
    supabaseAnonKey: supabaseAnonKey || '',
    anthropicApiKey: process.env.ANTHROPIC_API_KEY || ''
  };
}
