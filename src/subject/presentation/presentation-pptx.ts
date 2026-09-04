/**
 * Builds a professional .pptx from a ParsedPresentation using pptxgenjs v4.
 * Colours come from resolveTheme(deck.theme) so preview and download match.
 */
import type { ParsedPresentation, Slide } from './presentation-parser';
import { pptxColor, resolveTheme, type SlideThemeTokens } from './presentation-theme';

const W = 10;
const H = 5.625;
const FOOTER_H = 0.34;
const FOOTER_Y = H - FOOTER_H;
const TOP_BAR_H = 0.04;
const HEADER_Y = TOP_BAR_H;
const HEADER_H = 0.6;
const BODY_Y = TOP_BAR_H + HEADER_H + 0.12;
const BODY_H = FOOTER_Y - BODY_Y - 0.06;
const PAD_X = 0.52;
const BODY_W = W - PAD_X * 2;
const ACCENT_BAR_W = 0.06;
const WHITE = 'FFFFFF';

type PptxPalette = {
  primary: string;
  accent: string;
  gold: string;
  bg: string;
  surf: string;
  ink: string;
  mid: string;
  muted: string;
};

function paletteFromTokens(t: SlideThemeTokens): PptxPalette {
  return {
    primary: pptxColor(t.colorPrimary),
    accent: pptxColor(t.colorAccent),
    gold: pptxColor(t.colorGold),
    bg: pptxColor(t.colorBackground),
    surf: pptxColor(t.colorSurface),
    ink: pptxColor(t.colorText),
    mid: pptxColor(t.colorTextSecondary),
    muted: pptxColor(t.colorTextMuted),
  };
}

function safeText(s: string | undefined): string {
  return (s ?? '').trim() || ' ';
}

type PptxTextItem = {
  text: string;
  options?: Record<string, unknown>;
};

type PptxInstance = {
  layout: string;
  author: string;
  title: string;
  subject: string;
  ShapeType: { rect: string; ellipse: string };
  ChartType: Record<string, string>;
  addSlide: () => PptxSlide;
  write: (props: { outputType: 'base64' | 'blob' | 'arraybuffer' }) => Promise<string | Blob | ArrayBuffer>;
  writeFile: (props: { fileName: string }) => Promise<string>;
};

type PptxChartData = {
  name: string;
  labels: string[];
  values: number[];
};

type PptxSlide = {
  addShape: (shapeType: string, opts: Record<string, unknown>) => PptxSlide;
  addText: (text: string | PptxTextItem[], opts: Record<string, unknown>) => PptxSlide;
  addChart: (chartType: string, data: PptxChartData[], opts: Record<string, unknown>) => PptxSlide;
  addNotes: (notes: string) => void;
};

async function createPptx(): Promise<PptxInstance> {
  const mod = await import('pptxgenjs');
  const Ctor = (mod as { default?: unknown }).default ?? mod;
  if (typeof Ctor !== 'function') {
    throw new Error('Could not load pptxgenjs.');
  }
  return new (Ctor as new () => PptxInstance)();
}

// ─── Shape helpers ────────────────────────────────────────────────────────────

function rect(
  slide: PptxSlide,
  shapes: PptxInstance['ShapeType'],
  x: number, y: number, w: number, h: number,
  fill: string,
  opts?: Record<string, unknown>,
) {
  slide.addShape(shapes.rect, {
    x, y, w, h,
    fill: { color: fill },
    line: { color: fill, width: 0 },
    ...(opts ?? {}),
  });
}

function circle(
  slide: PptxSlide,
  shapes: PptxInstance['ShapeType'],
  x: number, y: number, d: number,
  fill: string,
) {
  slide.addShape(shapes.ellipse, {
    x, y, w: d, h: d,
    fill: { color: fill },
    line: { color: fill, width: 0 },
  });
}

function addChrome(
  slide: PptxSlide,
  shapes: PptxInstance['ShapeType'],
  c: PptxPalette,
  pageNum: number,
  total: number,
) {
  rect(slide, shapes, 0, 0, W, TOP_BAR_H, c.accent);
  rect(slide, shapes, 0, FOOTER_Y, W, FOOTER_H, c.primary);
  slide.addText('Sheyon Ai', {
    x: PAD_X, y: FOOTER_Y, w: 3, h: FOOTER_H,
    fontSize: 8, bold: true, color: c.muted, valign: 'middle',
  });
  slide.addText(`${pageNum} / ${total}`, {
    x: W - 2, y: FOOTER_Y, w: 1.5, h: FOOTER_H,
    fontSize: 8, color: c.muted, align: 'right', valign: 'middle',
  });
}

