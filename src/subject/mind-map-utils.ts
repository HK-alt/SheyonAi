import type { MindElixirData, MindElixirNode } from '@/subject/mind-map-types';

function walkOutline(node: MindElixirNode, depth: number, lines: string[]) {
  const indent = '  '.repeat(depth);
  lines.push(`${indent}${depth === 0 ? '' : '- '}${node.topic}`);
  if (node.children) {
    for (const child of node.children) {
      walkOutline(child, depth + 1, lines);
    }
  }
}

/** Flatten a Mind Elixir tree into a human-readable indented outline string. */
export function mindMapToOutline(data: MindElixirData): string {
  const lines: string[] = [];
  walkOutline(data.nodeData, 0, lines);
  return lines.join('\n');
}
