import { hasExplicitMathDelimiters, hasMathContent } from '@/lib/math-preprocess';

export type TextSelection = {
  start: number;
  end: number;
};

export type LatexInsertResult = {
  text: string;
  cursor: number;
};

/**
 * Convert a palette snippet (`|` caret) into MathLive insert syntax (`#0` placeholder).
 * Leaves `\left|` / `\right|` and `\|` untouched.
 */
export function toMathLiveInsert(snippet: string): string {
  let out = '';
  for (let i = 0; i < snippet.length; i++) {
    if (snippet[i] !== '|') {
      out += snippet[i];
      continue;
    }
    const before = snippet.slice(Math.max(0, i - 6), i);
    if (before.endsWith('\\') || /\\left$/.test(before) || /\\right$/.test(before)) {
      out += '|';
      continue;
    }
    out += '#0';
  }
  return out;
}

/** Insert a LaTeX snippet, honoring a single `|` caret marker. */
export function insertLatex(
  text: string,
  selection: TextSelection,
  snippet: string,
): LatexInsertResult {
  const start = clamp(Math.min(selection.start, selection.end), 0, text.length);
  const end = clamp(Math.max(selection.start, selection.end), start, text.length);
  const caretIndex = snippet.indexOf('|');
  const body = caretIndex >= 0 ? snippet.slice(0, caretIndex) + snippet.slice(caretIndex + 1) : snippet;
  const next = text.slice(0, start) + body + text.slice(end);
  const cursor = start + (caretIndex >= 0 ? caretIndex : body.length);
  return { text: next, cursor };
}

/**
 * Jump to the next empty `{}` group after `from`, wrapping around.
 * Returns null when there is nowhere new to go.
 */
export function nextEmptyGroup(text: string, from: number): TextSelection | null {
  const positions: number[] = [];
  for (let i = 0; i < text.length - 1; i++) {
    if (text.startsWith('\\placeholder{}', i)) {
      positions.push(i + '\\placeholder{'.length);
      i += '\\placeholder{}'.length - 1;
      continue;
    }
    if (text[i] === '{' && text[i + 1] === '}') {
      positions.push(i + 1);
    }
  }
  if (positions.length === 0) return null;

  const next = positions.find((position) => position > from);
  if (next != null) return { start: next, end: next };

  const first = positions[0];
  if (first !== from) return { start: first, end: first };
  return null;
}

/** Latex body to feed KaTeX from composer text (unwraps $ / $$ when present). */
export function previewLatex(text: string): string {
  const trimmed = text.trim();
  if (!trimmed) return '';

  const displayBlocks = [...trimmed.matchAll(/\$\$([\s\S]+?)\$\$/g)].map((match) => match[1].trim());
  if (displayBlocks.length > 0) return displayBlocks.join(' \\\\ ');

  const inline: string[] = [];
  const inlineRe = /\$([^$\n]+?)\$/g;
  let match: RegExpExecArray | null;
  while ((match = inlineRe.exec(trimmed)) !== null) {
    if (match[1]) inline.push(match[1].trim());
  }
  if (inline.length > 0) return inline.join(' \\quad ');

  return trimmed;
}

const VISUAL_CARET = '{\\color{#2563EB}\\rule{0.08em}{1.02em}}';

export type LatexGroup = {
  open: number;
  close: number;
  innerStart: number;
  innerEnd: number;
};

/** Brace groups in `text`, skipping escaped braces and `\begin{env}` / `\end{env}` names. */
export function listLatexGroups(text: string): LatexGroup[] {
  const groups: LatexGroup[] = [];
  const stack: number[] = [];
  for (let i = 0; i < text.length; i++) {
    if (text[i] === '\\' && i + 1 < text.length) {
      i += 1;
      continue;
    }
    if (text[i] === '{') {
      stack.push(i);
    } else if (text[i] === '}' && stack.length > 0) {
      const open = stack.pop()!;
      groups.push({ open, close: i, innerStart: open + 1, innerEnd: i });
    }
  }
  return groups.filter((group) => !isEnvironmentNameGroup(text, group));
}

/** Innermost group whose interior contains `cursor`. */
export function groupContaining(text: string, cursor: number): LatexGroup | null {
  const enclosed = listLatexGroups(text).filter(
    (group) => cursor >= group.innerStart && cursor <= group.innerEnd,
  );
  if (enclosed.length === 0) return null;
  return enclosed.reduce((smallest, group) =>
    group.close - group.open < smallest.close - smallest.open ? group : smallest,
  );
}

/** Groups with no nested child group — tap targets for the visual editor. */
export function leafLatexGroups(text: string): LatexGroup[] {
  const groups = listLatexGroups(text);
  return groups.filter(
    (group) => !groups.some((other) => other.open > group.open && other.close < group.close),
  );
}

