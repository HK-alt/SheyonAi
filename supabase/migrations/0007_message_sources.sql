-- Add RAG citation sources to assistant messages in main chat history.
alter table public.messages add column if not exists sources jsonb;
