import {
  getFieldCatalogEntry,
  isFieldSceneId,
  resolveFieldSceneId,
  type FieldSceneId,
} from '@/subject/physics-lab/field-catalog';

export type FieldLabel = {
  id: string;
  title: string;
  detail: string;
};

export type ParsedField = {
  introText: string;
  sceneId: FieldSceneId;
  title: string;
  focus: string;
  params: Record<string, number>;
  labels: FieldLabel[];
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

function parseParams(value: unknown): Record<string, number> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  const out: Record<string, number> = {};
  for (const [key, raw] of Object.entries(value as Record<string, unknown>)) {
    const n = typeof raw === 'number' ? raw : Number(raw);
    if (Number.isFinite(n)) out[key] = n;
  }
  return out;
}

function parseLabels(value: unknown): FieldLabel[] {
  if (!Array.isArray(value)) return [];
  const labels: FieldLabel[] = [];
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

function looksLikeFieldPayload(obj: Record<string, unknown>): boolean {
  if ('chartType' in obj || 'modelId' in obj || 'model' in obj || 'moleculeId' in obj) {
    return false;
  }
  return 'sceneId' in obj || 'scene' in obj;
}

export function tryParseField(content: string): ParsedField | null {
  if (!content.trim()) return null;
  const fences = extractFences(content);
  const jsonFence = fences.find((f) => {
    const lang = f.lang.split(/\s+/)[0] ?? '';
    if (lang && lang !== 'json') return false;
    const obj = parseJsonObject(f.body);
    return !!obj && looksLikeFieldPayload(obj);
  });
  if (!jsonFence) return null;
  const obj = parseJsonObject(jsonFence.body);
  if (!obj) return null;

  const requested = asString(obj.sceneId) || asString(obj.scene);
  const sceneId = resolveFieldSceneId(requested || 'orbit');
  const entry = getFieldCatalogEntry(sceneId);
  const title = asString(obj.title) || entry.title;
  const focus = asString(obj.focus);
  const labels = parseLabels(obj.labels);
  const params = parseParams(obj.params);
  const resolvedFrom = requested && requested !== sceneId ? requested : undefined;
  const closestNote =
    (!isFieldSceneId(requested.toLowerCase().replace(/\s+/g, '_').replace(/-/g, '_')) && requested
      ? `Closest scene: ${entry.title}.`
      : undefined) || entry.closestNote;

  return {
    introText: content.slice(0, jsonFence.start).trim(),
    sceneId,
    title,
    focus,
    params,
    labels,
    resolvedFrom,
    closestNote,
  };
}

export function isFieldPending(content: string, isStreaming: boolean): boolean {
  if (!isStreaming) return false;
  if (tryParseField(content)) return false;
  const openJson = /```json[^\n]*\n[\s\S]*$/i.test(content);
  const closedJson = /```json[^\n]*\n[\s\S]*```/i.test(content);
  return openJson && !closedJson;
}

const DEFAULT_PROJECTILE_LABELS: FieldLabel[] = [
  {
    id: 'launch',
    title: 'Launch angle',
    detail: 'Initial velocity direction sets the parabolic path shape.',
  },
  {
    id: 'peak',
    title: 'Peak height',
    detail: 'Vertical velocity is zero at the highest point of the trajectory.',
  },
  {
    id: 'range',
    title: 'Range',
    detail: 'Horizontal distance depends on launch speed and angle under constant g.',
  },
];

/** Infer a field scene when JSON is missing but the prompt describes physics 3D content. */
export function inferFieldFromText(content: string): ParsedField | null {
  const introText = content.replace(/```[\s\S]*?```/g, '').trim();
  const lower = content.toLowerCase();

  if (
    /\b(3d\s+projectile|projectile\s+trajectory|ballistic|parabolic\s+path)\b/i.test(content) ||
    (/\bprojectile\b/i.test(content) && /\b(3d|trajectory|field)\b/i.test(content))
  ) {
    const entry = getFieldCatalogEntry('projectile_motion');
    return {
      introText,
      sceneId: 'projectile_motion',
      title: 'Projectile trajectory',
      focus: 'parabolic path under gravity',
      params: { speed: 12, angle: 45, gravity: 9.81 },
      labels: DEFAULT_PROJECTILE_LABELS,
      closestNote: entry.closestNote,
    };
  }

  if (/\b(orbit|planetary|satellite|kepler)\b/i.test(lower)) {
    const sceneId = /\bkepler\b/i.test(lower) ? 'kepler' : 'orbit';
    const entry = getFieldCatalogEntry(sceneId);
    return {
      introText,
      sceneId,
      title: entry.title,
      focus: 'orbital motion',
      params: { semiMajor: 3, eccentricity: 0.25 },
      labels: [
        { id: 'central', title: 'Central body', detail: 'Gravitational focus of the orbit.' },
        { id: 'orbit', title: 'Orbit path', detail: 'Closed or open path depending on energy.' },
      ],
    };
  }

  if (/\b(electric|e-field|dipole)\b/i.test(lower)) {
    const sceneId = /\bdipole\b/i.test(lower) ? 'electric_dipole' : 'uniform_e_field';
    const entry = getFieldCatalogEntry(sceneId);
    return {
      introText,
      sceneId,
      title: entry.title,
      focus: 'electric field lines',
      params: { fieldStrength: 1, charge: 1 },
      labels: [{ id: 'field', title: 'Field', detail: 'Teaching visualization of electric interactions.' }],
    };
  }

  if (/\b(magnetic|magnet|b-field)\b/i.test(lower)) {
    const entry = getFieldCatalogEntry('magnetic_bar');
    return {
      introText,
      sceneId: 'magnetic_bar',
      title: entry.title,
      focus: 'magnetic field lines',
      params: {},
      labels: [{ id: 'north', title: 'North pole', detail: 'Field lines emerge from the north pole.' }],
    };
  }

  return null;
}

export function resolveFieldContent(
  content: string,
  options?: { preferInfer?: boolean },
): ParsedField | null {
  const parsed = tryParseField(content);
  if (parsed) return parsed;
  if (options?.preferInfer) {
    return inferFieldFromText(content);
  }
  return null;
}
