import type { MindElixirData, MindElixirNode, ParsedMindMap } from '@/subject/mind-map-types';

let idCounter = 0;

function createId(prefix = 'node') {
  idCounter += 1;
  return `${prefix}-${Date.now()}-${idCounter}`;
}

function coerceNode(node: unknown): MindElixirNode | null {
  if (!node || typeof node !== 'object') return null;
  const candidate = node as Record<string, unknown>;

  const topic =
    typeof candidate.topic === 'string' ? candidate.topic.trim() :
    typeof candidate.name === 'string' ? candidate.name.trim() :
    typeof candidate.label === 'string' ? candidate.label.trim() : '';
  if (!topic) return null;

  // Accept string or number ids; convert numbers to strings.
  let id: string | undefined;
  if (typeof candidate.id === 'string' && candidate.id.trim()) {
    id = candidate.id.trim();
  } else if (typeof candidate.id === 'number') {
    id = String(candidate.id);
  }

  const rawChildren = candidate.children;
  let children: MindElixirNode[] | undefined;
  if (Array.isArray(rawChildren)) {
    const coerced = rawChildren.map(coerceNode).filter((n): n is MindElixirNode => n !== null);
    if (coerced.length > 0) children = coerced;
  }

  return { id: id ?? createId(), topic, children };
}

function coerceMindElixirData(value: unknown): MindElixirData | null {
  if (!value || typeof value !== 'object') return null;
  const candidate = value as Record<string, unknown>;

  // Standard { nodeData: { ... } } shape
  if (candidate.nodeData) {
    const node = coerceNode(candidate.nodeData);
    if (node) return { nodeData: node };
  }

  // Some models return the root node directly { id, topic, children }
  if (candidate.topic || candidate.name) {
    const node = coerceNode(candidate);
    if (node) return { nodeData: node };
  }

  return null;
}

/** Assign ids, set root flag, strip theme to avoid render issues. */
export function normalizeMindMapData(data: MindElixirData, fallbackTopic?: string): MindElixirData {
  const walk = (node: MindElixirNode, isRoot: boolean): MindElixirNode => ({
    ...node,
    id: node.id?.trim() || createId(isRoot ? 'root' : 'branch'),
    topic: node.topic.trim(),
    root: isRoot ? true : undefined,
    children: node.children?.length ? node.children.map((child) => walk(child, false)) : undefined,
  });

  return {
    nodeData: walk(
      {
        ...data.nodeData,
        topic: data.nodeData.topic?.trim() || fallbackTopic || 'Mind map',
      },
      true,
    ),
  };
}

/** Extract a JSON string from a fenced code block or a bare { ... } in content. */
function extractJsonCandidates(content: string): { json: string; introText: string }[] {
  const results: { json: string; introText: string }[] = [];

  // 1. Closed ``` fences (json tag optional — model sometimes omits it)
  const closedFenceRe = /```(?:json)?[ \t]*([\s\S]*?)```/gi;
  let m: RegExpExecArray | null;
  while ((m = closedFenceRe.exec(content)) !== null) {
    const json = m[1].trim();
    if (json.startsWith('{')) {
      results.push({ json, introText: content.slice(0, m.index).trim() });
    }
  }

  // 2. Open fence at end of string (still streaming)
  const openFenceRe = /```(?:json)?[ \t]*([\s\S]*)$/i;
  const openM = content.match(openFenceRe);
  if (openM) {
    const json = openM[1].trim();
    if (json.startsWith('{')) {
      results.push({ json, introText: content.slice(0, content.lastIndexOf('```')).trim() });
    }
  }

  // 3. Bare JSON object — accept nodeData, topic, or children as signals
  const hasMindMapSignal =
    content.includes('"nodeData"') ||
    content.includes("'nodeData'") ||
    (content.includes('"topic"') && content.includes('"children"'));
  if (hasMindMapSignal) {
    const start = content.indexOf('{');
    const end = content.lastIndexOf('}');
    if (start !== -1 && end > start) {
      const json = content.slice(start, end + 1).trim();
      results.push({ json, introText: content.slice(0, start).trim() });
    }
  }

  return results;
}

export function parseMindMap(content: string): ParsedMindMap | null {
  const candidates = extractJsonCandidates(content);
  for (const { json, introText } of candidates) {
    try {
      // Sanitize: remove trailing commas before } or ] which DeepSeek occasionally produces
      const sanitized = json
        .replace(/,\s*([}\]])/g, '$1')
        .replace(/\/\/[^\n]*/g, '');        // strip JS-style line comments

      const parsed = JSON.parse(sanitized) as unknown;
      const data = coerceMindElixirData(parsed);
      if (data) {
        return { data: normalizeMindMapData(data), introText };
      }
    } catch {
      // Try the next candidate.
    }
  }
  return null;
}

type ListLine = { depth: number; text: string };

