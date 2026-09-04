/**
 * Shared diagram prompt constants used by all subject labs.
 *
 * Keep in sync with the SUBJECT_DIAGRAM_* constants in
 * supabase/functions/deepseek-chat/index.ts
 */

export const SUBJECT_DIAGRAM_HTML_CONTRACT = `Write one short intro sentence, then exactly one \`\`\`html fence with a complete document (<!DOCTYPE html>).
CRITICAL: fence language MUST be html. All SVG inside <body>. No external scripts, CDNs, or images — all CSS and JS inline.
Footer caption exactly: "Generated teaching figure — simplified model."
Keep JS under 180 lines. Keep all prose outside the fence.`;

export const SUBJECT_DIAGRAM_DESIGN_SYSTEM = `DIAGRAM DESIGN SYSTEM (publication-quality textbook figure):
- Appearance: modern AP-level / university lecture figure — clean, precise, calm. Not a cartoon, rough sketch, or toy UI.
- Page structure: header (title 22–26px semibold + one-line learning goal 14px muted) → white card containing the main SVG figure → optional labeled key/legend sidebar → footer caption.
- Typography: system-ui, -apple-system, Segoe UI, Roboto, sans-serif. Title 22–26px font-weight 650 letter-spacing -0.02em; section/panel headings 13–14px bold uppercase; body labels 11–12px; muted color #64748b.
- Palette: page bg #f1f5f9; card #ffffff; ink #0f172a; muted #64748b; accent teal #0f766e; secondary blue #2563eb; warm amber #b45309; border #e2e8f0; card border-radius 16px; card box-shadow 0 1px 3px rgba(15,23,42,.08).
- SVG conventions: use a viewBox (e.g. "0 0 900 520"); define <marker> arrowheads; use thin leader lines (stroke #94a3b8, stroke-width 1.2) from structures to text labels; never overlap label text; SVG label font-size 11–12px, fill #0f172a; panel title text 13px bold uppercase.
- Layout: use a multi-panel layout (macro overview left, process/detail right) when the topic has two levels of scale; min-height ~560px; static SVG preferred over JS animation for pure diagrams.
- Accessibility: ≥4.5:1 contrast ratio for all text on their background fill; no emoji; no watermarks; no photorealistic imagery.`;

/** Mandatory scientific-accuracy checklist appended to every generated (HTML) diagram prompt. */
export const SUBJECT_DIAGRAM_ACCURACY_RULES = `ACCURACY RULES (verify before output — accuracy over decoration):
- Use standard nomenclature: correct spelling, Latin anatomical terms, SI units, IUPAC symbols, accepted historical dates.
- Every arrow must show the correct direction of flow (blood, nerve signal, energy, causation, material, process stage order).
- Anatomical left/right = patient's left/right; state the view (e.g. "anterior view", "coronal section", "sagittal section").
- Do not invent structures, pathways, or labels you are uncertain about — omit or mark approximate regions with a dashed outline and a short note.
- Spatial relationships and proportions must match standard textbook references even in stylized flat SVG (relative size, adjacency, layer order).
- Include a "Key structures" sidebar (4–8 items) when the figure has ≥4 labels — each with an accurate one-line teaching note.
- Prefer verified app paths over invented geometry: biology catalog JSON (PATH A), Anatomy/Molecule/Field 3D modes, or Map mode for real places.`;

/** Strong catalog-first guidance for biology Diagram PATH A. */
export const BIOLOGY_DIAGRAM_CATALOG_PRIORITY = `CATALOG PRIORITY (most accurate path): Before generating HTML, check if the topic matches a catalog figure — catalog SVG is pre-verified and always preferred over generated HTML.
kidney = whole kidney organ; nephron = tubule/glomerulus pathway; animal_cell = organelles; mitosis = cell-division stages; heart_flow = chambers + major vessels; food_web = ecosystem trophic levels; photosynthesis = chloroplast + light/dark reactions; neuron_synapse = neuron + synapse; digestive_tract = GI organs; respiratory_system = airways + alveoli.
If the user names specific structures to label, include them in labels[] with accurate teaching details.`;

