import { openBrowserAsync, WebBrowserPresentationStyle } from 'expo-web-browser';
import { useEffect, useMemo, useRef, type ReactNode } from 'react';
import { Platform, ScrollView, StyleSheet, Text, View, type TextStyle } from 'react-native';
import Markdown, { type ASTNode, type RenderRules } from 'react-native-markdown-display';
import Animated, {
  Easing,
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { CalloutCard } from '@/components/chat/callout-card';
import { CodeBlock } from '@/components/chat/code-block';
import { MathFormula } from '@/components/chat/math-formula';
import { Fonts, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { detectCalloutKind } from '@/lib/markdown-enrich';
import { createMarkdownItWithMath, isMathFenceLanguage } from '@/lib/markdown-math';
import { preprocessMarkdown } from '@/lib/markdown-cleanup';
import {
  sanitizeLatex,
  splitTextWithInlineMath,
  type ProseTextStyle,
} from '@/lib/math-preprocess';

type Theme = ReturnType<typeof useTheme>;

/** Stable React key from node type + sibling index chain (survives markdown re-parses while streaming). */
function buildStableKey(node: ASTNode, parentNodes: ASTNode[] = []): string {
  const chain = [...parentNodes].reverse();
  const segments = chain.map((parent) => `${parent.type}-${parent.index}`);
  segments.push(`${node.type}-${node.index}`);
  return segments.join('/');
}

type MathKeyFn = (mode: 'inline' | 'block', latex: string) => string;

const INLINE_MARKUP_PATTERN = /(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`|==[^=]+==)/g;

function cleanProseFragment(text: string): string {
  return text
    .replace(/^---+\s*/g, '')
    .replace(/\s*---+\s*$/g, '')
    .replace(/^\s*#{1,6}\s*$/g, '')
    .replace(/^\s*\$\$\s*$/g, '');
}

function needsInlineFormatting(text: string): boolean {
  return /\*\*|\*(?!\*)|`|==/.test(text) || /^---+\s*/.test(text);
}

function importantHighlightStyle(theme: Theme): TextStyle {
  return {
    fontWeight: '700',
    color: theme.accent,
    backgroundColor: theme.accentMuted,
    borderRadius: 4,
    overflow: 'hidden',
    ...Platform.select({
      web: {
        display: 'inline',
        paddingLeft: 4,
        paddingRight: 4,
        paddingTop: 1,
        paddingBottom: 1,
      },
      default: {
        paddingHorizontal: 3,
      },
    }),
  };
}

function markHighlightStyle(theme: Theme): TextStyle {
  return {
    fontWeight: '700',
    color: theme.proseHeading,
    backgroundColor: withAlpha('#F59E0B', 0.28),
    borderRadius: 4,
    overflow: 'hidden',
    ...Platform.select({
      web: {
        display: 'inline',
        paddingLeft: 4,
        paddingRight: 4,
        paddingTop: 1,
        paddingBottom: 1,
      },
      default: {
        paddingHorizontal: 3,
      },
    }),
  };
}

function withAlpha(hex: string, alpha: number): string {
  const raw = hex.replace('#', '');
  const normalized =
    raw.length === 3
      ? raw
          .split('')
          .map((c) => c + c)
          .join('')
      : raw.slice(0, 6);
  const n = Number.parseInt(normalized, 16);
  if (Number.isNaN(n)) return hex;
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${alpha})`;
}

function getHighlightTail(fullContent: string): string {
  const plain = fullContent
    .replace(/```[\s\S]*$/, '')
    .replace(/[*_`]+/g, '')
    .replace(/\s+$/g, '');
  if (!plain) return '';
  if (!/\s/.test(plain.slice(-48))) {
    return plain.slice(-28);
  }
  return plain.match(/\S+(?:\s+\S+){0,2}$/)?.[0] ?? plain.slice(-28);
}

function splitNodeForHighlight(
  nodeContent: string,
  tail: string,
): { head: string; highlighted: string } | null {
  if (!tail || !nodeContent) return null;
  if (nodeContent.endsWith(tail)) {
    return {
      head: nodeContent.slice(0, nodeContent.length - tail.length),
      highlighted: tail,
    };
  }
  const trimmedNode = nodeContent.trimEnd();
  if (trimmedNode.endsWith(tail)) {
    return {
      head: trimmedNode.slice(0, trimmedNode.length - tail.length),
      highlighted: tail,
    };
  }
  if (trimmedNode.length >= 2 && tail.endsWith(trimmedNode)) {
    return { head: '', highlighted: nodeContent };
  }
  return null;
}

function StreamingTail({
  text,
  textStyle,
  theme,
}: {
  text: string;
  textStyle: TextStyle | Array<TextStyle | null | undefined>;
  theme: Theme;
}) {
  const progress = useSharedValue(0);
  const fromColor = withAlpha(theme.accent, 0.34);
  const toColor = theme.accentMuted;

  useEffect(() => {
    progress.value = 0;
    progress.value = withTiming(1, { duration: 280, easing: Easing.out(Easing.cubic) });
  }, [text, progress]);

  const animatedStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(progress.value, [0, 1], [fromColor, toColor]),
  }));

  return (
    <Animated.Text
      style={[
        textStyle,
        {
          color: theme.accent,
          borderRadius: 4,
          overflow: 'hidden',
          ...Platform.select({
            web: {
              display: 'inline',
              paddingLeft: 4,
              paddingRight: 4,
              paddingTop: 1,
              paddingBottom: 1,
            },
            default: {
              paddingHorizontal: 3,
            },
          }),
        },
        animatedStyle,
      ]}>
      {text}
    </Animated.Text>
  );
}

function renderFormattedInlineText(
  text: string,
  bodyStyle: ProseTextStyle,
  textColor: string | undefined,
  theme: Theme,
  key: string,
) {
  const cleaned = cleanProseFragment(text);
  if (!cleaned) return null;

  const webInline = Platform.OS === 'web' ? ({ display: 'inline' } as const) : { flexShrink: 1, minWidth: 0 };
  const resolvedColor =
    textColor ?? (typeof bodyStyle.color === 'string' ? bodyStyle.color : undefined);
  const baseStyle = [bodyStyle, resolvedColor ? { color: resolvedColor } : null, webInline];

  if (!needsInlineFormatting(cleaned)) {
    return (
      <Text key={key} style={baseStyle}>
        {cleaned}
      </Text>
    );
  }

  const nodes: ReactNode[] = [];
  let lastIndex = 0;
  let partIndex = 0;
  let match: RegExpExecArray | null;
  const pattern = new RegExp(INLINE_MARKUP_PATTERN.source, 'g');

  while ((match = pattern.exec(cleaned)) !== null) {
    if (match.index > lastIndex) {
      const plain = cleaned.slice(lastIndex, match.index);
      if (plain) {
        nodes.push(
          <Text key={`${key}-p-${partIndex++}`} style={baseStyle}>
            {plain}
          </Text>,
        );
      }
    }

    const token = match[0];
    if (token.startsWith('**')) {
      nodes.push(
        <Text
          key={`${key}-b-${partIndex++}`}
          style={[
            baseStyle,
            textColor ? { fontWeight: '700' } : importantHighlightStyle(theme),
          ]}>
          {token.slice(2, -2)}
        </Text>,
      );
    } else if (token.startsWith('==')) {
      nodes.push(
        <Text
          key={`${key}-m-${partIndex++}`}
          style={[baseStyle, textColor ? { fontWeight: '700' } : markHighlightStyle(theme)]}>
          {token.slice(2, -2)}
        </Text>,
      );
    } else if (token.startsWith('*')) {
      nodes.push(
        <Text
          key={`${key}-i-${partIndex++}`}
          style={[baseStyle, { fontStyle: 'italic' }]}>
          {token.slice(1, -1)}
        </Text>,
      );
    } else if (token.startsWith('`')) {
      nodes.push(
        <Text
          key={`${key}-c-${partIndex++}`}
          style={[
            baseStyle,
            {
              fontFamily: Fonts.mono,
              fontSize: 14,
              backgroundColor: theme.codeInlineBackground,
              color: theme.codeInlineText,
            },
          ]}>
          {token.slice(1, -1)}
        </Text>,
      );
    }

    lastIndex = match.index + token.length;
  }

  if (lastIndex < cleaned.length) {
    nodes.push(
      <Text key={`${key}-p-${partIndex}`} style={baseStyle}>
        {cleaned.slice(lastIndex)}
      </Text>,
    );
  }

  return (
    <Text key={key} style={baseStyle}>
      {nodes}
    </Text>
  );
}

