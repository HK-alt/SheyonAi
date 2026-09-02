// DeepSeek Vision helpers for multimodal chat (image + text).
// Used by deepseek-chat when user messages include image / document attachments.

import type { SupabaseClient } from 'npm:@supabase/supabase-js@2';

import { extractText } from './rag-ingest.ts';
import {
  extractPdfEmbeddedImages,
  isUsableExtractedText,
  MAX_PDF_PAGE_IMAGES,
} from './pdf-page-images.ts';
import { ocrImageBytes, ocrImageList, terminateOcrWorker } from './tesseract-ocr.ts';

export const VISION_MODEL =
  Deno.env.get('DEEPSEEK_VISION_MODEL') ?? 'deepseek-v4-flash-vision-exp';

export const ATTACHMENTS_BUCKET = 'attachments';
export const SIGNED_URL_TTL_SEC = 3600;
/** Cap images sent upstream per request (cost + payload). Prefer newest. */
export const MAX_VISION_IMAGES = 8;
/** Cap extractable docs (PDF/DOCX/text) whose text is inlined into the prompt. */
export const MAX_EXTRACTED_FILES = 4;
/** Soft cap per file so a huge PDF does not blow the context window. */
export const MAX_EXTRACTED_CHARS = 48_000;
/** DeepSeek detail: high/original keeps worksheet/diagram fidelity. */
export const VISION_IMAGE_DETAIL = 'high' as const;

export const VISION_SYSTEM_ADDENDUM =
  'The learner may attach photos (homework, diagrams, notes, lab setups, worksheets), ' +
  'including page images extracted from scanned PDFs. ' +
  'Examine every attached image carefully before answering. Read visible text, equations, and labels. ' +
  'If the image is a problem set or homework, start from that artifact: identify the question, ' +
  'then teach step by step without dumping only a final answer unless they ask for it. ' +
  'If the image is unclear or cropped, say what you can see and ask one focused clarifying question. ' +
  'Never invent details that are not visible in the image.';

export const DOCUMENT_SYSTEM_ADDENDUM =
  'The learner may attach documents (PDF, Word, text) and photos. Extracted or OCR text ' +
  '(Tesseract) appears under "Attached document" / "Attached image OCR" sections — use it as ' +
  'the primary source. Page photos may also appear as images for diagrams and handwriting. ' +
  'If OCR failed or text is empty, say so and suggest a clearer photo or a text-based file.';

export const DEFAULT_IMAGE_USER_PROMPT =
  'Please examine the attached image(s) and help me as a tutor. ' +
  'If this looks like homework or a study problem, identify the question and guide me step by step.';

export const DEFAULT_DOCUMENT_USER_PROMPT =
  'Please read the attached document(s) and help me as a tutor. ' +
  'If this looks like homework or a study problem, identify the question and guide me step by step.';

export type AttachmentMeta = {
  path: string;
  mimeType?: string;
  name?: string;
};

export type TextContentPart = { type: 'text'; text: string };
export type ImageContentPart = {
  type: 'image_url';
  image_url: { url: string; detail?: 'low' | 'high' | 'original' | 'auto' };
};
export type ContentPart = TextContentPart | ImageContentPart;

export type ChatMessage = {
  role: string;
  content: string | ContentPart[];
};

const VISION_MIME = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/gif',
  'image/webp',
]);

const EXTRACTABLE_MIME = new Set([
  'application/pdf',
  'text/plain',
  'text/markdown',
  'text/x-markdown',
  'text/csv',
  'application/json',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/x-tex',
  'text/x-tex',
  'application/x-latex',
  'text/x-latex',
]);

export function isVisionCompatibleImage(mimeType?: string, path?: string): boolean {
  const mime = (mimeType ?? '').toLowerCase().trim();
  if (mime && VISION_MIME.has(mime)) return true;
  if (mime.startsWith('image/') && !mime.includes('svg')) {
    // Allow generic image/* except svg; DeepSeek sniffs bytes.
    return !mime.includes('svg');
  }
  const lower = (path ?? '').toLowerCase();
  return /\.(jpe?g|png|gif|webp)$/.test(lower);
}

