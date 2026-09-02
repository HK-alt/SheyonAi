import { useCallback, useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SymbolView } from 'expo-symbols';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { nativeShadowColor } from '@/lib/native-shadow';
import { getSubjectAccentColor } from '@/subject';
import type { ParsedTutorFlashcards } from '@/subject/flashcard-parser';

const PROMPT_ACCENT = getSubjectAccentColor('personal') ?? '#E86A2E';
const ANSWER_ACCENT = '#0F766E';

type FlashcardDeckProps = {
  deck: ParsedTutorFlashcards;
};

function tint(hex: string, alpha: number) {
  const raw = hex.replace('#', '');
  const n = parseInt(raw.length === 3 ? raw.split('').map((c) => c + c).join('') : raw, 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  return `rgba(${r},${g},${b},${alpha})`;
}

export function FlashcardDeck({ deck }: FlashcardDeckProps) {
  const theme = useTheme();
  const [index, setIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [ratings, setRatings] = useState<Record<number, 'again' | 'good'>>({});

  const goTo = useCallback((next: number) => {
    setIndex(next);
    setShowAnswer(false);
  }, []);

  const rate = useCallback((rating: 'again' | 'good') => {
    setRatings((prev) => ({ ...prev, [index]: rating }));
    setShowAnswer(false);
    setIndex((current) => (current < deck.cards.length - 1 ? current + 1 : current));
  }, [index, deck.cards.length]);

  const total = deck.cards.length;
  const safeIndex = Math.min(index, Math.max(total - 1, 0));
  const card = deck.cards[safeIndex];
  if (!card) return null;

  const atStart = safeIndex <= 0;
  const atEnd = safeIndex >= total - 1;
  const progress = total > 0 ? (safeIndex + 1) / total : 0;
  const mastered = Object.values(ratings).filter((item) => item === 'good').length;
  const accent = showAnswer ? ANSWER_ACCENT : PROMPT_ACCENT;
  const body = showAnswer ? card.back : card.front;

  return (
    <View
      style={[
        styles.wrap,
        {
          backgroundColor: theme.composerBackground,
          borderColor: theme.composerBorder,
          ...nativeShadowColor(theme.composerShadow),
        },
      ]}>
      <View style={styles.header}>
        <View style={[styles.mark, { backgroundColor: tint(PROMPT_ACCENT, 0.14) }]}>
          <SymbolView
            name={{ ios: 'rectangle.on.rectangle.angled', android: 'style', web: 'style' }}
            size={14}
            tintColor={PROMPT_ACCENT}
          />
        </View>
        <View style={styles.headerText}>
          <ThemedText type="small" themeColor="textSecondary" style={styles.kicker}>
            {mastered} mastered
          </ThemedText>
          <ThemedText type="smallBold" numberOfLines={1} style={[styles.topic, { color: theme.text }]}>
            {deck.topic}
          </ThemedText>
        </View>
        <View style={[styles.counter, { backgroundColor: tint(PROMPT_ACCENT, 0.12) }]}>
          <ThemedText style={[styles.counterText, { color: PROMPT_ACCENT }]}>
            {safeIndex + 1} / {total}
          </ThemedText>
        </View>
      </View>

      <View style={[styles.track, { backgroundColor: theme.backgroundElement }]}>
        <View
          style={[
            styles.trackFill,
            { width: `${Math.round(progress * 100)}%`, backgroundColor: PROMPT_ACCENT },
          ]}
        />
      </View>

      <Pressable
        onPress={() => setShowAnswer((prev) => !prev)}
        accessibilityRole="button"
        accessibilityLabel={showAnswer ? 'Show prompt' : 'Show answer'}
        style={({ pressed }) => [
          styles.face,
          {
            backgroundColor: theme.background,
            borderColor: theme.composerBorder,
            ...nativeShadowColor(theme.composerShadow),
          },
          pressed && styles.pressed,
        ]}>
        <View style={[styles.stripe, { backgroundColor: accent }]} />
        <View style={styles.faceBody}>
          <View style={[styles.badge, { backgroundColor: tint(accent, 0.14) }]}>
            <ThemedText style={[styles.badgeText, { color: accent }]}>
              {showAnswer ? 'Answer' : 'Prompt'}
            </ThemedText>
          </View>
          <ScrollView
            style={styles.promptScroll}
            contentContainerStyle={styles.promptContent}
            nestedScrollEnabled
            showsVerticalScrollIndicator={false}>
            <ThemedText style={[styles.prompt, { color: theme.text }]}>{body}</ThemedText>
          </ScrollView>
          <View style={styles.hintRow}>
            <SymbolView
              name={{ ios: 'arrow.triangle.2.circlepath', android: 'sync', web: 'sync' }}
              size={12}
              tintColor={theme.textSecondary}
            />
            <ThemedText style={[styles.hintText, { color: theme.textSecondary }]}>
              {showAnswer ? 'Tap to hide' : 'Tap to reveal'}
            </ThemedText>
          </View>
        </View>
      </Pressable>

      {showAnswer ? (
        <View style={styles.rateRow}>
          <Pressable
            onPress={() => rate('again')}
            accessibilityRole="button"
            accessibilityLabel="Review again"
            style={({ pressed }) => [
              styles.rateButton,
              { borderColor: theme.composerBorder, backgroundColor: theme.backgroundElement },
              pressed && styles.pressed,
            ]}>
            <ThemedText style={[styles.rateLabel, { color: theme.text }]}>Again</ThemedText>
          </Pressable>
          <Pressable
            onPress={() => rate('good')}
            accessibilityRole="button"
            accessibilityLabel="Got it"
            style={({ pressed }) => [
              styles.rateButton,
              { borderColor: ANSWER_ACCENT, backgroundColor: ANSWER_ACCENT },
              pressed && styles.pressed,
            ]}>
            <ThemedText style={[styles.rateLabel, { color: '#FFFFFF' }]}>Got it</ThemedText>
          </Pressable>
        </View>
      ) : null}

      <View style={styles.nav}>
        <Pressable
          disabled={atStart}
          onPress={() => goTo(safeIndex - 1)}
          accessibilityRole="button"
          accessibilityLabel="Previous card"
          style={({ pressed }) => [
            styles.navButton,
            {
              backgroundColor: theme.backgroundElement,
              borderColor: theme.composerBorder,
            },
            atStart && styles.navDisabled,
            pressed && !atStart && styles.pressed,
          ]}>
          <SymbolView
            name={{ ios: 'chevron.left', android: 'chevron_left', web: 'chevron_left' }}
            size={14}
            tintColor={atStart ? theme.textSecondary : theme.text}
          />
        </Pressable>

        <View style={styles.dots} accessibilityRole="progressbar">
          {deck.cards.map((_, i) => (
            <View
              key={i}
              style={[
                styles.dot,
                {
                  backgroundColor:
                    ratings[i] === 'good'
                      ? ANSWER_ACCENT
                      : ratings[i] === 'again'
                        ? PROMPT_ACCENT
                        : i === safeIndex
                          ? PROMPT_ACCENT
                          : theme.backgroundElement,
                  width: i === safeIndex ? 12 : 5,
                },
              ]}
            />
          ))}
        </View>

        <Pressable
          disabled={atEnd}
          onPress={() => goTo(safeIndex + 1)}
          accessibilityRole="button"
          accessibilityLabel="Next card"
          style={({ pressed }) => [
            styles.navButton,
            {
              backgroundColor: atEnd ? theme.backgroundElement : PROMPT_ACCENT,
              borderColor: atEnd ? theme.composerBorder : PROMPT_ACCENT,
            },
            atEnd && styles.navDisabled,
            pressed && !atEnd && styles.pressed,
          ]}>
          <SymbolView
            name={{ ios: 'chevron.right', android: 'chevron_right', web: 'chevron_right' }}
            size={14}
            tintColor={atEnd ? theme.textSecondary : '#FFFFFF'}
          />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: '100%',
    borderRadius: 16,
    borderWidth: 1,
    marginTop: Spacing.two,
    padding: 12,
    gap: 8,
    ...Platform.select({
      ios: {
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
      },
      android: { elevation: 2 },
      default: {
        boxShadow: '0 4px 14px rgba(15, 23, 42, 0.06)',
      },
    }),
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  mark: {
    width: 26,
    height: 26,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: {
    flex: 1,
    minWidth: 0,
  },
  kicker: {
    fontSize: 10,
    lineHeight: 12,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    fontWeight: '600',
  },
  topic: {
    fontSize: 13,
    lineHeight: 17,
  },
  counter: {
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  counterText: {
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  track: {
    height: 3,
    borderRadius: 999,
    overflow: 'hidden',
  },
  trackFill: {
    height: '100%',
    borderRadius: 999,
  },
  face: {
    minHeight: 148,
    maxHeight: 188,
    borderRadius: 14,
    borderWidth: 1,
    overflow: 'hidden',
    flexDirection: 'row',
    ...Platform.select({
      ios: {
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
      },
      android: { elevation: 2 },
      default: {
        boxShadow: '0 6px 16px rgba(15, 23, 42, 0.08)',
      },
    }),
  },
  stripe: {
    width: 4,
  },
  faceBody: {
    flex: 1,
    minWidth: 0,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 6,
  },
  badge: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  badgeText: {
    fontSize: 10,
    lineHeight: 14,
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  promptScroll: {
    flexGrow: 1,
    minHeight: 64,
  },
  promptContent: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  prompt: {
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '600',
  },
  hintRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  hintText: {
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '500',
  },
  nav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 6,
  },
  navButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navDisabled: {
    opacity: 0.55,
  },
  dots: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    flexWrap: 'wrap',
  },
  dot: {
    height: 5,
    borderRadius: 999,
  },
  pressed: {
    opacity: 0.85,
  },
  rateRow: {
    flexDirection: 'row',
    gap: 8,
  },
  rateButton: {
    flex: 1,
    height: 36,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rateLabel: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '700',
  },
});
