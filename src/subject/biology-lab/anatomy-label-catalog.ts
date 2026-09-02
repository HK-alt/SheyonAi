import type { AnatomyModelId } from '@/subject/biology-lab/gltf-catalog';

/** Normalized position within the model bounding box (0–1 on each axis). */
export type AnatomyAnchor = {
  id: string;
  title: string;
  detail: string;
  /** [x, y, z] from bbox min→max */
  position: [number, number, number];
  aliases?: string[];
};

export type AnatomyLabelCatalog = {
  scope: string;
  /** Label ids appropriate for this 3D model scale. */
  allowedIds: string[];
  /** Microscopic labels that belong on the nephron inset (kidney only). */
  nephronInsetIds?: string[];
  anchors: AnatomyAnchor[];
  defaultLabels?: string[];
};

const MICRO_NEPHRON_IDS = new Set([
  'glomerulus',
  'bowmans-capsule',
  'bowman-capsule',
  'proximal-convoluted-tubule',
  'proximal-tubule',
  'loop-of-henle',
  'henle',
  'distal-convoluted-tubule',
  'distal-tubule',
  'collecting-duct',
  'nephron',
]);

function slug(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/['']/g, '')
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '');
}

export function isNephronMicroLabelId(id: string): boolean {
  const key = slug(id);
  if (MICRO_NEPHRON_IDS.has(key)) return true;
  return (
    key.includes('bowman') ||
    key.includes('henle') ||
    key.includes('convoluted') ||
    key.includes('collecting-duct') ||
    (key.includes('glomerulus') && !key.includes('renal'))
  );
}

