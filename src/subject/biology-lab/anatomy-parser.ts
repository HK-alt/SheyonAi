import {
  getAnatomyCatalogEntry,
  isAnatomyModelId,
  resolveAnatomyModelId,
  type AnatomyModelId,
} from '@/subject/biology-lab/gltf-catalog';
import {
  normalizeAnatomyLabels,
  type NormalizedAnatomyLabel,
} from '@/subject/biology-lab/anatomy-label-catalog';

export type AnatomyLabel = {
  id: string;
  title: string;
  detail: string;
};

export type { NormalizedAnatomyLabel };

export type ParsedAnatomy = {
  introText: string;
  modelId: AnatomyModelId;
  title: string;
  focus: string;
  labels: NormalizedAnatomyLabel[];
  resolvedFrom?: string;
  closestNote?: string;
  showNephronInset?: boolean;
  scopeNote?: string;
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

function parseLabels(value: unknown): AnatomyLabel[] {
  if (!Array.isArray(value)) return [];
  const labels: AnatomyLabel[] = [];
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

function looksLikeAnatomyPayload(obj: Record<string, unknown>): boolean {
  if ('chartType' in obj || 'sceneId' in obj || 'moleculeId' in obj) return false;
  return 'modelId' in obj || 'model' in obj;
}

export function tryParseAnatomy(content: string): ParsedAnatomy | null {
  if (!content.trim()) return null;
  const fences = extractFences(content);
  const jsonFence = fences.find((f) => {
    const lang = f.lang.split(/\s+/)[0] ?? '';
    if (lang && lang !== 'json') return false;
    const obj = parseJsonObject(f.body);
    return !!obj && looksLikeAnatomyPayload(obj);
  });
  if (!jsonFence) return null;
  const obj = parseJsonObject(jsonFence.body);
  if (!obj) return null;

  const requested = asString(obj.modelId) || asString(obj.model);
  const modelId = resolveAnatomyModelId(requested);
  const entry = getAnatomyCatalogEntry(modelId);
  const title = asString(obj.title) || entry.title;
  const focus = asString(obj.focus);
  const rawLabels = parseLabels(obj.labels);
  const { labels, showNephronInset, scopeNote } = normalizeAnatomyLabels(modelId, rawLabels);
  const resolvedFrom = requested && requested !== modelId ? requested : undefined;
  const closestNote =
    scopeNote ||
    ((!isAnatomyModelId(requested.toLowerCase()) && requested
      ? `Closest model: ${entry.title}.`
      : undefined) ||
      entry.closestNote);

  return {
    introText: content.slice(0, jsonFence.start).trim(),
    modelId,
    title,
    focus,
    labels,
    resolvedFrom,
    closestNote,
    showNephronInset,
    scopeNote,
  };
}

export function isAnatomyPending(content: string, isStreaming: boolean): boolean {
  if (!isStreaming) return false;
  if (tryParseAnatomy(content)) return false;
  const openJson = /```json[^\n]*\n[\s\S]*$/i.test(content);
  const closedJson = /```json[^\n]*\n[\s\S]*```/i.test(content);
  return openJson && !closedJson;
}
