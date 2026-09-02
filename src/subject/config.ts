import type { Subject } from '@/subject/subjects';
import { SUBJECT_CONFIG, SUBJECT_ICONS } from '@/subject/subjects';
import type { SubjectConfig, SubjectIcon } from '@/subject/subjects/types';

export { SUBJECT_CONFIG };

export const SUBJECT_ACCENT: Record<Subject, string> = {
  personal: '#E86A2E',
  math: '#2563EB',
  physics: '#0284C7',
  chemistry: '#D97706',
  biology: '#059669',
  english: '#7C3AED',
  history: '#B45309',
  geography: '#0D9488',
  coding: '#4F46E5',
  dzongkha: '#6D28D9',
};

export function getSubjectConfig(subject: Subject | null | undefined): SubjectConfig | null {
  if (!subject) return null;
  return SUBJECT_CONFIG[subject] ?? null;
}

export function getSubjectPlaceholder(subject: Subject | null | undefined): string {
  return getSubjectConfig(subject)?.placeholder ?? 'Ask anything...';
}

export function getSubjectAccentColor(subject: Subject | null | undefined): string | null {
  if (!subject) return null;
  return SUBJECT_ACCENT[subject] ?? null;
}

export function getSubjectChipIcon(subject: Subject | null | undefined): SubjectIcon {
  if (subject) return SUBJECT_ICONS[subject];
  return { ios: 'square.grid.2x2.fill', android: 'grid_view', web: 'grid_view' };
}

/** Header / empty-state title. Avoids "Personal Tutor tutor". */
export function getSubjectTutorTitle(subject: Subject | null | undefined): string | null {
  const config = getSubjectConfig(subject);
  if (!config) return null;
  return /tutor$/i.test(config.label) ? config.label : `${config.label} tutor`;
}