function renderMaybeHighlightedText(
  content: string,
  bodyStyle: ProseTextStyle,
  textColor: string | undefined,
  theme: Theme,
  key: string,
  isStreaming: boolean,
  fullContent: string,
) {
  const split =
    isStreaming ? splitNodeForHighlight(content, getHighlightTail(fullContent)) : null;

  if (!split?.highlighted) {
    if (needsInlineFormatting(content)) {
      return renderFormattedInlineText(content, bodyStyle, textColor, theme, key);
    }
    const resolvedColor =
      textColor ?? (typeof bodyStyle.color === 'string' ? bodyStyle.color : undefined);
    return (
      <Text key={key} style={[bodyStyle, resolvedColor ? { color: resolvedColor } : null]}>
        {content}
      </Text>
    );
  }

  const resolvedColor =
    textColor ?? (typeof bodyStyle.color === 'string' ? bodyStyle.color : undefined);
  const baseStyle = [bodyStyle, resolvedColor ? { color: resolvedColor } : null];

  return (
    <Text key={key} style={baseStyle}>
      {split.head
        ? needsInlineFormatting(split.head)
          ? renderFormattedInlineText(split.head, bodyStyle, textColor, theme, `${key}-h`)
          : split.head
        : null}
      <StreamingTail text={split.highlighted} textStyle={baseStyle} theme={theme} />
    </Text>
  );
}

