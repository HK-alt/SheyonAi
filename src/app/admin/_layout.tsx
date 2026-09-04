import { useState } from 'react';
import { Modal, Platform, Pressable, StyleSheet, View } from 'react-native';
import { Stack, usePathname } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AdminHeader } from '@/components/admin/admin-header';
import { AdminSidebar } from '@/components/admin/admin-sidebar';
import { useTheme } from '@/hooks/use-theme';

const SCREEN_TITLES: Record<string, string> = {
  '/admin': 'Overview',
  '/admin/users': 'Users',
  '/admin/conversations': 'Conversations',
  '/admin/analytics': 'Analytics',
  '/admin/usage': 'Usage',
  '/admin/content': 'Content',
  '/admin/settings': 'Settings',
};

export default function AdminLayout() {
  const theme = useTheme();
  const pathname = usePathname();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const isWeb = Platform.OS === 'web';
  const title = SCREEN_TITLES[pathname] ?? 'Admin';

  return (
    <SafeAreaProvider>
      <GestureHandlerRootView style={styles.root}>
        <View style={[styles.shell, { backgroundColor: theme.background }]}>
          {/* Persistent sidebar on web */}
          {isWeb && <AdminSidebar />}

          <View style={styles.main}>
            <AdminHeader
              title={title}
              showMenu={!isWeb}
              onMenuPress={() => setDrawerOpen(true)}
            />

            {/* Screen content */}
            <Stack screenOptions={{ headerShown: false }} />
          </View>

          {/* Mobile drawer overlay */}
          {!isWeb && (
            <Modal
              visible={drawerOpen}
              transparent
              animationType="slide"
              onRequestClose={() => setDrawerOpen(false)}>
              <View style={styles.drawerOverlay}>
                <Pressable
                  style={styles.drawerBackdrop}
                  onPress={() => setDrawerOpen(false)}
                />
                <AdminSidebar onNavigate={() => setDrawerOpen(false)} />
              </View>
            </Modal>
          )}
        </View>
      </GestureHandlerRootView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  shell: {
    flex: 1,
    flexDirection: 'row',
  },
  main: {
    flex: 1,
    flexDirection: 'column',
  },
  drawerOverlay: {
    flex: 1,
    flexDirection: 'row',
  },
  drawerBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
});
