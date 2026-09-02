import * as Clipboard from 'expo-clipboard';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type MessageActionsProps = {
  content: string;
  canRegenerate: boolean;
  onRegenerate: () => void;
  keyTerms?: string[];
};

export function MessageActions({
  content,
  canRegenerate,
  onRegenerate,
  keyTerms = [],
}: MessageActionsProps) {
  const theme = useTheme();
  const [copied, setCopied] = useState<'all' | 'keys' | null>(null);

  async function handleCopy() {
    await Clipboard.setStringAsync(content);
    setCopied('all');
    setTimeout(() => setCopied(null), 1500);
  }

  async function handleCopyKeys() {
    await Clipboard.setStringAsync(keyTerms.map((term) => `• ${term}`).join('\n'));
    setCopied('keys');
    setTimeout(() => setCopied(null), 1500);
  }

  return (
    <View style={styles.row}>
      <Pressable
        onPress={handleCopy}
        hitSlop={6}
        style={({ pressed }) => [styles.action, pressed && styles.pressed]}>
        <ThemedText type="small" style={{ color: copied === 'all' ? theme.text : theme.actionIcon }}>
          {copied === 'all' ? 'Copied' : 'Copy'}
        </ThemedText>
      </Pressable>
      {keyTerms.length > 0 && (
        <Pressable
          onPress={handleCopyKeys}
          hitSlop={6}
          style={({ pressed }) => [styles.action, pressed && styles.pressed]}>
          <ThemedText type="small" style={{ color: copied === 'keys' ? theme.text : theme.actionIcon }}>
            {copied === 'keys' ? 'Copied keys' : 'Copy keys'}
          </ThemedText>
        </Pressable>
      )}
      {canRegenerate && (
        <Pressable
          onPress={onRegenerate}
          hitSlop={6}
          style={({ pressed }) => [styles.action, pressed && styles.pressed]}>
          <ThemedText type="small" style={{ color: theme.actionIcon }}>
            Regenerate
          </ThemedText>
        </Pressable>
      )}
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
