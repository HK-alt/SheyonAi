-- Restrict search_chunks to service role only (called from rag-chat Edge Function)
revoke execute on function public.search_chunks(extensions.vector, float, int, uuid) from public, anon, authenticated;
grant execute on function public.search_chunks(extensions.vector, float, int, uuid) to service_role;
