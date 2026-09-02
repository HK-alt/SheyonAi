import type { Session, User } from '@supabase/supabase-js';

import { getTestAccount, type OAuthProvider } from '@/lib/auth-config';

/** Local-only session used when Supabase test auth is blocked (e.g. email not confirmed). */
export function createDevTestSession(provider: OAuthProvider): Session {
  const { email, name } = getTestAccount(provider);
  const now = Math.floor(Date.now() / 1000);

  const user = {
    id: `dev-test-${provider}`,
    aud: 'authenticated',
    role: 'authenticated',
    email,
    email_confirmed_at: new Date().toISOString(),
    phone: '',
    confirmed_at: new Date().toISOString(),
    last_sign_in_at: new Date().toISOString(),
    app_metadata: { provider, dev_bypass: true },
    user_metadata: { full_name: name, provider },
    identities: [],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  } as User;

  return {
    access_token: 'dev-bypass-token',
    refresh_token: 'dev-bypass-token',
    expires_in: 86_400,
    expires_at: now + 86_400,
    token_type: 'bearer',
    user,
  };
}

export function isDevBypassUser(user: User | null | undefined): boolean {
  return user?.app_metadata?.dev_bypass === true;
}

export function hasRealSupabaseSession(session: Session | null): boolean {
  return !!session && !isDevBypassUser(session.user) && session.access_token !== 'dev-bypass-token';
}
