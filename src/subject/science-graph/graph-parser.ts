import {
  SCIENCE_CHART_TYPES,
  SCIENCE_MODEL_TYPES,
  type ParsedScienceGraph,
  type ScienceAnnotation,
  type ScienceAxis,
  type ScienceChartType,
  type ScienceEraBand,
  type ScienceGraphControl,
  type ScienceGraphModel,
  type ScienceGraphModelType,
  type ScienceSeries,
  type ScienceSeriesPoint,
  type ScienceTimelineEvent,
} from '@/subject/science-graph/graph-types';
import { sampleModelPoints } from '@/subject/science-graph/graph-models';

type FenceMatch = {
  body: string;
  start: number;
  lang: string;
};

const FENCE_RE = /```([^\n`]*)\n([\s\S]*?)```/gi;

const SERIES_COLORS = ['#0f766e', '#1d4ed8', '#b45309', '#7c3aed', '#be123c', '#0369a1'];

function extractFences(content: string): FenceMatch[] {
  const fences: FenceMatch[] = [];
  let match: RegExpExecArray | null;
  FENCE_RE.lastIndex = 0;
  while ((match = FENCE_RE.exec(content)) !== null) {
    fences.push({
      lang: (match[1] ?? '').trim().toLowerCase(),
      body: match[2] ?? '',
      start: match.index,
    });
  }
  return fences;
}

function parseJsonObject(raw: string): Record<string, unknown> | null {
  const trimmed = raw.trim();
  if (!trimmed.startsWith('{')) return null;
  try {
    const value = JSON.parse(trimmed) as unknown;
    if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
    return value as Record<string, unknown>;
  } catch {
    return null;
  }
}

function asString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function asNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim() && Number.isFinite(Number(value))) {
    return Number(value);
  }
  return null;
}

function looksLikeScienceGraphPayload(obj: Record<string, unknown>): boolean {
  if ('chartType' in obj) return true;
  if ('diagramId' in obj || 'modelId' in obj || 'sceneId' in obj || 'moleculeId' in obj) {
    return false;
  }
  if (Array.isArray(obj.series) || Array.isArray(obj.events)) return true;
  return false;
}

function parseChartType(value: unknown): ScienceChartType {
  const raw = asString(value).toLowerCase();
  if ((SCIENCE_CHART_TYPES as readonly string[]).includes(raw)) {
    return raw as ScienceChartType;
  }
  if (raw === 'multiline' || raw === 'multi-line') return 'multiLine';
  if (raw === 'scatterplot' || raw === 'points') return 'scatter';
  return 'line';
}

function parseAxis(value: unknown): ScienceAxis | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined;
  const rec = value as Record<string, unknown>;
  const label = asString(rec.label) || asString(rec.title) || asString(rec.name);
  if (!label) return undefined;
  const unit = asString(rec.unit);
  return unit ? { label, unit } : { label };
}

function parsePoint(value: unknown): ScienceSeriesPoint | null {
  if (Array.isArray(value) && value.length >= 2) {
    const x = asNumber(value[0]);
    const y = asNumber(value[1]);
    if (x == null || y == null) return null;
    return [x, y];
  }
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    const rec = value as Record<string, unknown>;
    const x = asNumber(rec.x) ?? asNumber(rec.t) ?? asNumber(rec[0]);
    const y = asNumber(rec.y) ?? asNumber(rec.v) ?? asNumber(rec[1]);
    if (x == null || y == null) return null;
    return [x, y];
  }
  return null;
}

function parseSeries(value: unknown): ScienceSeries[] {
  if (!Array.isArray(value)) return [];
  const out: ScienceSeries[] = [];
  value.forEach((item, index) => {
    if (!item || typeof item !== 'object' || Array.isArray(item)) return;
    const rec = item as Record<string, unknown>;
    const label = asString(rec.label) || asString(rec.name) || asString(rec.id) || `Series ${index + 1}`;
    const id = asString(rec.id) || label.toLowerCase().replace(/\s+/g, '-');
    const color = asString(rec.color) || SERIES_COLORS[index % SERIES_COLORS.length];
    const rawPoints = Array.isArray(rec.points) ? rec.points : Array.isArray(rec.data) ? rec.data : [];
    const points = rawPoints
      .map(parsePoint)
      .filter((p): p is ScienceSeriesPoint => p != null)
      .slice(0, 600);
    if (!points.length) return;
    const yAxisRaw = asString(rec.yAxis).toLowerCase();
    const dashRaw = asString(rec.dash).toLowerCase();
    out.push({
      id,
      label,
      color,
      points,
      yAxis: yAxisRaw === 'right' ? 'right' : 'left',
      dash:
        dashRaw === 'dashed' || dashRaw === 'dash'
          ? 'dashed'
          : dashRaw === 'dotted' || dashRaw === 'dot'
            ? 'dotted'
            : 'solid',
      markers: rec.markers === true || asString(rec.markers).toLowerCase() === 'true',
    });
  });
  return out.slice(0, 8);
}

function parseEvents(value: unknown): ScienceTimelineEvent[] {
  if (!Array.isArray(value)) return [];
  const out: ScienceTimelineEvent[] = [];
  value.forEach((item, index) => {
    if (!item || typeof item !== 'object' || Array.isArray(item)) return;
    const rec = item as Record<string, unknown>;
    const label = asString(rec.label) || asString(rec.title) || asString(rec.name) || `Event ${index + 1}`;
    const start = asNumber(rec.start) ?? asNumber(rec.year) ?? asNumber(rec.date);
    if (start == null) return;
    const end = asNumber(rec.end) ?? undefined;
    const importance = asNumber(rec.importance) ?? asNumber(rec.weight);
    out.push({
      id: asString(rec.id) || label.toLowerCase().replace(/\s+/g, '-'),
      label,
      start,
      end: end ?? undefined,
      detail: asString(rec.detail) || asString(rec.description) || undefined,
      category: asString(rec.category) || asString(rec.era) || asString(rec.region) || undefined,
      color: asString(rec.color) || SERIES_COLORS[index % SERIES_COLORS.length],
      importance:
        importance == null ? undefined : Math.max(1, Math.min(5, Math.round(importance))),
    });
  });
  return out.slice(0, 60);
}

function parseEras(value: unknown): ScienceEraBand[] {
  if (!Array.isArray(value)) return [];
  const out: ScienceEraBand[] = [];
  value.forEach((item, index) => {
    if (!item || typeof item !== 'object' || Array.isArray(item)) return;
    const rec = item as Record<string, unknown>;
    const label = asString(rec.label) || asString(rec.name) || asString(rec.title) || `Era ${index + 1}`;
    const start = asNumber(rec.start);
    const end = asNumber(rec.end);
    if (start == null || end == null) return;
    out.push({
      id: asString(rec.id) || label.toLowerCase().replace(/\s+/g, '-'),
      label,
      start,
      end,
      color: asString(rec.color) || undefined,
    });
  });
  return out.slice(0, 12);
}

function parseAnnotations(value: unknown): ScienceAnnotation[] {
  if (!Array.isArray(value)) return [];
  const out: ScienceAnnotation[] = [];
  value.forEach((item, index) => {
    if (!item || typeof item !== 'object' || Array.isArray(item)) return;
    const rec = item as Record<string, unknown>;
    const label = asString(rec.label) || asString(rec.title) || asString(rec.name) || `Note ${index + 1}`;
    const x = asNumber(rec.x);
    const y = asNumber(rec.y);
    if (x == null && y == null) return;
    const yAxisRaw = asString(rec.yAxis).toLowerCase();
    out.push({
      id: asString(rec.id) || label.toLowerCase().replace(/\s+/g, '-'),
      label,
      x: x ?? undefined,
      y: y ?? undefined,
      yAxis: yAxisRaw === 'right' ? 'right' : 'left',
      color: asString(rec.color) || '#b45309',
      detail: asString(rec.detail) || asString(rec.description) || undefined,
    });
  });
  return out.slice(0, 12);
}

function parseInsights(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => asString(item))
    .filter(Boolean)
    .slice(0, 6);
}

function parseControls(value: unknown): ScienceGraphControl[] {
  if (!Array.isArray(value)) return [];
  const out: ScienceGraphControl[] = [];
  for (const item of value) {
    if (!item || typeof item !== 'object' || Array.isArray(item)) continue;
    const rec = item as Record<string, unknown>;
    const id = asString(rec.id) || asString(rec.name) || asString(rec.label);
    if (!id) continue;
    const min = asNumber(rec.min) ?? 0;
    const max = asNumber(rec.max) ?? Math.max(min + 1, 100);
    const step = asNumber(rec.step) ?? (max - min) / 20;
    const valueNum = asNumber(rec.value) ?? min;
    out.push({
      id,
      label: asString(rec.label) || id,
      min,
      max: max <= min ? min + 1 : max,
      step: step > 0 ? step : 1,
      value: valueNum,
    });
  }
  return out.slice(0, 5);
}

function parseModel(value: unknown): ScienceGraphModel | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined;
  const rec = value as Record<string, unknown>;
  const typeRaw = asString(rec.type).toLowerCase();
  let type: ScienceGraphModelType | null = null;
  if ((SCIENCE_MODEL_TYPES as readonly string[]).includes(typeRaw)) {
    type = typeRaw as ScienceGraphModelType;
  } else if (typeRaw === 'michaelis-menten' || typeRaw === 'mm') {
    type = 'michaelisMenten';
  } else if (typeRaw === 'quad' || typeRaw === 'parabola') {
    type = 'quadratic';
  } else if (typeRaw === 'sin' || typeRaw === 'wave') {
    type = 'sine';
  }
  if (!type) return undefined;
  const paramsRaw =
    rec.params && typeof rec.params === 'object' && !Array.isArray(rec.params)
      ? (rec.params as Record<string, unknown>)
      : {};
  const params: Record<string, number> = {};
  for (const [key, val] of Object.entries(paramsRaw)) {
    const n = asNumber(val);
    if (n != null) params[key] = n;
  }
  for (const key of Object.keys(rec)) {
    if (key === 'type' || key === 'params') continue;
    const n = asNumber(rec[key]);
    if (n != null && params[key] == null) params[key] = n;
  }
  return { type, params };
}

function ensureRenderable(payload: ParsedScienceGraph): ParsedScienceGraph | null {
  if (payload.chartType === 'timeline') {
    if (!payload.events?.length) return null;
    return payload;
  }

  let series = payload.series ?? [];
  if ((!series.length || series.every((s) => s.points.length < 2)) && payload.model) {
    const overrides: Record<string, number> = {};
    for (const c of payload.controls ?? []) overrides[c.id] = c.value;
    const points = sampleModelPoints(payload.model, {
      ...payload.model.params,
      ...overrides,
    });
    series = [
      {
        id: 'model',
        label: payload.title || 'Model',
        color: SERIES_COLORS[0],
        points,
        yAxis: 'left',
        dash: 'solid',
      },
    ];
  }

  if (!series.length || series.every((s) => s.points.length < 2)) return null;

  let chartType: ScienceChartType = payload.chartType;
  if (chartType === 'multiLine' && series.length < 2) chartType = 'line';
  else if (chartType === 'line' && series.length > 1) chartType = 'multiLine';
  else if (chartType === 'scatter' && series.every((s) => !s.markers)) {
    series = series.map((s) => ({ ...s, markers: true }));
  }

  // Auto-add K annotation for logistic when missing.
  let annotations = payload.annotations ?? [];
  if (
    payload.model?.type === 'logistic' &&
    !annotations.some((a) => a.y != null) &&
    (payload.model.params.K != null || payload.controls?.some((c) => c.id === 'K'))
  ) {
    const K =
      payload.controls?.find((c) => c.id === 'K')?.value ?? payload.model.params.K ?? 100;
    annotations = [
      ...annotations,
      {
        id: 'auto-k',
        label: 'K',
        y: K,
        color: '#b45309',
        detail: 'Carrying capacity',
      },
    ];
  }

  return { ...payload, chartType, series, annotations };
}

export function tryParseScienceGraph(content: string): ParsedScienceGraph | null {
  if (!content.trim()) return null;
  const fences = extractFences(content);
  const jsonFence = fences.find((f) => {
    const lang = f.lang.split(/\s+/)[0] ?? '';
    if (lang && lang !== 'json') return false;
    const obj = parseJsonObject(f.body);
    return !!obj && looksLikeScienceGraphPayload(obj);
  });
  if (!jsonFence) return null;
  const obj = parseJsonObject(jsonFence.body);
  if (!obj) return null;

  const chartType = parseChartType(obj.chartType);
  const title = asString(obj.title) || 'Teaching graph';
  const goal = asString(obj.goal) || asString(obj.learningGoal) || undefined;
  const caption =
    asString(obj.caption) ||
    (chartType === 'timeline'
      ? 'Generated timeline — teaching model; dates are approximate teaching markers.'
      : 'Generated graph — teaching model.');

  const draft: ParsedScienceGraph = {
    introText: content.slice(0, jsonFence.start).trim(),
    chartType,
    title,
    goal,
    caption,
    xAxis: parseAxis(obj.xAxis) || parseAxis(obj.x),
    yAxis: parseAxis(obj.yAxis) || parseAxis(obj.y),
    yAxisRight: parseAxis(obj.yAxisRight) || parseAxis(obj.yRight),
    series: parseSeries(obj.series),
    events: parseEvents(obj.events || obj.timeline),
    eras: parseEras(obj.eras || obj.bands || obj.periods),
    annotations: parseAnnotations(obj.annotations || obj.markers || obj.references),
    insights: parseInsights(obj.insights || obj.takeaways || obj.keyPoints),
    controls: parseControls(obj.controls),
    model: parseModel(obj.model),
  };

  return ensureRenderable(draft);
}

export function isScienceGraphPending(content: string, isStreaming: boolean): boolean {
  if (!isStreaming) return false;
  if (tryParseScienceGraph(content)) return false;
  const openJson = /```json[^\n]*\n[\s\S]*$/i.test(content);
  const closedJson = /```json[^\n]*\n[\s\S]*```/i.test(content);
  return openJson && !closedJson;
}
