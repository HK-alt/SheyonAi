import { StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Fonts } from '@/constants/theme';

type MathKeyGlyphProps = {
  label: string;
  preview?: string;
  color: string;
};

/** Native keys stay on unicode labels — one WebView per key would stall the keyboard. */
export function MathKeyGlyph({ label, preview, color }: MathKeyGlyphProps) {
  const text = preview && !/[\\{}_^]/.test(preview) ? preview : label;
  return (
    <ThemedText style={[styles.label, { color }]} numberOfLines={1}>
      {text}
    </ThemedText>
  );
}

const styles = StyleSheet.create({
  label: {
    fontSize: 17,
    lineHeight: 22,
    fontWeight: '600',
    textAlign: 'center',
    fontFamily: Fonts.serif,
  },
});
