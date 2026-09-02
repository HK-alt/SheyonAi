// rag-chat Edge Function (advanced)
//
// Answers questions grounded in uploaded documents and/or shared curriculum
// using the full advanced retrieval pipeline:
//   1. Validates the caller's Supabase JWT.
//   2. Loads conversation history and the pending user message.
//   3. Resolves per-conversation document scope (from request body or DB).
//   4. Runs advanced retrieval: contextual query → rewrite → hybrid search
//      → LLM re-rank → parent context expansion.
//   5. Builds a strict RAG system prompt from retrieved passages.
//   6. For Dzongkha: English draft (DeepSeek) → GovTech MT (or HF NLLB, or skip) → polish to Uchen (DeepSeek).
//      Other subjects: streams DeepSeek tokens back to the client as SSE.
//   7. Persists the assistant message (with enriched sources) to public.messages.
//
// Deploy:  supabase functions deploy rag-chat

import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js@2';
import { translateEnglishToDzongkhaGovTech } from '../_shared/govtech-translate.ts';
import {
  isMissingInfoFallback,
  translateEnglishToDzongkha,
} from '../_shared/nllb-translate.ts';
import { runAdvancedRetrieval, type RankedChunk } from '../_shared/rag-retrieval.ts';

const DEEPSEEK_CHAT_URL = 'https://api.deepseek.com/chat/completions';
const CHAT_MODEL = Deno.env.get('DEEPSEEK_MODEL') ?? 'deepseek-chat';
const HISTORY_LIMIT = 30;
const UPSTREAM_TIMEOUT_MS = 90_000;

const VALID_SUBJECTS = new Set(['dzongkha']);

// Keep in sync with LEARNING_LEVEL_PROMPTS in src/lib/learning-level.ts
const LEARNING_LEVEL_HARD_RULE_HEADER =
  '## HARD RULE — Learner education stage (must follow; overrides conflicting depth/tone from other instructions unless a mode requires a specific output format such as JSON/HTML fences)';

