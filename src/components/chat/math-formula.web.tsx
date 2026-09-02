import { createElement, memo, useMemo } from 'react';

import { Fonts, Spacing } from '@/constants/theme';
import { useThemePreference } from '@/context/theme-preference-context';
import { useTheme } from '@/hooks/use-theme';
import { tryRenderKatex } from '@/lib/katex-render';
import { sanitizeLatex } from '@/lib/math-preprocess';

import 'katex/dist/katex.min.css';

type MathFormulaProps = {
  latex: string;
  displayMode?: boolean;
  color?: string;
  isStreaming?: boolean;
};

export const MathFormula = memo(function MathFormula({
  latex,
  displayMode = false,
  color,
}: MathFormulaProps) {
  const theme = useTheme();
  const { resolvedScheme } = useThemePreference();
  const textColor = color ?? theme.proseBody;
  const colorful =
    !color || color === theme.proseBody || color === theme.text || color === theme.proseHeading;

  const result = useMemo(() => tryRenderKatex(latex, displayMode), [latex, displayMode]);
  const effectiveDisplayMode = result.ok ? result.displayMode : displayMode;

  if (!result.ok) {
    const fallback = sanitizeLatex(latex);
    if (!fallback) return null;
    return createElement(effectiveDisplayMode ? 'div' : 'span', {
      className: effectiveDisplayMode ? 'math-fallback math-display' : 'math-fallback math-inline',
      style: displayMode
        ? {
            color: textColor,
            width: '100%',
            textAlign: 'center',
            fontStyle: 'italic',
            fontSize: 14,
            fontFamily: Fonts.mono,
            opacity: 0.8,
            marginTop: Spacing.two,
            marginBottom: Spacing.two,
          }
        : {
            color: textColor,
            display: 'inline',
            fontStyle: 'italic',
            fontSize: 14,
            fontFamily: Fonts.mono,
            opacity: 0.8,
            verticalAlign: 'baseline',
          },
    }, fallback);
  }

  const html = colorful
    ? result.html
    : `<style>
    .katex,.katex *,.katex-html,.katex-mathml,.base,.mord,.mrel,.mbin,.minner,.mop{
      color:${textColor}!important;
      fill:${textColor}!important;
    }
  </style>${result.html}`;

  const className = [
    effectiveDisplayMode ? 'math-display' : 'math-inline',
    colorful ? 'math-colorful' : '',
    colorful && resolvedScheme === 'dark' ? 'math-colorful-dark' : '',
  ]
    .filter(Boolean)
    .join(' ');

  if (effectiveDisplayMode) {
    return createElement('div', {
      className,
      style: {
        color: colorful ? undefined : textColor,
        width: '100%',
        textAlign: 'center',
        marginTop: Spacing.two,
        marginBottom: Spacing.two,
        overflowX: 'auto',
      },
      dangerouslySetInnerHTML: { __html: html },
    });
  }

  return createElement('span', {
    className,
    style: {
      color: colorful ? undefined : textColor,
      display: 'inline',
      verticalAlign: 'baseline',
      marginHorizontal: 1,
    },
    dangerouslySetInnerHTML: { __html: html },
  });
});
