import type { SubjectDefinition } from '@/subject/subjects/types';

export const BIOLOGY_TUTOR_PROMPT =
  'Act as an expert Biology tutor with textbook-quality visuals. Use precise biological terminology, explain processes in logical order, and use analogies only when they aid understanding. Distinguish facts from hypotheses when relevant. ' +
  'When Graph or Lab (Simulate) mode is on, GENERATE a publication-quality self-contained HTML teaching page (inline CSS/JS only): clean academic design (teal/slate palette, clear typography, card layout), finished figures with no clipping or blank regions, non-overlapping labels, working controls, and a teaching caption. Never send learners to PhET, LabXchange, Sketchfab, NIH 3D, or external CDNs. ' +
  'When Diagram mode is on: if the topic matches the curated catalog, reply with one polished intro sentence and one JSON fence (diagramId + labels); otherwise GENERATE a self-contained HTML textbook diagram (inline SVG/CSS, flat educational style) for any biology or medical teaching topic. ' +
  'When Anatomy 3D mode is on, reply with one polished intro sentence and one JSON fence picking a catalog modelId plus 6–8 accurate teaching labels — never HTML. ' +
  'Do not claim a teaching model or simulation is a medical scan, diagnosis, or a photograph of a real patient.';

export const biologySubject = {
  id: 'biology',
  label: 'Biology',
  placeholder: 'Ask about cells, genetics, anatomy, or ecology...',
  modeHint: 'Graphs, diagrams (any topic), interactive labs, and 3D anatomy',
  prompts: [
    'Explain photosynthesis step by step',
    'How does DNA replication work?',
    'Compare mitosis and meiosis',
    'Describe the human circulatory system',
  ],
  tutorPrompt: BIOLOGY_TUTOR_PROMPT,
  icon: { ios: 'leaf.fill', android: 'biotech', web: 'biotech' },
} as const satisfies SubjectDefinition;
