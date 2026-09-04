import type { PhysicsMode } from '@/types/chat';
import type { SubjectPrompts } from '@/subject/subjects/types';
import { SCIENCE_GRAPH_JSON_CONTRACT } from '@/subject/science-graph/graph-prompt';
import {
  PHYSICS_DIAGRAM_ADDENDUM,
  SUBJECT_DIAGRAM_ACCURACY_RULES,
  SUBJECT_DIAGRAM_DESIGN_SYSTEM,
  SUBJECT_DIAGRAM_HTML_CONTRACT,
} from '@/subject/diagram-prompt';

/**
 * Physics generate modes — keep in sync with PHYSICS_MODE_PROMPTS in
 * supabase/functions/deepseek-chat/index.ts
 */
export const PHYSICS_MODE_PROMPTS: Record<PhysicsMode, string> = {
  graph: `The user selected Graph mode. The app renders an advanced interactive D3 teaching graph from your JSON.
Prefer projectile x–t / y–t, v–t, I–V curves, or energy vs time. Use SI units on axes; dual yAxisRight when comparing different units.
Always include annotations + insights. If unclear, use multiLine for projectile x–t and y–t (≥48 points each) or a quadratic/sine model with a slider.
NEVER use modelId, sceneId, or moleculeId in Graph mode — always use chartType.
` + SCIENCE_GRAPH_JSON_CONTRACT,
  diagram: `The user selected Diagram mode. GENERATE a publication-quality physics diagram now. Do not embed or link PhET or external libraries.
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
    PHYSICS_DIAGRAM_ADDENDUM,
  sim: `The user selected Lab (Simulate) mode. GENERATE an interactive physics simulation now. Do not embed or link PhET, LabXchange, or any other library.
Write one short intro sentence, then exactly one \`\`\`html fence with a complete document (<!DOCTYPE html>).
CRITICAL: no external scripts or CDNs. All CSS and JS inline.
The page MUST include Play/Pause, Reset, at least one labeled slider, a canvas or DOM animation of the process, and a legend.
Caption: "Generated simulation — simplified teaching model."
If the topic is unclear, simulate projectile motion with angle and speed sliders. Keep JS under 220 lines. Keep all prose outside the fence.`,
  field: `The user selected Field 3D mode. Do not generate HTML, canvas sketches, Three.js, or links to PhET or YouTube.
The app loads a curated procedural 3D teaching scene. You only pick the scene and write labels.
Write one short intro sentence. If the request is not in the catalog, pick the closest scene and say so in that sentence.
Then exactly one \`\`\`json fence with this object:
{"sceneId":"orbit","title":"...","focus":"orbital plane","params":{"mass":1,"semiMajor":3},"labels":[{"id":"central-body","title":"Central body","detail":"..."}]}
sceneId MUST be one of: orbit, gravity_well, electric_dipole, uniform_e_field, magnetic_bar, charged_particle, kepler, projectile_motion
Include 3–6 labels. Keep params numeric when useful (mass, semiMajor, eccentricity, charge, fieldStrength, velocity). Keep all prose outside the fence.`,
};

export const PHYSICS_MODE_PLACEHOLDERS: Record<PhysicsMode, string> = {
  graph: 'Name a graph to plot — x–t, v–t, I–V, energy…',
  diagram: 'Name a diagram — free-body, circuit, ray optics…',
  sim: 'Name a process to simulate — projectile, spring, collision…',
  field: 'Name a 3D scene — orbit, E-field, magnetic bar…',
};

export const PHYSICS_EMPTY_STATE_HINTS: Record<PhysicsMode, string> = {
  graph: 'Describe a relationship — a generated teaching graph appears here.',
  diagram: 'Name the setup and forces to label — e.g. free-body on incline, circuit, ray optics. Use Field 3D for orbits and fields.',
  sim: 'Describe a process — a generated interactive lab appears here.',
  field: 'Describe a field or orbit — a 3D teaching scene appears here.',
};

export const PHYSICS_MODE_STARTERS: Record<PhysicsMode, SubjectPrompts> = {
  graph: [
    'Plot projectile motion height vs time',
    'Graph velocity–time for constant acceleration',
    'Show an I–V curve for an ohmic resistor',
    'Plot kinetic and potential energy vs time for a pendulum',
  ],
  diagram: [
    'Draw a free-body diagram of a block on an incline',
    'Diagram a series–parallel circuit with two resistors',
    'Show a ray diagram for a concave mirror',
    'Diagram elastic collision momentum arrows',
  ],
  sim: [
    'Simulate projectile motion with angle and speed',
    'Simulate a mass–spring oscillator with damping',
    'Simulate a simple DC circuit with a rheostat',
    'Simulate elastic and inelastic collisions',
  ],
  field: [
    'Show a 3D projectile trajectory with labels',
    'Show a 3D planetary orbit with labels',
    'Open a 3D electric dipole field',
    'Show Kepler orbits around a central mass',
  ],
};

/** Default Physics Lab chip — always send this when none is set. */
export const DEFAULT_PHYSICS_MODE: PhysicsMode = 'graph';
