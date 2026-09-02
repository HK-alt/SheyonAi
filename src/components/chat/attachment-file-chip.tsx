import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { fileBadgeLabel, formatFileSize } from '@/lib/attachment-utils';
import { useTheme } from '@/hooks/use-theme';

type AttachmentFileChipProps = {
  name: string;
  mimeType: string;
  size?: number;
  onPress: () => void;
  compact?: boolean;
};

export function AttachmentFileChip({
  name,
  mimeType,
  size,
  onPress,
  compact = false,
}: AttachmentFileChipProps) {
  const theme = useTheme();
  const badge = fileBadgeLabel(name, mimeType);
  const displayName = name.length > 22 ? `${name.slice(0, 19)}…` : name;
  const sizeLabel = formatFileSize(size);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${badge} file ${name}`}
      onPress={onPress}
      style={({ pressed }) => [
        compact ? styles.chipCompact : styles.chip,
        {
          backgroundColor: theme.backgroundElement,
          borderColor: theme.composerBorder,
        },
        pressed && styles.pressed,
      ]}>
      <View style={[styles.badgeWell, { backgroundColor: theme.background }]}>
        <ThemedText type="smallBold" style={styles.badge}>
          {badge}
        </ThemedText>
      </View>
      <View style={styles.meta}>
        <ThemedText type="small" numberOfLines={compact ? 1 : 2} style={styles.name}>
          {displayName}
        </ThemedText>
        {sizeLabel ? (
          <ThemedText type="small" themeColor="textSecondary" style={styles.size}>
            {sizeLabel}
          </ThemedText>
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    width: 148,
    minHeight: 72,
    borderRadius: 12,
    borderWidth: 1,
    padding: Spacing.two,
    justifyContent: 'center',
    gap: Spacing.one,
  },
  chipCompact: {
    width: 128,
    minHeight: 64,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.one + 2,
    justifyContent: 'center',
    gap: 4,
  },
  badgeWell: {
    alignSelf: 'flex-start',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  badge: {
    fontSize: 10,
    letterSpacing: 0.6,
  },
  meta: {
    gap: 2,
  },
  name: {
    fontSize: 12,
    lineHeight: 16,
  },
  size: {
    fontSize: 11,
    lineHeight: 14,
  },
  pressed: {
    opacity: 0.75,
  },
});
