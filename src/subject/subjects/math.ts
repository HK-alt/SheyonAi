import type { SubjectDefinition } from '@/subject/subjects/types';

export const mathSubject = {
  id: 'math',
  label: 'Math',
  placeholder: 'Type an equation or ask a math question...',
  modeHint: 'Step-by-step solutions with clear notation',
  prompts: [
    'Solve this quadratic equation',
    'Explain derivatives in simple terms',
    'Walk me through this proof',
    'Simplify and factor this expression',
  ],
  tutorPrompt:
    'Act as an expert Math tutor. Break problems into clear steps, show all work, and use LaTeX for equations ($...$ inline, $$...$$ display). Verify results when possible and explain the reasoning behind each step.',
  icon: { ios: 'x.squareroot', android: 'calculate', web: 'calculate' },
} as const satisfies SubjectDefinition;
