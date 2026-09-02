import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type RagChipProps = {
  active: boolean;
  onToggle: () => void;
  onOpenDocuments?: () => void;
  disabled?: boolean;
  floating?: boolean;
  /** When set, shows a badge indicating how many docs are scoped for retrieval. */
  scopedDocCount?: number | null;
};

export function RagChip({
  active,
  onToggle,
  onOpenDocuments,
  disabled,
  floating,
  scopedDocCount,
}: RagChipProps) {
  const theme = useTheme();
  const showBadge = active && scopedDocCount != null && scopedDocCount > 0;

  return (
    <Pressable
      disabled={disabled}
      accessibilityRole="button"
      accessibilityState={{ selected: active, disabled: !!disabled }}
      accessibilityLabel="Documents mode"
      onPress={onToggle}
      onLongPress={onOpenDocuments}
      style={({ pressed }) => [
        styles.chip,
        {
          marginHorizontal: floating ? Spacing.two : 0,
          backgroundColor: active ? theme.sendButton : theme.suggestionChip,
          borderColor: active ? theme.sendButton : theme.composerBorder,
        },
        pressed && styles.pressed,
        disabled && styles.disabled,
      ]}>
      <ThemedText style={[styles.chipText, { color: active ? theme.sendButtonIcon : theme.text }]}>
        Documents
      </ThemedText>
      {showBadge && (
        <View style={[styles.badge, { backgroundColor: theme.sendButtonIcon }]}>
          <ThemedText style={[styles.badgeText, { color: theme.sendButton }]}>
            {scopedDocCount}
          </ThemedText>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    borderRadius: 16,
    borderWidth: 1,
    paddingVertical: Spacing.one + Spacing.half,
    paddingHorizontal: Spacing.three,
    gap: 5,
  },
  chipText: {
    fontSize: 13,
    fontWeight: '600',
  },
  badge: {
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
    lineHeight: 14,
  },
  pressed: {
    opacity: 0.7,
  },
  disabled: {
    opacity: 0.45,
  },
});
