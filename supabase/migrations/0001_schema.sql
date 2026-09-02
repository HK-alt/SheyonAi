-- SherigAi schema: conversations, messages, usage logging.
-- Apply with: supabase db push   (or paste into the SQL editor in the dashboard)

-- ============================================================
-- Tables
-- ============================================================

create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null default 'New chat',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  created_at timestamptz not null default now()
);

-- Written only by the deepseek-chat Edge Function (service role).
create table public.usage_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  model text not null,
  prompt_tokens integer not null default 0,
  completion_tokens integer not null default 0,
  created_at timestamptz not null default now()
);

create index conversations_user_updated_idx
  on public.conversations (user_id, updated_at desc);
create index messages_conversation_created_idx
  on public.messages (conversation_id, created_at);
create index usage_log_user_created_idx
  on public.usage_log (user_id, created_at desc);

-- Keep the conversation list ordered by recent activity.
create or replace function public.touch_conversation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.conversations
  set updated_at = now()
  where id = new.conversation_id;
  return new;
end;
$$;

create trigger messages_touch_conversation
  after insert on public.messages
  for each row execute function public.touch_conversation();

-- ============================================================
-- Row Level Security
-- ============================================================

alter table public.conversations enable row level security;
alter table public.messages enable row level security;
alter table public.usage_log enable row level security;

create policy "Users can read own conversations"
  on public.conversations for select
  to authenticated
  using (user_id = (select auth.uid()));

create policy "Users can create own conversations"
  on public.conversations for insert
  to authenticated
  with check (user_id = (select auth.uid()));

create policy "Users can update own conversations"
  on public.conversations for update
  to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "Users can delete own conversations"
  on public.conversations for delete
  to authenticated
  using (user_id = (select auth.uid()));

create policy "Users can read own messages"
  on public.messages for select
  to authenticated
  using (user_id = (select auth.uid()));

-- Clients may only insert *user* messages, and only into conversations they
-- own. Assistant messages are inserted by the Edge Function (service role,
-- bypasses RLS), so the model role cannot be spoofed from a device.
create policy "Users can create user messages in own conversations"
  on public.messages for insert
  to authenticated
  with check (
    user_id = (select auth.uid())
    and role = 'user'
    and exists (
      select 1 from public.conversations c
      where c.id = conversation_id and c.user_id = (select auth.uid())
    )
  );

create policy "Users can delete own messages"
  on public.messages for delete
  to authenticated
  using (user_id = (select auth.uid()));

-- usage_log: users may read their own usage; only the service role writes.
create policy "Users can read own usage"
  on public.usage_log for select
  to authenticated
  using (user_id = (select auth.uid()));

-- ============================================================
-- Realtime
-- ============================================================

alter publication supabase_realtime add table public.messages;
