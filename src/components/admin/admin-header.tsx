import { Platform, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SymbolView } from 'expo-symbols';

import { ThemedText } from '@/components/themed-text';
import { useAuthContext } from '@/context/auth-context';
import { useTheme } from '@/hooks/use-theme';

interface AdminHeaderProps {
  title?: string;
  onMenuPress?: () => void;
  showMenu?: boolean;
}

export function AdminHeader({ title = 'Admin', onMenuPress, showMenu }: AdminHeaderProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { user, signOut } = useAuthContext();

  const email = user?.email ?? '';
  const displayName =
    user?.user_metadata?.full_name ??
    user?.user_metadata?.name ??
    email;

  const initials = displayName.slice(0, 2).toUpperCase();
  const truncatedEmail = email.length > 28 ? email.slice(0, 26) + '…' : email;

  return (
    <View
      style={[
        styles.header,
        {
          backgroundColor: theme.composerBackground,
          borderBottomColor: theme.headerBorder,
          paddingTop: insets.top + 2,
        },
      ]}>
      <View style={styles.left}>
        {showMenu && onMenuPress && (
          <Pressable onPress={onMenuPress} hitSlop={12} style={styles.menuBtn}>
            <SymbolView
              name={{ ios: 'line.3.horizontal', android: 'menu', web: 'menu' }}
              size={18}
              tintColor={theme.text}
            />
          </Pressable>
        )}
        <ThemedText style={styles.title}>{title}</ThemedText>
      </View>

      <View style={styles.right}>
        {/* Identity */}
        <View style={styles.identity}>
          {email ? (
            <ThemedText style={styles.email} themeColor="textSecondary" numberOfLines={1}>
              {truncatedEmail}
            </ThemedText>
          ) : null}
          <View style={[styles.roleChip, { backgroundColor: theme.accentMuted, borderColor: theme.accent + '44' }]}>
            <ThemedText style={[styles.roleChipText, { color: theme.accent }]}>Admin</ThemedText>
          </View>
        </View>

        {/* Avatar */}
        <View style={[styles.avatar, { backgroundColor: theme.accent }]}>
          <ThemedText style={styles.initials}>{initials}</ThemedText>
        </View>

        {/* Sign out */}
        <Pressable
          onPress={signOut}
          style={({ pressed }) => [styles.signOutBtn, pressed && { opacity: 0.6 }]}>
          <ThemedText style={[styles.signOutText, { color: theme.textSecondary }]}>
            Sign out
          </ThemedText>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    minHeight: 52,
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  menuBtn: {
    ...Platform.select({ web: { cursor: 'pointer' } }),
  },
  title: {
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  right: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  identity: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  email: {
    fontSize: 12,
    ...Platform.select({ default: { display: 'none' }, web: { display: 'flex' } }),
  },
  roleChip: {
    borderRadius: 5,
    borderWidth: 1,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  roleChipText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  avatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  initials: {
    fontSize: 11,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: 0.3,
  },
  signOutBtn: {
    paddingVertical: 4,
    paddingHorizontal: 2,
    ...Platform.select({ web: { cursor: 'pointer' } }),
  },
  signOutText: {
    fontSize: 12,
    fontWeight: '500',
  },
});
