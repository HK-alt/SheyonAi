/**
 * Parser smoke tests for presentation-parser.
 * Run with: npx tsx src/subject/presentation/presentation-smoke.test.ts
 *
 * Style mirrors src/subject/science-graph/graph-smoke.test.ts
 */

import { tryParsePresentation } from './presentation-parser';

// ─── Helpers ──────────────────────────────────────────────────────────────────

let passed = 0;
let failed = 0;

function assert(condition: boolean, label: string) {
  if (condition) {
    console.log(`  ✓ ${label}`);
    passed++;
  } else {
    console.error(`  ✗ FAIL: ${label}`);
    failed++;
  }
}

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const INFOGRAPHIC_MSG = `Here is your teaching deck.
\`\`\`json
{"title":"Test","audience":"Students","theme":"science","slides":[
  {"layout":"infographic","title":"Key Stats","facts":[{"label":"42","value":"The answer"},{"label":"3.7B","value":"Years of life on Earth"}],"notes":"Absorb these."}
]}
\`\`\``;

const CHART_BAR_MSG = `Teaching deck incoming.
\`\`\`json
{"title":"Test","audience":"Students","theme":"business","slides":[
  {"layout":"chart","title":"Bar Chart","chartType":"bar","series":[{"label":"A","value":10},{"label":"B","value":20},{"label":"C","value":15}],"notes":"Note."}
]}
\`\`\``;

const CHART_PIE_MSG = `\`\`\`json
{"title":"Test","slides":[
  {"layout":"chart","title":"Pie Chart","chartType":"pie","series":[{"label":"X","value":60},{"label":"Y","value":40}],"notes":"Note."}
]}
\`\`\``;

const CHART_LINE_MSG = `\`\`\`json
{"title":"Test","slides":[
  {"layout":"chart","title":"Line Chart","chartType":"line","series":[{"label":"Jan","value":5},{"label":"Feb","value":8},{"label":"Mar","value":6}],"notes":"Note."}
]}
\`\`\``;

const DIAGRAM_MSG = `\`\`\`json
{"title":"Test","slides":[
  {"layout":"diagram","title":"Flow","nodes":[{"id":"a","label":"Step A"},{"id":"b","label":"Step B","detail":"detail"},{"id":"c","label":"Step C"}],"edges":[{"from":"a","to":"b","label":"then"},{"from":"b","to":"c"}],"notes":"Flow."}
]}
\`\`\``;

const TRIANGLE_MSG = `\`\`\`json
{"title":"Test","slides":[
  {"layout":"triangle","title":"Triangle","vertices":[{"heading":"Fire","body":"Heat source"},{"heading":"Fuel","body":"Combustible material"},{"heading":"Oxygen","body":"Oxidiser"}],"center":"Combustion","notes":"Fire triangle."}
]}
\`\`\``;

const PYRAMID_MSG = `\`\`\`json
{"title":"Test","slides":[
  {"layout":"pyramid","title":"Pyramid","levels":[{"heading":"Apex","body":"Top tier"},{"heading":"Middle","body":"Mid tier"},{"heading":"Base","body":"Foundation"}],"notes":"Pyramid."}
]}
\`\`\``;

const CYCLE_MSG = `\`\`\`json
{"title":"Test","slides":[
  {"layout":"cycle","title":"Cycle","steps":["Phase 1","Phase 2","Phase 3","Phase 4"],"center":"Loop","notes":"Cycle."}
]}
\`\`\``;

const FUNNEL_MSG = `\`\`\`json
{"title":"Test","slides":[
  {"layout":"funnel","title":"Funnel","steps":["Awareness","Interest","Decision","Action"],"notes":"Sales funnel."}
]}
\`\`\``;

const TIMELINE_HORZ_MSG = `\`\`\`json
{"title":"Test","slides":[
  {"layout":"timeline","title":"Timeline","facts":[{"label":"1543","value":"Copernicus"},{"label":"1687","value":"Newton"},{"label":"1859","value":"Darwin"},{"label":"1905","value":"Einstein"}],"notes":"Timeline."}
]}
\`\`\``;