export function isExtractableDocument(mimeType?: string, path?: string, name?: string): boolean {
  const mime = (mimeType ?? '').split(';')[0]?.trim().toLowerCase() ?? '';
  if (mime && EXTRACTABLE_MIME.has(mime)) return true;
  if (mime.startsWith('text/')) return true;
  const lower = `${name ?? ''} ${path ?? ''}`.toLowerCase();
  return /\.(pdf|docx|txt|md|markdown|tex|latex|csv|json)$/.test(lower);
}

export function isPdfAttachment(mimeType?: string, path?: string, name?: string): boolean {
  const mime = (mimeType ?? '').split(';')[0]?.trim().toLowerCase() ?? '';
  if (mime === 'application/pdf') return true;
  const lower = `${name ?? ''} ${path ?? ''}`.toLowerCase();
  return lower.endsWith('.pdf');
}

export function collectVisionImagePaths(
  history: { role: string; attachments?: AttachmentMeta[] | null }[],
  maxImages = MAX_VISION_IMAGES,
): Set<string> {
  const selected = new Set<string>();
  // Newest first so recent camera/homework photos win the budget.
  for (let i = history.length - 1; i >= 0; i--) {
    const row = history[i];
    if (row.role !== 'user') continue;
    const attachments = row.attachments ?? [];
    for (let j = attachments.length - 1; j >= 0; j--) {
      const item = attachments[j];
      if (!item?.path || !isVisionCompatibleImage(item.mimeType, item.path)) continue;
      selected.add(item.path);
      if (selected.size >= maxImages) return selected;
    }
  }
  return selected;
}

export function historyHasVisionImages(
  history: { role: string; attachments?: AttachmentMeta[] | null }[],
): boolean {
  return collectVisionImagePaths(history, 1).size > 0;
}

export async function signedAttachmentUrl(
  admin: SupabaseClient,
  path: string,
): Promise<string | null> {
  const { data, error } = await admin.storage
    .from(ATTACHMENTS_BUCKET)
    .createSignedUrl(path, SIGNED_URL_TTL_SEC);
  if (error || !data?.signedUrl) {
    console.error('Failed to sign attachment URL:', path, error?.message);
    return null;
  }
  if (data.signedUrl.length > 8192) {
    console.error('Signed URL exceeds DeepSeek 8192-char limit:', path);
    return null;
  }
  return data.signedUrl;
}

function attachmentNote(attachments: AttachmentMeta[]): string {
  const count = attachments.length;
  if (count === 0) return '';
  const hasNonImage = attachments.some(
    (item) => item.mimeType && !item.mimeType.startsWith('image/'),
  );
  const label = hasNonImage ? 'file' : 'image';
  return `[User attached ${count} ${label}(s)]`;
}

function resolveExtractMime(item: AttachmentMeta): string {
  const mime = (item.mimeType ?? '').split(';')[0]?.trim().toLowerCase();
  if (mime && mime !== 'application/octet-stream') return mime;
  const lower = `${item.name ?? ''} ${item.path ?? ''}`.toLowerCase();
  if (lower.endsWith('.pdf')) return 'application/pdf';
  if (lower.endsWith('.docx')) {
    return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
  }
  if (lower.endsWith('.md') || lower.endsWith('.markdown')) return 'text/markdown';
  if (lower.endsWith('.tex') || lower.endsWith('.latex')) return 'application/x-tex';
  if (lower.endsWith('.json')) return 'application/json';
  if (lower.endsWith('.csv')) return 'text/csv';
  if (lower.endsWith('.txt')) return 'text/plain';
  return mime || 'application/octet-stream';
}

function truncateExtracted(text: string, maxChars = MAX_EXTRACTED_CHARS): string {
  const trimmed = text.trim();
  if (trimmed.length <= maxChars) return trimmed;
  return `${trimmed.slice(0, maxChars)}\n\n[Document truncated — showing first ${maxChars} characters.]`;
}

function storageDir(path: string): string {
  const idx = path.lastIndexOf('/');
  return idx >= 0 ? path.slice(0, idx) : path;
}

