/**
 * Shared JSON contract for Graph / Timeline modes.
 * Keep client prompts and deepseek-chat Edge Function in sync.
 */
export const SCIENCE_GRAPH_JSON_CONTRACT = `Reply with one short intro sentence, then exactly one \`\`\`json fence (no HTML). Fence language MUST be json.

JSON schema (advanced teaching figure):
{
  "chartType": "line" | "multiLine" | "area" | "bar" | "scatter" | "timeline",
  "title": "string",
  "goal": "one-line learning goal",
  "caption": "Generated graph — teaching model.",
  "xAxis": { "label": "string", "unit": "optional" },
  "yAxis": { "label": "string", "unit": "optional" },
  "yAxisRight": { "label": "string", "unit": "optional" },
  "series": [{
    "id": "s1", "label": "Series name", "color": "#0f766e",
    "yAxis": "left" | "right",
    "dash": "solid" | "dashed" | "dotted",
    "markers": false,
    "points": [[x,y], ...]
  }],
  "annotations": [{ "id": "a1", "label": "K", "y": 100, "color": "#b45309", "detail": "carrying capacity" }],
  "insights": ["Bullet teaching takeaway 1", "Bullet 2"],
  "events": [{
    "id": "e1", "label": "Event", "start": 1914, "end": 1918,
    "detail": "1–2 sentence teaching note", "category": "Western Front",
    "importance": 1
  }],
  "eras": [{ "id": "era1", "label": "Early war", "start": 1914, "end": 1915, "color": "#e0f2fe" }],
  "controls": [{ "id": "K", "label": "Carrying capacity K", "min": 50, "max": 200, "step": 5, "value": 100 }],
  "model": { "type": "logistic" | "michaelisMenten" | "linear" | "exponential" | "quadratic" | "sine" | "power", "params": { } }
}

ADVANCE RULES (follow all that apply):
- Graphs: prefer multiLine or area with ≥2 series when comparing cases; ≥48 points per continuous series OR a live model.
- Include 1–3 annotations (threshold, Vmax asymptote, equilibrium, peak, etc.) when they aid learning.
- Include 2–4 insights bullets that teach what the shape means (not just "the graph shows growth").
- Use dual yAxisRight only when units genuinely differ (e.g. position vs velocity).
- Timelines: ≥8 events with categories, importance 1–5 for key turning points, and 2–4 eras[] bands.
- Timeline details must be teaching-quality (cause/effect or significance), not one-word labels.
- model params: logistic N0,K,r,tMax; michaelisMenten Vmax,Km,sMax; linear m,b,xMin,xMax; exponential a,k,xMin,xMax; quadratic a,b,c,xMin,xMax; sine A,omega,phi,offset,xMin,xMax; power a,k,xMin,xMax.
- When using model + controls, control ids MUST match model param keys so sliders recompute the curve.
- Keep all prose outside the fence. Never emit HTML for this mode.`;

export const SCIENCE_GRAPH_SCHEMA_EXAMPLE_LINE = `{"chartType":"line","title":"Logistic population growth","goal":"See how carrying capacity K and growth rate r shape the S-curve","caption":"Generated graph — teaching model.","xAxis":{"label":"Time","unit":"years"},"yAxis":{"label":"Population N","unit":"individuals"},"controls":[{"id":"K","label":"Carrying capacity K","min":50,"max":200,"step":5,"value":100},{"id":"r","label":"Growth rate r","min":0.1,"max":0.8,"step":0.05,"value":0.35}],"model":{"type":"logistic","params":{"N0":10,"K":100,"r":0.35,"tMax":40}},"annotations":[{"id":"k-line","label":"K","y":100,"color":"#b45309","detail":"Carrying capacity — growth slows as N approaches K"}],"insights":["Early growth looks exponential while N ≪ K.","Near K, the curve flattens as resources limit births.","Larger r reaches the plateau sooner; K sets the final level."]}`;

export const SCIENCE_GRAPH_SCHEMA_EXAMPLE_TIMELINE = `{"chartType":"timeline","title":"World War I major turning points","goal":"Place key events on a teaching timeline across theaters","caption":"Generated timeline — teaching model; dates are approximate teaching markers.","eras":[{"id":"early","label":"Mobilization","start":1914,"end":1915,"color":"#e0f2fe"},{"id":"attrition","label":"Attrition","start":1916,"end":1917,"color":"#fef3c7"},{"id":"endgame","label":"Endgame","start":1918,"end":1918,"color":"#dcfce7"}],"events":[{"id":"sarajevo","label":"Assassination at Sarajevo","start":1914,"detail":"Trigger crisis that opened the July diplomatic spiral.","category":"Origins","importance":5},{"id":"marne","label":"First Marne","start":1914,"detail":"Stopped the German advance; trench stalemate begins.","category":"Western Front","importance":4},{"id":"gallipoli","label":"Gallipoli campaign","start":1915,"end":1916,"detail":"Failed Allied attempt to open the Dardanelles.","category":"Other theaters","importance":3},{"id":"somme","label":"Battle of the Somme","start":1916,"end":1916,"detail":"Attrition offensive with huge casualties for limited gains.","category":"Western Front","importance":5},{"id":"us-entry","label":"US enters the war","start":1917,"detail":"Fresh manpower and industry tip the balance toward the Allies.","category":"Diplomacy","importance":5},{"id":"revolution","label":"Russian revolutions","start":1917,"detail":"Political collapse that led Russia toward exit.","category":"Eastern Front","importance":4},{"id":"kaiserschlacht","label":"Spring Offensive","start":1918,"detail":"Last major German push before Allied counterattacks.","category":"Western Front","importance":4},{"id":"armistice","label":"Armistice","start":1918,"detail":"Fighting ends 11 November; peace talks follow.","category":"End","importance":5}],"insights":["Categories separate theaters so you can filter one storyline.","Importance highlights turning points vs supporting events.","Eras show phases: open war → attrition → endgame."]}`;
