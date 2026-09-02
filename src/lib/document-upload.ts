import * as DocumentPicker from 'expo-document-picker';
import { Platform } from 'react-native';

import { readViaFileSystem } from '@/lib/read-via-file-system';

const SUPPORTED_EXTENSIONS = new Set(['pdf', 'txt', 'md', 'markdown', 'docx', 'tex', 'latex']);

export const SUPPORTED_DOC_MIME_TYPES = [
  'application/pdf',
  'text/plain',
  'text/markdown',
  'text/x-markdown',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/x-tex',
  'text/x-tex',
  'application/x-latex',
  'text/x-latex',
] as const;

export type PickedDocument = {
  uri: string;
  name: string;
  mimeType: string;
  size?: number;
  /** Present on web when picked via the browser file input. */
  webFile?: globalThis.File;
};

export type UploadFileBody = Blob | Uint8Array | ArrayBuffer;

export function extensionFromFilename(filename: string): string {
  const parts = filename.split('.');
  if (parts.length < 2) return '';
  return parts.pop()?.toLowerCase() ?? '';
}

export function guessMimeFromFilename(filename: string): string | null {
  const ext = extensionFromFilename(filename);
  if (ext === 'pdf') return 'application/pdf';
  if (ext === 'txt') return 'text/plain';
  if (ext === 'md' || ext === 'markdown') return 'text/markdown';
  if (ext === 'docx') return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
  if (ext === 'tex') return 'application/x-tex';
  if (ext === 'latex') return 'application/x-latex';
  return null;
}

/** Resolve a reliable MIME type from picker metadata + filename. */
export function resolveDocumentMimeType(filename: string, mimeType?: string | null): string {
  const normalized = mimeType?.split(';')[0]?.trim().toLowerCase();
  if (
    normalized &&
    normalized !== 'application/octet-stream' &&
    normalized !== 'binary/octet-stream'
  ) {
    return normalized;
  }
  return guessMimeFromFilename(filename) ?? 'application/octet-stream';
}

export function isSupportedDocument(filename: string, mimeType?: string | null): boolean {
  const ext = extensionFromFilename(filename);
  if (SUPPORTED_EXTENSIONS.has(ext)) return true;

  const resolved = resolveDocumentMimeType(filename, mimeType);
  if ((SUPPORTED_DOC_MIME_TYPES as readonly string[]).includes(resolved)) return true;

  const raw = mimeType?.split(';')[0]?.trim().toLowerCase();
  return raw ? (SUPPORTED_DOC_MIME_TYPES as readonly string[]).includes(raw) : false;
}

/**
 * Read picked file bytes for Supabase Storage upload.
 * Prefer expo-file-system on native / ArrayBuffer — avoid Response.blob()
 * (RN Blob path is slow). Web never imports expo-file-system.
 */
export async function readPickedFileForUpload(
  picked: Pick<PickedDocument, 'uri' | 'webFile'>,
): Promise<{ body: UploadFileBody; size: number }> {
  if (picked.webFile) {
    return { body: await picked.webFile.arrayBuffer(), size: picked.webFile.size };
  }

  const fromFs = await readViaFileSystem(picked.uri);
  if (fromFs) {
    return fromFs;
  }

  try {
    const response = await fetch(picked.uri);
    if (response.ok) {
      const buffer = await response.arrayBuffer();
      if (buffer.byteLength > 0) {
        return { body: buffer, size: buffer.byteLength };
      }
    }
  } catch {
    // Fall through to error.
  }

  throw new Error('Could not read the selected file. Please try again.');
}

async function openSystemDocumentPicker(): Promise<PickedDocument | null> {
  let result: DocumentPicker.DocumentPickerResult;
  try {
    result = await DocumentPicker.getDocumentAsync({
      type: '*/*',
      copyToCacheDirectory: true,
      multiple: false,
      base64: Platform.OS === 'web' ? false : undefined,
    });
  } catch {
    return null;
  }

  if (result.canceled || !result.assets?.[0]) return null;

  const asset = result.assets[0];
  const name = asset.name ?? 'document';
  const mimeType = resolveDocumentMimeType(name, asset.mimeType);

  return {
    uri: asset.uri,
    name,
    mimeType,
    size: asset.size,
    webFile: asset.file,
  };
}

/**
 * Opens the system document picker for any file type (chat message attachments).
 * Call after closing any Modal — an open Modal blocks the picker on Android.
 */
export async function pickAnyFile(): Promise<PickedDocument | null> {
  return openSystemDocumentPicker();
}

/**
 * Opens the system document picker and validates against the RAG document allowlist.
 * Call after closing any Modal — an open Modal blocks the picker on Android.
 */
export async function pickDocumentFile(): Promise<PickedDocument | null> {
  const picked = await openSystemDocumentPicker();
  if (!picked) return null;

  if (!isSupportedDocument(picked.name, picked.mimeType)) {
    throw new Error('Unsupported file type. Please upload a PDF, Word (.docx), text, or LaTeX (.tex) file.');
  }

  return picked;
}

/** Brief delay so a Modal can finish closing before the picker opens. */
export function waitForModalDismiss(ms = 350): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
