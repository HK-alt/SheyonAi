import { Platform, Pressable, StyleSheet, View } from 'react-native';
import { SymbolView } from 'expo-symbols';

import { RESEARCH_EXAMPLES, RESEARCH_SOURCES, tintColor } from '@/components/research/source-meta';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { ResearchSource } from '@/types/research';

const STEPS = [
  {
    n: '1',
    title: 'Search a topic',
    body: 'Type a question in everyday words. You do not need paper titles.',
  },
  {
    n: '2',
    title: 'Pick a library',
    body: 'Start with All libraries. Switch only if you want a specific kind of result.',
  },
  {
    n: '3',
    title: 'Ask AI to explain',
    body: 'Open a result, then Ask AI for a student-friendly summary. Don’t skip the original source.',
  },
];

type ResearchGuideProps = {
  source: ResearchSource;
  onChangeSource: (source: ResearchSource) => void;
  onTryExample: (query: string, source: ResearchSource) => void;
};

export function ResearchGuide({ source, onChangeSource, onTryExample }: ResearchGuideProps) {
  const theme = useTheme();
  const isWeb = Platform.OS === 'web';

  return (
    <View style={styles.wrap}>
      <View style={[styles.hero, { backgroundColor: theme.accentMuted, borderColor: theme.composerBorder }]}>
        <View style={[styles.heroIcon, { backgroundColor: theme.background }]}>
          <SymbolView
            name={{ ios: 'book.fill', android: 'menu_book', web: 'menu_book' }}
            size={22}
            tintColor={theme.accent}
          />
        </View>
        <ThemedText style={styles.heroTitle}>How Research works</ThemedText>
        <ThemedText type="small" themeColor="textSecondary" style={styles.heroBody}>
          This is a library search, not Chat. It looks up real Wikipedia pages and scientific papers, then you
          can ask AI to explain them in simple language.
        </ThemedText>
      </View>

      <View style={styles.steps}>
        {STEPS.map((step) => (
          <View
            key={step.n}
            style={[styles.step, { backgroundColor: theme.backgroundElement, borderColor: theme.composerBorder }]}>
            <View style={[styles.stepNum, { backgroundColor: theme.background, borderColor: theme.composerBorder }]}>
              <ThemedText style={styles.stepNumLabel}>{step.n}</ThemedText>
            </View>
            <ThemedText type="smallBold">{step.title}</ThemedText>
            <ThemedText type="small" themeColor="textSecondary" style={styles.stepBody}>
              {step.body}
            </ThemedText>
          </View>
        ))}
      </View>

      <ThemedText type="smallBold" style={styles.sectionLabel}>
        What each library is for
      </ThemedText>
      <View style={styles.grid}>
        {RESEARCH_SOURCES.map((item) => {
          const active = source === item.id;
          return (
            <Pressable
              key={item.id}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              onPress={() => onChangeSource(item.id)}
              style={({ pressed, hovered }: { pressed: boolean; hovered?: boolean }) => [
                styles.sourceCard,
                isWeb && styles.sourceCardWeb,
                {
                  backgroundColor: active ? tintColor(item.color, 0.1) : theme.background,
                  borderColor: active ? tintColor(item.color, 0.55) : theme.composerBorder,
                },
                hovered && !active ? { backgroundColor: theme.backgroundSelected } : null,
                pressed && styles.pressed,
              ]}>
              <View style={styles.sourceHead}>
                <View style={[styles.sourceIcon, { backgroundColor: tintColor(item.color, 0.16) }]}>
                  <SymbolView name={item.icon} size={16} tintColor={item.color} weight="medium" />
                </View>
                <ThemedText style={[styles.sourceName, { color: active ? item.color : theme.text }]}>
                  {item.label}
                </ThemedText>
              </View>
              <ThemedText type="small" themeColor="textSecondary" style={styles.sourceBlurb}>
                {item.blurb}
              </ThemedText>
            </Pressable>
          );
        })}
      </View>

      <ThemedText type="smallBold" style={styles.sectionLabel}>
        Try a topic
      </ThemedText>
      <View style={styles.examples}>
        {RESEARCH_EXAMPLES.map((example) => (
          <Pressable
            key={example.label}
            onPress={() => onTryExample(example.query, example.source)}
            accessibilityLabel={`Search ${example.label}`}
            style={({ pressed, hovered }: { pressed: boolean; hovered?: boolean }) => [
              styles.example,
              isWeb && styles.exampleWeb,
              {
                backgroundColor: hovered ? theme.backgroundSelected : theme.suggestionChip,
                borderColor: theme.composerBorder,
              },
              pressed && styles.pressed,
            ]}>
            <SymbolView
              name={{ ios: 'magnifyingglass', android: 'search', web: 'search' }}
              size={13}
              tintColor={theme.textSecondary}
            />
            <ThemedText type="small">{example.label}</ThemedText>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: Spacing.three,
    paddingBottom: Spacing.four,
    alignItems: 'stretch',
  },
  hero: {
    borderWidth: 1,
    borderRadius: 20,
    padding: Spacing.three,
    gap: 8,
  },
  heroIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroTitle: {
    fontSize: 18,
    lineHeight: 24,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  heroBody: {
    maxWidth: 520,
  },
  steps: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  step: {
    flexGrow: 1,
    flexBasis: 160,
    borderWidth: 1,
    borderRadius: 16,
    padding: 12,
    gap: 6,
  },
  stepNum: {
    width: 24,
    height: 24,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepNumLabel: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '700',
  },
  stepBody: {
    fontSize: 13,
    lineHeight: 18,
  },
  sectionLabel: {
    marginTop: 4,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  sourceCard: {
    flexGrow: 1,
    flexBasis: 220,
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
    gap: 8,
  },
  sourceCardWeb: {
    ...Platform.select({
      web: { cursor: 'pointer' },
    }),
  },
  sourceHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sourceIcon: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sourceName: {
    fontSize: 14,
    lineHeight: 18,
    fontWeight: '700',
  },
  sourceBlurb: {
    fontSize: 13,
    lineHeight: 18,
  },
  examples: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  example: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderRadius: 999,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  exampleWeb: {
    ...Platform.select({
      web: { cursor: 'pointer' },
    }),
  },
  pressed: {
    opacity: 0.78,
  },
});