export const ANATOMY_LABEL_CATALOG: Partial<Record<AnatomyModelId, AnatomyLabelCatalog>> = {
  kidney: {
    scope: 'macroscopic kidney (organ level)',
    allowedIds: [
      'renal-cortex',
      'renal-medulla',
      'renal-pelvis',
      'renal-hilum',
      'ureter',
      'renal-artery',
      'renal-vein',
    ],
    nephronInsetIds: [
      'glomerulus',
      'bowmans-capsule',
      'proximal-convoluted-tubule',
      'loop-of-henle',
      'distal-convoluted-tubule',
      'collecting-duct',
    ],
    defaultLabels: [
      'renal-cortex',
      'renal-medulla',
      'renal-pelvis',
      'ureter',
      'renal-artery',
      'renal-vein',
    ],
    anchors: [
      {
        id: 'renal-cortex',
        title: 'Renal cortex',
        detail:
          'Outer region containing renal corpuscles and convoluted tubules; site of filtration and most reabsorption.',
        position: [0.78, 0.7, 0.58],
        aliases: ['cortex', 'outer-cortex'],
      },
      {
        id: 'renal-medulla',
        title: 'Renal medulla',
        detail: 'Inner pyramids where loops of Henle and collecting ducts concentrate urine.',
        position: [0.48, 0.5, 0.42],
        aliases: ['medulla', 'pyramid', 'renal-pyramid'],
      },
      {
        id: 'renal-pelvis',
        title: 'Renal pelvis',
        detail: 'Funnel-shaped cavity that collects urine from calyces before the ureter.',
        position: [0.14, 0.34, 0.52],
        aliases: ['pelvis', 'calyx', 'calyces'],
      },
      {
        id: 'renal-hilum',
        title: 'Renal hilum',
        detail: 'Medial notch where ureter, renal artery, and renal vein enter or exit.',
        position: [0.1, 0.46, 0.54],
        aliases: ['hilum', 'hilus'],
      },
      {
        id: 'ureter',
        title: 'Ureter',
        detail: 'Muscular tube carrying urine from the kidney to the bladder.',
        position: [0.12, 0.06, 0.5],
        aliases: ['urinary-duct'],
      },
      {
        id: 'renal-artery',
        title: 'Renal artery',
        detail: 'Delivers oxygenated blood to the kidney for filtration.',
        position: [0.16, 0.58, 0.62],
        aliases: ['artery'],
      },
      {
        id: 'renal-vein',
        title: 'Renal vein',
        detail: 'Drains filtered blood away from the kidney toward the inferior vena cava.',
        position: [0.18, 0.52, 0.38],
        aliases: ['vein'],
      },
      // Nephron inset — local panel coords (see anatomy-scene-html NEPHRON_LOCAL)
      {
        id: 'glomerulus',
        title: 'Glomerulus',
        detail: 'Capillary knot where blood plasma is filtered into Bowman’s capsule.',
        position: [0.08, 0.62, 0.06],
        aliases: ['renal-corpuscle'],
      },
      {
        id: 'bowmans-capsule',
        title: "Bowman's capsule",
        detail: 'Cup-shaped epithelium surrounding the glomerulus; collects filtrate.',
        position: [0.08, 0.58, 0.06],
        aliases: ['bowman-capsule', 'capsule'],
      },
      {
        id: 'proximal-convoluted-tubule',
        title: 'Proximal convoluted tubule',
        detail: 'Reabsorbs most glucose, ions, and water from filtrate back into blood.',
        position: [0.16, 0.5, 0.06],
        aliases: ['proximal-tubule', 'pct'],
      },
      {
        id: 'loop-of-henle',
        title: 'Loop of Henle',
        detail: 'Hairpin loop that establishes the medullary osmotic gradient for water reabsorption.',
        position: [0.26, 0.28, 0.06],
        aliases: ['henle', 'loop'],
      },
      {
        id: 'distal-convoluted-tubule',
        title: 'Distal convoluted tubule',
        detail: 'Fine-tunes reabsorption and secretion under hormonal control.',
        position: [0.34, 0.46, 0.06],
        aliases: ['distal-tubule', 'dct'],
      },
      {
        id: 'collecting-duct',
        title: 'Collecting duct',
        detail: 'Delivers urine from nephrons to the renal pelvis; final water balance.',
        position: [0.38, 0.18, 0.06],
        aliases: ['collecting-system'],
      },
    ],
  },
  heart: {
    scope: 'external and chamber-level heart anatomy',
    allowedIds: [
      'right-atrium',
      'left-atrium',
      'right-ventricle',
      'left-ventricle',
      'aorta',
      'pulmonary-artery',
      'superior-vena-cava',
      'inferior-vena-cava',
    ],
    defaultLabels: [
      'right-atrium',
      'left-atrium',
      'right-ventricle',
      'left-ventricle',
      'aorta',
      'pulmonary-artery',
    ],
    anchors: [
      {
        id: 'right-atrium',
        title: 'Right atrium',
        detail: 'Receives deoxygenated blood from the body via the venae cavae.',
        position: [0.38, 0.72, 0.48],
        aliases: ['atrium-right'],
      },
      {
        id: 'left-atrium',
        title: 'Left atrium',
        detail: 'Receives oxygenated blood from the pulmonary veins.',
        position: [0.62, 0.72, 0.48],
        aliases: ['atrium-left'],
      },
      {
        id: 'right-ventricle',
        title: 'Right ventricle',
        detail: 'Pumps blood to the lungs through the pulmonary artery.',
        position: [0.4, 0.42, 0.5],
        aliases: ['ventricle-right'],
      },
      {
        id: 'left-ventricle',
        title: 'Left ventricle',
        detail: 'Thick-walled chamber that ejects oxygenated blood into the aorta.',
        position: [0.6, 0.4, 0.5],
        aliases: ['ventricle-left'],
      },
      {
        id: 'aorta',
        title: 'Aorta',
        detail: 'Main artery carrying oxygenated blood to the systemic circulation.',
        position: [0.55, 0.88, 0.45],
        aliases: ['ascending-aorta'],
      },
      {
        id: 'pulmonary-artery',
        title: 'Pulmonary artery',
        detail: 'Carries deoxygenated blood from the right ventricle to the lungs.',
        position: [0.42, 0.82, 0.42],
        aliases: ['pulmonary-trunk'],
      },
      {
        id: 'superior-vena-cava',
        title: 'Superior vena cava',
        detail: 'Returns blood from the upper body to the right atrium.',
        position: [0.35, 0.78, 0.38],
        aliases: ['svc'],
      },
      {
        id: 'inferior-vena-cava',
        title: 'Inferior vena cava',
        detail: 'Returns blood from the lower body to the right atrium.',
        position: [0.36, 0.28, 0.4],
        aliases: ['ivc'],
      },
    ],
  },
  cell: {
    scope: 'animal cell organelles',
    allowedIds: [
      'nucleus',
      'nucleolus',
      'mitochondria',
      'membrane',
      'cytoplasm',
      'vacuole',
      'endoplasmic-reticulum',
      'golgi',
    ],
    defaultLabels: ['nucleus', 'mitochondria', 'membrane', 'cytoplasm', 'vacuole', 'nucleolus'],
    anchors: [
      {
        id: 'membrane',
        title: 'Cell membrane',
        detail: 'Phospholipid bilayer controlling entry and exit of materials.',
        position: [0.88, 0.5, 0.5],
        aliases: ['plasma-membrane'],
      },
      {
        id: 'cytoplasm',
        title: 'Cytoplasm',
        detail: 'Fluid matrix where organelles and metabolic reactions occur.',
        position: [0.5, 0.5, 0.5],
      },
      {
        id: 'nucleus',
        title: 'Nucleus',
        detail: 'Stores DNA and controls cell activities.',
        position: [0.42, 0.52, 0.55],
      },
      {
        id: 'nucleolus',
        title: 'Nucleolus',
        detail: 'Site of ribosome subunit assembly inside the nucleus.',
        position: [0.4, 0.54, 0.58],
      },
      {
        id: 'mitochondria',
        title: 'Mitochondria',
        detail: 'Powerhouse organelles that produce ATP via cellular respiration.',
        position: [0.62, 0.45, 0.62],
        aliases: ['mitochondrion'],
      },
      {
        id: 'vacuole',
        title: 'Vacuole',
        detail: 'Storage compartment for water, ions, or waste.',
        position: [0.68, 0.35, 0.58],
      },
    ],
  },
  neuron: {
    scope: 'neuron structure',
    allowedIds: ['soma', 'nucleus', 'dendrite', 'axon', 'myelin', 'axon-terminal', 'synapse'],
    defaultLabels: ['soma', 'dendrite', 'axon', 'myelin', 'axon-terminal', 'nucleus'],
    anchors: [
      {
        id: 'soma',
        title: 'Cell body (soma)',
        detail: 'Contains the nucleus and most organelles.',
        position: [0.22, 0.5, 0.5],
        aliases: ['cell-body'],
      },
      {
        id: 'nucleus',
        title: 'Nucleus',
        detail: 'Controls protein synthesis and neuron maintenance.',
        position: [0.22, 0.52, 0.52],
      },
      {
        id: 'dendrite',
        title: 'Dendrites',
        detail: 'Receive signals from other neurons.',
        position: [0.12, 0.55, 0.48],
        aliases: ['dendrites'],
      },
      {
        id: 'axon',
        title: 'Axon',
        detail: 'Conducts action potentials away from the soma.',
        position: [0.55, 0.5, 0.5],
      },
      {
        id: 'myelin',
        title: 'Myelin sheath',
        detail: 'Insulating lipid layers that speed impulse conduction.',
        position: [0.62, 0.52, 0.48],
        aliases: ['myelin-sheath'],
      },
      {
        id: 'axon-terminal',
        title: 'Axon terminal',
        detail: 'Releases neurotransmitters into the synaptic cleft.',
        position: [0.88, 0.5, 0.5],
        aliases: ['terminal', 'synaptic-knob'],
      },
    ],
  },
  lungs: {
    scope: 'lung lobes and airways',
    allowedIds: ['trachea', 'bronchus', 'left-lung', 'right-lung', 'alveoli', 'pleura'],
    defaultLabels: ['trachea', 'bronchus', 'left-lung', 'right-lung', 'alveoli'],
    anchors: [
      {
        id: 'trachea',
        title: 'Trachea',
        detail: 'Windpipe conducting air to the bronchi.',
        position: [0.5, 0.92, 0.5],
      },
      {
        id: 'bronchus',
        title: 'Bronchus',
        detail: 'Airway branch supplying each lung.',
        position: [0.5, 0.78, 0.5],
        aliases: ['bronchi'],
      },
      {
        id: 'left-lung',
        title: 'Left lung',
        detail: 'Two-lobed lung with cardiac notch.',
        position: [0.62, 0.55, 0.5],
      },
      {
        id: 'right-lung',
        title: 'Right lung',
        detail: 'Three-lobed lung; larger than the left.',
        position: [0.38, 0.55, 0.5],
      },
      {
        id: 'alveoli',
        title: 'Alveoli',
        detail: 'Microscopic air sacs where gas exchange occurs (shown at teaching scale).',
        position: [0.5, 0.4, 0.55],
      },
    ],
  },
  brain: {
    scope: 'major brain regions',
    allowedIds: [
      'cerebrum',
      'cerebellum',
      'brainstem',
      'frontal-lobe',
      'temporal-lobe',
      'occipital-lobe',
      'parietal-lobe',
    ],
    defaultLabels: ['cerebrum', 'cerebellum', 'brainstem', 'frontal-lobe', 'temporal-lobe'],
    anchors: [
      {
        id: 'cerebrum',
        title: 'Cerebrum',
        detail: 'Largest region; responsible for thought, sensation, and voluntary movement.',
        position: [0.5, 0.72, 0.5],
        aliases: ['cortex', 'cerebral-cortex'],
      },
      {
        id: 'frontal-lobe',
        title: 'Frontal lobe',
        detail: 'Planning, reasoning, and motor control.',
        position: [0.5, 0.68, 0.72],
        aliases: ['frontal'],
      },
      {
        id: 'temporal-lobe',
        title: 'Temporal lobe',
        detail: 'Hearing, memory, and language comprehension.',
        position: [0.78, 0.55, 0.5],
        aliases: ['temporal'],
      },
      {
        id: 'occipital-lobe',
        title: 'Occipital lobe',
        detail: 'Primary visual processing.',
        position: [0.5, 0.55, 0.18],
        aliases: ['occipital'],
      },
      {
        id: 'parietal-lobe',
        title: 'Parietal lobe',
        detail: 'Touch, spatial awareness, and integration of sensory input.',
        position: [0.5, 0.72, 0.28],
        aliases: ['parietal'],
      },
      {
        id: 'cerebellum',
        title: 'Cerebellum',
        detail: 'Coordinates balance, posture, and fine motor control.',
        position: [0.5, 0.28, 0.42],
      },
      {
        id: 'brainstem',
        title: 'Brainstem',
        detail: 'Connects brain to spinal cord; controls vital autonomic functions.',
        position: [0.5, 0.12, 0.5],
        aliases: ['medulla', 'pons'],
      },
    ],
  },
};