// ---------------------------------------------------------------------------
// Code fence
// ---------------------------------------------------------------------------

function flattenAstText(node: ASTNode): string {
  const chunks: string[] = [];
  if (typeof node.content === 'string' && node.content) chunks.push(node.content);
  if (Array.isArray(node.children)) {
    for (const child of node.children) chunks.push(flattenAstText(child));
  }
  return chunks.join('');
}

function trimFenceContent(content: string) {
  if (content.charAt(content.length - 1) === '\n') {
    return content.substring(0, content.length - 1);
  }
  return content;
}

function getFenceLanguage(node: ASTNode): string {
  const info = (node as ASTNode & { sourceInfo?: string }).sourceInfo;
  return typeof info === 'string' ? info.trim() : '';
}

// ---------------------------------------------------------------------------
// Table
// ---------------------------------------------------------------------------

/**
 * Renders a full markdown table with clean borders, sticky header, and
 * horizontal scroll support for wide tables.
 *
 * react-native-markdown-display gives us the fully-rendered children for
 * table / thead / tbody / tr / th / td, so we only need to wrap them in
 * the right container views with theme colours.
 */
function createTableRules(theme: Theme, stableKey: typeof buildStableKey): RenderRules {
  const border = theme.codeBorder;
  const headerBg = theme.backgroundElement;
  const altRowBg = theme.chatSurface;

  return {
    // Outermost wrapper: scroll horizontally if the table is wide
    table: (node, children, parentNodes) => (
      <ScrollView
        key={stableKey(node, parentNodes)}
        horizontal
        showsHorizontalScrollIndicator={false}
        style={[tableStyles.scrollView]}
        contentContainerStyle={tableStyles.scrollContent}>
        <View
          style={[
            tableStyles.table,
            { borderColor: border },
          ]}>
          {children}
        </View>
      </ScrollView>
    ),

    // Table header section
    thead: (node, children, parentNodes) => (
      <View
        key={stableKey(node, parentNodes)}
        style={[tableStyles.thead, { backgroundColor: headerBg }]}>
        {children}
      </View>
    ),

    // Table body section
    tbody: (node, children, parentNodes) => (
      <View key={stableKey(node, parentNodes)} style={tableStyles.tbody}>
        {children}
      </View>
    ),

    // Each row
    tr: (node, children, parentNodes) => {
      const parent = parentNodes[0];
      const isLast =
        parent && Array.isArray(parent.children)
          ? node.index === parent.children.length - 1
          : false;

      // Alternate body rows for readability
      const isEven = node.index % 2 === 1;

      return (
        <View
          key={stableKey(node, parentNodes)}
          style={[
            tableStyles.tr,
            !isLast && { borderBottomColor: border, borderBottomWidth: StyleSheet.hairlineWidth },
            isEven && { backgroundColor: altRowBg },
          ]}>
          {children}
        </View>
      );
    },

    // Header cell
    th: (node, children, parentNodes) => {
      const parent = parentNodes[0];
      const isLast =
        parent && Array.isArray(parent.children)
          ? node.index === parent.children.length - 1
          : false;

      return (
        <View
          key={stableKey(node, parentNodes)}
          style={[
            tableStyles.th,
            !isLast && { borderRightColor: border, borderRightWidth: StyleSheet.hairlineWidth },
          ]}>
          {children}
        </View>
      );
    },

    // Data cell
    td: (node, children, parentNodes) => {
      const parent = parentNodes[0];
      const isLast =
        parent && Array.isArray(parent.children)
          ? node.index === parent.children.length - 1
          : false;

      return (
        <View
          key={stableKey(node, parentNodes)}
          style={[
            tableStyles.td,
            !isLast && { borderRightColor: border, borderRightWidth: StyleSheet.hairlineWidth },
          ]}>
          {children}
        </View>
      );
    },
  };
}

