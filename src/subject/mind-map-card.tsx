import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { MindElixirData } from '@/subject/mind-map-types';

type MindMapCardProps = {
  data: MindElixirData;
  onPress: () => void;
};

/** Compact chat placeholder; full map opens in the modal by default. */
export function MindMapCard({ data, onPress }: MindMapCardProps) {
  const theme = useTheme();
  const childCount = countNodes(data.nodeData) - 1;

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
            {data.nodeData.topic}
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {childCount > 0 ? `${childCount} topics · Tap to open` : 'Tap to open mind map'}
          </ThemedText>
        </View>
        <ThemedText style={[styles.expandIcon, { color: theme.actionIcon }]}>⤢</ThemedText>
      </View>
    </Pressable>
  );
}

function countNodes(node: MindElixirData['nodeData']): number {
  let count = 1;
  for (const child of node.children ?? []) {
    count += countNodes(child);
  }
  return count;
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
