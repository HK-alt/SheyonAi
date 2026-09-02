// Shared RAG ingestion helpers used by process-document and ingest-url.
// Handles: text extraction (PDF, DOCX, plain text), parent-child chunking,
// batch embedding, and inserting chunks into Supabase with FTS support.

import { type SupabaseClient } from 'npm:@supabase/supabase-js@2';
import {
  extractPdfEmbeddedImages,
  isUsableExtractedText,
  MAX_PDF_PAGE_IMAGES,
} from './pdf-page-images.ts';
import { ocrImageList, terminateOcrWorker } from './tesseract-ocr.ts';

const DEEPSEEK_EMBED_URL = 'https://api.deepseek.com/v1/embeddings';
const EMBED_MODEL = 'deepseek-embedding';
const EMBED_BATCH_SIZE = 32;

// Parent chunks: large context windows injected into the prompt.
const PARENT_CHUNK_SIZE = 2000;
// Child chunks: small units used for retrieval and re-ranking.
const CHILD_CHUNK_SIZE = 400;
const CHILD_CHUNK_OVERLAP = 80;

// ---------------------------------------------------------------------------
// Text extraction
// ---------------------------------------------------------------------------

export async function extractText(bytes: Uint8Array, mimeType: string): Promise<string> {
  const normalized = mimeType.split(';')[0].trim().toLowerCase();

  if (normalized === 'application/pdf') {
    return extractPdfText(bytes);
  }

  if (
    normalized ===
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    mimeType.endsWith('.docx')
  ) {
    return extractDocxText(bytes);
  }

  const raw = new TextDecoder('utf-8', { fatal: false }).decode(bytes);

  if (isTexMimeType(normalized) || mimeType.endsWith('.tex') || mimeType.endsWith('.latex')) {
    return cleanTexSource(raw);
  }

  // text/plain, text/markdown, text/x-markdown
  return raw;
}

function isTexMimeType(mimeType: string): boolean {
  return (
    mimeType === 'application/x-tex' ||
    mimeType === 'text/x-tex' ||
    mimeType === 'application/x-latex' ||
    mimeType === 'text/x-latex'
  );
}

/** Strip comments and document preamble so RAG chunks focus on body content. */
export function cleanTexSource(source: string): string {
  const withoutComments = source.replace(/(^|[^\\])%.*$/gm, '$1');
  const beginDoc = withoutComments.search(/\\begin\s*\{document\}/i);
  const body =
    beginDoc === -1
      ? withoutComments
      : withoutComments.slice(beginDoc).replace(/^\\begin\s*\{document\}\s*/i, '');

  const endDoc = body.search(/\\end\s*\{document\}/i);
  const trimmedBody = endDoc === -1 ? body : body.slice(0, endDoc);

  return trimmedBody
    .replace(/^\\documentclass[^\n]*\n/gm, '')
    .replace(/^\\usepackage(\[[^\]]*\])?\{[^}]+\}\s*\n/gm, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

async function extractPdfText(bytes: Uint8Array): Promise<string> {
  let text = '';
  try {
    // @ts-ignore — pdfjs-dist works with Deno npm compat
    const pdfjsLib = await import('npm:pdfjs-dist@4/legacy/build/pdf.mjs');
    const loadingTask = pdfjsLib.getDocument({ data: bytes });
    const pdf = await loadingTask.promise;
    const parts: string[] = [];
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      const pageText = content.items
        .map((item: { str?: string }) => item.str ?? '')
        .join(' ');
      parts.push(pageText);
    }
    text = parts.join('\n\n');
  } catch (err) {
    console.error('PDF extraction failed, falling back to raw decode:', err);
    text = new TextDecoder('utf-8', { fatal: false }).decode(bytes);
  }

  if (isUsableExtractedText(text)) return text;

  // Scanned / image-only PDF — OCR embedded page images with Tesseract.
  try {
    const images = await extractPdfEmbeddedImages(bytes, MAX_PDF_PAGE_IMAGES);
    if (images.length === 0) return text;
    const ocrText = await ocrImageList(
      images.map((image) => ({
        bytes: image.bytes,
        mimeType: image.mimeType,
        label: `Page ${image.pageNumber}`,
      })),
    );
    if (isUsableExtractedText(ocrText)) return ocrText;
  } catch (err) {
    console.error('PDF Tesseract OCR fallback failed:', err);
  } finally {
    await terminateOcrWorker();
  }

  return text;
}

async function extractDocxText(bytes: Uint8Array): Promise<string> {
  try {
    // @ts-ignore — mammoth works with Deno npm compat
    const mammoth = await import('npm:mammoth@1');
    const result = await mammoth.extractRawText({ buffer: bytes.buffer });
    return result.value ?? '';
  } catch (err) {
    console.error('DOCX extraction failed:', err);
    throw new Error('Failed to extract text from DOCX file.');
  }
}

// ---------------------------------------------------------------------------
// Chunking — parent-child strategy
// ---------------------------------------------------------------------------

export type ParentChunk = {
  content: string;
  chunkIndex: number;
  children: ChildChunk[];
};

export type ChildChunk = {
  content: string;
  parentIndex: number;
  chunkIndex: number;
};

/**
 * Splits text into parent windows (~2000 chars) and child sub-windows
 * (~400 chars, 80 overlap) within each parent.
 * Only children are embedded and searched; parents provide context.
 */
