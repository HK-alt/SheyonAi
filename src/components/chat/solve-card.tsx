import { useState } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import { SymbolView } from 'expo-symbols';

import { MarkdownText } from '@/components/chat/markdown-text';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { nativeShadowColor } from '@/lib/native-shadow';
import type { ParsedTutorSolve } from '@/subject/solve-parser';

const SOLVE_ACCENT = '#0F766E';

function tint(hex: string, alpha: number) {
  const raw = hex.replace('#', '');
  const n = parseInt(raw.length === 3 ? raw.split('').map((c) => c + c).join('') : raw, 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  return `rgba(${r},${g},${b},${alpha})`;
}

type SolveCardProps = {
  solve: ParsedTutorSolve;
};

export function SolveCard({ solve }: SolveCardProps) {
  const theme = useTheme();
  const [revealed, setRevealed] = useState(0);
  const total = solve.steps.length;
  const complete = revealed >= total;

  return (
    <View
      style={[
        styles.wrap,
        {
          backgroundColor: theme.composerBackground,
          borderColor: Platform.OS === 'web' ? theme.composerBorder : tint(SOLVE_ACCENT, 0.32),
          ...nativeShadowColor(theme.composerShadow),
        },
      ]}>
      <View style={styles.header}>
        <View style={[styles.mark, { backgroundColor: tint(SOLVE_ACCENT, 0.14) }]}>
          <SymbolView
            name={{ ios: 'checkmark.circle.fill', android: 'check_circle', web: 'check_circle' }}
            size={15}
            tintColor={SOLVE_ACCENT}
          />
        </View>
        <View style={styles.headerText}>
          <ThemedText type="smallBold" style={[styles.title, { color: theme.text }]}>
            Worked solution
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary" style={styles.kicker}>
            Reveal one marked step at a time
          </ThemedText>
        </View>
        <View style={[styles.counter, { backgroundColor: tint(SOLVE_ACCENT, 0.12) }]}>
          <ThemedText style={[styles.counterText, { color: SOLVE_ACCENT }]}>
            {Math.min(revealed, total)} / {total}
          </ThemedText>
        </View>
      </View>

      {solve.leftover ? <MarkdownText content={solve.leftover} /> : null}

      {solve.problem ? (
        <View
          style={[
            styles.section,
            { borderColor: theme.composerBorder, backgroundColor: theme.background },
          ]}>
          <ThemedText style={[styles.sectionKicker, { color: theme.textSecondary }]}>
            Problem
          </ThemedText>
          <MarkdownText content={solve.problem} />
        </View>
      ) : null}

      {solve.steps.map((step, index) => {
        const open = index < revealed;
        return (
          <View
            key={step.number}
            style={[
              styles.section,
              {
                borderColor: open ? tint(SOLVE_ACCENT, 0.28) : theme.composerBorder,
                backgroundColor: open ? tint(SOLVE_ACCENT, 0.06) : theme.backgroundElement,
              },
            ]}>
            <View style={styles.stepHead}>
              <ThemedText style={[styles.sectionKicker, { color: open ? SOLVE_ACCENT : theme.textSecondary }]}>
                {step.title}
              </ThemedText>
              {!open ? (
                <SymbolView
                  name={{ ios: 'lock.fill', android: 'lock', web: 'lock' }}
                  size={12}
                  tintColor={theme.textSecondary}
                />
              ) : null}
            </View>
            {open ? (
              <MarkdownText content={step.body} />
            ) : (
              <ThemedText type="small" themeColor="textSecondary">
                Locked — reveal in order so you can try the next line first.
              </ThemedText>
            )}
          </View>
        );
      })}

      {complete && solve.recap ? (
        <View
          style={[
            styles.section,
            { borderColor: tint(SOLVE_ACCENT, 0.28), backgroundColor: tint(SOLVE_ACCENT, 0.08) },
          ]}>
          <ThemedText style={[styles.sectionKicker, { color: SOLVE_ACCENT }]}>Recap</ThemedText>
          <MarkdownText content={solve.recap} />
        </View>
      ) : null}

      {complete && solve.tryThis ? (
        <View style={[styles.section, { borderColor: theme.composerBorder }]}>
          <ThemedText style={[styles.sectionKicker, { color: theme.textSecondary }]}>
            Try this
          </ThemedText>
          <MarkdownText content={solve.tryThis} />
        </View>
      ) : null}

      <Pressable
        disabled={complete}
        accessibilityRole="button"
        accessibilityLabel={complete ? 'All steps revealed' : 'Reveal next step'}
        onPress={() => setRevealed((prev) => Math.min(prev + 1, total))}
        style={({ pressed }) => [
          styles.cta,
          { backgroundColor: complete ? theme.backgroundElement : SOLVE_ACCENT },
          pressed && !complete && styles.pressed,
        ]}>
        <ThemedText style={[styles.ctaLabel, { color: complete ? theme.textSecondary : '#FFFFFF' }]}>
          {complete ? 'All steps revealed' : revealed === 0 ? 'Reveal first step' : 'Reveal next step'}
        </ThemedText>
      </Pressable>
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
  counter: {
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  counterText: {
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '700',
  },
  section: {
    borderRadius: 12,
    borderWidth: 1,
    padding: Spacing.three,
    gap: 6,
  },
  stepHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  sectionKicker: {
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '700',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  cta: {
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaLabel: {
    fontSize: 14,
    fontWeight: '700',
  },
  pressed: {
    opacity: 0.85,
  },
});