/** Biology PATH B (generated HTML, not catalog JSON). */
export const BIOLOGY_DIAGRAM_ADDENDUM = `Subject focus — biology / medical: prefer multi-panel layout (organism/organ overview left; organelle/process detail right); represent molecules as colored labeled circles (CO₂, H₂O, O₂, glucose, ATP) with directional arrows; use biology greens (#166534 dark, #16a34a mid) for living structures and teal (#0f766e) arrows for flow. Distinguish artery (red toward organ) vs vein (blue away); oxygenated vs deoxygenated blood where relevant. Footer caption for biology/medical figures exactly: "Generated teaching figure — simplified model, not a clinical illustration."`;

export const PHYSICS_DIAGRAM_ADDENDUM = `Subject focus — physics: prefer free-body diagrams (labeled force vectors with correct origin and direction, dashed auxiliary construction lines, SI units on all values), circuit schematics (standard IEC/IEEE symbols, labeled nodes, correct series/parallel topology), or ray optics diagrams (principal axis, focal points, image arrows with correct real/virtual). Force vectors must originate from the correct body surface. Default fallback: free-body diagram of a block on an incline with weight, normal force, and friction vectors.`;

export const CHEMISTRY_DIAGRAM_ADDENDUM = `Subject focus — chemistry: prefer Lewis dot structures (correct electron pairs, octet rule, formal charges shown), curved-arrow reaction mechanisms (electrons move correctly), or labeled cross-section lab apparatus. Bond angles and hybridization must be chemically correct (e.g. H₂O bent ~104.5°, CH₄ tetrahedral). PERIODIC TABLE RULE: never build a full 118-element interactive app — if the topic is periodic trends draw ONLY periods 1–3 (H through Ar) as a static SVG/CSS grid with every cell filled (number + symbol + name), or draw a labeled trend-arrow diagram across those rows. No search UI, no 118-element arrays. Default fallback: Lewis structure of water with lone pairs.`;

export const GEOGRAPHY_DIAGRAM_ADDENDUM = `Subject focus — geography: prefer process cycle diagrams (water cycle, rock cycle, carbon cycle) with correctly ordered stages, cross-section landforms (accurate plate boundary types: constructive/destructive/conservative), or urban/rural land-use concentric ring diagrams. Use directional arrows for flows; earth-tone accents (land green #166534, water blue #1e40af, rock brown #92400e). For real place boundaries use Map mode — do not invent coastlines in Diagram mode. Default fallback: the water cycle with evaporation, condensation, precipitation, and surface runoff.`;

export const HISTORY_DIAGRAM_ADDENDUM = `Subject focus — history: prefer cause-and-effect chain diagrams (rounded-rect nodes with verified dates, weighted directional arrows for significance), social/feudal pyramid diagrams (correct hierarchy order), alliance web graphs (actors as circles, relations as labeled edges), or colonial trade triangle diagrams. Dates must be historically accepted approximations — mark uncertain dates with "c." prefix. Label actors, dates, and historical significance clearly. Default fallback: the long-term and short-term causes of World War I with labeled arrows.`;

export const ENGLISH_DIAGRAM_ADDENDUM = `Subject focus — English / literature: prefer Freytag pyramid diagrams (five labeled stage panels with example text), rhetorical triangle (ethos/pathos/logos), character relationship webs (labeled directed edges), or plot arc stage maps. Use soft tonal fills for stage panels (violet-50 #f5f3ff, sky-50 #f0f9ff, emerald-50 #ecfdf5). Default fallback: Freytag's dramatic pyramid with five labeled stages.`;

export const DZONGKHA_DIAGRAM_ADDENDUM = `Subject focus — Dzongkha grammar: use S-O-V node diagrams only; each node is a rounded rect (stroke #0f766e, fill #f0fdf4, border-radius 8px) with the Uchen token centred (16px) and romanization as a sub-label (11px, color #64748b) below; left-to-right connecting arrows (#0f766e); completed sentence displayed below the node row.`;
