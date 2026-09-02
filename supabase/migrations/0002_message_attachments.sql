-- Message attachments: JSON metadata on messages + private storage bucket.

alter table public.messages
  add column if not exists attachments jsonb not null default '[]'::jsonb;

-- attachments element: { "path": "uid/timestamp.jpg", "mimeType": "image/jpeg", "name": "photo.jpg", "size": 12345 }

insert into storage.buckets (id, name, public)
values ('attachments', 'attachments', false)
on conflict (id) do nothing;

create policy "Users can upload own attachments"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'attachments'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
  );

create policy "Users can read own attachments"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'attachments'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
  );

create policy "Users can delete own attachments"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'attachments'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
  );
