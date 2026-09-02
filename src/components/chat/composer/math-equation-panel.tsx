import { useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { MathKeyGlyph } from '@/components/chat/composer/math-key-glyph';
import { ThemedText } from '@/components/themed-text';
import { Fonts, Spacing } from '@/constants/theme';
import { useThemePreference } from '@/context/theme-preference-context';
import { useTheme } from '@/hooks/use-theme';
import {
  MATH_KEY_CATEGORIES,
  MATH_TEMPLATES,
  getMathKeysForCategory,
  mathPadPalette,
  type MathKeyCategory,
} from '@/subject/subjects/math-composer';

type MathEquationPanelProps = {
  displayMode: boolean;
  onDisplayModeChange: (display: boolean) => void;
  onInsert: (latex: string) => void;
  onNextSlot: () => void;
  onBackspace?: () => void;
  onClose?: () => void;
  disabled?: boolean;
};

const PAD_SHADOW = Platform.select({
  ios: {
    shadowColor: '#1A1714',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 18,
  },
  android: { elevation: 4 },
  default: {},
});

export function MathEquationPanel({
  displayMode,
  onDisplayModeChange,
  onInsert,
  onNextSlot,
  onBackspace,
  onClose,
  disabled,
}: MathEquationPanelProps) {
  const theme = useTheme();
  const { resolvedScheme } = useThemePreference();
  const paper = mathPadPalette(resolvedScheme);
  const [category, setCategory] = useState<MathKeyCategory>('popular');
  const keys = getMathKeysForCategory(category);

  return (
    <View style={[styles.panelOuter, PAD_SHADOW]}>
    <View
      style={[
        styles.panel,
        {
          backgroundColor: paper.surface,
          borderColor: paper.line,
        },
      ]}>
      <View style={[styles.wash, { backgroundColor: paper.glow }]} />
      <View style={[styles.rail, { backgroundColor: theme.accent }]} />

      <View style={styles.header}>
        <View style={[styles.mark, { backgroundColor: theme.accentMuted }]}>
          <ThemedText style={[styles.markGlyph, { color: theme.accent }]}>ƒ</ThemedText>
        </View>
        <View style={styles.headerCopy}>
          <ThemedText style={[styles.kicker, { color: theme.accent }]}>EQUATION PAD</ThemedText>
          <ThemedText style={[styles.headerTitle, { color: paper.ink }]}>Compose formula</ThemedText>
        </View>
        {onClose ? (
          <Pressable
            disabled={disabled}
            accessibilityRole="button"
            accessibilityLabel="Close equation pad"
            onPress={onClose}
            style={({ pressed }) => [
              styles.done,
              {
                backgroundColor: theme.accent,
                opacity: pressed ? 0.82 : 1,
              },
            ]}>
            <ThemedText style={styles.doneLabel}>Done</ThemedText>
          </Pressable>
        ) : null}
      </View>

      <ScrollView
        horizontal
        nestedScrollEnabled
        keyboardShouldPersistTaps="handled"
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.categoryRow}>
        {MATH_KEY_CATEGORIES.map((item) => {
          const active = item.id === category;
          return (
            <Pressable
              key={item.id}
              disabled={disabled}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              onPress={() => setCategory(item.id)}
              style={({ pressed }) => [
                styles.pill,
                {
                  backgroundColor: active ? theme.accent : paper.key,
                  borderColor: active ? theme.accent : paper.line,
                  opacity: pressed ? 0.85 : 1,
                },
              ]}>
              <ThemedText
                style={[styles.pillLabel, { color: active ? '#ffffff' : paper.muted }]}
                numberOfLines={1}>
                {item.label}
              </ThemedText>
            </Pressable>
          );
        })}
      </ScrollView>

      <View style={styles.grid}>
        {keys.map((key) => (
          <View key={key.id} style={styles.keyCell}>
            <Pressable
              disabled={disabled}
              accessibilityRole="button"
              accessibilityLabel={key.label}
              onPress={() => onInsert(key.latex)}
              style={({ pressed }) => [
                styles.key,
                {
                  backgroundColor: pressed ? theme.accentMuted : paper.key,
                  borderColor: pressed ? theme.accent : paper.line,
                  opacity: disabled ? 0.5 : 1,
                  transform: [{ scale: pressed ? 0.97 : 1 }],
                },
              ]}>
              <MathKeyGlyph
                label={key.label}
                preview={key.preview}
                color={paper.ink}
              />
            </Pressable>
          </View>
        ))}
      </View>

      <ScrollView
        horizontal
        nestedScrollEnabled
        keyboardShouldPersistTaps="handled"
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.templateRow}>
        {MATH_TEMPLATES.map((template) => (
          <Pressable
            key={template.id}
            disabled={disabled}
            accessibilityRole="button"
            accessibilityLabel={`Insert ${template.label} template`}
            onPress={() => onInsert(template.latex)}
            style={({ pressed }) => [
              styles.templateChip,
              {
                backgroundColor: theme.accentMuted,
                borderColor: pressed ? theme.accent : 'transparent',
                opacity: pressed ? 0.8 : 1,
              },
            ]}>
            <ThemedText style={[styles.templateLabel, { color: theme.accent }]} numberOfLines={1}>
              {template.label}
            </ThemedText>
          </Pressable>
        ))}
      </ScrollView>

      <View style={styles.footer}>
        <View style={[styles.segment, { borderColor: paper.line, backgroundColor: paper.key }]}>
          <Pressable
            disabled={disabled}
            accessibilityRole="button"
            accessibilityState={{ selected: !displayMode }}
            onPress={() => onDisplayModeChange(false)}
            style={[
              styles.segmentHalf,
              !displayMode && { backgroundColor: theme.accent },
            ]}>
            <ThemedText
              style={[
                styles.segmentLabel,
                { color: !displayMode ? '#ffffff' : paper.muted },
              ]}>
              Inline
            </ThemedText>
          </Pressable>
          <Pressable
            disabled={disabled}
            accessibilityRole="button"
            accessibilityState={{ selected: displayMode }}
            onPress={() => onDisplayModeChange(true)}
            style={[
              styles.segmentHalf,
              displayMode && { backgroundColor: theme.accent },
            ]}>
            <ThemedText
              style={[
                styles.segmentLabel,
                { color: displayMode ? '#ffffff' : paper.muted },
              ]}>
              Display
            </ThemedText>
          </Pressable>
        </View>

        <Pressable
          disabled={disabled}
          accessibilityRole="button"
          accessibilityLabel="Next empty slot"
          onPress={onNextSlot}
          style={({ pressed }) => [
            styles.ghostBtn,
            {
              backgroundColor: paper.key,
              borderColor: paper.line,
              opacity: pressed ? 0.75 : 1,
            },
          ]}>
          <ThemedText style={[styles.ghostLabel, { color: paper.ink }]}>Next</ThemedText>
        </Pressable>

        <View style={styles.footerSpacer} />

        <Pressable
          disabled={disabled || !onBackspace}
          accessibilityRole="button"
          accessibilityLabel="Backspace"
          onPress={onBackspace}
          style={({ pressed }) => [
            styles.deleteBtn,
            {
              backgroundColor: paper.ink,
              opacity: pressed ? 0.8 : 1,
            },
          ]}>
          <ThemedText style={[styles.deleteLabel, { color: paper.surface }]}>Del</ThemedText>
        </Pressable>
      </View>
    </View>
    </View>
  );
}

