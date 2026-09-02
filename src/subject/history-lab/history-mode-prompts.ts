import type { HistoryMode } from '@/types/chat';
import type { SubjectPrompts } from '@/subject/subjects/types';

/**
 * History generate modes - keep in sync with HISTORY_MODE_PROMPTS in
 * supabase/functions/deepseek-chat/index.ts
 */
export const HISTORY_MODE_PROMPTS: Record<HistoryMode, string> = {
  timeline: `The user selected Timeline mode. GENERATE a teaching history timeline/graph now. Do not embed or link PhET, ArcGIS, or any external library.
Write one short intro sentence, then exactly one \`\`\`html fence with a complete document (<!DOCTYPE html>).
CRITICAL: no external scripts or CDNs. All CSS and JS inline.
The page MUST include a chronological timeline or chart with labeled dates, eras, key figures, a legend, and at least one filter/toggle (era, region, or theme) when it aids learning.
Prefer: war timelines, dynasty successions, revolutions, Cold War phases, independence movements, or empire rise/fall.
Caption: "Generated timeline - teaching model; dates are approximate teaching markers."
If the topic is unclear, build a World War I timeline (1914–1918) with major turning points and a theater toggle. Keep JS under 220 lines. Keep all prose outside the fence.`,

  diagram: `The user selected Diagram mode. GENERATE a clear history diagram now. Do not embed or link PhET or external libraries.
Write one short intro sentence, then exactly one \`\`\`html fence with a complete document (<!DOCTYPE html>).
CRITICAL: no external scripts or CDNs. All CSS and JS inline.
Prefer SVG for cause-and-effect chains, feudal pyramids, revolutionary stages, alliance webs, colonial trade triangles, or government structure of a past regime. Label arrows, actors, and dates clearly.
Caption: "Generated diagram - teaching model."
If the topic is unclear, diagram the MAIN long-term and short-term causes of World War I with labeled arrows. Keep JS under 180 lines. Keep all prose outside the fence.`,

  sim: `The user selected Lab (Simulate) mode. GENERATE an interactive history simulation now. Do not embed or link PhET, ArcGIS, or any other library.
Write one short intro sentence, then exactly one \`\`\`html fence with a complete document (<!DOCTYPE html>).
CRITICAL: no external scripts or CDNs. All CSS and JS inline.
The page MUST include Play/Pause, Reset, at least one labeled slider (year, pressure, support, or resources), a canvas or DOM animation of the historical process, and a legend.
Prefer: trench warfare attrition, empire expansion, demographic transition after plague, voting franchise expansion, or Cold War tension meter.
Caption: "Generated simulation - simplified teaching model, not a prediction of real history."
If the topic is unclear, simulate a simplified trench-warfare season with a "supply" slider. Keep JS under 220 lines. Keep all prose outside the fence.`,

  map: `The user selected Map mode. GENERATE an advanced interactive Leaflet teaching map for HISTORY that loads REAL place boundaries via OpenStreetMap Nominatim GeoJSON. Do NOT invent country/island polygons.
Write one short intro sentence, then exactly one \`\`\`html fence with a complete document (<!DOCTYPE html>).

SECTION A — REQUIRED STACK:
- Leaflet 1.9.4 from unpkg (leaflet.css + leaflet.js)
- Base tiles: OpenStreetMap streets + Esri World Imagery (no API key)
- Nominatim for real polygons of places that still exist (REQUIRED for modern country outlines used as teaching frames)
- No Mapbox, Google Maps, or paid API keys
- NEVER hardcode invented coastline rings or bounding-box fills

SECTION B — NOMINATIM (real GeoJSON):
1. Create map + street tiles; status "Loading boundary…"
2. Fetch with ≥1100ms between Nominatim calls:
   const url = 'https://nominatim.openstreetmap.org/search?' + new URLSearchParams({
     q: PLACE_NAME, format: 'json', polygon_geojson: '1', limit: '1'
   });
3. On success: L.geoJSON Feature from results[0].geojson; fitBounds; teaching popup with date context.
4. On failure: status + setView — never invent fake coastlines.
5. Historical empires/fronts that no longer match modern borders: use modern Nominatim region as the frame, then draw teaching polylines/polygons INSIDE that view clearly labeled "approximate historical extent (teaching)" — never claim official surveyed historical borders.

SECTION C — HISTORY MAP TYPES:
1) BATTLE / FRONT: Nominatim theater country/region; orange #EA580C front lines; markers for key battles with year in popup.
2) EMPIRE / TERRITORY: Nominatim core modern states; amber/brown #B45309 teaching extent overlays; legend lists eras.
3) TRADE / ROUTE: geocode waypoints (Silk Road, Atlantic triangle stops, etc.), polyline #0D9488, stop markers with century labels.
4) MIGRATION / DIASPORA: dashed polylines with arrows; origin/destination Nominatim highlights.
5) COMPARE eras: two overlay groups (e.g. 1914 vs 1918 fronts) with L.control.layers.

SECTION D — ADVANCED FEATURES (include ALL):
1) Base layers: Streets + Satellite via L.control.layers
2) Place search box (Nominatim) that replaces highlight layer group
3) Click-to-identify reverse geocode popup (rate-limit ≥1100ms)
4) Measure tool (km) + Clear measure
5) Locate me (optional; fail quietly)
6) L.control.scale metric+imperial
7) Mini facts panel: 2–3 bullets with dates/figures for the topic
8) Year scrubber or era chips when the topic spans time (updates overlay visibility or labels)
9) Loading/error status chip
10) map.invalidateSize() after 200ms and after layers load

SECTION E — PAGE + DESIGN:
- Title bar + learning goal + legend + caption
- #map { width:100%; min-height:520px; height:70vh; z-index:1 }
- Toolbar: Search, Measure, Clear, Locate, era/year controls
- Colors: territory #B45309 | route #0D9488 | front #EA580C | compare #7C3AED
- Caption: "Modern boundaries from OSM/Nominatim; historical extents are simplified teaching overlays — not an official historical atlas."

SECTION F — BUDGET + FALLBACK:
- Keep JS under 420 lines. All prose outside the fence.
- Default if unclear: Nominatim "France" + teaching overlay for WWI Western Front with battle markers (Verdun, Somme) and a 1914–1918 year note.`,
};

