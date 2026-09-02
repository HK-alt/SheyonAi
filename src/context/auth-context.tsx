import type { Session, User } from '@supabase/supabase-js';
import { router } from 'expo-router';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { Platform } from 'react-native';

import {
  getTestAccount,
  isTestAuthEnabled,
  TEST_AUTH_PASSWORD,
  type OAuthProvider,
} from '@/lib/auth-config';
import { clearChatCacheForUser } from '@/lib/chat-cache';
import { hasRealSupabaseSession } from '@/lib/dev-session';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';

// Required so the auth popup closes correctly on web.
WebBrowser.maybeCompleteAuthSession();

export type { OAuthProvider } from '@/lib/auth-config';

type AuthContextValue = {
  session: Session | null;
  user: User | null;
  /** True until the persisted session has been restored from storage. */
  isLoading: boolean;
  isConfigured: boolean;
  /** Google / Apple buttons use test accounts instead of real OAuth. */
  isTestAuthMode: boolean;
  /** Session is local-only (Supabase auth blocked); chat runs in offline mock mode. */
  isDevBypassSession: boolean;
  signInWithProvider: (provider: OAuthProvider) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

/** When true, ignore stale real sessions resurrected from storage after dev-bypass sign-in. */
let devBypassActive = false;

function authErrorCode(error: { message?: string; code?: string } | null) {
  return error?.code ?? error?.message?.toLowerCase() ?? '';
}

function isEmailRateLimited(error: { message?: string; code?: string } | null) {
  const code = authErrorCode(error);
  return (
    code.includes('over_email_send_rate_limit') ||
    code.includes('email rate limit') ||
    code.includes('rate limit')
  );
}

/** Exchanges the `?code=` param of an OAuth redirect URL for a session (PKCE). */
async function createSessionFromUrl(url: string) {
  const { queryParams } = Linking.parse(url);
  const code = queryParams?.code;
  const errorDescription = queryParams?.error_description;
  if (typeof errorDescription === 'string') {
    throw new Error(errorDescription);
  }
  if (typeof code !== 'string') return;
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) throw error;
}

async function signInWithTestProvider(provider: OAuthProvider): Promise<Session> {
  const { email, name } = getTestAccount(provider);

  const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
    email,
    password: TEST_AUTH_PASSWORD,
  });
  if (signInData.session) {
    devBypassActive = false;
    return signInData.session;
  }

  const signInCode = authErrorCode(signInError);
  if (signInCode.includes('email_not_confirmed')) {
    throw new Error(
      'Test account email is not confirmed. In Supabase SQL Editor run supabase/migrations/0002_confirm_test_users.sql, then try again. Local bypass is disabled so Documents/RAG can use a real session.',
    );
  }

  // User may already exist; only sign up when credentials are unknown.
  const shouldAttemptSignUp =
    signInCode.includes('invalid') ||
    signInCode.includes('invalid_credentials') ||
    signInCode.includes('user_not_found') ||
    !signInError;

  if (!shouldAttemptSignUp) {
    if (isEmailRateLimited(signInError)) {
      throw new Error(
        'Supabase email rate limit hit. Wait a few minutes, then sign in again. Avoid repeated Test sign-in taps — each failed signup burns the limit.',
      );
    }
    throw new Error(signInError?.message ?? 'Test sign-in failed.');
  }

  const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
    email,
    password: TEST_AUTH_PASSWORD,
    options: {
      data: {
        provider,
        full_name: name,
      },
      // Dev test accounts: skip confirmation email so we do not burn the email rate limit.
      emailRedirectTo: undefined,
    },
  });
  if (signUpData.session) {
    devBypassActive = false;
    return signUpData.session;
  }

  // signUp can create the user without a session when confirmations are required.
  // Retry password sign-in once before giving up.
  const { data: retryData, error: retryError } = await supabase.auth.signInWithPassword({
    email,
    password: TEST_AUTH_PASSWORD,
  });
  if (retryData.session) {
    devBypassActive = false;
    return retryData.session;
  }

  const signUpCode = authErrorCode(signUpError);
  if (
    signUpCode.includes('email_signups_disabled') ||
    signUpCode.includes('signup_disabled')
  ) {
    throw new Error('Enable Email signups in Supabase (Authentication → Providers → Email).');
  }

  if (isEmailRateLimited(signUpError) || isEmailRateLimited(retryError) || isEmailRateLimited(signInError)) {
    throw new Error(
      'Supabase email rate limit exceeded. Wait ~15–60 minutes (or raise Auth rate limits in the dashboard), run supabase/migrations/0002_confirm_test_users.sql, then tap Test sign-in once.',
    );
  }

  if (authErrorCode(retryError).includes('email_not_confirmed')) {
    throw new Error(
      'Test account was created but email is not confirmed. Run supabase/migrations/0002_confirm_test_users.sql in the Supabase SQL Editor, then sign in again.',
    );
  }

  throw new Error(
    signUpError?.message ??
      retryError?.message ??
      signInError?.message ??
      'Test sign-in failed. Confirm the test user in Supabase, then try again.',
  );
}

