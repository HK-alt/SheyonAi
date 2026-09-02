// Shared advanced RAG retrieval pipeline used by rag-chat.
//
// Steps:
//   1. buildContextualQuery   — condenses conversation history into a standalone search query
//   2. rewriteQuery           — expands query into multiple search variants
//   3. hybridSearch           — runs hybrid_search_chunks for each variant and merges via RRF
//   4. rerankChunks           — LLM scores top candidates, drops irrelevant ones
//   5. expandParentContext    — fetches parent chunk text for surviving children

import { type SupabaseClient } from 'npm:@supabase/supabase-js@2';

const DEEPSEEK_EMBED_URL = 'https://api.deepseek.com/v1/embeddings';
const DEEPSEEK_CHAT_URL = 'https://api.deepseek.com/chat/completions';
const EMBED_MODEL = 'deepseek-embedding';

// Retrieval constants — can be overridden via env vars.
const HYBRID_CANDIDATES = parseInt(Deno.env.get('RAG_HYBRID_CANDIDATES') ?? '20', 10);
const FINAL_CHUNKS = parseInt(Deno.env.get('RAG_FINAL_CHUNKS') ?? '6', 10);
const RERANK_MIN_SCORE = parseFloat(Deno.env.get('RAG_RERANK_MIN_SCORE') ?? '3');
const MATCH_THRESHOLD = parseFloat(Deno.env.get('RAG_MATCH_THRESHOLD') ?? '0.35');

export type HistoryMessage = { role: string; content: string };

export type RawChunk = {
  id: string;
  document_id: string;
  content: string;
  metadata: Record<string, unknown>;
  filename: string;
  parent_id: string | null;
  chunk_type: string;
  similarity: number;
  fts_rank: number;
  rrf_score: number;
};

export type RankedChunk = RawChunk & {
  rerank_score: number;
  parent_content: string | null;
};

// ---------------------------------------------------------------------------
// Step 1: Conversation-aware contextual query
// ---------------------------------------------------------------------------

/**
 * Converts a multi-turn conversation history + latest message into a single
 * self-contained search query. Falls back to the raw message on any error.
 */
