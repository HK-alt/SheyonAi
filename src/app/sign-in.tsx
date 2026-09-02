import { useState } from 'react';
import { ActivityIndicator, Alert, Platform, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AssistantAvatar } from '@/components/chat/assistant-avatar';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useSupabaseAuth, type OAuthProvider } from '@/hooks/use-supabase-auth';
import { useTheme } from '@/hooks/use-theme';

function showError(message: string) {
  if (Platform.OS === 'web') {
    alert(message);
    return;
  }
  Alert.alert('Sign in failed', message);
}

export default function SignInScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { isConfigured, signInWithProvider } = useSupabaseAuth();
  const [pendingProvider, setPendingProvider] = useState<OAuthProvider | null>(null);
  const isWeb = Platform.OS === 'web';

  async function handleSignIn(provider: OAuthProvider) {
    if (pendingProvider) return;
    setPendingProvider(provider);
    try {
      await signInWithProvider(provider);
    } catch (error) {
      showError(error instanceof Error ? error.message : 'Something went wrong.');
    } finally {
      setPendingProvider(null);
    }
  }

  const notices = !isConfigured ? (
    <View
      style={[
        styles.notice,
        { backgroundColor: theme.backgroundElement, borderColor: theme.composerBorder },
      ]}>
      <ThemedText type="smallBold">Supabase is not configured</ThemedText>
      <ThemedText type="small" themeColor="textSecondary">
        Copy .env.example to .env, fill in EXPO_PUBLIC_SUPABASE_URL and
        EXPO_PUBLIC_SUPABASE_ANON_KEY, then restart the dev server. See
        docs/INTEGRATION_GUIDE.md.
      </ThemedText>
    </View>
  ) : null;

  const actions = (
    <>
      <Pressable
        disabled={!isConfigured || pendingProvider !== null}
        onPress={() => handleSignIn('google')}
        style={({ pressed }) => [
          styles.button,
          { backgroundColor: theme.sendButton },
          (pressed || !isConfigured) && styles.dimmed,
        ]}>
        {pendingProvider === 'google' ? (
          <ActivityIndicator size="small" color={theme.sendButtonIcon} />
        ) : (
          <ThemedText type="smallBold" style={{ color: theme.sendButtonIcon }}>
            Continue with Google
          </ThemedText>
        )}
      </Pressable>

      <Pressable
        disabled={!isConfigured || pendingProvider !== null}
        onPress={() => handleSignIn('apple')}
        style={({ pressed }) => [
          styles.button,
          styles.secondaryButton,
          { backgroundColor: theme.backgroundElement, borderColor: theme.composerBorder },
          (pressed || !isConfigured) && styles.dimmed,
        ]}>
        {pendingProvider === 'apple' ? (
          <ActivityIndicator size="small" color={theme.text} />
        ) : (
          <ThemedText type="smallBold">Continue with Apple</ThemedText>
        )}
      </Pressable>

      <ThemedText type="small" themeColor="textSecondary" style={styles.footnote}>
        Your conversations are stored securely and only visible to you.
      </ThemedText>
    </>
  );

  if (isWeb) {
    return (
      <ThemedView style={[styles.webPage, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
        <View
          style={[
            styles.webCard,
            {
              backgroundColor: theme.composerBackground,
              borderColor: theme.composerBorder,
            },
          ]}>
          <View style={styles.webHero}>
            <AssistantAvatar size={48} />
            <ThemedText type="subtitle" style={styles.webTitle}>
              Sheyon Ai
            </ThemedText>
            <ThemedText themeColor="textSecondary" style={styles.tagline}>
              Your AI assistant
            </ThemedText>
          </View>
          <View style={styles.webActions}>
            {notices}
            {actions}
          </View>
        </View>
      </ThemedView>
    );
  }

  return (
    <ThemedView
      style={[
        styles.container,
        { paddingTop: insets.top + Spacing.six, paddingBottom: insets.bottom + Spacing.five },
      ]}>
      <View style={styles.hero}>
        <ThemedText type="subtitle" style={styles.title}>
          Sheyon Ai
        </ThemedText>
        <ThemedText themeColor="textSecondary" style={styles.tagline}>
          Your AI assistant
        </ThemedText>
      </View>

      <View style={styles.actions}>
        {notices}
        {actions}
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: Spacing.four,
    justifyContent: 'space-between',
  },
  webPage: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.four,
  },
  webCard: {
    width: '100%',
    maxWidth: 420,
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.five,
    gap: Spacing.four,
    ...Platform.select({
      web: {
        boxShadow: '0 18px 48px rgba(26, 25, 21, 0.08)',
      },
    }),
  },
  webHero: {
    alignItems: 'center',
    gap: Spacing.two,
  },
  webTitle: {
    fontSize: 28,
    lineHeight: 34,
    letterSpacing: -0.5,
  },
  hero: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.two,
  },
  title: {
    fontSize: 40,
    lineHeight: 48,
  },
  tagline: {
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
  },
  actions: {
    width: '100%',
    maxWidth: 420,
    alignSelf: 'center',
    gap: Spacing.two,
  },
  webActions: {
    width: '100%',
    gap: Spacing.two,
  },
  notice: {
    borderRadius: 12,
    borderWidth: 1,
    padding: Spacing.three,
    gap: Spacing.one,
    marginBottom: Spacing.two,
  },
  button: {
    borderRadius: 12,
    paddingVertical: Spacing.three,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 50,
    ...Platform.select({
      web: { cursor: 'pointer' },
    }),
  },
  secondaryButton: {
    borderWidth: 1,
  },
  dimmed: {
    opacity: 0.6,
  },
  footnote: {
    textAlign: 'center',
    marginTop: Spacing.two,
  },
});