async function signInWithOAuthProvider(provider: OAuthProvider) {
  if (Platform.OS === 'web') {
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: window.location.origin },
    });
    if (error) throw error;
    return;
  }

  const redirectTo = Linking.createURL('auth/callback');
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: { redirectTo, skipBrowserRedirect: true },
  });
  if (error) throw error;

  const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
  if (result.type === 'success' && result.url) {
    await createSessionFromUrl(result.url);
  } else if (result.type === 'cancel') {
    throw new Error('Sign in was cancelled.');
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(isSupabaseConfigured);
  const previousUserIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!isSupabaseConfigured) return;

    supabase.auth.getSession().then(({ data }) => {
      if (devBypassActive) {
        setIsLoading(false);
        return;
      }
      if (hasRealSupabaseSession(data.session)) {
        setSession(data.session);
        previousUserIdRef.current = data.session.user.id;
      }
      setIsLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, nextSession) => {
      if (event === 'SIGNED_OUT') {
        void clearChatCacheForUser(previousUserIdRef.current);
        previousUserIdRef.current = null;
        if (!devBypassActive) {
          setSession(null);
        }
        return;
      }
      if (devBypassActive) return;
      if (hasRealSupabaseSession(nextSession)) {
        setSession(nextSession);
        previousUserIdRef.current = nextSession.user.id;
      }
    });

    const handleUrl = (event: { url: string }) => {
      if (!isTestAuthEnabled && event.url.includes('auth/callback')) {
        void createSessionFromUrl(event.url);
      }
    };
    const linkSub = Linking.addEventListener('url', handleUrl);
    Linking.getInitialURL().then((url) => {
      if (url && !isTestAuthEnabled && url.includes('auth/callback')) {
        void createSessionFromUrl(url);
      }
    });

    return () => {
      subscription.unsubscribe();
      linkSub.remove();
    };
  }, []);

  const signInWithProvider = useCallback(async (provider: OAuthProvider) => {
    if (!isSupabaseConfigured) {
      throw new Error('Supabase is not configured. Fill in your .env file first.');
    }

    const priorUserId = previousUserIdRef.current ?? session?.user?.id ?? null;

    if (isTestAuthEnabled) {
      const newSession = await signInWithTestProvider(provider);
      await clearChatCacheForUser(priorUserId);
      if (hasRealSupabaseSession(newSession)) {
        previousUserIdRef.current = newSession.user.id;
      } else {
        previousUserIdRef.current = newSession.user.id;
      }
      setSession(newSession);
      router.replace('/');
      return;
    }

    devBypassActive = false;
    await signInWithOAuthProvider(provider);
  }, [session]);

  const signOut = useCallback(async () => {
    const priorUserId = session?.user?.id ?? null;
    devBypassActive = false;
    if (hasRealSupabaseSession(session)) {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    }
    await clearChatCacheForUser(priorUserId);
    previousUserIdRef.current = null;
    setSession(null);
    router.replace('/sign-in');
  }, [session]);

  const isDevBypassSession = session?.user?.app_metadata?.dev_bypass === true;

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      user: session?.user ?? null,
      isLoading,
      isConfigured: isSupabaseConfigured,
      isTestAuthMode: isTestAuthEnabled,
      isDevBypassSession,
      signInWithProvider,
      signOut,
    }),
    [session, isLoading, isDevBypassSession, signInWithProvider, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuthContext() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuthContext must be used within an AuthProvider');
  }
  return context;
}
