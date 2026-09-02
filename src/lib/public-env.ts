/**
 * Production defaults for public client config.
 * EXPO_PUBLIC_* env vars override these when present (local dev / CI).
 * Anon key is safe to commit — RLS protects data; it is always in the web bundle.
 */
export const publicEnv = {
  supabaseUrl: 'https://lfsacmdqjxtwgxqftrlh.supabase.co',
  supabaseAnonKey:
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imxmc2FjbWRxanh0d2d4cWZ0cmxoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEyNjM3NTgsImV4cCI6MjA5NjgzOTc1OH0.IfYQ4AjJNGvTNjQRI6CYsng4FomFY0T4cIUnTPkpYFo',
  /** Test email/password sign-in until Google/Apple OAuth is configured. */
  useTestAuthInProduction: true,
} as const;