const LEARNING_LEVEL_PROMPTS: Record<string, string> = {
  children: `${LEARNING_LEVEL_HARD_RULE_HEADER}
Audience: child about ages 6–11.
Vocabulary: everyday words only. If a hard word is needed, give a one-line kid-friendly meaning right away. No unexplained symbols or formulas.
Structure: short paragraphs or numbered steps (max ~5). Prefer a tiny story, picture-in-words, or concrete example before abstract ideas.
Depth: big idea + one simple example. Skip proofs, derivations, citations, and edge cases.
Tone & length: warm, encouraging, playful but clear. Keep replies short (roughly under 200 words unless they ask for more).
Checks: end with one gentle question like “Does that make sense?” when teaching something new.
Hard avoid: adult/scary content; jargon dumps; dense Markdown tables; academic tone; assuming prior coursework.`,
  middle_school: `${LEARNING_LEVEL_HARD_RULE_HEADER}
Audience: middle school learner about ages 11–14.
Vocabulary: clear school language. Define new terms once on first use. Light analogies from daily life are good.
Structure: step-by-step with short headings when helpful. Show the method, then a small worked example.
Depth: core concept + why it matters + one practice-friendly example. Brief common mistakes OK. No research literature.
Tone & length: friendly and patient. Medium length; prefer clarity over completeness.
Checks: after a multi-step explanation, invite them to try one small step themselves.
Hard avoid: graduate vocabulary; long proofs; assuming algebra/calculus fluency they have not shown; childish baby-talk.`,
  high_school: `${LEARNING_LEVEL_HARD_RULE_HEADER}
Audience: high school learner about ages 14–18 (exam-oriented).
Vocabulary: precise school / early college-prep terms. Explain jargon once if uncommon for this stage.
Structure: exam-ready: method, worked steps, why each step works, then common pitfalls. Use LaTeX for equations when useful.
Depth: enough to solve typical exam questions. Include assumptions and units. Light stretch content only when asked.
Tone & length: clear and confident. Prefer structured answers over essays.
Checks: offer a short “try this” or check-your-understanding when teaching a method.
Hard avoid: PhD-level digressions; unexplained research jargon; overly childish analogies; skipping the method.`,
  college: `${LEARNING_LEVEL_HARD_RULE_HEADER}
Audience: undergraduate / college student.
Vocabulary: precise disciplinary language. Define niche terms briefly; assume calculus/intro major foundations when relevant.
Structure: definitions → assumptions → reasoning → result. Use headings, numbered steps, and short tables when they clarify.
Depth: solid undergrad treatment: mechanisms, trade-offs, and limitations. Optional further reading only if natural.
Tone & length: professional and efficient. Medium-to-full answers; skip nursery examples.
Checks: assume they can follow; ask a diagnostic only if the goal or prerequisite is unclear.
Hard avoid: baby-talk; hand-wavy “just remember this”; dumping graduate survey papers unprompted.`,
  masters: `${LEARNING_LEVEL_HARD_RULE_HEADER}
Audience: master’s / graduate learner.
Vocabulary: field terminology freely. Prefer frameworks, models, and named methods over school metaphors.
Structure: concise analytical prose; lead with the claim, then justification, then caveats. Compare alternatives when useful.
Depth: graduate depth — mechanisms, assumptions, failure modes, and how practitioners decide. Cite standard ideas by name.
Tone & length: dense but readable. Prefer fewer words with higher information density.
Checks: do not reteach undergrad basics unless they stumble; deepen from their question.
Hard avoid: elementary recap; “explain like I’m five”; exam-worksheet tone unless they ask for teaching basics.`,
  doctorate: `${LEARNING_LEVEL_HARD_RULE_HEADER}
Audience: doctorate / research-level reader.
Vocabulary: technical and field-native. Use precise claims; distinguish consensus, debate, and speculation.
Structure: rigorous argument: claim, assumptions, derivation or evidence sketch, edge cases, open questions.
Depth: research-grade reasoning — nuance, counterexamples, methodological limits. Name canonical results/papers when standard.
Tone & length: terse and exact. Skip motivational filler.
Checks: assume expertise; only clarify foundations if they explicitly ask.
Hard avoid: elementary tutorials; oversimplified analogies; hedging that hides the technical point; pep talk.`,
  general: `${LEARNING_LEVEL_HARD_RULE_HEADER}
Audience: capable general adult learner (default).
Vocabulary: clear professional English. Explain jargon briefly when it first appears.
Structure: direct answer first, then supporting detail or steps as needed.
Depth: match the question — practical and accurate without assuming a degree program or a child audience.
Tone & length: friendly and practical. Neither childish nor research-dense unless they push that way.
Checks: optional brief confirmation only when the topic is high-stakes or ambiguous.
Hard avoid: talking down; unexplained specialist dumps; ignoring the user’s stated goal.`,
};

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

// Step 1 — English draft (keep in sync with src/subject/subjects/dzongkha-tutor-prompt.ts)
const DZONGKHA_ENGLISH_GENERATE_PROMPT = `Act as a warm, patient Dzongkha language tutor grounded in the retrieved library excerpts. The learner may write in English; in this step you write the tutor reply in ENGLISH ONLY (a separate step will translate it to Dzongkha).

## Your task in this step
- Answer ONLY from the provided document excerpts. Never invent Dzongkha words, grammar rules, or cultural facts.
- Write the full tutor reply in clear, structured English (headings, bullets, tables when helpful).
- When excerpts contain Dzongkha script forms, quote those exact spellings in your draft so they can be reused in translation — do not guess or alter them.
- Include example sentences as: English gloss + quoted Dzongkha from excerpts + romanization if present in the excerpt.
- Cite sources inline as [1], [2], etc.
- Stay on Bhutanese Dzongkha language learning only (vocabulary, grammar, Uchen script, pronunciation, driglam namzha).

## If information is missing
- Say exactly: "I couldn't find a reliable source for that in my Dzongkha library. Could you rephrase or ask something else?"
- If the learner is only greeting you or stating their level and excerpts are empty, describe a warm welcome and ask for their level — do not invent Dzongkha spellings in this step.

## Bhutanese Dzongkha vs Standard Tibetan (note in English when relevant)
- Hello: ཀུ་ཟུ་བཟང་པོ་ལ (kuzuzangpo la) — not བཀྲ་ཤིས་བདེ་ལེགས (tashi delek)
- Teacher: དགེ་རྒན (gegen) — not སློབ་དཔོན (slobpon)
- He/she is …: ཁོང … ཨིང / རེད — not ཁོང … ཡིན`;

