import { useAuthContext } from '@/context/auth-context';

export type { OAuthProvider } from '@/lib/auth-config';
export { isTestAuthEnabled } from '@/lib/auth-config';

/**
 * Access the current Supabase session, user, and auth actions.
 *
 * const { user, signInWithProvider, signOut } = useSupabaseAuth();
 */
export function useSupabaseAuth() {
  return useAuthContext();
}
