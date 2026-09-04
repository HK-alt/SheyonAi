-- Admin list-users RPC + execute grants (applied via MCP as admin_list_users_rpc / revoke_anon_admin_rpcs)

create or replace function public.admin_list_users()
returns table (
  user_id uuid,
  email text,
  full_name text,
  role public.app_role,
  created_at timestamptz,
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
      u.id as user_id,
      u.email::text,
      coalesce(u.raw_user_meta_data->>'full_name', u.raw_user_meta_data->>'name')::text as full_name,
      ur.role,
      ur.created_at,
      u.last_sign_in_at
    from auth.users u
    join public.user_roles ur on ur.user_id = u.id
    order by ur.created_at desc;
end;
$$;

revoke execute on function public.admin_list_users() from public, anon;
revoke execute on function public.admin_message_counts(integer) from public, anon;
revoke execute on function public.admin_role_counts() from public, anon;
revoke execute on function public.update_user_role(uuid, public.app_role) from public, anon;
revoke execute on function public.is_admin() from public, anon;
revoke execute on function public.handle_new_user_role() from public, anon, authenticated;

grant execute on function public.admin_list_users() to authenticated;
grant execute on function public.admin_message_counts(integer) to authenticated;
grant execute on function public.admin_role_counts() to authenticated;
grant execute on function public.update_user_role(uuid, public.app_role) to authenticated;
grant execute on function public.is_admin() to authenticated;