async function uploadPdfPageImages(
  admin: SupabaseClient,
  sourcePath: string,
  pdfBytes: Uint8Array,
  remainingVisionSlots: number,
): Promise<string[]> {
  const limit = Math.min(MAX_PDF_PAGE_IMAGES, Math.max(0, remainingVisionSlots));
  if (limit <= 0) return [];

  const images = await extractPdfEmbeddedImages(pdfBytes, limit);
  if (images.length === 0) return [];

  const dir = storageDir(sourcePath);
  const uploaded: string[] = [];

  for (const image of images) {
    const ext = image.mimeType === 'image/png' ? 'png' : 'jpg';
    const path = `${dir}/ocr-page-${image.pageNumber}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}.${ext}`;
    const { error } = await admin.storage.from(ATTACHMENTS_BUCKET).upload(path, image.bytes, {
      contentType: image.mimeType,
      upsert: false,
    });
    if (error) {
      console.error('Failed to upload PDF OCR page image:', path, error.message);
      continue;
    }
    uploaded.push(path);
  }

  return uploaded;
}

/** OCR page images from a scanned PDF without uploading (strong OCR → text only). */
async function ocrPdfPageImages(pdfBytes: Uint8Array): Promise<string> {
  const images = await extractPdfEmbeddedImages(pdfBytes, MAX_PDF_PAGE_IMAGES);
  if (images.length === 0) return '';
  return ocrImageList(
    images.map((image) => ({
      bytes: image.bytes,
      mimeType: image.mimeType,
      label: `Page ${image.pageNumber}`,
    })),
  );
}

async function ocrStoredImage(
  admin: SupabaseClient,
  item: AttachmentMeta,
): Promise<string> {
  try {
    const { data, error } = await admin.storage.from(ATTACHMENTS_BUCKET).download(item.path);
    if (error || !data) return '';
    const bytes = new Uint8Array(await data.arrayBuffer());
    const mime = (item.mimeType ?? 'image/jpeg').split(';')[0]?.trim() || 'image/jpeg';
    return ocrImageBytes(bytes, mime);
  } catch (err) {
    console.error('Image OCR download/recognize failed:', item.path, err);
    return '';
  }
}

type DocumentExtractResult = {
  note: string;
  /** Extra storage paths to send as vision image_url parts (scanned PDF pages). */
  visionPaths: string[];
};

async function extractAttachmentDocument(
  admin: SupabaseClient,
  item: AttachmentMeta,
  remainingVisionSlots: number,
): Promise<DocumentExtractResult> {
  const label = item.name ?? item.path;
  try {
    const { data, error } = await admin.storage.from(ATTACHMENTS_BUCKET).download(item.path);
    if (error || !data) {
      console.error('Attachment download failed:', item.path, error?.message);
      return {
        note: `[Attached document: ${label} — could not download file.]`,
        visionPaths: [],
      };
    }
    const bytes = new Uint8Array(await data.arrayBuffer());
    const mime = resolveExtractMime(item);
    // extractText already runs Tesseract OCR fallback for scanned PDFs (rag-ingest).
    const rawText = await extractText(bytes, mime);
    const text = truncateExtracted(rawText);

    if (isUsableExtractedText(rawText)) {
      return {
        note: `[Attached document: ${label}]\n\`\`\`\n${text}\n\`\`\``,
        visionPaths: [],
      };
    }

    if (isPdfAttachment(item.mimeType, item.path, item.name)) {
      // Second OCR attempt on page images if extractText path returned nothing usable
      // (e.g. worker failed mid-flight). Prefer text-only when OCR succeeds.
      const ocrText = await ocrPdfPageImages(bytes);
      if (isUsableExtractedText(ocrText)) {
        return {
          note: `[Attached document OCR: ${label}]\n\`\`\`\n${truncateExtracted(ocrText)}\n\`\`\``,
          visionPaths: [],
        };
      }

      const visionPaths = await uploadPdfPageImages(
        admin,
        item.path,
        bytes,
        remainingVisionSlots,
      );
      if (visionPaths.length > 0) {
        return {
          note: `[Attached PDF: ${label} — OCR empty; ${visionPaths.length} page image(s) sent for Vision reading.]`,
          visionPaths,
        };
      }
      return {
        note:
          `[Attached document: ${label}]\n` +
          '(No readable text or page images found. This may be a protected or empty PDF — try a photo of the page.)',
        visionPaths: [],
      };
    }

    return {
      note:
        `[Attached document: ${label}]\n` +
        '(No readable text found. Try a text-based file or a photo of the page.)',
      visionPaths: [],
    };
  } catch (err) {
    console.error('Attachment extraction failed:', item.path, err);
    return {
      note: `[Attached document: ${label} — text extraction failed.]`,
      visionPaths: [],
    };
  }
}

