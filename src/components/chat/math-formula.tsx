import { memo, useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { KatexWebView } from '@/components/chat/katex-webview';
import { Fonts, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { tryRenderKatex, wrapKatexHtmlForWebView } from '@/lib/katex-render';
import {
  formatSimpleInlineLatex,
  isSimpleInlineLatex,
  sanitizeLatex,
} from '@/lib/math-preprocess';

type MathFormulaProps = {
  latex: string;
  displayMode?: boolean;
  color?: string;
  /** Debounce WebView updates while tokens are still arriving. */
  isStreaming?: boolean;
};

const DEBOUNCE_MS = 80;

export const MathFormula = memo(function MathFormula({
  latex,
  displayMode = false,
  color,
  isStreaming = false,
}: MathFormulaProps) {
  const theme = useTheme();
  const textColor = color ?? theme.proseBody;
  const [debouncedLatex, setDebouncedLatex] = useState(latex);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const activeLatex = isStreaming ? debouncedLatex : latex;

  useEffect(() => {
    if (!isStreaming) {
      setDebouncedLatex((prev) => (prev === latex ? prev : latex));
      return;
    }
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      setDebouncedLatex(latex);
    }, DEBOUNCE_MS);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [latex, isStreaming]);

  const prettyInline = formatSimpleInlineLatex(activeLatex);
  const simpleInline =
    isSimpleInlineLatex(activeLatex) &&
    !!prettyInline &&
    !/[\\^_]/.test(prettyInline);

  const renderResult = useMemo(() => {
    if (simpleInline) return { ok: false as const, source: '' };
    return tryRenderKatex(activeLatex, displayMode);
  }, [activeLatex, displayMode, simpleInline]);

  const effectiveDisplayMode = renderResult.ok ? renderResult.displayMode : displayMode;

  const source = useMemo(() => {
    if (simpleInline || !renderResult.ok) return '';
    return wrapKatexHtmlForWebView(renderResult.latex, textColor, effectiveDisplayMode);
  }, [renderResult, textColor, effectiveDisplayMode, simpleInline]);

  if (simpleInline) {
    if (!prettyInline) return null;
    return (
      <Text
        style={[
          styles.simpleInline,
          displayMode && styles.simpleDisplay,
          { color: textColor },
        ]}>
        {prettyInline}
      </Text>
    );
  }

  if (!source) {
    if (isStreaming) return null;
    const fallbackText = sanitizeLatex(latex);
    if (!fallbackText) return null;
    return (
      <Text
        style={[
          styles.fallback,
          displayMode ? styles.fallbackBlock : styles.fallbackInline,
          { color: textColor },
        ]}>
        {fallbackText}
      </Text>
    );
  }

  return (
    <View style={effectiveDisplayMode ? styles.block : styles.inline}>
      <KatexWebView
        source={source}
        minHeight={effectiveDisplayMode ? 56 : 24}
        displayMode={effectiveDisplayMode}
      />
    </View>
  );
});

const styles = StyleSheet.create({
  simpleInline: {
    fontSize: 16,
    lineHeight: 24,
    fontStyle: 'italic',
    marginHorizontal: 1,
    alignSelf: 'center',
  },
  simpleDisplay: {
    fontSize: 22,
    lineHeight: 30,
    fontFamily: Fonts.serif,
    alignSelf: 'stretch',
    textAlign: 'center',
    marginVertical: Spacing.one,
  },
  inline: {
    alignSelf: 'center',
    marginHorizontal: 1,
  },
  block: {
    flexBasis: '100%',
    alignSelf: 'stretch',
    width: '100%',
    marginVertical: Spacing.one,
  },
  fallback: {
    fontFamily: Fonts.mono,
    fontSize: 13,
    opacity: 0.7,
  },
  fallbackInline: {
    fontStyle: 'italic',
  },
  fallbackBlock: {
    textAlign: 'center',
    marginVertical: Spacing.one,
  },
});
