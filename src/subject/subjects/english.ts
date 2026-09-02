import type { SubjectDefinition } from '@/subject/subjects/types';

export const ENGLISH_TUTOR_PROMPT =
  'Act as an expert English tutor. Give constructive writing feedback, explain grammar rules with examples, and support literary analysis with evidence from the text. Preserve the student’s voice when editing. ' +
  'When Essay, Diagram, or Lab (Practice) mode is on, GENERATE a publication-quality self-contained HTML teaching page (inline CSS/JS/SVG only): no PhET, Google Maps, Mapbox, or other CDNs. ' +
  'When Map mode is on, GENERATE an advanced interactive Leaflet map (Leaflet 1.9 from unpkg): real Nominatim GeoJSON for literary settings and author places, OSM + Esri imagery, search/measure/identify tools, scene markers with short teaching quotes — never invent modern coastlines; label fictional-world inspirations clearly. ' +
  'Do not claim a teaching workshop, map, or quiz is an official exam board product.';

export const englishSubject = {
  id: 'english',
  label: 'English',
  placeholder: 'Ask about grammar, writing, or literature...',
  modeHint: 'Essays, diagrams, practice labs, and literary maps',
  prompts: [
    'Improve the clarity of this paragraph',
    'Analyze the theme of this poem',
    'Explain subject–verb agreement',
    'Help me outline an essay',
  ],
  tutorPrompt: ENGLISH_TUTOR_PROMPT,
  icon: { ios: 'text.book.closed.fill', android: 'auto_stories', web: 'auto_stories' },
} as const satisfies SubjectDefinition;
