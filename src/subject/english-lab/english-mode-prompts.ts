import type { EnglishMode } from '@/types/chat';
import type { SubjectPrompts } from '@/subject/subjects/types';

/**
 * English generate modes - keep in sync with ENGLISH_MODE_PROMPTS in
 * supabase/functions/deepseek-chat/index.ts
 */
export const ENGLISH_MODE_PROMPTS: Record<EnglishMode, string> = {
  essay: `The user selected Essay mode. GENERATE an interactive writing workshop page now. Do not embed or link external libraries.
Write one short intro sentence, then exactly one \`\`\`html fence with a complete document (<!DOCTYPE html>).
CRITICAL: no external scripts or CDNs. All CSS and JS inline.
The page MUST include: a clear prompt/thesis box, structured outline (intro / body / conclusion) the learner can edit, a sample paragraph or model sentence bank, a checklist for thesis/evidence/transitions/conclusion, and a simple word-count or rubric score panel (teaching rubric OK).
Prefer: argumentative essay, literary analysis paragraph, narrative opening, PEEL/TEEL paragraph builders, or college application personal statement scaffolds.
Caption: "Generated writing workshop - teaching model; revise in your own voice."
If the topic is unclear, build a PEEL paragraph workshop on "Should schools start later?" Keep JS under 220 lines. Keep all prose outside the fence.`,

  diagram: `The user selected Diagram mode. GENERATE a clear English / literature diagram now. Do not embed or link external libraries.
Write one short intro sentence, then exactly one \`\`\`html fence with a complete document (<!DOCTYPE html>).
CRITICAL: no external scripts or CDNs. All CSS and JS inline.
Prefer SVG for plot arcs (exposition→climax→resolution), character relationship webs, rhetorical triangle (ethos/pathos/logos), Freytag pyramid, theme webs, or sentence structure trees. Label parts clearly.
Caption: "Generated diagram - teaching model."
If the topic is unclear, diagram Freytag's pyramid for a short story with labeled stages. Keep JS under 180 lines. Keep all prose outside the fence.`,

  sim: `The user selected Lab (Practice) mode. GENERATE an interactive English practice lab now. Do not embed or link external libraries.
Write one short intro sentence, then exactly one \`\`\`html fence with a complete document (<!DOCTYPE html>).
CRITICAL: no external scripts or CDNs. All CSS and JS inline.
The page MUST include Check / Next / Reset, immediate feedback, a score counter, and at least one difficulty or topic toggle.
Prefer: subject–verb agreement drills, comma splice fixes, vocabulary in context, active vs passive voice converters, or quotation punctuation practice.
Caption: "Generated practice lab - simplified teaching model."
If the topic is unclear, run a 6-question subject–verb agreement quiz with explanations. Keep JS under 220 lines. Keep all prose outside the fence.`,

  map: `The user selected Map mode. GENERATE an advanced interactive Leaflet teaching map for ENGLISH / LITERATURE that loads REAL place boundaries via OpenStreetMap Nominatim GeoJSON. Do NOT invent country/island polygons.
Write one short intro sentence, then exactly one \`\`\`html fence with a complete document (<!DOCTYPE html>).

SECTION A — REQUIRED STACK:
- Leaflet 1.9.4 from unpkg (leaflet.css + leaflet.js)
- Base tiles: OpenStreetMap streets + Esri World Imagery (no API key)
- Nominatim for real polygons/points of literary settings, author hometowns, journey stops
- No Mapbox, Google Maps, or paid API keys
- NEVER hardcode invented coastline rings or bounding-box fills

SECTION B — NOMINATIM (real GeoJSON):
1. Create map + street tiles; status "Loading place…"
2. Fetch with ≥1100ms between Nominatim calls:
   const url = 'https://nominatim.openstreetmap.org/search?' + new URLSearchParams({
     q: PLACE_NAME, format: 'json', polygon_geojson: '1', limit: '1'
   });
3. On success: L.geoJSON Feature from results[0].geojson (or marker if point-only); fitBounds; popup with work title + 1 teaching sentence about the setting.
4. On failure: status + setView — never invent fake coastlines.
5. Fictional places (Narnia, Middle-earth): do NOT invent geography as real OSM borders; instead map the real-world inspiration region (e.g. Oxfordshire, New Zealand filming locales) and label clearly "real-world inspiration / filming region — fictional setting."

SECTION C — LITERARY MAP TYPES:
1) SETTING: Nominatim city/region of a novel/play; teal #0D9488 highlight; markers for key scenes with short quotes (teaching length).
2) AUTHOR JOURNEY: geocode stops in an author's life or a character's travel; polyline #7C3AED; year/chapter labels.
3) COMPARE settings: 2+ works/places in different colors with layer control.
4) CANON TOUR: markers for major works' primary settings with popups.

SECTION D — ADVANCED FEATURES (include ALL):
1) Base layers: Streets + Satellite via L.control.layers
2) Place search box (Nominatim)
3) Click-to-identify reverse geocode (rate-limit ≥1100ms)
4) Measure tool (km) + Clear
5) Locate me (optional; fail quietly)
6) L.control.scale
7) Mini facts panel: 2–3 literary bullets (author, year, theme/setting note)
8) Quote chips or scene list that flyTo markers when clicked
9) Loading/error status chip
10) map.invalidateSize() after 200ms and after layers load

SECTION E — PAGE + DESIGN:
- Title bar + learning goal + legend + caption
- #map { width:100%; min-height:520px; height:70vh; z-index:1 }
- Toolbar: Search, Measure, Clear, Locate
- Colors: setting #0D9488 | journey #7C3AED | compare #EA580C
- Caption: "Places from OpenStreetMap/Nominatim — literary teaching map, not a scholarly gazetteer."

SECTION F — BUDGET + FALLBACK:
- Keep JS under 420 lines. All prose outside the fence.
- Default if unclear: Nominatim "Stratford-upon-Avon" + markers for Shakespeare-related sites and a short facts panel.`,
};

