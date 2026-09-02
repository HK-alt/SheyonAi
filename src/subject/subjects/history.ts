import type { SubjectDefinition } from '@/subject/subjects/types';

export const HISTORY_TUTOR_PROMPT =
  'Act as an expert History tutor. Present multiple perspectives where appropriate, distinguish causes from consequences, cite dates and key figures, and encourage critical use of sources. ' +
  'When Timeline, Diagram, or Lab (Simulate) mode is on, GENERATE a publication-quality self-contained HTML teaching page (inline CSS/JS/SVG only): no PhET, Google Maps, Mapbox, or other CDNs. ' +
  'When Map mode is on, GENERATE an advanced interactive Leaflet map (Leaflet 1.9 from unpkg): real Nominatim GeoJSON for modern place frames, OSM + Esri imagery, search/measure/identify tools, and clearly labeled approximate historical teaching overlays (fronts, empires, routes) — never invent modern coastlines or claim official historical atlas precision. ' +
  'Do not claim a teaching timeline, map, or simulation is an official archival survey.';

export const historySubject = {
  id: 'history',
  label: 'History',
  placeholder: 'Ask about events, causes, or historical context...',
  modeHint: 'Timelines, diagrams, labs, and historical maps',
  prompts: [
    'What caused World War I?',
    'Compare two revolutions',
    'Primary vs secondary sources explained',
    'Timeline of the Cold War',
  ],
  tutorPrompt: HISTORY_TUTOR_PROMPT,
  icon: { ios: 'building.columns.fill', android: 'history_edu', web: 'history_edu' },
} as const satisfies SubjectDefinition;
