export type CalloutKind = 'tip' | 'note' | 'warning' | 'remember' | 'example' | 'key';

const CALLOUT_ALIASES: Record<string, CalloutKind> = {
  tip: 'tip',
  note: 'note',
  warning: 'warning',
  caution: 'warning',
  remember: 'remember',
  example: 'example',
  key: 'key',
  'key idea': 'key',
};

const CALLOUT_LABEL: Record<CalloutKind, string> = {
  tip: 'Tip',
  note: 'Note',
  warning: 'Warning',
  remember: 'Remember',
  example: 'Example',
  key: 'Key idea',
};

const KEY_TERM_SKIP = /^(tip|note|warning|caution|remember|example|key idea|step\s+\d+)\s*:?$/i;

export function calloutLabel(kind: CalloutKind): string {
  return CALLOUT_LABEL[kind];
}

export function detectCalloutKind(text: string): CalloutKind | null {
  const match = text
    .trim()
    .match(/^(?:\*\*)?(tip|note|warning|caution|remember|example|key(?:\s+idea)?)\s*:?(?:\*\*)?/i);
  if (!match) return null;
  return CALLOUT_ALIASES[match[1].toLowerCase()] ?? null;
}

/** Promote standalone Tip/Note/Warning lines into blockquotes so they render as callouts. */
export function normalizeCalloutMarkdown(content: string): string {
  return content.replace(
    /^(?!>\s)(?:\*\*)?(Tip|Note|Warning|Caution|Remember|Example|Key(?: idea)?):(?:\*\*)?\s+(\S.*)$/gim,
    '> **$1:** $2',
  );
}

export function extractKeyTerms(content: string, limit = 8): string[] {
  const terms: string[] = [];
  const seen = new Set<string>();
  const pattern = /\*\*([^*]{2,48})\*\*/g;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(content)) !== null) {
    const term = match[1].replace(/\s+/g, ' ').trim();
    if (!term || term.includes('\n') || KEY_TERM_SKIP.test(term)) continue;
    const key = term.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    terms.push(term);
    if (terms.length >= limit) break;
  }

  return terms;
}
