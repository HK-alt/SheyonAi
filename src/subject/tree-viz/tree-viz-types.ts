export const TREE_VIZ_MODES = ['tidy', 'treemap', 'cluster', 'tangled', 'force'] as const;

export type TreeVizMode = (typeof TREE_VIZ_MODES)[number];

export type TreeVizNode = {
  name: string;
  value?: number;
  children?: TreeVizNode[];
  /** Optional group id for tangled-tree coloring. */
  group?: string;
};

export type ParsedTreeViz = {
  introText: string;
  layout: TreeVizMode;
  title: string;
  goal?: string;
  caption?: string;
  root: TreeVizNode;
};

export function isTreeVizMode(value: unknown): value is TreeVizMode {
  return typeof value === 'string' && (TREE_VIZ_MODES as readonly string[]).includes(value);
}
