import type { TreeVizMode } from '@/subject/tree-viz/tree-viz-types';

/**
 * Shared JSON contract for Tools → D3 tree visualizations.
 * Keep client prompts and deepseek-chat Edge Function in sync.
 */
export const TREE_VIZ_JSON_CONTRACT = `Reply with one short intro sentence, then exactly one \`\`\`json fence (no HTML). Fence language MUST be json.

JSON schema (hierarchy for an app-owned D3 viewer):
{
  "layout": "tidy" | "treemap" | "cluster" | "tangled" | "force",
  "title": "string",
  "goal": "one-line learning goal",
  "caption": "Generated tree — teaching model.",
  "name": "Root label",
  "value": 1,
  "children": [
    { "name": "Child", "value": 1, "group": "optional", "children": [] }
  ]
}

RULES:
- layout MUST match the selected Tools visualization mode.
- Build a real teaching hierarchy for the user's topic (depth 2–4, ≥6 leaves).
- Every node needs a non-empty "name". Leaves should include numeric "value" ≥ 1 (required for treemap; useful elsewhere).
- Optional "group" strings help tangled/force coloring (e.g. categories).
- Never emit HTML or D3 code — JSON only inside the fence. Prose stays outside.`;

export const TREE_VIZ_SCHEMA_EXAMPLE = `{"layout":"tidy","title":"Cell hierarchy","goal":"See how organelles nest under cell types","caption":"Generated tree — teaching model.","name":"Cell","value":10,"children":[{"name":"Eukaryotic","value":6,"group":"euk","children":[{"name":"Nucleus","value":2},{"name":"Mitochondria","value":2},{"name":"ER","value":2}]},{"name":"Prokaryotic","value":4,"group":"pro","children":[{"name":"Nucleoid","value":2},{"name":"Ribosomes","value":2}]}]}`;

export const TREE_VIZ_MODE_PLACEHOLDERS: Record<TreeVizMode, string> = {
  tidy: 'Describe a topic for a tidy tree…',
  treemap: 'Describe a topic for a treemap…',
  cluster: 'Describe a topic for a cluster dendrogram…',
  tangled: 'Describe a topic for a tangled tree…',
  force: 'Describe a topic for a force-directed tree…',
};

export const TREE_VIZ_MODE_LABELS: Record<TreeVizMode, string> = {
  tidy: 'Tidy tree',
  treemap: 'Treemap',
  cluster: 'Cluster dendrogram',
  tangled: 'Tangled tree',
  force: 'Force-directed tree',
};

export const TREE_VIZ_MODE_SUBTITLES: Record<TreeVizMode, string> = {
  tidy: 'Classic indented hierarchy',
  treemap: 'Nested rectangles',
  cluster: 'Even leaf spacing dendrogram',
  tangled: 'Layered hierarchy with curved links',
  force: 'Physics layout along tree links',
};

export function buildTreeVizModePrompt(mode: TreeVizMode): string {
  const label = TREE_VIZ_MODE_LABELS[mode];
  return `The user selected Tools → ${label} (layout "${mode}").
${TREE_VIZ_JSON_CONTRACT}

Set "layout" to "${mode}" exactly. Example shape:
${TREE_VIZ_SCHEMA_EXAMPLE}`;
}
