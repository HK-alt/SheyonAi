import { useEffect, useRef } from 'react';
import { Animated, Platform, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { useTypingPlaceholder } from '@/hooks/use-typing-placeholder';

type TypingPlaceholderOverlayProps = {
  visible: boolean;
  prefix: string;
  phrases: readonly string[];
  color: string;
  align?: 'flex-start' | 'center';
};

export function TypingPlaceholderOverlay({
  visible,
  prefix,
  phrases,
  color,
  align = 'flex-start',
}: TypingPlaceholderOverlayProps) {
  const typed = useTypingPlaceholder(phrases, !visible);
  const caret = useRef(new Animated.Value(1)).current;
  const useNativeDriver = Platform.OS !== 'web';

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(caret, { toValue: 0, duration: 400, useNativeDriver }),
        Animated.timing(caret, { toValue: 1, duration: 400, useNativeDriver }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [caret]);

  if (!visible) return null;

  return (
    <View style={[styles.overlay, { justifyContent: align, pointerEvents: 'none' }]}>
      <ThemedText themeColor="textSecondary" style={styles.prefix}>
        {prefix}
      </ThemedText>
      <ThemedText style={[styles.text, { color }]} numberOfLines={1}>
        {typed}
      </ThemedText>
      <Animated.View style={[styles.caret, { backgroundColor: color, opacity: caret }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 4,
    zIndex: 1,
  },
  prefix: {
    fontSize: 16,
    lineHeight: 22,
    marginRight: 6,
  },
  text: {
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '600',
    flexShrink: 1,
  },
  caret: {
    width: 1.5,
    height: 18,
    marginLeft: 2,
    borderRadius: 1,
  },
});
