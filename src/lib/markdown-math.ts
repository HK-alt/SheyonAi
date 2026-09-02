import MarkdownIt from 'markdown-it';
import type StateBlock from 'markdown-it/lib/rules_block/state_block.mjs';
import type StateInline from 'markdown-it/lib/rules_inline/state_inline.mjs';

import { hasMathContent } from '@/lib/math-preprocess';

const MATH_FENCE_LANGUAGES = new Set(['latex', 'tex', 'math']);

export function isMathFenceLanguage(lang: string): boolean {
  return MATH_FENCE_LANGUAGES.has(lang.trim().toLowerCase());
}

/** True when content likely contains math worth rendering. */
export function hasMathDelimiters(content: string): boolean {
  return hasMathContent(content);
}

function isWhitespaceCode(code: number): boolean {
  return code === 0x20 || code === 0x09 || code === 0x0a || code === 0x0d;
}

function looksLikeMathBody(content: string): boolean {
  if (!content.trim()) return false;
  if (content.includes('\n\n')) return false;
  const hasMath = /[\\^_]/.test(content) || /[=+\-*/]/.test(content) || /[A-Za-z]\d|\d/.test(content);
  if (content.length > 200 && !hasMath) return false;
  if (content.length > 800 && !/[\\^_]/.test(content)) return false;
  return true;
}

function mathInlineDoubleDollar(state: StateInline, silent: boolean): boolean {
  const src = state.src;
  const pos = state.pos;
  if (src.slice(pos, pos + 2) !== '$$') return false;
  if (pos > 0 && src.charCodeAt(pos - 1) === 0x5c /* \ */) return false;

  const start = pos + 2;
  const max = state.posMax;
  let cursor = start;

  while (cursor <= max - 2) {
    if (src.slice(cursor, cursor + 2) === '$$') {
      const content = src.slice(start, cursor);
      if (!content.trim()) return false;
      if (silent) return true;
      const token = state.push('math_inline', '', 0);
      token.content = content;
      token.markup = '$$';
      state.pos = cursor + 2;
      return true;
    }
    cursor++;
  }

  return false;
}

function mathInlineDollar(state: StateInline, silent: boolean): boolean {
  const src = state.src;
  let pos = state.pos;
  const max = state.posMax;

  if (src.charCodeAt(pos) !== 0x24 /* $ */) return false;
  if (pos > 0 && src.charCodeAt(pos - 1) === 0x5c /* \ */) return false;
  if (pos + 1 >= max) return false;
  const next = src.charCodeAt(pos + 1);
  if (next === 0x24) return false;
  if (isWhitespaceCode(next)) return false;
  if (next >= 0x30 && next <= 0x39) return false;

  const start = pos + 1;
  pos = start;

  while (pos < max) {
    if (src.charCodeAt(pos) === 0x24) {
      if (pos > 0 && src.charCodeAt(pos - 1) === 0x5c) {
        pos++;
        continue;
      }
      if (isWhitespaceCode(src.charCodeAt(pos - 1))) return false;
      const content = src.slice(start, pos);
      if (!looksLikeMathBody(content)) return false;
      if (silent) return true;
      const token = state.push('math_inline', '', 0);
      token.content = content;
      token.markup = '$';
      state.pos = pos + 1;
      return true;
    }
    if (src[pos] === '\n' && src[pos + 1] === '\n') return false;
    pos++;
  }

  return false;
}

function mathInlineParen(state: StateInline, silent: boolean): boolean {
  const src = state.src;
  const pos = state.pos;
  if (src.slice(pos, pos + 2) !== '\\(') return false;

  const start = pos + 2;
  let cursor = start;
  const max = state.posMax;

  while (cursor < max - 1) {
    if (src.slice(cursor, cursor + 2) === '\\)') {
      if (silent) return true;
      const token = state.push('math_inline', '', 0);
      token.content = src.slice(start, cursor);
      token.markup = '\\(\\)';
      state.pos = cursor + 2;
      return true;
    }
    cursor++;
  }

  return false;
}

const DISPLAY_CLOSER_LINE = /^\s*\$\$[).,;:!?]*\s*$/;

function mathBlockDollar(
  state: StateBlock,
  startLine: number,
  endLine: number,
  silent: boolean,
): boolean {
  let pos = state.bMarks[startLine] + state.tShift[startLine];
  const max = state.eMarks[startLine];
  const marker = state.src.slice(pos, pos + 2);
  if (marker !== '$$') return false;

  pos += 2;
  const firstLine = state.src.slice(pos, max);
  let nextLine = startLine;
  let content = '';
  let foundClose = false;

  const closeOnSameLine = firstLine.indexOf('$$');
  if (closeOnSameLine !== -1) {
    const afterClose = firstLine.slice(closeOnSameLine + 2);
    if (!afterClose.trim() || /^[).,;:!?]+/.test(afterClose.trim())) {
      content = firstLine.slice(0, closeOnSameLine).trim();
      nextLine = startLine;
      foundClose = true;
    }
  }

  if (!foundClose) {
    content = firstLine;
    if (content.length > 0) content += '\n';
    nextLine = startLine + 1;

    while (nextLine < endLine) {
      pos = state.bMarks[nextLine] + state.tShift[nextLine];
      const lineMax = state.eMarks[nextLine];
      const line = state.src.slice(pos, lineMax);
      if (DISPLAY_CLOSER_LINE.test(line)) {
        foundClose = true;
        break;
      }
      content += line + '\n';
      nextLine++;
    }
  }

  if (!foundClose) return false;
  if (silent) return true;

  const token = state.push('math_block', 'div', 0);
  token.content = content.trim();
  token.markup = '$$';
  token.map = [startLine, nextLine + 1];
  state.line = nextLine + 1;
  return true;
}

function mathBlockBracket(
  state: StateBlock,
  startLine: number,
  endLine: number,
  silent: boolean,
): boolean {
  let pos = state.bMarks[startLine] + state.tShift[startLine];
  const max = state.eMarks[startLine];
  if (state.src.slice(pos, pos + 2) !== '\\[') return false;

  pos += 2;
  let nextLine = startLine;
  let content = state.src.slice(pos, max);
  if (content.length > 0) content += '\n';
  nextLine = startLine + 1;

  while (nextLine < endLine) {
    pos = state.bMarks[nextLine] + state.tShift[nextLine];
    const lineMax = state.eMarks[nextLine];
    const line = state.src.slice(pos, lineMax);
    const closeIdx = line.indexOf('\\]');
    if (closeIdx !== -1) {
      content += line.slice(0, closeIdx);
      if (silent) return true;
      const token = state.push('math_block', 'div', 0);
      token.content = content.trim();
      token.markup = '\\[\\]';
      token.map = [startLine, nextLine + 1];
      state.line = nextLine + 1;
      return true;
    }
    content += line + '\n';
    nextLine++;
  }

  return false;
}

export function markdownItMathPlugin(md: MarkdownIt): void {
  md.inline.ruler.after('escape', 'math_inline_display_dollar', mathInlineDoubleDollar);
  md.inline.ruler.after('math_inline_display_dollar', 'math_inline_dollar', mathInlineDollar);
  md.inline.ruler.after('math_inline_dollar', 'math_inline_paren', mathInlineParen);
  md.block.ruler.before('fence', 'math_block_dollar', mathBlockDollar);
  md.block.ruler.before('fence', 'math_block_bracket', mathBlockBracket);
}

export function createMarkdownItWithMath(): MarkdownIt {
  const md = MarkdownIt({ typographer: false });
  md.use(markdownItMathPlugin);
  return md;
}
