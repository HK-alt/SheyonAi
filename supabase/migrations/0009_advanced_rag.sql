-- Advanced RAG: parent-child chunking, FTS hybrid search, per-conversation document scoping,
-- URL document support, and Reciprocal Rank Fusion retrieval.

-- ============================================================
-- 1. chunks table — add parent-child and FTS columns
-- ============================================================

alter table public.chunks
  add column if not exists parent_id    uuid references public.chunks(id) on delete cascade,
  add column if not exists chunk_type   text not null default 'flat'
    check (chunk_type in ('flat', 'parent', 'child')),
  add column if not exists token_count  int,
  add column if not exists content_tsv  tsvector;

-- GIN index for full-text search.
create index if not exists chunks_content_tsv_idx
  on public.chunks using gin(content_tsv);

-- Index for resolving parent rows efficiently.
create index if not exists chunks_parent_id_idx
  on public.chunks (parent_id)
  where parent_id is not null;

-- Backfill FTS column for all existing chunks.
update public.chunks
set content_tsv = to_tsvector('english', content)
where content_tsv is null;

-- Auto-maintain FTS column on insert/update via trigger.
create or replace function public.chunks_tsv_update()
returns trigger
language plpgsql
as $$
begin
  new.content_tsv := to_tsvector('english', new.content);
  return new;
end;
$$;

create trigger chunks_tsv_update
  before insert or update of content
  on public.chunks
  for each row execute function public.chunks_tsv_update();

-- ============================================================
-- 2. documents table — URL ingestion support
-- ============================================================

alter table public.documents
  add column if not exists source_type text not null default 'upload'
    check (source_type in ('upload', 'url')),
  add column if not exists source_url  text;

-- ============================================================
-- 3. conversations table — per-chat document scoping
-- ============================================================

alter table public.conversations
  add column if not exists rag_document_ids uuid[];

-- ============================================================
-- 4. hybrid_search_chunks RPC
--    Uses Reciprocal Rank Fusion to merge vector + FTS results.
--    Only service_role (edge functions) may execute this.
-- ============================================================

create or replace function public.hybrid_search_chunks(
  query_embedding  extensions.vector(1024),
  p_query_text     text,
  match_threshold  float   default 0.35,
  match_count      int     default 20,
  p_user_id        uuid    default null,
  p_subject        text    default null,
  p_document_ids   uuid[]  default null
)
returns table (
  id           uuid,
  document_id  uuid,
  content      text,
  metadata     jsonb,
  filename     text,
  parent_id    uuid,
  chunk_type   text,
  similarity   float,
  fts_rank     float,
  rrf_score    float
)
language sql
stable
security definer
set search_path = public, extensions
as $$
  with doc_filter as (
    -- Documents the user is allowed to search.
    select d.id
    from public.documents d
    where (
      -- User's own docs, or curriculum docs
      (p_user_id is not null and d.user_id = p_user_id)
      or d.is_curriculum = true
    )
    and (
      -- Subject filter: curriculum with matching subject, or user docs (any subject), or unfiltered
      p_subject is null
      or d.subject = p_subject
      or (d.is_curriculum = false and d.subject is null)
    )
    and (
      -- Optional explicit doc-scope filter
      p_document_ids is null
      or d.id = any(p_document_ids)
    )
  ),

  vector_ranked as (
    select
      c.id,
      c.document_id,
      c.content,
      c.metadata,
      d.filename,
      c.parent_id,
      c.chunk_type,
      1 - (c.embedding <=> query_embedding) as sim,
      row_number() over (order by c.embedding <=> query_embedding) as vrank
    from public.chunks c
    join public.documents d on d.id = c.document_id
    join doc_filter f on f.id = c.document_id
    where
      -- Only embed-searchable chunks (child or legacy flat)
      c.chunk_type in ('child', 'flat')
      and c.embedding is not null
      and 1 - (c.embedding <=> query_embedding) > match_threshold
    order by c.embedding <=> query_embedding
    limit match_count
  ),

  fts_ranked as (
    select
      c.id,
      ts_rank_cd(c.content_tsv, query) as rank,
      row_number() over (order by ts_rank_cd(c.content_tsv, query) desc) as frank
    from public.chunks c
    join doc_filter f on f.id = c.document_id,
    plainto_tsquery('english', p_query_text) as query
    where
      c.chunk_type in ('child', 'flat')
      and c.content_tsv @@ query
    order by rank desc
    limit match_count
  ),

  merged as (
    select
      coalesce(v.id, ft.id)             as id,
      v.document_id,
      v.content,
      v.metadata,
      v.filename,
      v.parent_id,
      v.chunk_type,
      coalesce(v.sim, 0)                as similarity,
      coalesce(ft.rank, 0)              as fts_rank,
      coalesce(1.0 / (60 + v.vrank), 0)
        + coalesce(1.0 / (60 + ft.frank), 0) as rrf_score
    from vector_ranked v
    full outer join fts_ranked ft on ft.id = v.id
  )

  select
    m.id,
    m.document_id,
    m.content,
    m.metadata,
    m.filename,
    m.parent_id,
    m.chunk_type,
    m.similarity,
    m.fts_rank,
    m.rrf_score
  from merged m
  where m.document_id is not null
  order by m.rrf_score desc, m.similarity desc
  limit match_count;
$$;

-- Grant only to service_role (edge functions).
revoke execute on function public.hybrid_search_chunks(
  extensions.vector, text, float, int, uuid, text, uuid[]
) from public, anon, authenticated;

grant execute on function public.hybrid_search_chunks(
  extensions.vector, text, float, int, uuid, text, uuid[]
) to service_role;

-- ============================================================
-- 5. Fix search_chunks GRANT drift (migration 0006 locked the
--    4-arg signature; 0008 added a 5th p_subject param).
--    Ensure the current 5-arg signature is also locked down.
-- ============================================================

revoke execute on function public.search_chunks(
  extensions.vector, float, int, uuid, text
) from public, anon, authenticated;

grant execute on function public.search_chunks(
  extensions.vector, float, int, uuid, text
) to service_role;

-- ============================================================
-- 6. Update storage bucket to allow DOCX uploads
-- ============================================================

update storage.buckets
set allowed_mime_types = array[
  'application/pdf',
  'text/plain',
  'text/markdown',
  'text/x-markdown',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
]
where id = 'documents';