export const HISTORY_MODE_PLACEHOLDERS: Record<HistoryMode, string> = {
  timeline: 'Name a timeline - WWI, Cold War, dynasties...',
  diagram: 'Name a diagram - causes, alliances, feudal system...',
  sim: 'Name a lab to simulate - trench war, empire growth...',
  map: 'Name a historical map - fronts, empires, trade routes...',
};

export const HISTORY_EMPTY_STATE_HINTS: Record<HistoryMode, string> = {
  timeline: 'Describe an era or event — a teaching timeline appears here.',
  diagram: 'Describe causes or structures — a labeled history diagram appears here.',
  sim: 'Describe a process — an interactive history lab appears here.',
  map: 'Name a place or campaign — a historical Leaflet map loads here.',
};

export const HISTORY_MODE_STARTERS: Record<HistoryMode, SubjectPrompts> = {
  timeline: [
    'Timeline of World War I turning points',
    'Cold War timeline with major crises',
    'Timeline of the French Revolution stages',
    'Dynasty succession timeline for a chosen empire',
  ],
  diagram: [
    'Diagram the causes of World War I',
    'Show the feudal social pyramid',
    'Diagram alliances before World War I',
    'Cause-and-effect chain of the American Revolution',
  ],
  sim: [
    'Simulate trench warfare with a supply slider',
    'Simulate empire expansion over decades',
    'Simulate Cold War tension with crisis events',
    'Simulate voting rights expansion over time',
  ],
  map: [
    'Map the WWI Western Front with battle markers',
    'Show the Silk Road with geocoded waypoints',
    'Highlight the Roman Empire core on a modern map',
    'Map Atlantic triangular trade stops',
  ],
};

/** Default History Lab chip - always send this when none is set. */
export const DEFAULT_HISTORY_MODE: HistoryMode = 'timeline';