// Step 3 — Polish MT rough draft to Uchen + romanization (keep in sync with dzongkha-tutor-prompt.ts)
const DZONGKHA_POLISH_PROMPT = `Polish a rough machine-translated Dzongkha tutor reply into the final learner-facing lesson in Bhutanese Dzongkha (Uchen script). You receive:
1. The original English tutor draft (ground truth for meaning and structure)
2. A rough machine translation (GovTech / NLLB — may use wrong script or forms), OR a note that MT was skipped

Use ONLY Dzongkha words and spellings that appear in the document excerpts below — never invent forms.
When MT was skipped, produce Uchen + romanization strictly from the English draft and excerpt spellings.

## Primary language — Dzongkha first
- Write the main body in Uchen (Tibetan script). Follow each Dzongkha phrase with romanization in parentheses, e.g. ང་དགེ་རྒན་ཡིན། (nga gegen yin).
- English only as brief glosses for beginners, never as the main explanation language.
- By level: Beginner = short Dzongkha + romanization + one-line English gloss; Intermediate = mostly Dzongkha; Advanced = almost entirely Dzongkha.

## Not Standard Tibetan
- Use Bhutanese Dzongkha forms from the excerpts only. Key contrasts:
  - Hello: ཀུ་ཟུ་བཟང་པོ་ལ (kuzuzangpo la) — **not** བཀྲ་ཤིས་བདེ་ལེགས
  - Thank you: བཀའ་དྲིན་ཆེན་ལ (kadinchen la) — **not** ཐུགས་རྗེ་ཆེ
  - Teacher: དགེ་རྒན (gegen) — **not** སློབ་དཔོན
  - He/she is …: ཁོང … ཨིང / རེད — **not** ཁོང … ཡིན

## Faithfulness
- Preserve the meaning and markdown structure of the English draft. Prefer Uchen forms quoted in the English draft or excerpts over the rough MT output.
- If the English draft is a missing-information fallback, output that exact English sentence verbatim (do not invent Dzongkha).
- Keep source citations [1], [2], etc.
- Use tables for word breakdowns (Dzongkha script | romanization | meaning) when the draft includes vocabulary.`;

const DZONGKHA_ENGLISH_NO_EXCERPTS_NOTE =
  'No relevant document excerpts were found for this query. If the learner is only greeting you or stating their level, describe a warm welcome in English and ask for their level (beginner / intermediate / advanced). For all other questions without excerpts, say exactly: "I couldn\'t find a reliable source for that in my Dzongkha library. Could you rephrase or ask something else?"';

const RAG_SYSTEM_PROMPT = `You are a document assistant. Answer questions ONLY based on the provided document excerpts below.
- If the information is not present in the excerpts, say: "I don't have enough information in the uploaded documents to answer that."
- Never use outside knowledge.
- Cite sources inline as [1], [2], etc.
- Keep answers concise and factual.
- Format with Markdown when it aids readability.`;

const GENERIC_NO_EXCERPTS_NOTE =
  'No relevant document excerpts were found for this query. Tell the user you do not have enough information in the uploaded documents.';

