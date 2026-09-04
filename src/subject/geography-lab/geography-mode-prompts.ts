import type { GeographyMode } from '@/types/chat';
import type { SubjectPrompts } from '@/subject/subjects/types';
import { SCIENCE_GRAPH_JSON_CONTRACT } from '@/subject/science-graph/graph-prompt';
import {
  GEOGRAPHY_DIAGRAM_ADDENDUM,
  SUBJECT_DIAGRAM_ACCURACY_RULES,
  SUBJECT_DIAGRAM_DESIGN_SYSTEM,
  SUBJECT_DIAGRAM_HTML_CONTRACT,
} from '@/subject/diagram-prompt';

/**
 * Geography generate modes - keep in sync with GEOGRAPHY_MODE_PROMPTS in
 * supabase/functions/deepseek-chat/index.ts
 */
export const GEOGRAPHY_MODE_PROMPTS: Record<GeographyMode, string> = {
  graph: `The user selected Graph mode. The app renders an advanced interactive D3 teaching graph from your JSON.
Prefer: temperature vs latitude, rainfall by month (bar), population growth, urbanization %, GDP vs HDI (teaching data OK if labeled approximate).
Always include insights; annotations when thresholds matter. If unclear, use chartType "bar" for monthly rainfall (≥12 points) with insights.
` + SCIENCE_GRAPH_JSON_CONTRACT,

  diagram: `The user selected Diagram mode. GENERATE a publication-quality geography diagram now. Do not embed or link PhET or external libraries.
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
    GEOGRAPHY_DIAGRAM_ADDENDUM,

  sim: `The user selected Lab (Simulate) mode. GENERATE an interactive geography simulation now. Do not embed or link PhET, ArcGIS, or any other library.
Write one short intro sentence, then exactly one \`\`\`html fence with a complete document (<!DOCTYPE html>).
CRITICAL: no external scripts or CDNs. All CSS and JS inline.
The page MUST include Play/Pause, Reset, at least one labeled slider, a canvas or DOM animation of the process, and a legend.
Prefer: coastal erosion, river meander migration, urban sprawl, monsoon moisture transport, or demographic transition stages.
Caption: "Generated simulation - simplified teaching model."
If the topic is unclear, simulate coastal erosion with a wave-energy slider. Keep JS under 220 lines. Keep all prose outside the fence.`,

  map: `The user selected Map mode. GENERATE an advanced interactive Leaflet teaching map that loads REAL place boundaries via OpenStreetMap Nominatim GeoJSON. Do NOT invent country/island polygons.
Write one short intro sentence, then exactly one \`\`\`html fence with a complete document (<!DOCTYPE html>).

SECTION A — REQUIRED STACK:
- Leaflet 1.9.4 from unpkg (leaflet.css + leaflet.js)
- Base tiles: OpenStreetMap streets + optional Esri World Imagery (no API key):
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '(c) OpenStreetMap' })
  L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', { attribution: 'Tiles (c) Esri' })
- Nominatim for real polygons (REQUIRED for countries, states, cities, named places)
- No Mapbox, Google Maps, or paid API keys
- NEVER hardcode invented coastline rings or bounding-box fills for countries/islands

SECTION B — NOMINATIM (real GeoJSON):
1. Create map + street tiles first; status text "Loading boundary…"
2. Fetch (one place at a time; ≥1100ms between Nominatim calls):
   const url = 'https://nominatim.openstreetmap.org/search?' + new URLSearchParams({
     q: PLACE_NAME, format: 'json', polygon_geojson: '1', limit: '1'
   });
   fetch(url, { headers: { 'Accept': 'application/json' } })
3. On success: L.geoJSON({ type:'Feature', properties:{}, geometry: results[0].geojson }, { style }).addTo(map); fitBounds with padding [24,24]; popup with short name + teaching sentence.
4. On failure: status message + setView on lat/lon if available — never invent a fake coastline.
5. Multiple places / route waypoints: sequential Nominatim with delay.

SECTION C — MAP TYPE RULES:
1) POLITICAL: Nominatim polygon ONLY. Style color/fill #0D9488, weight 2, fillOpacity 0.28.
2) PHYSICAL: Nominatim first; if point-only, mark it — no random ocean triangles.
3) THEMATIC: Nominatim region outline; teaching choropleth inside bounds, labeled as teaching zones.
4) ROUTE: geocode waypoints, L.polyline #EA580C, markers, optional animated dashOffset on the line.
5) WIND/CURRENT: Nominatim region, dashed teaching polylines, caption as simplified model.
6) COMPARE: if user asks to compare 2+ places, load each boundary in different fill colors (#0D9488, #EA580C, #7C3AED), shared legend, fitBounds to all.

SECTION D — ADVANCED FEATURES (include ALL of these on every Map page):
1) Base layer control: L.control.layers({ "Streets": osm, "Satellite": esri }, overlays, { collapsed: false }) placed top-right.
2) Place search box (HTML input + Search button above or over the map): on submit, Nominatim q=input, clear previous highlight layer group, add new geojson, fitBounds. Debounce / disable button while loading.
3) Click-to-identify: map.on('click') → reverse geocode
   fetch('https://nominatim.openstreetmap.org/reverse?' + new URLSearchParams({ lat, lon, format:'json' }))
   then open a popup with display_name (respect ≥1100ms since last Nominatim call).
4) Measure tool: toolbar button "Measure" — two clicks draw a temporary L.polyline and show distance in km using map.distance(a,b)/1000 (1 decimal). "Clear measure" resets.
5) Locate me: toolbar button uses navigator.geolocation when available; L.circleMarker + setView zoom 12; fail quietly if denied.
6) Scale: L.control.scale({ imperial: true, metric: true }).addTo(map)
7) Mini facts panel (side or under title): after boundary loads, show 2–3 teaching bullets about the place (AI-written static HTML is fine).
8) Highlight layer group: keep boundaries in an L.layerGroup so search/reload can clear cleanly.
9) Loading / error status chip visible to the learner.
10) setTimeout(function(){ map.invalidateSize(); }, 200) and again after layers load.

SECTION E — PAGE + DESIGN:
- Title bar + learning goal + legend + caption
- #map { width:100%; min-height:520px; height:70vh; z-index:1 }
- Toolbar row: Search input, Search btn, Measure, Clear measure, Locate
- Colors: political #0D9488 | route #EA580C | compare-2 #7C3AED | water accents #0369A1
- Caption: "Boundaries from OpenStreetMap/Nominatim — teaching map, not an official survey."

SECTION F — BUDGET + FALLBACK:
- Keep JS under 420 lines. All prose outside the fence.
- Default if topic unclear: load France via Nominatim with full advanced toolbar, then geocode Paris as a marker.`,

};

