// ingest-url Edge Function
//
// Ingests a web page URL as a RAG document:
//   1. Validates the caller's Supabase JWT.
//   2. Fetches the URL (max 5 MB, 15 s timeout).
//   3. Extracts readable text from HTML (article/main/body).
//   4. Creates a documents row (source_type = 'url').
//   5. Chunks + embeds the text via the shared rag-ingest module.
//   6. Returns { documentId, chunksCreated }.
//
// Deploy:  supabase functions deploy ingest-url
// Secrets: supabase secrets set DEEPSEEK_API_KEY=sk-...

import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js@2';
import {
  chunkTextParentChild,
  embedAll,
  insertChunksParentChild,
} from '../_shared/rag-ingest.ts';

const MAX_BYTES = 5 * 1024 * 1024; // 5 MB
const FETCH_TIMEOUT_MS = 15_000;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function jsonError(message: string, status: number, code = 'error') {
  return new Response(JSON.stringify({ error: { code, message } }), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function jsonOk(data: unknown) {
  return new Response(JSON.stringify(data), {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

async function resolveApiKey(admin: SupabaseClient): Promise<string | null> {
  const fromEnv = Deno.env.get('DEEPSEEK_API_KEY');
  if (fromEnv) return fromEnv;
  const { data } = await admin
    .from('edge_secrets')
    .select('value')
    .eq('name', 'DEEPSEEK_API_KEY')
    .maybeSingle();
  return data?.value ?? null;
}

// ---------------------------------------------------------------------------
// URL fetching + HTML text extraction
// ---------------------------------------------------------------------------

async function fetchUrlText(url: string): Promise<string> {
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'SheyonAi-RAG-Bot/1.0 (+https://sheyonai.app/bot)',
      Accept: 'text/html,application/xhtml+xml,text/plain',
    },
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    redirect: 'follow',
  });

  if (!response.ok) {
    throw new Error(`URL fetch failed with status ${response.status}`);
  }

  const contentType = response.headers.get('content-type') ?? '';

  // For plain text / markdown responses, return directly.
  if (contentType.includes('text/plain') || contentType.includes('text/markdown')) {
    return await response.text();
  }

  // Read up to MAX_BYTES to avoid huge pages.
  const reader = response.body?.getReader();
  if (!reader) throw new Error('No response body');

  const chunks: Uint8Array[] = [];
  let totalBytes = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    totalBytes += value.byteLength;
    if (totalBytes > MAX_BYTES) {
      reader.cancel().catch(() => {});
      break;
    }
    chunks.push(value);
  }

  const decoder = new TextDecoder('utf-8', { fatal: false });
  const html = decoder.decode(
    chunks.reduce((acc, c) => {
      const merged = new Uint8Array(acc.length + c.length);
      merged.set(acc, 0);
      merged.set(c, acc.length);
      return merged;
    }, new Uint8Array(0)),
  );

  return extractHtmlText(html);
}

/**
 * Extracts readable text from HTML by:
 *  1. Removing <script>, <style>, <nav>, <footer>, <header> blocks.
 *  2. Preferring content inside <article> or <main> if present.
 *  3. Stripping remaining HTML tags and collapsing whitespace.
 */
function extractHtmlText(html: string): string {
  // Remove non-content elements entirely.
  let cleaned = html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<nav[\s\S]*?<\/nav>/gi, '')
    .replace(/<footer[\s\S]*?<\/footer>/gi, '')
    .replace(/<header[\s\S]*?<\/header>/gi, '');

  // Prefer article or main content when available.
  const articleMatch = cleaned.match(/<article[\s\S]*?<\/article>/i);
  const mainMatch = cleaned.match(/<main[\s\S]*?<\/main>/i);
  if (articleMatch) {
    cleaned = articleMatch[0];
  } else if (mainMatch) {
    cleaned = mainMatch[0];
  }

  // Replace block-level elements with newlines before stripping tags.
  cleaned = cleaned
    .replace(/<\/(p|div|h[1-6]|li|blockquote|pre|tr)>/gi, '\n')
    .replace(/<br\s*\/?>/gi, '\n');

  // Strip all remaining HTML tags.
  cleaned = cleaned.replace(/<[^>]+>/g, ' ');

  // Decode common HTML entities.
  cleaned = cleaned
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ');

  // Collapse runs of whitespace/blank lines.
  return cleaned
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .join('\n');
}

