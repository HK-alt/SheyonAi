import { buildThemePromptBlock, PRESENTATION_THEME_IDS } from './presentation-theme';

export const PRESENTATION_JSON_CONTRACT = `Reply with one short introductory sentence naming the topic, audience, and chosen visual theme, then exactly one \`\`\`json fence and no other fences.

JSON schema for a professional 16:9 slide deck:
{
  "title": "Deck title",
  "subtitle": "optional subtitle or course code",
  "audience": "who this is for (one line)",
  "theme": "academic | science | business | history | tech | creative",
  "slides": [
    {
      "layout": "title | section | agenda | bullets | twoColumn | comparison | steps | quote | keyFacts | timeline | cards | closing | infographic | chart | diagram | triangle | pyramid | cycle | funnel",
      "title": "slide title",
      "subtitle": "optional – for title/section layouts",
      "bullets": ["max 5 concise bullets ≤10 words each – for bullets/closing layouts"],
      "left":  { "heading": "left column heading", "bullets": ["…"] },
      "right": { "heading": "right column heading", "bullets": ["…"] },
      "quote": "verbatim quote text – for quote layout",
      "attribution": "Name, Year – for quote layout",
      "steps": ["Step 1 text", "Step 2 text"],
      "facts": [{ "label": "Term or milestone", "value": "Definition, date, or metric" }],
      "cards": [{ "heading": "Card heading", "body": "2-3 sentence description" }],
      "chartType": "bar | pie | line",
      "series": [{ "label": "Category or data-point name", "value": 42 }],
      "nodes": [{ "id": "n1", "label": "Node label", "detail": "optional one-line detail" }],
      "edges": [{ "from": "n1", "to": "n2", "label": "optional edge label" }],
      "vertices": [{ "heading": "Vertex heading", "body": "Short body text" }],
      "levels": [{ "heading": "Top level (apex)", "body": "Short body text" }],
      "center": "optional center label for cycle or triangle layout",
      "notes": "speaker notes – always include 1–3 sentences"
    }
  ]
}

${buildThemePromptBlock()}

LAYOUT RULES:
- First slide MUST use layout "title".
- Second or third slide SHOULD use layout "agenda" (numbered outline of topics).
- Last slide MUST use layout "closing" (key takeaways + next step).
- Include 1–2 "section" slides as chapter dividers on decks with 8+ slides.
- Every deck MUST include at least 3 visual layouts from: infographic, timeline, chart, diagram, triangle, pyramid, cycle, funnel — choose whichever best fit the topic.
- "bullets": max 5 items, each ≤10 words.
- "twoColumn": use when comparing two sides of the same topic.
- "comparison": use for head-to-head comparisons (left/right with heading + bullets under each).
- "steps": ordered sequence (processes, algorithms, derivations) with numbered pills.
- "quote": key theorem, definition, or memorable quote with attribution.
- "keyFacts": 3–6 term-value pairs for glossary or key metrics slides.
- "agenda": ordered list – put topic names in "steps" field (not bullets).
- "timeline": ordered milestones – put milestone name in "facts[].label" and date/description in "facts[].value". Use for any sequence of dates or historical events.
- "cards": 3–4 equal tiles with a short body – put items in "cards" field.
- "closing": use "bullets" for 2–3 takeaways; use "subtitle" for the "Next: …" action line.
- "infographic": 3–6 key stats or KPIs – put items in "facts[]" (label = stat name or big number, value = short explanation). Use for "at a glance" figures or impressive quantities.
- "chart": numeric data comparison – set "chartType" to "bar", "pie", or "line" and list data in "series[]" (label + numeric value). Use for graphs, statistics, percentages, growth trends. Provide 3–8 data points.
- "diagram": process or cause-effect flow – list nodes in "nodes[]" (id, label, optional detail) and connections in "edges[]" (from id → to id, optional label). Keep to 3–6 nodes. Use for workflows, algorithms, cause chains, labeled part diagrams.
- "triangle": three-part model (rhetorical triangle, fire triangle, trade triangle, etc.) – put exactly 3 items in "vertices[]" (heading + body). Optional "center" string for a central concept.
- "pyramid": hierarchy or tiered model (Maslow, feudal pyramid, food web) – list levels in "levels[]" top-to-bottom where "levels[0]" is the apex. Use 3–5 levels.
- "cycle": feedback loop or repeating process – list steps in "steps[]" (3–6 items). Optional "center" string for the central concept of the loop.
- "funnel": narrowing stages (sales funnel, scientific method, elimination rounds) – list stages in "steps[]" (3–5 items), first = widest/top.
- Visual layout guide: numbers/percentages → chart; dates/sequence → timeline; 3-part model → triangle; hierarchy/tiers → pyramid; loop → cycle; narrowing stages → funnel; labeled flow → diagram; KPIs/stats → infographic.
- Vector layouts only — no photos, no image URLs, no HTML, no Mermaid.
- Every slide MUST include "notes" with 1–3 sentences of speaker context.
- Honour the learner's education level in vocabulary and depth.
- Teaching accuracy is paramount.
- Generate 8–14 slides total; more is fine for complex topics.
- Prefer visual layouts over bullet walls wherever content fits.`;

