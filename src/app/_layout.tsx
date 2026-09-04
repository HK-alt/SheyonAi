import { DarkTheme, DefaultTheme, ThemeProvider, Stack } from 'expo-router';
import { StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import { AuthProvider, useAuthContext } from '@/context/auth-context';
import { ChatProvider } from '@/context/chat-context';
import { AppSettingsProvider } from '@/context/app-settings-context';
import {
  ThemePreferenceProvider,
  useThemePreference,
} from '@/context/theme-preference-context';

function RootNavigator() {
  const { resolvedScheme } = useThemePreference();
  const { session, isLoading, userRole } = useAuthContext();

  const isAdmin = !!session && userRole === 'admin';

  return (
    <ThemeProvider value={resolvedScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <AnimatedSplashOverlay />
      {/* Keep the splash overlay up until the persisted session is restored,
          so signed-in users never flash the sign-in screen. */}
      {!isLoading && (
        <Stack screenOptions={{ headerShown: false }}>
          {/* Admin routes — only accessible to admin role */}
          <Stack.Protected guard={isAdmin}>
            <Stack.Screen name="admin" />
          </Stack.Protected>
          {/* Regular user routes */}
          <Stack.Protected guard={!!session}>
            <Stack.Screen name="index" />
            <Stack.Screen name="subject/[id]" />
            <Stack.Screen name="settings" />
            <Stack.Screen name="explore" />
          </Stack.Protected>
          <Stack.Protected guard={!session}>
            <Stack.Screen name="sign-in" />
          </Stack.Protected>
        </Stack>
      )}
    </ThemeProvider>
  );
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={styles.flex}>
      <ThemePreferenceProvider>
        <AppSettingsProvider>
          <AuthProvider>
            <ChatProvider>
              <RootNavigator />
            </ChatProvider>
          </AuthProvider>
        </AppSettingsProvider>
      </ThemePreferenceProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
});
