import { fetch as expoFetch } from 'expo/fetch';

import { functionsUrl, isSupabaseConfigured, supabase } from '@/lib/supabase';
import { readPickedFileForUpload } from '@/lib/document-upload';
import type { DocumentRecord } from '@/types/rag';

const BUCKET = 'documents';

// ---------------------------------------------------------------------------
// Document listing
// ---------------------------------------------------------------------------

export async function listDocuments(): Promise<DocumentRecord[]> {
  if (!isSupabaseConfigured) {
    throw new Error('Supabase is not configured.');
  }
  const { data, error } = await supabase
    .from('documents')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw new Error(`Failed to load documents: ${error.message}`);
  return (data ?? []) as DocumentRecord[];
}

// ---------------------------------------------------------------------------
// Upload + process
// ---------------------------------------------------------------------------

export type PickedFile = {
  uri: string;
  name: string;
  mimeType: string;
  size?: number;
  webFile?: globalThis.File;
};

export type UploadProgressCallback = (stage: 'uploading' | 'processing') => void;

export type UploadAndProcessResult = {
  document: DocumentRecord;
  chunksCreated: number;
};

function processDocumentErrorMessage(status: number, errorText: string): string {
  try {
    const parsed = JSON.parse(errorText) as {
      error?: { code?: string; message?: string };
    };
    const code = parsed?.error?.code;
    if (code === 'empty_document') {
      return 'No readable text found in this document. Scanned or image-only PDFs cannot be indexed — try a text-based PDF, Word, or plain text file.';
    }
    if (code === 'extraction_error') {
      return 'Could not extract text from this document. Try another file format (PDF, Word, text, or LaTeX).';
    }
    if (parsed?.error?.message) return parsed.error.message;
  } catch {
    // Non-JSON body
  }
  return `Processing failed (${status})`;
}

export async function uploadAndProcess(
  file: PickedFile,
  userId: string,
  onProgress?: UploadProgressCallback,
): Promise<UploadAndProcessResult> {
  if (!isSupabaseConfigured || !functionsUrl) {
    throw new Error('Supabase is not configured.');
  }

  onProgress?.('uploading');

  let uploadBody: Blob | Uint8Array | ArrayBuffer;
  let uploadSize: number;
  try {
    const read = await readPickedFileForUpload(file);
    uploadBody = read.body;
    uploadSize = read.size;
  } catch (err) {
    throw err instanceof Error
      ? err
      : new Error('Could not read the selected file. Please try again.');
  }

  const safeFilename = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
  const storagePath = `${userId}/${Date.now()}-${safeFilename}`;

  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(storagePath, uploadBody, {
      contentType: file.mimeType,
      upsert: false,
    });
  if (uploadError) throw new Error(`Upload failed: ${uploadError.message}`);

  const { data: docRow, error: insertError } = await supabase
    .from('documents')
    .insert({
      user_id: userId,
      filename: file.name,
      storage_path: storagePath,
      file_size: file.size ?? uploadSize,
      mime_type: file.mimeType,
    })
    .select('*')
    .single();
  if (insertError || !docRow) {
    await supabase.storage.from(BUCKET).remove([storagePath]).catch(() => {});
    throw new Error(`Failed to save document metadata: ${insertError?.message}`);
  }

  onProgress?.('processing');
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) throw new Error('Not authenticated');

  const fnResponse = await expoFetch(`${functionsUrl}/process-document`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${session.access_token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      documentId: docRow.id,
      storagePath,
      mimeType: file.mimeType,
    }),
  });

  if (!fnResponse.ok) {
    const errorText = await fnResponse.text();
    const message = processDocumentErrorMessage(fnResponse.status, errorText);
    await supabase.storage.from(BUCKET).remove([storagePath]).catch(() => {});
    await supabase.from('documents').delete().eq('id', docRow.id);
    throw new Error(message);
  }

  let chunksCreated = 0;
  try {
    const result = (await fnResponse.json()) as { chunksCreated?: number };
    chunksCreated = typeof result.chunksCreated === 'number' ? result.chunksCreated : 0;
  } catch {
    chunksCreated = 0;
  }

  if (chunksCreated <= 0) {
    await supabase.storage.from(BUCKET).remove([storagePath]).catch(() => {});
    await supabase.from('documents').delete().eq('id', docRow.id);
    throw new Error(
      'No readable text found in this document. Scanned or image-only PDFs cannot be indexed — try a text-based PDF, Word, or plain text file.',
    );
  }

  return { document: docRow as DocumentRecord, chunksCreated };
}

// ---------------------------------------------------------------------------
// URL ingestion
// ---------------------------------------------------------------------------

export async function ingestUrl(url: string): Promise<DocumentRecord> {
  if (!isSupabaseConfigured || !functionsUrl) {
    throw new Error('Supabase is not configured.');
  }

  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) throw new Error('Not authenticated');

  const fnResponse = await expoFetch(`${functionsUrl}/ingest-url`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${session.access_token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ url }),
  });

  if (!fnResponse.ok) {
    const errorText = await fnResponse.text();
    let message = `URL ingestion failed (${fnResponse.status})`;
    try {
      message = JSON.parse(errorText)?.error?.message ?? message;
    } catch {
      // Non-JSON body
    }
    throw new Error(message);
  }

  const result = await fnResponse.json();
  const documentId = result.documentId as string;

  const { data: docRow, error } = await supabase
    .from('documents')
    .select('*')
    .eq('id', documentId)
    .single();
  if (error || !docRow) throw new Error('Could not load new document record.');
  return docRow as DocumentRecord;
}

// ---------------------------------------------------------------------------
// Delete
// ---------------------------------------------------------------------------

export async function deleteDocument(id: string): Promise<void> {
  const { data: doc } = await supabase
    .from('documents')
    .select('storage_path')
    .eq('id', id)
    .single();

  const { error } = await supabase.from('documents').delete().eq('id', id);
  if (error) throw new Error(`Failed to delete document: ${error.message}`);

  if (doc?.storage_path) {
    await supabase.storage.from(BUCKET).remove([doc.storage_path]).catch(() => {});
  }
}