// ── Visual layout examples (one of each new layout) ─────────────────────────
const VISUAL_LAYOUT_EXAMPLES = [
  `{"layout":"infographic","title":"Key Figures at a Glance","facts":[{"label":"3.7B","value":"Years since first life on Earth"},{"label":"8%","value":"Oxygen in early atmosphere (today 21%)"},{"label":"3,000","value":"New species identified per year on average"},{"label":"400","value":"Land plant species alive 450 Mya"}],"notes":"Let students absorb these numbers before discussing the GOE."}`,
  `{"layout":"chart","title":"Atmospheric Oxygen Over Time","chartType":"bar","series":[{"label":"3.0 Gya","value":0},{"label":"2.4 Gya","value":1},{"label":"1.0 Gya","value":7},{"label":"500 Mya","value":15},{"label":"Today","value":21}],"notes":"The Great Oxidation Event at 2.4 Gya was the turning point — ask students why."}`,
  `{"layout":"diagram","title":"Photosynthesis Flow","nodes":[{"id":"sun","label":"Sunlight"},{"id":"lr","label":"Light Reactions","detail":"Thylakoids"},{"id":"cc","label":"Calvin Cycle","detail":"Stroma"},{"id":"g3p","label":"Glucose (G3P)"}],"edges":[{"from":"sun","to":"lr"},{"from":"lr","to":"cc","label":"ATP + NADPH"},{"from":"cc","to":"g3p"}],"notes":"Trace the energy pathway from sunlight to stored glucose."}`,
  `{"layout":"triangle","title":"Photosynthesis Inputs","vertices":[{"heading":"Light Energy","body":"Drives electron excitation in thylakoids"},{"heading":"CO₂","body":"Carbon source fixed in the stroma"},{"heading":"H₂O","body":"Electron donor — split to release O₂"}],"center":"Glucose","notes":"Each vertex is an essential input; removing any one stops the reaction."}`,
  `{"layout":"pyramid","title":"Energy Pyramid","levels":[{"heading":"Producers","body":"Plants — capture solar energy via photosynthesis"},{"heading":"Primary Consumers","body":"Herbivores — obtain energy by eating plants"},{"heading":"Secondary Consumers","body":"Carnivores — obtain energy from herbivores"},{"heading":"Tertiary Consumers","body":"Top predators — least energy available"}],"notes":"Only ~10% of energy transfers between levels — ask why most energy is lost."}`,
  `{"layout":"cycle","title":"Carbon Cycle","steps":["Plants absorb CO₂","Photosynthesis fixes carbon into glucose","Animals eat plants — carbon moves up the chain","Respiration releases CO₂","Decomposers break down organic matter","CO₂ returns to atmosphere"],"center":"Carbon","notes":"Stress that the cycle has no true start or end."}`,
  `{"layout":"funnel","title":"Scientific Method","steps":["Ask a Question","Form a Hypothesis","Design Experiment","Collect & Analyse Data","Draw Conclusions"],"notes":"Only well-formed experiments survive to the conclusion stage — discuss rejection at each level."}`,
].join(',\n  ');

