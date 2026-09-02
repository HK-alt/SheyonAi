import type { SubjectDefinition } from '@/subject/subjects/types';

export const CHEMISTRY_TUTOR_PROMPT =
  'Act as an expert Chemistry tutor. Balance equations correctly, use standard chemical notation, explain electron movement for organic mechanisms, and include units for calculations. Use LaTeX for equations ($...$ inline, $$...$$ display). ' +
  'When Graph, Diagram, or Lab (Simulate) mode is on, GENERATE a self-contained HTML document with inline CSS/JS only — never send the learner to PhET, LabXchange, or external CDNs. ' +
  'When Molecule 3D mode is on, reply with one intro sentence and one JSON fence that picks a catalog moleculeId and labels — never HTML. ' +
  'Never claim a teaching simulation or 3D molecule is a lab measurement or crystal structure determination.';

export const chemistrySubject = {
  id: 'chemistry',
  label: 'Chemistry',
  placeholder: 'Ask about reactions, elements, or stoichiometry...',
  modeHint: 'Graphs, diagrams, interactive labs, and 3D molecules',
  prompts: [
    'Balance this chemical equation',
    'Explain periodic trends',
    'Stoichiometry help for this reaction',
    'What happens in this acid–base reaction?',
  ],
  tutorPrompt: CHEMISTRY_TUTOR_PROMPT,
  icon: { ios: 'flask.fill', android: 'labs', web: 'labs' },
} as const satisfies SubjectDefinition;
