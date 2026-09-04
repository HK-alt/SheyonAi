import { Platform, Pressable, StyleSheet, View } from 'react-native';
import { usePathname, router } from 'expo-router';
import { SymbolView, type SymbolViewProps } from 'expo-symbols';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type SymbolName = SymbolViewProps['name'];

interface NavItem {
  label: string;
  symbol: SymbolName;
  path: string;
}

const NAV_ITEMS: NavItem[] = [
  {
    label: 'Overview',
    symbol: { ios: 'square.grid.2x2.fill', android: 'grid_view', web: 'grid_view' },
    path: '/admin',
  },
  {
    label: 'Users',
    symbol: { ios: 'person.2.fill', android: 'group', web: 'group' },
    path: '/admin/users',
  },
  {
    label: 'Conversations',
    symbol: { ios: 'bubble.left.and.bubble.right.fill', android: 'forum', web: 'forum' },
    path: '/admin/conversations',
  },
  {
    label: 'Analytics',
    symbol: { ios: 'chart.bar.fill', android: 'bar_chart', web: 'bar_chart' },
    path: '/admin/analytics',
  },
  {
    label: 'Usage',
    symbol: { ios: 'bolt.fill', android: 'electric_bolt', web: 'electric_bolt' },
    path: '/admin/usage',
  },
  {
    label: 'Content',
    symbol: { ios: 'doc.fill', android: 'description', web: 'description' },
    path: '/admin/content',
  },
  {
    label: 'Settings',
    symbol: { ios: 'gearshape.fill', android: 'settings', web: 'settings' },
    path: '/admin/settings',
  },
];

interface AdminSidebarProps {
  onNavigate?: () => void;
}

export function AdminSidebar({ onNavigate }: AdminSidebarProps) {
  const theme = useTheme();
  const pathname = usePathname();

  function navigate(path: string) {
    router.push(path as any);
    onNavigate?.();
  }

  return (
    <View
      style={[
        styles.sidebar,
        { backgroundColor: theme.drawerBackground, borderRightColor: theme.headerBorder },
      ]}>
      {/* Brand */}
      <View style={[styles.brand, { borderBottomColor: theme.headerBorder }]}>
        <View style={[styles.monogram, { backgroundColor: theme.accent }]}>
          <ThemedText style={styles.monogramText}>S</ThemedText>
        </View>
        <View style={styles.brandText}>
          <ThemedText style={styles.brandName}>Sheyon Ai</ThemedText>
          <ThemedText style={styles.brandSub} themeColor="textSecondary">
            Admin Console
          </ThemedText>
        </View>
      </View>

      {/* Navigation */}
      <View style={styles.nav}>
        <ThemedText style={styles.sectionLabel} themeColor="textSecondary">
          NAVIGATION
        </ThemedText>
        {NAV_ITEMS.map((item) => {
          const isActive =
            pathname === item.path ||
            (item.path !== '/admin' && pathname.startsWith(item.path));
          return (
            <Pressable
              key={item.path}
              onPress={() => navigate(item.path)}
              style={({ pressed }) => [
                styles.navItem,
                isActive && { backgroundColor: theme.drawerItemActive },
                pressed && !isActive && { opacity: 0.7 },
              ]}>
              {isActive && (
                <View style={[styles.activeIndicator, { backgroundColor: theme.accent }]} />
              )}
              <SymbolView
                name={item.symbol}
                size={16}
                tintColor={isActive ? theme.accent : theme.textSecondary}
              />
              <ThemedText
                style={[
                  styles.navLabel,
                  { color: isActive ? theme.accent : theme.textSecondary },
                  isActive && styles.navLabelActive,
                ]}>
                {item.label}
              </ThemedText>
            </Pressable>
          );
        })}
      </View>

      {/* Footer */}
      <View style={[styles.footer, { borderTopColor: theme.headerBorder }]}>
        <Pressable
          onPress={() => {
            router.replace('/');
            onNavigate?.();
          }}
          style={({ pressed }) => [styles.navItem, pressed && { opacity: 0.7 }]}>
          <SymbolView
            name={{ ios: 'arrow.left', android: 'arrow_back', web: 'arrow_back' }}
            size={15}
            tintColor={theme.textSecondary}
          />
          <ThemedText style={[styles.navLabel, { color: theme.textSecondary }]}>
            Back to App
          </ThemedText>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  sidebar: {
    width: 232,
    height: '100%',
    borderRightWidth: StyleSheet.hairlineWidth,
    flexDirection: 'column',
  },
  brand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  monogram: {
    width: 30,
    height: 30,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  monogramText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: -0.5,
  },
  brandText: {
    gap: 1,
  },
  brandName: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  brandSub: {
    fontSize: 11,
    letterSpacing: 0.1,
  },
  nav: {
    flex: 1,
    paddingHorizontal: 10,
    paddingTop: 16,
    gap: 2,
  },
  sectionLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.8,
    paddingHorizontal: 8,
    paddingBottom: 6,
  },
  navItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    paddingHorizontal: 10,
    paddingVertical: 9,
    borderRadius: 8,
    position: 'relative',
    ...Platform.select({ web: { cursor: 'pointer' } }),
  },
  activeIndicator: {
    position: 'absolute',
    left: 0,
    top: 8,
    bottom: 8,
    width: 3,
    borderRadius: 2,
  },
  navLabel: {
    fontSize: 13,
    fontWeight: '500',
  },
  navLabelActive: {
    fontWeight: '600',
  },
  footer: {
    paddingHorizontal: 10,
    paddingVertical: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
});