// ---------------------------------------------------------------------------
// Markdown styles
// ---------------------------------------------------------------------------

function createMarkdownStyles(theme: Theme, textColor?: string) {
  const bodyColor = textColor ?? theme.proseBody;
  const headingColor = textColor ?? theme.proseHeading;

  return StyleSheet.create({
    body: {
      color: bodyColor,
      fontSize: 16,
      lineHeight: 24,
    },
    paragraph: {
      marginTop: 0,
      marginBottom: Spacing.two,
    },
    heading1: {
      color: headingColor,
      fontSize: 24,
      lineHeight: 32,
      fontWeight: '700',
      letterSpacing: -0.4,
      marginBottom: Spacing.two,
    },
    heading2: {
      color: headingColor,
      fontSize: 20,
      lineHeight: 28,
      fontWeight: '700',
      letterSpacing: -0.2,
      marginBottom: Spacing.two,
    },
    heading3: {
      color: headingColor,
      fontSize: 18,
      lineHeight: 26,
      fontWeight: '700',
      marginBottom: Spacing.one,
    },
    heading4: {
      color: headingColor,
      fontSize: 17,
      lineHeight: 24,
      fontWeight: '600',
      marginBottom: Spacing.one,
    },
    heading5: {
      color: headingColor,
      fontSize: 16,
      lineHeight: 22,
      fontWeight: '600',
      marginBottom: Spacing.one,
    },
    heading6: {
      color: headingColor,
      fontSize: 15,
      lineHeight: 22,
      fontWeight: '600',
      marginBottom: Spacing.one,
    },
    strong: textColor
      ? {
          fontWeight: '700',
          color: headingColor,
        }
      : importantHighlightStyle(theme),
    em: {
      fontStyle: 'italic',
      color: bodyColor,
    },
    textgroup: Platform.select({
      web: {
        display: 'inline',
      },
      default: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        alignItems: 'center',
        minWidth: 0,
      },
    }),
    text: {
      color: bodyColor,
      ...Platform.select({
        web: { display: 'inline' as const },
        default: { flexShrink: 1, minWidth: 0 },
      }),
    },
    s: {
      textDecorationLine: 'line-through',
      color: theme.textSecondary,
    },
    link: {
      color: theme.accent,
      textDecorationLine: 'underline',
    },
    blockquote: {
      backgroundColor: theme.backgroundElement,
      borderColor: theme.accent,
      borderLeftWidth: 3,
      paddingHorizontal: Spacing.three,
      paddingVertical: Spacing.two,
      marginVertical: Spacing.two,
      color: theme.proseMuted,
    },
    bullet_list: {
      marginBottom: Spacing.two,
    },
    ordered_list: {
      marginBottom: Spacing.two,
    },
    list_item: {
      marginBottom: Spacing.one,
    },
    bullet_list_icon: {
      marginLeft: 0,
      marginRight: Spacing.two,
      color: theme.accent,
      lineHeight: 24,
      fontSize: 16,
    },
    ordered_list_icon: {
      marginLeft: 0,
      marginRight: Spacing.two,
      color: theme.accent,
      lineHeight: 24,
      fontSize: 16,
      minWidth: 20,
    },
    bullet_list_content: Platform.select({
      web: {
        flex: 1,
        minWidth: 0,
        flexDirection: 'column',
        alignItems: 'stretch',
      },
      default: {
        flex: 1,
        minWidth: 0,
        flexDirection: 'row',
        flexWrap: 'wrap',
        alignItems: 'flex-start',
        flexShrink: 1,
      },
    }),
    ordered_list_content: Platform.select({
      web: {
        flex: 1,
        minWidth: 0,
        flexDirection: 'column',
        alignItems: 'stretch',
      },
      default: {
        flex: 1,
        minWidth: 0,
        flexDirection: 'row',
        flexWrap: 'wrap',
        alignItems: 'flex-start',
        flexShrink: 1,
      },
    }),
    code_inline: {
      fontFamily: Fonts.mono,
      fontSize: 14,
      color: theme.codeInlineText,
      backgroundColor: theme.codeInlineBackground,
      borderColor: theme.codeBorder,
      borderWidth: StyleSheet.hairlineWidth,
      borderRadius: 6,
      paddingHorizontal: 6,
      paddingVertical: 2,
    },
    fence: {
      fontFamily: Fonts.mono,
      fontSize: 13,
      lineHeight: 20,
      color: theme.text,
      backgroundColor: theme.codeBackground,
      borderColor: theme.codeBorder,
      borderWidth: 1,
      borderRadius: 12,
      padding: Spacing.three,
      marginVertical: Spacing.two,
    },
    code_block: {
      fontFamily: Fonts.mono,
      fontSize: 13,
      lineHeight: 20,
      color: theme.text,
      backgroundColor: theme.codeBackground,
      borderColor: theme.codeBorder,
      borderWidth: 1,
      borderRadius: 12,
      padding: Spacing.three,
      marginVertical: Spacing.two,
    },
    hr: {
      backgroundColor: theme.composerBorder,
      height: StyleSheet.hairlineWidth,
      marginVertical: Spacing.three,
    },
    // Table base styles (most overridden by custom rules above)
    table: {
      marginVertical: Spacing.two,
    },
    thead: {},
    tbody: {},
    th: {
      color: theme.text,
      fontWeight: '700',
      fontSize: 14,
      lineHeight: 20,
    },
    td: {
      color: theme.text,
      fontSize: 14,
      lineHeight: 20,
    },
    tr: {},
  });
}

