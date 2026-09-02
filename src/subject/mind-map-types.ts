export type MindElixirNode = {
  id: string;
  topic: string;
  root?: boolean;
  children?: MindElixirNode[];
};

export type MindElixirData = {
  nodeData: MindElixirNode;
  direction?: number;
};

export type ParsedMindMap = {
  data: MindElixirData;
  introText: string;
};
