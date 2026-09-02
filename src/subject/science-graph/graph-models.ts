import type { ScienceGraphModel, ScienceSeriesPoint } from '@/subject/science-graph/graph-types';

/** Sample a parametric teaching model into [x, y] points for the D3 shell. */
export function sampleModelPoints(
  model: ScienceGraphModel,
  controlOverrides: Record<string, number> = {},
  pointCount = 64,
): ScienceSeriesPoint[] {
  const p = { ...model.params, ...controlOverrides };
  const points: ScienceSeriesPoint[] = [];
  const n = Math.max(24, Math.min(pointCount, 120));

  if (model.type === 'logistic') {
    const N0 = num(p.N0, 10);
    const K = num(p.K, 100);
    const r = num(p.r, 0.35);
    const tMax = num(p.tMax, 40);
    for (let i = 0; i < n; i++) {
      const t = (tMax * i) / (n - 1);
      const denom = 1 + (K / Math.max(N0, 1e-9) - 1) * Math.exp(-r * t);
      points.push([round(t), round(K / denom)]);
    }
    return points;
  }

  if (model.type === 'michaelisMenten') {
    const Vmax = num(p.Vmax, 100);
    const Km = num(p.Km, 20);
    const sMax = num(p.sMax, 120);
    for (let i = 0; i < n; i++) {
      const S = (sMax * i) / (n - 1);
      points.push([round(S), round((Vmax * S) / (Km + S))]);
    }
    return points;
  }

  if (model.type === 'linear') {
    const m = num(p.m, 1);
    const b = num(p.b, 0);
    const xMin = num(p.xMin, 0);
    const xMax = num(p.xMax, 10);
    for (let i = 0; i < n; i++) {
      const x = xMin + ((xMax - xMin) * i) / (n - 1);
      points.push([round(x), round(m * x + b)]);
    }
    return points;
  }

  if (model.type === 'quadratic') {
    const a = num(p.a, -0.5);
    const b = num(p.b, 5);
    const c = num(p.c, 0);
    const xMin = num(p.xMin, 0);
    const xMax = num(p.xMax, 10);
    for (let i = 0; i < n; i++) {
      const x = xMin + ((xMax - xMin) * i) / (n - 1);
      points.push([round(x), round(a * x * x + b * x + c)]);
    }
    return points;
  }

  if (model.type === 'sine') {
    const A = num(p.A, 1);
    const omega = num(p.omega, 1);
    const phi = num(p.phi, 0);
    const offset = num(p.offset, 0);
    const xMin = num(p.xMin, 0);
    const xMax = num(p.xMax, 6.28);
    for (let i = 0; i < n; i++) {
      const x = xMin + ((xMax - xMin) * i) / (n - 1);
      points.push([round(x), round(A * Math.sin(omega * x + phi) + offset)]);
    }
    return points;
  }

  if (model.type === 'power') {
    const a = num(p.a, 1);
    const k = num(p.k, 2);
    const xMin = Math.max(num(p.xMin, 0.1), 1e-6);
    const xMax = num(p.xMax, 10);
    for (let i = 0; i < n; i++) {
      const x = xMin + ((xMax - xMin) * i) / (n - 1);
      points.push([round(x), round(a * Math.pow(x, k))]);
    }
    return points;
  }

  // exponential
  const a = num(p.a, 1);
  const k = num(p.k, 0.2);
  const xMin = num(p.xMin, 0);
  const xMax = num(p.xMax, 10);
  for (let i = 0; i < n; i++) {
    const x = xMin + ((xMax - xMin) * i) / (n - 1);
    points.push([round(x), round(a * Math.exp(k * x))]);
  }
  return points;
}

function num(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function round(n: number): number {
  return Math.round(n * 1000) / 1000;
}

/** JS source embedded in the WebView for live slider recompute. */
export const GRAPH_MODEL_RUNTIME_JS = `
function sampleModelPoints(model, controlOverrides, pointCount) {
  pointCount = Math.max(24, Math.min(pointCount || 64, 120));
  var p = Object.assign({}, model.params || {}, controlOverrides || {});
  var points = [];
  function num(v, fb) { return typeof v === 'number' && isFinite(v) ? v : fb; }
  function round(n) { return Math.round(n * 1000) / 1000; }
  var n = pointCount;
  if (model.type === 'logistic') {
    var N0 = num(p.N0, 10), K = num(p.K, 100), r = num(p.r, 0.35), tMax = num(p.tMax, 40);
    for (var i = 0; i < n; i++) {
      var t = (tMax * i) / (n - 1);
      var denom = 1 + (K / Math.max(N0, 1e-9) - 1) * Math.exp(-r * t);
      points.push([round(t), round(K / denom)]);
    }
    return points;
  }
  if (model.type === 'michaelisMenten') {
    var Vmax = num(p.Vmax, 100), Km = num(p.Km, 20), sMax = num(p.sMax, 120);
    for (var j = 0; j < n; j++) {
      var S = (sMax * j) / (n - 1);
      points.push([round(S), round((Vmax * S) / (Km + S))]);
    }
    return points;
  }
  if (model.type === 'linear') {
    var m = num(p.m, 1), b = num(p.b, 0), xMin = num(p.xMin, 0), xMax = num(p.xMax, 10);
    for (var k = 0; k < n; k++) {
      var x = xMin + ((xMax - xMin) * k) / (n - 1);
      points.push([round(x), round(m * x + b)]);
    }
    return points;
  }
  if (model.type === 'quadratic') {
    var qa = num(p.a, -0.5), qb = num(p.b, 5), qc = num(p.c, 0);
    var qx0 = num(p.xMin, 0), qx1 = num(p.xMax, 10);
    for (var qi = 0; qi < n; qi++) {
      var qx = qx0 + ((qx1 - qx0) * qi) / (n - 1);
      points.push([round(qx), round(qa * qx * qx + qb * qx + qc)]);
    }
    return points;
  }
  if (model.type === 'sine') {
    var A = num(p.A, 1), omega = num(p.omega, 1), phi = num(p.phi, 0), offset = num(p.offset, 0);
    var sx0 = num(p.xMin, 0), sx1 = num(p.xMax, 6.28);
    for (var si = 0; si < n; si++) {
      var sx = sx0 + ((sx1 - sx0) * si) / (n - 1);
      points.push([round(sx), round(A * Math.sin(omega * sx + phi) + offset)]);
    }
    return points;
  }
  if (model.type === 'power') {
    var pa = num(p.a, 1), pk = num(p.k, 2);
    var px0 = Math.max(num(p.xMin, 0.1), 1e-6), px1 = num(p.xMax, 10);
    for (var pi = 0; pi < n; pi++) {
      var px = px0 + ((px1 - px0) * pi) / (n - 1);
      points.push([round(px), round(pa * Math.pow(px, pk))]);
    }
    return points;
  }
  var a = num(p.a, 1), kk = num(p.k, 0.2), xmin = num(p.xMin, 0), xmax = num(p.xMax, 10);
  for (var ei = 0; ei < n; ei++) {
    var xx = xmin + ((xmax - xmin) * ei) / (n - 1);
    points.push([round(xx), round(a * Math.exp(kk * xx))]);
  }
  return points;
}
`;
