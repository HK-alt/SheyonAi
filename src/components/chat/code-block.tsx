import * as Clipboard from 'expo-clipboard';
import { useMemo, useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Fonts, Spacing } from '@/constants/theme';
import { useThemePreference } from '@/context/theme-preference-context';
import { CODE_FONT_SIZE, CODE_LINE_HEIGHT, highlightLine } from '@/lib/code-highlight';
import {
  COLLAPSE_THRESHOLD,
  detectDiffLine,
  hasDiffLines,
} from '@/lib/code-block-utils';
import { resolveLanguage } from '@/lib/code-syntax-theme';
import { useTheme } from '@/hooks/use-theme';

type CodeBlockProps = {
  content: string;
  language: string;
};

function HeaderAction({
  label,
  active,
  onPress,
  theme,
}: {
  label: string;
  active?: boolean;
  onPress: () => void;
  theme: ReturnType<typeof useTheme>;
}) {
  return (
    <Pressable
      onPress={onPress}
      hitSlop={6}
      style={({ pressed }) => [
        styles.headerAction,
        {
          backgroundColor: active ? theme.accentMuted : theme.backgroundElement,
          borderColor: active ? theme.accent : theme.codeBorder,
          opacity: pressed ? 0.8 : 1,
        },
      ]}>
      <ThemedText
        type="small"
        style={[styles.headerActionLabel, { color: active ? theme.accent : theme.textSecondary }]}>
        {label}
      </ThemedText>
    </Pressable>
  );
}

export function CodeBlock({ content, language }: CodeBlockProps) {
  const theme = useTheme();
  const { resolvedScheme } = useThemePreference();
  const isDark = resolvedScheme === 'dark';
  const [copied, setCopied] = useState(false);
  const [wordWrap, setWordWrap] = useState(true);
  const [expanded, setExpanded] = useState(false);

  const lines = useMemo(() => content.split('\n'), [content]);
  const langMeta = useMemo(() => resolveLanguage(language), [language]);
  const isDiff = useMemo(() => hasDiffLines(lines), [lines]);
  const isCollapsible = lines.length > COLLAPSE_THRESHOLD;
  const visibleLines = isCollapsible && !expanded ? lines.slice(0, COLLAPSE_THRESHOLD) : lines;
  const hiddenCount = lines.length - COLLAPSE_THRESHOLD;

  async function handleCopy() {
    await Clipboard.setStringAsync(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  function diffBackground(kind: ReturnType<typeof detectDiffLine>) {
    if (kind === 'added') return theme.codeDiffAdded;
    if (kind === 'removed') return theme.codeDiffRemoved;
    if (kind === 'hunk') return theme.codeDiffHunk;
    return undefined;
  }

  const codeBody = (
    <View style={styles.body}>
      <View
        style={[
          styles.gutter,
          {
            backgroundColor: theme.codeGutterBackground,
            borderRightColor: theme.codeBorder,
          },
        ]}>
        {visibleLines.map((_, index) => (
          <Text key={`ln-${index}`} style={[styles.lineNumber, { color: theme.codeLineNumber }]}>
            {index + 1}
          </Text>
        ))}
      </View>
      <View style={[styles.codeColumn, wordWrap && styles.codeColumnWrap]}>
        {visibleLines.map((line, index) => {
          const diffKind = isDiff ? detectDiffLine(line) : 'none';
          return (
            <View
              key={`line-${index}`}
              style={[
                styles.codeLine,
                diffBackground(diffKind) ? { backgroundColor: diffBackground(diffKind) } : undefined,
              ]}>
              {highlightLine(line, language, isDark)}
            </View>
          );
        })}
      </View>
    </View>
  );

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: theme.codePanelBackground,
          borderColor: theme.codeBorder,
          ...Platform.select({
            ios: {
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: isDark ? 0.35 : 0.06,
              shadowRadius: 8,
            },
            android: { elevation: 2 },
            default: {},
          }),
        },
      ]}>
      <View
        style={[
          styles.header,
          {
            backgroundColor: theme.codeHeaderBackground,
            borderBottomColor: theme.codeBorder,
          },
        ]}>
        <View style={styles.headerLeft}>
          <View style={styles.trafficLights}>
            <View style={[styles.dot, { backgroundColor: '#FF5F57' }]} />
            <View style={[styles.dot, { backgroundColor: '#FEBC2E' }]} />
            <View style={[styles.dot, { backgroundColor: '#28C840' }]} />
          </View>
          <View style={[styles.langBadge, { backgroundColor: `${langMeta.accent}22` }]}>
            <View style={[styles.langDot, { backgroundColor: langMeta.accent }]} />
            <ThemedText type="small" style={[styles.langLabel, { color: langMeta.accent }]}>
              {langMeta.label}
            </ThemedText>
          </View>
        </View>
        <View style={styles.headerActions}>
          <HeaderAction
            label={wordWrap ? 'Wrap' : 'Scroll'}
            active={wordWrap}
            onPress={() => setWordWrap((prev) => !prev)}
            theme={theme}
          />
          <HeaderAction
            label={copied ? 'Copied' : 'Copy'}
            active={copied}
            onPress={() => void handleCopy()}
            theme={theme}
          />
        </View>
      </View>

      {wordWrap ? (
        <View style={styles.scrollBody}>{codeBody}</View>
      ) : (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} nestedScrollEnabled>
          {codeBody}
        </ScrollView>
      )}

      {isCollapsible && (
        <Pressable
          onPress={() => setExpanded((prev) => !prev)}
          style={[styles.expandFooter, { borderTopColor: theme.codeBorder, backgroundColor: theme.codeHeaderBackground }]}>
          <ThemedText type="small" style={{ color: theme.accent, fontWeight: '600' }}>
            {expanded ? 'Show less' : `Show ${hiddenCount} more line${hiddenCount === 1 ? '' : 's'}`}
          </ThemedText>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 14,
    borderWidth: 1,
    overflow: 'hidden',
    marginVertical: Spacing.two,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.three,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: Spacing.two,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    flexShrink: 1,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
  },
  headerAction: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
  },
  headerActionLabel: {
    fontWeight: '600',
    fontSize: 12,
    lineHeight: 16,
  },
  trafficLights: {
    flexDirection: 'row',
    gap: 6,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  langBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  langDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  langLabel: {
    fontWeight: '600',
    fontSize: 12,
    lineHeight: 16,
  },
  scrollBody: {
    width: '100%',
  },
  body: {
    flexDirection: 'row',
    minWidth: '100%',
  },
  gutter: {
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.two,
    borderRightWidth: StyleSheet.hairlineWidth,
    alignItems: 'flex-end',
    minWidth: 40,
  },
  lineNumber: {
    fontFamily: Fonts.mono,
    fontSize: 12,
    lineHeight: CODE_LINE_HEIGHT,
    minWidth: 24,
    textAlign: 'right',
  },
  codeColumn: {
    flex: 1,
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.three,
  },
  codeColumnWrap: {
    flexShrink: 1,
  },
  codeLine: {
    minHeight: CODE_LINE_HEIGHT,
    justifyContent: 'center',
    borderRadius: 4,
    paddingHorizontal: 2,
  },
  expandFooter: {
    alignItems: 'center',
    paddingVertical: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
});
