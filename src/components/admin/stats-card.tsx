import { Platform, StyleSheet, View } from 'react-native';
import { SymbolView, type SymbolViewProps } from 'expo-symbols';

import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';

export interface StatsCardProps {
  label: string;
  value: string | number;
  /** Optional sub-label e.g. "12 today" */
  sub?: string;
  /** SF Symbol / Material Symbol name (cross-platform object) */
  symbol?: SymbolViewProps['name'];
  positive?: boolean;
}

export function StatsCard({ label, value, sub, symbol, positive }: StatsCardProps) {
  const theme = useTheme();

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: theme.composerBackground,
          borderColor: theme.composerBorder,
        },
      ]}>
      {symbol ? (
        <View style={[styles.symbolWrap, { backgroundColor: theme.backgroundElement }]}>
          <SymbolView name={symbol} size={15} tintColor={theme.textSecondary} />
        </View>
      ) : null}

      <ThemedText style={styles.label} themeColor="textSecondary">
        {label}
      </ThemedText>

      <ThemedText style={styles.value}>
        {typeof value === 'number' ? value.toLocaleString() : value}
      </ThemedText>

      {sub ? (
        <ThemedText
          style={[
            styles.sub,
            {
              color:
                positive === true
                  ? '#22c55e'
                  : positive === false
                    ? theme.destructive
                    : theme.textSecondary,
            },
          ]}>
          {sub}
        </ThemedText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    minWidth: 140,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 16,
    gap: 4,
    ...Platform.select({
      web: { boxShadow: '0 1px 4px rgba(0,0,0,0.05)' },
    }),
  },
  symbolWrap: {
    width: 30,
    height: 30,
    borderRadius: 7,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  label: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  value: {
    fontSize: 26,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  sub: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 2,
  },
});
