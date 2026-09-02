import { Platform, Pressable, StyleSheet, View } from 'react-native';
import { SymbolView } from 'expo-symbols';

import { AssistantAvatar } from '@/components/chat/assistant-avatar';
import { ThemedText } from '@/components/themed-text';
import {
  getSubjectAccentColor,
  getSubjectConfig,
  getSubjectIcon,
  getSubjectTutorTitle,
} from '@/subject';
import { CODING_EMPTY_STATE_HINTS } from '@/subject/subjects/coding-mode-prompts';
import {
  TUTOR_EMPTY_STATE_HINTS,
  TUTOR_MODE_STARTERS,
} from '@/subject/subjects/personal-tutor-modes';
import { MATH_EMPTY_STATE_HINTS } from '@/subject/subjects/math-composer';
import { BIOLOGY_EMPTY_STATE_HINTS, BIOLOGY_MODE_STARTERS, DEFAULT_BIOLOGY_MODE } from '@/subject/biology-lab/biology-mode-prompts';
import { PHYSICS_EMPTY_STATE_HINTS, PHYSICS_MODE_STARTERS, DEFAULT_PHYSICS_MODE } from '@/subject/physics-lab/physics-mode-prompts';
import {
  CHEMISTRY_EMPTY_STATE_HINTS,
  CHEMISTRY_MODE_STARTERS,
  DEFAULT_CHEMISTRY_MODE,
} from '@/subject/chemistry-lab';
import {
  GEOGRAPHY_EMPTY_STATE_HINTS,
  GEOGRAPHY_MODE_STARTERS,
  DEFAULT_GEOGRAPHY_MODE,
} from '@/subject/geography-lab';
import {
  HISTORY_EMPTY_STATE_HINTS,
  HISTORY_MODE_STARTERS,
  DEFAULT_HISTORY_MODE,
} from '@/subject/history-lab';
import {
  ENGLISH_EMPTY_STATE_HINTS,
  ENGLISH_MODE_STARTERS,
  DEFAULT_ENGLISH_MODE,
} from '@/subject/english-lab';
import {
  DZONGKHA_EMPTY_STATE_HINTS,
  DZONGKHA_MODE_STARTERS,
  DEFAULT_DZONGKHA_MODE,
} from '@/subject/dzongkha-lab';
import { Spacing } from '@/constants/theme';
import { useAppSettings } from '@/context/app-settings-context';
import { useTheme } from '@/hooks/use-theme';
import type { Subject } from '@/subject';
import type {
  BiologyMode,
  ChemistryMode,
  CodingMode,
  DzongkhaMode,
  EnglishMode,
  GeographyMode,
  HistoryMode,
  MathMode,
  PhysicsMode,
  TutorMode,
} from '@/types/chat';
import { SUGGESTED_PROMPTS } from '@/types/chat';

const PROMPT_MARKS = [
  { ios: 'sparkles', android: 'auto_awesome', web: 'auto_awesome', color: '#2563EB' },
  { ios: 'pencil', android: 'edit', web: 'edit', color: '#DB2777' },
  { ios: 'hammer.fill', android: 'construction', web: 'construction', color: '#EA580C' },
  { ios: 'map.fill', android: 'map', web: 'map', color: '#0D9488' },
  { ios: 'lightbulb.fill', android: 'lightbulb', web: 'lightbulb', color: '#D97706' },
  { ios: 'book.fill', android: 'menu_book', web: 'menu_book', color: '#7C3AED' },
  { ios: 'graduationcap.fill', android: 'school', web: 'school', color: '#E86A2E' },
  { ios: 'checkmark.circle.fill', android: 'check_circle', web: 'check_circle', color: '#16A34A' },
] as const;

function tint(hex: string, alpha: number) {
  const raw = hex.replace('#', '');
  const n = parseInt(raw.length === 3 ? raw.split('').map((c) => c + c).join('') : raw, 16);
  if (Number.isNaN(n)) return hex;
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  return `rgba(${r},${g},${b},${alpha})`;
}

type EmptyStateProps = {
  onSelectPrompt: (prompt: string) => void;
  subject?: Subject;
  /** Active coding workspace mode — shows mode-specific subtitle hints. */
  codingMode?: CodingMode | null;
  /** Active Personal Tutor mode — shows mode-specific subtitle hints. */
  tutorMode?: TutorMode | null;
  /** Active Math workspace Solve chip. */
  mathMode?: MathMode | null;
  biologyMode?: BiologyMode | null;
  physicsMode?: PhysicsMode | null;
  chemistryMode?: ChemistryMode | null;
  geographyMode?: GeographyMode | null;
  historyMode?: HistoryMode | null;
  englishMode?: EnglishMode | null;
  dzongkhaMode?: DzongkhaMode | null;
  /** When true, the Math equation panel is open. */
  equationOpen?: boolean;
};

