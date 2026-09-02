import type { TextStyle } from 'react-native';

/** Protect fenced / inline code from math preprocessing. */
type Segment = { kind: 'code' | 'text'; value: string };

function splitByCodeSegments(content: string): Segment[] {
  const segments: Segment[] = [];
  const pattern = /(```[\s\S]*?```|`[^`\n]+`)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(content)) !== null) {
    if (match.index > lastIndex) {
      segments.push({ kind: 'text', value: content.slice(lastIndex, match.index) });
    }
    segments.push({ kind: 'code', value: match[0] });
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < content.length) {
    segments.push({ kind: 'text', value: content.slice(lastIndex) });
  }

  return segments.length > 0 ? segments : [{ kind: 'text', value: content }];
}

function readBalancedGroup(source: string, openIndex: number): number {
  if (source[openIndex] !== '{') return openIndex;
  let depth = 0;
  for (let i = openIndex; i < source.length; i++) {
    const ch = source[i];
    if (ch === '{') depth++;
    else if (ch === '}') {
      depth--;
      if (depth === 0) return i;
    }
  }
  return -1;
}

const BARE_LATEX_COMMANDS = new Set([
  'frac',
  'sqrt',
  'binom',
  'sum',
  'prod',
  'int',
  'lim',
  'log',
  'ln',
  'sin',
  'cos',
  'tan',
  'sec',
  'csc',
  'cot',
  'pm',
  'mp',
  'times',
  'div',
  'cdot',
  'leq',
  'geq',
  'neq',
  'approx',
  'infty',
  'alpha',
  'beta',
  'gamma',
  'delta',
  'theta',
  'pi',
  'sigma',
  'omega',
  'Delta',
  'Sigma',
  'Omega',
  'mathrm',
  'mathbf',
  'overline',
  'underline',
  'vec',
  'hat',
  'bar',
  'left',
  'right',
  'circ',
  'text',
  'quad',
  'qquad',
  'dots',
  'cdots',
  'ldots',
  'to',
  'implies',
  'in',
]);

const TRIG_COMMANDS = new Set(['sin', 'cos', 'tan', 'sec', 'csc', 'cot', 'log', 'ln', 'lim']);

const LEFT_RIGHT_DELIMS = new Set(['(', ')', '[', ']', '|', '.', '{', '}', '/']);
const LEFT_RIGHT_CMDS = new Set([
  'langle',
  'rangle',
  'lvert',
  'rvert',
  'lceil',
  'rceil',
  'lfloor',
  'rfloor',
  'backslash',
  'vert',
]);

const COMPLEX_MATH_BODY = /\\(?:frac|sqrt|sum|int|begin|left)\b/;
const LATEX_HEAVY = /\\(?:frac|sqrt|left|right|pi|cos|sin|circ|times)|[A-Za-z0-9]\^\{/;
const PROSE_LINE_START =
  /^(Since|The|Let|Rewrite|We|If|Then|So|Thus|Therefore|Because|When|For|Note|Find|Solve|Given)\b/i;

function lineIsListItem(text: string, index: number): boolean {
  const lineStart = text.lastIndexOf('\n', index - 1) + 1;
  return /^\s*(?:[-*+]|\d+\.)\s/.test(text.slice(lineStart));
}

function wrapMathPair(body: string, isList: boolean): string {
  const trimmed = body.trim();
  if (!trimmed) return '';
  if (!isList && COMPLEX_MATH_BODY.test(trimmed)) return `$$${trimmed}$$`;
  return `$${trimmed}$`;
}

function isWhitespaceChar(ch: string | undefined): boolean {
  return ch === ' ' || ch === '\t' || ch === '\n' || ch === '\r';
}

/** Unfinished span is LaTeX (has \, ^, _, or =) — never currency like $5. */
function looksLikeLatex(span: string): boolean {
  const trimmed = span.trim();
  if (!trimmed) return false;
  if (/\\[a-zA-Z]+/.test(trimmed)) return true;
  if (/[A-Za-z0-9][\^_]/.test(trimmed)) return true;
  if (/=/.test(trimmed)) return true;
  return false;
}

/**
 * TeX/KaTeX opener: `$` not followed by whitespace, another `$`, or a digit (currency).
 */
function canOpenInlineDollar(text: string, index: number): boolean {
  if (text[index] !== '$' || text.startsWith('$$', index)) return false;
  if (index > 0 && text[index - 1] === '\\') return false;
  const next = text[index + 1];
  if (!next || isWhitespaceChar(next) || next === '$') return false;
  if (/\d/.test(next)) return false;
  return true;
}

/**
 * TeX/KaTeX closer: `$` not preceded by whitespace. Stops (fails) at `$$`, `\n\n`,
 * or a space-before-`$` so a stray `$` cannot eat the rest of a long answer.
 */
function findInlineDollarClose(text: string, openIndex: number): number {
  for (let j = openIndex + 1; j < text.length; j++) {
    if (text.startsWith('$$', j)) return -1;
    if (text[j] === '\n' && text[j + 1] === '\n') return -1;
    if (text[j] !== '$') continue;
    if (text[j - 1] === '\\') continue;
    if (isWhitespaceChar(text[j - 1])) return -1;
    return j;
  }
  return -1;
}

/**
 * Matching `$$` closer. Returns -1 when the next `$$` is a new opener after
 * a prose paragraph so later equations are not swallowed.
 */
function findDisplayDollarClose(text: string, openIndex: number): number {
  const close = text.indexOf('$$', openIndex + 2);
  if (close === -1) return -1;
  const between = text.slice(openIndex + 2, close);
  const hasProseBreak = between.split(/\n\n/).some((para) => {
    const trimmed = para.trim();
    return (
      trimmed.length > 0 &&
      (PROSE_LINE_START.test(trimmed) || /^#{1,6}\s/.test(trimmed)) &&
      !LATEX_HEAVY.test(trimmed) &&
      !/\\begin\{/.test(trimmed) &&
      !/\\end\{/.test(trimmed)
    );
  });
  return hasProseBreak ? -1 : close;
}

/** Apply transforms only outside $...$ / $$...$$ regions. */
function mapOutsideMathDelimiters(text: string, mapper: (segment: string) => string): string {
  let result = '';
  let i = 0;
  let buffer = '';

  const flush = () => {
    if (!buffer) return;
    result += mapper(buffer);
    buffer = '';
  };

  while (i < text.length) {
    if (text.startsWith('$$', i)) {
      const close = findDisplayDollarClose(text, i);
      if (close === -1) {
        buffer += '$$';
        i += 2;
        continue;
      }
      flush();
      result += text.slice(i, close + 2);
      i = close + 2;
      continue;
    }

    if (canOpenInlineDollar(text, i)) {
      const close = findInlineDollarClose(text, i);
      if (close !== -1) {
        flush();
        result += text.slice(i, close + 1);
        i = close + 1;
        continue;
      }
    }

    buffer += text[i];
    i++;
  }

  flush();
  return result;
}

function absorbScriptSuffix(source: string, start: number): number {
  let end = start;
  while (end < source.length && (source[end] === '^' || source[end] === '_')) {
    end++;
    if (source[end] === '{') {
      const groupEnd = readBalancedGroup(source, end);
      if (groupEnd === -1) break;
      end = groupEnd + 1;
    } else if (end < source.length) {
      end++;
    }
  }
  return end;
}

function absorbLeftRightDelimiter(source: string, start: number): number {
  let end = start;
  while (end < source.length && source[end] === ' ') end++;
  if (end >= source.length) return start;

  if (source[end] === '\\') {
    const named = source.slice(end + 1).match(/^([a-zA-Z]+|[{}|])/);
    if (named && LEFT_RIGHT_CMDS.has(named[1])) {
      return end + 1 + named[1].length;
    }
    return start;
  }

  if (LEFT_RIGHT_DELIMS.has(source[end])) return end + 1;
  return start;
}

function absorbTrigSuffix(source: string, end: number): number {
  let i = end;
  while (i < source.length && source[i] === ' ') i++;
  if (i >= source.length || !/[0-9]/.test(source[i])) {
    return absorbScriptSuffix(source, end);
  }
  while (i < source.length && /[0-9.]/.test(source[i])) i++;
  i = absorbScriptSuffix(source, i);
  if (source.startsWith('\\circ', i)) i += 5;
  return i;
}

/** Read one bare LaTeX command with its braced args and command-level scripts. */
function absorbLatexCommand(source: string, start: number): number {
  if (source[start] !== '\\' || start + 1 >= source.length) return start;

  const commandMatch = source.slice(start + 1).match(/^([a-zA-Z]+)/);
  if (!commandMatch || !BARE_LATEX_COMMANDS.has(commandMatch[1])) return start;

  const command = commandMatch[1];
  let end = start + 1 + command.length;
  while (end < source.length && source[end] === ' ') end++;

  if (command === 'left' || command === 'right') {
    const delimEnd = absorbLeftRightDelimiter(source, end);
    if (delimEnd > end) end = delimEnd;
  }

  while (end < source.length && source[end] === '{') {
    const groupEnd = readBalancedGroup(source, end);
    if (groupEnd === -1) return start;
    end = groupEnd + 1;
    while (end < source.length && source[end] === ' ') end++;
  }

  if (TRIG_COMMANDS.has(command)) {
    return absorbTrigSuffix(source, end);
  }

  return absorbScriptSuffix(source, end);
}

/** Absorb an identifier with scripts immediately attached (e.g. x^2 after \\frac{a}{b}). */
function absorbAttachedIdentifierScripts(source: string, start: number): number {
  if (start >= source.length || !/[A-Za-z]/.test(source[start])) return start;

  let end = start;
  while (end < source.length && /[A-Za-z0-9]/.test(source[end])) end++;

  if (end === start || end >= source.length) return start;
  if (source[end] !== '^' && source[end] !== '_') return start;

  return absorbScriptSuffix(source, end);
}

/** Absorb chained commands and attached scripts into one math span. */
function absorbMathRun(source: string, start: number): number {
  let end = absorbLatexCommand(source, start);
  if (end === start) return start;

  while (end < source.length) {
    const attached = absorbAttachedIdentifierScripts(source, end);
    if (attached > end) {
      end = attached;
      continue;
    }

    if (source[end] === '\\') {
      const nextCommandEnd = absorbLatexCommand(source, end);
      if (nextCommandEnd > end) {
        end = nextCommandEnd;
        continue;
      }
    }

    break;
  }

  return end;
}

const STANDALONE_SCRIPT_PATTERN =
  /^([A-Za-z0-9]+(?:[\^_](?:\{[^}]+\}|[A-Za-z0-9]+))+)/;

function canStartStandaloneScript(text: string, index: number): boolean {
  if (index > 0 && /[$\\A-Za-z0-9]/.test(text[index - 1])) return false;
  return STANDALONE_SCRIPT_PATTERN.test(text.slice(index));
}

/** Single-pass auto-wrap for bare LaTeX outside existing math delimiters. */
function autoWrapBareMathInSegment(text: string): string {
  let result = '';
  let i = 0;

  while (i < text.length) {
    if (canStartStandaloneScript(text, i)) {
      const match = text.slice(i).match(STANDALONE_SCRIPT_PATTERN);
      if (match) {
        result += `$${match[1]}$`;
        i += match[1].length;
        continue;
      }
    }

    if (text[i] === '\\') {
      const runEnd = absorbMathRun(text, i);
      if (runEnd > i) {
        result += `$${text.slice(i, runEnd).trim()}$`;
        i = runEnd;
        continue;
      }
    }

    result += text[i];
    i++;
  }

  return result;
}

/** Auto-wrap bare LaTeX commands and scripts in plain text segments. */
export function autoWrapBareMath(text: string): string {
  return mapOutsideMathDelimiters(text, autoWrapBareMathInSegment);
}

/** $...$$ and $$...$ → a single matched pair. */
export function repairMixedMathDelimiters(text: string): string {
  let result = '';
  let i = 0;

  while (i < text.length) {
    if (text.startsWith('$$', i)) {
      const closeDouble = findDisplayDollarClose(text, i);
      let closeSingle = -1;
      if (closeDouble === -1) {
        for (let j = i + 2; j < text.length; j++) {
          if (text.startsWith('$$', j)) break;
          if (text[j] === '\n' && text[j + 1] === '\n') break;
          if (text[j] === '$' && !isWhitespaceChar(text[j - 1])) {
            closeSingle = j;
            break;
          }
        }
      }

      if (closeDouble !== -1 && (closeSingle === -1 || closeDouble <= closeSingle)) {
        result += text.slice(i, closeDouble + 2);
        i = closeDouble + 2;
        continue;
      }

      if (closeSingle !== -1) {
        result += wrapMathPair(text.slice(i + 2, closeSingle), lineIsListItem(text, i));
        i = closeSingle + 1;
        continue;
      }

      result += '$$';
      i += 2;
      continue;
    }

    if (text[i] === '$') {
      if (!canOpenInlineDollar(text, i)) {
        result += text[i];
        i++;
        continue;
      }

      let closeSingle = -1;
      let closeDouble = -1;
      for (let j = i + 1; j < text.length; j++) {
        if (text.startsWith('$$', j)) {
          closeDouble = j;
          break;
        }
        if (text[j] === '\n' && text[j + 1] === '\n') break;
        if (text[j] === '$') {
          if (isWhitespaceChar(text[j - 1])) break;
          closeSingle = j;
          break;
        }
      }

      if (closeDouble !== -1 && (closeSingle === -1 || closeDouble < closeSingle)) {
        result += wrapMathPair(text.slice(i + 1, closeDouble), lineIsListItem(text, i));
        i = closeDouble + 2;
        continue;
      }

      if (closeSingle !== -1) {
        result += text.slice(i, closeSingle + 1);
        i = closeSingle + 1;
        continue;
      }

      result += text[i];
      i++;
      continue;
    }

    result += text[i];
    i++;
  }

  return result;
}

/** Fix display-math closer typos without smashing adjacent `$$ $$` into `$$$$`. */
export function repairBrokenMathDelimiters(text: string): string {
  return text.replace(/\$\$([^$]*)\$\s+\$/g, (_, body) => `$$${body}$$`);
}

function isListItemLineStart(text: string, index: number): boolean {
  const lineStart = text.lastIndexOf('\n', index - 1) + 1;
  return /^\s*(?:[-*+]|\d+\.)\s/.test(text.slice(lineStart));
}

/** Put each `$$...$$` on its own block so markdown-it math_block can see it. */
export function isolateDisplayMathBlocks(text: string): string {
  const parts: string[] = [];
  let i = 0;
  let buffer = '';

  while (i < text.length) {
    if (!text.startsWith('$$', i)) {
      buffer += text[i];
      i++;
      continue;
    }

    const lineStart = text.lastIndexOf('\n', i - 1) + 1;
    const midListItem =
      isListItemLineStart(text, i) && text.slice(lineStart, i).trim().length > 0;
    if (midListItem) {
      buffer += text[i];
      i++;
      continue;
    }

    const close = findDisplayDollarClose(text, i);
    if (close === -1) {
      const rest = text.slice(i + 2).trim();
      if (!rest) break;
      buffer += '$$';
      i += 2;
      continue;
    }

    const body = text.slice(i + 2, close).trim();
    i = close + 2;
    if (!body) continue;

    if (buffer.trim()) parts.push(buffer.replace(/\s+$/, ''));
    buffer = '';
    parts.push(`$$\n${body}\n$$`);
  }

  if (buffer.trim()) parts.push(buffer.trim());

  return parts.join('\n\n').replace(/\n{3,}/g, '\n\n');
}

const COMPLEX_INLINE_PATTERN = /\\(?:frac|sqrt|sum|int|begin)\b/;

/** Lift `$...$` with frac/sqrt/sum/int/begin onto display blocks (not inside list items). */
export function promoteComplexInlineMath(text: string): string {
  const promoted = text.replace(
    /(?<!\$)[ \t]*\$([^$\n]+)\$[ \t]*(?!\$)/g,
    (full, body: string, offset: number) => {
      if (!COMPLEX_INLINE_PATTERN.test(body)) return full;
      const lineStart = text.lastIndexOf('\n', offset - 1) + 1;
      if (/^\s*(?:[-*+]|\d+\.)\s/.test(text.slice(lineStart))) return full;
      const trimmed = body.trim();
      if (!trimmed) return full;
      return `\n\n$$\n${trimmed}\n$$\n\n`;
    },
  );
  return promoted.replace(/\n{3,}/g, '\n\n').replace(/^\n+/, '').replace(/\n+$/, '');
}

/** Insert a space between adjacent inline math pairs: $A$$B$ -> $A$ $B$. */
export function repairAdjacentMathDelimiters(text: string): string {
  return text.replace(/(?<!\$)(\$[^$\n]+?\$)(?=\$[^$\n])/g, '$1 ');
}

function normalizeDelimiterForms(text: string): string {
  const converted = text
    .replace(/\\\[([\s\S]*?)\\\]/g, (_, body) => `$$${body.trim()}$$`)
    .replace(/\\\(([\s\S]*?)\\\)/g, (_, body) => `$${body.trim()}$`);

  let result = '';
  let i = 0;
  while (i < converted.length) {
    if (converted.startsWith('$$', i)) {
      const close = findDisplayDollarClose(converted, i);
      if (close === -1) {
        result += '$$';
        i += 2;
        continue;
      }
      result += `$$${converted.slice(i + 2, close).trim()}$$`;
      i = close + 2;
      continue;
    }
    result += converted[i];
    i++;
  }
  return result;
}

/** Fix over-escaped LaTeX from streamed JSON inside math delimiters. */
function normalizeEscapedBackslashes(text: string): string {
  const fixBody = (body: string) => body.replace(/\\\\([a-zA-Z[\]{}])/g, '\\$1');

  let withDisplayFixed = '';
  let i = 0;
  while (i < text.length) {
    if (text.startsWith('$$', i)) {
      const close = findDisplayDollarClose(text, i);
      if (close === -1) {
        withDisplayFixed += '$$';
        i += 2;
        continue;
      }
      withDisplayFixed += `$$${fixBody(text.slice(i + 2, close))}$$`;
      i = close + 2;
      continue;
    }
    withDisplayFixed += text[i];
    i++;
  }

  return mapOutsideMathDelimiters(withDisplayFixed, (segment) =>
    segment.replace(/\$([^$\n]+?)\$/g, (_, body) => `$${fixBody(body)}$`),
  );
}

function peelTrailingMathJunk(rest: string): { math: string; trailing: string } {
  const match = rest.match(/^(.*?)(\$+)?(\s*[!.,;:]*)\s*$/s);
  if (!match) return { math: rest.trimEnd(), trailing: '' };
  return { math: match[1].trimEnd(), trailing: match[3] ?? '' };
}

function wrapOneLatexHeavyLine(line: string): string {
  const list = line.match(/^(\s*(?:[-*+]|\d+\.)\s+)(.*)$/);
  if (list) {
    let prefix = list[1];
    let rest = list[2];
    const bold = rest.match(/^(\*\*[^*]+?\*\*:?\s*)(.*)$/);
    if (bold) {
      prefix += bold[1];
      rest = bold[2];
    }
    const { math, trailing } = peelTrailingMathJunk(rest);
    if (!math || !LATEX_HEAVY.test(math)) return line;
    const trimmed = math.trim();
    if (/^\$[^$]*\$$/.test(trimmed) || /^\$\$[\s\S]*\$\$$/.test(trimmed)) return line;
    return `${prefix}$${math}$${trailing}`;
  }

  const indentMatch = line.match(/^(\s*)(.*)$/);
  if (!indentMatch) return line;
  const indent = indentMatch[1];
  const content = indentMatch[2];
  if (PROSE_LINE_START.test(content)) return line;
  const { math, trailing } = peelTrailingMathJunk(content);
  if (!math || !LATEX_HEAVY.test(math) || !/=/.test(math)) return line;
  if (/^\$/.test(math.trim())) return line;
  return `${indent}$${math}$${trailing}`;
}

/** Wrap undelimited latex-heavy list items and equation lines. */
export function wrapLatexHeavyLines(text: string): string {
  return mapOutsideMathDelimiters(text, (segment) =>
    segment.split('\n').map(wrapOneLatexHeavyLine).join('\n'),
  );
}

const MATH_ENV_NAMES = new Set([
  'align',
  'align*',
  'aligned',
  'cases',
  'matrix',
  'pmatrix',
  'bmatrix',
  'gather',
  'gathered',
  'eqnarray',
  'split',
]);

/** Wrap bare \begin{align|cases|matrix|...} environments as display math. */
export function wrapLatexEnvironments(text: string): string {
  return mapOutsideMathDelimiters(text, (segment) => {
    let result = '';
    let i = 0;
    while (i < segment.length) {
      const begin = segment.indexOf('\\begin{', i);
      if (begin === -1) {
        result += segment.slice(i);
        break;
      }
      result += segment.slice(i, begin);
      const nameStart = begin + 7;
      const nameEnd = segment.indexOf('}', nameStart);
      if (nameEnd === -1) {
        result += segment.slice(begin);
        break;
      }
      const env = segment.slice(nameStart, nameEnd);
      if (!MATH_ENV_NAMES.has(env)) {
        result += segment.slice(begin, nameEnd + 1);
        i = nameEnd + 1;
        continue;
      }
      const endMarker = `\\end{${env}}`;
      const end = segment.indexOf(endMarker, nameEnd + 1);
      if (end === -1) {
        result += segment.slice(begin);
        break;
      }
      const body = segment.slice(begin, end + endMarker.length).trim();
      result += `$$\n${body}\n$$`;
      i = end + endMarker.length;
    }
    return result;
  });
}

function closeDanglingInProse(segment: string): string {
  if (segment.includes('$$') && countUnpairedDisplayDollars(segment) === 1) {
    return closeOpenMathDelimitersInSegment(segment);
  }
  const parts = segment.split(/(\n\n|\n(?=(?:[-*+] |\d+\. )))/);
  return parts
    .map((part) => {
      if (!part || /^\n+$/.test(part)) return part;
      return closeOpenMathDelimitersInSegment(part);
    })
    .join('');
}

/** Close dangling $ / $$ outside already-closed math spans (not currency). */
export function closeDanglingDelimitersAtBlockBoundaries(text: string): string {
  let result = '';
  let i = 0;
  let buffer = '';

  const flush = () => {
    if (!buffer) return;
    result += closeDanglingInProse(buffer);
    buffer = '';
  };

  while (i < text.length) {
    if (text.startsWith('$$', i)) {
      const close = findDisplayDollarClose(text, i);
      if (close === -1) {
        buffer += '$$';
        i += 2;
        continue;
      }
      flush();
      result += text.slice(i, close + 2);
      i = close + 2;
      continue;
    }

    if (canOpenInlineDollar(text, i)) {
      const close = findInlineDollarClose(text, i);
      if (close !== -1) {
        flush();
        result += text.slice(i, close + 1);
        i = close + 1;
        continue;
      }
    }

    buffer += text[i];
    i++;
  }

  flush();
  return result;
}

function normalizeMathSegment(text: string): string {
  let result = normalizeDelimiterForms(text);
  result = repairBrokenMathDelimiters(result);
  result = repairMixedMathDelimiters(result);
  result = stripOrphanClosingDollars(result);
  result = closeDanglingDelimitersAtBlockBoundaries(result);
  result = wrapLatexHeavyLines(result);
  result = wrapLatexEnvironments(result);
  result = isolateDisplayMathBlocks(result);
  result = autoWrapBareMath(result);
  result = repairAdjacentMathDelimiters(result);
  result = normalizeEscapedBackslashes(result);
  result = promoteComplexInlineMath(result);
  return result;
}

function countUnpairedDisplayDollars(text: string): number {
  return (text.match(/\$\$/g) || []).length % 2;
}

/**
 * Where to insert `$$` for an unclosed display opener so later prose / `$x^2$`
 * is not swallowed into the same math span.
 */
function findUnclosedDisplayCloseOffset(span: string): number | null {
  const parts = span.split(/(\n\n)/);
  let offset = 0;

  for (const part of parts) {
    if (part === '\n\n') {
      offset += part.length;
      continue;
    }
    const trimmed = part.trim();
    if (!trimmed) {
      offset += part.length;
      continue;
    }

    const isProse =
      (PROSE_LINE_START.test(trimmed) || /^#{1,6}\s/.test(trimmed)) &&
      !LATEX_HEAVY.test(trimmed) &&
      !/\\begin\{/.test(trimmed) &&
      !/\\end\{/.test(trimmed);

    if (isProse) {
      return offset > 0 ? offset : null;
    }

    offset += part.length;
  }

  return looksLikeLatex(span) ? span.length : null;
}

/** Close a trailing unclosed math delimiter when the unfinished span looks like LaTeX. */
function closeOpenMathDelimitersInSegment(text: string): string {
  if (!text) return text;

  let result = text;
  let i = 0;
  while (i < result.length) {
    if (result.startsWith('$$', i)) {
      const close = findDisplayDollarClose(result, i);
      if (close === -1) {
        const span = result.slice(i + 2);
        const insertAt = findUnclosedDisplayCloseOffset(span);
        if (insertAt == null) {
          i += 2;
          continue;
        }
        return `${result.slice(0, i + 2 + insertAt)}$$${result.slice(i + 2 + insertAt)}`;
      }
      i = close + 2;
      continue;
    }

    if (canOpenInlineDollar(result, i)) {
      const close = findInlineDollarClose(result, i);
      if (close === -1) {
        const span = result.slice(i + 1);
        const isCurrency = /^\d+(?:\.\d+)?/.test(span.trim()) || /^\d/.test(span);
        if (!isCurrency && looksLikeLatex(span)) return `${result}$`;
        return result;
      }
      i = close + 1;
      continue;
    }

    i++;
  }

  const lastParenOpen = result.lastIndexOf('\\(');
  if (lastParenOpen !== -1) {
    const closeAfter = result.indexOf('\\)', lastParenOpen + 2);
    if (closeAfter === -1) {
      result += '\\)';
    }
  }

  const lastBracketOpen = result.lastIndexOf('\\[');
  if (lastBracketOpen !== -1) {
    const closeAfter = result.indexOf('\\]', lastBracketOpen + 2);
    if (closeAfter === -1) {
      result += '\\]';
    }
  }

  return result;
}

/** Close unclosed math delimiters at EOF when the span looks like LaTeX. Skips fenced / inline code. */
export function closeOpenMathDelimiters(content: string): string {
  return splitByCodeSegments(content)
    .map((segment) =>
      segment.kind === 'code' ? segment.value : closeOpenMathDelimitersInSegment(segment.value),
    )
    .join('');
}

/** Prepare assistant/user markdown so LaTeX always has delimiters before parsing. */
export function preprocessMathInMarkdown(content: string, _options?: { isStreaming?: boolean }): string {
  const result = splitByCodeSegments(content)
    .map((segment) =>
      segment.kind === 'code' ? segment.value : normalizeMathSegment(segment.value),
    )
    .join('');

  return closeOpenMathDelimiters(result);
}

export function hasExplicitMathDelimiters(content: string): boolean {
  if (!content.trim()) return false;
  if (/```(?:latex|tex|math)\b/i.test(content)) return true;
  if (/\$\$[\s\S]+?\$\$/.test(content)) return true;
  if (/\\\[[\s\S]+?\\\]/.test(content)) return true;
  if (/\\\([\s\S]+?\\\)/.test(content)) return true;
  return /(?:^|[^\\$])\$(?!\$)[^$\n]+?\$(?!\$)/.test(content);
}

