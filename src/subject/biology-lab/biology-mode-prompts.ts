import type { BiologyMode } from '@/types/chat';
import type { SubjectPrompts } from '@/subject/subjects/types';
import {
  SCIENCE_GRAPH_JSON_CONTRACT,
  SCIENCE_GRAPH_SCHEMA_EXAMPLE_LINE,
} from '@/subject/science-graph/graph-prompt';

const DESIGN = `DESIGN SYSTEM (textbook-quality):
- Look like a modern AP Biology / university lecture figure — clean, calm, precise. Not a cartoon sketch or toy UI.
- Typography: system-ui; page title 22–26px semibold; stage titles 13–14px bold uppercase; body labels 11–12px.
- Color: page bg #f1f5f9; card #ffffff; ink #0f172a; muted #64748b; accent teal #0f766e; secondary blue #1d4ed8; warm #b45309; borders #e2e8f0; radius 12–16px; shadow 0 1px 3px rgba(15,23,42,.08).
- Spacing: 20–28px padding; aligned columns; no overlapping labels; no emoji.
- Page structure: header (title + one-line learning goal) → main figure → optional controls → footer caption.
- Accessibility: dark text on light fills; ≥4.5:1 contrast for labels.`;

const DIAGRAM_DESIGN = `DIAGRAM DESIGN SYSTEM (flat textbook figure — like a modern AP Biology lecture poster):
- Dark green or teal title bar with uppercase topic title; optional chemical equation row beneath when chemistry applies.
- Prefer multi-panel layout: left = organism/organ overview with inputs/outputs; right = zoomed organelle/process detail when useful.
- Molecules as colored labeled circles (CO₂, H₂O, O₂, glucose, ATP, etc.); clear directional arrows; non-overlapping labels; no emoji; no watermarks; no photorealism.
- Color: page #f1f5f9; card #fff; ink #0f172a; muted #64748b; greens #166534/#16a34a; blue #2563eb; warm #b45309; borders #e2e8f0.
- Footer caption exactly: "Generated teaching figure — simplified model, not a clinical illustration."
- Prefer inline SVG for the figure; min-height ~560px; JS optional (static preferred). No CDNs/external images/fonts.`;

/**
 * Biology generate modes — keep in sync with BIOLOGY_MODE_PROMPTS in
 * supabase/functions/deepseek-chat/index.ts
 */
