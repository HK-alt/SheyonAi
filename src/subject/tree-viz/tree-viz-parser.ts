import {
  isTreeVizMode,
  type ParsedTreeViz,
  type TreeVizMode,
  type TreeVizNode,
} from '@/subject/tree-viz/tree-viz-types';

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

function asNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim() && Number.isFinite(Number(value))) {
    return Number(value);
  }
  return null;
}

export function looksLikeTreeVizPayload(obj: Record<string, unknown>): boolean {
  if ('chartType' in obj || 'diagramId' in obj || 'modelId' in obj || 'sceneId' in obj) {
    return false;
  }
  if (isTreeVizMode(obj.layout)) return true;
  const name = asString(obj.name) || asString(obj.title);
  if (name && Array.isArray(obj.children)) return true;
  if (obj.root && typeof obj.root === 'object' && !Array.isArray(obj.root)) {
    const root = obj.root as Record<string, unknown>;
    return !!(asString(root.name) && (Array.isArray(root.children) || asNumber(root.value) != null));
  }
  return false;
}

function parseNode(value: unknown, depth = 0): TreeVizNode | null {
  if (depth > 12) return null;
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const rec = value as Record<string, unknown>;
  const name = asString(rec.name) || asString(rec.label) || asString(rec.id);
  if (!name) return null;
  const num = asNumber(rec.value) ?? asNumber(rec.size) ?? asNumber(rec.weight);
  const group = asString(rec.group) || asString(rec.category) || undefined;
  const rawChildren = Array.isArray(rec.children) ? rec.children : [];
  const children = rawChildren
    .map((child) => parseNode(child, depth + 1))
    .filter((child): child is TreeVizNode => !!child);
  const node: TreeVizNode = { name };
  if (num != null && num > 0) node.value = num;
  if (group) node.group = group;
  if (children.length > 0) node.children = children;
  return node;
}

function ensureLeafValues(node: TreeVizNode): TreeVizNode {
  if (!node.children || node.children.length === 0) {
    return { ...node, value: node.value && node.value > 0 ? node.value : 1 };
  }
  const children = node.children.map(ensureLeafValues);
  const sum = children.reduce((acc, child) => acc + (child.value ?? 1), 0);
  return { ...node, children, value: node.value && node.value > 0 ? node.value : sum };
}

function parseLayout(value: unknown, fallback: TreeVizMode = 'tidy'): TreeVizMode {
  if (isTreeVizMode(value)) return value;
  const raw = asString(value).toLowerCase();
  if (raw === 'tree' || raw === 'tidy-tree') return 'tidy';
  if (raw === 'tree-map' || raw === 'tree_map') return 'treemap';
  if (raw === 'dendrogram' || raw === 'cluster-dendrogram') return 'cluster';
  if (raw === 'force-directed' || raw === 'force_tree') return 'force';
  return fallback;
}

export function tryParseTreeViz(
  content: string,
  preferredLayout?: TreeVizMode | null,
): ParsedTreeViz | null {
  if (!content.trim()) return null;
  const fences = extractFences(content);
  const jsonFence = fences.find((f) => {
    const lang = f.lang.split(/\s+/)[0] ?? '';
    if (lang && lang !== 'json') return false;
    const obj = parseJsonObject(f.body);
    return !!obj && looksLikeTreeVizPayload(obj);
  });
  if (!jsonFence) return null;
  const obj = parseJsonObject(jsonFence.body);
  if (!obj) return null;

  const rootSource =
    obj.root && typeof obj.root === 'object' && !Array.isArray(obj.root)
      ? obj.root
      : obj;
  const root = parseNode(rootSource);
  if (!root) return null;

  const layout = parseLayout(obj.layout, preferredLayout ?? 'tidy');
  const title =
    asString(obj.title) ||
    (root.name !== 'Root' ? root.name : '') ||
    'Teaching tree';

  return {
    introText: content.slice(0, jsonFence.start).trim(),
    layout,
    title,
    goal: asString(obj.goal) || asString(obj.learningGoal) || undefined,
    caption: asString(obj.caption) || 'Generated tree — teaching model.',
    root: ensureLeafValues(root),
  };
}

export function isTreeVizPending(content: string, isStreaming: boolean): boolean {
  if (!isStreaming) return false;
  if (tryParseTreeViz(content)) return false;
  return /```/.test(content) || /"layout"\s*:/.test(content) || /"children"\s*:/.test(content);
}