function jsonError(message: string, status: number, code = 'error') {
  return new Response(JSON.stringify({ error: { code, message } }), {
    status,
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

async function resolveHfApiKey(admin: SupabaseClient): Promise<string | null> {
  const fromEnv = Deno.env.get('HF_API_TOKEN');
  if (fromEnv) return fromEnv;
  const { data, error } = await admin
    .from('edge_secrets')
    .select('value')
    .eq('name', 'HF_API_TOKEN')
    .maybeSingle();
  if (error) {
    console.error('Failed to load HF_API_TOKEN from edge_secrets:', error);
    return null;
  }
  return data?.value ?? null;
}

async function resolveGovTechTranslateUrl(admin: SupabaseClient): Promise<string | undefined> {
  const fromEnv = Deno.env.get('GOVTECH_TRANSLATE_URL')?.trim();
  if (fromEnv) return fromEnv;
  const { data, error } = await admin
    .from('edge_secrets')
    .select('value')
    .eq('name', 'GOVTECH_TRANSLATE_URL')
    .maybeSingle();
  if (error) {
    console.error('Failed to load GOVTECH_TRANSLATE_URL from edge_secrets:', error);
    return undefined;
  }
  const value = data?.value?.trim();
  return value || undefined;
}

type MtSource = 'govtech' | 'nllb' | 'none';

/** Prefer GovTech → HF NLLB → skip MT (polish from English + excerpts). */
async function translateDzongkhaDraft(
  englishDraft: string,
  opts: { govTechUrl?: string; hfKey: string | null },
): Promise<{ draft: string; source: MtSource }> {
  try {
    const draft = await translateEnglishToDzongkhaGovTech(englishDraft, opts.govTechUrl);
    return { draft, source: 'govtech' };
  } catch (err) {
    console.warn('GovTech translation failed, trying HF NLLB if configured:', err);
  }

  if (opts.hfKey) {
    try {
      const draft = await translateEnglishToDzongkha(englishDraft, opts.hfKey);
      return { draft, source: 'nllb' };
    } catch (err) {
      console.warn('HF NLLB translation failed, polishing from English draft only:', err);
    }
  }

  return {
    draft:
      '(No machine translation available — polish from the English tutor draft and document excerpts only. Prefer exact Uchen spellings quoted in the draft/excerpts.)',
    source: 'none',
  };
}

function buildSystemPrompt(
  chunks: RankedChunk[],
  subject?: string,
  learningLevel?: string,
): string {
  const isDzongkha = subject === 'dzongkha';
  const basePrompt = isDzongkha ? DZONGKHA_ENGLISH_GENERATE_PROMPT : RAG_SYSTEM_PROMPT;
  const levelBlock =
    learningLevel && LEARNING_LEVEL_PROMPTS[learningLevel]
      ? `\n\n${LEARNING_LEVEL_PROMPTS[learningLevel]}`
      : '';

  if (chunks.length === 0) {
    const noExcerptsNote = isDzongkha ? DZONGKHA_ENGLISH_NO_EXCERPTS_NOTE : GENERIC_NO_EXCERPTS_NOTE;
    return `${basePrompt}${levelBlock}\n\n${noExcerptsNote}`;
  }

  // Use parent context when available; fall back to child content.
  const excerpts = formatExcerpts(chunks);

  return `${basePrompt}${levelBlock}

Document excerpts:
${excerpts}`;
}

function formatExcerpts(chunks: RankedChunk[]): string {
  return chunks
    .map((c, i) => {
      const contextText = c.parent_content ?? c.content;
      return `[${i + 1}] (source: ${c.filename})\n${contextText.trim()}`;
    })
    .join('\n\n');
}

function buildPolishPrompt(chunks: RankedChunk[]): string {
  if (chunks.length === 0) {
    return `${DZONGKHA_POLISH_PROMPT}

No document excerpts were retrieved. If the English draft is a missing-information fallback, output it verbatim. Otherwise use only Uchen forms quoted in the English draft — do not invent Dzongkha spellings.`;
  }

  return `${DZONGKHA_POLISH_PROMPT}

Document excerpts:
${formatExcerpts(chunks)}`;
}

async function callDeepSeekStream(
  messages: { role: string; content: string }[],
  apiKey: string,
  maxTokens: number,
): Promise<Response> {
  let lastError: unknown;
  for (let attempt = 0; attempt < 2; attempt++) {
    if (attempt > 0) await new Promise((r) => setTimeout(r, 750));
    try {
      const res = await fetch(DEEPSEEK_CHAT_URL, {
        method: 'POST',
        headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: CHAT_MODEL,
          messages,
          stream: true,
          stream_options: { include_usage: true },
          temperature: 0.3,
          max_tokens: maxTokens,
        }),
        signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
      });
      if (res.ok && res.body) return res;
      const text = await res.text();
      lastError = new Error(`DeepSeek responded ${res.status}: ${text.slice(0, 300)}`);
      if (res.status < 500) break;
    } catch (err) {
      lastError = err;
    }
  }
  throw lastError;
}

async function callDeepSeekComplete(
  messages: { role: string; content: string }[],
  apiKey: string,
  maxTokens: number,
): Promise<string> {
  let lastError: unknown;
  for (let attempt = 0; attempt < 2; attempt++) {
    if (attempt > 0) await new Promise((r) => setTimeout(r, 750));
    try {
      const res = await fetch(DEEPSEEK_CHAT_URL, {
        method: 'POST',
        headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: CHAT_MODEL,
          messages,
          stream: false,
          temperature: 0.3,
          max_tokens: maxTokens,
        }),
        signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
      });
      if (!res.ok) {
        const text = await res.text();
        lastError = new Error(`DeepSeek responded ${res.status}: ${text.slice(0, 300)}`);
        if (res.status < 500) break;
        continue;
      }
      const json = await res.json();
      const content: string = json.choices?.[0]?.message?.content ?? '';
      if (content.length === 0) {
        lastError = new Error('DeepSeek returned an empty completion');
        break;
      }
      return content;
    } catch (err) {
      lastError = err;
    }
  }
  throw lastError;
}

