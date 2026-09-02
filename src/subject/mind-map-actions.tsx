import * as Clipboard from 'expo-clipboard';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { mindMapToOutline } from '@/subject/mind-map-utils';
import type { MindElixirData } from '@/subject/mind-map-types';

type MindMapActionsProps = {
  data: MindElixirData;
};

export function MindMapActions({ data }: MindMapActionsProps) {
  const theme = useTheme();
  const [copied, setCopied] = useState(false);

  async function handleCopyOutline() {
    await Clipboard.setStringAsync(mindMapToOutline(data));
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <View style={styles.row}>
      <Pressable
        onPress={handleCopyOutline}
        hitSlop={6}
        style={({ pressed }) => [styles.action, pressed && styles.pressed]}>
        <ThemedText type="small" style={{ color: copied ? theme.text : theme.actionIcon }}>
          {copied ? 'Copied!' : 'Copy outline'}
        </ThemedText>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: Spacing.three,
    marginTop: Spacing.two,
  },
  action: {
    paddingVertical: Spacing.half,
  },
  pressed: {
    opacity: 0.6,
  },
});
