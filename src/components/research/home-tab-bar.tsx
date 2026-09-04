import { useEffect } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import { SymbolView } from 'expo-symbols';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useThemePreference } from '@/context/theme-preference-context';
import { useTheme } from '@/hooks/use-theme';

export type HomeTab = 'chat' | 'camera' | 'research';

type HomeTabBarProps = {
  active: HomeTab;
  onChange: (tab: HomeTab) => void;
  /** When false, collapses for fullscreen chat scrolling. */
  visible?: boolean;
};

const HEADER_ANIM_MS = 220;
const HEADER_EASING = Easing.out(Easing.cubic);

const TAB_ACCENTS = {
  light: {
    chat: '#2563EB',
    camera: '#7C3AED',
    research: '#0D9488',
  },
  dark: {
    chat: '#60A5FA',
    camera: '#C4B5FD',
    research: '#2DD4BF',
  },
} as const;

const BASE_TABS = [
  {
    id: 'chat' as const,
    label: 'Chat',
    icon: { ios: 'bubble.left' as const, android: 'chat' as const, web: 'chat' as const },
    iconActive: { ios: 'bubble.left.fill' as const, android: 'chat' as const, web: 'chat' as const },
  },
  {
    id: 'camera' as const,
    nativeLabel: 'Camera',
    webLabel: 'Vision',
    icon: { ios: 'camera' as const, android: 'photo-camera' as const, web: 'visibility' as const },
    iconActive: {
      ios: 'camera.fill' as const,
      android: 'photo-camera' as const,
      web: 'visibility' as const,
    },
  },
  {
    id: 'research' as const,
    label: 'Research',
    icon: { ios: 'magnifyingglass' as const, android: 'search' as const, web: 'search' as const },
    iconActive: { ios: 'magnifyingglass' as const, android: 'search' as const, web: 'search' as const },
  },
];

