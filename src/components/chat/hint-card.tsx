import { Platform, Pressable, StyleSheet, View } from 'react-native';
import { SymbolView } from 'expo-symbols';

import { MarkdownText } from '@/components/chat/markdown-text';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { nativeShadowColor } from '@/lib/native-shadow';
import type { ParsedTutorHint } from '@/subject/hint-parser';
import type { TutorMode } from '@/types/chat';

const HINT_ACCENT = '#B45309';

function tint(hex: string, alpha: number) {
  const raw = hex.replace('#', '');
  const n = parseInt(raw.length === 3 ? raw.split('').map((c) => c + c).join('') : raw, 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  return `rgba(${r},${g},${b},${alpha})`;
}

type HintCardProps = {
  hint?: ParsedTutorHint | null;
  fallbackContent?: string;
  isStreaming?: boolean;
  interactive?: boolean;
  onAction?: (mode: TutorMode, text: string) => void;
};

function Section({
  kicker,
  body,
  featured,
}: {
  kicker: string;
  body: string;
  featured?: boolean;
}) {
  const theme = useTheme();
  if (!body) return null;

  return (
    <View
      style={[
        styles.section,
        {
          borderColor: featured ? tint(HINT_ACCENT, 0.28) : theme.composerBorder,
          backgroundColor: featured ? tint(HINT_ACCENT, 0.08) : 'transparent',
        },
      ]}>
      <ThemedText style={[styles.sectionKicker, { color: featured ? HINT_ACCENT : theme.textSecondary }]}>
        {kicker}
      </ThemedText>
      {body ? <MarkdownText content={body} /> : null}
    </View>
  );
}

export function HintCard({
  hint,
  fallbackContent,
  isStreaming,
  interactive = false,
  onAction,
}: HintCardProps) {
  const theme = useTheme();

  return (
    <View
      style={[
        styles.wrap,
        {
          backgroundColor: theme.composerBackground,
          borderColor: Platform.OS === 'web' ? theme.composerBorder : tint(HINT_ACCENT, 0.35),
          ...nativeShadowColor(theme.composerShadow),
        },
      ]}>
      <View style={styles.header}>
        <View style={[styles.mark, { backgroundColor: tint(HINT_ACCENT, 0.14) }]}>
          <SymbolView
            name={{ ios: 'lightbulb.fill', android: 'lightbulb', web: 'lightbulb' }}
            size={15}
            tintColor={HINT_ACCENT}
          />
        </View>
        <View style={styles.headerText}>
          <ThemedText type="smallBold" style={[styles.title, { color: theme.text }]}>
            Hint
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary" style={styles.kicker}>
            A method nudge — not the solution
          </ThemedText>
        </View>
      </View>

      {hint ? (
        <>
          {hint.leftover ? <MarkdownText content={hint.leftover} isStreaming={isStreaming} /> : null}
          <Section kicker="Focus" body={hint.focus} />
          <Section kicker="Hint" body={hint.hint} featured />
          <Section kicker="Next move" body={hint.nextMove} />
        </>
      ) : fallbackContent ? (
        <MarkdownText content={fallbackContent} isStreaming={isStreaming} />
      ) : null}

      {interactive && onAction ? (
        <View style={styles.actions}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Stronger hint"
            onPress={() =>
              onAction(
                'hint',
                'Give a slightly stronger method hint for the same step. Do not reveal the answer or full working.',
              )
            }
            style={({ pressed }) => [
              styles.action,
              { borderColor: tint(HINT_ACCENT, 0.35), backgroundColor: tint(HINT_ACCENT, 0.08) },
              pressed && styles.pressed,
            ]}>
            <ThemedText style={[styles.actionLabel, { color: HINT_ACCENT }]}>Stronger hint</ThemedText>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Check my working"
            onPress={() =>
              onAction(
                'no_answer',
                'Check my latest working on this problem. Coach me — do not give the final answer.',
              )
            }
            style={({ pressed }) => [
              styles.action,
              { borderColor: theme.composerBorder, backgroundColor: theme.backgroundElement },
              pressed && styles.pressed,
            ]}>
            <ThemedText style={[styles.actionLabel, { color: theme.text }]}>Check my working</ThemedText>
          </Pressable>
        </View>
      ) : null}
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
  section: {
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'transparent',
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.two,
    gap: 4,
  },
  sectionKicker: {
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '700',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  action: {
    borderRadius: 12,
    borderWidth: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  actionLabel: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '700',
  },
  pressed: {
    opacity: 0.85,
  },
});
