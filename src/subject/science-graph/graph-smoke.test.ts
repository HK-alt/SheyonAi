/**
 * Smoke test for science-graph parser + HTML builder (no Jest required).
 * Run: npx tsx src/subject/science-graph/graph-smoke.test.ts
 */
import {
  buildGraphViewerHtml,
  tryParseScienceGraph,
  sampleModelPoints,
} from './index';

function assert(cond: unknown, msg: string) {
  if (!cond) throw new Error(msg);
}

const logisticMsg = `Here is a logistic growth curve.

\`\`\`json
{"chartType":"line","title":"Logistic population growth","goal":"See K","caption":"Generated graph — teaching model.","xAxis":{"label":"Time","unit":"years"},"yAxis":{"label":"N","unit":"individuals"},"controls":[{"id":"K","label":"K","min":50,"max":200,"step":5,"value":100},{"id":"r","label":"r","min":0.1,"max":0.8,"step":0.05,"value":0.35}],"model":{"type":"logistic","params":{"N0":10,"K":100,"r":0.35,"tMax":40}},"annotations":[{"id":"k","label":"K","y":100,"color":"#b45309"}],"insights":["Early growth is near-exponential.","N approaches K."]}
\`\`\`
`;

const timelineMsg = `WWI timeline.

\`\`\`json
{"chartType":"timeline","title":"WWI","goal":"Key events","caption":"Generated timeline — teaching model; dates are approximate teaching markers.","eras":[{"id":"e1","label":"Early","start":1914,"end":1915,"color":"#e0f2fe"}],"events":[{"id":"a","label":"Sarajevo","start":1914,"category":"Origins","importance":5,"detail":"Trigger"},{"id":"b","label":"Somme","start":1916,"end":1916,"category":"Western Front","importance":4},{"id":"c","label":"Armistice","start":1918,"category":"End","importance":5}],"insights":["Filter by theater."]}
\`\`\`
`;

const seriesMsg = `Rainfall.

\`\`\`json
{"chartType":"bar","title":"Monthly rainfall","xAxis":{"label":"Month"},"yAxis":{"label":"Rain","unit":"mm"},"series":[{"id":"rain","label":"Rainfall","points":[[1,80],[2,90],[3,120],[4,150],[5,200],[6,180],[7,100],[8,90],[9,110],[10,130],[11,100],[12,85]]}],"insights":["Wet season peaks mid-year."]}
\`\`\`
`;

const dualMsg = `Position and velocity.

\`\`\`json
{"chartType":"multiLine","title":"Projectile","xAxis":{"label":"t","unit":"s"},"yAxis":{"label":"y","unit":"m"},"yAxisRight":{"label":"v","unit":"m/s"},"series":[{"id":"y","label":"Height","yAxis":"left","points":[[0,0],[1,15],[2,20],[3,15],[4,0]]},{"id":"v","label":"Velocity","yAxis":"right","dash":"dashed","points":[[0,20],[1,10],[2,0],[3,-10],[4,-20]]}],"annotations":[{"id":"apex","label":"Apex","x":2,"detail":"vy=0"}],"insights":["Apex when vertical velocity is zero."]}
\`\`\`
`;

const htmlFallbackShouldNotParse = `Old HTML graph.

\`\`\`html
<!DOCTYPE html><html><body>hi</body></html>
\`\`\`
`;

const anatomyShouldNotParse = `Anatomy.

\`\`\`json
{"modelId":"heart","title":"Heart","labels":[]}
\`\`\`
`;

const g1 = tryParseScienceGraph(logisticMsg);
assert(g1, 'logistic parse');
assert(g1!.chartType === 'line', 'logistic chartType');
assert(g1!.model?.type === 'logistic', 'logistic model');
assert((g1!.series?.length ?? 0) >= 1, 'logistic series from model');
assert((g1!.series![0].points.length ?? 0) >= 40, 'logistic points');
assert((g1!.annotations?.length ?? 0) >= 1, 'annotations');
assert((g1!.insights?.length ?? 0) >= 2, 'insights');
assert(g1!.introText.includes('logistic'), 'intro text');

const html = buildGraphViewerHtml(g1!);
assert(html.includes('d3@7'), 'd3 cdn');
assert(html.includes('__SCIENCE_GRAPH__'), 'payload inject');
assert(html.includes('Logistic population growth'), 'title in html');
assert(html.includes('insights'), 'insights ui');
assert(html.includes('crosshair') || html.includes('cx'), 'crosshair');

const g2 = tryParseScienceGraph(timelineMsg);
assert(g2?.chartType === 'timeline', 'timeline type');
assert((g2?.events?.length ?? 0) === 3, 'timeline events');
assert((g2?.eras?.length ?? 0) === 1, 'eras');
assert(g2?.events?.[0].importance === 5, 'importance');

const html2 = buildGraphViewerHtml(g2!);
assert(html2.includes('yearScrub') || html2.includes('Play'), 'timeline scrubber');

const g3 = tryParseScienceGraph(seriesMsg);
assert(g3?.chartType === 'bar', 'bar type');
assert((g3?.series?.[0].points.length ?? 0) === 12, 'bar points');

const g4 = tryParseScienceGraph(dualMsg);
assert(g4?.chartType === 'multiLine', 'multiLine');
assert(g4?.yAxisRight?.label === 'v', 'dual axis');
assert(g4?.series?.[1].yAxis === 'right', 'right series');
assert(g4?.series?.[1].dash === 'dashed', 'dash');

assert(!tryParseScienceGraph(htmlFallbackShouldNotParse), 'html not science graph');
assert(!tryParseScienceGraph(anatomyShouldNotParse), 'anatomy not science graph');

const pts = sampleModelPoints({ type: 'michaelisMenten', params: { Vmax: 100, Km: 20, sMax: 100 } });
assert(pts.length >= 40, 'mm points');
assert(pts[pts.length - 1][1] > 50, 'mm asymptote');

const sine = sampleModelPoints({ type: 'sine', params: { A: 2, omega: 1, xMin: 0, xMax: 6.28 } });
assert(sine.length >= 40, 'sine points');

console.log('science-graph smoke tests passed');
