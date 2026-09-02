import * as Clipboard from 'expo-clipboard';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type KeyTermsRowProps = {
  terms: string[];
};

export function KeyTermsRow({ terms }: KeyTermsRowProps) {
  const theme = useTheme();
  if (terms.length === 0) return null;

  return (
    <View style={styles.wrap}>
      <ThemedText type="small" themeColor="textSecondary" style={styles.label}>
        Key terms
      </ThemedText>
      <View style={styles.chips}>
        {terms.map((term) => (
          <Pressable
            key={term}
            onPress={() => {
              void Clipboard.setStringAsync(term);
            }}
            style={({ pressed }) => [
              styles.chip,
              {
                backgroundColor: theme.accentMuted,
                borderColor: theme.composerBorder,
                opacity: pressed ? 0.7 : 1,
              },
            ]}>
            <ThemedText style={[styles.chipText, { color: theme.accent }]}>{term}</ThemedText>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: Spacing.one,
    marginTop: Spacing.one,
  },
  label: {
    fontSize: 11,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    fontWeight: '700',
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  chip: {
    borderWidth: 1,
    borderRadius: 999,
    paddingVertical: 4,
    paddingHorizontal: 10,
  },
  chipText: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '600',
  },
});
