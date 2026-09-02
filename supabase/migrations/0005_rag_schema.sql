-- RAG schema: documents, chunks (pgvector), rag_sessions, rag_messages.
-- Apply with: supabase db push  (or paste into the SQL editor in the dashboard)

-- ============================================================
-- pgvector extension
-- ============================================================

create extension if not exists vector with schema extensions;

-- ============================================================
-- Document storage tables
-- ============================================================

create table public.documents (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  filename     text not null,
  storage_path text not null,
  file_size    bigint,
  mime_type    text,
  created_at   timestamptz not null default now()
);

create table public.chunks (
  id          uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.documents(id) on delete cascade,
  content     text not null,
  embedding   extensions.vector(1024),
  metadata    jsonb not null default '{}',
  created_at  timestamptz not null default now()
);

create index documents_user_created_idx
  on public.documents (user_id, created_at desc);

create index chunks_document_idx
  on public.chunks (document_id);

-- IVFFlat index for approximate nearest-neighbour search.
-- Recreate with more lists after ingesting > 100 k rows.
create index chunks_embedding_idx
  on public.chunks
  using ivfflat (embedding extensions.vector_cosine_ops)
  with (lists = 100);

-- ============================================================
-- Vector similarity search function
-- ============================================================

create or replace function public.search_chunks(
  query_embedding extensions.vector(1024),
  match_threshold float    default 0.4,
  match_count     int      default 6,
  p_user_id       uuid     default null
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
    (p_user_id is null or d.user_id = p_user_id)
    and 1 - (c.embedding <=> query_embedding) > match_threshold
  order by c.embedding <=> query_embedding
  limit match_count;
$$;

-- ============================================================
-- RAG chat history tables
-- ============================================================

create table public.rag_sessions (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  title      text not null default 'New RAG chat',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.rag_messages (
  id         uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.rag_sessions(id) on delete cascade,
  user_id    uuid not null references auth.users(id) on delete cascade,
  role       text not null check (role in ('user', 'assistant')),
  content    text not null,
  sources    jsonb,
  created_at timestamptz not null default now()
);

create index rag_sessions_user_updated_idx
  on public.rag_sessions (user_id, updated_at desc);

create index rag_messages_session_created_idx
  on public.rag_messages (session_id, created_at);

-- Keep rag_sessions ordered by last activity.
create or replace function public.touch_rag_session()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.rag_sessions
  set updated_at = now()
  where id = new.session_id;
  return new;
end;
$$;

create trigger rag_messages_touch_session
  after insert on public.rag_messages
  for each row execute function public.touch_rag_session();

-- ============================================================
-- Storage bucket
-- ============================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'documents',
  'documents',
  false,
  52428800,  -- 50 MB
  array['application/pdf', 'text/plain', 'text/markdown', 'text/x-markdown']
)
on conflict (id) do nothing;

-- ============================================================
-- Row Level Security
-- ============================================================

alter table public.documents   enable row level security;
alter table public.chunks      enable row level security;
alter table public.rag_sessions enable row level security;
alter table public.rag_messages enable row level security;

-- documents: users manage their own records; chunks written by service role only
create policy "Users can read own documents"
  on public.documents for select
  to authenticated
  using (user_id = (select auth.uid()));

create policy "Users can insert own documents"
  on public.documents for insert
  to authenticated
  with check (user_id = (select auth.uid()));

create policy "Users can delete own documents"
  on public.documents for delete
  to authenticated
  using (user_id = (select auth.uid()));

-- chunks: users can read chunks belonging to their documents; no direct writes
create policy "Users can read chunks of own documents"
  on public.chunks for select
  to authenticated
  using (
    exists (
      select 1 from public.documents d
      where d.id = document_id
        and d.user_id = (select auth.uid())
    )
  );

-- rag_sessions
create policy "Users can read own rag sessions"
  on public.rag_sessions for select
  to authenticated
  using (user_id = (select auth.uid()));

create policy "Users can create own rag sessions"
  on public.rag_sessions for insert
  to authenticated
  with check (user_id = (select auth.uid()));

create policy "Users can update own rag sessions"
  on public.rag_sessions for update
  to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "Users can delete own rag sessions"
  on public.rag_sessions for delete
  to authenticated
  using (user_id = (select auth.uid()));

-- rag_messages: users can read their own; user-role inserts only (assistant via service role)
create policy "Users can read own rag messages"
  on public.rag_messages for select
  to authenticated
  using (user_id = (select auth.uid()));

create policy "Users can insert user rag messages in own sessions"
  on public.rag_messages for insert
  to authenticated
  with check (
    user_id = (select auth.uid())
    and role = 'user'
    and exists (
      select 1 from public.rag_sessions s
      where s.id = session_id
        and s.user_id = (select auth.uid())
    )
  );

-- ============================================================
-- Storage RLS — per-user folder: {user_id}/filename
-- ============================================================

create policy "Users can upload own documents"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'documents'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "Users can read own documents in storage"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'documents'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "Users can delete own documents in storage"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'documents'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

-- ============================================================
-- Realtime (optional — enables live document list updates)
-- ============================================================

alter publication supabase_realtime add table public.documents;