/** Detect math worth rendering beyond explicit $ delimiters. */
export function hasMathContent(content: string): boolean {
  if (hasExplicitMathDelimiters(content)) return true;
  if (/\\(?:frac|sqrt|sum|int|pm|times|leq|geq|alpha|beta|gamma|theta|pi|infty)\b/.test(content)) {
    return true;
  }
  if (/[A-Za-z0-9]\^(\{[^}]+\}|\d+|[A-Za-z])/.test(content)) return true;
  if (/[A-Za-z]_(\{[^}]+\}|\d+|[A-Za-z])/.test(content)) return true;
  return false;
}

export type TextMathPart = { kind: 'text' | 'math'; value: string; displayMode?: boolean };

/** Fallback splitter for text nodes that still contain delimiters. */
export function splitTextWithInlineMath(text: string): TextMathPart[] {
  if (!text) return [];

  const parts: TextMathPart[] = [];
  const pushText = (value: string) => {
    if (value) parts.push({ kind: 'text', value });
  };
  const pushMath = (value: string, displayMode: boolean) => {
    const mathBody = value.trim();
    if (mathBody) parts.push({ kind: 'math', value: mathBody, displayMode });
  };

  let i = 0;
  let buffer = '';

  while (i < text.length) {
    if (text.startsWith('$$', i)) {
      const closeDouble = findDisplayDollarClose(text, i);
      let closeSingle = -1;
      for (let j = i + 2; j < text.length; j++) {
        if (text.startsWith('$$', j)) break;
        if (text[j] === '\n' && text[j + 1] === '\n') break;
        if (text[j] === '$') {
          if (isWhitespaceChar(text[j - 1])) break;
          closeSingle = j;
          break;
        }
      }

      if (closeDouble !== -1 && (closeSingle === -1 || closeDouble <= closeSingle)) {
        pushText(buffer);
        buffer = '';
        pushMath(text.slice(i + 2, closeDouble), true);
        i = closeDouble + 2;
        continue;
      }

      if (closeSingle !== -1) {
        pushText(buffer);
        buffer = '';
        const body = text.slice(i + 2, closeSingle);
        pushMath(body, COMPLEX_MATH_BODY.test(body));
        i = closeSingle + 1;
        continue;
      }

      buffer += '$$';
      i += 2;
      continue;
    }

    if (canOpenInlineDollar(text, i)) {
      let closeSingle = -1;
      let closeDouble = -1;
      for (let j = i + 1; j < text.length; j++) {
        if (text.startsWith('$$', j)) {
          closeDouble = j;
          break;
        }
        if (text[j] === '\n' && text[j + 1] === '\n') break;
        if (text[j] === '$') {
          if (isWhitespaceChar(text[j - 1])) break;
          closeSingle = j;
          break;
        }
      }

      if (closeDouble !== -1 && (closeSingle === -1 || closeDouble < closeSingle)) {
        pushText(buffer);
        buffer = '';
        const body = text.slice(i + 1, closeDouble);
        pushMath(body, COMPLEX_MATH_BODY.test(body));
        i = closeDouble + 2;
        continue;
      }

      if (closeSingle !== -1) {
        pushText(buffer);
        buffer = '';
        pushMath(text.slice(i + 1, closeSingle), false);
        i = closeSingle + 1;
        continue;
      }
    }

    buffer += text[i];
    i++;
  }

  if (buffer) {
    const leftover = buffer.match(/^(.*?)(\$\$)\s*$/s);
    if (leftover && LATEX_HEAVY.test(leftover[1])) {
      pushText(leftover[1]);
    } else {
      pushText(buffer);
    }
  }

  if (parts.length === 0) return [{ kind: 'text', value: text }];
  return parts.some((part) => part.kind === 'math') ? parts : [{ kind: 'text', value: text }];
}