const TIMELINE_VERT_MSG = `\`\`\`json
{"title":"Test","slides":[
  {"layout":"timeline","title":"Long Timeline","facts":[
    {"label":"1","value":"A"},{"label":"2","value":"B"},{"label":"3","value":"C"},
    {"label":"4","value":"D"},{"label":"5","value":"E"},{"label":"6","value":"F"},
    {"label":"7","value":"G"}
  ],"notes":"Vertical."}
]}
\`\`\``;

const UNKNOWN_LAYOUT_MSG = `\`\`\`json
{"title":"Test","slides":[
  {"layout":"nonexistent","title":"Unknown","bullets":["Only known layouts are accepted"],"notes":"Fallback."}
]}
\`\`\``;

const FULL_DECK_MSG = `Here is a mixed deck.
\`\`\`json
{"title":"Mixed Deck","audience":"Students","theme":"tech","slides":[
  {"layout":"title","title":"Mixed Deck","subtitle":"All visual layouts","notes":"Welcome."},
  {"layout":"agenda","title":"Agenda","steps":["Intro","Charts","Diagrams","Shapes"],"notes":"Plan."},
  {"layout":"infographic","title":"Stats","facts":[{"label":"100","value":"percent coverage"}],"notes":"Stats."},
  {"layout":"chart","title":"Data","chartType":"bar","series":[{"label":"A","value":1}],"notes":"Chart."},
  {"layout":"diagram","title":"Flow","nodes":[{"id":"x","label":"X"}],"edges":[],"notes":"Diag."},
  {"layout":"triangle","title":"Triangle","vertices":[{"heading":"A","body":"a"},{"heading":"B","body":"b"},{"heading":"C","body":"c"}],"notes":"Tri."},
  {"layout":"pyramid","title":"Pyramid","levels":[{"heading":"Top","body":"apex"},{"heading":"Base","body":"base"}],"notes":"Pyr."},
  {"layout":"cycle","title":"Cycle","steps":["One","Two","Three"],"center":"Hub","notes":"Cyc."},
  {"layout":"funnel","title":"Funnel","steps":["Wide","Narrow"],"notes":"Fun."},
  {"layout":"closing","title":"Done","bullets":["Summary"],"notes":"End."}
]}
\`\`\``;

// ─── Tests ────────────────────────────────────────────────────────────────────

console.log('\nPresentation parser smoke tests\n');

console.log('── infographic ──');
const p1 = tryParsePresentation(INFOGRAPHIC_MSG);
assert(p1 !== null, 'parses infographic deck');
assert(p1?.slides[0]?.layout === 'infographic', 'layout = infographic');
assert((p1?.slides[0]?.facts?.length ?? 0) === 2, '2 facts');
assert(p1?.slides[0]?.facts?.[0]?.label === '42', 'first label = 42');

console.log('── chart (bar) ──');
const p2 = tryParsePresentation(CHART_BAR_MSG);
assert(p2 !== null, 'parses bar chart');
assert(p2?.slides[0]?.layout === 'chart', 'layout = chart');
assert(p2?.slides[0]?.chartType === 'bar', 'chartType = bar');
assert((p2?.slides[0]?.series?.length ?? 0) === 3, '3 series points');
assert(p2?.slides[0]?.series?.[1]?.value === 20, 'series[1].value = 20');

console.log('── chart (pie) ──');
const p3 = tryParsePresentation(CHART_PIE_MSG);
assert(p3?.slides[0]?.chartType === 'pie', 'chartType = pie');
assert((p3?.slides[0]?.series?.length ?? 0) === 2, '2 pie segments');

console.log('── chart (line) ──');
const p4 = tryParsePresentation(CHART_LINE_MSG);
assert(p4?.slides[0]?.chartType === 'line', 'chartType = line');
assert(p4?.slides[0]?.series?.[2]?.label === 'Mar', 'series[2].label = Mar');

