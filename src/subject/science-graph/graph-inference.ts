import { tryParseScienceGraph } from '@/subject/science-graph/graph-parser';
import type {
  ParsedScienceGraph,
  ScienceSeriesPoint,
} from '@/subject/science-graph/graph-types';

function sampleProjectileSeries(
  v0: number,
  angleDeg: number,
  g: number,
  steps = 50,
): { height: ScienceSeriesPoint[]; range: ScienceSeriesPoint[]; peakT: number; peakY: number } {
  const rad = (angleDeg * Math.PI) / 180;
  const v0y = v0 * Math.sin(rad);
  const v0x = v0 * Math.cos(rad);
  const tMax = (2 * v0y) / g;
  const height: ScienceSeriesPoint[] = [];
  const range: ScienceSeriesPoint[] = [];
  for (let i = 0; i <= steps; i++) {
    const t = (i / steps) * tMax;
    const y = v0y * t - 0.5 * g * t * t;
    height.push([t, Math.max(0, y)]);
    range.push([t, v0x * t]);
  }
  const peakT = v0y / g;
  const peakY = (v0y * v0y) / (2 * g);
  return { height, range, peakT, peakY };
}

/** Build a teaching graph when the model returned the wrong format for a graph prompt. */
export function inferScienceGraphFromText(content: string): ParsedScienceGraph | null {
  const projectile =
    /\b(projectile|ballistic|height\s+vs\s+time|vertical\s+motion|parabolic)\b/i.test(content) ||
    /\b(plot|graph|chart).*\b(motion|projectile|height|trajectory)\b/i.test(content);
  if (!projectile) return null;

  const introText = content.replace(/```[\s\S]*?```/g, '').trim();
  const { height, range, peakT, peakY } = sampleProjectileSeries(20, 45, 9.81);

  return {
    introText,
    chartType: 'multiLine',
    title: 'Projectile motion: height and range vs time',
    goal: 'Compare vertical height and horizontal range during flight under constant gravity',
    caption: 'Teaching fallback graph — model returned unexpected format.',
    xAxis: { label: 'Time', unit: 's' },
    yAxis: { label: 'Height', unit: 'm' },
    yAxisRight: { label: 'Horizontal range', unit: 'm' },
    series: [
      {
        id: 'height',
        label: 'Height',
        color: '#0f766e',
        yAxis: 'left',
        points: height,
      },
      {
        id: 'range',
        label: 'Range',
        color: '#1d4ed8',
        yAxis: 'right',
        dash: 'dashed',
        points: range,
      },
    ],
    annotations: [
      {
        id: 'peak',
        label: 'Peak',
        x: peakT,
        y: peakY,
        color: '#b45309',
        detail: 'Maximum height at mid-flight (level launch, no air drag)',
      },
    ],
    insights: [
      'Height follows a symmetric parabola under constant gravity.',
      'Horizontal range increases linearly with time when air drag is neglected.',
      'Peak height occurs at half the total flight time for a level launch.',
    ],
  };
}

export function resolveScienceGraphContent(
  content: string,
  options?: { preferInfer?: boolean },
): ParsedScienceGraph | null {
  const parsed = tryParseScienceGraph(content);
  if (parsed) return parsed;
  if (options?.preferInfer) {
    return inferScienceGraphFromText(content);
  }
  return null;
}

export function isScienceGraphFallback(content: string): boolean {
  return !tryParseScienceGraph(content) && inferScienceGraphFromText(content) !== null;
}
