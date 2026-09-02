import { useEffect } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import Animated, {
  FadeIn,
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { AssistantAvatar } from '@/components/chat/assistant-avatar';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { TYPING_STAGE_LABELS, type TypingStage } from '@/types/chat';

type TypingIndicatorProps = {
  stage?: TypingStage;
};

function BouncingDot({ delay, color }: { delay: number; color: string }) {
  const translateY = useSharedValue(0);

  useEffect(() => {
    translateY.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(-5, { duration: 280 }),
          withTiming(0, { duration: 280 }),
          withTiming(0, { duration: 280 }),
        ),
        -1,
        false,
      ),
    );
  }, [delay, translateY]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  return (
    <Animated.View style={[styles.dot, { backgroundColor: color }, animatedStyle]} />
  );
}

function StageLabel({ stage }: { stage: TypingStage }) {
  const opacity = useSharedValue(1);
  const translateX = useSharedValue(0);

  useEffect(() => {
    opacity.value = 0;
    translateX.value = 6;
    opacity.value = withTiming(1, { duration: 220 });
    translateX.value = withSpring(0, { damping: 18, stiffness: 220 });
  }, [opacity, stage, translateX]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateX: translateX.value }],
  }));

  return (
    <Animated.View style={animatedStyle}>
      <ThemedText themeColor="textSecondary" style={styles.stageLabel}>
        {TYPING_STAGE_LABELS[stage]}
      </ThemedText>
    </Animated.View>
  );
}

function AssistantAvatarPulse() {
  const scale = useSharedValue(1);

  useEffect(() => {
    scale.value = withRepeat(
      withSequence(withTiming(1.06, { duration: 900 }), withTiming(1, { duration: 900 })),
      -1,
      false,
    );
  }, [scale]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View style={animatedStyle}>
      <AssistantAvatar />
    </Animated.View>
  );
}

export function TypingIndicator({ stage = 'thinking' }: TypingIndicatorProps) {
  const theme = useTheme();

  return (
    <Animated.View
      entering={FadeInDown.duration(280).springify().damping(18)}
      style={styles.container}
      accessibilityRole="progressbar"
      accessibilityLabel={`Sheyon Ai is ${TYPING_STAGE_LABELS[stage].toLowerCase()}`}
      accessibilityLiveRegion="polite">
      {Platform.OS === 'web' ? null : <AssistantAvatarPulse />}

      <View style={styles.content}>
        <View style={styles.labelRow}>
          {Platform.OS === 'web' ? null : (
            <ThemedText type="smallBold" style={styles.assistantName}>
              Sheyon Ai
            </ThemedText>
          )}
          <StageLabel stage={stage} />
        </View>

        <Animated.View entering={FadeIn.delay(120).duration(200)} style={styles.dotsRow}>
          <BouncingDot delay={0} color={theme.textSecondary} />
          <BouncingDot delay={120} color={theme.textSecondary} />
          <BouncingDot delay={240} color={theme.textSecondary} />
        </Animated.View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.two,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.one,
  },
  content: {
    flex: 1,
    gap: Spacing.two,
    paddingTop: 2,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  assistantName: {
    fontSize: 14,
    lineHeight: 18,
  },
  stageLabel: {
    fontSize: 13,
    lineHeight: 18,
    fontStyle: 'italic',
  },
  dotsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingLeft: 2,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
});
