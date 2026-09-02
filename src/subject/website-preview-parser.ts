export type ParsedWebsitePreview = {
  introText: string;
  htmlDocument: string;
  title?: string;
};

type FenceMatch = {
  body: string;
  start: number;
  end: number;
  lang: string;
};

const FENCE_RE = /```([^\n`]*)\n([\s\S]*?)```/gi;

function extractFences(content: string): FenceMatch[] {
  const fences: FenceMatch[] = [];
  let match: RegExpExecArray | null;
  FENCE_RE.lastIndex = 0;
  while ((match = FENCE_RE.exec(content)) !== null) {
    fences.push({
      lang: (match[1] ?? '').trim().toLowerCase(),
      body: match[2] ?? '',
      start: match.index,
      end: match.index + match[0].length,
    });
  }
  return fences;
}

function isHtmlDocument(html: string): boolean {
  const trimmed = html.trim();
  return /<!DOCTYPE\s+html/i.test(trimmed) || /<html[\s>]/i.test(trimmed);
}

function isSvgMarkup(body: string): boolean {
  return /^\s*<svg[\s>]/i.test(body.trim());
}

function isPreviewHtmlFence(fence: FenceMatch): boolean {
  const lang = fence.lang.split(/\s+/)[0] ?? '';
  if (lang === 'html' || lang === 'htm' || lang === 'svg' || lang === 'xml') return true;
  if (isHtmlDocument(fence.body) || isSvgMarkup(fence.body)) return true;
  return false;
}

function wrapSvgInDocument(svg: string): string {
  const trimmed = svg.trim();
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Diagram</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; }
    html, body { margin: 0; min-height: 100%; background: #f8fafc; color: #0f172a; font-family: system-ui, sans-serif; }
    body { display: flex; align-items: center; justify-content: center; padding: 16px; }
    svg { max-width: 100%; height: auto; display: block; }
    .caption { margin-top: 12px; font-size: 12px; color: #64748b; text-align: center; }
  </style>
</head>
<body>
  <div>
    ${trimmed}
    <p class="caption">Generated diagram — teaching model.</p>
  </div>
</body>
</html>`;
}

function isJsxLang(lang: string): boolean {
  return lang === 'jsx' || lang === 'tsx';
}

function extractTitle(html: string): string | undefined {
  const match = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  const title = match?.[1]?.replace(/\s+/g, ' ').trim();
  return title || undefined;
}

function introBeforeFence(content: string, fenceStart: number): string {
  return content.slice(0, fenceStart).trim();
}

function wrapJsxInDocument(jsx: string): string {
  const trimmed = jsx.trim();
  const hasMount = /ReactDOM\.(createRoot|render)/.test(trimmed);
  const scriptBody = hasMount
    ? trimmed
    : `${trimmed}\n\nconst root = ReactDOM.createRoot(document.getElementById('root'));\nroot.render(<App />);`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>React preview</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; }
    body { margin: 0; font-family: system-ui, sans-serif; }
  </style>
  <script crossorigin src="https://unpkg.com/react@18/umd/react.production.min.js"></script>
  <script crossorigin src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js"></script>
  <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
</head>
<body>
  <div id="root"></div>
  <script type="text/babel">
const { useState, useEffect, useCallback, useMemo, useRef } = React;
${scriptBody}
  </script>
</body>
</html>`;
}

function mergeIntoDocument(html: string, css: string, js: string): string {
  const trimmedHtml = html.trim();
  if (isHtmlDocument(trimmedHtml)) {
    let doc = trimmedHtml;
    if (css.trim() && !/<style[\s>]/i.test(doc)) {
      doc = doc.replace(/<\/head>/i, `<style>\n${css.trim()}\n</style>\n</head>`);
    }
    if (js.trim() && !/<script[\s>]/i.test(doc)) {
      doc = doc.replace(/<\/body>/i, `<script>\n${js.trim()}\n</script>\n</body>`);
    }
    return doc;
  }

  if (isSvgMarkup(trimmedHtml) && !css.trim() && !js.trim()) {
    return wrapSvgInDocument(trimmedHtml);
  }

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Preview</title>
  ${css.trim() ? `<style>\n${css.trim()}\n</style>` : ''}
</head>
<body>
${trimmedHtml}
${js.trim() ? `<script>\n${js.trim()}\n</script>` : ''}
</body>
</html>`;
}

function findPrimaryPreviewFence(fences: FenceMatch[]): FenceMatch | undefined {
  return (
    fences.find((f) => isJsxLang(f.lang) && f.body.trim()) ??
    fences.find((f) => isPreviewHtmlFence(f) && isHtmlDocument(f.body)) ??
    fences.find((f) => isPreviewHtmlFence(f) && isSvgMarkup(f.body)) ??
    fences.find((f) => isPreviewHtmlFence(f))
  );
}