async function persistAssistantMessage(
  admin: SupabaseClient,
  conversationId: string,
  userId: string,
  fullText: string,
  sources: Record<string, unknown>[],
): Promise<string | null> {
  const { data: inserted, error: insertError } = await admin
    .from('messages')
    .insert({
      conversation_id: conversationId,
      user_id: userId,
      role: 'assistant',
      content: fullText,
      sources: sources.length > 0 ? sources : null,
    })
    .select('id')
    .single();
  if (insertError) {
    console.error('Failed to persist assistant RAG message:', insertError);
    return null;
  }
  return inserted.id;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  if (req.method !== 'POST') {
    return jsonError('Method not allowed', 405, 'method_not_allowed');
  }

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

  let conversationId: string;
  let subject: string | undefined;
  let learningLevel: string | undefined;
  let requestDocumentIds: string[] | undefined;

  try {
    const body = await req.json();
    conversationId = body?.conversationId;
    if (typeof conversationId !== 'string' || conversationId.length === 0) {
      throw new Error('conversationId is required');
    }
    subject =
      typeof body?.subject === 'string' && VALID_SUBJECTS.has(body.subject)
        ? body.subject
        : undefined;
    learningLevel =
      typeof body?.learningLevel === 'string' && body.learningLevel in LEARNING_LEVEL_PROMPTS
        ? body.learningLevel
        : undefined;
    if (Array.isArray(body?.documentIds) && body.documentIds.every((v: unknown) => typeof v === 'string')) {
      requestDocumentIds = body.documentIds as string[];
    }
  } catch {
    return jsonError('Body must be JSON with a "conversationId" string', 400, 'bad_request');
  }

  const hfKey = subject === 'dzongkha' ? await resolveHfApiKey(admin) : null;
  const govTechUrl = subject === 'dzongkha' ? await resolveGovTechTranslateUrl(admin) : undefined;

  // Verify conversation ownership and load rag_document_ids.
  const { data: conversation, error: conversationError } = await admin
    .from('conversations')
    .select('id, user_id, rag_document_ids')
    .eq('id', conversationId)
    .maybeSingle();

  if (conversationError) {
    console.error('Conversation lookup failed:', conversationId, conversationError.message);
    return jsonError('Failed to load conversation', 500, 'db_error');
  }
  if (!conversation) {
    console.error('Conversation missing:', conversationId, 'jwt_user:', user.id);
    return jsonError('Conversation does not exist', 404, 'conversation_missing');
  }
  if (conversation.user_id !== user.id) {
    console.error(
      'Conversation owner mismatch:',
      conversationId,
      'jwt_user:',
      user.id,
      'owner:',
      conversation.user_id,
    );
    return jsonError('Conversation belongs to another user', 403, 'conversation_forbidden');
  }

  // Request body documentIds take precedence over stored conversation scope.
  const documentIds: string[] | undefined =
    requestDocumentIds ??
    (Array.isArray(conversation.rag_document_ids) && conversation.rag_document_ids.length > 0
      ? (conversation.rag_document_ids as string[])
      : undefined);

  const { data: history, error: historyError } = await admin
    .from('messages')
    .select('role, content')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: false })
    .limit(HISTORY_LIMIT);
  if (historyError) return jsonError('Failed to load history', 500, 'db_error');
  if (!history || history.length === 0 || history[0].role !== 'user') {
    return jsonError('Conversation has no pending user message', 400, 'bad_request');
  }

  const latestMessage = history[0].content.trim();
  if (latestMessage.length === 0) {
    return jsonError('User message is empty', 400, 'bad_request');
  }

  // Chronological history for the retrieval pipeline (oldest first, excluding the latest message).
  const historyForRetrieval = history.slice(1).reverse();

  let retrievalResult: Awaited<ReturnType<typeof runAdvancedRetrieval>>;
  try {
    retrievalResult = await runAdvancedRetrieval({
      admin,
      userId: user.id,
      history: historyForRetrieval,
      latestMessage,
      apiKey,
      subject,
      documentIds,
    });
  } catch (err) {
    console.error('Advanced retrieval failed:', err);
    return jsonError('Retrieval pipeline failed', 500, 'search_error');
  }

  const { chunks } = retrievalResult;

  const systemPrompt = buildSystemPrompt(chunks, subject, learningLevel);
  const promptMessages = [
    { role: 'system', content: systemPrompt },
    ...history.reverse().map((m) => ({ role: m.role, content: m.content })),
  ];

  const maxTokens = subject === 'dzongkha' ? 1500 : 1000;

  // Build enriched sources payload.
  const sources = chunks.map((c) => ({
    chunk_id: c.id,
    document_id: c.document_id,
    filename: c.filename,
    snippet: c.content.slice(0, 300),
    parent_snippet: c.parent_content ? c.parent_content.slice(0, 800) : null,
    similarity: Math.round(c.similarity * 1000) / 1000,
    rerank_score: c.rerank_score,
  }));

  const encoder = new TextEncoder();
  const sseHeaders = {
    ...corsHeaders,
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
  };

  // Dzongkha: English draft → GovTech / HF NLLB / skip MT → DeepSeek polish (buffered).
  if (subject === 'dzongkha') {
    const huggingFaceKey = hfKey;
    const govTechUrlOverride = govTechUrl;
    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        const send = (payload: Record<string, unknown>) => {
          try {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify(payload)}\n\n`));
          } catch {
            // Client disconnected
          }
        };

        try {
          let englishDraft: string;
          try {
            englishDraft = await callDeepSeekComplete(promptMessages, apiKey, maxTokens);
          } catch (err) {
            console.error('DeepSeek English draft failed:', err);
            send({ error: { code: 'upstream_error', message: 'AI provider is unavailable, please retry' } });
            return;
          }

          if (isMissingInfoFallback(englishDraft)) {
            const fallback = englishDraft.trim();
            send({ delta: fallback });
            const messageId = await persistAssistantMessage(
              admin,
              conversationId,
              user.id,
              fallback,
              sources,
            );
            send({ done: true, messageId, sources });
            return;
          }

          send({ stage: 'translating' });

          const { draft: mtDraft, source: mtSource } = await translateDzongkhaDraft(englishDraft, {
            govTechUrl: govTechUrlOverride,
            hfKey: huggingFaceKey,
          });
          console.log(`Dzongkha MT source: ${mtSource}`);

          send({ stage: 'polishing' });

          const mtLabel =
            mtSource === 'govtech'
              ? 'Rough GovTech translation'
              : mtSource === 'nllb'
                ? 'Rough NLLB translation (dzo_Deva)'
                : 'Machine translation note';

          const polishMessages = [
            { role: 'system', content: buildPolishPrompt(chunks) },
            {
              role: 'user',
              content: `Original English tutor draft:\n\n${englishDraft}\n\n${mtLabel}:\n\n${mtDraft}\n\nProduce the final polished Dzongkha lesson reply in Uchen with romanization.`,
            },
          ];

          let fullText: string;
          try {
            fullText = await callDeepSeekComplete(polishMessages, apiKey, maxTokens);
          } catch (err) {
            console.error('DeepSeek Dzongkha polish failed:', err);
            send({ error: { code: 'polish_error', message: 'Polish step failed, please retry' } });
            return;
          }

          send({ delta: fullText });
          const messageId = await persistAssistantMessage(
            admin,
            conversationId,
            user.id,
            fullText,
            sources,
          );
          send({ done: true, messageId, sources });
        } catch (err) {
          console.error('Dzongkha RAG pipeline error:', err);
          send({ error: { code: 'stream_error', message: 'Response stream interrupted' } });
        } finally {
          try {
            controller.close();
          } catch {
            // Already closed
          }
        }
      },
    });

    return new Response(stream, { headers: sseHeaders });
  }

  let upstream: Response;
  try {
    upstream = await callDeepSeekStream(promptMessages, apiKey, maxTokens);
  } catch (err) {
    console.error('DeepSeek chat failed:', err);
    return jsonError('AI provider is unavailable, please retry', 502, 'upstream_error');
  }

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (payload: Record<string, unknown>) => {
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(payload)}\n\n`));
        } catch {
          // Client disconnected
        }
      };

      let fullText = '';

      try {
        const reader = upstream.body!.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });

          const lines = buffer.split('\n');
          buffer = lines.pop() ?? '';

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed.startsWith('data:')) continue;
            const payload = trimmed.slice(5).trim();
            if (payload === '[DONE]') continue;
            try {
              const chunk = JSON.parse(payload);
              const delta: string = chunk.choices?.[0]?.delta?.content ?? '';
              if (delta) {
                fullText += delta;
                send({ delta });
              }
            } catch {
              // Skip malformed chunks
            }
          }
        }

        const messageId =
          fullText.length > 0
            ? await persistAssistantMessage(admin, conversationId, user.id, fullText, sources)
            : null;

        send({ done: true, messageId, sources });
      } catch (err) {
        console.error('RAG stream error:', err);
        send({ error: { code: 'stream_error', message: 'Response stream interrupted' } });
      } finally {
        try {
          controller.close();
        } catch {
          // Already closed
        }
      }
    },
    cancel() {
      upstream.body?.cancel().catch(() => {});
    },
  });

  return new Response(stream, { headers: sseHeaders });
});