const styles = StyleSheet.create({
  panelOuter: {
    marginBottom: Spacing.two,
    borderRadius: 18,
  },
  panel: {
    overflow: 'hidden',
    borderWidth: 1,
    borderRadius: 18,
    paddingLeft: 16,
    paddingRight: 12,
    paddingTop: 12,
    paddingBottom: 14,
    gap: 12,
  },
  wash: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    height: 72,
  },
  rail: {
    position: 'absolute',
    left: 0,
    top: 18,
    bottom: 18,
    width: 4,
    borderRadius: 2,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  mark: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  markGlyph: {
    fontSize: 20,
    lineHeight: 24,
    fontWeight: '700',
    fontFamily: Fonts.serif,
  },
  headerCopy: {
    flex: 1,
    minWidth: 0,
    gap: 1,
  },
  kicker: {
    fontSize: 10,
    lineHeight: 12,
    letterSpacing: 1.4,
    fontWeight: '800',
  },
  headerTitle: {
    fontSize: 16,
    lineHeight: 21,
    fontWeight: '600',
    fontFamily: Fonts.serif,
  },
  done: {
    borderRadius: 999,
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  doneLabel: {
    color: '#ffffff',
    fontSize: 13,
    lineHeight: 16,
    fontWeight: '700',
  },
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingRight: Spacing.two,
  },
  pill: {
    borderWidth: 1,
    borderRadius: 999,
    paddingVertical: 7,
    paddingHorizontal: 12,
  },
  pillLabel: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -4,
  },
  keyCell: {
    width: '25%',
    padding: 4,
  },
  key: {
    minHeight: 50,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    paddingHorizontal: 4,
  },
  templateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingRight: Spacing.two,
  },
  templateChip: {
    borderRadius: 999,
    borderWidth: 1,
    paddingVertical: 7,
    paddingHorizontal: 12,
  },
  templateLabel: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '700',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  segment: {
    flexDirection: 'row',
    alignItems: 'stretch',
    borderWidth: 1,
    borderRadius: 999,
    overflow: 'hidden',
  },
  segmentHalf: {
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  segmentLabel: {
    fontSize: 12,
    lineHeight: 15,
    fontWeight: '700',
  },
  ghostBtn: {
    borderWidth: 1,
    borderRadius: 999,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  ghostLabel: {
    fontSize: 12,
    lineHeight: 15,
    fontWeight: '700',
  },
  footerSpacer: {
    flex: 1,
  },
  deleteBtn: {
    minWidth: 48,
    borderRadius: 999,
    paddingVertical: 8,
    paddingHorizontal: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteLabel: {
    fontSize: 12,
    lineHeight: 15,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
});
