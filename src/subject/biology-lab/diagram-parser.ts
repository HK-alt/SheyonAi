import {
  getDiagramCatalogEntry,
  isDiagramId,
  resolveDiagramId,
  type DiagramId,
} from '@/subject/biology-lab/diagram-catalog';

export type DiagramLabel = {
  id: string;
  title: string;
  detail: string;
};

export type ParsedDiagram = {
  introText: string;
  diagramId: DiagramId;
  title: string;
  focus: string;
  labels: DiagramLabel[];
  resolvedFrom?: string;
  closestNote?: string;
};

type FenceMatch = {
  body: string;
  start: number;
  lang: string;
};

const FENCE_RE = /```([^\n`]*)\n([\s\S]*?)```/gi;

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

function parseLabels(value: unknown): DiagramLabel[] {
  if (!Array.isArray(value)) return [];
  const labels: DiagramLabel[] = [];
  for (const item of value) {
    if (!item || typeof item !== 'object' || Array.isArray(item)) continue;
    const rec = item as Record<string, unknown>;
    const title = asString(rec.title) || asString(rec.name) || asString(rec.id);
    if (!title) continue;
    const id = asString(rec.id) || title.toLowerCase().replace(/\s+/g, '-');
    labels.push({
      id,
      title,
      detail: asString(rec.detail) || asString(rec.description),
    });
  }
  return labels.slice(0, 12);
}

function looksLikeDiagramPayload(obj: Record<string, unknown>): boolean {
  return 'diagramId' in obj || 'diagram' in obj;
}

export function tryParseDiagram(content: string): ParsedDiagram | null {
  if (!content.trim()) return null;
  const fences = extractFences(content);
  const jsonFence = fences.find((f) => {
    const lang = f.lang.split(/\s+/)[0] ?? '';
    if (lang && lang !== 'json') return false;
    const obj = parseJsonObject(f.body);
    return !!obj && looksLikeDiagramPayload(obj);
  });
  const loose =
    jsonFence ??
    fences.find((f) => {
      const obj = parseJsonObject(f.body);
      return !!obj && looksLikeDiagramPayload(obj);
    });
  if (!loose) return null;
  const obj = parseJsonObject(loose.body);
  if (!obj) return null;

  const requested = asString(obj.diagramId) || asString(obj.diagram);
  const diagramId = resolveDiagramId(requested || 'animal_cell');
  const entry = getDiagramCatalogEntry(diagramId);
  const title = asString(obj.title) || entry.title;
  const focus = asString(obj.focus);
  const labels = parseLabels(obj.labels);
  const resolvedFrom = requested && requested !== diagramId ? requested : undefined;
  const closestNote =
    (!isDiagramId(requested.toLowerCase().replace(/\s+/g, '_').replace(/-/g, '_')) && requested
      ? `Closest figure: ${entry.title}.`
      : undefined) || entry.closestNote;

  return {
    introText: content.slice(0, loose.start).trim(),
    diagramId,
    title,
    focus,
    labels,
    resolvedFrom,
    closestNote,
  };
}

export function isDiagramPending(content: string, isStreaming: boolean): boolean {
  if (!isStreaming) return false;
  if (tryParseDiagram(content)) return false;
  const openJson = /```json[^\n]*\n[\s\S]*$/i.test(content);
  const closedJson = /```json[^\n]*\n[\s\S]*```/i.test(content);
  if (openJson && !closedJson) return true;
  const openHtml = /```html[^\n]*\n[\s\S]*$/i.test(content);
  const closedHtml = /```html[^\n]*\n[\s\S]*```/i.test(content);
  return openHtml && !closedHtml;
}