export const GEOGRAPHY_MODE_PLACEHOLDERS: Record<GeographyMode, string> = {
  graph: 'Name a graph - rainfall, population, climate...',
  diagram: 'Name a diagram - water cycle, plates, rock cycle...',
  sim: 'Name a lab to simulate - erosion, urban growth...',
  map: 'Search a place — real boundary, satellite, measure...',
};

export const GEOGRAPHY_EMPTY_STATE_HINTS: Record<GeographyMode, string> = {
  graph: 'Describe a relationship - a teaching geography graph appears here.',
  diagram: 'Name the process cycle or landform — e.g. water cycle, plate boundary. Use Map mode for real places.',
  sim: 'Describe a process - an interactive geography lab appears here.',
  map: 'Name a place — real boundary plus search, satellite, and measure tools.',
};

export const GEOGRAPHY_MODE_STARTERS: Record<GeographyMode, SubjectPrompts> = {
  graph: [
    'Plot average monthly rainfall for a monsoon climate',
    'Graph population growth of a megacity over time',
    'Show temperature vs latitude for a teaching dataset',
    'Plot urbanization rate for selected world regions',
  ],
  diagram: [
    'Diagram the water cycle with labeled arrows',
    'Show plate boundaries: divergent, convergent, transform',
    'Diagram the rock cycle',
    'Show a river long profile from source to mouth',
  ],
  sim: [
    'Simulate coastal erosion with a wave-energy slider',
    'Simulate urban sprawl over decades',
    'Simulate river meander migration',
    'Simulate monsoon moisture transport',
  ],
  map: [
    'Highlight Japan with search, satellite, and measure tools',
    'Compare Japan and South Korea boundaries on one map',
    'Map a Silk Road route with geocoded waypoints',
    'Show India — click map to identify places',
  ],
};

/** Default Geography Lab chip - always send this when none is set. */
export const DEFAULT_GEOGRAPHY_MODE: GeographyMode = 'map';
