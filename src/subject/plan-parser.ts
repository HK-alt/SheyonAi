export type TutorPlanSectionId =
  | 'goal'
  | 'diagnosis'
  | 'weekly'
  | 'checkpoints'
  | 'behind'
  | 'first';

export type TutorPlanSection = {
  id: TutorPlanSectionId;
  title: string;
  body: string;
};

export type TutorPlanRow = {
  day: string;
  focus: string;
  duration: string;
};

export type ParsedTutorPlan = {
  leftover: string;
  sections: TutorPlanSection[];
  week: TutorPlanRow[];
  checkpoints: string[];
};

export const PLAN_SECTION_DEFS: { id: TutorPlanSectionId; title: string }[] = [
  { id: 'goal', title: 'Goal' },
  { id: 'diagnosis', title: 'Diagnosis' },
  { id: 'weekly', title: 'Weekly plan' },
  { id: 'checkpoints', title: 'Checkpoints' },
  { id: 'behind', title: 'If behind' },
  { id: 'first', title: 'First session' },
];

const HEADING_RE =
  /^##\s+(Goal|Diagnosis|Current level|Weekly plan|Checkpoints|If behind|First session)\s*$/gim;
const BULLET_RE = /^\s*(?:[-*•]|\d+[.)])\s+(.+?)\s*$/;

function keyFor(title: string): TutorPlanSectionId | null {
  const normalized = title.trim().toLowerCase();
  if (normalized === 'goal') return 'goal';
  if (normalized === 'diagnosis' || normalized === 'current level') return 'diagnosis';
  if (normalized === 'weekly plan') return 'weekly';
  if (normalized === 'checkpoints') return 'checkpoints';
  if (normalized === 'if behind') return 'behind';
  if (normalized === 'first session') return 'first';
  return null;
}

function splitCells(line: string): string[] {
  return line
    .replace(/^\s*\|/, '')
    .replace(/\|\s*$/, '')
    .split('|')
    .map((cell) => cell.trim());
}

function isDividerRow(cells: string[]): boolean {
  return cells.length > 0 && cells.every((cell) => /^:?-{3,}:?$/.test(cell.replace(/\s/g, '')));
}

export function parseMarkdownTable(body: string): string[][] {
  const rows: string[][] = [];
  for (const line of body.split('\n')) {
    if (!line.includes('|')) continue;
    const cells = splitCells(line);
    if (cells.length === 0 || isDividerRow(cells)) continue;
    if (cells.every((cell) => cell.length === 0)) continue;
    rows.push(cells);
  }
  return rows;
}

export function parseWeekRows(body: string): TutorPlanRow[] {
  const table = parseMarkdownTable(body);
  if (table.length === 0) return [];
  const header = table[0].map((cell) => cell.toLowerCase());
  const looksLikeHeader =
    header.some((cell) => cell.includes('day')) ||
    header.some((cell) => cell.includes('focus')) ||
    header.some((cell) => cell.includes('duration'));
  const data = looksLikeHeader ? table.slice(1) : table;
  return data.map((cells) => ({
    day: cells[0] ?? '',
    focus: cells[1] ?? '',
    duration: cells[2] ?? '',
  })).filter((row) => row.day.length > 0 || row.focus.length > 0);
}

export function parseCheckpointList(body: string): string[] {
  const items: string[] = [];
  const seen = new Set<string>();
  for (const line of body.split('\n')) {
    const match = BULLET_RE.exec(line);
    const text = (match?.[1] ?? '').replace(/\*\*/g, '').trim();
    if (!text) continue;
    const key = text.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    items.push(text);
  }
  return items;
}

export function tryParseTutorPlan(content: string): ParsedTutorPlan | null {
  const text = content.trim();
  if (!/(^|\n)##\s+(Goal|Weekly plan|Checkpoints)\b/i.test(text)) return null;

  const matches = [...text.matchAll(HEADING_RE)];
  if (matches.length === 0) return null;

  const byId = new Map<TutorPlanSectionId, string>();
  for (let index = 0; index < matches.length; index += 1) {
    const match = matches[index];
    const id = keyFor(match[1] ?? '');
    if (!id) continue;
    const start = (match.index ?? 0) + match[0].length;
    const end = index + 1 < matches.length ? (matches[index + 1]?.index ?? text.length) : text.length;
    const body = text.slice(start, end).trim();
    const existing = byId.get(id);
    byId.set(id, existing ? `${existing}\n\n${body}` : body);
  }

  const sections = PLAN_SECTION_DEFS.map((def) => ({
    id: def.id,
    title: def.title,
    body: byId.get(def.id) ?? '',
  })).filter((section) => section.body.length > 0);

  if (sections.length < 2) return null;
  const weekly = byId.get('weekly') ?? '';
  const checkpointsBody = byId.get('checkpoints') ?? '';
  return {
    leftover: text.slice(0, matches[0]?.index ?? 0).trim(),
    sections,
    week: parseWeekRows(weekly),
    checkpoints: parseCheckpointList(checkpointsBody),
  };
}
