// process-document Edge Function
//
// Processes an uploaded document for RAG:
//   1. Validates the caller's Supabase JWT.
//   2. Downloads the raw file from Storage (service role).
//   3. Extracts text (PDF via pdfjs-dist, DOCX via mammoth, text/md directly).
//   4. Splits text into parent-child chunks (~2000 / ~400 chars).
//   5. Batch-embeds child chunks with DeepSeek embedding API (1024-dim).
//   6. Stores parent + child chunks in public.chunks.
//   7. Returns { chunksCreated: number }.
//
// Deploy:  supabase functions deploy process-document
// Secrets: supabase secrets set DEEPSEEK_API_KEY=sk-...

import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js@2';
import {
  chunkTextParentChild,
  embedAll,
  extractText,
  insertChunksParentChild,
} from '../_shared/rag-ingest.ts';

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
  let documentId: string;
  let storagePath: string;
  let mimeType: string;
  try {
    const body = await req.json();
    documentId = body?.documentId;
    storagePath = body?.storagePath;
    mimeType = body?.mimeType ?? 'text/plain';
    if (typeof documentId !== 'string' || typeof storagePath !== 'string') {
      throw new Error('documentId and storagePath are required');
    }
  } catch {
    return jsonError('Body must be JSON with documentId and storagePath', 400, 'bad_request');
  }

  // Verify the document belongs to this user
  const { data: doc } = await admin
    .from('documents')
    .select('id, user_id')
    .eq('id', documentId)
    .single();
  if (!doc || doc.user_id !== user.id) {
    return jsonError('Document not found', 404, 'not_found');
  }

  // 3. Download file from Storage
  const { data: fileData, error: downloadError } = await admin.storage
    .from('documents')
    .download(storagePath);
  if (downloadError || !fileData) {
    return jsonError(`Storage download failed: ${downloadError?.message}`, 500, 'storage_error');
  }

  const bytes = new Uint8Array(await fileData.arrayBuffer());

  // 4. Extract text
  let text: string;
  try {
    text = await extractText(bytes, mimeType);
  } catch (err) {
    console.error('Text extraction error:', err);
    return jsonError('Text extraction failed', 500, 'extraction_error');
  }

  if (text.trim().length === 0) {
    return jsonError('No text content found in document', 422, 'empty_document');
  }

  // 5. Parent-child chunking
  const parents = chunkTextParentChild(text);
  if (parents.length === 0) {
    return jsonError('Document produced no chunks', 422, 'empty_document');
  }

  // 6. Collect all child texts and embed only those
  const allChildren = parents.flatMap((p) => p.children);
  if (allChildren.length === 0) {
    return jsonError('Document produced no child chunks', 422, 'empty_document');
  }

  let embeddings: number[][];
  try {
    embeddings = await embedAll(
      allChildren.map((c) => c.content),
      apiKey,
    );
  } catch (err) {
    console.error('Embedding error:', err);
    return jsonError('Embedding failed', 502, 'embed_error');
  }

  // 7. Delete any existing chunks for this document (re-process scenario)
  await admin.from('chunks').delete().eq('document_id', documentId);

  // 8. Insert parent + child chunks
  let totalInserted: number;
  try {
    totalInserted = await insertChunksParentChild({
      documentId,
      parents,
      embeddings,
      admin,
    });
  } catch (err) {
    console.error('Chunk insert error:', err);
    return jsonError('Failed to store chunks', 500, 'db_error');
  }

  return jsonOk({ chunksCreated: totalInserted, parentCount: parents.length, childCount: allChildren.length });
});
