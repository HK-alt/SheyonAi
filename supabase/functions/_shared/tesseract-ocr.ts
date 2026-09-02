// Tesseract.js OCR helper for edge functions (PDF page images + photo attachments).
// Reuses one eng worker per invocation; callers should terminate when done.

export const MAX_OCR_IMAGES = 3;
export const OCR_IMAGE_TIMEOUT_MS = 45_000;

// deno-lint-ignore no-explicit-any
type TesseractWorker = any;

let workerPromise: Promise<TesseractWorker> | null = null;

async function getWorker(): Promise<TesseractWorker> {
  if (!workerPromise) {
    workerPromise = (async () => {
      // @ts-ignore — tesseract.js npm import for Deno edge
      const { createWorker } = await import('npm:tesseract.js@5');
      const worker = await createWorker('eng');
      return worker;
    })();
  }
  return workerPromise;
}

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (err) => {
        clearTimeout(timer);
        reject(err);
      },
    );
  });
}

/**
 * OCR a single image buffer. Returns trimmed text or '' on failure.
 */
export async function ocrImageBytes(
  bytes: Uint8Array,
  mimeType = 'image/jpeg',
): Promise<string> {
  try {
    const worker = await getWorker();
    const blob = new Blob([bytes], { type: mimeType || 'image/jpeg' });
    const result = await withTimeout(
      worker.recognize(blob),
      OCR_IMAGE_TIMEOUT_MS,
      'Tesseract recognize',
    );
    const text = typeof result?.data?.text === 'string' ? result.data.text.trim() : '';
    return text;
  } catch (err) {
    console.error('Tesseract OCR failed:', err);
    return '';
  }
}

export type OcrImageInput = {
  bytes: Uint8Array;
  mimeType: string;
  /** Optional label prepended when joining multi-page results. */
  label?: string;
};

/**
 * OCR up to MAX_OCR_IMAGES images and join with blank lines.
 */
export async function ocrImageList(images: OcrImageInput[]): Promise<string> {
  const parts: string[] = [];
  for (const image of images.slice(0, MAX_OCR_IMAGES)) {
    const text = await ocrImageBytes(image.bytes, image.mimeType);
    if (!text) continue;
    parts.push(image.label ? `${image.label}\n${text}` : text);
  }
  return parts.join('\n\n').trim();
}

/** Release the shared worker (call at end of a request when OCR was used). */
export async function terminateOcrWorker(): Promise<void> {
  if (!workerPromise) return;
  try {
    const worker = await workerPromise;
    await worker.terminate();
  } catch (err) {
    console.error('Tesseract worker terminate failed:', err);
  } finally {
    workerPromise = null;
  }
}