export const PRESENTATION_SCHEMA_EXAMPLE = `{"title":"Photosynthesis","subtitle":"Biology Unit 3","audience":"High school students","theme":"science","slides":[{"layout":"title","title":"Photosynthesis","subtitle":"How plants convert light into energy","notes":"Welcome students. Today we explore the biochemical engine that powers almost all life on Earth."},{"layout":"agenda","title":"What We'll Cover","steps":["What is Photosynthesis?","The Light Reactions","The Calvin Cycle","Key Figures & Data","Flows & Cycles","Quiz & Recap"],"notes":"Our roadmap moves from the big picture down to biochemical detail, then into visual data."},{"layout":"section","title":"Part 1: The Light Reactions","notes":"We begin with the light-dependent stage that captures solar energy in the thylakoid membranes."},{"layout":"bullets","title":"What is Photosynthesis?","bullets":["Converts CO₂ + H₂O + light → glucose + O₂","Occurs in chloroplasts","Two stages: light reactions and Calvin cycle","Critical for all aerobic life on Earth"],"notes":"Photosynthesis is the foundation of almost every food chain."},{"layout":"twoColumn","title":"Light vs Dark Reactions","left":{"heading":"Light Reactions","bullets":["In thylakoids","Need sunlight","Produce ATP & NADPH","Split water → O₂"]},"right":{"heading":"Calvin Cycle","bullets":["In stroma","No direct light needed","Uses ATP & NADPH","Fixes CO₂ → G3P"]},"notes":"The two stages are coupled — light reactions supply energy carriers the Calvin cycle consumes."},
  ${VISUAL_LAYOUT_EXAMPLES},
  {"layout":"keyFacts","title":"Key Terms","facts":[{"label":"Chlorophyll","value":"Green pigment absorbing red and blue light"},{"label":"ATP","value":"Energy currency produced in light reactions"},{"label":"Calvin Cycle","value":"Carbon-fixation pathway in the stroma"},{"label":"G3P","value":"3-carbon sugar — direct product of Calvin cycle"}],"notes":"Students should define each term and place it in the correct stage."},{"layout":"closing","title":"Key Takeaways","subtitle":"Next: Chapter 4 quiz on Friday","bullets":["Photosynthesis converts light energy into chemical energy","Two coupled stages: light reactions and Calvin cycle","Chloroplasts are the site of both stages"],"notes":"Close by asking students to draw the two-stage diagram from memory."}]}`;

export const PRESENTATION_MODE_PLACEHOLDER =
  'Topic, exam unit, or talk title for a slide deck…';

/** Hidden marker so the Edge Function / model sees Slides instructions without cluttering the UI. */
export const PRESENTATION_MODE_MARKER = '<!--sheyon:slides-->';

export function buildPresentationPrompt(): string {
  return `The user selected Tools → Slides. Generate a professional, teaching-quality slide deck with a theme that fits the topic.\nValid themes: ${PRESENTATION_THEME_IDS.join(', ')}.\n${PRESENTATION_JSON_CONTRACT}\n\nExample shape (shorten to fit the topic; demonstrates all visual layout types):\n${PRESENTATION_SCHEMA_EXAMPLE}`;
}

/** Append Slides JSON contract to the persisted user message (AI sees this; UI strips it). */
export function withPresentationModeInstructions(userText: string): string {
  const trimmed = userText.trim();
  return `${trimmed}\n\n${PRESENTATION_MODE_MARKER}\n${buildPresentationPrompt()}`;
}

/** Remove hidden Slides instructions from content shown in the chat UI. */
export function stripPresentationModeInstructions(content: string): string {
  const idx = content.indexOf(PRESENTATION_MODE_MARKER);
  if (idx === -1) return content;
  return content.slice(0, idx).trimEnd();
}
