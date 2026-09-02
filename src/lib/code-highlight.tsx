import { Fragment, type ReactNode } from 'react';
import { Text } from 'react-native';

import { Fonts } from '@/constants/theme';
import {
  SYNTAX_DARK,
  SYNTAX_LIGHT,
  resolveLanguage,
  styleForToken,
  type SyntaxTheme,
} from '@/lib/code-syntax-theme';
import { Prism, ensurePrismLanguages } from '@/lib/prism-setup';

export const CODE_FONT_SIZE = 14;
export const CODE_LINE_HEIGHT = 24;

type Token = import('prismjs').Token;

const BASE_TEXT_STYLE = {
  fontFamily: Fonts.mono,
  fontSize: CODE_FONT_SIZE,
  lineHeight: CODE_LINE_HEIGHT,
} as const;

function tokenTextStyle(type: string | undefined, syntax: SyntaxTheme) {
  if (!type) {
    return { ...BASE_TEXT_STYLE, color: syntax.plain };
  }
  const { color, fontStyle, fontWeight } = styleForToken(type, syntax);
  return {
    ...BASE_TEXT_STYLE,
    color,
    ...(fontStyle ? { fontStyle } : null),
    ...(fontWeight ? { fontWeight } : null),
  };
}

function getGrammar(prismId: string): import('prismjs').Grammar | null {
  ensurePrismLanguages();
  if (prismId === 'plain') return null;
  const grammar = Prism.languages[prismId];
  return grammar ?? null;
}

function inheritColorForContainer(type: string, syntax: SyntaxTheme): string | undefined {
  const parts = type.split(/\s+/).filter(Boolean);
  if (parts.some((part) => part.startsWith('language-'))) return undefined;
  if (parts.includes('attr-name') || parts.includes('special-attr')) return syntax.attrName;
  if (parts.includes('attr-value')) return syntax.attrValue;
  if (parts.includes('tag') || parts.includes('doctype')) return syntax.tag;
  return undefined;
}

function renderTokens(
  tokens: (string | Token)[],
  syntax: SyntaxTheme,
  keyPrefix = '',
  inheritedColor?: string,
): ReactNode[] {
  return tokens.map((token, index) => {
    const key = `${keyPrefix}${index}`;
    if (typeof token === 'string') {
      const color = inheritedColor ?? syntax.plain;
      return (
        <Text key={key} style={{ ...BASE_TEXT_STYLE, color }}>
          {token}
        </Text>
      );
    }

    const content = token.content;

    if (typeof content === 'string') {
      return (
        <Text key={key} style={tokenTextStyle(token.type, syntax)}>
          {content}
        </Text>
      );
    }

    const nested = Array.isArray(content) ? content : [content];
    const childInheritedColor = inheritColorForContainer(token.type, syntax) ?? inheritedColor;

    return (
      <Fragment key={key}>{renderTokens(nested, syntax, `${key}-`, childInheritedColor)}</Fragment>
    );
  });
}

export function highlightLine(line: string, language: string, isDark: boolean): ReactNode {
  const syntax = isDark ? SYNTAX_DARK : SYNTAX_LIGHT;
  const { prismId } = resolveLanguage(language);
  const grammar = getGrammar(prismId);

  if (!grammar) {
    return (
      <Text style={tokenTextStyle(undefined, syntax)} selectable>
        {line || ' '}
      </Text>
    );
  }

  const tokens = Prism.tokenize(line, grammar);

  return (
    <Text style={BASE_TEXT_STYLE} selectable>
      {renderTokens(tokens, syntax).map((node, i) => (
        <Fragment key={i}>{node}</Fragment>
      ))}
    </Text>
  );
}