const LEFT_NEEDS_DELIM =
  /\\left(?!\s*(?:[()[\]|./.]|\\[{}|]|\\(?:langle|rangle|lvert|rvert|lceil|rceil|lfloor|rfloor|backslash|vert)\b))/g;

/** Clean latex body before handing to KaTeX. */
export function sanitizeLatex(latex: string): string {
  return latex
    .trim()
    .replace(/\\\\([a-zA-Z[\]{}])/g, '\\$1')
    .replace(/\$\$\$\$/g, '')
    .replace(/\s*---+\s*$/g, '')
    .replace(/^\$+|\$+$/g, '')
    .replace(LEFT_NEEDS_DELIM, '\\left(')
    .trim();
}

const NON_SIMPLE_INLINE = /\\(?:frac|sqrt|sum|int|begin|boxed|over|displaystyle)\b/;

/** True when inline latex can sit in a Text node next to a bullet (no WebView). */
export function isSimpleInlineLatex(latex: string): boolean {
  const trimmed = sanitizeLatex(latex);
  if (!trimmed) return false;
  if (trimmed.length > 80) return false;
  if (NON_SIMPLE_INLINE.test(trimmed)) return false;
  if (trimmed.includes('\\\\')) return false;
  const pretty = formatSimpleInlineLatex(trimmed);
  if (!pretty) return false;
  if (/[\\^_]/.test(pretty)) return false;
  return true;
}

