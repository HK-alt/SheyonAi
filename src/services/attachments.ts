import { extensionFromFilename, readPickedFileForUpload } from '@/lib/document-upload';
import { supabase } from '@/lib/supabase';
import type { MessageAttachment } from '@/types/chat';

const BUCKET = 'attachments';
const SIGNED_URL_TTL_SEC = 3600;

const signedUrlCache = new Map<string, { url: string; expiresAt: number }>();

function extensionForMime(mimeType: string) {
  if (mimeType === 'image/png') return 'png';
  if (mimeType === 'image/webp') return 'webp';
  if (mimeType === 'image/gif') return 'gif';
  if (mimeType === 'image/jpeg' || mimeType === 'image/jpg') return 'jpg';
  if (mimeType === 'application/pdf') return 'pdf';
  if (mimeType === 'text/plain') return 'txt';
  if (mimeType === 'text/markdown' || mimeType === 'text/x-markdown') return 'md';
  if (mimeType === 'application/json') return 'json';
  if (mimeType === 'application/zip' || mimeType === 'application/x-zip-compressed') return 'zip';
  if (mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
    return 'docx';
  }
  return 'bin';
}

function extensionForAttachment(mimeType: string, name: string) {
  const fromName = extensionFromFilename(name);
  if (fromName) return fromName;
  return extensionForMime(mimeType);
}

export async function uploadAttachment(
  userId: string,
  localUri: string,
  mimeType: string,
  name: string,
): Promise<MessageAttachment> {
  const { body, size } = await readPickedFileForUpload({ uri: localUri });
  const ext = extensionForAttachment(mimeType, name);
  const path = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

  const { error } = await supabase.storage.from(BUCKET).upload(path, body, {
    contentType: mimeType,
    upsert: false,
  });
  if (error) throw new Error(`Failed to upload attachment: ${error.message}`);

  return { path, mimeType, name, size };
}

export async function getAttachmentSignedUrl(path: string): Promise<string> {
  const cached = signedUrlCache.get(path);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.url;
  }

  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(path, SIGNED_URL_TTL_SEC);
  if (error || !data?.signedUrl) {
    throw new Error(`Failed to load attachment: ${error?.message ?? 'unknown error'}`);
  }

  signedUrlCache.set(path, {
    url: data.signedUrl,
    expiresAt: Date.now() + (SIGNED_URL_TTL_SEC - 60) * 1000,
  });
  return data.signedUrl;
}
