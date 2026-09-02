export type TutorLessonSectionId =
  | 'objective'
  | 'explanation'
  | 'example'
  | 'practice'
  | 'challenge';

export type TutorLessonSection = {
  id: TutorLessonSectionId;
  title: string;
  body: string;
};

export type ParsedTutorLesson = {
  leftover: string;
  sections: TutorLessonSection[];
};

export const LESSON_SECTION_DEFS: { id: TutorLessonSectionId; title: string }[] = [
  { id: 'objective', title: 'Objective' },
  { id: 'explanation', title: 'Explanation' },
  { id: 'example', title: 'Worked example' },
  { id: 'practice', title: 'Guided practice' },
  { id: 'challenge', title: 'Challenge' },
];

const HEADING_RE = /^##\s+(Objective|Explanation|Worked example|Guided practice|Challenge)\s*$/gim;

function keyFor(title: string): TutorLessonSectionId | null {
  const normalized = title.trim().toLowerCase();
  const match = LESSON_SECTION_DEFS.find((item) => item.title.toLowerCase() === normalized);
  return match?.id ?? null;
}

export function tryParseTutorLesson(content: string): ParsedTutorLesson | null {
  const text = content.trim();
  if (!/(^|\n)##\s+(Objective|Explanation|Worked example)\b/i.test(text)) return null;

  const matches = [...text.matchAll(HEADING_RE)];
  if (matches.length === 0) return null;

  const byId = new Map<TutorLessonSectionId, string>();
  for (let index = 0; index < matches.length; index += 1) {
    const match = matches[index];
    const id = keyFor(match[1] ?? '');
    if (!id) continue;
    const start = (match.index ?? 0) + match[0].length;
    const end = index + 1 < matches.length ? (matches[index + 1]?.index ?? text.length) : text.length;
    byId.set(id, text.slice(start, end).trim());
  }

  const sections = LESSON_SECTION_DEFS.map((def) => ({
    id: def.id,
    title: def.title,
    body: byId.get(def.id) ?? '',
  })).filter((section) => section.body.length > 0);

  if (sections.length < 2) return null;
  return {
    leftover: text.slice(0, matches[0]?.index ?? 0).trim(),
    sections,
  };
}
