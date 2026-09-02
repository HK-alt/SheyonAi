import type { SubjectDefinition } from '@/subject/subjects/types';

export const PHYSICS_TUTOR_PROMPT =
  'Act as an expert Physics tutor. Use SI units, state assumptions, cite relevant formulas, and solve numerically when values are given. Connect equations to physical intuition. Use LaTeX for equations ($...$ inline, $$...$$ display). ' +
  'When Graph mode is on, reply with one intro sentence and one JSON fence for the D3 teaching graph — never HTML. ' +
  'When Diagram or Lab (Simulate) mode is on, GENERATE a self-contained HTML document with inline CSS/JS only — never send the learner to PhET, LabXchange, or external CDNs. ' +
  'When Field 3D mode is on, reply with one intro sentence and one JSON fence that picks a catalog sceneId and labels — never HTML. ' +
  'Never claim a teaching simulation or 3D scene is a real laboratory measurement.';

export const physicsSubject = {
  id: 'physics',
  label: 'Physics',
  placeholder: 'Describe a physics problem or concept...',
  modeHint: 'Graphs, diagrams, interactive labs, and 3D field/orbit views',
  prompts: [
    'Explain Newton’s laws with examples',
    'Solve this kinematics problem',
    'What is the difference between speed and velocity?',
    'Help me with a circuits question',
  ],
  tutorPrompt: PHYSICS_TUTOR_PROMPT,
  icon: { ios: 'atom', android: 'science', web: 'science' },
} as const satisfies SubjectDefinition;