/** Derives a human-friendly filename from a URL (e.g. "docs.example.com — page-title"). */
function filenameFromUrl(url: string): string {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.replace(/^www\./, '');
    const pathPart = parsed.pathname
      .split('/')
      .filter(Boolean)
      .slice(-2)
      .join('-')
      .replace(/[^a-z0-9-]/gi, '-')
      .slice(0, 60);
    return pathPart ? `${host} — ${pathPart}` : host;
  } catch {
    return 'webpage';
  }
}

// ---------------------------------------------------------------------------
// Main handler
// ---------------------------------------------------------------------------

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  if (req.method !== 'POST') {
    return jsonError('Method not allowed', 405, 'method_not_allowed');
  }

  // 1. Authenticate caller
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) return jsonError('Missing Authorization header', 401, 'unauthorized');

  const supabaseAuth = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: authHeader } } },
  );
  const {
    data: { user },
    error: userError,
  } = await supabaseAuth.auth.getUser();
  if (userError || !user) return jsonError('Invalid or expired token', 401, 'unauthorized');

  const admin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  const apiKey = await resolveApiKey(admin);
  if (!apiKey) return jsonError('DEEPSEEK_API_KEY is not configured', 500, 'not_configured');

  // 2. Parse request body
  let url: string;
  try {
    const body = await req.json();
    url = body?.url;
    if (typeof url !== 'string' || !url.startsWith('http')) {
      throw new Error('url is required and must be an http/https address');
    }
    // Normalize
    url = new URL(url).toString();
  } catch {
    return jsonError('Body must be JSON with a "url" string', 400, 'bad_request');
  }

  // 3. Fetch and extract text from the URL
  let text: string;
  try {
    text = await fetchUrlText(url);
  } catch (err) {
    console.error('URL fetch error:', err);
    return jsonError(
      err instanceof Error ? err.message : 'Failed to fetch URL',
      502,
      'fetch_error',
    );
  }

  if (text.trim().length < 100) {
    return jsonError('Not enough readable text found at this URL', 422, 'empty_document');
  }

  // 4. Create document row
  const filename = filenameFromUrl(url);
  const { data: docRow, error: docInsertError } = await admin
    .from('documents')
    .insert({
      user_id: user.id,
      filename,
      storage_path: '', // URL docs have no storage path
      mime_type: 'text/html',
      source_type: 'url',
      source_url: url,
    })
    .select('id')
    .single();
  if (docInsertError || !docRow) {
    console.error('Document insert error:', docInsertError);
    return jsonError('Failed to create document record', 500, 'db_error');
  }
  const documentId = docRow.id as string;

  // 5. Parent-child chunking
  const parents = chunkTextParentChild(text);
  if (parents.length === 0) {
    await admin.from('documents').delete().eq('id', documentId);
    return jsonError('URL produced no usable content', 422, 'empty_document');
  }

  const allChildren = parents.flatMap((p) => p.children);

  // 6. Embed children
  let embeddings: number[][];
  try {
    embeddings = await embedAll(
      allChildren.map((c) => c.content),
      apiKey,
    );
  } catch (err) {
    console.error('Embedding error:', err);
    await admin.from('documents').delete().eq('id', documentId);
    return jsonError('Embedding failed', 502, 'embed_error');
  }

  // 7. Insert chunks
  let totalInserted: number;
  try {
    totalInserted = await insertChunksParentChild({ documentId, parents, embeddings, admin });
  } catch (err) {
    console.error('Chunk insert error:', err);
    await admin.from('documents').delete().eq('id', documentId);
    return jsonError('Failed to store chunks', 500, 'db_error');
  }

  return jsonOk({
    documentId,
    filename,
    chunksCreated: totalInserted,
    parentCount: parents.length,
    childCount: allChildren.length,
  });
});
