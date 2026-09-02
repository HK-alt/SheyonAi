/**
 * One-time backfill: re-index all user-uploaded documents using the new
 * parent-child chunking strategy introduced in migration 0009.
 *
 * Identifies documents whose chunks have chunk_type = 'flat' (legacy) or
 * chunk_type IS NULL, then re-downloads each file from Storage and re-processes
 * it with the advanced chunker.
 *
 * Requires:
 *   SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *   DEEPSEEK_API_KEY
 *
 * Usage (from SheyonAi/):
 *   node --env-file=.env scripts/reindex-documents.mjs
 *   node --env-file=.env scripts/reindex-documents.mjs --dry-run   (list only)
 *   node --env-file=.env scripts/reindex-documents.mjs --doc-id=<uuid>  (single doc)
 */

import { createClient } from '@supabase/supabase-js';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const isDryRun = process.argv.includes('--dry-run');
const singleDocArg = process.argv.find((a) => a.startsWith('--doc-id='));
const singleDocId = singleDocArg ? singleDocArg.split('=')[1] : null;

const DEEPSEEK_EMBED_URL = 'https://api.deepseek.com/v1/embeddings';
const EMBED_MODEL = 'deepseek-embedding';
const EMBED_BATCH_SIZE = 32;

// Parent-child sizing (must match rag-ingest.ts)
const PARENT_CHUNK_SIZE = 2000;
const CHILD_CHUNK_SIZE = 400;
const CHILD_CHUNK_OVERLAP = 80;

function requireEnv(name) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required env var: ${name}`);
  return value;
}

// ---------------------------------------------------------------------------
// Text extraction
// ---------------------------------------------------------------------------

async function extractText(bytes, mimeType) {
  const normalized = mimeType?.split(';')[0]?.trim()?.toLowerCase() ?? 'text/plain';

  if (normalized === 'application/pdf') {
    const { default: pdfjsLib } = await import('pdfjs-dist/legacy/build/pdf.mjs');
    const loadingTask = pdfjsLib.getDocument({ data: bytes });
    const pdf = await loadingTask.promise;
    const parts = [];
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      parts.push(content.items.map((item) => item.str ?? '').join(' '));
    }
    return parts.join('\n\n');
  }

  return new TextDecoder('utf-8', { fatal: false }).decode(bytes);
}

// ---------------------------------------------------------------------------
// Parent-child chunking (Node port of rag-ingest.ts)
// ---------------------------------------------------------------------------

function findBreakPoint(text, start, maxLen) {
  const end = Math.min(start + maxLen, text.length);
  if (end >= text.length) return end;
  const searchZone = text.slice(Math.max(start, end - 200), end);
  const lastBreak = Math.max(
    searchZone.lastIndexOf('\n\n'),
    searchZone.lastIndexOf('. '),
    searchZone.lastIndexOf('? '),
    searchZone.lastIndexOf('! '),
  );
  if (lastBreak > 0) return Math.max(start, end - 200) + lastBreak + 1;
  return end;
}

function splitChildren(parentText, parentIndex) {
  const children = [];
  let start = 0;
  let childIndex = 0;
  while (start < parentText.length) {
    const end = findBreakPoint(parentText, start, CHILD_CHUNK_SIZE);
    const content = parentText.slice(start, end).trim();
    if (content.length > 0) children.push({ content, parentIndex, chunkIndex: childIndex++ });
    start = end - CHILD_CHUNK_OVERLAP;
    if (start < 0) start = 0;
    if (end >= parentText.length) break;
  }
  return children;
}

function chunkTextParentChild(text) {
  const normalized = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim();
  const parents = [];
  let parentStart = 0;
  let parentIndex = 0;
  while (parentStart < normalized.length) {
    const parentEnd = findBreakPoint(normalized, parentStart, PARENT_CHUNK_SIZE);
    const parentContent = normalized.slice(parentStart, parentEnd).trim();
    if (parentContent.length > 0) {
      const children = splitChildren(parentContent, parentIndex);
      parents.push({ content: parentContent, chunkIndex: parentIndex, children });
      parentIndex++;
    }
    parentStart = parentEnd;
  }
  return parents;
}

// ---------------------------------------------------------------------------
// Embedding
// ---------------------------------------------------------------------------

async function embedBatch(texts, apiKey) {
  const response = await fetch(DEEPSEEK_EMBED_URL, {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: EMBED_MODEL, input: texts }),
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Embedding API ${response.status}: ${text.slice(0, 200)}`);
  }
  const json = await response.json();
  return json.data.sort((a, b) => a.index - b.index).map((d) => d.embedding);
}

async function embedAll(texts, apiKey) {
  const results = [];
  for (let i = 0; i < texts.length; i += EMBED_BATCH_SIZE) {
    const batch = texts.slice(i, i + EMBED_BATCH_SIZE);
    const vecs = await embedBatch(batch, apiKey);
    results.push(...vecs);
  }
  return results;
}

function formatVector(vec) {
  return `[${vec.join(',')}]`;
}

// ---------------------------------------------------------------------------
// Re-index a single document
// ---------------------------------------------------------------------------