function addContentHeader(
  slide: PptxSlide,
  shapes: PptxInstance['ShapeType'],
  c: PptxPalette,
  title: string,
  subtitle?: string,
): number {
  rect(slide, shapes, PAD_X, HEADER_Y + 0.08, ACCENT_BAR_W, HEADER_H - 0.14, c.accent);
  const titleX = PAD_X + ACCENT_BAR_W + 0.1;
  const titleW = BODY_W - ACCENT_BAR_W - 0.1;
  slide.addText(safeText(title), {
    x: titleX, y: HEADER_Y, w: titleW, h: subtitle ? 0.42 : HEADER_H,
    fontSize: 18, bold: true, color: c.ink, valign: subtitle ? 'bottom' : 'middle',
  });
  if (subtitle) {
    slide.addText(safeText(subtitle), {
      x: titleX, y: HEADER_Y + 0.42, w: titleW, h: 0.2,
      fontSize: 10, color: c.mid, valign: 'top',
    });
  }
  rect(slide, shapes, titleX, HEADER_Y + HEADER_H - 0.02, 0.7, 0.025, c.accent);
  return BODY_Y;
}

// ─── Existing layout builders ─────────────────────────────────────────────────

function buildTitleSlide(slide: PptxSlide, shapes: PptxInstance['ShapeType'], c: PptxPalette, s: Slide) {
  rect(slide, shapes, 0, 0, W, H, c.primary);
  rect(slide, shapes, 0, 0, W, 0.07, c.gold);
  rect(slide, shapes, PAD_X, H / 2 - 1.05, 0.08, 1.8, c.accent);
  slide.addText(safeText(s.title), {
    x: PAD_X + 0.22, y: H / 2 - 1.05,
    w: BODY_W - 0.22, h: 1.1,
    fontSize: 30, bold: true, color: WHITE, valign: 'middle', wrap: true,
  });
  rect(slide, shapes, PAD_X + 0.22, H / 2 + 0.1, 0.8, 0.03, c.gold);
  if (s.subtitle) {
    slide.addText(safeText(s.subtitle), {
      x: PAD_X + 0.22, y: H / 2 + 0.2,
      w: BODY_W - 0.22, h: 0.5,
      fontSize: 14, color: 'AAAACC', valign: 'middle',
    });
  }
}

function buildSectionSlide(slide: PptxSlide, shapes: PptxInstance['ShapeType'], c: PptxPalette, s: Slide) {
  rect(slide, shapes, 0, 0, W, H, c.primary);
  rect(slide, shapes, 0, 0, W, 1.3, c.accent);
  slide.addText('CHAPTER', {
    x: PAD_X, y: 1.9, w: BODY_W, h: 0.25,
    fontSize: 9, bold: true, color: c.accent, charSpacing: 3,
  });
  slide.addText(safeText(s.title), {
    x: PAD_X, y: 2.15, w: BODY_W, h: 1.6,
    fontSize: 28, bold: true, color: WHITE, valign: 'top', wrap: true,
  });
  if (s.subtitle) {
    slide.addText(safeText(s.subtitle), {
      x: PAD_X, y: 3.85, w: BODY_W, h: 0.4,
      fontSize: 13, color: 'CCEEEA',
    });
  }
}

function buildAgendaSlide(slide: PptxSlide, shapes: PptxInstance['ShapeType'], c: PptxPalette, s: Slide) {
  rect(slide, shapes, 0, 0, W, H, c.bg);
  const bodyY = addContentHeader(slide, shapes, c, s.title);
  const items = s.steps ?? s.bullets ?? [];
  const rowH = Math.min(0.55, (BODY_H - 0.05) / Math.max(items.length, 1));
  items.forEach((item, i) => {
    const y = bodyY + i * rowH;
    const d = 0.26;
    circle(slide, shapes, PAD_X, y + (rowH - d) / 2, d, c.accent);
    slide.addText(`${i + 1}`, {
      x: PAD_X, y: y + (rowH - d) / 2, w: d, h: d,
      fontSize: 10, bold: true, color: WHITE, align: 'center', valign: 'middle',
    });
    slide.addText(safeText(item), {
      x: PAD_X + d + 0.1, y,
      w: BODY_W - d - 0.1, h: rowH,
      fontSize: 13, color: c.ink, valign: 'middle',
    });
  });
}

function buildBulletsSlide(slide: PptxSlide, shapes: PptxInstance['ShapeType'], c: PptxPalette, s: Slide) {
  rect(slide, shapes, 0, 0, W, H, c.bg);
  const bodyY = addContentHeader(slide, shapes, c, s.title, s.subtitle);
  const bullets = (s.bullets ?? []).map((b): PptxTextItem => ({
    text: b,
    options: { bullet: { type: 'bullet', color: c.accent }, fontSize: 13, paraSpaceBefore: 5, color: c.ink },
  }));
  if (bullets.length === 0) bullets.push({ text: ' ' });
  slide.addText(bullets, {
    x: PAD_X + 0.1, y: bodyY, w: BODY_W - 0.1, h: BODY_H, valign: 'top',
  });
}

