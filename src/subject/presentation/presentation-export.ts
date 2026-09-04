import type { ParsedPresentation } from './presentation-parser';
import { downloadPptxInBrowser } from './presentation-pptx';

function safeFilename(title: string): string {
  return (
    title
      .replace(/[^a-zA-Z0-9\s-]/g, '')
      .trim()
      .replace(/\s+/g, '-')
      .slice(0, 60)
      .replace(/-+$/, '') || 'presentation'
  );
}

/**
 * Web / SSR: use pptxgenjs writeFile, which triggers a browser download.
 */
export async function exportPresentation(deck: ParsedPresentation): Promise<void> {
  const filename = `${safeFilename(deck.title)}.pptx`;
  await downloadPptxInBrowser(deck, filename);
}
