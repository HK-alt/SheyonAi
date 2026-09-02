-- Shared curriculum support for subject-scoped RAG (Dzongkha tutor library).

alter table public.documents
  add column if not exists is_curriculum boolean not null default false,
  add column if not exists subject text;

-- System-owned curriculum rows have no user_id.
alter table public.documents alter column user_id drop not null;

alter table public.documents
  add constraint documents_curriculum_user_check
  check (
    (is_curriculum = true and user_id is null)
    or (is_curriculum = false and user_id is not null)
  );

create index if not exists documents_curriculum_subject_idx
  on public.documents (is_curriculum, subject)
  where is_curriculum = true;

-- Allow authenticated users to read shared curriculum documents.
create policy "Users can read curriculum documents"
  on public.documents for select
  to authenticated
  using (is_curriculum = true);

-- Allow authenticated users to read chunks from curriculum documents.
create policy "Users can read curriculum chunks"
  on public.chunks for select
  to authenticated
  using (
    exists (
      select 1 from public.documents d
      where d.id = document_id
        and d.is_curriculum = true
    )
  );

-- Replace search_chunks to include curriculum and optional subject filter.
create or replace function public.search_chunks(
  query_embedding extensions.vector(1024),
  match_threshold float    default 0.4,
  match_count     int      default 6,
  p_user_id       uuid     default null,
  p_subject       text     default null
)
returns table (
  id          uuid,
  document_id uuid,
  content     text,
  metadata    jsonb,
  filename    text,
  similarity  float
)
language sql
stable
security definer
set search_path = public, extensions
as $$
  select
    c.id,
    c.document_id,
    c.content,
    c.metadata,
    d.filename,
    1 - (c.embedding <=> query_embedding) as similarity
  from public.chunks c
  join public.documents d on d.id = c.document_id
  where
    (
      (p_user_id is not null and d.user_id = p_user_id)
      or d.is_curriculum = true
    )
    and (
      p_subject is null
      or d.subject = p_subject
      or (d.is_curriculum = false and d.subject is null)
    )
    and 1 - (c.embedding <=> query_embedding) > match_threshold
  order by c.embedding <=> query_embedding
  limit match_count;
$$;