// ---------------------------------------------------------------------------
// Public component
// ---------------------------------------------------------------------------

type MarkdownTextProps = {
  content: string;
  /** Override prose text color (e.g. user bubble). */
  textColor?: string;
  /** While the assistant is still generating, close open math delimiters for live rendering. */
  isStreaming?: boolean;
};

function renderMixedText(
  content: string,
  textColor: string | undefined,
  bodyStyle: ProseTextStyle,
  keyPrefix: string,
  mathKey: MathKeyFn,
  isStreaming: boolean,
  theme: Theme,
  fullContent: string,
) {
  const parts = splitTextWithInlineMath(content);
  if (parts.length === 1 && parts[0].kind === 'text') {
    return null;
  }

  return parts.map((part, index) =>
    part.kind === 'math' ? (
      <View
        key={mathKey(part.displayMode ? 'block' : 'inline', part.value)}
        style={part.displayMode ? wrapperStyles.mathBlock : wrapperStyles.mathInline}>
        <MathFormula
          latex={part.value}
          displayMode={part.displayMode}
          color={
            textColor ?? (typeof bodyStyle.color === 'string' ? bodyStyle.color : undefined)
          }
          isStreaming={isStreaming}
        />
      </View>
    ) : part.value.length > 0 ? (
      renderMaybeHighlightedText(
        part.value,
        bodyStyle,
        textColor,
        theme,
        `${keyPrefix}-x-${index}`,
        isStreaming,
        fullContent,
      )
    ) : null,
  );
}

