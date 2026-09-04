export type SlideLayout =
  | 'title'
  | 'section'
  | 'bullets'
  | 'twoColumn'
  | 'comparison'
  | 'steps'
  | 'quote'
  | 'keyFacts'
  | 'agenda'
  | 'timeline'
  | 'cards'
  | 'closing'
  // ── Visual layouts ──────────────────────────────────────────────────────────
  | 'infographic'
  | 'chart'
  | 'diagram'
  | 'triangle'
  | 'pyramid'
  | 'cycle'
  | 'funnel';

export type ChartType = 'bar' | 'pie' | 'line';

export type SlideColumn = {
  heading: string;
  bullets: string[];
};

export type SlideFact = {
  label: string;
  value: string;
};

export type SlideCard = {
  heading: string;
  body: string;
};

/** One data point for a `chart` layout. */
export type SlideChartSeries = {
  label: string;
  value: number;
};

/** A node in a `diagram` layout flow. */
export type SlideNode = {
  id: string;
  label: string;
  detail?: string;
};

/** A directed edge in a `diagram` layout. */
export type SlideEdge = {
  from: string;
  to: string;
  label?: string;
};

/** One corner in a `triangle` layout (exactly 3). */
export type SlideVertex = {
  heading: string;
  body: string;
};

/** One tier in a `pyramid` layout (top = apex). */
export type SlideLevel = {
  heading: string;
  body: string;
};

export type Slide = {
  layout: SlideLayout;
  title: string;
  subtitle?: string;
  // ── Text-based layout fields ────────────────────────────────────────────────
  bullets?: string[];
  left?: SlideColumn;
  right?: SlideColumn;
  quote?: string;
  attribution?: string;
  steps?: string[];
  facts?: SlideFact[];
  /** Used by `cards` and `infographic` layouts */
  cards?: SlideCard[];
  notes?: string;
  // ── Visual layout fields ────────────────────────────────────────────────────
  /** `chart` layout: "bar" | "pie" | "line" */
  chartType?: ChartType;
  /** `chart` layout: data series (label + numeric value). 2–8 points. */
  series?: SlideChartSeries[];
  /** `diagram` layout: flow nodes. 3–6 items. */
  nodes?: SlideNode[];
  /** `diagram` layout: edges between node ids. */
  edges?: SlideEdge[];
  /** `triangle` layout: exactly 3 vertices. */
  vertices?: SlideVertex[];
  /** `pyramid` layout: 3–5 levels, levels[0] = apex. */
  levels?: SlideLevel[];
  /** `cycle` and `triangle` layouts: optional center label. */
  center?: string;
};

export type ParsedPresentation = {
  title: string;
  subtitle?: string;
  audience?: string;
  theme?: string;
  slides: Slide[];
  introText: string;
};

const VALID_LAYOUTS: SlideLayout[] = [
  'title', 'section', 'bullets', 'twoColumn', 'comparison',
  'steps', 'quote', 'keyFacts', 'agenda', 'timeline', 'cards', 'closing',
  'infographic', 'chart', 'diagram', 'triangle', 'pyramid', 'cycle', 'funnel',
];

const VALID_CHART_TYPES: ChartType[] = ['bar', 'pie', 'line'];

const JSON_FENCE_RE = /```json[^\n]*\n([\s\S]*?)```/i;

function extractJsonFence(content: string): { body: string; start: number } | null {
  const match = JSON_FENCE_RE.exec(content);
  if (!match) return null;
  return { body: match[1] ?? '', start: match.index };
}

function trimStr(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const s = value.trim();
  return s.length > 0 ? s : null;
}

function parseColumn(raw: unknown): SlideColumn | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const r = raw as Record<string, unknown>;
  const heading = trimStr(r.heading) ?? '';
  const bullets = Array.isArray(r.bullets)
    ? r.bullets.map((b) => trimStr(b)).filter((b): b is string => b !== null)
    : [];
  return { heading, bullets };
}

function parseFact(raw: unknown): SlideFact | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  const label = trimStr(r.label);
  const value = trimStr(r.value);
  if (!label || !value) return null;
  return { label, value };
}

function parseCard(raw: unknown): SlideCard | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  const heading = trimStr(r.heading);
  const body = trimStr(r.body);
  if (!heading || !body) return null;
  return { heading, body };
}

function parseChartSeries(raw: unknown): SlideChartSeries | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  const label = trimStr(r.label);
  const raw_val = r.value;
  const value =
    typeof raw_val === 'number'
      ? raw_val
      : parseFloat(String(raw_val ?? ''));
  if (!label || isNaN(value)) return null;
  return { label, value };
}

function parseNode(raw: unknown): SlideNode | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  const label = trimStr(r.label);
  if (!label) return null;
  const id = trimStr(r.id) ?? label;
  const detail = trimStr(r.detail) ?? undefined;
  return { id, label, ...(detail ? { detail } : {}) };
}

function parseEdge(raw: unknown): SlideEdge | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  const from = trimStr(r.from);
  const to = trimStr(r.to);
  if (!from || !to) return null;
  const label = trimStr(r.label) ?? undefined;
  return { from, to, ...(label ? { label } : {}) };
}

