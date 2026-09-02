import { useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SymbolView } from 'expo-symbols';

import { MarkdownText } from '@/components/chat/markdown-text';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { nativeShadowColor } from '@/lib/native-shadow';
import type { ParsedTutorLesson } from '@/subject/lesson-parser';

const LESSON_ACCENT = '#2563EB';

function tint(hex: string, alpha: number) {
  const raw = hex.replace('#', '');
  const n = parseInt(raw.length === 3 ? raw.split('').map((c) => c + c).join('') : raw, 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  return `rgba(${r},${g},${b},${alpha})`;
}

type LessonCardProps = {
  lesson: ParsedTutorLesson;
  leftover?: string;
};

export function LessonCard({ lesson, leftover }: LessonCardProps) {
  const theme = useTheme();
  const isWeb = Platform.OS === 'web';
  const [index, setIndex] = useState(0);
  const total = lesson.sections.length;
  const safeIndex = Math.min(index, Math.max(total - 1, 0));
  const section = lesson.sections[safeIndex];
  if (!section) return null;

  const atStart = safeIndex <= 0;
  const atEnd = safeIndex >= total - 1;
  const progress = total > 0 ? (safeIndex + 1) / total : 0;
  const accent = isWeb ? theme.text : LESSON_ACCENT;

  return (
    <View
      style={[
        styles.wrap,
        isWeb && styles.wrapWeb,
        {
          backgroundColor: theme.composerBackground,
          borderColor: isWeb ? theme.composerBorder : tint(LESSON_ACCENT, 0.28),
          ...nativeShadowColor(theme.composerShadow),
        },
      ]}>
      <View style={styles.header}>
        <View
          style={[
            styles.mark,
            isWeb && styles.markWeb,
            { backgroundColor: tint(LESSON_ACCENT, 0.14) },
          ]}>
          <SymbolView
            name={{ ios: 'book.fill', android: 'menu_book', web: 'menu_book' }}
            size={15}
            tintColor={LESSON_ACCENT}
          />
        </View>
        <View style={styles.headerText}>
          <ThemedText type="smallBold" style={[styles.title, { color: theme.text }]}>
            Lesson
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary" style={styles.kicker}>
            {section.title}
          </ThemedText>
        </View>
        <ThemedText style={[styles.counterText, { color: theme.textSecondary }]}>
          {safeIndex + 1} / {total}
        </ThemedText>
      </View>

      {leftover ? <MarkdownText content={leftover} /> : null}

      <View style={[styles.track, { backgroundColor: theme.backgroundElement }]}>
        <View
          style={[
            styles.trackFill,
            { width: `${Math.round(progress * 100)}%`, backgroundColor: accent },
          ]}
        />
      </View>

      {isWeb ? (
        <View style={[styles.tabTrack, { borderBottomColor: theme.headerBorder }]}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabs}>
            {lesson.sections.map((item, i) => {
              const active = i === safeIndex;
              return (
                <Pressable
                  key={item.id}
                  onPress={() => setIndex(i)}
                  style={({ pressed }) => [
                    styles.tab,
                    { borderBottomColor: active ? theme.text : 'transparent' },
                    pressed && styles.pressed,
                  ]}>
                  <ThemedText
                    style={[styles.tabLabel, { color: active ? theme.text : theme.textSecondary }]}
                    numberOfLines={1}>
                    {item.title}
                  </ThemedText>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      ) : (
        <View style={styles.pills}>
          {lesson.sections.map((item, i) => {
            const active = i === safeIndex;
            return (
              <Pressable
                key={item.id}
                onPress={() => setIndex(i)}
                style={({ pressed }) => [
                  styles.pill,
                  {
                    backgroundColor: active ? tint(LESSON_ACCENT, 0.16) : theme.backgroundElement,
                    borderColor: active ? LESSON_ACCENT : theme.composerBorder,
                  },
                  pressed && styles.pressed,
                ]}>
                <ThemedText
                  style={[styles.pillLabel, { color: active ? LESSON_ACCENT : theme.textSecondary }]}
                  numberOfLines={1}>
                  {item.title}
                </ThemedText>
              </Pressable>
            );
          })}
        </View>
      )}

      <View
        style={[
          styles.body,
          isWeb && styles.bodyWeb,
          {
            backgroundColor: isWeb ? 'transparent' : theme.background,
            borderColor: isWeb ? 'transparent' : theme.composerBorder,
          },
        ]}>
        {isWeb ? null : (
          <ThemedText style={[styles.sectionKicker, { color: LESSON_ACCENT }]}>
            {section.title}
          </ThemedText>
        )}
        <MarkdownText content={section.body} />
      </View>

      <View style={styles.nav}>
        <Pressable
          disabled={atStart}
          onPress={() => setIndex(safeIndex - 1)}
          accessibilityLabel="Previous section"
          style={({ pressed }) => [
            styles.navButton,
            isWeb && styles.navButtonWeb,
            {
              backgroundColor: isWeb ? 'transparent' : theme.backgroundElement,
              borderColor: isWeb ? 'transparent' : theme.composerBorder,
            },
            atStart && styles.disabled,
            pressed && !atStart && styles.pressed,
          ]}>
          <ThemedText style={[styles.navLabel, { color: atStart ? theme.textSecondary : theme.text }]}>
            Previous
          </ThemedText>
        </Pressable>
        <Pressable
          disabled={atEnd}
          onPress={() => setIndex(safeIndex + 1)}
          accessibilityLabel="Next section"
          style={({ pressed }) => [
            styles.navButton,
            isWeb && styles.navButtonWeb,
            {
              backgroundColor: atEnd
                ? isWeb
                  ? 'transparent'
                  : theme.backgroundElement
                : isWeb
                  ? theme.sendButton
                  : LESSON_ACCENT,
            },
            atEnd && styles.disabled,
            pressed && !atEnd && styles.pressed,
          ]}>
          <ThemedText
            style={[
              styles.navLabel,
              { color: atEnd ? theme.textSecondary : isWeb ? theme.sendButtonIcon : '#FFFFFF' },
            ]}>
            {atEnd ? 'End' : 'Next'}
          </ThemedText>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderRadius: 16,
    borderWidth: 1,
    padding: Spacing.three,
    gap: Spacing.three,
  },
  wrapWeb: {
    borderRadius: 14,
    padding: 20,
    gap: 16,
    ...Platform.select({
      web: {
        boxShadow: '0 1px 2px rgba(26, 25, 21, 0.04)',
      },
    }),
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  mark: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  markWeb: {
    width: 28,
    height: 28,
    borderRadius: 8,
  },
  headerText: {
    flex: 1,
    minWidth: 0,
    gap: 1,
  },
  title: {
    fontSize: 15,
    lineHeight: 20,
  },
  kicker: {
    fontSize: 12,
    lineHeight: 16,
  },
  counterText: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
  track: {
    height: 2,
    borderRadius: 999,
    overflow: 'hidden',
  },
  trackFill: {
    height: '100%',
    borderRadius: 999,
  },
  pills: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  pill: {
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 4,
    maxWidth: '100%',
  },
  pillLabel: {
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '700',
  },
  tabTrack: {
    marginHorizontal: -4,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  tabs: {
    flexDirection: 'row',
    gap: 4,
  },
  tab: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginBottom: -1,
    borderBottomWidth: 2,
    ...Platform.select({
      web: { cursor: 'pointer' },
    }),
  },
  tabLabel: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '600',
  },
  body: {
    borderRadius: 12,
    borderWidth: 1,
    padding: Spacing.three,
    gap: 6,
  },
  bodyWeb: {
    borderRadius: 0,
    borderWidth: 0,
    padding: 4,
    paddingTop: 8,
    minHeight: 120,
  },
  sectionKicker: {
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '700',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  nav: {
    flexDirection: 'row',
    gap: Spacing.two,
    justifyContent: 'flex-end',
  },
  navButton: {
    flex: 1,
    height: 40,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  navButtonWeb: {
    flex: 0,
    minWidth: 88,
    height: 34,
    borderRadius: 8,
    paddingHorizontal: 14,
    ...Platform.select({
      web: { cursor: 'pointer' },
    }),
  },
  navLabel: {
    fontSize: 14,
    fontWeight: '700',
  },
  pressed: {
    opacity: 0.85,
  },
  disabled: {
    opacity: 0.55,
  },
});
