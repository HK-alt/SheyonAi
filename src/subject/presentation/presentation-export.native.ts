import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';

import type { ParsedPresentation } from './presentation-parser';
import { buildPptxBase64 } from './presentation-pptx';

function safeFilename(title: string): string {
  return title
    .replace(/[^a-zA-Z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .slice(0, 60)
    .replace(/-+$/, '') || 'presentation';
}

/**
 * Native iOS/Android: write .pptx to cache, then open the share sheet.
 */
export async function exportPresentation(deck: ParsedPresentation): Promise<void> {
  const base64 = await buildPptxBase64(deck);
  const filename = `${safeFilename(deck.title)}.pptx`;
  const mimeType =
    'application/vnd.openxmlformats-officedocument.presentationml.presentation';

  const cacheDir = FileSystem.cacheDirectory ?? '';
  const fileUri = `${cacheDir}${filename}`;

  await FileSystem.writeAsStringAsync(fileUri, base64, {
    encoding: FileSystem.EncodingType.Base64,
  });

  const canShare = await Sharing.isAvailableAsync();
  if (!canShare) {
    throw new Error('Sharing is not available on this device.');
  }

  await Sharing.shareAsync(fileUri, {
    mimeType,
    dialogTitle: `Share ${filename}`,
    UTI: 'org.openxmlformats.presentationml.presentation',
  });
}
