import katex from 'katex';
import {
  createKaTeXHTML,
} from '@adheil_gupta/react-native-latex-renderer';

import { injectKatexThemeColor, sanitizeLatex } from '@/lib/math-preprocess';

export type KatexRenderResult =
  | { ok: true; html: string; latex: string; displayMode: boolean }
  | { ok: false; source: string };

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

type RenderAttempt =
  | { ok: true; html: string; latex: string; displayMode: boolean; hasError: boolean }
  | { ok: false };

const KATEX_OPTIONS = {
  throwOnError: false as const,
  strict: 'ignore' as const,
  output: 'html' as const,
  trust: false as const,
};

function wrapAligned(latex: string): string {
  if (/\\begin\{(?:align|aligned|gather|gathered|cases|split)\*?\}/.test(latex)) return latex;
  return `\\begin{aligned}${latex}\\end{aligned}`;
}

function renderOnce(latex: string, displayMode: boolean): RenderAttempt {
  try {
    const html = katex.renderToString(latex, {
      ...KATEX_OPTIONS,
      displayMode,
    });
    if (!html) return { ok: false };
    return {
      ok: true,
      html,
      latex,
      displayMode,
      hasError: html.includes('katex-error'),
    };
  } catch {
    return { ok: false };
  }
}

/** Render LaTeX with KaTeX. Keep output even with katex-error; retry display/aligned. */
export function tryRenderKatex(latex: string, displayMode: boolean): KatexRenderResult {
  const trimmed = sanitizeLatex(latex);
  if (!trimmed) {
    return { ok: false, source: '' };
  }

  const attempts: RenderAttempt[] = [renderOnce(trimmed, displayMode)];

  if (!displayMode) {
    attempts.push(renderOnce(trimmed, true));
  }

  if (/&/.test(trimmed) && !/\\begin\{/.test(trimmed)) {
    attempts.push(renderOnce(wrapAligned(trimmed), true));
  }

  const clean = attempts.find((attempt) => attempt.ok && !attempt.hasError);
  if (clean && clean.ok) {
    return { ok: true, html: clean.html, latex: clean.latex, displayMode: clean.displayMode };
  }

  const any = attempts.find((attempt) => attempt.ok);
  if (any && any.ok) {
    return { ok: true, html: any.html, latex: any.latex, displayMode: any.displayMode };
  }

  return { ok: false, source: trimmed };
}

/**
 * Wrap sanitized LaTeX for a native WebView.
 * createKaTeXHTML auto-renders `$` / `$$` delimiters with bundled KaTeX (no CDN).
 */
export function wrapKatexHtmlForWebView(
  latex: string,
  color: string,
  displayMode: boolean,
): string {
  const trimmed = sanitizeLatex(latex);
  if (!trimmed) return '';

  const safe = escapeHtml(trimmed);
  const delimited = displayMode
    ? `<div style="text-align:center;width:100%;overflow-x:auto;">$$${safe}$$</div>`
    : `$${safe}$`;

  const html = createKaTeXHTML(
    delimited,
    {
      'font-size': displayMode ? '18px' : '16px',
      'line-height': displayMode ? '1.8' : '1.5',
      color,
      'background-color': 'transparent',
      padding: displayMode ? '4px 0' : '0',
      width: displayMode ? '100%' : 'auto',
    },
    {
      color,
      'font-size': displayMode ? '1.12em' : '1em',
      'line-height': displayMode ? '1.6' : '1.4',
    },
  );

  const withoutReset = html.replace(
    /\*\s*\{\s*margin:\s*0\s*!important;\s*padding:\s*0\s*!important;\s*\}/g,
    '* { box-sizing: border-box; } html, body { margin: 0; padding: 0; }',
  );

  return injectKatexThemeColor(withoutReset, color);
}