function buildTwoColumnSlide(slide: PptxSlide, shapes: PptxInstance['ShapeType'], c: PptxPalette, s: Slide) {
  rect(slide, shapes, 0, 0, W, H, c.bg);
  const bodyY = addContentHeader(slide, shapes, c, s.title, s.subtitle);
  const colW = (BODY_W - 0.18) / 2;
  ([
    [s.left, c.accent],
    [s.right, c.primary],
  ] as const).forEach(([col, accentColor], ci) => {
    if (!col) return;
    const x = PAD_X + ci * (colW + 0.18);
    rect(slide, shapes, x, bodyY, colW, BODY_H, c.surf);
    rect(slide, shapes, x, bodyY, colW, 0.04, accentColor);
    slide.addText(safeText(col.heading), {
      x: x + 0.12, y: bodyY + 0.06, w: colW - 0.18, h: 0.28,
      fontSize: 11, bold: true, color: accentColor, valign: 'middle',
    });
    const items = (col.bullets ?? []).map((b): PptxTextItem => ({
      text: b,
      options: { bullet: { type: 'bullet', color: accentColor }, fontSize: 11, paraSpaceBefore: 3, color: c.ink },
    }));
    if (items.length > 0) {
      slide.addText(items, {
        x: x + 0.12, y: bodyY + 0.36, w: colW - 0.18, h: BODY_H - 0.4, valign: 'top',
      });
    }
  });
}

function buildStepsSlide(slide: PptxSlide, shapes: PptxInstance['ShapeType'], c: PptxPalette, s: Slide) {
  rect(slide, shapes, 0, 0, W, H, c.bg);
  const bodyY = addContentHeader(slide, shapes, c, s.title, s.subtitle);
  const steps = s.steps ?? [];
  const rowH = Math.min(0.72, (BODY_H - 0.05) / Math.max(steps.length, 1));
  const d = 0.3;
  steps.forEach((step, i) => {
    const y = bodyY + i * rowH;
    if (i > 0) {
      rect(slide, shapes, PAD_X + d / 2 - 0.015, y - 0.08, 0.03, 0.1, c.accent);
    }
    circle(slide, shapes, PAD_X, y + (rowH - d) / 2, d, c.accent);
    slide.addText(`${i + 1}`, {
      x: PAD_X, y: y + (rowH - d) / 2, w: d, h: d,
      fontSize: 11, bold: true, color: WHITE, align: 'center', valign: 'middle',
    });
    rect(slide, shapes, PAD_X + d + 0.12, y + 0.04, BODY_W - d - 0.12, rowH - 0.08, c.surf);
    slide.addText(safeText(step), {
      x: PAD_X + d + 0.24, y: y + 0.04, w: BODY_W - d - 0.3, h: rowH - 0.08,
      fontSize: 12, color: c.ink, valign: 'middle',
    });
  });
}

function buildQuoteSlide(slide: PptxSlide, shapes: PptxInstance['ShapeType'], c: PptxPalette, s: Slide) {
  rect(slide, shapes, 0, 0, W, H, c.bg);
  rect(slide, shapes, PAD_X, 0.9, 0.07, 2.2, c.gold);
  slide.addText(`"${safeText(s.quote ?? s.title)}"`, {
    x: PAD_X + 0.24, y: 0.85, w: BODY_W - 0.24, h: 2.5,
    fontSize: 16, italic: true, color: c.primary, valign: 'middle', wrap: true,
  });
  if (s.attribution) {
    slide.addText(`— ${s.attribution}`, {
      x: PAD_X + 0.24, y: 3.55, w: BODY_W, h: 0.36,
      fontSize: 11, bold: true, color: c.accent,
    });
  }
}

function buildKeyFactsSlide(slide: PptxSlide, shapes: PptxInstance['ShapeType'], c: PptxPalette, s: Slide) {
  rect(slide, shapes, 0, 0, W, H, c.bg);
  const bodyY = addContentHeader(slide, shapes, c, s.title, s.subtitle);
  const facts = s.facts ?? [];
  const rowH = Math.min(0.62, (BODY_H - 0.05) / Math.max(facts.length, 1));
  facts.forEach((fact, i) => {
    const y = bodyY + i * rowH;
    const accent = i % 2 === 0 ? c.accent : c.primary;
    rect(slide, shapes, PAD_X, y + 0.04, BODY_W, rowH - 0.07, c.surf);
    rect(slide, shapes, PAD_X, y + 0.04, 0.05, rowH - 0.07, accent);
    slide.addText(safeText(fact.label), {
      x: PAD_X + 0.15, y: y + 0.04, w: 2.4, h: rowH - 0.07,
      fontSize: 11, bold: true, color: c.primary, valign: 'middle',
    });
    slide.addText(safeText(fact.value), {
      x: PAD_X + 2.7, y: y + 0.04, w: BODY_W - 2.7 - 0.1, h: rowH - 0.07,
      fontSize: 11, color: c.mid, valign: 'middle',
    });
  });
}

