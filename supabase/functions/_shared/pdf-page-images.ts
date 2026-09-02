// Extract embedded page images from scanned/image-only PDFs (no canvas).
// Used by deepseek-chat when pdfjs text extract is empty or too short.

export type ExtractedPdfImage = {
  mimeType: 'image/jpeg' | 'image/png';
  bytes: Uint8Array;
  pageNumber: number;
};

export const MAX_PDF_PAGE_IMAGES = 3;
/** Below this, treat PDF text extract as unusable (likely scanned). */
export const MIN_USABLE_PDF_TEXT_CHARS = 40;

type PdfJsImage = {
  width?: number;
  height?: number;
  kind?: number;
  data?: Uint8Array | Uint8ClampedArray | ArrayBuffer;
};

function asUint8(data: Uint8Array | Uint8ClampedArray | ArrayBuffer): Uint8Array {
  if (data instanceof Uint8Array) return data;
  if (data instanceof Uint8ClampedArray) return new Uint8Array(data.buffer, data.byteOffset, data.byteLength);
  return new Uint8Array(data);
}

function isJpegBytes(bytes: Uint8Array): boolean {
  return bytes.length > 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
}

function isPngBytes(bytes: Uint8Array): boolean {
  return (
    bytes.length > 8 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47
  );
}

/** Expand grayscale / RGB pixel buffers to RGBA for jpeg-js. */
function toRgba(
  data: Uint8Array,
  width: number,
  height: number,
  kind: number | undefined,
): Uint8Array {
  const pixels = width * height;
  const rgba = new Uint8Array(pixels * 4);

  // pdfjs ImageKind: 1=GRAYSCALE_1BPP is rare here; 2=RGB, 3=RGBA typically.
  if (kind === 3 || data.length >= pixels * 4) {
    if (data.length === pixels * 4) return data;
    rgba.set(data.subarray(0, pixels * 4));
    return rgba;
  }

  if (kind === 1 || data.length === pixels) {
    for (let i = 0; i < pixels; i++) {
      const v = data[i] ?? 0;
      const o = i * 4;
      rgba[o] = v;
      rgba[o + 1] = v;
      rgba[o + 2] = v;
      rgba[o + 3] = 255;
    }
    return rgba;
  }

  // Default: RGB
  for (let i = 0; i < pixels; i++) {
    const s = i * 3;
    const o = i * 4;
    rgba[o] = data[s] ?? 0;
    rgba[o + 1] = data[s + 1] ?? 0;
    rgba[o + 2] = data[s + 2] ?? 0;
    rgba[o + 3] = 255;
  }
  return rgba;
}

async function encodeImage(img: PdfJsImage): Promise<{ mimeType: 'image/jpeg' | 'image/png'; bytes: Uint8Array } | null> {
  if (!img?.data || !img.width || !img.height) return null;
  const raw = asUint8(img.data);

  if (isJpegBytes(raw)) return { mimeType: 'image/jpeg', bytes: raw };
  if (isPngBytes(raw)) return { mimeType: 'image/png', bytes: raw };

  try {
    // @ts-ignore — jpeg-js encodes RGBA for Deno edge
    const jpegJs = await import('npm:jpeg-js@0.4.4');
    const rgba = toRgba(raw, img.width, img.height, img.kind);
    const encoded = jpegJs.encode(
      { data: rgba, width: img.width, height: img.height },
      85,
    );
    if (!encoded?.data?.length) return null;
    return { mimeType: 'image/jpeg', bytes: asUint8(encoded.data) };
  } catch (err) {
    console.error('Failed to encode PDF embedded image:', err);
    return null;
  }
}

function imageByteSize(img: PdfJsImage): number {
  if (!img?.data) return 0;
  if (img.data instanceof ArrayBuffer) return img.data.byteLength;
  return img.data.byteLength;
}