export function chunkTextParentChild(text: string): ParentChunk[] {
  const normalized = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim();
  const parents: ParentChunk[] = [];
  let parentStart = 0;
  let parentIndex = 0;

  while (parentStart < normalized.length) {
    const parentEnd = findBreakPoint(normalized, parentStart, PARENT_CHUNK_SIZE);
    const parentContent = normalized.slice(parentStart, parentEnd).trim();
    if (parentContent.length === 0) {
      parentStart = parentEnd;
      continue;
    }

    const children = splitChildren(parentContent, parentIndex);
    parents.push({ content: parentContent, chunkIndex: parentIndex, children });

    parentIndex++;
    // Advance start; no overlap at parent level (children already overlap inside)
    parentStart = parentEnd;
  }

  return parents;
}

function findBreakPoint(text: string, start: number, maxLen: number): number {
  const end = Math.min(start + maxLen, text.length);
  if (end >= text.length) return end;

  // Try to break at a paragraph / sentence boundary within the last 200 chars.
  const searchZone = text.slice(Math.max(start, end - 200), end);
  const lastBreak = Math.max(
    searchZone.lastIndexOf('\n\n'),
    searchZone.lastIndexOf('. '),
    searchZone.lastIndexOf('? '),
    searchZone.lastIndexOf('! '),
  );
  if (lastBreak > 0) {
    return Math.max(start, end - 200) + lastBreak + 1;
  }
  return end;
}

function splitChildren(parentText: string, parentIndex: number): ChildChunk[] {
  const children: ChildChunk[] = [];
  let start = 0;
  let childIndex = 0;

  while (start < parentText.length) {
    const end = findBreakPoint(parentText, start, CHILD_CHUNK_SIZE);
    const content = parentText.slice(start, end).trim();
    if (content.length > 0) {
      children.push({ content, parentIndex, chunkIndex: childIndex++ });
    }
    start = end - CHILD_CHUNK_OVERLAP;
    if (start < 0) start = 0;
    if (end >= parentText.length) break;
  }

  return children;
}

// ---------------------------------------------------------------------------
// Embedding
// ---------------------------------------------------------------------------

/** Format a float array as Postgres vector literal. */
export function formatVector(vec: number[]): string {
  return `[${vec.join(',')}]`;
}

async function embedBatch(texts: string[], apiKey: string): Promise<number[][]> {
  const response = await fetch(DEEPSEEK_EMBED_URL, {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: EMBED_MODEL, input: texts }),
    signal: AbortSignal.timeout(60_000),
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Embedding API error ${response.status}: ${text.slice(0, 200)}`);
  }
  const json = await response.json();
  const sorted = (json.data as { index: number; embedding: number[] }[]).sort(
    (a, b) => a.index - b.index,
  );
  return sorted.map((d) => d.embedding);
}

/** Embeds an array of texts in batches. Returns embeddings in the same order. */
export async function embedAll(texts: string[], apiKey: string): Promise<number[][]> {
  const results: number[][] = [];
  for (let i = 0; i < texts.length; i += EMBED_BATCH_SIZE) {
    const batch = texts.slice(i, i + EMBED_BATCH_SIZE);
    const vecs = await embedBatch(batch, apiKey);
    results.push(...vecs);
  }
  return results;
}

// ---------------------------------------------------------------------------
// Chunk insertion
// ---------------------------------------------------------------------------

export type InsertChunksOptions = {
  documentId: string;
  parents: ParentChunk[];
  embeddings: number[][];
  admin: SupabaseClient;
};

/**
 * Inserts parent and child chunks into public.chunks.
 * The FTS column (content_tsv) is maintained by the DB trigger from migration 0009.
 * Returns the total number of rows inserted.
 */
export async function insertChunksParentChild({
  documentId,
  parents,
  embeddings,
  admin,
}: InsertChunksOptions): Promise<number> {
  // First pass: insert all parent rows (no embedding needed for parent chunks).
  const parentRows = parents.map((p) => ({
    document_id: documentId,
    content: p.content,
    chunk_type: 'parent',
    metadata: { chunk_index: p.chunkIndex },
    // No embedding for parent rows — they are not directly searched.
  }));

  const { data: insertedParents, error: parentInsertError } = await admin
    .from('chunks')
    .insert(parentRows)
    .select('id, metadata');
  if (parentInsertError) {
    throw new Error(`Failed to insert parent chunks: ${parentInsertError.message}`);
  }

  // Build a map from chunkIndex → DB id for parent rows.
  const parentIdByIndex = new Map<number, string>();
  for (const row of insertedParents ?? []) {
    const idx = (row.metadata as { chunk_index?: number })?.chunk_index;
    if (typeof idx === 'number') parentIdByIndex.set(idx, row.id as string);
  }

  // Collect all child chunks in a flat list, preserving embedding order.
  const childFlat: { parentIndex: number; content: string; chunkIndex: number }[] = [];
  for (const p of parents) {
    for (const c of p.children) {
      childFlat.push(c);
    }
  }

  if (childFlat.length === 0) return parentRows.length;

  const childRows = childFlat.map((c, i) => ({
    document_id: documentId,
    content: c.content,
    chunk_type: 'child',
    parent_id: parentIdByIndex.get(c.parentIndex) ?? null,
    embedding: formatVector(embeddings[i]),
    metadata: { parent_index: c.parentIndex, chunk_index: c.chunkIndex },
    token_count: Math.ceil(c.content.length / 4), // rough approximation
  }));

  const { error: childInsertError } = await admin.from('chunks').insert(childRows);
  if (childInsertError) {
    throw new Error(`Failed to insert child chunks: ${childInsertError.message}`);
  }

  return parentRows.length + childRows.length;
}
