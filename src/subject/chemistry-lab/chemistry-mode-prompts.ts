import type { ChemistryMode } from '../../types/chat';
import type { SubjectPrompts } from '../subjects/types';
import { SCIENCE_GRAPH_JSON_CONTRACT } from '@/subject/science-graph/graph-prompt';
import {
  CHEMISTRY_DIAGRAM_ADDENDUM,
  SUBJECT_DIAGRAM_ACCURACY_RULES,
  SUBJECT_DIAGRAM_DESIGN_SYSTEM,
  SUBJECT_DIAGRAM_HTML_CONTRACT,
} from '@/subject/diagram-prompt';

/**
 * Chemistry generate modes — keep in sync with CHEMISTRY_MODE_PROMPTS in
 * supabase/functions/deepseek-chat/index.ts
 */
export const CHEMISTRY_MODE_PROMPTS: Record<ChemistryMode, string> = {
  graph: `The user selected Graph mode. The app renders an advanced interactive D3 teaching graph from your JSON.
Prefer titration curves (pH vs volume), rate vs concentration, reaction energy profiles, or solubility curves.
Always include annotations (e.g. equivalence point) + insights. If unclear, emit a titration line/area series with ≥48 points and labeled axes.
` + SCIENCE_GRAPH_JSON_CONTRACT,
  diagram: `The user selected Diagram mode. GENERATE a publication-quality chemistry diagram now. Do not embed or link PhET or external libraries.
` +
    SUBJECT_DIAGRAM_HTML_CONTRACT +
    `

` +
    SUBJECT_DIAGRAM_DESIGN_SYSTEM +
    `

` +
    SUBJECT_DIAGRAM_ACCURACY_RULES +
    `

` +
    CHEMISTRY_DIAGRAM_ADDENDUM,
  sim: `The user selected Lab (Simulate) mode. GENERATE an interactive chemistry simulation now. Do not embed or link PhET, LabXchange, or any other library.
Write one short intro sentence, then exactly one \`\`\`html fence with a complete document (<!DOCTYPE html>).
CRITICAL: no external scripts or CDNs. All CSS and JS inline.
VISIBILITY: high-contrast colors; animated particles/labels must stay readable on the background.
Do NOT generate a full periodic table app. Prefer acid–base titration, equilibrium Le Chatelier shift, gas laws, or collision theory.
The page MUST include Play/Pause, Reset, at least one labeled slider, a canvas or DOM animation of the process, and a legend.
Caption: "Generated simulation — simplified teaching model."
If the topic is unclear, simulate an acid–base titration with volume and concentration sliders. Keep JS under 220 lines. Keep all prose outside the fence.`,
  molecule: `The user selected Molecule 3D mode. CRITICAL: Do NOT generate HTML, SVG, canvas, Three.js, Markdown tables, or ASCII art. Never use a \`\`\`html fence.
The app already has a procedural 3D viewer. You ONLY pick a catalog molecule and labels.
Write one short intro sentence (no code). If the request is not in the catalog, pick the closest moleculeId and say so in that sentence.
Then exactly one \`\`\`json fence and nothing else after it:
{"moleculeId":"water","title":"Water","focus":"oxygen","params":{},"labels":[{"id":"oxygen","title":"Oxygen","detail":"Central atom with two lone pairs."},{"id":"h1","title":"Hydrogen","detail":"Bonded H atom."},{"id":"h2","title":"Hydrogen","detail":"Bonded H atom."}]}
moleculeId MUST be one of: water, methane, ammonia, co2, ethanol, benzene, acetic_acid, glucose
Include 3–6 labels. Keep params numeric when useful. Keep all prose outside the fence.`,
};

export const CHEMISTRY_MODE_PLACEHOLDERS: Record<ChemistryMode, string> = {
  graph: 'Name a graph — titration, rate, energy profile…',
  diagram: 'Name a diagram — Lewis, mechanism, apparatus…',
  sim: 'Name a process to simulate — titration, equilibrium…',
  molecule: 'Name a molecule to view in 3D — water, methane…',
};

export const CHEMISTRY_EMPTY_STATE_HINTS: Record<ChemistryMode, string> = {
  graph: 'Describe a relationship — a generated teaching graph appears here.',
  diagram: 'Name the structure and bonds to show — Lewis, mechanism, apparatus. Use Molecule 3D for spatial models.',
  sim: 'Describe a process — a generated interactive lab appears here.',
  molecule: 'Name a molecule — a 3D teaching model appears here.',
};

export const CHEMISTRY_MODE_STARTERS: Record<ChemistryMode, SubjectPrompts> = {
  graph: [
    'Plot a strong acid–strong base titration curve',
    'Graph reaction rate vs reactant concentration',
    'Show an exothermic reaction energy profile',
    'Plot solubility of a salt vs temperature',
  ],
  diagram: [
    'Draw the Lewis structure of CO₂',
    'Diagram an SN2 mechanism with curly arrows',
    'Show a simple distillation apparatus',
    'Show periods 1–3 of the periodic table with labels',
  ],
  sim: [
    'Simulate an acid–base titration with indicators',
    'Simulate Le Chatelier shift for N₂ + 3H₂ ⇌ 2NH₃',
    'Simulate Boyle’s law with a piston',
    'Simulate particle collisions and activation energy',
  ],
  molecule: [
    'Show a 3D water molecule with labels',
    'Open a 3D methane tetrahedron',
    'Show 3D benzene with carbon labels',
    'Show 3D ethanol with functional group labels',
  ],
};

/** Default Chemistry Lab chip — Molecule 3D so chemistry opens on the 3D viewer. */
export const DEFAULT_CHEMISTRY_MODE: ChemistryMode = 'molecule';