export const BIOLOGY_MODE_PROMPTS: Record<BiologyMode, string> = {
  graph:
    `The user selected Graph mode. The app renders an advanced interactive D3 teaching graph from your JSON.
Prefer: logistic growth, Michaelis–Menten kinetics, photosynthetic rate vs light, blood glucose vs time.
Always include annotations + insights. If unclear, use logistic N vs t with K and r controls, a K annotation, and 3 insights.
` +
    SCIENCE_GRAPH_JSON_CONTRACT +
    `
Example:
\`\`\`json
${SCIENCE_GRAPH_SCHEMA_EXAMPLE_LINE}
\`\`\``,

  diagram:
    `The user selected Diagram mode for biology or medical teaching figures.

PATH A — catalog match: If the topic clearly matches a catalog figure, write one short intro sentence, then exactly one \`\`\`json fence (no HTML):
{"diagramId":"photosynthesis","title":"Photosynthesis overview","focus":"chloroplast light vs dark reactions","labels":[{"id":"thylakoid","title":"Thylakoid","detail":"Membrane stacks where light-dependent reactions split water and make ATP/NADPH."}]}
diagramId MUST be one of: kidney, nephron, animal_cell, mitosis, heart_flow, food_web, photosynthesis, neuron_synapse, digestive_tract, respiratory_system
Use kidney for whole-organ renal anatomy; nephron for tubule pathway; animal_cell for organelles; mitosis for cell division; heart_flow for chambers/circulation; food_web for ecosystems; photosynthesis for plant/chloroplast photosynthesis; neuron_synapse for neuron/synapse/action potential overview; digestive_tract for GI organs; respiratory_system for airways/lungs/alveoli.
Include 4–8 labels with accurate titles + 1–2 sentence teaching details. Keep all prose outside the fence.

PATH B — any other biology/medical topic: Do NOT force a wrong catalog id. GENERATE a publication-quality self-contained textbook diagram NOW.
Write one short intro sentence, then exactly one \`\`\`html fence with a full document (<!DOCTYPE html>).
CRITICAL: no PhET/LabXchange/CDNs/external images. All CSS and SVG/JS inline. Fence language MUST be html.

` +
    DIAGRAM_DESIGN +
    `

Cover anatomy pathways, organs, physiology, cell processes, ecology, or medical teaching schematics as requested. Never claim a diagnosis, clinical scan, or photo of a real patient. Keep all prose outside the fence.`,

  sim:
    `The user selected Lab (Simulate) mode. GENERATE a publication-quality interactive biology lab NOW.
Write one short intro sentence, then exactly one \`\`\`html fence with a full document (<!DOCTYPE html>).
CRITICAL: no PhET/LabXchange/CDNs. All CSS and JS inline.

` +
    DESIGN +
    `

LAB REQUIREMENTS:
- Chrome: title, learning goal, stage/canvas, Play/Pause, Reset, ≥1 labeled slider with live numeric readout, legend, caption.
- Polished instrument-panel controls (styled buttons, range inputs, Running/Paused status pill) — not raw unstyled widgets only.
- On Play, show unmistakable motion or staged transitions. Never a blank/static stage.
- Prefer: osmosis, mitosis stages, photosynthesis vs light, action potential, two-phenotype selection.
- Every control must work. Min-height ~560px; JS under 260 lines. Keep all prose outside the fence.
If unclear, simulate osmosis with concentration slider and visible solute/water particles.`,

  anatomy: `The user selected Anatomy 3D mode. CRITICAL: Do NOT generate HTML, SVG, canvas, Three.js, Markdown part-lists instead of JSON, or links to Sketchfab/NIH/PhET/YouTube.
The app loads a curated 3D organ with catalog-matched label anchors. You ONLY pick the catalog model and write labels whose ids match that model's scale.

Write one short polished intro sentence naming the structure and one learning focus (no code). If not in catalog, pick the closest modelId and say so.
Then exactly one \`\`\`json fence and nothing else after it:
{"modelId":"heart","title":"Human heart","focus":"left ventricle","labels":[{"id":"left-ventricle","title":"Left ventricle","detail":"Thick-walled chamber that ejects oxygenated blood into the aorta during systole."}]}
modelId MUST be one of: heart, lungs, brain, stomach, kidney, cell, neuron, skeleton, liver, spleen, pancreas, spinal-cord, bladder
Use cell for organelles; neuron for nerve cells; stomach for GI tract; skeleton for bone/skull.

LABEL RULES (critical — labels are snapped to matched anatomy anchors):
- kidney: macro ids — renal-cortex, renal-medulla, renal-pelvis, renal-hilum, ureter, renal-artery, renal-vein. For nephron/tubule microstructure also include glomerulus, bowmans-capsule, proximal-convoluted-tubule, loop-of-henle, distal-convoluted-tubule, collecting-duct (shown on nephron inset).
- heart: right-atrium, left-atrium, right-ventricle, left-ventricle, aorta, pulmonary-artery, superior-vena-cava, inferior-vena-cava
- cell: nucleus, nucleolus, mitochondria, membrane, cytoplasm, vacuole
- neuron: soma, nucleus, dendrite, axon, myelin, axon-terminal
- lungs: trachea, bronchus, left-lung, right-lung, alveoli
- brain: cerebrum, frontal-lobe, temporal-lobe, occipital-lobe, parietal-lobe, cerebellum, brainstem
Use exact ids above when possible. Include 6–8 labels with accurate titles + 1–2 sentence teaching details. Keep all prose outside the fence.`,
};

export const BIOLOGY_MODE_PLACEHOLDERS: Record<BiologyMode, string> = {
  graph: 'Name a graph — growth curve, enzyme rate, glucose…',
  diagram: 'Name any biology/medical diagram — photosynthesis, synapse, kidney…',
  sim: 'Name a lab to simulate — osmosis, mitosis…',
  anatomy: 'Name a structure to view in 3D — heart, lungs, brain…',
};

export const BIOLOGY_EMPTY_STATE_HINTS: Record<BiologyMode, string> = {
  graph: 'Describe a relationship — a publication-quality teaching graph appears here.',
  diagram: 'Describe any structure or pathway — a textbook diagram appears here (catalog or generated).',
  sim: 'Describe a process — a polished interactive lab appears here.',
  anatomy: 'Describe a structure — a labeled 3D teaching model appears here.',
};

export const BIOLOGY_MODE_STARTERS: Record<BiologyMode, SubjectPrompts> = {
  graph: [
    'Plot logistic population growth with carrying capacity',
    'Graph Michaelis–Menten enzyme kinetics',
    'Show photosynthetic rate vs light intensity',
    'Plot blood glucose after a meal',
  ],
  diagram: [
    'Show a photosynthesis overview with chloroplast detail',
    'Diagram a neuron and chemical synapse',
    'Show the human digestive tract as a textbook figure',
    'Diagram the renin–angiotensin pathway',
  ],
  sim: [
    'Simulate osmosis with a concentration slider',
    'Simulate mitosis through clear stages',
    'Simulate an action potential along a neuron',
    'Simulate natural selection with two phenotypes',
  ],
  anatomy: [
    'Show a 3D heart with labeled chambers',
    'Open a 3D animal cell with organelles',
    'Show a 3D neuron with dendrites and axon',
    'Show a 3D kidney with cortex, medulla, and nephron inset labels',
  ],
};

/** Default Biology Lab chip — always send this when none is set. */
export const DEFAULT_BIOLOGY_MODE: BiologyMode = 'anatomy';
