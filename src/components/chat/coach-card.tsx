import { useState } from 'react';
import { Platform, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { SymbolView } from 'expo-symbols';

import { MarkdownText } from '@/components/chat/markdown-text';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { nativeShadowColor } from '@/lib/native-shadow';
import type { ParsedTutorCoach } from '@/subject/coach-parser';

const COACH_ACCENT = '#6D28D9';
const DEFAULT_CHOICES = ["I'm not sure yet"];

function tint(hex: string, alpha: number) {
  const raw = hex.replace('#', '');
  const n = parseInt(raw.length === 3 ? raw.split('').map((c) => c + c).join('') : raw, 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  return `rgba(${r},${g},${b},${alpha})`;
}

type CoachCardProps = {
  coach?: ParsedTutorCoach | null;
  fallbackContent?: string;
  isStreaming?: boolean;
  interactive?: boolean;
  disabled?: boolean;
  onReply?: (text: string) => void;
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
          borderColor: featured ? tint(COACH_ACCENT, 0.3) : theme.composerBorder,
          backgroundColor: featured ? tint(COACH_ACCENT, 0.08) : 'transparent',
        },
      ]}>
      <ThemedText
        style={[styles.sectionKicker, { color: featured ? COACH_ACCENT : theme.textSecondary }]}>
        {kicker}
      </ThemedText>
      <MarkdownText content={body} />
    </View>
  );
}

export function CoachCard({
  coach,
  fallbackContent,
  isStreaming,
  interactive = false,
  disabled = false,
  onReply,
}: CoachCardProps) {
  const theme = useTheme();
  const [draft, setDraft] = useState('');
  const trimmed = draft.trim();
  const canSend = interactive && !disabled && trimmed.length > 0;

  const modelChoices = coach?.choices ?? [];
  const choices =
    modelChoices.length > 0
      ? modelChoices
      : interactive
        ? DEFAULT_CHOICES
        : [];

  const submit = (text: string) => {
    const value = text.trim();
    if (!value || !onReply || !interactive || disabled) return;
    onReply(value);
    setDraft('');
  };

  return (
    <View
      style={[
        styles.wrap,
        {
          backgroundColor: theme.composerBackground,
          borderColor: Platform.OS === 'web' ? theme.composerBorder : tint(COACH_ACCENT, 0.35),
          ...nativeShadowColor(theme.composerShadow),
        },
      ]}>
      <View style={styles.header}>
        <View style={[styles.mark, { backgroundColor: tint(COACH_ACCENT, 0.14) }]}>
          <SymbolView
            name={{ ios: 'shield.fill', android: 'shield', web: 'shield' }}
            size={15}
            tintColor={COACH_ACCENT}
          />
        </View>
        <View style={styles.headerText}>
          <ThemedText type="smallBold" style={[styles.title, { color: theme.text }]}>
            Coach
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary" style={styles.kicker}>
            One question at a time — not the answer
          </ThemedText>
        </View>
      </View>

      {coach ? (
        <>
          {coach.leftover ? (
            <MarkdownText content={coach.leftover} isStreaming={isStreaming} />
          ) : null}
          <Section kicker="Focus" body={coach.focus} />
          <Section kicker="Check" body={coach.check} />
          <Section kicker="Question" body={coach.question} featured />
        </>
      ) : fallbackContent ? (
        <MarkdownText content={fallbackContent} isStreaming={isStreaming} />
      ) : null}

      {choices.length > 0 ? (
        <View style={styles.choices}>
          <ThemedText style={[styles.sectionKicker, { color: theme.textSecondary }]}>
            Reply
          </ThemedText>
          {choices.map((choice) => (
            <Pressable
              key={choice}
              disabled={!interactive || disabled}
              accessibilityRole="button"
              accessibilityLabel={choice}
              onPress={() => submit(`My choice: ${choice}`)}
              style={({ pressed }) => [
                styles.choice,
                {
                  backgroundColor: theme.backgroundElement,
                  borderColor: interactive ? tint(COACH_ACCENT, 0.28) : theme.composerBorder,
                },
                pressed && interactive && !disabled && styles.pressed,
                (!interactive || disabled) && styles.choiceLocked,
              ]}>
              <ThemedText style={[styles.choiceText, { color: theme.text }]}>{choice}</ThemedText>
            </Pressable>
          ))}
        </View>
      ) : null}

      {interactive ? (
        <View style={styles.reply}>
          <TextInput
            value={draft}
            onChangeText={setDraft}
            editable={!disabled}
            placeholder="Type your next line of working…"
            placeholderTextColor={theme.textSecondary}
            multiline
            blurOnSubmit={false}
            accessibilityLabel="Your attempt"
            onKeyPress={(event) => {
              if (Platform.OS !== 'web') return;
              const webEvent = event as typeof event & {
                key?: string;
                shiftKey?: boolean;
                preventDefault: () => void;
              };
              if ((webEvent.key ?? event.nativeEvent.key) !== 'Enter' || webEvent.shiftKey) return;
              webEvent.preventDefault();
              submit(`My attempt:\n${draft.trim()}`);
            }}
            style={[
              styles.input,
              {
                backgroundColor: theme.background,
                borderColor: theme.composerBorder,
                color: theme.text,
              },
            ]}
          />
          <Pressable
            disabled={!canSend}
            accessibilityRole="button"
            accessibilityLabel="Send attempt"
            onPress={() => submit(`My attempt:\n${trimmed}`)}
            style={({ pressed }) => [
              styles.send,
              { backgroundColor: canSend ? COACH_ACCENT : theme.backgroundElement },
              pressed && canSend && styles.pressed,
            ]}>
            <ThemedText
              style={[styles.sendLabel, { color: canSend ? '#FFFFFF' : theme.textSecondary }]}>
              Send
            </ThemedText>
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
  choices: {
    gap: Spacing.two,
  },
  choice: {
    borderRadius: 12,
    borderWidth: 1,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
  },
  choiceText: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '500',
  },
  choiceLocked: {
    opacity: 0.7,
  },
  reply: {
    gap: Spacing.two,
  },
  input: {
    minHeight: 72,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    lineHeight: 22,
    textAlignVertical: 'top',
    ...Platform.select({
      web: { outlineStyle: 'none' as const },
    }),
  },
  send: {
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendLabel: {
    fontSize: 14,
    lineHeight: 18,
    fontWeight: '700',
  },
  pressed: {
    opacity: 0.85,
  },
});
