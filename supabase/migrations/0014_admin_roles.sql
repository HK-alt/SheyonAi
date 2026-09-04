-- Admin role system for SheyonAi.
-- Adds a user_roles table with admin / teacher / student roles.
-- A trigger auto-assigns 'student' to every new auth user.
-- Apply with: supabase db push  (or paste into the SQL editor)

-- ============================================================
-- Enum
-- ============================================================

create type public.app_role as enum ('admin', 'teacher', 'student');

-- ============================================================
-- Table
-- ============================================================

create table public.user_roles (
  user_id  uuid        primary key references auth.users (id) on delete cascade,
  role     public.app_role  not null default 'student',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index user_roles_role_idx on public.user_roles (role);

-- ============================================================
-- Helper
-- ============================================================

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.user_roles
    where user_id = auth.uid() and role = 'admin'
  );
$$;

-- ============================================================
-- Row Level Security
-- ============================================================

alter table public.user_roles enable row level security;

create policy "Users can read own role"
  on public.user_roles for select
  to authenticated
  using (user_id = (select auth.uid()));

create policy "Admins can read all roles"
  on public.user_roles for select
  to authenticated
  using (public.is_admin());

create policy "Service role can manage roles"
  on public.user_roles for all
  to service_role
  using (true)
  with check (true);

-- Admin SELECT/DELETE so dashboard KPIs and content management work under RLS
create policy "Admins can read all conversations"
  on public.conversations for select to authenticated
  using (public.is_admin());

create policy "Admins can read all messages"
  on public.messages for select to authenticated
  using (public.is_admin());

create policy "Admins can read all usage"
  on public.usage_log for select to authenticated
  using (public.is_admin());

create policy "Admins can read all documents"
  on public.documents for select to authenticated
  using (public.is_admin());

create policy "Admins can delete documents"
  on public.documents for delete to authenticated
  using (public.is_admin());

create policy "Admins can read all chunks"
  on public.chunks for select to authenticated
  using (public.is_admin());

create policy "Admins can delete chunks"
  on public.chunks for delete to authenticated
  using (public.is_admin());

create policy "Admins can read all rag_messages"
  on public.rag_messages for select to authenticated
  using (public.is_admin());

-- ============================================================
-- Admin helper RPCs
-- ============================================================

create or replace function public.update_user_role(
  p_user_id uuid,
  p_role    public.app_role
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Forbidden: only admins can change roles';
  end if;

  insert into public.user_roles (user_id, role, updated_at)
    values (p_user_id, p_role, now())
  on conflict (user_id) do update
    set role = excluded.role, updated_at = now();
end;
$$;

create or replace function public.admin_message_counts(days_back integer default 30)
returns table (day date, total bigint)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Forbidden: admin only';
  end if;
  return query
    select date_trunc('day', m.created_at)::date as day, count(*)::bigint as total
    from public.messages m
    where m.created_at >= now() - (days_back || ' days')::interval
    group by 1
    order by 1;
end;
$$;

create or replace function public.admin_role_counts()
returns table (role public.app_role, total bigint)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Forbidden: admin only';
  end if;
  return query
    select ur.role, count(*)::bigint from public.user_roles ur group by ur.role;
end;
$$;

-- ============================================================
-- Trigger: auto-assign 'student' on new user
-- ============================================================

create or replace function public.handle_new_user_role()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.user_roles (user_id, role)
    values (new.id, 'student')
  on conflict (user_id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created_assign_role
  after insert on auth.users
  for each row execute function public.handle_new_user_role();

-- ============================================================
-- Back-fill existing users with 'student' role
-- ============================================================

insert into public.user_roles (user_id, role)
  select id, 'student' from auth.users
on conflict (user_id) do nothing;
