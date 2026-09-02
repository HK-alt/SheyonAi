import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { ParsedField } from '@/subject/physics-lab/field-parser';

type FieldCardProps = {
  field: ParsedField;
  onPress: () => void;
};

export function FieldCard({ field, onPress }: FieldCardProps) {
  const theme = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: theme.backgroundElement,
          borderColor: theme.composerBorder,
        },
        pressed && styles.pressed,
      ]}>
      <View style={styles.row}>
        <View style={styles.textBlock}>
          <ThemedText type="smallBold" numberOfLines={2}>
            {field.title}
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            3D field / orbit · Tap to open
          </ThemedText>
        </View>
        <ThemedText style={[styles.expandIcon, { color: theme.actionIcon }]}>⤢</ThemedText>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    width: '100%',
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    marginTop: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  textBlock: {
    flex: 1,
    gap: Spacing.half,
  },
  expandIcon: {
    fontSize: 20,
    lineHeight: 24,
  },
  pressed: {
    opacity: 0.7,
  },
});
