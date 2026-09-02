// Bhutan GovTech NLLB translator (nlp.tech.gov.bt) — English → Dzongkha.
// Server-side multipart POST to /translate; HTML response embeds output in .dz-text.
// Same segmenting contract as nllb-translate.ts (skip Uchen, citations, missing-info).

import {
  DZONGKHA_MISSING_INFO_FALLBACK,
  isMissingInfoFallback,
} from './nllb-translate.ts';

const DEFAULT_GOVTECH_URL = 'https://nlp.tech.gov.bt/translate';
const UPSTREAM_TIMEOUT_MS = 90_000;
const MAX_SEGMENT_CHARS = 400;
const MAX_CONCURRENCY = 2;
const MAX_RETRIES = 2;

const UCHEN_RE = /[\u0F00-\u0FFF]/;
const HEADING_RE = /^(#{1,6})\s+(.*)$/;
const CITATION_ONLY_RE = /^\[\d+\]$/;
const DZ_TEXT_RE = /<textarea\s+class="dz-text"[^>]*>([\s\S]*?)<\/textarea>/i;

type Segment =
  | { kind: 'skip'; text: string }
  | { kind: 'translate'; text: string; prefix?: string };

function resolveGovTechUrl(): string {
  const fromEnv = Deno.env.get('GOVTECH_TRANSLATE_URL')?.trim();
  if (fromEnv) return fromEnv;
  return DEFAULT_GOVTECH_URL;
}

function decodeHtmlEntities(raw: string): string {
  return raw
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec) => String.fromCodePoint(parseInt(dec, 10)));
}

function parseGovTechHtml(html: string): string {
  const match = html.match(DZ_TEXT_RE);
  if (!match) {
    throw new Error('GovTech response missing textarea.dz-text');
  }
  const translated = decodeHtmlEntities(match[1]).trim();
  if (!translated) {
    throw new Error('GovTech returned empty translation');
  }
  return translated;
}

async function callGovTechSegment(text: string, url: string): Promise<string> {
  let lastError: unknown;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    if (attempt > 0) await new Promise((r) => setTimeout(r, 1500 * attempt));
    try {
      const form = new FormData();
      form.append('direction', 'en-dz');
      form.append('input_text', text);

      const res = await fetch(url, {
        method: 'POST',
        body: form,
        headers: {
          Accept: 'text/html,application/xhtml+xml',
          'User-Agent': 'SheyonAi-rag-chat/1.0 (Dzongkha Library; server-side)',
        },
        signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
      });

      if (!res.ok) {
        const body = await res.text();
        lastError = new Error(`GovTech responded ${res.status}: ${body.slice(0, 300)}`);
        if (res.status < 500) break;
        continue;
      }

      const html = await res.text();
      return parseGovTechHtml(html);
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

  if (
    segments.length > 0 &&
    segments[segments.length - 1].kind === 'skip' &&
    segments[segments.length - 1].text === '\n'
  ) {
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

/**
 * Translates an English tutor draft via Bhutan GovTech (NLLB fine-tuned for Dzongkha).
 * Skips Uchen lines, citations, and the exact missing-info fallback sentence.
 */
export async function translateEnglishToDzongkhaGovTech(
  text: string,
  urlOverride?: string,
): Promise<string> {
  if (isMissingInfoFallback(text)) {
    return text.trim();
  }

  const url = urlOverride?.trim() || resolveGovTechUrl();
  const segments = segmentText(text);

  const translateIndices: number[] = [];
  for (let i = 0; i < segments.length; i++) {
    if (segments[i].kind === 'translate') translateIndices.push(i);
  }

  console.log(`GovTech: ${translateIndices.length} segment(s) to translate (url=${url})`);

  const translatedByIndex = new Map<number, string>();

  await mapWithConcurrency(translateIndices, MAX_CONCURRENCY, async (segIndex) => {
    const seg = segments[segIndex] as Extract<Segment, { kind: 'translate' }>;
    const translated = await callGovTechSegment(seg.text, url);
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

/** Probe whether the configured GovTech endpoint responds (optional preflight). */
export async function probeGovTechTranslate(urlOverride?: string): Promise<boolean> {
  const url = urlOverride?.trim() || resolveGovTechUrl();
  try {
    await callGovTechSegment('Hello.', url);
    return true;
  } catch (err) {
    console.warn('GovTech probe failed:', err);
    return false;
  }
}
