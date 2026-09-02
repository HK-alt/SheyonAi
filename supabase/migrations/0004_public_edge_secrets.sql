-- Edge Function secrets readable by service role only (RLS on, no client policies).

create table if not exists public.edge_secrets (
  name text primary key,
  value text not null,
  updated_at timestamptz not null default now()
);

alter table public.edge_secrets enable row level security;