function parseFromFences(content: string, fences: FenceMatch[]): ParsedWebsitePreview | null {
  const jsxFence = fences.find((f) => isJsxLang(f.lang) && f.body.trim());
  if (jsxFence) {
    const doc = wrapJsxInDocument(jsxFence.body);
    return {
      introText: introBeforeFence(content, jsxFence.start),
      htmlDocument: doc,
      title: 'React preview',
    };
  }

  const htmlFence = fences.find((f) => isPreviewHtmlFence(f) && isHtmlDocument(f.body));
  if (htmlFence) {
    const doc = htmlFence.body.trim();
    return {
      introText: introBeforeFence(content, htmlFence.start),
      htmlDocument: doc,
      title: extractTitle(doc),
    };
  }

  const svgFence = fences.find((f) => {
    const lang = f.lang.split(/\s+/)[0] ?? '';
    return (lang === 'svg' || lang === 'xml' || isSvgMarkup(f.body)) && isSvgMarkup(f.body);
  });
  if (svgFence) {
    const doc = wrapSvgInDocument(svgFence.body);
    return {
      introText: introBeforeFence(content, svgFence.start),
      htmlDocument: doc,
      title: 'Diagram',
    };
  }

  const htmlFragment = fences.find((f) => isPreviewHtmlFence(f));
  const cssFence = fences.find((f) => f.lang === 'css');
  const jsFence = fences.find(
    (f) => f.lang === 'javascript' || f.lang === 'js' || f.lang === 'typescript' || f.lang === 'ts',
  );

  if (htmlFragment) {
    const doc = mergeIntoDocument(
      htmlFragment.body,
      cssFence?.body ?? '',
      jsFence?.body ?? '',
    );
    const primaryStart = Math.min(
      htmlFragment.start,
      cssFence?.start ?? htmlFragment.start,
      jsFence?.start ?? htmlFragment.start,
    );
    return {
      introText: introBeforeFence(content, primaryStart),
      htmlDocument: doc,
      title: extractTitle(doc),
    };
  }

  return null;
}

/** Extract a self-contained HTML document from assistant markdown. */
export function tryParseWebsitePreview(content: string): ParsedWebsitePreview | null {
  if (!content.trim()) return null;
  const fences = extractFences(content);
  if (fences.length === 0) return null;
  return parseFromFences(content, fences);
}

/** Replace the primary preview fence body while preserving intro text and other fences. */
export function replaceHtmlInPreviewContent(content: string, newHtml: string): string | null {
  if (!tryParseWebsitePreview(content)) return null;

  const fences = extractFences(content);
  const target = findPrimaryPreviewFence(fences);
  if (!target) return null;

  const trimmed = newHtml.trim();
  const lang =
    isJsxLang(target.lang) && !isHtmlDocument(trimmed) ? target.lang : 'html';
  const newFence = `\`\`\`${lang}\n${trimmed}\n\`\`\``;
  return content.slice(0, target.start) + newFence + content.slice(target.end);
}

function isReactPreviewDocument(html: string): boolean {
  return /react\.production\.min\.js/i.test(html) || /type="text\/babel"/i.test(html);
}

function extractJsxFromReactDocument(html: string): string | null {
  const match = html.match(/<script type="text\/babel">\s*([\s\S]*?)\s*<\/script>/i);
  const body = match?.[1]?.trim();
  if (!body) return null;
  return body.replace(
    /^const \{ useState, useEffect, useCallback, useMemo, useRef \} = React;\n?/,
    '',
  );
}

/** Composer draft asking the tutor to refine user-edited preview HTML or JSX. */
export function buildWebsiteRefinePrompt(htmlDocument: string): string {
  const html = htmlDocument.trim();
  if (isReactPreviewDocument(html)) {
    const jsx = extractJsxFromReactDocument(html) ?? html;
    return `I've edited the live React preview below. Refine and improve this component (layout, styling, accessibility, and responsiveness) while keeping the intent of my edits. Reply in Build mode with ## Requirements, ## Design system, ## Structure, ## Steps, then one complete \`\`\`jsx block.

\`\`\`jsx
${jsx}
\`\`\``;
  }

  return `I've edited the live preview HTML below. Refine and improve this page (layout, styling, accessibility, and responsiveness) while keeping the intent of my edits. Reply in Build mode with ## Requirements, ## Design system, ## Structure, ## Steps, then one complete self-contained \`\`\`html block.

\`\`\`html
${html}
\`\`\``;
}

/** True when a website preview reply is still being streamed. */
export function isWebsitePreviewPending(content: string, isStreaming: boolean): boolean {
  if (!isStreaming) return false;
  if (tryParseWebsitePreview(content)) return false;

  const openPreviewFence =
    /```(?:html|htm|svg|xml|jsx|tsx)?[^\n]*\n\s*(?:<!DOCTYPE|<html|<svg)[\s\S]*$/i.test(content);
  if (
    openPreviewFence &&
    !/```(?:html|htm|svg|xml|jsx|tsx)?[^\n]*\n[\s\S]*```/i.test(content)
  ) {
    return true;
  }

  if (/## Steps/i.test(content) && content.includes('```') && !tryParseWebsitePreview(content)) {
    return true;
  }

  return false;
}
