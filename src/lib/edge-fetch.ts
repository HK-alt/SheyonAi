import { supabaseAnonKey } from '@/lib/supabase';

/** Headers required by the Supabase gateway for Edge Function calls with a user JWT. */
export function edgeFunctionHeaders(accessToken: string): Record<string, string> {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${accessToken}`,
    'Content-Type': 'application/json',
  };
  if (supabaseAnonKey.length > 0) {
    headers.apikey = supabaseAnonKey;
  }
  return headers;
}
