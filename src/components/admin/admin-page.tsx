import { Platform, StyleSheet, View, type ReactNode } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';

interface AdminPageProps {
  title: string;
  subtitle?: string;
  /** Optional right-aligned action elements */
  actions?: ReactNode;
  children: ReactNode;
}

/**
 * Reusable admin page chrome — consistent title row across all four screens.
 */
export function AdminPage({ title, subtitle, actions, children }: AdminPageProps) {
  const theme = useTheme();

  return (
    <View style={[styles.root, { backgroundColor: theme.background }]}>
      {/* Page title row */}
      <View style={[styles.titleRow, { borderBottomColor: theme.headerBorder }]}>
        <View style={styles.titleText}>
          <ThemedText style={styles.title}>{title}</ThemedText>
          {subtitle ? (
            <ThemedText style={styles.subtitle} themeColor="textSecondary">
              {subtitle}
            </ThemedText>
          ) : null}
        </View>
        {actions ? <View style={styles.actions}>{actions}</View> : null}
      </View>

      {/* Content */}
      <View style={styles.content}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    maxWidth: 1100,
    width: '100%',
    alignSelf: 'center',
    ...Platform.select({
      default: {},
      web: { paddingHorizontal: 24 },
    }),
  },
  titleText: {
    gap: 2,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: -0.4,
  },
  subtitle: {
    fontSize: 12,
    fontWeight: '500',
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  content: {
    flex: 1,
  },
});
