import {
  tryParseMindMap,
  markdownToMindMap,
  normalizeMindMapData,
} from '@/subject/mind-map-parser';
import type { ParsedMindMap, MindElixirNode } from '@/subject/mind-map-types';

let idCounter = 0;
function createId(prefix = 'node') {
  idCounter += 1;
  return `${prefix}-infer-${Date.now()}-${idCounter}`;
}

function stripMarkdownInline(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/\*(.+?)\*/g, '$1')
    .replace(/`(.+?)`/g, '$1')
    .replace(/==(.+?)==/g, '$1')
    .trim();
}

/**
 * Build a mind map from plain prose when the model returns neither JSON nor a
 * markdown hierarchy. Strategy:
 *  - Strip code fences (they failed JSON parse)
 *  - Use first heading or first non-empty sentence as the root topic
 *  - Build branches from ## headings, **Bold:** section markers, and bullet/numbered lists
 */
export function inferMindMapFromText(content: string): ParsedMindMap | null {
  // Try the markdown fallback first — it handles headed lists well.
  const fromMarkdown = markdownToMindMap(content);
  if (fromMarkdown) return fromMarkdown;

  // Strip fenced code blocks so they don't confuse line parsing.
  const stripped = content.replace(/```[\s\S]*?```/g, '').trim();
  if (!stripped) return null;

  const lines = stripped.split('\n').map((l) => l.trim()).filter(Boolean);
  if (lines.length === 0) return null;

  let rootTopic = 'Mind map';
  let startIndex = 0;

  // Pick root topic from first heading or first sentence.
  const headingMatch = lines[0].match(/^#{1,6}\s+(.+)$/);
  if (headingMatch) {
    rootTopic = stripMarkdownInline(headingMatch[1]);
    startIndex = 1;
  } else {
    // Use first non-list, non-code line as intro / root topic.
    const firstSentence = lines[0].replace(/[.!?].*$/, '').trim();
    if (firstSentence.length > 2 && firstSentence.length <= 80) {
      rootTopic = stripMarkdownInline(firstSentence);
      startIndex = 1;
    }
  }

  const children: MindElixirNode[] = [];
  let currentBranch: MindElixirNode | null = null;

  for (let i = startIndex; i < lines.length; i++) {
    const line = lines[i];

    // ## Heading → new top-level branch
    const h2 = line.match(/^#{2,6}\s+(.+)$/);
    if (h2) {
      currentBranch = { id: createId('branch'), topic: stripMarkdownInline(h2[1]) };
      children.push(currentBranch);
      continue;
    }

    // **Bold:** or **Bold** at line start → new top-level branch
    const boldSection = line.match(/^\*\*(.+?)\*\*[:\s]/);
    if (boldSection) {
      const topic = stripMarkdownInline(boldSection[1]);
      currentBranch = { id: createId('branch'), topic };
      children.push(currentBranch);
      continue;
    }

    // Bullet / numbered list item → leaf under current branch, or new branch
    const bullet = line.match(/^[-*+]\s+(.+)$/) || line.match(/^\d+\.\s+(.+)$/);
    if (bullet) {
      const topic = stripMarkdownInline(bullet[1]);
      if (!topic || topic.length > 80) continue;
      const leaf: MindElixirNode = { id: createId('leaf'), topic };
      if (currentBranch) {
        currentBranch.children = currentBranch.children ?? [];
        currentBranch.children.push(leaf);
      } else {
        children.push(leaf);
      }
    }
  }

  if (children.length === 0) return null;

  return {
    data: normalizeMindMapData({
      nodeData: { id: createId('root'), topic: rootTopic, children },
    }),
    introText: '',
  };
}

/**
 * Resolve mind map content: JSON parser first, then inference when preferInfer is true.
 * Mirrors resolveScienceGraphContent from graph-inference.ts.
 */
export function resolveMindMapContent(
  content: string,
  options?: { preferInfer?: boolean },
): ParsedMindMap | null {
  const parsed = tryParseMindMap(content);
  if (parsed) return parsed;
  if (options?.preferInfer) {
    return inferMindMapFromText(content);
  }
  return null;
}

/**
 * True when the mind map was produced by inference rather than the model's JSON output.
 */
export function isMindMapFallback(content: string): boolean {
  return !tryParseMindMap(content) && inferMindMapFromText(content) !== null;
}