function buildTimelineSlide(slide: PptxSlide, shapes: PptxInstance['ShapeType'], c: PptxPalette, s: Slide) {
  rect(slide, shapes, 0, 0, W, H, c.bg);
  const bodyY = addContentHeader(slide, shapes, c, s.title, s.subtitle);
  const facts = s.facts ?? [];

  if (facts.length <= 6) {
    // Horizontal rail
    const railY = bodyY + BODY_H / 2 - 0.015;
    const colW = BODY_W / Math.max(facts.length, 1);
    rect(slide, shapes, PAD_X, railY, BODY_W, 0.03, c.accent);
    facts.forEach((fact, i) => {
      const cx = PAD_X + i * colW + colW / 2;
      const nodeD = 0.2;
      circle(slide, shapes, cx - nodeD / 2, railY - nodeD / 2, nodeD, c.accent);
      // Label above
      slide.addText(safeText(fact.label), {
        x: cx - colW / 2, y: bodyY, w: colW, h: railY - bodyY - 0.1,
        fontSize: 10, bold: true, color: c.accent, align: 'center', valign: 'bottom', wrap: true,
      });
      // Value below
      slide.addText(safeText(fact.value), {
        x: cx - colW / 2, y: railY + nodeD / 2 + 0.1, w: colW, h: bodyY + BODY_H - railY - nodeD / 2 - 0.1,
        fontSize: 9, color: c.mid, align: 'center', valign: 'top', wrap: true,
      });
    });
  } else {
    // Vertical list fallback
    const nodeD = 0.2;
    const trackX = PAD_X + nodeD / 2 - 0.015;
    const rowH = Math.min(0.72, (BODY_H - 0.05) / Math.max(facts.length, 1));
    facts.forEach((fact, i) => {
      const y = bodyY + i * rowH;
      if (i < facts.length - 1) {
        rect(slide, shapes, trackX, y + nodeD, 0.03, rowH - nodeD, c.accent);
      }
      circle(slide, shapes, PAD_X, y, nodeD, c.accent);
      slide.addText(safeText(fact.label), {
        x: PAD_X + nodeD + 0.14, y: y, w: 1.8, h: rowH,
        fontSize: 11, bold: true, color: c.accent, valign: 'middle',
      });
      slide.addText(safeText(fact.value), {
        x: PAD_X + nodeD + 2.1, y: y, w: BODY_W - nodeD - 2.1, h: rowH,
        fontSize: 11, color: c.mid, valign: 'middle',
      });
    });
  }
}

function buildCardsSlide(slide: PptxSlide, shapes: PptxInstance['ShapeType'], c: PptxPalette, s: Slide) {
  rect(slide, shapes, 0, 0, W, H, c.bg);
  const bodyY = addContentHeader(slide, shapes, c, s.title, s.subtitle);
  const cards = s.cards ?? [];
  const cols = Math.min(cards.length, 4);
  const cardW = cols > 0 ? (BODY_W - (cols - 1) * 0.14) / cols : BODY_W;
  cards.forEach((card, i) => {
    const x = PAD_X + i * (cardW + 0.14);
    const accent = i % 2 === 0 ? c.accent : c.primary;
    rect(slide, shapes, x, bodyY, cardW, BODY_H, c.surf);
    rect(slide, shapes, x, bodyY, cardW, 0.04, accent);
    slide.addText(safeText(card.heading), {
      x: x + 0.12, y: bodyY + 0.1, w: cardW - 0.18, h: 0.32,
      fontSize: 11, bold: true, color: accent, valign: 'top',
    });
    slide.addText(safeText(card.body), {
      x: x + 0.12, y: bodyY + 0.44, w: cardW - 0.18, h: BODY_H - 0.5,
      fontSize: 11, color: c.ink, valign: 'top', wrap: true,
    });
  });
}