console.log('── diagram ──');
const p5 = tryParsePresentation(DIAGRAM_MSG);
assert(p5?.slides[0]?.layout === 'diagram', 'layout = diagram');
assert((p5?.slides[0]?.nodes?.length ?? 0) === 3, '3 nodes');
assert((p5?.slides[0]?.edges?.length ?? 0) === 2, '2 edges');
assert(p5?.slides[0]?.nodes?.[1]?.detail === 'detail', 'node detail preserved');
assert(p5?.slides[0]?.edges?.[0]?.label === 'then', 'edge label preserved');

console.log('── triangle ──');
const p6 = tryParsePresentation(TRIANGLE_MSG);
assert(p6?.slides[0]?.layout === 'triangle', 'layout = triangle');
assert((p6?.slides[0]?.vertices?.length ?? 0) === 3, '3 vertices');
assert(p6?.slides[0]?.center === 'Combustion', 'center label preserved');
assert(p6?.slides[0]?.vertices?.[0]?.heading === 'Fire', 'vertex[0].heading = Fire');

console.log('── pyramid ──');
const p7 = tryParsePresentation(PYRAMID_MSG);
assert(p7?.slides[0]?.layout === 'pyramid', 'layout = pyramid');
assert((p7?.slides[0]?.levels?.length ?? 0) === 3, '3 levels');
assert(p7?.slides[0]?.levels?.[0]?.heading === 'Apex', 'levels[0] = apex');

console.log('── cycle ──');
const p8 = tryParsePresentation(CYCLE_MSG);
assert(p8?.slides[0]?.layout === 'cycle', 'layout = cycle');
assert((p8?.slides[0]?.steps?.length ?? 0) === 4, '4 steps');
assert(p8?.slides[0]?.center === 'Loop', 'center = Loop');

console.log('── funnel ──');
const p9 = tryParsePresentation(FUNNEL_MSG);
assert(p9?.slides[0]?.layout === 'funnel', 'layout = funnel');
assert((p9?.slides[0]?.steps?.length ?? 0) === 4, '4 funnel stages');

console.log('── timeline (horizontal, ≤6 facts) ──');
const p10 = tryParsePresentation(TIMELINE_HORZ_MSG);
assert(p10?.slides[0]?.layout === 'timeline', 'layout = timeline');
assert((p10?.slides[0]?.facts?.length ?? 0) === 4, '4 horizontal milestone facts');

console.log('── timeline (vertical, >6 facts) ──');
const p11 = tryParsePresentation(TIMELINE_VERT_MSG);
assert((p11?.slides[0]?.facts?.length ?? 0) === 7, '7 vertical milestone facts');

console.log('── unknown layout falls back to bullets ──');
const p12 = tryParsePresentation(UNKNOWN_LAYOUT_MSG);
assert(p12?.slides[0]?.layout === 'bullets', 'unknown layout → bullets fallback');

console.log('── full mixed deck ──');
const p13 = tryParsePresentation(FULL_DECK_MSG);
assert(p13 !== null, 'full mixed deck parses');
assert(p13?.slides.length === 10, '10 slides total');
assert(p13?.theme === 'tech', 'theme = tech');

const visualLayouts = (p13?.slides ?? []).map((s) => s.layout);
assert(visualLayouts.includes('infographic'), 'deck has infographic');
assert(visualLayouts.includes('chart'), 'deck has chart');
assert(visualLayouts.includes('diagram'), 'deck has diagram');
assert(visualLayouts.includes('triangle'), 'deck has triangle');
assert(visualLayouts.includes('pyramid'), 'deck has pyramid');
assert(visualLayouts.includes('cycle'), 'deck has cycle');
assert(visualLayouts.includes('funnel'), 'deck has funnel');

console.log('── chart series value coercion from string ──');
const coercedMsg = `\`\`\`json
{"title":"T","slides":[{"layout":"chart","title":"C","chartType":"bar","series":[{"label":"X","value":"42"},{"label":"Y","value":7}],"notes":"n"}]}
\`\`\``;
const p14 = tryParsePresentation(coercedMsg);
assert(p14?.slides[0]?.series?.[0]?.value === 42, 'string "42" coerced to number 42');

// ─── Summary ──────────────────────────────────────────────────────────────────
console.log(`\n${passed} passed, ${failed} failed\n`);
if (failed > 0) process.exit(1);
