export const MOLECULE_IDS = [
  'water',
  'methane',
  'ammonia',
  'co2',
  'ethanol',
  'benzene',
  'acetic_acid',
  'glucose',
] as const;

export type MoleculeId = (typeof MOLECULE_IDS)[number];

export type MoleculeCatalogEntry = {
  id: MoleculeId;
  title: string;
  formula: string;
  closestNote?: string;
  attribution: string;
};

const ATTR = 'Procedural teaching model — not a crystallographic structure';

export const MOLECULE_CATALOG: Record<MoleculeId, MoleculeCatalogEntry> = {
  water: { id: 'water', title: 'Water', formula: 'H₂O', attribution: ATTR },
  methane: { id: 'methane', title: 'Methane', formula: 'CH₄', attribution: ATTR },
  ammonia: { id: 'ammonia', title: 'Ammonia', formula: 'NH₃', attribution: ATTR },
  co2: { id: 'co2', title: 'Carbon dioxide', formula: 'CO₂', attribution: ATTR },
  ethanol: { id: 'ethanol', title: 'Ethanol', formula: 'C₂H₅OH', attribution: ATTR },
  benzene: { id: 'benzene', title: 'Benzene', formula: 'C₆H₆', attribution: ATTR },
  acetic_acid: {
    id: 'acetic_acid',
    title: 'Acetic acid',
    formula: 'CH₃COOH',
    attribution: ATTR,
  },
  glucose: {
    id: 'glucose',
    title: 'Glucose (simplified)',
    formula: 'C₆H₁₂O₆',
    attribution: ATTR,
    closestNote: 'Closest bundled sugar model for carbohydrate requests.',
  },
};

export function isMoleculeId(value: string): value is MoleculeId {
  return (MOLECULE_IDS as readonly string[]).includes(value);
}

export function getMoleculeCatalogEntry(id: MoleculeId): MoleculeCatalogEntry {
  return MOLECULE_CATALOG[id];
}

const ALIASES: Record<string, MoleculeId> = {
  h2o: 'water',
  'h₂o': 'water',
  ch4: 'methane',
  'ch₄': 'methane',
  nh3: 'ammonia',
  'nh₃': 'ammonia',
  'carbon_dioxide': 'co2',
  'carbon-dioxide': 'co2',
  'co₂': 'co2',
  alcohol: 'ethanol',
  'ethyl_alcohol': 'ethanol',
  c6h6: 'benzene',
  'c₆h₆': 'benzene',
  ethanoic: 'acetic_acid',
  vinegar: 'acetic_acid',
  'acetic-acid': 'acetic_acid',
  sugar: 'glucose',
  dextrose: 'glucose',
};

export function resolveMoleculeId(requested: string): MoleculeId {
  const key = requested.trim().toLowerCase().replace(/\s+/g, '_').replace(/-/g, '_');
  if (isMoleculeId(key)) return key;
  if (ALIASES[key]) return ALIASES[key];
  for (const [alias, id] of Object.entries(ALIASES)) {
    if (key.includes(alias) || alias.includes(key)) return id;
  }
  return 'water';
}
