import { extensionFromFilename } from '@/lib/document-upload';

export function isImageAttachment(mimeType: string): boolean {
  return mimeType.startsWith('image/');
}

export function isPdfAttachment(mimeType: string): boolean {
  return mimeType === 'application/pdf';
}

const MIME_BADGE_OVERRIDES: Record<string, string> = {
  'application/pdf': 'PDF',
  'text/plain': 'TXT',
  'text/markdown': 'MD',
  'text/x-markdown': 'MD',
  'application/msword': 'DOC',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'DOCX',
  'application/vnd.ms-excel': 'XLS',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'XLSX',
  'application/vnd.ms-powerpoint': 'PPT',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'PPTX',
  'application/zip': 'ZIP',
  'application/x-zip-compressed': 'ZIP',
  'application/json': 'JSON',
  'text/csv': 'CSV',
  'application/x-tex': 'TEX',
  'text/x-tex': 'TEX',
  'application/x-latex': 'TEX',
  'text/x-latex': 'TEX',
  'audio/mpeg': 'MP3',
  'audio/mp4': 'M4A',
  'video/mp4': 'MP4',
  'application/octet-stream': 'FILE',
};

export function fileBadgeLabel(name: string, mimeType: string): string {
  const ext = extensionFromFilename(name);
  if (ext) return ext.toUpperCase().slice(0, 5);

  const normalized = mimeType.split(';')[0]?.trim().toLowerCase() ?? '';
  if (MIME_BADGE_OVERRIDES[normalized]) return MIME_BADGE_OVERRIDES[normalized];

  if (normalized.startsWith('image/')) return 'IMG';
  if (normalized.startsWith('audio/')) return 'AUDIO';
  if (normalized.startsWith('video/')) return 'VIDEO';
  if (normalized.startsWith('text/')) return 'TXT';

  const subtype = normalized.split('/')[1];
  if (subtype && subtype !== 'octet-stream') {
    return subtype.replace(/[^a-z0-9]/gi, '').toUpperCase().slice(0, 5) || 'FILE';
  }

  return 'FILE';
}

export function formatFileSize(bytes?: number): string | null {
  if (bytes == null || !Number.isFinite(bytes) || bytes < 0) return null;
  if (bytes < 1024) return `${Math.round(bytes)} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(bytes < 10 * 1024 ? 1 : 0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(bytes < 10 * 1024 * 1024 ? 1 : 0)} MB`;
}

export function attachmentLabelForCount(
  count: number,
  attachments: { mimeType: string }[],
): string {
  if (count === 0) return 'file';
  const hasNonImage = attachments.some((item) => !isImageAttachment(item.mimeType));
  return hasNonImage ? 'file' : 'image';
}

export function titleForAttachments(
  attachments: { mimeType: string; name?: string }[],
): string | null {
  if (attachments.length === 0) return null;
  if (attachments.length === 1) {
    const item = attachments[0];
    if (isPdfAttachment(item.mimeType)) return 'PDF';
    if (isImageAttachment(item.mimeType)) return 'Image';
    if (item.name) {
      const badge = fileBadgeLabel(item.name, item.mimeType);
      return badge === 'FILE' ? 'Attachment' : badge;
    }
    return 'Attachment';
  }
  return `${attachments.length} attachments`;
}