export function EmptyState({
  onSelectPrompt,
  subject,
  codingMode,
  tutorMode,
  mathMode,
  biologyMode,
  physicsMode,
  chemistryMode,
  geographyMode,
  historyMode,
  englishMode,
  dzongkhaMode,
  equationOpen,
}: EmptyStateProps) {
  const theme = useTheme();
  const { showSuggestions } = useAppSettings();
  const isWeb = Platform.OS === 'web';
  const subjectConfig = getSubjectConfig(subject);
  const effectiveBiologyMode =
    subject === 'biology' ? (biologyMode ?? DEFAULT_BIOLOGY_MODE) : null;
  const effectivePhysicsMode =
    subject === 'physics' ? (physicsMode ?? DEFAULT_PHYSICS_MODE) : null;
  const effectiveChemistryMode =
    subject === 'chemistry' ? (chemistryMode ?? DEFAULT_CHEMISTRY_MODE) : null;
  const effectiveGeographyMode =
    subject === 'geography' ? (geographyMode ?? DEFAULT_GEOGRAPHY_MODE) : null;
  const effectiveHistoryMode =
    subject === 'history' ? (historyMode ?? DEFAULT_HISTORY_MODE) : null;
  const effectiveEnglishMode =
    subject === 'english' ? (englishMode ?? DEFAULT_ENGLISH_MODE) : null;
  const effectiveDzongkhaMode =
    subject === 'dzongkha' ? (dzongkhaMode ?? DEFAULT_DZONGKHA_MODE) : null;
  const prompts =
    subject === 'personal' && tutorMode
      ? TUTOR_MODE_STARTERS[tutorMode]
      : subject === 'biology' && effectiveBiologyMode
        ? BIOLOGY_MODE_STARTERS[effectiveBiologyMode]
        : subject === 'physics' && effectivePhysicsMode
          ? PHYSICS_MODE_STARTERS[effectivePhysicsMode]
          : subject === 'chemistry' && effectiveChemistryMode
            ? CHEMISTRY_MODE_STARTERS[effectiveChemistryMode]
            : subject === 'geography' && effectiveGeographyMode
              ? GEOGRAPHY_MODE_STARTERS[effectiveGeographyMode]
              : subject === 'history' && effectiveHistoryMode
                ? HISTORY_MODE_STARTERS[effectiveHistoryMode]
                : subject === 'english' && effectiveEnglishMode
                  ? ENGLISH_MODE_STARTERS[effectiveEnglishMode]
                  : subject === 'dzongkha' && effectiveDzongkhaMode
                    ? DZONGKHA_MODE_STARTERS[effectiveDzongkhaMode]
                    : subjectConfig
                      ? subjectConfig.prompts
                      : SUGGESTED_PROMPTS;
  const iconName = subject ? getSubjectIcon(subject) : null;
  const subjectAccent = getSubjectAccentColor(subject) ?? theme.accent;

  const subtitle =
    subject === 'coding' && codingMode
      ? CODING_EMPTY_STATE_HINTS[codingMode]
      : subject === 'personal' && tutorMode
        ? TUTOR_EMPTY_STATE_HINTS[tutorMode]
        : subject === 'math' && mathMode === 'solve'
          ? MATH_EMPTY_STATE_HINTS.solve
          : subject === 'math' && equationOpen
          ? MATH_EMPTY_STATE_HINTS.equation
          : subject === 'biology' && effectiveBiologyMode
            ? BIOLOGY_EMPTY_STATE_HINTS[effectiveBiologyMode]
            : subject === 'physics' && effectivePhysicsMode
              ? PHYSICS_EMPTY_STATE_HINTS[effectivePhysicsMode]
              : subject === 'chemistry' && effectiveChemistryMode
                ? CHEMISTRY_EMPTY_STATE_HINTS[effectiveChemistryMode]
                : subject === 'geography' && effectiveGeographyMode
                  ? GEOGRAPHY_EMPTY_STATE_HINTS[effectiveGeographyMode]
                  : subject === 'history' && effectiveHistoryMode
                    ? HISTORY_EMPTY_STATE_HINTS[effectiveHistoryMode]
                    : subject === 'english' && effectiveEnglishMode
                      ? ENGLISH_EMPTY_STATE_HINTS[effectiveEnglishMode]
                      : subject === 'dzongkha' && effectiveDzongkhaMode
                        ? DZONGKHA_EMPTY_STATE_HINTS[effectiveDzongkhaMode]
                        : subjectConfig
                          ? subjectConfig.modeHint
                          : 'Ask anything, attach files, or pick a subject below';

  const greeting =
    subject === 'personal'
      ? (getSubjectTutorTitle(subject) ?? 'Personal Tutor')
      : subjectConfig?.greeting
        ? subject === 'dzongkha'
          ? subjectConfig.greeting
          : `${subjectConfig.greeting} How can I help you with your ${subjectConfig.label} today?`
        : (getSubjectTutorTitle(subject) ?? 'How can I help?');

  return (
    <View style={[styles.container, isWeb && styles.containerWeb]}>
      <View style={styles.hero}>
        {subject && iconName ? (
          <View
            style={[
              styles.subjectBadge,
              isWeb && styles.subjectBadgeWeb,
              { backgroundColor: tint(subjectAccent, 0.14) },
            ]}>
            <SymbolView name={iconName} size={isWeb ? 22 : 28} tintColor={subjectAccent} />
          </View>
        ) : (
          <AssistantAvatar size={isWeb ? 44 : 56} />
        )}

        <ThemedText type="subtitle" style={[styles.greeting, isWeb && styles.greetingWeb]}>
          {greeting}
        </ThemedText>
        {subject === 'dzongkha' && subjectConfig?.greetingRomanization ? (
          <ThemedText themeColor="textSecondary" style={styles.romanization}>
            ({subjectConfig.greetingRomanization})
          </ThemedText>
        ) : null}
        <ThemedText themeColor="textSecondary" style={[styles.subtitle, isWeb && styles.subtitleWeb]}>
          {subtitle}
        </ThemedText>
      </View>

      {showSuggestions ? (
        <View style={[styles.promptGrid, isWeb && styles.promptGridWeb]}>
          {prompts.map((prompt, index) => {
            const mark = PROMPT_MARKS[index % PROMPT_MARKS.length];
            return (
              <Pressable
                key={prompt}
                onPress={() => onSelectPrompt(prompt)}
                style={({ pressed, hovered }: { pressed: boolean; hovered?: boolean }) => [
                  styles.promptCard,
                  isWeb && styles.promptCardWeb,
                  {
                    backgroundColor: isWeb ? theme.composerBackground : theme.background,
                    borderColor: hovered && isWeb ? mark.color : theme.composerBorder,
                  },
                  hovered && isWeb && styles.promptCardHover,
                  pressed && styles.cardPressed,
                ]}>
                <View style={[styles.promptIcon, { backgroundColor: tint(mark.color, 0.14) }]}>
                  <SymbolView
                    name={{ ios: mark.ios, android: mark.android, web: mark.web }}
                    size={isWeb ? 16 : 14}
                    tintColor={mark.color}
                  />
                </View>
                <ThemedText style={[styles.promptText, isWeb && styles.promptTextWeb]}>{prompt}</ThemedText>
              </Pressable>
            );
          })}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.five,
    gap: Spacing.five,
  },
  containerWeb: {
    justifyContent: 'flex-end',
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.four,
    paddingBottom: Spacing.two,
    gap: Spacing.four,
  },
  hero: {
    alignItems: 'center',
    gap: Spacing.two,
  },
  subjectBadge: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  subjectBadgeWeb: {
    width: 48,
    height: 48,
    borderRadius: 14,
  },
  greeting: {
    fontSize: 26,
    lineHeight: 34,
    textAlign: 'center',
    letterSpacing: -0.3,
  },
  greetingWeb: {
    fontSize: 32,
    lineHeight: 40,
    letterSpacing: -0.6,
    fontWeight: '600',
  },
  romanization: {
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
    marginTop: -Spacing.one,
  },
  subtitle: {
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
    maxWidth: 320,
  },
  subtitleWeb: {
    maxWidth: 420,
    fontSize: 15,
    lineHeight: 22,
  },
  promptGrid: {
    gap: Spacing.two,
  },
  promptGridWeb: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    maxWidth: 560,
    width: '100%',
    alignSelf: 'center',
  },
  promptCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    borderRadius: 14,
    borderWidth: 1,
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.three,
  },
  promptCardWeb: {
    flexBasis: 'calc(50% - 5px)' as unknown as number,
    flexGrow: 0,
    width: 'calc(50% - 5px)' as unknown as number,
    minHeight: 84,
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 14,
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: 10,
    ...Platform.select({
      web: { cursor: 'pointer', transitionProperty: 'border-color, box-shadow, transform', transitionDuration: '140ms' },
    }),
  },
  promptIcon: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  promptCardHover: {
    ...Platform.select({
      web: {
        transform: [{ translateY: -1 }],
        boxShadow: '0 6px 16px rgba(26, 25, 21, 0.06)',
      },
    }),
  },
  cardPressed: {
    opacity: 0.75,
    transform: [{ scale: 0.99 }],
  },
  promptText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '500',
  },
  promptTextWeb: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '500',
  },
});