export async function buildContextualQuery(
  history: HistoryMessage[],
  latestMessage: string,
  apiKey: string,
): Promise<string> {
  // If the message is a standalone short query, skip the LLM call.
  if (history.length <= 1 || latestMessage.trim().length < 20) {
    return latestMessage.trim();
  }

  const recentHistory = history.slice(-6);
  const historyText = recentHistory
    .map((m) => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content.slice(0, 300)}`)
    .join('\n');

  try {
    const response = await fetch(DEEPSEEK_CHAT_URL, {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: Deno.env.get('DEEPSEEK_MODEL') ?? 'deepseek-chat',
        messages: [
          {
            role: 'system',
            content:
              'Given a conversation history and a follow-up message, rewrite the follow-up as a single self-contained search query for a document retrieval system. Output ONLY the query text, no explanation.',
          },
          {
            role: 'user',
            content: `Conversation:\n${historyText}\n\nFollow-up: ${latestMessage}\n\nStandalone search query:`,
          },
        ],
        temperature: 0,
        max_tokens: 150,
        stream: false,
      }),
      signal: AbortSignal.timeout(15_000),
    });

    if (!response.ok) return latestMessage.trim();
    const json = await response.json();
    const query = json.choices?.[0]?.message?.content?.trim();
    return query || latestMessage.trim();
  } catch {
    return latestMessage.trim();
  }
}

// ---------------------------------------------------------------------------
// Step 2: Query rewriting — generate 2–3 search variants
// ---------------------------------------------------------------------------

/**
 * Expands a search query into 2–3 variants (synonyms, entity names, question
 * forms) to improve recall. Falls back to the original query on error.
 */
export async function rewriteQuery(query: string, apiKey: string): Promise<string[]> {
  // Skip rewriting for very short queries to save tokens.
  if (query.trim().length < 20) return [query.trim()];

  try {
    const response = await fetch(DEEPSEEK_CHAT_URL, {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: Deno.env.get('DEEPSEEK_MODEL') ?? 'deepseek-chat',
        messages: [
          {
            role: 'system',
            content:
              'You are a search query optimizer. Given a query, generate 2 alternative search queries that capture the same intent using different phrasing, synonyms, or entity names. Output a JSON array of strings, no explanation. Example: ["query one", "query two"]',
          },
          {
            role: 'user',
            content: `Original query: ${query}`,
          },
        ],
        temperature: 0.3,
        max_tokens: 200,
        stream: false,
      }),
      signal: AbortSignal.timeout(15_000),
    });

    if (!response.ok) return [query];
    const json = await response.json();
    const raw = json.choices?.[0]?.message?.content?.trim() ?? '';
    const variants: unknown = JSON.parse(raw);
    if (Array.isArray(variants) && variants.length > 0) {
      const all = [query, ...variants.filter((v): v is string => typeof v === 'string')];
      return [...new Set(all)].slice(0, 3);
    }
    return [query];
  } catch {
    return [query];
  }
}

// ---------------------------------------------------------------------------
// Step 3: Hybrid search + multi-query RRF merge
// ---------------------------------------------------------------------------

async function embedText(text: string, apiKey: string): Promise<number[]> {
  const response = await fetch(DEEPSEEK_EMBED_URL, {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: EMBED_MODEL, input: [text] }),
    signal: AbortSignal.timeout(30_000),
  });
  if (!response.ok) {
    const txt = await response.text();
    throw new Error(`Embedding API ${response.status}: ${txt.slice(0, 200)}`);
  }
  const json = await response.json();
  return json.data[0].embedding as number[];
}

async function runHybridSearch(
  admin: SupabaseClient,
  embedding: number[],
  queryText: string,
  userId: string,
  subject?: string,
  documentIds?: string[],
): Promise<RawChunk[]> {
  const { data, error } = await admin.rpc('hybrid_search_chunks', {
    query_embedding: JSON.stringify(embedding),
    p_query_text: queryText,
    match_threshold: MATCH_THRESHOLD,
    match_count: HYBRID_CANDIDATES,
    p_user_id: userId,
    p_subject: subject ?? null,
    p_document_ids: documentIds ?? null,
  });
  if (error) throw new Error(`hybrid_search_chunks RPC failed: ${error.message}`);
  return (data ?? []) as RawChunk[];
}

/**
 * Runs hybrid search for each query variant, then merges results using
 * Reciprocal Rank Fusion across variants.
 */
export async function hybridSearchMultiQuery(
  admin: SupabaseClient,
  queries: string[],
  apiKey: string,
  userId: string,
  subject?: string,
  documentIds?: string[],
): Promise<RawChunk[]> {
  // Embed all queries in parallel.
  const embeddings = await Promise.all(queries.map((q) => embedText(q, apiKey)));

  // Run hybrid search for each query variant in parallel.
  const resultSets = await Promise.all(
    queries.map((q, i) =>
      runHybridSearch(admin, embeddings[i], q, userId, subject, documentIds).catch(
        () => [] as RawChunk[],
      ),
    ),
  );

  // Merge with RRF across all variant result sets.
  const rrfScores = new Map<string, number>();
  const chunkById = new Map<string, RawChunk>();

  for (const results of resultSets) {
    results.forEach((chunk, rank) => {
      rrfScores.set(chunk.id, (rrfScores.get(chunk.id) ?? 0) + 1 / (60 + rank));
      if (!chunkById.has(chunk.id)) chunkById.set(chunk.id, chunk);
    });
  }

  return [...chunkById.values()]
    .sort((a, b) => (rrfScores.get(b.id) ?? 0) - (rrfScores.get(a.id) ?? 0))
    .slice(0, HYBRID_CANDIDATES);
}

// ---------------------------------------------------------------------------
// Step 4: LLM re-ranking
// ---------------------------------------------------------------------------

/**
 * Scores each chunk snippet against the query (0–10) using a single LLM call.
 * Returns top FINAL_CHUNKS chunks with a score >= RERANK_MIN_SCORE.
 */
export async function rerankChunks(
  query: string,
  chunks: RawChunk[],
  apiKey: string,
): Promise<Array<RawChunk & { rerank_score: number }>> {
  if (chunks.length === 0) return [];
  if (chunks.length <= FINAL_CHUNKS) {
    return chunks.map((c) => ({ ...c, rerank_score: 10 }));
  }

  const snippets = chunks
    .map(
      (c, i) =>
        `[${i + 1}] (${c.filename}) ${c.content.slice(0, 200).replace(/\n/g, ' ')}`,
    )
    .join('\n');

  try {
    const response = await fetch(DEEPSEEK_CHAT_URL, {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: Deno.env.get('DEEPSEEK_MODEL') ?? 'deepseek-chat',
        messages: [
          {
            role: 'system',
            content:
              'You are a relevance judge. Score each document snippet from 0–10 for how relevant it is to answering the query. Output a JSON array of numbers in the same order as the snippets, no explanation. Example: [8, 3, 9, 2]',
          },
          {
            role: 'user',
            content: `Query: ${query}\n\nSnippets:\n${snippets}`,
          },
        ],
        temperature: 0,
        max_tokens: 200,
        stream: false,
      }),
      signal: AbortSignal.timeout(20_000),
    });

    if (!response.ok) {
      // Fall back to hybrid scores if re-rank fails.
      return chunks.slice(0, FINAL_CHUNKS).map((c) => ({ ...c, rerank_score: 5 }));
    }

    const json = await response.json();
    const raw = json.choices?.[0]?.message?.content?.trim() ?? '';
    const scores: unknown = JSON.parse(raw);

    if (!Array.isArray(scores)) {
      return chunks.slice(0, FINAL_CHUNKS).map((c) => ({ ...c, rerank_score: 5 }));
    }

    return chunks
      .map((c, i) => ({ ...c, rerank_score: typeof scores[i] === 'number' ? scores[i] : 5 }))
      .filter((c) => c.rerank_score >= RERANK_MIN_SCORE)
      .sort((a, b) => b.rerank_score - a.rerank_score)
      .slice(0, FINAL_CHUNKS);
  } catch {
    return chunks.slice(0, FINAL_CHUNKS).map((c) => ({ ...c, rerank_score: 5 }));
  }
}

// ---------------------------------------------------------------------------
// Step 5: Parent context expansion
// ---------------------------------------------------------------------------

/**
 * For each child chunk, fetches its parent's content and attaches it as
 * `parent_content`. When `parent_id` is null (legacy flat chunks), the
 * child's own content is used as the context.
 */
export async function expandParentContext(
  admin: SupabaseClient,
  chunks: Array<RawChunk & { rerank_score: number }>,
): Promise<RankedChunk[]> {
  const parentIds = [...new Set(chunks.map((c) => c.parent_id).filter(Boolean))] as string[];

  const parentContentById = new Map<string, string>();

  if (parentIds.length > 0) {
    const { data } = await admin
      .from('chunks')
      .select('id, content')
      .in('id', parentIds);
    for (const row of data ?? []) {
      parentContentById.set(row.id as string, row.content as string);
    }
  }

  return chunks.map((c) => ({
    ...c,
    parent_content: c.parent_id
      ? (parentContentById.get(c.parent_id) ?? c.content)
      : null,
  }));
}

// ---------------------------------------------------------------------------
// Main pipeline entry point
// ---------------------------------------------------------------------------

export type RetrievalOptions = {
  admin: SupabaseClient;
  userId: string;
  history: HistoryMessage[];
  latestMessage: string;
  apiKey: string;
  subject?: string;
  documentIds?: string[];
};

export type RetrievalResult = {
  chunks: RankedChunk[];
  primaryQuery: string;
};

/**
 * Full advanced retrieval pipeline:
 * contextual query → rewrite → hybrid multi-query search → LLM re-rank → parent expand
 */
export async function runAdvancedRetrieval(
  opts: RetrievalOptions,
): Promise<RetrievalResult> {
  const { admin, userId, history, latestMessage, apiKey, subject, documentIds } = opts;

  // Step 1: Build contextual standalone query.
  const primaryQuery = await buildContextualQuery(history, latestMessage, apiKey);

  // Step 2: Rewrite into multiple variants.
  const queries = await rewriteQuery(primaryQuery, apiKey);

  // Step 3: Hybrid multi-query search.
  let rawChunks: RawChunk[];
  try {
    rawChunks = await hybridSearchMultiQuery(
      admin,
      queries,
      apiKey,
      userId,
      subject,
      documentIds,
    );
  } catch (err) {
    console.error('Hybrid search failed, returning empty:', err);
    rawChunks = [];
  }

  if (rawChunks.length === 0) {
    return { chunks: [], primaryQuery };
  }

  // Step 4: LLM re-ranking.
  const reranked = await rerankChunks(primaryQuery, rawChunks, apiKey);

  // Step 5: Expand parent context.
  const withContext = await expandParentContext(admin, reranked);

  return { chunks: withContext, primaryQuery };
}