function createMathRules(
  getTextColor: () => string | undefined,
  mathKey: MathKeyFn,
  getIsStreaming: () => boolean,
  getContent: () => string,
  theme: Theme,
): RenderRules {
  return {
    body: (node, children, _parentNodes, styles) => (
      <View key="markdown-body" style={styles._VIEW_SAFE_body}>
        {children}
      </View>
    ),
    math_inline: (node: ASTNode) => {
      if (!sanitizeLatex(node.content)) return null;
      const textColor = getTextColor();
      const displayMode =
        node.content.includes('\n') || /\\begin\{/.test(node.content);
      return (
        <View
          key={mathKey(displayMode ? 'block' : 'inline', node.content)}
          style={displayMode ? wrapperStyles.mathBlock : wrapperStyles.mathInline}>
          <MathFormula
            latex={node.content}
            displayMode={displayMode}
            color={textColor}
            isStreaming={getIsStreaming()}
          />
        </View>
      );
    },
    math_block: (node: ASTNode, _children, parentNodes) => {
      if (!sanitizeLatex(node.content)) return null;
      const textColor = getTextColor();
      return (
        <View key={buildStableKey(node, parentNodes)} style={wrapperStyles.mathBlock}>
          <MathFormula
            key={mathKey('block', node.content)}
            latex={node.content}
            displayMode
            color={textColor}
            isStreaming={getIsStreaming()}
          />
        </View>
      );
    },
    textgroup: (node, children, parentNodes) => (
      <View key={buildStableKey(node, parentNodes)} style={wrapperStyles.textgroup}>
        {children}
      </View>
    ),
    paragraph: (node, children, parentNodes, styles) => (
      <View
        key={buildStableKey(node, parentNodes)}
        style={[styles._VIEW_SAFE_paragraph, wrapperStyles.paragraph]}>
        {children}
      </View>
    ),
    blockquote: (node, children, parentNodes, styles) => {
      const kind = getTextColor() ? null : detectCalloutKind(flattenAstText(node));
      if (kind) {
        return (
          <CalloutCard key={buildStableKey(node, parentNodes)} kind={kind}>
            {children}
          </CalloutCard>
        );
      }
      return (
        <View
          key={buildStableKey(node, parentNodes)}
          style={[styles._VIEW_SAFE_blockquote, styles.blockquote]}>
          {children}
        </View>
      );
    },
    text: (node, children, parentNodes, styles, inheritedStyles = {}) => {
      const bodyStyle: ProseTextStyle = {
        ...StyleSheet.flatten([inheritedStyles, styles.text, styles.body]),
      };
      const pathKey = buildStableKey(node, parentNodes);
      const textColor = getTextColor();
      const isStreaming = getIsStreaming();
      const fullContent = getContent();
      const mixed = renderMixedText(
        node.content,
        textColor,
        bodyStyle,
        pathKey,
        mathKey,
        isStreaming,
        theme,
        fullContent,
      );
      if (mixed) {
        return (
          <View key={pathKey} style={wrapperStyles.textgroup}>
            {mixed}
          </View>
        );
      }
      return renderMaybeHighlightedText(
        node.content,
        bodyStyle,
        textColor,
        theme,
        pathKey,
        isStreaming,
        fullContent,
      );
    },
  };
}

export function MarkdownText({ content, textColor, isStreaming = false }: MarkdownTextProps) {
  const theme = useTheme();
  const textColorRef = useRef(textColor);
  textColorRef.current = textColor;
  const isStreamingRef = useRef(isStreaming);
  isStreamingRef.current = isStreaming;

  const processedContent = useMemo(
    () => preprocessMarkdown(content, { isStreaming }),
    [content, isStreaming],
  );
  const contentRef = useRef(processedContent);
  contentRef.current = processedContent;
  const mdStyles = useMemo(() => createMarkdownStyles(theme, textColor), [theme, textColor]);
  const markdownit = useMemo(() => createMarkdownItWithMath(), []);
  const mathOccurrenceRef = useRef(0);

  const rules = useMemo<RenderRules>(() => {
    const mathKey: MathKeyFn = (mode, _latex) =>
      `math-${mode}-${mathOccurrenceRef.current++}`;

    return {
      fence: (node: ASTNode, _children, parentNodes) => {
        const language = getFenceLanguage(node);
        const pathKey = buildStableKey(node, parentNodes);
        if (isMathFenceLanguage(language)) {
          const fenceLatex = trimFenceContent(node.content);
          return (
            <View key={pathKey} style={wrapperStyles.mathBlock}>
              <MathFormula
                key={mathKey('block', fenceLatex)}
                latex={fenceLatex}
                displayMode
                color={textColorRef.current}
                isStreaming={isStreamingRef.current}
              />
            </View>
          );
        }
        return (
          <CodeBlock
            key={pathKey}
            content={trimFenceContent(node.content)}
            language={language}
          />
        );
      },
      ...createMathRules(
        () => textColorRef.current,
        mathKey,
        () => isStreamingRef.current,
        () => contentRef.current,
        theme,
      ),
      ...createTableRules(theme, buildStableKey),
    };
  }, [theme]);

  mathOccurrenceRef.current = 0;

  if (!processedContent.trim()) return null;

  return (
    <View style={wrapperStyles.container}>
      <Markdown
        mergeStyle
        style={mdStyles}
        markdownit={markdownit}
        rules={rules}
        onLinkPress={(url) => {
          if (process.env.EXPO_OS !== 'web') {
            void openBrowserAsync(url, {
              presentationStyle: WebBrowserPresentationStyle.AUTOMATIC,
            });
            return false;
          }
          return true;
        }}>
        {processedContent}
      </Markdown>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Shared static styles
// ---------------------------------------------------------------------------

const wrapperStyles = StyleSheet.create({
  container: {
    alignSelf: 'stretch',
  },
  paragraph: Platform.select({
    web: {
      display: 'block',
      marginTop: 0,
      marginBottom: Spacing.two,
    },
    default: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      alignItems: 'flex-start',
      minWidth: 0,
      marginTop: 0,
      marginBottom: Spacing.two,
    },
  }),
  textgroup: Platform.select({
    web: {
      display: 'inline',
    },
    default: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      alignItems: 'flex-start',
      minWidth: 0,
      flexShrink: 1,
    },
  }),
  mathInline: Platform.select({
    web: {
      display: 'inline',
    },
    default: {
      alignSelf: 'center',
    },
  }),
  mathBlock: {
    flexBasis: '100%',
    width: '100%',
    alignItems: 'center',
    alignSelf: 'stretch',
    marginVertical: Spacing.one,
  },
});

const tableStyles = StyleSheet.create({
  scrollView: {
    marginVertical: Spacing.two,
  },
  scrollContent: {
    flexGrow: 1,
  },
  table: {
    borderWidth: 1,
    borderRadius: 10,
    overflow: 'hidden',
    alignSelf: 'flex-start',
    minWidth: '100%',
  },
  thead: {},
  tbody: {},
  tr: {
    flexDirection: 'row',
  },
  th: {
    paddingVertical: 10,
    paddingHorizontal: Spacing.three,
    minWidth: 100,
    flexShrink: 0,
    justifyContent: 'center',
  },
  td: {
    paddingVertical: 10,
    paddingHorizontal: Spacing.three,
    minWidth: 100,
    flexShrink: 0,
    justifyContent: 'center',
  },
});
