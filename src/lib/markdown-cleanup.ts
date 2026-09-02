/** Protect fenced / inline code from prose cleanup. */
import { normalizeCalloutMarkdown } from '@/lib/markdown-enrich';
import { preprocessMathInMarkdown } from '@/lib/math-preprocess';

type Segment = { kind: 'code' | 'text'; value: string };

function splitByCodeSegments(content: string): Segment[] {
  const segments: Segment[] = [];
  const pattern = /(```[\s\S]*?```|`[^`\n]+`)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(content)) !== null) {
    if (match.index > lastIndex) {
      segments.push({ kind: 'text', value: content.slice(lastIndex, match.index) });
    }
    segments.push({ kind: 'code', value: match[0] });
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < content.length) {
    segments.push({ kind: 'text', value: content.slice(lastIndex) });
  }

  return segments.length > 0 ? segments : [{ kind: 'text', value: content }];
}

/** Turn noisy model markdown (---, **Step N**) into clean headings before parsing. */
export function normalizeProseMarkdown(content: string): string {
  let result = content;

  // Strip stray $ that the model sometimes prepends to heading tokens: $### Step 4:
  result = result.replace(/^\$+(#{1,6}\s)/gm, '$1');

  result = result.replace(
    /---\s*\*\*Step\s+(\d+:\s*[^*]+?)\*\*/gi,
    '\n\n### Step $1\n\n',
  );
  result = result.replace(/---\s*\*\*Step\s+(\d+)\*\*/gi, '\n\n### Step $1\n\n');
  result = result.replace(
    /^\*\*Step\s+(\d+:\s*[^*]+?)\*\*\s*$/gim,
    '### Step $1',
  );
  result = result.replace(/^\*\*Step\s+(\d+)\*\*\s*$/gim, '### Step $1');

  result = result.replace(/---\s*\*\*([^*]+?)\*\*/g, '\n\n**$1**\n\n');
  result = result.replace(/^---+\s*$/gm, '\n');
  result = result.replace(/([^\n])\s+(#{1,6}\s+Step\s+\d+[^\n]*)/g, '$1\n\n$2');

  // Strip orphaned heading tokens (standalone ### with no text)
  result = result.replace(/\n#{1,6}\s*(?=\n|$)/g, '\n');
  result = result.replace(/(?:^|\n)#{1,6}\s*$/g, '\n');

  result = result.replace(/\n{3,}/g, '\n\n');
  result = normalizeCalloutMarkdown(result);

  return result.trim();
}

/** Prose cleanup then math preprocessing for chat markdown. */
export function preprocessMarkdown(content: string, options?: { isStreaming?: boolean }): string {
  const proseFixed = splitByCodeSegments(content)
    .map((segment) =>
      segment.kind === 'code' ? segment.value : normalizeProseMarkdown(segment.value),
    )
    .join('');

  return preprocessMathInMarkdown(proseFixed, options);
}
