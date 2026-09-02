export type ParsedTutorCoach = {
  focus: string;
  check: string;
  question: string;
  choices: string[];
  leftover: string;
};

const SECTION_RE = /^##\s+(Focus|Check|Question|Choices)\s*$/gim;
const HAS_QUESTION_RE = /(^|\n)##\s+Question\b/i;
const HAS_STRUCTURE_RE = /(^|\n)##\s+(Focus|Check|Question|Choices)\b/i;
const BULLET_RE = /^\s*(?:[-*•]|\d+[.)])\s+(.+?)\s*$/;

function sectionKey(name: string): 'focus' | 'check' | 'question' | 'choices' | null {
  const normalized = name.trim().toLowerCase();
  if (normalized === 'focus') return 'focus';
  if (normalized === 'check') return 'check';
  if (normalized === 'question') return 'question';
  if (normalized === 'choices') return 'choices';
  return null;
}

function parseChoices(body: string): string[] {
  const seen = new Set<string>();
  const choices: string[] = [];
  for (const line of body.split('\n')) {
    const match = BULLET_RE.exec(line);
    const raw = (match?.[1] ?? '').replace(/\*\*/g, '').trim();
    if (!raw) continue;
    const key = raw.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    choices.push(raw);
    if (choices.length >= 4) break;
  }
  return choices;
}

export function tryParseTutorCoach(content: string): ParsedTutorCoach | null {
  const text = content.trim();
  if (!HAS_STRUCTURE_RE.test(text) || !HAS_QUESTION_RE.test(text)) return null;

  const matches = [...text.matchAll(SECTION_RE)];
  if (matches.length === 0) return null;

  const sections: Record<'focus' | 'check' | 'question' | 'choices', string> = {
    focus: '',
    check: '',
    question: '',
    choices: '',
  };

  for (let index = 0; index < matches.length; index += 1) {
    const match = matches[index];
    const key = sectionKey(match[1] ?? '');
    if (!key) continue;
    const start = (match.index ?? 0) + match[0].length;
    const end = index + 1 < matches.length ? (matches[index + 1]?.index ?? text.length) : text.length;
    sections[key] = text.slice(start, end).trim();
  }

  if (!sections.question) return null;
  return {
    focus: sections.focus,
    check: sections.check,
    question: sections.question,
    choices: parseChoices(sections.choices),
    leftover: text.slice(0, matches[0]?.index ?? 0).trim(),
  };
}

export function isTutorCoachPending(content: string, isStreaming: boolean): boolean {
  if (!isStreaming) return false;
  return !tryParseTutorCoach(content);
}
