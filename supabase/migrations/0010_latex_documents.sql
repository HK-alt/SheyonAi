-- Allow LaTeX source uploads in the documents storage bucket.

update storage.buckets
set allowed_mime_types = array[
  'application/pdf',
  'text/plain',
  'text/markdown',
  'text/x-markdown',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/x-tex',
  'text/x-tex',
  'application/x-latex',
  'text/x-latex'
]
where id = 'documents';
