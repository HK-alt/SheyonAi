import { CODING_TUTOR_PROMPT } from '@/subject/subjects/coding-tutor-prompt';
import type { SubjectDefinition } from '@/subject/subjects/types';

export const codingSubject = {
  id: 'coding',
  label: 'Coding',
  greeting: 'Ready to code?',
  placeholder: 'Paste code, paste an error, or ask about HTML, CSS, React, or algorithms…',
  modeHint: 'Learn HTML, CSS & React — debug, review, explain, build with live preview',
  prompts: [
    'Debug this error and explain the root cause',
    'Review my React component for bugs and improvements',
    'Explain CSS flexbox with a small runnable example',
    'Build a professional landing page hero section',
  ],
  tutorPrompt: CODING_TUTOR_PROMPT,
  icon: {
    ios: 'curlybraces',
    android: 'terminal',
    web: 'terminal',
  },
} as const satisfies SubjectDefinition;