function buildClosingSlide(slide: PptxSlide, shapes: PptxInstance['ShapeType'], c: PptxPalette, s: Slide) {
  rect(slide, shapes, 0, 0, W, H, c.primary);
  rect(slide, shapes, 0, 0, W, 0.07, c.accent);
  slide.addText(safeText(s.title), {
    x: PAD_X, y: 0.55, w: BODY_W, h: 0.7,
    fontSize: 26, bold: true, color: WHITE, valign: 'middle',
  });
  rect(slide, shapes, PAD_X, 1.35, 0.7, 0.03, c.gold);
  const bullets = s.bullets ?? [];
  const bulletY = 1.5;
  const bulletH = (FOOTER_Y - bulletY - 0.6) / Math.max(bullets.length, 1);
  bullets.forEach((b, i) => {
    const y = bulletY + i * bulletH;
    const d = 0.12;
    rect(slide, shapes, PAD_X, y + bulletH / 2 - d / 2, d, d, c.gold);
    slide.addText(safeText(b), {
      x: PAD_X + d + 0.12, y: y, w: BODY_W - d - 0.12, h: bulletH,
      fontSize: 13, color: 'E2E8F0', valign: 'middle',
    });
  });
  if (s.subtitle) {
    slide.addText(safeText(s.subtitle), {
      x: PAD_X, y: FOOTER_Y - 0.44, w: BODY_W, h: 0.36,
      fontSize: 11, bold: true, color: c.accent,
    });
  }
}

// ─── New visual layout builders ───────────────────────────────────────────────

/** Infographic: 2- or 3-column grid of oversized stat tiles. */
function buildInfographicSlide(slide: PptxSlide, shapes: PptxInstance['ShapeType'], c: PptxPalette, s: Slide) {
  rect(slide, shapes, 0, 0, W, H, c.bg);
  const bodyY = addContentHeader(slide, shapes, c, s.title, s.subtitle);
  const facts = s.facts ?? [];
  const n = facts.length;
  const cols = n <= 3 ? n : Math.min(n, 3);
  const rows = Math.ceil(n / cols);
  const tileW = (BODY_W - (cols - 1) * 0.14) / cols;
  const tileH = (BODY_H - (rows - 1) * 0.12) / rows;
  const tileColors = [c.accent, c.primary, c.gold];

  facts.forEach((fact, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const x = PAD_X + col * (tileW + 0.14);
    const y = bodyY + row * (tileH + 0.12);
    const topColor = tileColors[i % tileColors.length]!;
    rect(slide, shapes, x, y, tileW, tileH, c.surf);
    rect(slide, shapes, x, y, tileW, 0.05, topColor);
    slide.addText(safeText(fact.label), {
      x: x + 0.1, y: y + 0.1, w: tileW - 0.2, h: tileH * 0.55,
      fontSize: 28, bold: true, color: topColor, valign: 'middle', align: 'center',
    });
    slide.addText(safeText(fact.value), {
      x: x + 0.1, y: y + tileH * 0.6, w: tileW - 0.2, h: tileH * 0.35,
      fontSize: 10, color: c.mid, valign: 'top', align: 'center', wrap: true,
    });
  });
}

/** Chart: bar, pie, or line using pptxgenjs addChart(). */
function buildChartSlide(pptx: PptxInstance, slide: PptxSlide, shapes: PptxInstance['ShapeType'], c: PptxPalette, s: Slide) {
  rect(slide, shapes, 0, 0, W, H, c.bg);
  const bodyY = addContentHeader(slide, shapes, c, s.title, s.subtitle);
  const series = s.series ?? [];
  if (series.length === 0) return;

  const labels = series.map((item) => item.label);
  const values = series.map((item) => item.value);
  const chartData: PptxChartData[] = [{ name: safeText(s.title), labels, values }];

  const chartType = s.chartType ?? 'bar';
  const chartTypeMap: Record<string, string> = {
    bar: 'bar',
    pie: 'pie',
    line: 'line',
  };
  const pptxChartType = (pptx.ChartType?.[chartTypeMap[chartType] ?? 'bar']) ?? 'bar';

  const chartOpts: Record<string, unknown> = {
    x: PAD_X, y: bodyY, w: BODY_W, h: BODY_H - 0.05,
    chartColors: [c.accent, c.primary, c.gold, c.surf],
    dataLabelFontSize: 10,
    showLegend: chartType === 'pie',
    legendPos: 'r',
    showValue: chartType !== 'pie',
  };
  if (chartType === 'bar') {
    chartOpts.barDir = 'col';
    chartOpts.barGrouping = 'clustered';
  }
  try {
    slide.addChart(pptxChartType, chartData, chartOpts);
  } catch {
    // Fallback: render as key-facts table if addChart is unavailable
    buildKeyFactsSlide(slide, shapes, c, {
      ...s,
      layout: 'keyFacts',
      facts: series.map((item) => ({ label: item.label, value: String(item.value) })),
    });
  }
}

