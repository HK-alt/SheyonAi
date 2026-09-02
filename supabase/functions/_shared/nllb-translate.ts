// NLLB-200 translation via Hugging Face Inference API (eng_Latn → dzo_Deva).
// Used as step 2 in the Dzongkha RAG pipeline before DeepSeek polish to Uchen.

const DEFAULT_MODEL = 'facebook/nllb-200-distilled-600M';
const HF_INFERENCE_BASE = 'https://router.huggingface.co/hf-inference/models';
const UPSTREAM_TIMEOUT_MS = 90_000;
const MAX_SEGMENT_CHARS = 400;
const MAX_CONCURRENCY = 4;
const MAX_RETRIES = 2;

export const DZONGKHA_MISSING_INFO_FALLBACK =
  "I couldn't find a reliable source for that in my Dzongkha library. Could you rephrase or ask something else?";

const UCHEN_RE = /[\u0F00-\u0FFF]/;
const HEADING_RE = /^(#{1,6})\s+(.*)$/;
const CITATION_ONLY_RE = /^\[\d+\]$/;

type Segment =
  | { kind: 'skip'; text: string }
  | { kind: 'translate'; text: string; prefix?: string };

function resolveModel(): string {
  return Deno.env.get('NLLB_MODEL') ?? DEFAULT_MODEL;
}

function parseTranslationResponse(json: unknown): string {
  if (typeof json === 'string') return json;
  if (Array.isArray(json)) {
    const first = json[0];
    if (typeof first === 'string') return first;
    if (first && typeof first === 'object' && 'translation_text' in first) {
      return String((first as { translation_text: string }).translation_text);
    }
  }
  if (json && typeof json === 'object' && 'translation_text' in json) {
    return String((json as { translation_text: string }).translation_text);
  }
  if (json && typeof json === 'object' && 'generated_text' in json) {
    return String((json as { generated_text: string }).generated_text);
  }
  throw new Error('Unexpected Hugging Face translation response shape');
}

async function callNllbSegment(text: string, apiKey: string, model: string): Promise<string> {
  const url = `${HF_INFERENCE_BASE}/${model}`;
  let lastError: unknown;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    if (attempt > 0) await new Promise((r) => setTimeout(r, 1500 * attempt));
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          inputs: text,
          parameters: { src_lang: 'eng_Latn', tgt_lang: 'dzo_Deva' },
        }),
        signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
      });

      if (res.status === 503) {
        const body = await res.text();
        lastError = new Error(`HF model loading (503): ${body.slice(0, 200)}`);
        continue;
      }

      if (!res.ok) {
        const body = await res.text();
        lastError = new Error(`HF responded ${res.status}: ${body.slice(0, 300)}`);
        if (res.status < 500) break;
        continue;
      }

      const json = await res.json();
      return parseTranslationResponse(json);
    } catch (err) {
      lastError = err;
    }
  }

  throw lastError;
}

function splitLongParagraph(text: string): string[] {
  if (text.length <= MAX_SEGMENT_CHARS) return [text];

  const sentences = text.match(/[^.!?]+[.!?]+(?:\s|$)|[^.!?]+$/g) ?? [text];
  const chunks: string[] = [];
  let current = '';

  for (const sentence of sentences) {
    const trimmed = sentence.trim();
    if (!trimmed) continue;
    if ((current + ' ' + trimmed).trim().length > MAX_SEGMENT_CHARS && current.length > 0) {
      chunks.push(current.trim());
      current = trimmed;
    } else {
      current = current ? `${current} ${trimmed}` : trimmed;
    }
  }
  if (current.trim()) chunks.push(current.trim());
  return chunks.length > 0 ? chunks : [text];
}

function segmentLine(line: string): Segment[] {
  const trimmed = line.trimEnd();

  if (trimmed.length === 0) return [{ kind: 'skip', text: line }];

  if (trimmed.includes(DZONGKHA_MISSING_INFO_FALLBACK)) {
    return [{ kind: 'skip', text: line }];
  }

  if (UCHEN_RE.test(trimmed)) {
    return [{ kind: 'skip', text: line }];
  }

  if (CITATION_ONLY_RE.test(trimmed.trim())) {
    return [{ kind: 'skip', text: line }];
  }

  const headingMatch = trimmed.match(HEADING_RE);
  if (headingMatch) {
    const [, hashes, headingText] = headingMatch;
    if (headingText.trim().length === 0) {
      return [{ kind: 'skip', text: line }];
    }
    return [{ kind: 'translate', text: headingText.trim(), prefix: `${hashes} ` }];
  }

  return splitLongParagraph(trimmed).map((part) => ({ kind: 'translate', text: part }));
}

function segmentText(text: string): Segment[] {
  const lines = text.split('\n');
  const segments: Segment[] = [];

  for (const line of lines) {
    const lineSegments = segmentLine(line);
    for (let i = 0; i < lineSegments.length; i++) {
      segments.push(lineSegments[i]);
      if (i < lineSegments.length - 1) {
        segments.push({ kind: 'skip', text: '\n' });
      }
    }
    segments.push({ kind: 'skip', text: '\n' });
  }

  if (segments.length > 0 && segments[segments.length - 1].kind === 'skip' && segments[segments.length - 1].text === '\n') {
    segments.pop();
  }

  return segments;
}

async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  fn: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let nextIndex = 0;

  async function worker() {
    while (nextIndex < items.length) {
      const i = nextIndex++;
      results[i] = await fn(items[i], i);
    }
  }

  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, () => worker()));
  return results;
}

/** Returns true when the draft is (or contains only) the missing-info fallback. */
export function isMissingInfoFallback(text: string): boolean {
  const normalized = text.trim();
  return normalized === DZONGKHA_MISSING_INFO_FALLBACK || normalized.includes(DZONGKHA_MISSING_INFO_FALLBACK);
}

/**
 * Translates an English tutor draft to rough Dzongkha (dzo_Deva) via NLLB-200.
 * Skips Uchen lines, citations, and the exact missing-info fallback sentence.
 */
export async function translateEnglishToDzongkha(text: string, apiKey: string): Promise<string> {
  if (isMissingInfoFallback(text)) {
    return text.trim();
  }

  const model = resolveModel();
  const segments = segmentText(text);

  const translateIndices: number[] = [];
  for (let i = 0; i < segments.length; i++) {
    if (segments[i].kind === 'translate') translateIndices.push(i);
  }

  console.log(`NLLB: ${translateIndices.length} segment(s) to translate (model=${model})`);

  const translatedByIndex = new Map<number, string>();

  await mapWithConcurrency(translateIndices, MAX_CONCURRENCY, async (segIndex) => {
    const seg = segments[segIndex] as Extract<Segment, { kind: 'translate' }>;
    const translated = await callNllbSegment(seg.text, apiKey, model);
    translatedByIndex.set(segIndex, translated);
  });

  const parts: string[] = [];
  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i];
    if (seg.kind === 'skip') {
      parts.push(seg.text);
    } else {
      const translated = translatedByIndex.get(i) ?? seg.text;
      parts.push(`${seg.prefix ?? ''}${translated}`);
    }
  }

  return parts.join('').trim();
}