function findAnchor(catalog: AnatomyLabelCatalog, rawId: string, rawTitle: string): AnatomyAnchor | null {
  const idKey = slug(rawId);
  const titleKey = slug(rawTitle);
  for (const anchor of catalog.anchors) {
    if (slug(anchor.id) === idKey || slug(anchor.title) === titleKey) return anchor;
    for (const alias of anchor.aliases ?? []) {
      if (slug(alias) === idKey || slug(alias) === titleKey) return anchor;
    }
  }
  for (const anchor of catalog.anchors) {
    const tokens = [...tokensFrom(anchor.id), ...tokensFrom(anchor.title), ...(anchor.aliases ?? [])];
    for (const token of tokens) {
      if (token.length > 3 && (idKey.includes(token) || titleKey.includes(token))) return anchor;
    }
  }
  return null;
}

function tokensFrom(text: string): string[] {
  return slug(text)
    .split('-')
    .filter((part) => part.length > 2);
}

export type RawAnatomyLabel = {
  id: string;
  title: string;
  detail: string;
};

export type NormalizedAnatomyLabel = RawAnatomyLabel & {
  anchor?: [number, number, number];
  nephronInset?: boolean;
};

export function normalizeAnatomyLabels(
  modelId: AnatomyModelId,
  labels: RawAnatomyLabel[],
): { labels: NormalizedAnatomyLabel[]; showNephronInset: boolean; scopeNote?: string } {
  const catalog = ANATOMY_LABEL_CATALOG[modelId];
  if (!catalog) {
    return { labels, showNephronInset: false };
  }

  const normalized: NormalizedAnatomyLabel[] = [];
  const seen = new Set<string>();
  let showNephronInset = false;

  for (const label of labels) {
    const anchor = findAnchor(catalog, label.id, label.title);
    if (!anchor) continue;

    const isMicro = catalog.nephronInsetIds?.includes(anchor.id) ?? isNephronMicroLabelId(anchor.id);
    if (modelId === 'kidney' && isMicro) {
      showNephronInset = true;
    }

    if (seen.has(anchor.id)) continue;
    seen.add(anchor.id);

    normalized.push({
      id: anchor.id,
      title: label.title.trim() || anchor.title,
      detail: label.detail.trim() || anchor.detail,
      anchor: anchor.position,
      nephronInset: isMicro,
    });
  }

  if (normalized.length < 4) {
    for (const defaultId of catalog.defaultLabels ?? []) {
      if (seen.has(defaultId)) continue;
      const anchor = catalog.anchors.find((a) => a.id === defaultId);
      if (!anchor) continue;
      seen.add(defaultId);
      normalized.push({
        id: anchor.id,
        title: anchor.title,
        detail: anchor.detail,
        anchor: anchor.position,
        nephronInset: false,
      });
    }
  }

  const scopeNote =
    modelId === 'kidney' && showNephronInset
      ? 'Organ-level kidney with nephron schematic inset — tubule labels appear on the inset panel.'
      : undefined;

  return { labels: normalized.slice(0, 10), showNephronInset, scopeNote };
}

export function getAnatomyLabelGuidance(modelId: AnatomyModelId): string {
  const catalog = ANATOMY_LABEL_CATALOG[modelId];
  if (!catalog) {
    return 'Use anatomically accurate labels that match the visible external or procedural structures on the 3D model.';
  }
  const ids = catalog.allowedIds.join(', ');
  const extra =
    catalog.nephronInsetIds?.length ?
      ` For nephron/tubule microstructure on kidney, use these ids (placed on inset): ${catalog.nephronInsetIds.join(', ')}.`
    : '';
  return `modelId "${modelId}" shows ${catalog.scope}. Prefer label ids: ${ids}.${extra} Do NOT place organ-level labels on wrong structures.`;
}
