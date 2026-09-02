import type { TutorMode } from '@/types/chat';

/** Camera homework pipeline intents. */
export type HomeworkIntent = 'solve' | 'explain' | 'check';

export const HOMEWORK_INTENT_META: Record<
  HomeworkIntent,
  {
    label: string;
    hint: string;
    seedText: string;
    tutorMode: TutorMode;
  }
> = {
  solve: {
    label: 'Solve',
    hint: 'Solve mode — step-by-step solution from the photo',
    seedText: 'Solve this step by step from the photo.',
    tutorMode: 'solution',
  },
  explain: {
    label: 'Explain',
    hint: 'Explain mode — teach the concepts in the photo',
    seedText: 'Explain what is in this photo and teach the concepts clearly.',
    tutorMode: 'teach',
  },
  check: {
    label: 'Check',
    hint: 'Check mode — coach my work without giving the answer first',
    seedText: 'Check my work in this photo. Coach me — do not give the final answer first.',
    tutorMode: 'no_answer',
  },
};
