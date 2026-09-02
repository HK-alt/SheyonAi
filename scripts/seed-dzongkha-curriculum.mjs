/**
 * One-time seed: ingest Dzongkha curriculum markdown into Supabase as shared documents
 * using parent-child chunking (parent ~2000 chars, children ~400 chars).
 *
 * Requires:
 *   SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *   DEEPSEEK_API_KEY
 *
 * Usage (from SheyonAi/):
 *   node --env-file=.env scripts/seed-dzongkha-curriculum.mjs
 *
 * Re-running deletes prior curriculum rows for subject=dzongkha and re-ingests.
 */

import { createClient } from '@supabase/supabase-js';
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CONTENT_DIR = path.join(__dirname, '..', 'content', 'dzongkha');

const DEEPSEEK_EMBED_URL = 'https://api.deepseek.com/v1/embeddings';
const EMBED_MODEL = 'deepseek-embedding';
const EMBED_BATCH_SIZE = 32;
const SUBJECT = 'dzongkha';

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
// Parent-child chunking
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
// Curriculum management
// ---------------------------------------------------------------------------

async function deleteExistingCurriculum(admin) {
  const { data: docs, error } = await admin
    .from('documents')
    .select('id')
    .eq('is_curriculum', true)
    .eq('subject', SUBJECT);

  if (error) throw new Error(`Failed to list curriculum: ${error.message}`);
  if (!docs?.length) return;

  const ids = docs.map((d) => d.id);
  await admin.from('chunks').delete().in('document_id', ids);
  const { error: delError } = await admin.from('documents').delete().in('id', ids);
  if (delError) throw new Error(`Failed to delete old curriculum: ${delError.message}`);
  console.log(`Removed ${ids.length} existing curriculum document(s).`);
}

async function ingestFile(admin, apiKey, filename, text) {
  const parents = chunkTextParentChild(text);
  const allChildren = parents.flatMap((p) => p.children);

  if (parents.length === 0 || allChildren.length === 0) {
    console.warn(`Skipping empty file: ${filename}`);
    return 0;
  }

  const embeddings = await embedAll(allChildren.map((c) => c.content), apiKey);

  const { data: doc, error: docError } = await admin
    .from('documents')
    .insert({
      filename,
      storage_path: `curriculum/dzongkha/${filename}`,
      mime_type: 'text/markdown',
      file_size: Buffer.byteLength(text, 'utf8'),
      is_curriculum: true,
      subject: SUBJECT,
      user_id: null,
    })
    .select('id')
    .single();

  if (docError || !doc) {
    throw new Error(`Document insert failed for ${filename}: ${docError?.message}`);
  }

  // Insert parent chunks (no embeddings — context only)
  const parentRows = parents.map((p) => ({
    document_id: doc.id,
    content: p.content,
    chunk_type: 'parent',
    metadata: { source: filename, chunk_index: p.chunkIndex, subject: SUBJECT },
  }));

  const { data: insertedParents, error: parentErr } = await admin
    .from('chunks')
    .insert(parentRows)
    .select('id, metadata');
  if (parentErr) throw new Error(`Parent insert failed for ${filename}: ${parentErr.message}`);

  const parentIdByIndex = new Map();
  for (const row of insertedParents ?? []) {
    const idx = row.metadata?.chunk_index;
    if (typeof idx === 'number') parentIdByIndex.set(idx, row.id);
  }

  // Insert child chunks with embeddings
  const childRows = allChildren.map((c, i) => ({
    document_id: doc.id,
    content: c.content,
    chunk_type: 'child',
    parent_id: parentIdByIndex.get(c.parentIndex) ?? null,
    embedding: formatVector(embeddings[i]),
    metadata: { source: filename, parent_index: c.parentIndex, chunk_index: c.chunkIndex, subject: SUBJECT },
    token_count: Math.ceil(c.content.length / 4),
  }));

  const { error: childErr } = await admin.from('chunks').insert(childRows);
  if (childErr) throw new Error(`Child insert failed for ${filename}: ${childErr.message}`);

  const total = parentRows.length + childRows.length;
  console.log(`  ${filename}: ${parents.length} parents, ${allChildren.length} children (${total} total)`);
  return total;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const supabaseUrl = requireEnv('SUPABASE_URL');
  const serviceKey = requireEnv('SUPABASE_SERVICE_ROLE_KEY');
  const apiKey = requireEnv('DEEPSEEK_API_KEY');

  const admin = createClient(supabaseUrl, serviceKey);

  const entries = await readdir(CONTENT_DIR);
  const mdFiles = entries.filter((f) => f.endsWith('.md')).sort();
  if (mdFiles.length === 0) {
    throw new Error(`No .md files found in ${CONTENT_DIR}`);
  }

  console.log(`Seeding Dzongkha curriculum (parent-child) from ${CONTENT_DIR}…`);
  await deleteExistingCurriculum(admin);

  let totalChunks = 0;
  for (const filename of mdFiles) {
    const filePath = path.join(CONTENT_DIR, filename);
    const text = await readFile(filePath, 'utf8');
    totalChunks += await ingestFile(admin, apiKey, filename, text);
  }

  console.log(`Done. ${mdFiles.length} file(s), ${totalChunks} total chunk rows.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
