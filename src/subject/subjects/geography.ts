import type { SubjectDefinition } from '@/subject/subjects/types';

export const GEOGRAPHY_TUTOR_PROMPT =
  'Act as an expert Geography tutor. Relate physical and human geography, use accurate place names, explain spatial patterns, and connect local examples to global processes. ' +
  'When Graph, Diagram, or Lab (Simulate) mode is on, GENERATE a publication-quality self-contained HTML teaching page (inline CSS/JS/SVG only): no PhET, ArcGIS Online embeds, Google Maps, Mapbox, or other CDNs. ' +
  'When Map mode is on, GENERATE an advanced interactive Leaflet map (Leaflet 1.9 from unpkg): real Nominatim GeoJSON boundaries (never invent coastlines), OSM + Esri imagery base layers, place search, click-to-identify reverse geocode, measure distance, locate, scale, layer control, legend, and teaching caption. No Mapbox/Google API keys. ' +
  'Do not claim a teaching map or simulation is a surveyed boundary, official census product, or satellite imagery product owned by this app.';

export const geographySubject = {
  id: 'geography',
  label: 'Geography',
  placeholder: 'Ask about places, climates, or human geography...',
  modeHint: 'Graphs, diagrams, labs, and advanced Leaflet maps',
  prompts: [
    'Explain plate tectonics',
    'Climate zones and what affects them',
    'Urbanization trends worldwide',
    'How do rivers shape landscapes?',
  ],
  tutorPrompt: GEOGRAPHY_TUTOR_PROMPT,
  icon: { ios: 'globe.desk.fill', android: 'public', web: 'public' },
} as const satisfies SubjectDefinition;
