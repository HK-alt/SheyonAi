import {
  getMoleculeCatalogEntry,
  isMoleculeId,
  resolveMoleculeId,
  MOLECULE_IDS,
  type MoleculeId,
} from './molecule-catalog';

export type MoleculeLabel = {
  id: string;
  title: string;
  detail: string;
};

export type ParsedMolecule = {
  introText: string;
  moleculeId: MoleculeId;
  title: string;
  focus: string;
  params: Record<string, number>;
  labels: MoleculeLabel[];
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

function parseLabels(value: unknown): MoleculeLabel[] {
  if (!Array.isArray(value)) return [];
  const labels: MoleculeLabel[] = [];
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

function looksLikeMoleculePayload(obj: Record<string, unknown>): boolean {
  return 'moleculeId' in obj || 'molecule' in obj;
}

const DEFAULT_LABELS: Record<MoleculeId, MoleculeLabel[]> = {
  water: [
    { id: 'oxygen', title: 'Oxygen', detail: 'Central atom with two lone pairs.' },
    { id: 'h1', title: 'Hydrogen', detail: 'Bonded hydrogen atom.' },
    { id: 'h2', title: 'Hydrogen', detail: 'Bonded hydrogen atom.' },
  ],
  methane: [
    { id: 'carbon', title: 'Carbon', detail: 'Tetrahedral center.' },
    { id: 'h1', title: 'Hydrogen', detail: 'C–H bond.' },
    { id: 'h2', title: 'Hydrogen', detail: 'C–H bond.' },
  ],
  ammonia: [
    { id: 'nitrogen', title: 'Nitrogen', detail: 'Central atom with a lone pair.' },
    { id: 'h1', title: 'Hydrogen', detail: 'N–H bond.' },
    { id: 'h2', title: 'Hydrogen', detail: 'N–H bond.' },
  ],
  co2: [
    { id: 'carbon', title: 'Carbon', detail: 'Central atom in a linear molecule.' },
    { id: 'o1', title: 'Oxygen', detail: 'Double-bonded oxygen.' },
    { id: 'o2', title: 'Oxygen', detail: 'Double-bonded oxygen.' },
  ],
  ethanol: [
    { id: 'c1', title: 'Methyl carbon', detail: 'CH₃ group.' },
    { id: 'c2', title: 'Methylene carbon', detail: 'CH₂ group.' },
    { id: 'oxygen', title: 'Hydroxyl oxygen', detail: '–OH functional group.' },
  ],
  benzene: [
    { id: 'c1', title: 'Carbon', detail: 'Aromatic ring carbon.' },
    { id: 'c2', title: 'Carbon', detail: 'Aromatic ring carbon.' },
    { id: 'h1', title: 'Hydrogen', detail: 'Ring hydrogen.' },
  ],
  acetic_acid: [
    { id: 'methyl-c', title: 'Methyl carbon', detail: 'CH₃ group.' },
    { id: 'carboxyl-c', title: 'Carboxyl carbon', detail: 'COOH carbon.' },
    { id: 'carbonyl-o', title: 'Carbonyl oxygen', detail: 'C=O oxygen.' },
  ],
  glucose: [
    { id: 'c1', title: 'Ring carbon', detail: 'Pyranose ring atom.' },
    { id: 'ring-o', title: 'Ring oxygen', detail: 'Hemiacetal oxygen.' },
    { id: 'oh6', title: 'CH₂OH', detail: 'Primary alcohol side chain.' },
  ],
};

function stripFences(content: string): string {
  return content.replace(/```[\s\S]*?```/gi, ' ');
}

/** Infer a catalog molecule from free text when the model skipped the JSON fence. */
export function inferMoleculeFromText(content: string): ParsedMolecule | null {
  if (!content.trim()) return null;
  const searchable = stripFences(content).toLowerCase();
  const haystack = searchable.replace(/\s+/g, ' ');

  let best: { id: MoleculeId; index: number } | null = null;
  const candidates: { id: MoleculeId; needle: string }[] = [];
  for (const id of MOLECULE_IDS) {
    const entry = getMoleculeCatalogEntry(id);
    candidates.push({ id, needle: id.replace(/_/g, ' ') });
    candidates.push({ id, needle: entry.title.toLowerCase() });
    candidates.push({ id, needle: entry.formula.toLowerCase() });
  }
  for (const [alias, id] of Object.entries({
    h2o: 'water' as MoleculeId,
    'h₂o': 'water' as MoleculeId,
    ch4: 'methane' as MoleculeId,
    nh3: 'ammonia' as MoleculeId,
    'carbon dioxide': 'co2' as MoleculeId,
    alcohol: 'ethanol' as MoleculeId,
    sugar: 'glucose' as MoleculeId,
    vinegar: 'acetic_acid' as MoleculeId,
  })) {
    candidates.push({ id, needle: alias });
  }

  for (const { id, needle } of candidates) {
    if (!needle || needle.length < 2) continue;
    const index = haystack.indexOf(needle);
    if (index < 0) continue;
    if (!best || index < best.index) best = { id, index };
  }

  const moleculeId = best?.id ?? 'water';
  const entry = getMoleculeCatalogEntry(moleculeId);
  const intro = stripFences(content).trim().split(/\n+/).find((line) => line.trim()) ?? entry.title;

  return {
    introText: intro.slice(0, 280),
    moleculeId,
    title: entry.title,
    focus: '',
    params: {},
    labels: DEFAULT_LABELS[moleculeId],
    closestNote: best
      ? 'Opened catalog 3D model (model did not return molecule JSON).'
      : 'Defaulted to water — ask for a catalog molecule (water, methane, benzene…).',
  };
}

export function tryParseMolecule(content: string): ParsedMolecule | null {
  if (!content.trim()) return null;
  const fences = extractFences(content);
  const jsonFence = fences.find((f) => {
    const lang = f.lang.split(/\s+/)[0] ?? '';
    if (lang && lang !== 'json') return false;
    const obj = parseJsonObject(f.body);
    return !!obj && looksLikeMoleculePayload(obj);
  });
  // Also accept unlabeled / misc fences that are molecule JSON objects.
  const looseJsonFence =
    jsonFence ??
    fences.find((f) => {
      const obj = parseJsonObject(f.body);
      return !!obj && looksLikeMoleculePayload(obj);
    });
  if (!looseJsonFence) return null;
  const obj = parseJsonObject(looseJsonFence.body);
  if (!obj) return null;

  const requested = asString(obj.moleculeId) || asString(obj.molecule);
  const moleculeId = resolveMoleculeId(requested || 'water');
  const entry = getMoleculeCatalogEntry(moleculeId);
  const title = asString(obj.title) || entry.title;
  const focus = asString(obj.focus);
  const labels = parseLabels(obj.labels);
  const params = parseParams(obj.params);
  const resolvedFrom = requested && requested !== moleculeId ? requested : undefined;
  const closestNote =
    (!isMoleculeId(requested.toLowerCase().replace(/\s+/g, '_').replace(/-/g, '_')) && requested
      ? `Closest molecule: ${entry.title}.`
      : undefined) || entry.closestNote;

  return {
    introText: content.slice(0, looseJsonFence.start).trim(),
    moleculeId,
    title,
    focus,
    params,
    labels: labels.length > 0 ? labels : DEFAULT_LABELS[moleculeId],
    resolvedFrom,
    closestNote,
  };
}

/** Resolve molecule JSON, or infer from text when Molecule 3D mode forced HTML. */
export function resolveMoleculeContent(
  content: string,
  options?: { preferInfer?: boolean },
): ParsedMolecule | null {
  const parsed = tryParseMolecule(content);
  if (parsed) return parsed;
  if (options?.preferInfer) return inferMoleculeFromText(content);
  return null;
}

export function isMoleculePending(content: string, isStreaming: boolean): boolean {
  if (!isStreaming) return false;
  if (tryParseMolecule(content)) return false;
  const openJson = /```json[^\n]*\n[\s\S]*$/i.test(content);
  const closedJson = /```json[^\n]*\n[\s\S]*```/i.test(content);
  return openJson && !closedJson;
}
