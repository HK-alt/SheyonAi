import { DZONGKHA_TUTOR_PROMPT } from '@/subject/subjects/dzongkha-tutor-prompt';
import type { SubjectDefinition } from '@/subject/subjects/types';

export const DZONGKHA_LAB_TUTOR_BLURB =
  ' Library mode is the accurate path: answer from the Dzongkha library (RAG) only — never invent Uchen. ' +
  'Vocab, Diagram, and Lab are practice UIs limited to a verified beginner seed lexicon; if the learner needs other words, tell them to switch to Library (do not invent spellings). ' +
  'Map mode may use Nominatim for Bhutan places but may only show seed Dzongkha phrases in popups/facts. ' +
  'Never use Standard/Lhasa Tibetan forms.';

export const dzongkhaSubject = {
  id: 'dzongkha',
  label: 'Dzongkha',
  greeting: 'ཀུ་ཟུ་བཟང་པོ་ལ',
  greetingRomanization: 'kuzuzangpo la',
  placeholder: 'Ask about Dzongkha words, grammar, or phrases…',
  modeHint: 'Library for accuracy · seed practice labs · Bhutan maps',
  prompts: [
    'ཀུ་ཟུ་བཟང་པོ་ལ — teach me greetings (beginner)',
    'Explain S-O-V with Dzongkha examples',
    'How do I say "I am a teacher" in Dzongkha?',
    'Quiz me on basic Dzongkha vocabulary',
  ],
  tutorPrompt: DZONGKHA_TUTOR_PROMPT + DZONGKHA_LAB_TUTOR_BLURB,
  icon: {
    ios: 'character.book.closed.fill',
    android: 'translate',
    web: 'translate',
  },
} as const satisfies SubjectDefinition;