function parseListLines(content: string): ListLine[] {
  const lines: ListLine[] = [];
  for (const line of content.split('\n')) {
    const bulletMatch = line.match(/^(\s*)[-*+]\s+(.+)$/);
    if (bulletMatch) {
      const depth = Math.floor(bulletMatch[1].replace(/\t/g, '  ').length / 2);
      lines.push({ depth, text: bulletMatch[2].trim() });
      continue;
    }
    const orderedMatch = line.match(/^(\s*)\d+\.\s+(.+)$/);
    if (orderedMatch) {
      const depth = Math.floor(orderedMatch[1].replace(/\t/g, '  ').length / 2);
      lines.push({ depth, text: orderedMatch[2].trim() });
    }
  }
  return lines;
}

function stripMarkdownInline(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/\*(.+?)\*/g, '$1')
    .replace(/`(.+?)`/g, '$1')
    .trim();
}

function buildTreeFromListLines(lines: ListLine[]): MindElixirNode[] {
  if (lines.length === 0) return [];

  const roots: MindElixirNode[] = [];
  const stack: { depth: number; node: MindElixirNode }[] = [];

  for (const line of lines) {
    const node: MindElixirNode = {
      id: createId('branch'),
      topic: stripMarkdownInline(line.text),
      children: [],
    };

    while (stack.length > 0 && stack[stack.length - 1].depth >= line.depth) {
      stack.pop();
    }

    if (stack.length === 0) {
      roots.push(node);
    } else {
      const parent = stack[stack.length - 1].node;
      parent.children = parent.children ?? [];
      parent.children.push(node);
    }

    stack.push({ depth: line.depth, node });
  }

  const prune = (node: MindElixirNode): MindElixirNode => ({
    ...node,
    children: node.children?.length ? node.children.map(prune) : undefined,
  });

  return roots.map(prune);
}

/** Build Mind Elixir data from hierarchical markdown (headings + nested lists). */
export function markdownToMindMap(content: string): ParsedMindMap | null {
  const lines = content.split('\n');
  let rootTopic: string | null = null;
  let headingIndex = -1;

  for (let i = 0; i < lines.length; i++) {
    const headingMatch = lines[i].match(/^#{1,6}\s+(.+)$/);
    if (headingMatch) {
      rootTopic = stripMarkdownInline(headingMatch[1]);
      headingIndex = i;
      break;
    }
  }

  const listLines = parseListLines(content);
  if (listLines.length === 0) {
    if (!rootTopic) return null;
    return {
      data: normalizeMindMapData({ nodeData: { id: createId('root'), topic: rootTopic } }),
      introText: '',
    };
  }

  if (!rootTopic) {
    const introLines = lines.filter(
      (line) => line.trim() && !/^[-*+\d]/.test(line.trim()) && !/^#{1,6}\s/.test(line),
    );
    rootTopic = introLines[0] ? stripMarkdownInline(introLines[0]) : 'Mind map';
  }

  const introEnd = headingIndex >= 0 ? headingIndex : 0;
  const introText = lines.slice(0, introEnd).join('\n').trim();

  const children = buildTreeFromListLines(listLines);
  if (children.length === 0) return null;

  return {
    data: normalizeMindMapData({
      nodeData: { id: createId('root'), topic: rootTopic, children },
    }),
    introText,
  };
}

function looksLikeHierarchicalMindMap(content: string): boolean {
  if (content.includes('```json') || content.includes('"nodeData"')) return true;
  // Also catch bare JSON with topic/children signals.
  if (content.includes('"topic"') && content.includes('"children"')) return true;
  const listLines = parseListLines(content);
  // Nested list (any child node) is always structural.
  if (listLines.some((line) => line.depth >= 1)) return true;
  const hasHeading = /^#{1,6}\s/m.test(content);
  // Heading + at least 2 list items — more lenient than the previous threshold of 4.
  if (hasHeading && listLines.length >= 2) return true;
  // At least 3 top-level bullets with no nesting still indicates a structured outline.
  const topLevel = listLines.filter((line) => line.depth === 0);
  return topLevel.length >= 3;
}

/** Try JSON block first, then markdown hierarchy when structure looks intentional. */
export function tryParseMindMap(content: string): ParsedMindMap | null {
  const fromJson = parseMindMap(content);
  if (fromJson) return fromJson;
  if (!looksLikeHierarchicalMindMap(content)) return null;
  return markdownToMindMap(content);
}

/** True when a mind-map reply is still being streamed (not yet parseable). */
export function isMindMapPending(content: string, isStreaming: boolean): boolean {
  if (!isStreaming) return false;
  if (tryParseMindMap(content)) return false;
  if (content.includes('```')) return true;
  if (/^#{1,6}\s/m.test(content) && /^(\s*)[-*+]\s/m.test(content)) return true;
  return false;
}
