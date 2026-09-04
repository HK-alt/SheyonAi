-- Admin features expansion: disable users, app_config, new RPCs
-- Apply via: supabase db push  OR paste into Supabase SQL editor

-- ============================================================
-- 1. is_disabled on user_roles
-- ============================================================

alter table public.user_roles
  add column if not exists is_disabled boolean not null default false;

-- ============================================================
-- 2. app_config table for system settings
-- ============================================================

create table if not exists public.app_config (
  key        text primary key,
  value      jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.app_config enable row level security;

-- Admins can read/write; any authenticated user can read (for maintenance banner)
create policy "Authenticated users can read app_config"
  on public.app_config for select
  to authenticated
  using (true);

create policy "Admins can write app_config"
  on public.app_config for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- Seed default config
insert into public.app_config (key, value) values
  ('maintenance_mode',       'false'::jsonb),
  ('default_learning_level', '"general"'::jsonb),
  ('feature_flags',          '{"rag_enabled": true, "vision_enabled": true}'::jsonb)
on conflict (key) do nothing;

-- ============================================================
-- 3. Admin INSERT on documents (for curriculum upload)
-- ============================================================

create policy "Admins can insert documents"
  on public.documents for insert
  to authenticated
  with check (public.is_admin());

-- ============================================================
-- 4. Replace admin_list_users to include is_disabled
-- ============================================================

create or replace function public.admin_list_users()
returns table (
  user_id         uuid,
  email           text,
  full_name       text,
  role            public.app_role,
  is_disabled     boolean,
  created_at      timestamptz,
  last_sign_in_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Forbidden: admin only';
  end if;
  return query
    select
      u.id                                                                         as user_id,
      u.email::text,
      coalesce(u.raw_user_meta_data->>'full_name', u.raw_user_meta_data->>'name')::text as full_name,
      ur.role,
      ur.is_disabled,
      ur.created_at,
      u.last_sign_in_at
    from auth.users u
    join public.user_roles ur on ur.user_id = u.id
    order by ur.created_at desc;
end;
$$;

-- ============================================================
-- 5. admin_set_user_disabled
-- ============================================================

create or replace function public.admin_set_user_disabled(
  p_user_id  uuid,
  p_disabled boolean
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Forbidden: admin only';
  end if;
  -- Cannot disable yourself
  if p_user_id = auth.uid() then
    raise exception 'Cannot disable your own account';
  end if;
  update public.user_roles
    set is_disabled = p_disabled, updated_at = now()
  where user_id = p_user_id;
end;
$$;

revoke execute on function public.admin_set_user_disabled(uuid, boolean) from public, anon;
grant  execute on function public.admin_set_user_disabled(uuid, boolean) to authenticated;

-- ============================================================
-- 6. admin_check_user_status — called on sign-in / session restore
-- ============================================================

create or replace function public.admin_check_user_status(p_user_id uuid default null)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  uid  uuid;
  rec  record;
begin
  uid := coalesce(p_user_id, auth.uid());
  select role, is_disabled into rec
    from public.user_roles where user_id = uid;
  if not found then
    return jsonb_build_object('role', 'student', 'is_disabled', false);
  end if;
  return jsonb_build_object('role', rec.role, 'is_disabled', rec.is_disabled);
end;
$$;

revoke execute on function public.admin_check_user_status(uuid) from public, anon;
grant  execute on function public.admin_check_user_status(uuid) to authenticated;

-- ============================================================
-- 7. admin_usage_summary
-- ============================================================

create or replace function public.admin_usage_summary(days_back integer default 30)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  total_prompt      bigint;
  total_completion  bigint;
  by_model          jsonb;
  top_users         jsonb;
begin
  if not public.is_admin() then
    raise exception 'Forbidden: admin only';
  end if;

  select
    coalesce(sum(prompt_tokens), 0),
    coalesce(sum(completion_tokens), 0)
  into total_prompt, total_completion
  from public.usage_log
  where created_at >= now() - (days_back || ' days')::interval;

  select jsonb_agg(row_to_json(t))
  into by_model
  from (
    select model,
           sum(prompt_tokens)     as prompt_tokens,
           sum(completion_tokens) as completion_tokens,
           count(*)               as calls
    from public.usage_log
    where created_at >= now() - (days_back || ' days')::interval
    group by model
    order by sum(prompt_tokens + completion_tokens) desc
  ) t;

  select jsonb_agg(row_to_json(t))
  into top_users
  from (
    select u.email,
           sum(ul.prompt_tokens)     as prompt_tokens,
           sum(ul.completion_tokens) as completion_tokens,
           count(*)                  as calls
    from public.usage_log ul
    join auth.users u on u.id = ul.user_id
    where ul.created_at >= now() - (days_back || ' days')::interval
    group by u.email
    order by sum(ul.prompt_tokens + ul.completion_tokens) desc
    limit 10
  ) t;

  return jsonb_build_object(
    'total_prompt_tokens',     total_prompt,
    'total_completion_tokens', total_completion,
    'by_model',                coalesce(by_model, '[]'::jsonb),
    'top_users',               coalesce(top_users, '[]'::jsonb)
  );
end;
$$;

revoke execute on function public.admin_usage_summary(integer) from public, anon;
grant  execute on function public.admin_usage_summary(integer) to authenticated;

-- ============================================================
-- 8. admin_list_conversations
-- ============================================================

create or replace function public.admin_list_conversations(
  p_limit  integer default 50,
  p_offset integer default 0,
  p_search text    default null
)
returns table (
  id            uuid,
  title         text,
  user_email    text,
  user_id       uuid,
  message_count bigint,
  updated_at    timestamptz,
  created_at    timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Forbidden: admin only';
  end if;
  return query
    select
      c.id,
      c.title,
      u.email::text as user_email,
      c.user_id,
      count(m.id)   as message_count,
      c.updated_at,
      c.created_at
    from public.conversations c
    join auth.users u on u.id = c.user_id
    left join public.messages m on m.conversation_id = c.id
    where (p_search is null
           or c.title ilike '%' || p_search || '%'
           or u.email ilike '%' || p_search || '%')
    group by c.id, c.title, u.email, c.user_id, c.updated_at, c.created_at
    order by c.updated_at desc
    limit p_limit offset p_offset;
end;
$$;

revoke execute on function public.admin_list_conversations(integer, integer, text) from public, anon;
grant  execute on function public.admin_list_conversations(integer, integer, text) to authenticated;

-- ============================================================
-- 9. admin_conversation_messages
-- ============================================================

create or replace function public.admin_conversation_messages(p_conversation_id uuid)
returns table (
  id         uuid,
  role       text,
  content    text,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Forbidden: admin only';
  end if;
  return query
    select m.id, m.role, m.content, m.created_at
    from public.messages m
    where m.conversation_id = p_conversation_id
    order by m.created_at asc;
end;
$$;

revoke execute on function public.admin_conversation_messages(uuid) from public, anon;
grant  execute on function public.admin_conversation_messages(uuid) to authenticated;

-- ============================================================
-- 10. admin_recent_activity
-- ============================================================

create or replace function public.admin_recent_activity(p_limit integer default 20)
returns table (
  event_type text,
  label      text,
  detail     text,
  occurred_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Forbidden: admin only';
  end if;
  return query
    -- Recent messages
    select
      'message'::text                                              as event_type,
      u.email::text                                               as label,
      left(m.content, 80)                                         as detail,
      m.created_at                                                as occurred_at
    from public.messages m
    join auth.users u on u.id = m.user_id
    where m.role = 'user'
    union all
    -- Recent document uploads
    select
      'upload'::text,
      coalesce(u.email, 'system')::text,
      d.filename,
      d.created_at
    from public.documents d
    left join auth.users u on u.id = d.user_id
    union all
    -- New users
    select
      'new_user'::text,
      u.email::text,
      ur.role::text,
      ur.created_at
    from public.user_roles ur
    join auth.users u on u.id = ur.user_id
    order by occurred_at desc
    limit p_limit;
end;
$$;

revoke execute on function public.admin_recent_activity(integer) from public, anon;
grant  execute on function public.admin_recent_activity(integer) to authenticated;

-- ============================================================
-- 11. admin_get_config / admin_set_config
-- ============================================================

create or replace function public.admin_get_config()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare result jsonb;
begin
  if not public.is_admin() then
    raise exception 'Forbidden: admin only';
  end if;
  select jsonb_object_agg(key, value) into result from public.app_config;
  return coalesce(result, '{}'::jsonb);
end;
$$;

revoke execute on function public.admin_get_config() from public, anon;
grant  execute on function public.admin_get_config() to authenticated;

create or replace function public.admin_set_config(p_key text, p_value jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Forbidden: admin only';
  end if;
  insert into public.app_config (key, value, updated_at)
    values (p_key, p_value, now())
  on conflict (key) do update
    set value = excluded.value, updated_at = now();
end;
$$;

revoke execute on function public.admin_set_config(text, jsonb) from public, anon;
grant  execute on function public.admin_set_config(text, jsonb) to authenticated;