/** Diagram: sequential flow boxes with arrow connectors. */
function buildDiagramSlide(slide: PptxSlide, shapes: PptxInstance['ShapeType'], c: PptxPalette, s: Slide) {
  rect(slide, shapes, 0, 0, W, H, c.bg);
  const bodyY = addContentHeader(slide, shapes, c, s.title, s.subtitle);
  const nodes = s.nodes ?? [];
  const n = nodes.length;
  if (n === 0) return;

  const nodeW = Math.min(1.5, (BODY_W - (n - 1) * 0.4) / n);
  const nodeH = 0.8;
  const totalW = n * nodeW + (n - 1) * 0.4;
  const startX = PAD_X + (BODY_W - totalW) / 2;
  const nodeY = bodyY + (BODY_H - nodeH) / 2 - 0.1;

  nodes.forEach((node, i) => {
    const x = startX + i * (nodeW + 0.4);
    const borderColor = i % 2 === 0 ? c.accent : c.primary;
    rect(slide, shapes, x, nodeY, nodeW, nodeH, c.surf);
    rect(slide, shapes, x, nodeY, nodeW, 0.04, borderColor);

    slide.addText(safeText(node.label), {
      x: x + 0.08, y: nodeY + 0.06, w: nodeW - 0.16, h: node.detail ? 0.36 : nodeH - 0.1,
      fontSize: 11, bold: true, color: borderColor, valign: 'middle', align: 'center', wrap: true,
    });
    if (node.detail) {
      slide.addText(safeText(node.detail), {
        x: x + 0.08, y: nodeY + 0.44, w: nodeW - 0.16, h: 0.3,
        fontSize: 9, color: c.mid, align: 'center', wrap: true,
      });
    }

    // Arrow to next node
    if (i < n - 1) {
      const arrowX = x + nodeW + 0.06;
      const arrowY = nodeY + nodeH / 2 - 0.015;
      rect(slide, shapes, arrowX, arrowY, 0.22, 0.03, c.accent);
      // Arrowhead triangle approximation
      rect(slide, shapes, arrowX + 0.22, arrowY - 0.05, 0.06, 0.13, c.accent);

      // Edge label if provided
      const edge = (s.edges ?? []).find((e) => e.to === node.id || e.to === nodes[i + 1]?.id);
      if (edge?.label) {
        slide.addText(safeText(edge.label), {
          x: arrowX, y: arrowY - 0.18, w: 0.28, h: 0.16,
          fontSize: 7, color: c.mid, align: 'center',
        });
      }
    }
  });
}

/** Triangle: top vertex, bottom-left, bottom-right with optional center. */
function buildTriangleSlide(slide: PptxSlide, shapes: PptxInstance['ShapeType'], c: PptxPalette, s: Slide) {
  rect(slide, shapes, 0, 0, W, H, c.bg);
  const bodyY = addContentHeader(slide, shapes, c, s.title, s.subtitle);
  const verts = (s.vertices ?? []).slice(0, 3);
  const tileW = 3.4;
  const tileH = 1.15;
  const topX = PAD_X + (BODY_W - tileW) / 2;
  const topY = bodyY + 0.1;
  const botY = bodyY + BODY_H - tileH - 0.05;
  const leftX = PAD_X;
  const rightX = PAD_X + BODY_W - tileW;
  const tileColors = [c.accent, c.primary, c.gold];
  const positions = [
    { x: topX, y: topY },
    { x: leftX, y: botY },
    { x: rightX, y: botY },
  ];

  verts.forEach((vert, i) => {
    const pos = positions[i];
    if (!pos) return;
    const col = tileColors[i]!;
    rect(slide, shapes, pos.x, pos.y, tileW, tileH, c.surf);
    rect(slide, shapes, pos.x, pos.y, tileW, 0.04, col);
    slide.addText(safeText(vert.heading), {
      x: pos.x + 0.12, y: pos.y + 0.06, w: tileW - 0.18, h: 0.3,
      fontSize: 12, bold: true, color: col, valign: 'middle',
    });
    slide.addText(safeText(vert.body), {
      x: pos.x + 0.12, y: pos.y + 0.38, w: tileW - 0.18, h: tileH - 0.44,
      fontSize: 10, color: c.mid, valign: 'top', wrap: true,
    });
  });

  // Center label
  if (s.center) {
    const centerY = topY + tileH + (botY - topY - tileH) / 2 - 0.12;
    slide.addText(`◆  ${s.center}`, {
      x: PAD_X, y: centerY, w: BODY_W, h: 0.3,
      fontSize: 12, bold: true, color: c.primary, align: 'center',
    });
  }
}