export function replaceGroupInner(
  text: string,
  group: LatexGroup,
  inner: string,
): LatexInsertResult {
  const next = text.slice(0, group.innerStart) + inner + text.slice(group.innerEnd);
  return { text: next, cursor: group.innerStart + inner.length };
}

function isEnvironmentNameGroup(text: string, group: LatexGroup): boolean {
  const prefix = text.slice(Math.max(0, group.open - 6), group.open);
  return /\\(?:begin|end)$/.test(prefix);
}

/**
 * Visual KaTeX for the composer field.
 * Empty groups are boxes; the group containing `cursor` is boxed with a caret.
 */
export function composerVisualLatex(text: string, cursor = text.length): string {
  const source = previewLatex(text);
  if (!source) return '';

  const groups = listLatexGroups(source);
  const focused = groupContaining(source, Math.max(0, Math.min(cursor, source.length)));
  const ordered = [...groups].sort((a, b) => b.open - a.open);

  let out = source;
  for (const group of ordered) {
    const isChildOfFocused =
      !!focused && group.open > focused.open && group.close < focused.close;
    if (isChildOfFocused) continue;

    const inner = source.slice(group.innerStart, group.innerEnd);
    const isFocused =
      !!focused && group.open === focused.open && group.close === focused.close;
    if (!isFocused && inner !== '') continue;

    let nextInner: string;
    if (isFocused) {
      const rel = Math.max(0, Math.min(cursor - group.innerStart, inner.length));
      const canSplit = inner === '' || !/[\\^_]/.test(inner);
      const withCaret = canSplit
        ? inner.slice(0, rel) + VISUAL_CARET + inner.slice(rel)
        : inner + VISUAL_CARET;
      nextInner = `\\boxed{${withCaret}}`;
    } else {
      nextInner = '\\square';
    }
    out = out.slice(0, group.open) + `{${nextInner}}` + out.slice(group.close + 1);
  }
  return out;
}

/** True when composer text is mostly an equation, not a prose question. */
export function looksLikeComposerLatex(text: string): boolean {
  const trimmed = text.trim();
  if (!trimmed) return false;
  if (!hasMathContent(trimmed) && !/\\[a-zA-Z]+/.test(trimmed)) return false;
  const words = trimmed.split(/\s+/).filter((token) => {
    const letters = token.replace(/[^A-Za-z]/g, '');
    return letters.length >= 3;
  });
  return words.length < 6;
}

/**
 * Wrap undelimited LaTeX-heavy composer text in `$...$` or `$$...$$`
 * so chat bubbles and the model see math.
 */
export function wrapComposerMath(
  text: string,
  displayMode = true,
  options?: { force?: boolean },
): string {
  const trimmed = text.trim();
  if (!trimmed) return trimmed;
  if (hasExplicitMathDelimiters(trimmed) && !options?.force) return trimmed;
  const body = previewLatex(trimmed) || trimmed;
  if (!options?.force && !looksLikeComposerLatex(trimmed) && !looksLikeComposerLatex(body)) {
    return trimmed;
  }
  if (displayMode) return `$$\n${body}\n$$`;
  return `$${body}$`;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/**
 * True when the whole message is one equation (composer send or `$...$` only).
 */
export function extractStandaloneEquation(
  text: string,
): { latex: string; displayMode: boolean } | null {
  const trimmed = text.trim();
  if (!trimmed) return null;

  const displayWrapped = trimmed.match(/^\$\$([\s\S]+)\$\$$/);
  if (displayWrapped?.[1]?.trim()) {
    return { latex: displayWrapped[1].trim(), displayMode: true };
  }

  const bracket = trimmed.match(/^\\\[([\s\S]+)\\\]$/);
  if (bracket?.[1]?.trim()) {
    return { latex: bracket[1].trim(), displayMode: true };
  }

  const inlineWrapped = trimmed.match(/^\$([^$\n]+)\$$/);
  if (inlineWrapped?.[1]?.trim()) {
    return { latex: inlineWrapped[1].trim(), displayMode: false };
  }

  const paren = trimmed.match(/^\\\(([\s\S]+)\\\)$/);
  if (paren?.[1]?.trim()) {
    return { latex: paren[1].trim(), displayMode: false };
  }

  const body = previewLatex(trimmed) || trimmed;
  if (!looksLikeComposerLatex(body) && !looksLikeComposerLatex(trimmed)) return null;

  const leftoverWords = trimmed
    .replace(/\\[a-zA-Z]+/g, ' ')
    .replace(/[\^_{}=+\-*/\\]+/g, ' ')
    .replace(/\d+/g, ' ')
    .split(/\s+/)
    .filter((word) => /^[A-Za-z]{3,}$/.test(word));
  if (leftoverWords.length >= 2) return null;

  return { latex: body, displayMode: true };
}