/**
 * Builds OpenAI-compatible messages.
 * - Selected images → Tesseract OCR text + image_url parts (vision model).
 * - PDFs / DOCX / text → extracted text (pdfjs or Tesseract) inlined into the prompt.
 * - Scanned PDFs with failed OCR → embedded page images → vision model.
 */
export async function buildMessageContent(
  role: string,
  text: string,
  attachments: AttachmentMeta[] | null | undefined,
  visionPaths: Set<string>,
  admin: SupabaseClient,
): Promise<string | ContentPart[]> {
  const list = attachments ?? [];
  const trimmed = text.trim();

  if (role !== 'user') {
    return trimmed;
  }

  if (list.length === 0) {
    return trimmed;
  }

  const imageParts: ImageContentPart[] = [];
  const documentNotes: string[] = [];
  const otherNotes: string[] = [];
  let extractedCount = 0;
  const usedVisionPaths = new Set<string>();

  async function pushVisionPath(path: string) {
    if (usedVisionPaths.has(path) || imageParts.length >= MAX_VISION_IMAGES) return;
    const url = await signedAttachmentUrl(admin, path);
    if (!url) {
      otherNotes.push(`[Image unavailable: ${path}]`);
      return;
    }
    usedVisionPaths.add(path);
    imageParts.push({
      type: 'image_url',
      image_url: { url, detail: VISION_IMAGE_DETAIL },
    });
  }

  try {
    for (const item of list) {
      if (!item.path) continue;

      if (visionPaths.has(item.path) && isVisionCompatibleImage(item.mimeType, item.path)) {
        const label = item.name ?? item.path;
        const ocrText = await ocrStoredImage(admin, item);
        if (isUsableExtractedText(ocrText)) {
          documentNotes.push(
            `[Attached image OCR: ${label}]\n\`\`\`\n${truncateExtracted(ocrText)}\n\`\`\``,
          );
        }
        // Keep Vision for diagrams / handwriting even when OCR succeeds.
        await pushVisionPath(item.path);
        continue;
      }

      if (isVisionCompatibleImage(item.mimeType, item.path)) {
        otherNotes.push('(older image omitted from vision context)');
        continue;
      }

      if (isExtractableDocument(item.mimeType, item.path, item.name)) {
        if (extractedCount >= MAX_EXTRACTED_FILES) {
          otherNotes.push(`[Attached file omitted (limit): ${item.name ?? item.path}]`);
          continue;
        }
        extractedCount += 1;
        const remaining = MAX_VISION_IMAGES - imageParts.length;
        const result = await extractAttachmentDocument(admin, item, remaining);
        documentNotes.push(result.note);
        for (const path of result.visionPaths) {
          await pushVisionPath(path);
        }
        continue;
      }

      otherNotes.push(`[Attached file: ${item.name ?? item.path}]`);
    }
  } finally {
    await terminateOcrWorker();
  }

  const extras = [...documentNotes, ...otherNotes];
  const hasDocs = documentNotes.length > 0;
  const hasImages = imageParts.length > 0;

  const textBody =
    trimmed ||
    (hasImages && !hasDocs
      ? DEFAULT_IMAGE_USER_PROMPT
      : hasDocs || hasImages
        ? DEFAULT_DOCUMENT_USER_PROMPT
        : attachmentNote(list));

  const fullText =
    extras.length > 0 ? `${textBody}\n\n${extras.join('\n\n')}` : textBody;

  if (!hasImages) {
    return fullText;
  }

  return [{ type: 'text', text: fullText }, ...imageParts];
}

/** True when any user attachment in history is an extractable document. */
export function historyHasExtractableDocuments(
  history: { role: string; attachments?: AttachmentMeta[] | null }[],
): boolean {
  for (const row of history) {
    if (row.role !== 'user') continue;
    for (const item of row.attachments ?? []) {
      if (
        item?.path &&
        !isVisionCompatibleImage(item.mimeType, item.path) &&
        isExtractableDocument(item.mimeType, item.path, item.name)
      ) {
        return true;
      }
    }
  }
  return false;
}