/** Pyramid: centered rows with widths decreasing toward apex (levels[0]). */
function buildPyramidSlide(slide: PptxSlide, shapes: PptxInstance['ShapeType'], c: PptxPalette, s: Slide) {
  rect(slide, shapes, 0, 0, W, H, c.bg);
  const bodyY = addContentHeader(slide, shapes, c, s.title, s.subtitle);
  const levels = s.levels ?? [];
  const n = levels.length;
  if (n === 0) return;

  const rowH = Math.min(0.72, (BODY_H - 0.1) / n);
  const baseW = BODY_W;

  levels.forEach((level, i) => {
    // levels[0] = apex (narrowest), levels[n-1] = base (widest)
    const widthFraction = 0.35 + (i / Math.max(n - 1, 1)) * 0.65;
    const w = baseW * widthFraction;
    const x = PAD_X + (BODY_W - w) / 2;
    const y = bodyY + i * rowH;
    const col = i % 2 === 0 ? c.accent : c.primary;

    rect(slide, shapes, x, y + 0.03, w, rowH - 0.06, col, { rectRadius: 0.04 });
    slide.addText(safeText(level.heading), {
      x: x + 0.12, y: y + 0.03, w: level.body ? w * 0.38 : w - 0.24, h: rowH - 0.06,
      fontSize: 11, bold: true, color: WHITE, valign: 'middle',
    });
    if (level.body) {
      slide.addText(safeText(level.body), {
        x: x + w * 0.42, y: y + 0.03, w: w * 0.54, h: rowH - 0.06,
        fontSize: 10, color: 'FFFFFFBB', valign: 'middle', wrap: true,
      });
    }
  });
}

/** Cycle: circular pill arrangement; fallback to sequential with ↻ label. */
function buildCycleSlide(slide: PptxSlide, shapes: PptxInstance['ShapeType'], c: PptxPalette, s: Slide) {
  rect(slide, shapes, 0, 0, W, H, c.bg);
  const bodyY = addContentHeader(slide, shapes, c, s.title, s.subtitle);
  const steps = s.steps ?? [];
  const n = steps.length;
  if (n === 0) return;

  // Center circle
  const cx = W / 2;
  const cy = bodyY + BODY_H / 2;
  const centerD = 0.8;
  circle(slide, shapes, cx - centerD / 2, cy - centerD / 2, centerD, c.accent);
  if (s.center) {
    slide.addText(safeText(s.center), {
      x: cx - centerD / 2, y: cy - centerD / 2, w: centerD, h: centerD,
      fontSize: 8, bold: true, color: WHITE, align: 'center', valign: 'middle',
    });
  } else {
    slide.addText('↻', {
      x: cx - centerD / 2, y: cy - centerD / 2, w: centerD, h: centerD,
      fontSize: 16, color: WHITE, align: 'center', valign: 'middle',
    });
  }

  // Steps around the circle
  const RADIUS = Math.min(BODY_H, BODY_W) * 0.35;
  const pillW = 1.6;
  const pillH = 0.55;

  steps.forEach((step, i) => {
    const angleDeg = (i / n) * 360 - 90;
    const angleRad = (angleDeg * Math.PI) / 180;
    const sx = cx + RADIUS * Math.cos(angleRad) - pillW / 2;
    const sy = cy + RADIUS * Math.sin(angleRad) - pillH / 2;
    const col = i % 2 === 0 ? c.accent : c.primary;

    rect(slide, shapes, sx, sy, pillW, pillH, c.surf);
    rect(slide, shapes, sx, sy, pillW, 0.04, col);
    slide.addText(`${i + 1}. ${safeText(step)}`, {
      x: sx + 0.08, y: sy + 0.06, w: pillW - 0.14, h: pillH - 0.1,
      fontSize: 9, color: c.ink, valign: 'middle', wrap: true,
    });
  });
}

/** Funnel: centered rows with widths decreasing from top to bottom. */
function buildFunnelSlide(slide: PptxSlide, shapes: PptxInstance['ShapeType'], c: PptxPalette, s: Slide) {
  rect(slide, shapes, 0, 0, W, H, c.bg);
  const bodyY = addContentHeader(slide, shapes, c, s.title, s.subtitle);
  const steps = s.steps ?? [];
  const n = steps.length;
  if (n === 0) return;

  const rowH = Math.min(0.7, (BODY_H - 0.1) / n);
  const arrowH = 0.12;
  const totalRowsH = n * rowH + (n - 1) * arrowH;
  const startY = bodyY + (BODY_H - totalRowsH) / 2;

  steps.forEach((step, i) => {
    const widthFraction = 1 - (i / Math.max(n - 1, 1)) * 0.6;
    const w = BODY_W * widthFraction;
    const x = PAD_X + (BODY_W - w) / 2;
    const y = startY + i * (rowH + arrowH);
    const col = i % 2 === 0 ? c.accent : c.primary;

    rect(slide, shapes, x, y, w, rowH, col, { rectRadius: 0.04 });
    slide.addText(safeText(step), {
      x: x + 0.12, y: y, w: w - 0.24, h: rowH,
      fontSize: 12, bold: true, color: WHITE, align: 'center', valign: 'middle',
    });

    // Arrow between rows
    if (i < n - 1) {
      const arrowX = W / 2 - 0.06;
      slide.addText('▾', {
        x: arrowX, y: y + rowH, w: 0.12, h: arrowH,
        fontSize: 11, color: c.gold, align: 'center', valign: 'middle',
      });
    }
  });
}

