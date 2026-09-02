export const DIAGRAM_IDS = [
  'kidney',
  'nephron',
  'animal_cell',
  'mitosis',
  'heart_flow',
  'food_web',
  'photosynthesis',
  'neuron_synapse',
  'digestive_tract',
  'respiratory_system',
] as const;

export type DiagramId = (typeof DIAGRAM_IDS)[number];

export type DiagramCatalogEntry = {
  id: DiagramId;
  title: string;
  learningGoal: string;
  closestNote?: string;
  attribution: string;
};

const ATTR = 'Curated teaching figure — simplified model, not a clinical illustration';

export const DIAGRAM_CATALOG: Record<DiagramId, DiagramCatalogEntry> = {
  kidney: {
    id: 'kidney',
    title: 'Kidney: organ-level anatomy',
    learningGoal: 'Identify cortex, medulla, pelvis, and major vessels; relate to nephron location.',
    attribution: ATTR,
  },
  nephron: {
    id: 'nephron',
    title: 'Nephron filtration pathway',
    learningGoal: 'Trace filtrate from Bowman’s capsule through the tubule to the collecting duct.',
    attribution: ATTR,
  },
  animal_cell: {
    id: 'animal_cell',
    title: 'Animal cell organelles',
    learningGoal: 'Locate major organelles and connect each to a core function.',
    attribution: ATTR,
  },
  mitosis: {
    id: 'mitosis',
    title: 'Mitosis stages',
    learningGoal: 'Follow chromosome behavior from interphase through cytokinesis.',
    attribution: ATTR,
  },
  heart_flow: {
    id: 'heart_flow',
    title: 'Heart chambers and blood flow',
    learningGoal: 'Trace oxygenated and deoxygenated blood through the four chambers.',
    attribution: ATTR,
  },
  food_web: {
    id: 'food_web',
    title: 'Grassland food web',
    learningGoal: 'Map energy flow from producers through consumers.',
    attribution: ATTR,
    closestNote: 'Closest bundled ecology diagram for ecosystem / food-chain requests.',
  },
  photosynthesis: {
    id: 'photosynthesis',
    title: 'Photosynthesis overview',
    learningGoal: 'Connect plant-level inputs/outputs to light and dark reactions in the chloroplast.',
    attribution: ATTR,
  },
  neuron_synapse: {
    id: 'neuron_synapse',
    title: 'Neuron and chemical synapse',
    learningGoal: 'Trace signal from dendrites through axon to synaptic transmission.',
    attribution: ATTR,
  },
  digestive_tract: {
    id: 'digestive_tract',
    title: 'Human digestive tract',
    learningGoal: 'Order major organs from mouth to anus and note primary functions.',
    attribution: ATTR,
  },
  respiratory_system: {
    id: 'respiratory_system',
    title: 'Human respiratory system',
    learningGoal: 'Follow air from nasal cavity to alveoli and relate to gas exchange.',
    attribution: ATTR,
  },
};

export function isDiagramId(value: string): value is DiagramId {
  return (DIAGRAM_IDS as readonly string[]).includes(value);
}

export function getDiagramCatalogEntry(id: DiagramId): DiagramCatalogEntry {
  return DIAGRAM_CATALOG[id];
}

const ALIASES: Record<string, DiagramId> = {
  renal: 'kidney',
  kidneys: 'kidney',
  renal_anatomy: 'kidney',
  kidney_anatomy: 'kidney',
  uriniferous: 'nephron',
  loop_of_henle: 'nephron',
  glomerulus: 'nephron',
  cell: 'animal_cell',
  eukaryotic_cell: 'animal_cell',
  organelle: 'animal_cell',
  organelles: 'animal_cell',
  cell_structure: 'animal_cell',
  cell_division: 'mitosis',
  mitotic: 'mitosis',
  cell_cycle: 'mitosis',
  heart: 'heart_flow',
  cardiac: 'heart_flow',
  circulation: 'heart_flow',
  blood_flow: 'heart_flow',
  food_chain: 'food_web',
  ecosystem: 'food_web',
  ecology: 'food_web',
  trophic: 'food_web',
  photosynthetic: 'photosynthesis',
  chloroplast: 'photosynthesis',
  calvin: 'photosynthesis',
  calvin_cycle: 'photosynthesis',
  light_reaction: 'photosynthesis',
  thylakoid: 'photosynthesis',
  plant_photosynthesis: 'photosynthesis',
  neuron: 'neuron_synapse',
  synapse: 'neuron_synapse',
  synaptic: 'neuron_synapse',
  nerve_cell: 'neuron_synapse',
  action_potential: 'neuron_synapse',
  digestive: 'digestive_tract',
  digestion: 'digestive_tract',
  gi_tract: 'digestive_tract',
  gastrointestinal: 'digestive_tract',
  alimentary: 'digestive_tract',
  stomach_intestine: 'digestive_tract',
  respiratory: 'respiratory_system',
  respiration: 'respiratory_system',
  lungs: 'respiratory_system',
  breathing: 'respiratory_system',
  alveoli: 'respiratory_system',
  gas_exchange: 'respiratory_system',
};

export function resolveDiagramId(requested: string): DiagramId {
  const key = requested.trim().toLowerCase().replace(/\s+/g, '_').replace(/-/g, '_');
  if (isDiagramId(key)) return key;
  if (ALIASES[key]) return ALIASES[key];
  for (const [alias, id] of Object.entries(ALIASES)) {
    if (key.includes(alias) || alias.includes(key)) return id;
  }
  return 'animal_cell';
}