/** Readable unicode for simple inline latex. */
export function formatSimpleInlineLatex(latex: string): string {
  return sanitizeLatex(latex)
    .replace(/\\Rightarrow\b/g, '⇒')
    .replace(/\\rightarrow\b/g, '→')
    .replace(/\\implies\b/g, '⇒')
    .replace(/\\leq\b/g, '≤')
    .replace(/\\geq\b/g, '≥')
    .replace(/\\neq\b/g, '≠')
    .replace(/\\approx\b/g, '≈')
    .replace(/\\infty\b/g, '∞')
    .replace(/\\times\b/g, '×')
    .replace(/\\cdot\b/g, '·')
    .replace(/\\div\b/g, '÷')
    .replace(/\\pm\b/g, '±')
    .replace(/\\mp\b/g, '∓')
    .replace(/\\Delta\b/g, 'Δ')
    .replace(/\\alpha\b/g, 'α')
    .replace(/\\beta\b/g, 'β')
    .replace(/\\gamma\b/g, 'γ')
    .replace(/\\theta\b/g, 'θ')
    .replace(/\\pi\b/g, 'π')
    .replace(/\\circ\b/g, '°')
    .replace(/\\quad\b/g, ' ')
    .replace(/\^\{2\}/g, '²')
    .replace(/\^\{3\}/g, '³')
    .replace(/\^2\b/g, '²')
    .replace(/\^3\b/g, '³')
    .replace(/\\([{}])/g, '$1')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Strip a closer `$` / `$$` that is not part of a pair (e.g. `x^2$ + 6x`, `\pi$).`). */
export function stripOrphanClosingDollars(text: string): string {
  let result = mapOutsideMathDelimiters(text, (segment) =>
    segment.replace(
      /(^|[^$])([A-Za-z][A-Za-z0-9]*(?:\^[A-Za-z0-9]+|\^\{[^}]+\})?)\$(\s|$)/g,
      '$1$2$3',
    ),
  );

  let out = '';
  let i = 0;
  while (i < result.length) {
    if (result.startsWith('$$', i)) {
      const close = findDisplayDollarClose(result, i);
      if (close !== -1) {
        out += result.slice(i, close + 2);
        i = close + 2;
        continue;
      }
      const after = result.slice(i + 2);
      if (!after.trim() || /^\s*[).,;:!?]/.test(after)) {
        i += 2;
        continue;
      }
      out += result[i];
      i++;
      continue;
    }

    if (result[i] === '$') {
      if (!canOpenInlineDollar(result, i)) {
        const after = result.slice(i + 1);
        if (/^\d/.test(after)) {
          out += '$';
          i++;
          continue;
        }
        if (!after.trim() || /^\s*[).,;:!?]/.test(after)) {
          i++;
          continue;
        }
        out += '$';
        i++;
        continue;
      }

      const close = findInlineDollarClose(result, i);
      if (close !== -1) {
        out += result.slice(i, close + 1);
        i = close + 1;
        continue;
      }
      const after = result.slice(i + 1);
      if (/^\d/.test(after)) {
        out += '$';
        i++;
        continue;
      }
      if (!after.trim() || /^\s*[).,;:!?]/.test(after)) {
        i++;
        continue;
      }
      out += '$';
      i++;
      continue;
    }

    out += result[i];
    i++;
  }

  return out;
}

