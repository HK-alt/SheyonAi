import { Platform } from 'react-native';

/** Opens preview HTML in a new browser tab (web only). */
export function openPreviewInBrowser(htmlDocument: string): boolean {
  if (Platform.OS !== 'web' || typeof window === 'undefined') {
    return false;
  }

  const blob = new Blob([htmlDocument], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const tab = window.open(url, '_blank', 'noopener,noreferrer');
  if (tab) {
    tab.addEventListener('load', () => URL.revokeObjectURL(url), { once: true });
    return true;
  }
  URL.revokeObjectURL(url);
  return false;
}