// ─── Dispatch ──────────────────────────────────────────────────────────────────

const FULL_BLEED_LAYOUTS = new Set(['title', 'section', 'closing', 'quote']);

function buildSlide(
  pptx: PptxInstance,
  pptxSlide: PptxSlide,
  shapes: PptxInstance['ShapeType'],
  c: PptxPalette,
  slide: Slide,
  pageNum: number,
  total: number,
) {
  switch (slide.layout) {
    case 'title':
      buildTitleSlide(pptxSlide, shapes, c, slide);
      break;
    case 'section':
      buildSectionSlide(pptxSlide, shapes, c, slide);
      break;
    case 'agenda':
      buildAgendaSlide(pptxSlide, shapes, c, slide);
      break;
    case 'twoColumn':
    case 'comparison':
      buildTwoColumnSlide(pptxSlide, shapes, c, slide);
      break;
    case 'steps':
      buildStepsSlide(pptxSlide, shapes, c, slide);
      break;
    case 'quote':
      buildQuoteSlide(pptxSlide, shapes, c, slide);
      break;
    case 'keyFacts':
      buildKeyFactsSlide(pptxSlide, shapes, c, slide);
      break;
    case 'timeline':
      buildTimelineSlide(pptxSlide, shapes, c, slide);
      break;
    case 'cards':
      buildCardsSlide(pptxSlide, shapes, c, slide);
      break;
    case 'closing':
      buildClosingSlide(pptxSlide, shapes, c, slide);
      break;
    // ── New visual layouts ──────────────────────────────────────────────────
    case 'infographic':
      buildInfographicSlide(pptxSlide, shapes, c, slide);
      break;
    case 'chart':
      buildChartSlide(pptx, pptxSlide, shapes, c, slide);
      break;
    case 'diagram':
      buildDiagramSlide(pptxSlide, shapes, c, slide);
      break;
    case 'triangle':
      buildTriangleSlide(pptxSlide, shapes, c, slide);
      break;
    case 'pyramid':
      buildPyramidSlide(pptxSlide, shapes, c, slide);
      break;
    case 'cycle':
      buildCycleSlide(pptxSlide, shapes, c, slide);
      break;
    case 'funnel':
      buildFunnelSlide(pptxSlide, shapes, c, slide);
      break;
    case 'bullets':
    default:
      buildBulletsSlide(pptxSlide, shapes, c, slide);
      break;
  }

  if (!FULL_BLEED_LAYOUTS.has(slide.layout)) {
    addChrome(pptxSlide, shapes, c, pageNum, total);
  } else {
    pptxSlide.addText(`${pageNum} / ${total}`, {
      x: W - 1.4, y: H - 0.28, w: 1.2, h: 0.22,
      fontSize: 8, color: 'AAAACC', align: 'right',
    });
  }

  if (slide.notes) {
    pptxSlide.addNotes(slide.notes);
  }
}

export async function buildPptxPresentation(deck: ParsedPresentation): Promise<PptxInstance> {
  const pptx = await createPptx();
  pptx.layout = 'LAYOUT_16x9';
  pptx.author = 'Sheyon Ai';
  pptx.title = deck.title;
  pptx.subject = deck.subtitle ?? deck.audience ?? 'Presentation';

  const c = paletteFromTokens(resolveTheme(deck.theme));
  const shapes = pptx.ShapeType;
  for (let i = 0; i < deck.slides.length; i++) {
    const pptxSlide = pptx.addSlide();
    buildSlide(pptx, pptxSlide, shapes, c, deck.slides[i]!, i + 1, deck.slides.length);
  }
  return pptx;
}

export async function buildPptxBase64(deck: ParsedPresentation): Promise<string> {
  const pptx = await buildPptxPresentation(deck);
  const result = await pptx.write({ outputType: 'base64' });
  if (typeof result !== 'string') throw new Error('Unexpected PPTX output format.');
  return result;
}

export async function downloadPptxInBrowser(deck: ParsedPresentation, fileName: string): Promise<void> {
  const pptx = await buildPptxPresentation(deck);
  await pptx.writeFile({ fileName });
}