/** Inject theme color and override library wrap/clip that hides denominators. */
export function injectKatexThemeColor(html: string, color: string): string {
  const themeStyle = `
    html, body, #outer-wrapper {
      color: ${color} !important;
      background: transparent !important;
      height: auto !important;
      min-height: 0 !important;
      overflow: visible !important;
    }
    #container {
      color: ${color} !important;
      background: transparent !important;
      height: auto !important;
      min-height: 0 !important;
      overflow-x: auto !important;
      overflow-y: visible !important;
      padding: 10px 4px !important;
    }
    .katex, .katex * {
      color: ${color} !important;
      fill: ${color} !important;
    }
    .katex {
      flex-wrap: nowrap !important;
      white-space: nowrap !important;
      max-width: none !important;
      overflow: visible !important;
    }
    .katex-display, .katex-html {
      overflow-x: auto !important;
      overflow-y: visible !important;
      max-width: 100% !important;
      height: auto !important;
    }
  `;
  const themeScript = `<script>
    (function () {
      var color = ${JSON.stringify(color)};
      var paint = function () {
        document.querySelectorAll('.katex, .katex *').forEach(function (el) {
          el.style.setProperty('color', color, 'important');
          el.style.setProperty('fill', color, 'important');
        });
      };
      document.addEventListener('DOMContentLoaded', function () {
        paint();
        setTimeout(paint, 40);
        setTimeout(paint, 160);
      });
    })();
  </script>`;
  if (html.includes('</head>')) {
    return html.replace('</head>', `<style>${themeStyle}</style>${themeScript}</head>`);
  }
  return `<style>${themeStyle}</style>${themeScript}${html}`;
}

export type ProseTextStyle = Pick<TextStyle, 'color' | 'fontSize' | 'lineHeight' | 'fontWeight'>;