async function reindexDocument(admin, apiKey, doc) {
  console.log(`  → ${doc.filename} (${doc.id})`);

  if (!doc.storage_path) {
    console.log(`    Skipping — no storage path (URL doc)`);
    return { skipped: true };
  }

  // Download from Storage
  const { data: fileData, error: downloadError } = await admin.storage
    .from('documents')
    .download(doc.storage_path);

  if (downloadError || !fileData) {
    console.warn(`    Download failed: ${downloadError?.message ?? 'no data'}`);
    return { skipped: true };
  }

  const bytes = new Uint8Array(await fileData.arrayBuffer());

  // Extract text
  let text;
  try {
    text = await extractText(bytes, doc.mime_type ?? 'text/plain');
  } catch (err) {
    console.warn(`    Text extraction failed: ${err.message}`);
    return { skipped: true };
  }

  if (text.trim().length === 0) {
    console.warn(`    No text content — skipping`);
    return { skipped: true };
  }

  // Parent-child chunking
  const parents = chunkTextParentChild(text);
  const allChildren = parents.flatMap((p) => p.children);

  if (allChildren.length === 0) {
    console.warn(`    No child chunks — skipping`);
    return { skipped: true };
  }

  // Embed children
  const embeddings = await embedAll(allChildren.map((c) => c.content), apiKey);

  // Delete old chunks
  await admin.from('chunks').delete().eq('document_id', doc.id);

  // Insert parent rows
  const parentRows = parents.map((p) => ({
    document_id: doc.id,
    content: p.content,
    chunk_type: 'parent',
    metadata: { chunk_index: p.chunkIndex },
  }));

  const { data: insertedParents, error: parentErr } = await admin
    .from('chunks')
    .insert(parentRows)
    .select('id, metadata');
  if (parentErr) throw new Error(`Parent insert failed: ${parentErr.message}`);

  const parentIdByIndex = new Map();
  for (const row of insertedParents ?? []) {
    const idx = row.metadata?.chunk_index;
    if (typeof idx === 'number') parentIdByIndex.set(idx, row.id);
  }

  // Insert child rows
  const childRows = allChildren.map((c, i) => ({
    document_id: doc.id,
    content: c.content,
    chunk_type: 'child',
    parent_id: parentIdByIndex.get(c.parentIndex) ?? null,
    embedding: formatVector(embeddings[i]),
    metadata: { parent_index: c.parentIndex, chunk_index: c.chunkIndex },
    token_count: Math.ceil(c.content.length / 4),
  }));

  const { error: childErr } = await admin.from('chunks').insert(childRows);
  if (childErr) throw new Error(`Child insert failed: ${childErr.message}`);

  const total = parentRows.length + childRows.length;
  console.log(`    OK — ${parents.length} parents, ${allChildren.length} children (${total} total)`);
  return { parentCount: parents.length, childCount: allChildren.length };
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const supabaseUrl = requireEnv('SUPABASE_URL');
  const serviceKey = requireEnv('SUPABASE_SERVICE_ROLE_KEY');
  const apiKey = requireEnv('DEEPSEEK_API_KEY');

  const admin = createClient(supabaseUrl, serviceKey);

  // Find documents that still have legacy flat chunks (or no chunks at all).
  let query = admin
    .from('documents')
    .select('id, filename, storage_path, mime_type')
    .eq('is_curriculum', false);

  if (singleDocId) {
    query = query.eq('id', singleDocId);
  } else {
    // Only documents whose chunks are still in 'flat' / untyped state.
    const { data: legacyDocs, error: legacyErr } = await admin
      .from('chunks')
      .select('document_id')
      .in('chunk_type', ['flat'])
      .limit(1000);

    if (legacyErr) throw new Error(`Failed to find legacy chunks: ${legacyErr.message}`);

    if (!legacyDocs || legacyDocs.length === 0) {
      console.log('No legacy flat-chunked documents found. All docs are already re-indexed.');
      return;
    }

    const legacyIds = [...new Set(legacyDocs.map((r) => r.document_id))];
    query = query.in('id', legacyIds);
  }

  const { data: docs, error: docsErr } = await query;
  if (docsErr) throw new Error(`Failed to list documents: ${docsErr.message}`);
  if (!docs || docs.length === 0) {
    console.log('No documents to re-index.');
    return;
  }

  console.log(`Found ${docs.length} document(s) to re-index.`);
  if (isDryRun) {
    for (const doc of docs) console.log(`  ${doc.filename} (${doc.id})`);
    console.log('Dry-run complete. No changes made.');
    return;
  }

  let processed = 0;
  let skipped = 0;
  let failed = 0;

  for (const doc of docs) {
    try {
      const result = await reindexDocument(admin, apiKey, doc);
      if (result.skipped) skipped++;
      else processed++;
    } catch (err) {
      console.error(`  ✗ ${doc.filename}: ${err.message}`);
      failed++;
    }
  }

  console.log(`\nDone. Processed: ${processed}, Skipped: ${skipped}, Failed: ${failed}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
