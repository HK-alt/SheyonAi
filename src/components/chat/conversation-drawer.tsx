import { useEffect, useState } from 'react';
import {
  Platform,
  Pressable,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  Easing,
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  ConversationSidebar,
  SIDEBAR_WIDTH,
} from '@/components/chat/conversation-sidebar';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

const ANIMATION_MS = 280;
const OPEN_EASING = Easing.out(Easing.cubic);
const CLOSE_EASING = Easing.in(Easing.cubic);

type ConversationDrawerProps = {
  visible: boolean;
  onClose: () => void;
};

export function ConversationDrawer({ visible, onClose }: ConversationDrawerProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const drawerWidth = Math.min(width * 0.88, SIDEBAR_WIDTH + 16);

  const [mounted, setMounted] = useState(visible);
  const progress = useSharedValue(0);

  if (visible && !mounted) {
    setMounted(true);
  }

  useEffect(() => {
    if (visible) {
      progress.value = withTiming(1, { duration: ANIMATION_MS, easing: OPEN_EASING });
    } else {
      progress.value = withTiming(0, { duration: ANIMATION_MS - 40, easing: CLOSE_EASING }, (finished) => {
        if (finished) runOnJS(setMounted)(false);
      });
    }
  }, [visible, progress]);

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 1], [0, 0.48]),
  }));

  const panelStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: (progress.value - 1) * drawerWidth }],
  }));

  const swipeClose = Gesture.Pan()
    .activeOffsetX([-15, 9999])
    .onEnd((event) => {
      if (event.translationX < -48 || event.velocityX < -600) {
        runOnJS(onClose)();
      }
    });

  if (!mounted) return null;

  return (
    <View style={[StyleSheet.absoluteFill, { pointerEvents: 'box-none' as const }]}>
      <Animated.View style={[StyleSheet.absoluteFill, styles.backdrop, backdropStyle]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Dismiss menu" />
      </Animated.View>

      <GestureDetector gesture={swipeClose}>
        <Animated.View
          style={[
            styles.panel,
            {
              width: drawerWidth,
              backgroundColor: theme.drawerBackground,
              paddingTop: insets.top + Spacing.one,
              borderRightColor: theme.headerBorder,
            },
            panelStyle,
          ]}>
          <ConversationSidebar variant="overlay" onRequestClose={onClose} />
        </Animated.View>
      </GestureDetector>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    backgroundColor: '#0A0A0C',
  },
  panel: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    borderRightWidth: StyleSheet.hairlineWidth,
    borderTopRightRadius: Platform.OS === 'web' ? 0 : 20,
    borderBottomRightRadius: Platform.OS === 'web' ? 0 : 20,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 8, height: 0 },
        shadowOpacity: 0.22,
        shadowRadius: 24,
      },
      android: {
        elevation: 16,
      },
      web: {
        boxShadow: '12px 0 40px rgba(0,0,0,0.22)',
      },
    }),
  },
});
