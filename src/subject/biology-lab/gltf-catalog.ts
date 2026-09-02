export const ANATOMY_MODEL_IDS = [
  'heart',
  'lungs',
  'brain',
  'stomach',
  'kidney',
  'cell',
  'neuron',
  'skeleton',
  'liver',
  'spleen',
  'pancreas',
  'spinal-cord',
  'bladder',
] as const;

export type AnatomyModelId = (typeof ANATOMY_MODEL_IDS)[number];

export type GltfCatalogEntry = {
  id: AnatomyModelId;
  title: string;
  /** HTTPS GLB (HuBMAP HRA, CC BY 4.0). Used by the WebView/blob viewer. */
  remoteUrl?: string;
  /** Procedural teaching mesh when no photoreal GLB ships. */
  procedural?: 'cell' | 'neuron';
  /** Shown when this id is a closest-match stand-in. */
  closestNote?: string;
  attribution: string;
};

const HRA = 'HuBMAP Human Reference Atlas (CC BY 4.0)';
const HRA_BASE = 'https://cdn.humanatlas.io/digital-objects/ref-organ';

export const GLTF_CATALOG: Record<AnatomyModelId, GltfCatalogEntry> = {
  heart: {
    id: 'heart',
    title: 'Heart',
    remoteUrl: `${HRA_BASE}/heart-male/v1.3/assets/3d-vh-m-heart.glb`,
    attribution: HRA,
  },
  lungs: {
    id: 'lungs',
    title: 'Lungs',
    remoteUrl: `${HRA_BASE}/lung-male/v1.4/assets/3d-vh-m-lung.glb`,
    attribution: HRA,
  },
  brain: {
    id: 'brain',
    title: 'Brain',
    remoteUrl: `${HRA_BASE}/brain-male/v1.4/assets/3d-allen-m-brain.glb`,
    attribution: HRA,
  },
  stomach: {
    id: 'stomach',
    title: 'Small intestine',
    remoteUrl: `${HRA_BASE}/small-intestine-male/v1.2/assets/3d-vh-m-small-intestine.glb`,
    closestNote: 'Closest bundled digestive model is the small intestine.',
    attribution: HRA,
  },
  kidney: {
    id: 'kidney',
    title: 'Kidney',
    remoteUrl: `${HRA_BASE}/kidney-male-left/v1.3/assets/3d-vh-m-kidney-l.glb`,
    attribution: HRA,
  },
  cell: {
    id: 'cell',
    title: 'Animal cell',
    procedural: 'cell',
    attribution: 'Generated teaching mesh',
  },
  neuron: {
    id: 'neuron',
    title: 'Neuron',
    procedural: 'neuron',
    attribution: 'Generated teaching mesh',
  },
  skeleton: {
    id: 'skeleton',
    title: 'Pelvis',
    remoteUrl: `${HRA_BASE}/pelvis-male/v1.3/assets/3d-vh-m-pelvis.glb`,
    closestNote: 'Closest bundled skeletal model is the pelvis.',
    attribution: HRA,
  },
  liver: {
    id: 'liver',
    title: 'Liver',
    remoteUrl: `${HRA_BASE}/liver-male/v1.2/assets/3d-vh-m-liver.glb`,
    attribution: HRA,
  },
  spleen: {
    id: 'spleen',
    title: 'Spleen',
    remoteUrl: `${HRA_BASE}/spleen-male/v1.3/assets/3d-vh-m-spleen.glb`,
    attribution: HRA,
  },
  pancreas: {
    id: 'pancreas',
    title: 'Pancreas',
    remoteUrl: `${HRA_BASE}/pancreas-male/v1.3/assets/3d-vh-m-pancreas.glb`,
    attribution: HRA,
  },
  'spinal-cord': {
    id: 'spinal-cord',
    title: 'Spinal cord',
    remoteUrl: `${HRA_BASE}/spinal-cord-male/v1.1/assets/3d-vh-m-spinal-cord.glb`,
    attribution: HRA,
  },
  bladder: {
    id: 'bladder',
    title: 'Urinary bladder',
    remoteUrl: `${HRA_BASE}/urinary-bladder-male/v1.2/assets/3d-vh-m-urinary-bladder.glb`,
    attribution: HRA,
  },
};

const ALIASES: Record<string, AnatomyModelId> = {
  heart: 'heart',
  cardiac: 'heart',
  ventricle: 'heart',
  atrium: 'heart',
  lungs: 'lungs',
  lung: 'lungs',
  pulmonary: 'lungs',
  brain: 'brain',
  cortex: 'brain',
  cerebrum: 'brain',
  cerebellum: 'brain',
  stomach: 'stomach',
  intestine: 'stomach',
  gut: 'stomach',
  digestive: 'stomach',
  colon: 'stomach',
  kidney: 'kidney',
  nephron: 'kidney',
  renal: 'kidney',
  cell: 'cell',
  organelle: 'cell',
  mitochondria: 'cell',
  mitochondrion: 'cell',
  nucleus: 'cell',
  neuron: 'neuron',
  axon: 'neuron',
  dendrite: 'neuron',
  nerve: 'neuron',
  synapse: 'neuron',
  skeleton: 'skeleton',
  skull: 'skeleton',
  bone: 'skeleton',
  pelvis: 'skeleton',
  hip: 'skeleton',
  liver: 'liver',
  hepatic: 'liver',
  spleen: 'spleen',
  pancreas: 'pancreas',
  'spinal-cord': 'spinal-cord',
  spinal: 'spinal-cord',
  spine: 'spinal-cord',
  bladder: 'bladder',
};

const ID_SET = new Set<string>(ANATOMY_MODEL_IDS);

export function isAnatomyModelId(value: string): value is AnatomyModelId {
  return ID_SET.has(value);
}

/** Map a tutor modelId (or free text) onto a catalog id. */
export function resolveAnatomyModelId(raw: string | undefined | null): AnatomyModelId {
  const key = (raw ?? '').trim().toLowerCase().replace(/\s+/g, '-');
  if (isAnatomyModelId(key)) return key;
  if (ALIASES[key]) return ALIASES[key];
  for (const [alias, id] of Object.entries(ALIASES)) {
    if (key.includes(alias)) return id;
  }
  return 'cell';
}

export function getAnatomyCatalogEntry(id: AnatomyModelId): GltfCatalogEntry {
  return GLTF_CATALOG[id];
}

export const ANATOMY_MODEL_ID_LIST = ANATOMY_MODEL_IDS.join(', ');
