import type { ResearchSource } from '@/types/research';

export function tintColor(hex: string, alpha: number) {
  const raw = hex.replace('#', '');
  const n = parseInt(raw.length === 3 ? raw.split('').map((c) => c + c).join('') : raw, 16);
  if (Number.isNaN(n)) return hex;
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  return `rgba(${r},${g},${b},${alpha})`;
}

export const RESEARCH_SOURCES = [
  {
    id: 'all' as const,
    label: 'All libraries',
    hint: 'Best starting point — mixes everyday pages with real papers.',
    blurb: 'Search everything together. Use this if you are not sure where to look.',
    example: 'climate change',
    icon: { ios: 'square.stack' as const, android: 'layers' as const, web: 'layers' as const },
    color: '#7C3AED',
  },
  {
    id: 'web' as const,
    label: 'Wikipedia',
    hint: 'Simple background — like a textbook intro.',
    blurb: 'Plain-language articles. Great for “what is this?” before reading papers.',
    example: 'how vaccines work',
    icon: { ios: 'globe' as const, android: 'language' as const, web: 'language' as const },
    color: '#2563EB',
  },
  {
    id: 'arxiv' as const,
    label: 'arXiv',
    hint: 'Physics, math, computer science, astronomy.',
    blurb: 'Free science papers, often before they are published in a journal.',
    example: 'black holes',
    icon: { ios: 'doc.text' as const, android: 'description' as const, web: 'description' as const },
    color: '#B45309',
  },
  {
    id: 'pubmed' as const,
    label: 'PubMed',
    hint: 'Health, medicine, biology, and psychology.',
    blurb: 'Medical studies from the U.S. National Library of Medicine.',
    example: 'diabetes treatment',
    icon: { ios: 'cross.case' as const, android: 'medical_services' as const, web: 'medical_services' as const },
    color: '#0D9488',
  },
  {
    id: 'semanticscholar' as const,
    label: 'Semantic Scholar',
    hint: 'Academic papers across many subjects.',
    blurb: 'A wide academic search — useful when the topic is not only medical or physics.',
    example: 'machine learning education',
    icon: { ios: 'books.vertical' as const, android: 'menu_book' as const, web: 'menu_book' as const },
    color: '#15803D',
  },
] as const;

export const RESEARCH_EXAMPLES: Array<{
  label: string;
  query: string;
  source: ResearchSource;
}> = [
  { label: 'Photosynthesis', query: 'photosynthesis', source: 'all' },
  { label: 'How vaccines work', query: 'how vaccines work', source: 'web' },
  { label: 'Black holes', query: 'black holes', source: 'arxiv' },
  { label: 'Diabetes treatment', query: 'diabetes treatment', source: 'pubmed' },
];

export function researchSourceMeta(id: ResearchSource) {
  return RESEARCH_SOURCES.find((item) => item.id === id) ?? RESEARCH_SOURCES[0];
}