function withAlpha(hex: string, alpha: number) {
  const value = hex.replace('#', '');
  const r = parseInt(value.slice(0, 2), 16);
  const g = parseInt(value.slice(2, 4), 16);
  const b = parseInt(value.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

export function HomeTabBar({ active, onChange, visible = true }: HomeTabBarProps) {
  const theme = useTheme();
  const { resolvedScheme } = useThemePreference();
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === 'web';
  const accents = TAB_ACCENTS[resolvedScheme];
  const trackBg = isWeb ? (resolvedScheme === 'dark' ? '#252321' : '#EFEDE8') : theme.backgroundElement;
  const trackBorder = theme.composerBorder;

  const progress = useSharedValue(visible ? 1 : 0);
  const measuredHeight = useSharedValue(0);

  useEffect(() => {
    progress.value = withTiming(visible ? 1 : 0, {
      duration: HEADER_ANIM_MS,
      easing: HEADER_EASING,
    });
  }, [visible, progress]);

  const collapseStyle = useAnimatedStyle(() => {
    const h = measuredHeight.value;
    if (h <= 0) {
      return { overflow: 'hidden' as const };
    }
    return {
      height: h * progress.value,
      opacity: progress.value,
      overflow: 'hidden' as const,
    };
  });

  return (
    <Animated.View style={[collapseStyle, { pointerEvents: visible ? 'auto' : 'none' }]}>
      <View
        onLayout={(event) => {
          const next = event.nativeEvent.layout.height;
          if (next > 0 && next >= measuredHeight.value - 0.5) {
            measuredHeight.value = next;
          }
        }}
        style={[
          styles.container,
          isWeb && styles.containerWeb,
          {
            paddingTop: insets.top + (isWeb ? 10 : 6),
            borderBottomColor: theme.headerBorder,
            backgroundColor: theme.background,
            zIndex: 2,
          },
        ]}>
        <View
          accessibilityRole="tablist"
          style={[
            styles.segment,
            isWeb && styles.segmentWeb,
            {
              backgroundColor: trackBg,
              borderColor: trackBorder,
            },
          ]}>
          {BASE_TABS.map((tab) => {
            const selected = active === tab.id;
            const accent = accents[tab.id];
            const label = 'webLabel' in tab ? (isWeb ? tab.webLabel : tab.nativeLabel) : tab.label;
            const tint = selected ? accent : theme.textSecondary;

            return (
              <Pressable
                key={tab.id}
                accessibilityRole="tab"
                accessibilityState={{ selected }}
                accessibilityLabel={label}
                hitSlop={6}
                onPress={() => onChange(tab.id)}
                style={({ pressed, hovered }: { pressed: boolean; hovered?: boolean }) => [
                  styles.tab,
                  isWeb && styles.tabWeb,
                  selected && [
                    styles.tabSelected,
                    {
                      backgroundColor: isWeb ? theme.composerBackground : theme.background,
                      borderColor: isWeb
                        ? withAlpha(accent, resolvedScheme === 'dark' ? 0.45 : 0.28)
                        : trackBorder,
                    },
                  ],
                  hovered && !selected && { backgroundColor: withAlpha(accent, 0.08) },
                  pressed && styles.pressed,
                ]}>
                <View
                  style={[
                    isWeb && styles.iconWell,
                    selected &&
                      isWeb && {
                        backgroundColor: withAlpha(accent, resolvedScheme === 'dark' ? 0.22 : 0.14),
                      },
                  ]}>
                  <SymbolView
                    name={selected ? tab.iconActive : tab.icon}
                    size={isWeb ? 15 : 13}
                    tintColor={tint}
                    weight={selected ? 'semibold' : 'regular'}
                  />
                </View>
                <ThemedText
                  style={[
                    styles.label,
                    isWeb && styles.labelWeb,
                    {
                      color: tint,
                      fontWeight: selected ? '700' : '500',
                    },
                  ]}
                  numberOfLines={1}>
                  {label}
                </ThemedText>
                {selected ? <View style={[styles.activeBar, { backgroundColor: accent }]} /> : null}
              </Pressable>
            );
          })}
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingHorizontal: Spacing.three,
    paddingBottom: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  containerWeb: {
    paddingHorizontal: Spacing.four,
    paddingBottom: 12,
    ...Platform.select({
      web: {
        boxShadow: '0 1px 0 rgba(26, 25, 21, 0.04)',
      },
    }),
  },
  segment: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    maxWidth: 300,
    height: 32,
    padding: 2,
    borderRadius: 9,
    borderWidth: StyleSheet.hairlineWidth,
  },
  segmentWeb: {
    maxWidth: 460,
    height: 46,
    padding: 4,
    borderRadius: 16,
    borderWidth: 1,
    ...Platform.select({
      web: {
        boxShadow: 'inset 0 1px 2px rgba(26, 25, 21, 0.04)',
      },
    }),
  },
  tab: {
    flex: 1,
    height: 28,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    borderRadius: 7,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'transparent',
    paddingHorizontal: 4,
    overflow: 'hidden',
    ...Platform.select({
      web: { cursor: 'pointer' },
    }),
  },
  tabWeb: {
    height: 38,
    gap: 7,
    borderRadius: 12,
    borderWidth: 1,
  },
  tabSelected: {
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOpacity: 0.08,
        shadowRadius: 3,
        shadowOffset: { width: 0, height: 1 },
      },
      android: {
        elevation: 1,
      },
      web: {
        boxShadow: '0 1px 3px rgba(26, 25, 21, 0.08), 0 6px 16px rgba(26, 25, 21, 0.05)',
      },
    }),
  },
  iconWell: {
    width: 22,
    height: 22,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontSize: 11.5,
    lineHeight: 14,
    letterSpacing: 0.15,
  },
  labelWeb: {
    fontSize: 13.5,
    lineHeight: 18,
    letterSpacing: -0.2,
  },
  activeBar: {
    position: 'absolute',
    bottom: 0,
    left: '22%',
    right: '22%',
    height: 2,
    borderRadius: 999,
  },
  pressed: {
    opacity: 0.78,
  },
});
