/**
 * Shared professional HTML document shell used by:
 *   - src/subject/biology-lab/diagram-html.ts  (catalog catalog figures)
 *   - src/subject/website-preview-parser.ts    (bare-SVG fallback wrapper)
 */

function esc(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** CSS shared across catalog figures and the bare-SVG fallback wrapper. */
export const DIAGRAM_VIEWER_CSS = `*, *::before, *::after { box-sizing: border-box; }
    html, body { margin: 0; min-height: 100%; background: #f1f5f9; color: #0f172a;
      font-family: system-ui, -apple-system, Segoe UI, Roboto, sans-serif; }
    body { padding: 20px 20px 32px; }
    .page { max-width: 960px; margin: 0 auto; }
    header { margin-bottom: 16px; }
    h1 { margin: 0 0 6px; font-size: 24px; font-weight: 650; letter-spacing: -0.02em; }
    .goal { margin: 0; color: #64748b; font-size: 14px; line-height: 1.45; }
    .note { margin: 8px 0 0; font-size: 12px; color: #b45309; }
    .card { background: #fff; border: 1px solid #e2e8f0; border-radius: 16px;
      box-shadow: 0 1px 3px rgba(15,23,42,.08); padding: 16px 16px 8px; overflow: auto; }
    .fig { display: block; width: 100%; height: auto; max-width: 100%; }
    .lbl { font-size: 12px; fill: #0f172a; font-family: system-ui, sans-serif; }
    .lbl-sm { font-size: 11px; fill: #475569; font-family: system-ui, sans-serif; }
    .panel-title { font-size: 13px; font-weight: 700; fill: #0f172a;
      font-family: system-ui, sans-serif; letter-spacing: 0.02em; }
    .stage-num { font-size: 14px; font-weight: 700; fill: #0f766e; font-family: system-ui, sans-serif; }
    .layout { display: grid; gap: 16px; }
    @media (min-width: 800px) {
      .layout.has-callouts { grid-template-columns: 1fr 240px; align-items: start; }
    }
    .callouts { background: #fff; border: 1px solid #e2e8f0; border-radius: 14px; padding: 14px 16px; }
    .callouts h2 { margin: 0 0 8px; font-size: 13px; text-transform: uppercase; letter-spacing: 0.04em; color: #0f766e; }
    .callouts ul { margin: 0; padding-left: 18px; }
    .callouts li { margin: 0 0 8px; font-size: 12px; line-height: 1.4; color: #334155; }
    .callouts strong { color: #0f172a; }
    footer { margin-top: 14px; font-size: 12px; color: #64748b; line-height: 1.4; }`;

type ShellOptions = {
  /** Plain text — will be HTML-escaped. */
  title: string;
  /** Plain text — will be HTML-escaped. */
  goal?: string;
  /** Plain text — will be HTML-escaped. */
  note?: string;
  /** Pre-built HTML for the figure inside .card. */
  bodyHtml: string;
  /** Plain text — will be HTML-escaped. */
  caption: string;
  /** Pre-built HTML for the callouts sidebar (already escaped). */
  calloutsHtml?: string;
};

/**
 * Build a complete, self-contained HTML document using the SheyonAi
 * publication-quality diagram page layout.
 *
 * title / goal / note / caption are plain text and will be HTML-escaped.
 * bodyHtml and calloutsHtml must already be sanitised HTML.
 */
export function buildDiagramDocumentShell({
  title,
  goal = '',
  note = '',
  bodyHtml,
  caption,
  calloutsHtml = '',
}: ShellOptions): string {
  const hasCallouts = calloutsHtml.trim().length > 0;
  const headerParts = [
    title ? `<h1>${esc(title)}</h1>` : '',
    goal ? `<p class="goal">${esc(goal)}</p>` : '',
    note ? `<p class="note">${esc(note)}</p>` : '',
  ].filter(Boolean);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${esc(title || 'Diagram')}</title>
  <style>
    ${DIAGRAM_VIEWER_CSS}
  </style>
</head>
<body>
  <div class="page">
    ${headerParts.length ? `<header>\n      ${headerParts.join('\n      ')}\n    </header>` : ''}
    <div class="layout${hasCallouts ? ' has-callouts' : ''}">
      <div class="card">${bodyHtml}</div>
      ${calloutsHtml}
    </div>
    <footer>${esc(caption)}</footer>
  </div>
</body>
</html>`;
}
