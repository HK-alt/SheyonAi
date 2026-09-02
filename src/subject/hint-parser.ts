export type ParsedTutorHint = {
  focus: string;
  hint: string;
  nextMove: string;
  leftover: string;
};

const SECTION_RE = /^##\s+(Focus|Hint|Next move)\s*$/gim;
const HAS_HINT_HEADING_RE = /(^|\n)##\s+Hint\b/i;
const HAS_STRUCTURE_RE = /(^|\n)##\s+(Focus|Hint|Next move)\b/i;

function sectionKey(name: string): 'focus' | 'hint' | 'nextMove' | null {
  const normalized = name.trim().toLowerCase();
  if (normalized === 'focus') return 'focus';
  if (normalized === 'hint') return 'hint';
  if (normalized === 'next move') return 'nextMove';
  return null;
}

export function tryParseTutorHint(content: string): ParsedTutorHint | null {
  const text = content.trim();
  if (!HAS_STRUCTURE_RE.test(text) || !HAS_HINT_HEADING_RE.test(text)) return null;

  const matches = [...text.matchAll(SECTION_RE)];
  if (matches.length === 0) return null;

  const parsed: ParsedTutorHint = {
    focus: '',
    hint: '',
    nextMove: '',
    leftover: text.slice(0, matches[0]?.index ?? 0).trim(),
  };

  for (let index = 0; index < matches.length; index += 1) {
    const match = matches[index];
    const key = sectionKey(match[1] ?? '');
    if (!key) continue;
    const start = (match.index ?? 0) + match[0].length;
    const end = index + 1 < matches.length ? (matches[index + 1]?.index ?? text.length) : text.length;
    parsed[key] = text.slice(start, end).trim();
  }

  if (!parsed.hint) return null;
  return parsed;
}

export function isTutorHintPending(content: string, isStreaming: boolean): boolean {
  if (!isStreaming) return false;
  return !tryParseTutorHint(content);
}
