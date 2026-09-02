-- Per-user sidebar organization (pins + folders), synced across devices.

create table public.user_sidebar_org (
  user_id uuid primary key references auth.users (id) on delete cascade,
  pinned_ids jsonb not null default '[]'::jsonb,
  folders jsonb not null default '[]'::jsonb,
  folder_by_conversation_id jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.user_sidebar_org enable row level security;

create policy "Users can read own sidebar org"
  on public.user_sidebar_org for select
  to authenticated
  using (user_id = (select auth.uid()));

create policy "Users can insert own sidebar org"
  on public.user_sidebar_org for insert
  to authenticated
  with check (user_id = (select auth.uid()));

create policy "Users can update own sidebar org"
  on public.user_sidebar_org for update
  to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "Users can delete own sidebar org"
  on public.user_sidebar_org for delete
  to authenticated
  using (user_id = (select auth.uid()));
