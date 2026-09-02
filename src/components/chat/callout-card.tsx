import { type ReactNode } from 'react';
import { Platform, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { calloutLabel, type CalloutKind } from '@/lib/markdown-enrich';

const CALLOUT_ACCENT: Record<CalloutKind, string> = {
  tip: '#0D9488',
  note: '#2563EB',
  warning: '#D97706',
  remember: '#7C3AED',
  example: '#2563EB',
  key: '#2563EB',
};

function tint(hex: string, alpha: number): string {
  const raw = hex.replace('#', '');
  const n = Number.parseInt(raw.length === 3 ? raw.split('').map((c) => c + c).join('') : raw, 16);
  if (Number.isNaN(n)) return hex;
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${alpha})`;
}

type CalloutCardProps = {
  kind: CalloutKind;
  children: ReactNode;
};

export function CalloutCard({ kind, children }: CalloutCardProps) {
  const theme = useTheme();
  const accent = kind === 'note' || kind === 'example' || kind === 'key' ? theme.accent : CALLOUT_ACCENT[kind];

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: tint(accent, 0.08),
          borderColor: tint(accent, 0.28),
        },
      ]}>
      <View style={[styles.rail, { backgroundColor: accent }]} />
      <View style={styles.body}>
        <ThemedText style={[styles.kicker, { color: accent }]}>{calloutLabel(kind)}</ThemedText>
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    overflow: 'hidden',
    borderWidth: 1,
    borderRadius: 14,
    marginVertical: Spacing.two,
    ...Platform.select({
      web: { boxShadow: '0 1px 3px rgba(0,0,0,0.06)' },
    }),
  },
  rail: {
    width: 4,
  },
  body: {
    flex: 1,
    minWidth: 0,
    paddingVertical: 10,
    paddingHorizontal: 12,
    gap: 4,
  },
  kicker: {
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: 1.2,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
});