function parseVertex(raw: unknown): SlideVertex | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  const heading = trimStr(r.heading);
  const body = trimStr(r.body) ?? '';
  if (!heading) return null;
  return { heading, body };
}

function parseLevel(raw: unknown): SlideLevel | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  const heading = trimStr(r.heading);
  const body = trimStr(r.body) ?? '';
  if (!heading) return null;
  return { heading, body };
}

function parseSlide(raw: unknown): Slide | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  const title = trimStr(r.title) ?? 'Untitled';
  const layout: SlideLayout = VALID_LAYOUTS.includes(r.layout as SlideLayout)
    ? (r.layout as SlideLayout)
    : 'bullets';

  const slide: Slide = { layout, title };

  const subtitle = trimStr(r.subtitle);
  if (subtitle) slide.subtitle = subtitle;

  const notes = trimStr(r.notes);
  if (notes) slide.notes = notes;

  if (Array.isArray(r.bullets)) {
    slide.bullets = r.bullets
      .map((b) => trimStr(b))
      .filter((b): b is string => b !== null)
      .slice(0, 6);
  }

  if (Array.isArray(r.steps)) {
    slide.steps = r.steps
      .map((s) => trimStr(s))
      .filter((s): s is string => s !== null);
  }

  const left = parseColumn(r.left);
  if (left) slide.left = left;
  const right = parseColumn(r.right);
  if (right) slide.right = right;

  const quote = trimStr(r.quote);
  if (quote) slide.quote = quote;
  const attribution = trimStr(r.attribution);
  if (attribution) slide.attribution = attribution;

  if (Array.isArray(r.facts)) {
    const facts = r.facts.map(parseFact).filter((f): f is SlideFact => f !== null);
    if (facts.length > 0) slide.facts = facts;
  }

  if (Array.isArray(r.cards)) {
    const cards = r.cards.map(parseCard).filter((c): c is SlideCard => c !== null);
    if (cards.length > 0) slide.cards = cards;
  }

  // ── Visual layout fields ────────────────────────────────────────────────────

  const chartTypeRaw = trimStr(r.chartType);
  if (chartTypeRaw && VALID_CHART_TYPES.includes(chartTypeRaw as ChartType)) {
    slide.chartType = chartTypeRaw as ChartType;
  }

  if (Array.isArray(r.series)) {
    const series = r.series
      .map(parseChartSeries)
      .filter((s): s is SlideChartSeries => s !== null)
      .slice(0, 8);
    if (series.length > 0) slide.series = series;
  }

  if (Array.isArray(r.nodes)) {
    const nodes = r.nodes
      .map(parseNode)
      .filter((n): n is SlideNode => n !== null)
      .slice(0, 6);
    if (nodes.length > 0) slide.nodes = nodes;
  }

  if (Array.isArray(r.edges)) {
    const edges = r.edges
      .map(parseEdge)
      .filter((e): e is SlideEdge => e !== null)
      .slice(0, 10);
    if (edges.length > 0) slide.edges = edges;
  }

  if (Array.isArray(r.vertices)) {
    const vertices = r.vertices
      .map(parseVertex)
      .filter((v): v is SlideVertex => v !== null)
      .slice(0, 3); // exactly 3 for triangle
    if (vertices.length > 0) slide.vertices = vertices;
  }

  if (Array.isArray(r.levels)) {
    const levels = r.levels
      .map(parseLevel)
      .filter((l): l is SlideLevel => l !== null)
      .slice(0, 5); // 3–5 for pyramid
    if (levels.length > 0) slide.levels = levels;
  }

  const center = trimStr(r.center);
  if (center) slide.center = center;

  return slide;
}

/** Extract a Slides-mode JSON deck from assistant markdown. */
export function tryParsePresentation(content: string): ParsedPresentation | null {
  if (!content.trim()) return null;
  const fence = extractJsonFence(content);
  if (!fence) return null;

  let parsed: unknown;
  try {
    parsed = JSON.parse(fence.body);
  } catch {
    return null;
  }
  if (!parsed || typeof parsed !== 'object') return null;

  const record = parsed as Record<string, unknown>;
  if (!Array.isArray(record.slides)) return null;

  const slides = record.slides.map(parseSlide).filter((s): s is Slide => s !== null);
  if (slides.length < 1) return null;

  const title = trimStr(record.title) ?? 'Presentation';
  const result: ParsedPresentation = {
    title,
    slides,
    introText: content.slice(0, fence.start).trim(),
  };

  const subtitle = trimStr(record.subtitle);
  if (subtitle) result.subtitle = subtitle;
  const audience = trimStr(record.audience);
  if (audience) result.audience = audience;
  const theme = trimStr(record.theme);
  if (theme) {
    // Normalise to a known theme id when possible (case-insensitive).
    const normalised = theme.toLowerCase();
    result.theme = normalised;
  }

  return result;
}

/** True while a Slides-mode reply is still streaming. */
export function isPresentationPending(content: string, isStreaming: boolean): boolean {
  if (!isStreaming) return false;
  if (tryParsePresentation(content)) return false;
  const openJsonFence = /```json[^\n]*\n[\s\S]*$/i.test(content);
  return openJsonFence && !/```json[^\n]*\n[\s\S]*```/i.test(content);
}
