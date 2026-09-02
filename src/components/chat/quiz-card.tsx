import { useCallback, useEffect, useMemo, useState } from 'react';
import { Platform, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { SymbolView } from 'expo-symbols';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { nativeShadowColor } from '@/lib/native-shadow';
import {
  formatQuizReview,
  QUIZ_CHOICE_LETTERS,
  type ParsedTutorQuiz,
} from '@/subject/quiz-parser';

const QUIZ_ACCENT = '#E11D48';
const CORRECT = '#0F766E';
const WRONG = '#DC2626';

type QuizCardProps = {
  quiz: ParsedTutorQuiz;
  onReview?: (summary: string) => void;
};

type Response = { choice?: number; text?: string };

function tint(hex: string, alpha: number) {
  const raw = hex.replace('#', '');
  const n = parseInt(raw.length === 3 ? raw.split('').map((c) => c + c).join('') : raw, 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  return `rgba(${r},${g},${b},${alpha})`;
}

export function QuizCard({ quiz, onReview }: QuizCardProps) {
  const theme = useTheme();
  const [index, setIndex] = useState(0);
  const [responses, setResponses] = useState<Response[]>(() => quiz.questions.map(() => ({})));
  const [checked, setChecked] = useState(false);
  const [timerOn, setTimerOn] = useState(false);
  const [remaining, setRemaining] = useState(() => Math.max(90, quiz.questions.length * 40));

  const total = quiz.questions.length;
  const safeIndex = Math.min(index, Math.max(total - 1, 0));
  const question = quiz.questions[safeIndex];

  const goTo = useCallback((next: number) => {
    setIndex(next);
  }, []);

  const answeredCount = responses.filter((item, i) => {
    const q = quiz.questions[i];
    if (!q) return false;
    if (q.choices.length > 0) return typeof item.choice === 'number';
    return (item.text ?? '').trim().length > 0;
  }).length;

  const score = useMemo(() => {
    let correct = 0;
    let graded = 0;
    quiz.questions.forEach((item, i) => {
      const response = responses[i];
      if (item.choices.length > 0 && item.answerIndex !== null) {
        graded += 1;
        if (response?.choice === item.answerIndex) correct += 1;
        return;
      }
      if (item.expected && (response?.text ?? '').trim()) {
        graded += 1;
        if ((response?.text ?? '').trim().toLowerCase() === item.expected.trim().toLowerCase()) {
          correct += 1;
        }
      }
    });
    return { correct, total: graded || total };
  }, [quiz.questions, responses, total]);

  useEffect(() => {
    if (!timerOn || checked) return;
    const id = setInterval(() => {
      setRemaining((seconds) => (seconds <= 1 ? 0 : seconds - 1));
    }, 1000);
    return () => clearInterval(id);
  }, [timerOn, checked]);

  useEffect(() => {
    if (timerOn && remaining === 0 && !checked) setChecked(true);
  }, [timerOn, remaining, checked]);

  if (!question) return null;

  const atStart = safeIndex <= 0;
  const atEnd = safeIndex >= total - 1;
  const progress = total > 0 ? (safeIndex + 1) / total : 0;
  const response = responses[safeIndex] ?? {};
  const canCheck = answeredCount === total;

  function setChoice(choice: number) {
    if (checked) return;
    setResponses((prev) => {
      const next = [...prev];
      next[safeIndex] = { ...next[safeIndex], choice };
      return next;
    });
  }

  function setText(text: string) {
    if (checked) return;
    setResponses((prev) => {
      const next = [...prev];
      next[safeIndex] = { ...next[safeIndex], text };
      return next;
    });
  }

  function handleCheck() {
    if (!canCheck) return;
    setChecked(true);
  }

  function handleReview() {
    onReview?.(formatQuizReview(quiz, responses, score));
  }

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
        <View style={[styles.mark, { backgroundColor: tint(QUIZ_ACCENT, 0.14) }]}>
          <SymbolView
            name={{ ios: 'list.clipboard.fill', android: 'quiz', web: 'quiz' }}
            size={14}
            tintColor={QUIZ_ACCENT}
          />
        </View>
        <View style={styles.headerText}>
          <ThemedText type="small" themeColor="textSecondary" style={styles.kicker}>
            Quiz
          </ThemedText>
          <ThemedText type="smallBold" numberOfLines={1} style={[styles.topic, { color: theme.text }]}>
            {quiz.topic}
          </ThemedText>
        </View>
        <View style={[styles.counter, { backgroundColor: tint(QUIZ_ACCENT, 0.12) }]}>
          <ThemedText style={[styles.counterText, { color: QUIZ_ACCENT }]}>
            {checked ? `${score.correct}/${score.total}` : `${safeIndex + 1} / ${total}`}
          </ThemedText>
        </View>
        {!checked ? (
          <Pressable
            onPress={() => setTimerOn(true)}
            accessibilityRole="button"
            accessibilityLabel={timerOn ? 'Exam timer' : 'Start exam timer'}
            style={({ pressed }) => [
              styles.counter,
              {
                backgroundColor: timerOn ? tint(QUIZ_ACCENT, 0.18) : theme.backgroundElement,
              },
              pressed && styles.pressed,
            ]}>
            <ThemedText
              style={[
                styles.counterText,
                { color: timerOn && remaining <= 30 ? WRONG : QUIZ_ACCENT },
              ]}>
              {timerOn
                ? `${Math.floor(remaining / 60)}:${String(remaining % 60).padStart(2, '0')}`
                : 'Timer'}
            </ThemedText>
          </Pressable>
        ) : null}
      </View>

      <View style={[styles.track, { backgroundColor: theme.backgroundElement }]}>
        <View
          style={[
            styles.trackFill,
            {
              width: `${Math.round((checked ? score.correct / Math.max(score.total, 1) : progress) * 100)}%`,
              backgroundColor: checked ? CORRECT : QUIZ_ACCENT,
            },
          ]}
        />
      </View>

      <View
        style={[
          styles.paper,
          {
            backgroundColor: theme.background,
            borderColor: theme.composerBorder,
          },
        ]}>
        <ThemedText style={[styles.prompt, { color: theme.text }]}>{question.prompt}</ThemedText>

        {question.choices.length > 0 ? (
          <View style={styles.choices}>
            {question.choices.map((choice, choiceIndex) => {
              const selected = response.choice === choiceIndex;
              const isCorrect = question.answerIndex === choiceIndex;
              const showMark = checked && question.answerIndex !== null;
              const tone = showMark
                ? isCorrect
                  ? CORRECT
                  : selected
                    ? WRONG
                    : theme.composerBorder
                : selected
                  ? QUIZ_ACCENT
                  : theme.composerBorder;
              const fill = showMark
                ? isCorrect
                  ? tint(CORRECT, 0.12)
                  : selected
                    ? tint(WRONG, 0.1)
                    : theme.background
                : selected
                  ? tint(QUIZ_ACCENT, 0.1)
                  : theme.background;
              const letter = QUIZ_CHOICE_LETTERS[choiceIndex] ?? String(choiceIndex + 1);

              return (
                <Pressable
                  key={`${choiceIndex}-${choice}`}
                  disabled={checked}
                  onPress={() => setChoice(choiceIndex)}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  style={({ pressed }) => [
                    styles.choice,
                    { backgroundColor: fill, borderColor: tone },
                    pressed && !checked && styles.pressed,
                  ]}>
                  <View
                    style={[
                      styles.letter,
                      {
                        backgroundColor: selected || (showMark && isCorrect) ? tone : theme.backgroundElement,
                      },
                    ]}>
                    <ThemedText
                      style={[
                        styles.letterText,
                        {
                          color:
                            selected || (showMark && isCorrect) ? '#FFFFFF' : theme.text,
                        },
                      ]}>
                      {letter}
                    </ThemedText>
                  </View>
                  <View style={styles.choiceBody}>
                    <ThemedText style={[styles.choiceText, { color: theme.text }]}>{choice}</ThemedText>
                  </View>
                </Pressable>
              );
            })}
          </View>
        ) : (
          <TextInput
            value={response.text ?? ''}
            onChangeText={setText}
            editable={!checked}
            placeholder="Type your answer…"
            placeholderTextColor={theme.textSecondary}
            multiline
            style={[
              styles.input,
              {
                color: theme.text,
                backgroundColor: theme.backgroundElement,
                borderColor: theme.composerBorder,
              },
            ]}
          />
        )}
      </View>

      <View style={styles.nav}>
        <Pressable
          disabled={atStart}
          onPress={() => goTo(safeIndex - 1)}
          accessibilityRole="button"
          accessibilityLabel="Previous question"
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

        {!checked ? (
          <Pressable
            disabled={!canCheck}
            onPress={handleCheck}
            accessibilityRole="button"
            accessibilityLabel="Check answers"
            style={({ pressed }) => [
              styles.checkButton,
              {
                backgroundColor: canCheck ? QUIZ_ACCENT : theme.backgroundElement,
              },
              pressed && canCheck && styles.pressed,
            ]}>
            <ThemedText
              style={[
                styles.checkLabel,
                { color: canCheck ? '#FFFFFF' : theme.textSecondary },
              ]}>
              {canCheck ? 'Check answers' : `${answeredCount}/${total} answered`}
            </ThemedText>
          </Pressable>
        ) : onReview ? (
          <Pressable
            onPress={handleReview}
            accessibilityRole="button"
            accessibilityLabel="Get tutor feedback"
            style={({ pressed }) => [
              styles.checkButton,
              { backgroundColor: CORRECT },
              pressed && styles.pressed,
            ]}>
            <ThemedText style={[styles.checkLabel, { color: '#FFFFFF' }]}>
              Tutor feedback
            </ThemedText>
          </Pressable>
        ) : (
          <ThemedText style={[styles.scoreLabel, { color: CORRECT }]}>
            Score {score.correct}/{score.total}
          </ThemedText>
        )}

        <Pressable
          disabled={atEnd}
          onPress={() => goTo(safeIndex + 1)}
          accessibilityRole="button"
          accessibilityLabel="Next question"
          style={({ pressed }) => [
            styles.navButton,
            {
              backgroundColor: atEnd ? theme.backgroundElement : QUIZ_ACCENT,
              borderColor: atEnd ? theme.composerBorder : QUIZ_ACCENT,
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
  paper: {
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },
  prompt: {
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '600',
  },
  choices: {
    gap: 6,
  },
  choice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 12,
    borderWidth: 1,
    paddingVertical: 8,
    paddingHorizontal: 8,
  },
  letter: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  letterText: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '700',
  },
  choiceBody: {
    flex: 1,
    minWidth: 0,
  },
  choiceText: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '500',
  },
  input: {
    minHeight: 64,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 15,
    lineHeight: 22,
    textAlignVertical: 'top',
  },
  nav: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
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
  checkButton: {
    flex: 1,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
  },
  checkLabel: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '700',
  },
  scoreLabel: {
    flex: 1,
    textAlign: 'center',
    fontSize: 13,
    fontWeight: '700',
  },
  pressed: {
    opacity: 0.85,
  },
});
