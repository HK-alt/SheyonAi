import { biologySubject } from '@/subject/subjects/biology';
import { chemistrySubject } from '@/subject/subjects/chemistry';
import { codingSubject } from '@/subject/subjects/coding';
import { dzongkhaSubject } from '@/subject/subjects/dzongkha';
import { englishSubject } from '@/subject/subjects/english';
import { geographySubject } from '@/subject/subjects/geography';
import { historySubject } from '@/subject/subjects/history';
import { mathSubject } from '@/subject/subjects/math';
import { personalSubject } from '@/subject/subjects/personal';
import { physicsSubject } from '@/subject/subjects/physics';
import type { SubjectConfig, SubjectIcon } from '@/subject/subjects/types';

/** Single source of truth — add new subjects here and in their own file under subjects/. */
export const ALL_SUBJECTS = [
  personalSubject,
  mathSubject,
  physicsSubject,
  chemistrySubject,
  biologySubject,
  englishSubject,
  historySubject,
  geographySubject,
  codingSubject,
  dzongkhaSubject,
] as const;

export type Subject = (typeof ALL_SUBJECTS)[number]['id'];

export const SUBJECTS = ALL_SUBJECTS.map(({ id, label }) => ({ id, label }));

export const SUBJECT_CONFIG = Object.fromEntries(
  ALL_SUBJECTS.map((entry) => [
    entry.id,
    {
      label: entry.label,
      ...('greeting' in entry && entry.greeting ? { greeting: entry.greeting } : {}),
      ...('greetingRomanization' in entry && entry.greetingRomanization
        ? { greetingRomanization: entry.greetingRomanization }
        : {}),
      placeholder: entry.placeholder,
      modeHint: entry.modeHint,
      prompts: entry.prompts,
      tutorPrompt: entry.tutorPrompt,
    },
  ]),
) as Record<Subject, SubjectConfig>;

export const SUBJECT_ICONS = {
  personal: personalSubject.icon,
  math: mathSubject.icon,
  physics: physicsSubject.icon,
  chemistry: chemistrySubject.icon,
  biology: biologySubject.icon,
  english: englishSubject.icon,
  history: historySubject.icon,
  geography: geographySubject.icon,
  coding: codingSubject.icon,
  dzongkha: dzongkhaSubject.icon,
} as const satisfies Record<Subject, SubjectIcon>;

/** Edge Function prompts — keep in sync with supabase/functions/deepseek-chat/index.ts */
export const SUBJECT_EDGE_TUTOR_PROMPTS = Object.fromEntries(
  ALL_SUBJECTS.map(({ id, label, tutorPrompt }) => [
    id,
    `The user is in ${label} mode. ${tutorPrompt}`,
  ]),
) as Record<Subject, string>;

export function getSubjectDefinition(subject: Subject) {
  return ALL_SUBJECTS.find((entry) => entry.id === subject);
}

export function getSubjectIcon(subject: Subject) {
  return SUBJECT_ICONS[subject];
}
