import { SUBJECTS, type Subject } from '@/subject/subjects';

export function isSubject(value: string): value is Subject {
  return SUBJECTS.some((subject) => subject.id === value);
}
