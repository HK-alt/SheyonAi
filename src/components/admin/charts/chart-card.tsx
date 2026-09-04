/**
 * Card chrome for admin charts.
 * Provides a titled container with optional right-side actions slot.
 */
import { Platform, StyleSheet, View, type ReactNode } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';

interface ChartCardProps {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  children: ReactNode;
  noPadding?: boolean;
}

export function ChartCard({ title, subtitle, actions, children, noPadding }: ChartCardProps) {
  const theme = useTheme();
  return (
    <View
      style={[
        cardStyles.card,
        {
          backgroundColor: theme.composerBackground,
          borderColor: theme.headerBorder,
        },
      ]}>
      <View style={cardStyles.header}>
        <View style={cardStyles.titleGroup}>
          <ThemedText style={cardStyles.title}>{title.toUpperCase()}</ThemedText>
          {subtitle ? (
            <ThemedText style={cardStyles.subtitle} themeColor="textSecondary">
              {subtitle}
            </ThemedText>
          ) : null}
        </View>
        {actions ? <View style={cardStyles.actions}>{actions}</View> : null}
      </View>
      <View style={noPadding ? undefined : cardStyles.body}>{children}</View>
    </View>
  );
}

const cardStyles = StyleSheet.create({
  card: {
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
    ...Platform.select({ web: { boxShadow: '0 1px 4px rgba(0,0,0,0.05)' } }),
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 10,
  },
  titleGroup: { gap: 2 },
  title: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.8,
    color: '#888',
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
  body: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
});
