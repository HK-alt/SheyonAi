-- Server-side secret storage for Edge Functions (service role only).
-- Insert keys via SQL editor or MCP — never commit real values to git.

create schema if not exists private;

create table if not exists private.edge_secrets (
  name text primary key,
  value text not null,
  updated_at timestamptz not null default now()
);

revoke all on schema private from public, anon, authenticated;
revoke all on private.edge_secrets from public, anon, authenticated;

grant usage on schema private to service_role;
grant all on private.edge_secrets to service_role;