async function resolvePageImage(
  // deno-lint-ignore no-explicit-any
  page: any,
  name: string,
): Promise<PdfJsImage | null> {
  try {
    // Prefer callback form — object may not be ready yet.
    const img = await new Promise<PdfJsImage | null>((resolve) => {
      try {
        page.objs.get(name, (value: PdfJsImage) => resolve(value ?? null));
      } catch {
        resolve(null);
      }
    });
    if (img?.data) return img;
  } catch {
    // fall through
  }

  try {
    const img = page.objs.get(name) as PdfJsImage | undefined;
    if (img?.data) return img;
  } catch {
    // not ready / missing
  }

  try {
    const img = page.commonObjs?.get?.(name) as PdfJsImage | undefined;
    if (img?.data) return img;
  } catch {
    // ignore
  }

  return null;
}

/**
 * Pulls up to `maxImages` largest embedded images from the first pages of a PDF.
 * Covers typical scan-as-image homework PDFs without needing a canvas rasterizer.
 */
export async function extractPdfEmbeddedImages(
  bytes: Uint8Array,
  maxImages = MAX_PDF_PAGE_IMAGES,
): Promise<ExtractedPdfImage[]> {
  try {
    // @ts-ignore — pdfjs-dist works with Deno npm compat
    const pdfjsLib = await import('npm:pdfjs-dist@4/legacy/build/pdf.mjs');
    const loadingTask = pdfjsLib.getDocument({ data: bytes });
    const pdf = await loadingTask.promise;
    const paintOps = new Set([
      pdfjsLib.OPS.paintImageXObject,
      pdfjsLib.OPS.paintInlineImageXObject,
      pdfjsLib.OPS.paintImageXObjectRepeat,
      pdfjsLib.OPS.paintInlineImageXObjectGroup,
    ].filter((op: number | undefined) => typeof op === 'number'));

    type Candidate = { pageNumber: number; size: number; img: PdfJsImage };
    const candidates: Candidate[] = [];
    const pageLimit = Math.min(pdf.numPages, maxImages + 2);

    for (let pageNumber = 1; pageNumber <= pageLimit; pageNumber++) {
      const page = await pdf.getPage(pageNumber);
      const opList = await page.getOperatorList();
      const seen = new Set<string>();

      for (let i = 0; i < opList.fnArray.length; i++) {
        const fn = opList.fnArray[i];
        if (!paintOps.has(fn)) continue;
        const args = opList.argsArray[i];
        const name = typeof args?.[0] === 'string' ? args[0] : null;
        if (!name || seen.has(name)) continue;
        seen.add(name);

        const img = await resolvePageImage(page, name);
        if (!img?.data || !img.width || !img.height) continue;
        // Skip tiny icons / decorative assets.
        if (img.width < 80 || img.height < 80) continue;
        candidates.push({ pageNumber, size: imageByteSize(img) * img.width * img.height, img });
      }
    }

    // Prefer largest images (full-page scans) and first pages.
    candidates.sort((a, b) => b.size - a.size || a.pageNumber - b.pageNumber);

    const out: ExtractedPdfImage[] = [];
    const usedPages = new Set<number>();

    for (const candidate of candidates) {
      if (out.length >= maxImages) break;
      // One image per page keeps page order meaningful for vision.
      if (usedPages.has(candidate.pageNumber)) continue;
      const encoded = await encodeImage(candidate.img);
      if (!encoded) continue;
      usedPages.add(candidate.pageNumber);
      out.push({
        mimeType: encoded.mimeType,
        bytes: encoded.bytes,
        pageNumber: candidate.pageNumber,
      });
    }

    // Preserve reading order by page number.
    out.sort((a, b) => a.pageNumber - b.pageNumber);
    return out;
  } catch (err) {
    console.error('PDF embedded image extraction failed:', err);
    return [];
  }
}

export function isUsableExtractedText(text: string, minChars = MIN_USABLE_PDF_TEXT_CHARS): boolean {
  const trimmed = text.replace(/\u0000/g, '').trim();
  if (trimmed.length < minChars) return false;
  // Raw binary fallback from failed pdfjs often looks like mojibake / control-heavy.
  const printable = trimmed.replace(/[^\x09\x0A\x0D\x20-\x7E\u00A0-\uFFFF]/g, '').length;
  return printable / trimmed.length >= 0.7;
}