export const ENGLISH_MODE_PLACEHOLDERS: Record<EnglishMode, string> = {
  essay: 'Name a writing task - essay, PEEL paragraph, outline...',
  diagram: 'Name a diagram - plot arc, character web, rhetoric...',
  sim: 'Name a practice lab - grammar, vocab, punctuation...',
  map: 'Name a literary place - Stratford, Odyssey stops...',
};

export const ENGLISH_EMPTY_STATE_HINTS: Record<EnglishMode, string> = {
  essay: 'Describe a writing goal — an interactive workshop appears here.',
  diagram: 'Describe a text structure — a labeled English diagram appears here.',
  sim: 'Describe a skill to practice — an interactive English lab appears here.',
  map: 'Name a literary setting — a Leaflet map of real places loads here.',
};

export const ENGLISH_MODE_STARTERS: Record<EnglishMode, SubjectPrompts> = {
  essay: [
    'Build a PEEL paragraph workshop on school start times',
    'Outline a five-paragraph argumentative essay',
    'Create a literary analysis paragraph scaffold',
    'Workshop a college personal statement opening',
  ],
  diagram: [
    'Diagram Freytag’s pyramid for a short story',
    'Show a character relationship web for a novel',
    'Diagram the rhetorical triangle',
    'Map themes in a chosen poem as a web',
  ],
  sim: [
    'Practice subject–verb agreement with feedback',
    'Fix comma splices in six sentences',
    'Convert passive voice to active voice',
    'Vocabulary-in-context quiz for SAT words',
  ],
  map: [
    'Map Shakespeare’s Stratford and London sites',
    'Trace Odysseus’s journey stops on a real map',
    'Highlight settings from To Kill a Mockingbird',
    'Map Dickens’s London landmarks from a novel',
  ],
};

/** Default English Lab chip - always send this when none is set. */
export const DEFAULT_ENGLISH_MODE: EnglishMode = 'essay';
