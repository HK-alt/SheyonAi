import { publicEnv } from '@/lib/public-env';

export type OAuthProvider = 'google' | 'apple';

/**
 * When true, the Google / Apple buttons sign in with pre-defined test accounts
 * (email + password) instead of real OAuth. Enabled by default in __DEV__;
 * set EXPO_PUBLIC_USE_TEST_AUTH=false to try real OAuth during development.
 */
export const isTestAuthEnabled = (() => {
  const flag = process.env.EXPO_PUBLIC_USE_TEST_AUTH;
  if (flag === 'true') return true;
  if (flag === 'false') return false;
  if (__DEV__) return true;
  return publicEnv.useTestAuthInProduction;
})();

const TEST_ACCOUNTS: Record<OAuthProvider, { email: string; name: string }> = {
  google: { email: 'test-google@sheyonai.app', name: 'Test Google User' },
  apple: { email: 'test-apple@sheyonai.app', name: 'Test Apple User' },
};

/** Shared password for dev test accounts — not a secret, only used in test mode. */
export const TEST_AUTH_PASSWORD = 'SheyonAi-Test-2026!';

export function getTestAccount(provider: OAuthProvider) {
  return TEST_ACCOUNTS[provider];
}
